import { readFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { parse, print } from "graphql";
import { createYoga, Plugin } from "graphql-yoga";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { useHMACSignatureValidation } from "@graphql-mesh/hmac-upstream-signature";
import { useOperationFieldPermissions } from "@envelop/operation-field-permissions";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

const permissionsPerUserId: Record<string, Set<string>> = {
  "1": new Set(["Query.*", "User.id", "User.__typename"]),
  "2": new Set(["Query.*", "User.id", "User.__typename", "User.name"]),
};

const { HMAC_SIGNING_SECRET } = process.env;

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET environment variable is required");
}

const useMyPlugin = (): Plugin<{ currentUserId: string }> => {
  const mapping = new WeakMap<Request, Record<string, any>>();

  return {
    onParams({ params, request }) {
      console.log("onParams, request extensions:", params.extensions);

      if (params.extensions) {
        mapping.set(request, params.extensions);
      }
    },
    onContextBuilding({ context, extendContext }) {
      const header = context.request.headers.get("x-hmac-signature");
      console.log("x-hmac-signature:", header);

      if (mapping.has(context.request)) {
        const jwtRaw = mapping.get(context.request)!.jwt.payload;

        extendContext({
          currentUserId: jwtRaw.sub,
        });
      }
    },
    onExecute: ({ args }: any) => {
      console.log("onExecute", print(args.document));
    },
  };
};

createServer(
  createYoga({
    logging: true,
    plugins: [
      useHMACSignatureValidation({
        secret: HMAC_SIGNING_SECRET,
      }),
      useMyPlugin(),
      useOperationFieldPermissions<{ currentUserId: string }>({
        // we can access graphql context here
        getPermissions: async (context) => {
          console.log("getPermissions, currentUserId:", context.currentUserId);

          const permissions =
            permissionsPerUserId[context.currentUserId] || new Set();
          console.log("user permissions:", permissions);

          return permissions;
        },
      }),
    ],
    schema: buildSubgraphSchema({
      typeDefs: parse(
        readFileSync(join(__dirname, "typeDefs.graphql"), "utf-8")
      ),
      resolvers: {
        Query: {
          users: () => users,
          user: (_, { id }) => users.find((user) => user.id === id),
        },
        User: {
          __resolveReference: (reference) => {
            return users.find((user) => user.id === reference.id);
          },
        },
      },
    }),
  })
).listen(4001, () => {
  console.log("Users subgraph is running on http://localhost:4001");
});

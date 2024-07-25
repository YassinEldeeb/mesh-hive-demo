import { readFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { useHmacSignatureValidation } from "@graphql-mesh/hmac-upstream-signature";
import {
  useForwardedJWT,
  JWTExtendContextFields,
} from "@graphql-mesh/plugin-jwt-auth";
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

createServer(
  createYoga({
    logging: true,
    plugins: [
      useHmacSignatureValidation({
        secret: HMAC_SIGNING_SECRET,
      }),
      useForwardedJWT({}),
      useOperationFieldPermissions<{ jwt: JWTExtendContextFields }>({
        getPermissions: async (context) => {
          const userId = context.jwt.payload.sub;

          if (!userId) {
            return new Set();
          }

          return permissionsPerUserId[userId] || new Set();
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

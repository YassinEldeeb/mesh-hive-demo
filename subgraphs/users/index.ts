import { readFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { useHmacSignatureValidation } from "@graphql-mesh/hmac-upstream-signature";
import {
  JWTExtendContextFields,
  useForwardedJWT,
} from "@graphql-mesh/plugin-jwt-auth";

const users = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];

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
    ],
    schema: buildSubgraphSchema({
      typeDefs: parse(
        readFileSync(join(__dirname, "typeDefs.graphql"), "utf-8")
      ),
      resolvers: {
        Query: {
          me: (_, __, context: any) => {
            const jwtPayload: JWTExtendContextFields = context.jwt;
            return users.find((user) => user.id === jwtPayload?.payload?.sub);
          },
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

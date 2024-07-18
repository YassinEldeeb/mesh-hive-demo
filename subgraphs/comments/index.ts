import { readFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { useHMACSignatureValidation } from "@graphql-mesh/hmac-upstream-signature";

const comments = [
  { id: "1", text: "Great post!", author: { id: "1" } },
  { id: "2", text: "Thanks for the info!", author: { id: "2" } },
];

const { HMAC_SIGNING_SECRET } = process.env;

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET environment variable is required");
}

createServer(
  createYoga({
    logging: true,
    plugins: [
      useHMACSignatureValidation({
        secret: HMAC_SIGNING_SECRET,
      }),
    ],
    schema: buildSubgraphSchema({
      typeDefs: parse(
        readFileSync(join(__dirname, "typeDefs.graphql"), "utf-8")
      ),
      resolvers: {
        Query: {
          comments: () => comments,
        },
        User: {
          comments(user) {
            return comments.filter((comment) => comment.author.id === user.id);
          },
        },
      },
    }),
  })
).listen(4002, () => {
  console.log("Comments subgraph is running on http://localhost:4002");
});

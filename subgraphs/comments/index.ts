import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const comments = [
  { id: "1", text: "Great post!", author: { id: "1" } },
  { id: "2", text: "Thanks for the info!", author: { id: "2" } },
];

const { HMAC_SIGNING_SECRET } = process.env;

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET environment variable is required");
}

const extractJwtPlugin = {
  async requestDidStart({ request, contextValue }) {
    contextValue.jwt = request.extensions?.jwt;
  },
} satisfies ApolloServerPlugin<{ jwt?: { payload: Record<string, any> } }>;

const verifyHmacSignaturePlugin = {
  async requestDidStart({ request }) {
    const { headers } = request.http!;
    const signature = headers.get("x-hmac-signature");

    if (!signature) {
      throw new Error("Missing HMAC signature");
    }

    // TODO: Fix this
  },
} satisfies ApolloServerPlugin;

const server = new ApolloServer({
  plugins: [verifyHmacSignaturePlugin, extractJwtPlugin],
  schema: buildSubgraphSchema({
    typeDefs: parse(readFileSync(join(__dirname, "typeDefs.graphql"), "utf-8")),
    resolvers: {
      Query: {
        comments: () => comments,
      },
      User: {
        comments(user, args, context) {
          console.log("User.comments resolver called, context:", context);
          return comments.filter((comment) => comment.author.id === user.id);
        },
      },
    },
  }),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
})
  .then(({ url }) => {
    console.log(`Comments subgraph is running on ${url}`);
  })
  .catch((error) => {
    console.error("Failed to start Comments subgraph", error);
    process.exit(1);
  });

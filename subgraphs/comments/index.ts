import { readFileSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { parse, print } from "graphql";
import { createYoga, Plugin, YogaLogger } from "graphql-yoga";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { HMACUpstreamSignatureValidationOptions } from "@graphql-mesh/hmac-upstream-signature";

const comments = [
  { id: "1", text: "Great post!", author: { id: "1" } },
  { id: "2", text: "Thanks for the info!", author: { id: "2" } },
];

const { HMAC_SIGNING_SECRET } = process.env;

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET environment variable is required");
}

function createCryptoKey(
  secret: string,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}
const DEFAULT_HEADER_NAME = "x-hmac-signature";

export function useHMACSignatureValidation(
  options: HMACUpstreamSignatureValidationOptions
): Plugin {
  const headerName = options.headerName || DEFAULT_HEADER_NAME;
  const key$ = createCryptoKey(options.secret, ["verify"]);
  let logger: YogaLogger;

  return {
    onYogaInit({ yoga }) {
      logger = yoga.logger;
    },
  };
}

createServer(
  createYoga({
    logging: true,
    plugins: [
      useHMACSignatureValidation({
        secret: HMAC_SIGNING_SECRET,
      }),
      {
        onExecute: ({ args }: any) => {
          console.log("onExecute", print(args.document));
        },
      },
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

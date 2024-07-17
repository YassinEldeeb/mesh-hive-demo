import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "graphql";
import { writeFileSync } from "fs";
import {
  composeServices,
  compositionHasErrors,
} from "@theguild/federation-composition";

const usersTypeDefs = parse(
  readFileSync(join(__dirname, "users", "typeDefs.graphql"), "utf-8")
);
const commentsTypeDefs = parse(
  readFileSync(join(__dirname, "comments", "typeDefs.graphql"), "utf-8")
);

const result = composeServices([
  {
    name: "users",
    typeDefs: usersTypeDefs,
    url: "http://localhost:4001/graphql",
  },
  {
    name: "comments",
    typeDefs: commentsTypeDefs,
    url: "http://localhost:4002/graphql",
  },
]);

if (compositionHasErrors(result)) {
  console.error(result.errors);
} else {
  const resultDocker = composeServices([
    {
      name: "users",
      typeDefs: usersTypeDefs,
      url: "http://users_subgraph:4001/graphql",
    },
    {
      name: "comments",
      typeDefs: commentsTypeDefs,
      url: "http://comments_subgraph:4002/graphql",
    },
  ]);

  writeFileSync("../gateway/supergraph.graphql", result.supergraphSdl);
  writeFileSync(
    "../gateway/supergraph.docker.graphql",
    resultDocker.supergraphSdl!
  );
  console.log("Supergraph SDL written to ./gateway/supergraph.graphql");
}

import { readFileSync } from 'fs'
import { createServer } from 'http'
import { join } from 'path'
import { parse } from 'graphql'
import { createYoga } from 'graphql-yoga'
import { buildSubgraphSchema } from '@apollo/subgraph'

const comments = [
  { id: '1', text: 'Great post!', author: { id: '1' } },
  { id: '2', text: 'Thanks for the info!', author: { id: '2' } },
]

createServer(
  createYoga({
    schema: buildSubgraphSchema({
      typeDefs: parse(readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf-8')),
      resolvers: {
        Query: {
          comments: () => comments
        },
        Comment: {
          __resolveReference: (comment) => {
            return comments.find((e) => e.id === comment.id)
          },
        },
      },
    }),
  }),
).listen(4002, () => {
  console.log('Comments subgraph is running on http://localhost:4002')
})

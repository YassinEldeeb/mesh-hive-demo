import { defineConfig } from "@graphql-mesh/serve-cli";
import useJWT, {
  createInlineSigningKeyProvider,
} from "@graphql-mesh/plugin-jwt-auth";
import { useHMACUpstreamSignature } from "@graphql-mesh/hmac-upstream-signature";
import usePrometheusMetrics from "@graphql-mesh/plugin-prometheus";
import { useOpenTelemetry } from "@envelop/opentelemetry";

const { JWT_SIGNING_SECRET, HMAC_SIGNING_SECRET } = process.env;

if (!JWT_SIGNING_SECRET) {
  throw new Error("JWT_SIGNING_SECRET is required");
}
if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET is required");
}

export const serveConfig = defineConfig({
  logging: true,
  plugins: (pluginCtx) => [
    useOpenTelemetry({
      ...pluginCtx,
      variables: false,
      resolvers: false,
    }) as any,
    usePrometheusMetrics({
      http: true,
      fetchMetrics: true,
      skipIntrospection: true,
    }),
    useJWT({
      forward: {
        claims: true,
        token: false,
      },
      singingKeyProviders: [createInlineSigningKeyProvider(JWT_SIGNING_SECRET)],
    }),
    useHMACUpstreamSignature({
      secret: HMAC_SIGNING_SECRET,
    }),
  ],
});

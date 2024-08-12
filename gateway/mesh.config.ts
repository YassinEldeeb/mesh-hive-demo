import { defineConfig } from "@graphql-mesh/serve-cli";
import useJWT, {
  createInlineSigningKeyProvider,
} from "@graphql-mesh/plugin-jwt-auth";
import { useHmacUpstreamSignature } from "@graphql-mesh/hmac-upstream-signature";
import usePrometheusMetrics from "@graphql-mesh/plugin-prometheus";
import {
  useOpenTelemetry,
  createOtlpHttpExporter,
} from "@graphql-mesh/plugin-opentelemetry";

const { JWT_SIGNING_SECRET, HMAC_SIGNING_SECRET } = process.env;

if (!JWT_SIGNING_SECRET) {
  throw new Error("JWT_SIGNING_SECRET is required");
}

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET is required");
}

export const serveConfig = defineConfig({
  logging: true,
  plugins: () => [
    useOpenTelemetry({
      exporters: [
        createOtlpHttpExporter({
          url: "http://jaeger:4318/v1/traces",
        }),
      ],
      serviceName: "gateway",
      spans: {
        http: ({ request }) => {
          const url = new URL(request.url);

          if (url.pathname === "/metrics" || url.pathname === "/") {
            return false;
          }

          return true;
        },
      },
    }),
    usePrometheusMetrics({
      http: true,
      fetchMetrics: true,
      skipIntrospection: true,
    }),
    useJWT({
      forward: {
        payload: true,
        token: false,
      },
      singingKeyProviders: [createInlineSigningKeyProvider(JWT_SIGNING_SECRET)],
    }),
    useHmacUpstreamSignature({
      secret: HMAC_SIGNING_SECRET,
    }),
  ],
});

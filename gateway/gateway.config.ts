import {
  defineConfig,
  createOtlpHttpExporter,
  createInlineSigningKeyProvider,
  type JWTExtendContextFields,
} from "@graphql-hive/gateway";

const { JWT_SIGNING_SECRET, HMAC_SIGNING_SECRET } = process.env;

if (!JWT_SIGNING_SECRET) {
  throw new Error("JWT_SIGNING_SECRET is required");
}

if (!HMAC_SIGNING_SECRET) {
  throw new Error("HMAC_SIGNING_SECRET is required");
}

export const gatewayConfig = defineConfig({
  openTelemetry: {
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
  },
  prometheus: {
    // @ts-expect-error - Type mismatch - TODO: Fix in Hive GW later
    metrics: {
      graphql_yoga_http_duration: true,
      graphql_gateway_fetch_duration: true,
    },
    skipIntrospection: true,
  },
  jwt: {
    forward: {
      payload: true,
      token: false,
    },
    signingKeyProviders: [createInlineSigningKeyProvider(JWT_SIGNING_SECRET)],
    reject: {
      missingToken: false,
      invalidToken: false,
    },
  },
  genericAuth: {
    mode: "protect-granular",
    // Get the payload from the decoded JWT
    resolveUserFn: (ctx: { jwt?: JWTExtendContextFields }) => ctx.jwt?.payload,
    // Extract roles from the JWT payload
    extractScopes: (payload: { roles: string[] }) => payload?.roles || [],
    rejectUnauthenticated: false,
  },
  hmacSignature: {
    secret: HMAC_SIGNING_SECRET,
  }
});

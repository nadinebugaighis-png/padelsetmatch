import { createFileRoute } from "@tanstack/react-router";

const PACKAGE_NAME = "com.moorisharches.padelsetmatch";

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: () => {
        const fingerprint = process.env.ANDROID_APP_SIGNING_SHA256?.trim();
        const statements = fingerprint
          ? [{
              relation: ["delegate_permission/common.handle_all_urls"],
              target: {
                namespace: "android_app",
                package_name: PACKAGE_NAME,
                sha256_cert_fingerprints: [fingerprint],
              },
            }]
          : [];
        return Response.json(statements, {
          headers: { "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});

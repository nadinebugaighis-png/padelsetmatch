import { createFileRoute } from "@tanstack/react-router";

const APP_ID = "UHPD255T85.com.moorisharches.padelsetmatch";

const aasa = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { "/": "/app/*" },
          { "/": "/m/*" },
          { "/": "/g/*" },
          { "/": "/s/*" },
          { "/": "/auth" },
          { "/": "/" },
        ],
      },
    ],
  },
  webcredentials: { apps: [APP_ID] },
};

export const Route = createFileRoute("/.well-known/apple-app-site-association")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(aasa), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});

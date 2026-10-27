import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const pushDeliveryMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const result = await next();
  try {
    // Extend the Worker lifetime without holding the action's response open.
    const { schedulePushDelivery } = await import("./lib/push-background.server");
    schedulePushDelivery(getRequest());
  } catch { /* durable queue remains available for retry */ }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, pushDeliveryMiddleware],
  requestMiddleware: [errorMiddleware],
}));

// Cloudflare Worker entry point to serve static assets and handle API routes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // Route /api/bookings to the bookings function
      if (url.pathname.startsWith("/api/bookings")) {
        const bookingsHandler = await import("./functions/api/bookings.js");
        if (request.method === "OPTIONS") {
          return bookingsHandler.onRequestOptions ? bookingsHandler.onRequestOptions({ request, env }) : new Response(null, { status: 204 });
        }
        if (request.method === "GET") {
          return bookingsHandler.onRequestGet ? bookingsHandler.onRequestGet({ request, env }) : new Response("Method not allowed", { status: 405 });
        }
        if (request.method === "POST") {
          return bookingsHandler.onRequestPost ? bookingsHandler.onRequestPost({ request, env }) : new Response("Method not allowed", { status: 405 });
        }
        if (request.method === "PUT") {
          return bookingsHandler.onRequestPut ? bookingsHandler.onRequestPut({ request, env }) : new Response("Method not allowed", { status: 405 });
        }
        if (request.method === "DELETE") {
          return bookingsHandler.onRequestDelete ? bookingsHandler.onRequestDelete({ request, env }) : new Response("Method not allowed", { status: 405 });
        }
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Reject unknown /api routes with 404 JSON instead of falling through to static assets
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "API route not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Serve static assets via env.ASSETS (Cloudflare Workers Static Assets)
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status === 404) {
          // Serve custom 404.html if available
          const notFoundUrl = new URL("/404.html", request.url);
          const notFoundResponse = await env.ASSETS.fetch(new Request(notFoundUrl, request));
          if (notFoundResponse.status === 200) {
            return new Response(notFoundResponse.body, {
              status: 404,
              headers: notFoundResponse.headers
            });
          }
        }
        return assetResponse;
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Worker fetch unhandled error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};

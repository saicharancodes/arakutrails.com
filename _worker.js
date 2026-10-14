// Cloudflare Worker entry point to serve static assets and handle API routes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route /api/admin to the admin function
    if (url.pathname.startsWith("/api/admin")) {
      const adminHandler = await import("./functions/api/admin.js");
      if (request.method === "OPTIONS") {
        return adminHandler.onRequestOptions ? adminHandler.onRequestOptions({ request, env }) : new Response(null, { status: 204 });
      }
      if (request.method === "POST") {
        return adminHandler.onRequestPost({ request, env });
      }
    }

    // Route /api/bookings to the bookings function
    if (url.pathname.startsWith("/api/bookings")) {
      const bookingsHandler = await import("./functions/api/bookings.js");
      if (request.method === "OPTIONS") {
        return bookingsHandler.onRequestOptions ? bookingsHandler.onRequestOptions({ request, env }) : new Response(null, { status: 204 });
      }
      if (request.method === "GET") {
        return bookingsHandler.onRequestGet({ request, env });
      }
      if (request.method === "POST") {
        return bookingsHandler.onRequestPost({ request, env });
      }
      if (request.method === "PUT") {
        return bookingsHandler.onRequestPut({ request, env });
      }
      if (request.method === "DELETE") {
        return bookingsHandler.onRequestDelete({ request, env });
      }
    }

    // Serve static assets via env.ASSETS (Cloudflare Workers Static Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

// Cloudflare Worker entry point to serve static assets and handle API routes

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // 1. Host normalization: redirect www.arakutrails.com to arakutrails.com
      if (url.hostname === "www.arakutrails.com") {
        url.hostname = "arakutrails.com";
        return Response.redirect(url.toString(), 301);
      }

      // 2. Extension normalization: 301 redirect .html requests to clean extensionless URLs (excluding index.html)
      if (url.pathname.endsWith(".html") && url.pathname !== "/index.html" && url.pathname !== "/404.html") {
        url.pathname = url.pathname.slice(0, -5);
        return Response.redirect(url.toString(), 301);
      }

      // 3. Route /api/bookings to the bookings function
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

      // 4. Reject unknown /api routes with 404 JSON instead of falling through to static assets
      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "API route not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 5. Serve static assets via env.ASSETS (Cloudflare Workers Static Assets)
      if (env.ASSETS) {
        // Try direct asset fetch
        let assetResponse = await env.ASSETS.fetch(request);

        // If not found and pathname doesn't have an extension, try appending .html for clean URLs
        if (assetResponse.status === 404 && !url.pathname.includes(".")) {
          const cleanPath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
          const htmlUrl = new URL(cleanPath + ".html", request.url);
          const htmlResponse = await env.ASSETS.fetch(new Request(htmlUrl, request));
          if (htmlResponse.status === 200) {
            return htmlResponse;
          }
        }

        // Custom 404.html fallback
        if (assetResponse.status === 404) {
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

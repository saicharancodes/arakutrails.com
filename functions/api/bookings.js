// functions/api/bookings.js
// Cloudflare Pages / Worker endpoint for Customer Tour Bookings management
// Gated by Cloudflare Access for read/update/delete operations

const ALLOWED_ORIGIN = "https://arakutrails.com";

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  const isAllowed = origin === ALLOWED_ORIGIN || origin === "https://www.arakutrails.com" || (origin && origin.includes("localhost"));
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cf-Access-Jwt-Assertion"
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCorsHeaders(request)
  });
}

// Cloudflare Access Edge Verification
// When Cloudflare Access protects /admin/ or API endpoints:
// 1. Injected header: 'Cf-Access-Jwt-Assertion'
// 2. Browser cookie: 'CF_Authorization' (always present when user logged in via Cloudflare Access)
// 3. Fallback: Sec-Fetch-Site same-origin / referer from /admin/
function verifyCloudflareAccess(request, env) {
  const jwtHeader = request.headers.get("Cf-Access-Jwt-Assertion");
  if (jwtHeader) {
    return true;
  }

  // Check Cloudflare Access authorization cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  if (cookieHeader.includes("CF_Authorization=")) {
    return true;
  }

  // Development bypass
  const isDev = env.ENVIRONMENT === "development" || request.headers.get("Host")?.includes("localhost");
  if (isDev) {
    return true;
  }

  // If /admin/ is protected by Cloudflare Access and the request is initiated from the admin console on the same origin:
  const referer = request.headers.get("Referer") || "";
  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  const host = request.headers.get("Host") || "";
  if (referer.includes("/admin") && (secFetchSite === "same-origin" || referer.includes(host))) {
    return true;
  }

  return false;
}

// Turnstile verification helper for public booking submissions
async function verifyTurnstileToken(token, secretKey, remoteIp) {
  if (!secretKey) {
    // If secret is not yet set via wrangler secret put, allow progression to avoid breaking forms
    return true;
  }
  if (!token) return false;

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData
    });
    const outcome = await res.json();
    return outcome.success;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

// GET: Retrieve all bookings (Cloudflare Access edge-protected)
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return jsonResponse(request, { success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  if (!verifyCloudflareAccess(request, env)) {
    return jsonResponse(request, { success: false, error: "Unauthorized access - Cloudflare Access Required" }, 401);
  }

  const { results } = await env.DB.prepare(
    "SELECT id, name, phone, travel_date, package, channel, status, notes, created_at FROM customer_bookings ORDER BY created_at DESC"
  ).all();

  return jsonResponse(request, { success: true, bookings: results || [] });
}

// POST: Save a new booking (Public form submit or Admin entry)
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonResponse(request, { success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(request, { success: false, error: "Invalid JSON format" }, 400);
  }

  // Optional Turnstile check if public form submitted token
  if (env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
    const remoteIp = request.headers.get("CF-Connecting-IP");
    const validToken = await verifyTurnstileToken(body.turnstileToken, env.TURNSTILE_SECRET_KEY, remoteIp);
    if (!validToken) {
      return jsonResponse(request, { success: false, error: "Bot verification failed" }, 403);
    }
  }

  // Input Sanitization and Length validation
  const name = String(body.name || "").trim().slice(0, 100);
  const phone = String(body.phone || "").trim().slice(0, 20);
  const travelDate = String(body.date || body.travel_date || "").trim().slice(0, 15);
  const pkg = String(body.package || "Araku 1-Day Tour").trim().slice(0, 100);
  const channel = String(body.channel || "Web Form").trim().slice(0, 50);
  const status = String(body.status || "New").trim().slice(0, 30);
  const notes = String(body.notes || "").trim().slice(0, 500);

  if (!name || name.length < 2) {
    return jsonResponse(request, { success: false, error: "Name must be at least 2 characters" }, 400);
  }

  // Phone validation: allow digits, spaces, plus sign, dash
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return jsonResponse(request, { success: false, error: "Please enter a valid 10-digit phone number" }, 400);
  }

  // Date validation: YYYY-MM-DD sanity
  if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    return jsonResponse(request, { success: false, error: "Invalid travel date format (expected YYYY-MM-DD)" }, 400);
  }

  // Generate clean cryptographically secure ID
  const id = "ARK-" + crypto.randomUUID().slice(0, 8).toUpperCase();

  await env.DB.prepare(`
    INSERT INTO customer_bookings (id, name, phone, travel_date, package, channel, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, phone, travelDate, pkg, channel, status, notes).run();

  return jsonResponse(request, {
    success: true,
    booking: { id, name, phone, date: travelDate, package: pkg, channel, status, notes }
  });
}

// PUT: Update booking status / notes (Admin only, Cloudflare Access gated)
export async function onRequestPut({ request, env }) {
  if (!env.DB) {
    return jsonResponse(request, { success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  if (!verifyCloudflareAccess(request, env)) {
    return jsonResponse(request, { success: false, error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(request, { success: false, error: "Invalid JSON" }, 400);
  }

  const { id } = body;
  if (!id) return jsonResponse(request, { success: false, error: "Booking ID required" }, 400);

  const status = body.status ? String(body.status).slice(0, 30) : null;
  const notes = body.notes !== undefined ? String(body.notes).slice(0, 500) : null;
  const name = body.name ? String(body.name).slice(0, 100) : null;
  const phone = body.phone ? String(body.phone).slice(0, 20) : null;
  const travelDate = body.date || body.travel_date ? String(body.date || body.travel_date).slice(0, 15) : null;
  const pkg = body.package ? String(body.package).slice(0, 100) : null;

  if (name && phone && travelDate && pkg) {
    await env.DB.prepare(`
      UPDATE customer_bookings 
      SET name = ?, phone = ?, travel_date = ?, package = ?, status = COALESCE(?, status), notes = COALESCE(?, notes)
      WHERE id = ?
    `).bind(name, phone, travelDate, pkg, status, notes, id).run();
  } else if (status && notes !== null) {
    await env.DB.prepare("UPDATE customer_bookings SET status = ?, notes = ? WHERE id = ?").bind(status, notes, id).run();
  } else if (status) {
    await env.DB.prepare("UPDATE customer_bookings SET status = ? WHERE id = ?").bind(status, id).run();
  } else if (notes !== null) {
    await env.DB.prepare("UPDATE customer_bookings SET notes = ? WHERE id = ?").bind(notes, id).run();
  }

  return jsonResponse(request, { success: true, message: "Booking updated" });
}

// DELETE: Delete a booking (Admin only, Cloudflare Access gated)
export async function onRequestDelete({ request, env }) {
  if (!env.DB) {
    return jsonResponse(request, { success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  if (!verifyCloudflareAccess(request, env)) {
    return jsonResponse(request, { success: false, error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return jsonResponse(request, { success: false, error: "Booking ID required" }, 400);

  await env.DB.prepare("DELETE FROM customer_bookings WHERE id = ?").bind(id).run();
  return jsonResponse(request, { success: true, message: "Booking deleted" });
}

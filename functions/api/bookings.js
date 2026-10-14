// functions/api/bookings.js
// Cloudflare Pages Function endpoint for Customer Tour Bookings management

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

async function verifyAdminSession(db, token) {
  if (!token) return false;
  const row = await db.prepare("SELECT token_expiry FROM admin_credentials WHERE id = 1 AND session_token = ?").bind(token).first();
  return (row && row.token_expiry > Date.now());
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// GET: Retrieve all bookings (Admin only)
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");

  const isAdmin = await verifyAdminSession(env.DB, token);
  if (!isAdmin) {
    return jsonResponse({ success: false, error: "Unauthorized access" }, 401);
  }

  const { results } = await env.DB.prepare("SELECT * FROM customer_bookings ORDER BY created_at DESC").all();
  return jsonResponse({ success: true, bookings: results || [] });
}

// POST: Save a new booking (Public form submit or Admin manual entry)
export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
  }

  const id = body.id || ("ARK-B" + String(Date.now()).slice(-4));
  const name = body.name || "Guest";
  const phone = body.phone || "";
  const travelDate = body.date || "";
  const pkg = body.package || "Custom Araku Tour";
  const channel = body.channel || "Web Form";
  const status = body.status || "New";
  const notes = body.notes || "";

  await env.DB.prepare(`
    INSERT INTO customer_bookings (id, name, phone, travel_date, package, channel, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, phone, travelDate, pkg, channel, status, notes).run();

  return jsonResponse({ success: true, booking: { id, name, phone, date: travelDate, package: pkg, channel, status, notes } });
}

// PUT: Update booking status / notes (Admin only)
export async function onRequestPut({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
  }

  const token = body.token || request.headers.get("Authorization")?.replace("Bearer ", "");
  const isAdmin = await verifyAdminSession(env.DB, token);
  if (!isAdmin) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const { id, status, notes } = body;
  if (!id) return jsonResponse({ success: false, error: "Booking ID required" }, 400);

  if (status && notes !== undefined) {
    await env.DB.prepare("UPDATE customer_bookings SET status = ?, notes = ? WHERE id = ?").bind(status, notes, id).run();
  } else if (status) {
    await env.DB.prepare("UPDATE customer_bookings SET status = ? WHERE id = ?").bind(status, id).run();
  } else if (notes !== undefined) {
    await env.DB.prepare("UPDATE customer_bookings SET notes = ? WHERE id = ?").bind(notes, id).run();
  }

  return jsonResponse({ success: true, message: "Booking updated" });
}

// DELETE: Delete a booking (Admin only)
export async function onRequestDelete({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ success: false, error: "D1 Database binding 'DB' is missing" }, 500);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token") || request.headers.get("Authorization")?.replace("Bearer ", "");

  const isAdmin = await verifyAdminSession(env.DB, token);
  if (!isAdmin) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  if (!id) return jsonResponse({ success: false, error: "Booking ID required" }, 400);

  await env.DB.prepare("DELETE FROM customer_bookings WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true, message: "Booking deleted" });
}

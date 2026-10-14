// functions/api/admin.js
// Cloudflare Pages Function endpoint for Admin Authentication & Credential Management

// Crypto helper using native Web Crypto API (supported in Cloudflare Workers / Pages Functions)
async function hashWithSalt(text, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const textBytes = enc.encode(text);
  
  // Combine salt + text
  const combined = new Uint8Array(salt.length + textBytes.length);
  combined.set(salt);
  combined.set(textBytes, salt.length);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return {
    hashHex: bytesToHex(new Uint8Array(hashBuffer)),
    saltHex: bytesToHex(salt)
  };
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// Ensure default admin user exists if table is empty
async function ensureDefaultAdmin(db) {
  const existing = await db.prepare("SELECT * FROM admin_credentials WHERE id = 1").first();
  if (!existing) {
    const defaultUser = "ARKT121100";
    const defaultPass = "Araku@2026##";
    const defaultEmail = "krsh2852@gmail.com";
    const defaultQ = "What is your favorite travel destination in Araku?";
    const defaultA = "Araku";

    const passHash = await hashWithSalt(defaultPass);
    const ansHash = await hashWithSalt(defaultA.toLowerCase().trim());

    await db.prepare(`
      INSERT INTO admin_credentials (
        id, username, password_hash, salt, authorized_email, 
        security_question, security_answer_hash, security_answer_salt, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      defaultUser,
      passHash.hashHex,
      passHash.saltHex,
      defaultEmail,
      defaultQ,
      ansHash.hashHex,
      ansHash.saltHex
    ).run();
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ success: false, error: "D1 Database binding 'DB' is missing in Cloudflare Pages." }, 500);
  }

  const db = env.DB;
  await ensureDefaultAdmin(db);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ success: false, error: "Invalid JSON request body" }, 400);
  }

  const { action } = body;

  // 1. LOGIN ACTION
  if (action === "login") {
    const { username, password } = body;
    if (!username || !password) {
      return jsonResponse({ success: false, error: "Username and password required" }, 400);
    }

    const row = await db.prepare("SELECT * FROM admin_credentials WHERE id = 1").first();
    if (!row) {
      return jsonResponse({ success: false, error: "Admin credentials not configured" }, 500);
    }

    if (row.username.toLowerCase() !== username.trim().toLowerCase()) {
      return jsonResponse({ success: false, error: "Invalid User ID or Password" }, 401);
    }

    const testHash = await hashWithSalt(password, row.salt);
    if (testHash.hashHex !== row.password_hash) {
      return jsonResponse({ success: false, error: "Invalid User ID or Password" }, 401);
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    await db.prepare("UPDATE admin_credentials SET session_token = ?, token_expiry = ? WHERE id = 1")
      .bind(token, expiry)
      .run();

    return jsonResponse({
      success: true,
      message: "Login successful",
      token,
      username: row.username,
      authorizedEmail: row.authorized_email
    });
  }

  // 2. VERIFY SESSION TOKEN
  if (action === "verify_session") {
    const { token } = body;
    if (!token) return jsonResponse({ authenticated: false });

    const row = await db.prepare("SELECT username, authorized_email, token_expiry FROM admin_credentials WHERE id = 1 AND session_token = ?").bind(token).first();
    if (row && row.token_expiry > Date.now()) {
      return jsonResponse({ authenticated: true, username: row.username, authorizedEmail: row.authorized_email });
    }
    return jsonResponse({ authenticated: false });
  }

  // 3. GET SECURITY QUESTION
  if (action === "get_security_question") {
    const row = await db.prepare("SELECT security_question, username FROM admin_credentials WHERE id = 1").first();
    return jsonResponse({
      success: true,
      question: row ? row.security_question : null,
      username: row ? row.username : null
    });
  }

  // 4. VERIFY SECURITY ANSWER
  if (action === "verify_security_answer") {
    const { answer } = body;
    if (!answer) return jsonResponse({ success: false, error: "Answer required" }, 400);

    const row = await db.prepare("SELECT security_answer_hash, security_answer_salt FROM admin_credentials WHERE id = 1").first();
    if (!row) return jsonResponse({ success: false, error: "Not found" }, 404);

    const testHash = await hashWithSalt(answer.toLowerCase().trim(), row.security_answer_salt);
    if (testHash.hashHex === row.security_answer_hash) {
      const resetToken = crypto.randomUUID();
      const expiry = Date.now() + (15 * 60 * 1000); // 15 mins for reset
      await db.prepare("UPDATE admin_credentials SET session_token = ?, token_expiry = ? WHERE id = 1")
        .bind(resetToken, expiry)
        .run();
      return jsonResponse({ success: true, resetToken });
    }

    return jsonResponse({ success: false, error: "Incorrect security answer" }, 401);
  }

  // 5. UPDATE / RESET CREDENTIALS
  if (action === "update_credentials") {
    const { token, newUsername, newPassword, customQuestion, customAnswer } = body;
    if (!token) return jsonResponse({ success: false, error: "Unauthorized session" }, 401);

    const row = await db.prepare("SELECT id, token_expiry FROM admin_credentials WHERE id = 1 AND session_token = ?").bind(token).first();
    if (!row || row.token_expiry < Date.now()) {
      return jsonResponse({ success: false, error: "Session expired or invalid. Please re-authenticate." }, 401);
    }

    if (!newPassword || newPassword.length < 6) {
      return jsonResponse({ success: false, error: "Password must be at least 6 characters" }, 400);
    }

    const passHash = await hashWithSalt(newPassword);
    let qUpdate = "";
    const bindParams = [
      newUsername || "ARKT121100",
      passHash.hashHex,
      passHash.saltHex
    ];

    if (customQuestion && customAnswer) {
      const ansHash = await hashWithSalt(customAnswer.toLowerCase().trim());
      await db.prepare(`
        UPDATE admin_credentials 
        SET username = ?, password_hash = ?, salt = ?, security_question = ?, security_answer_hash = ?, security_answer_salt = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).bind(
        newUsername || "ARKT121100",
        passHash.hashHex,
        passHash.saltHex,
        customQuestion.trim(),
        ansHash.hashHex,
        ansHash.saltHex
      ).run();
    } else {
      await db.prepare(`
        UPDATE admin_credentials 
        SET username = ?, password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).bind(
        newUsername || "ARKT121100",
        passHash.hashHex,
        passHash.saltHex
      ).run();
    }

    return jsonResponse({ success: true, message: "Credentials updated successfully in Cloudflare D1." });
  }

  return jsonResponse({ success: false, error: "Unknown action" }, 400);
}

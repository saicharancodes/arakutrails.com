# Cloudflare D1 Database Setup Guide for Araku Trails

This project includes a serverless backend powered by **Cloudflare Pages Functions** and **Cloudflare D1** to securely persist admin credentials and tour inquiries centrally.

---

## 1. Schema & Backend Files Created
- [`d1_schema.sql`](file:///Users/skyciemi0015/Library/CloudStorage/OneDrive-Sky/Documents/Personal%20Projects/arakutrails.com/d1_schema.sql): Database schema for admin credentials (salted SHA-256 hashes) and booking inquiries.
- [`functions/api/admin.js`](file:///Users/skyciemi0015/Library/CloudStorage/OneDrive-Sky/Documents/Personal%20Projects/arakutrails.com/functions/api/admin.js): Cloudflare Pages Function handling `/api/admin` (login, session verification, security QA check, and credential updates).
- [`functions/api/bookings.js`](file:///Users/skyciemi0015/Library/CloudStorage/OneDrive-Sky/Documents/Personal%20Projects/arakutrails.com/functions/api/bookings.js): Cloudflare Pages Function handling `/api/bookings` (central tour booking persistence).

---

## 2. Setting Up D1 in Cloudflare Dashboard (3 Steps)

### Step 1: Create the D1 Database
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, select **Workers & Pages** > **D1 SQL Database**.
3. Click **Create Database**.
4. Set the Database Name to:
   ```text
   arakutrails-db
   ```
5. Click **Create**.

### Step 2: Run the Schema Migration
1. In the Cloudflare Dashboard, open your newly created `arakutrails-db`.
2. Go to the **Console** tab.
3. Paste the contents of [`d1_schema.sql`](file:///Users/skyciemi0015/Library/CloudStorage/OneDrive-Sky/Documents/Personal%20Projects/arakutrails.com/d1_schema.sql):
   ```sql
   CREATE TABLE IF NOT EXISTS admin_credentials (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     username TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     salt TEXT NOT NULL,
     authorized_email TEXT NOT NULL,
     security_question TEXT,
     security_answer_hash TEXT,
     security_answer_salt TEXT,
     session_token TEXT,
     token_expiry INTEGER,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS customer_bookings (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     phone TEXT NOT NULL,
     travel_date TEXT,
     package TEXT,
     channel TEXT DEFAULT 'Web Form',
     status TEXT DEFAULT 'New',
     notes TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
4. Click **Execute**.

### Step 3: Bind D1 to your Cloudflare Pages Project
1. In the Cloudflare Dashboard, go to **Workers & Pages** and click your **arakutrails** Pages project.
2. Go to **Settings** > **Functions**.
3. Scroll down to **D1 database bindings**.
4. Click **Add binding**:
   - **Variable name**: `DB`
   - **D1 database**: Select `arakutrails-db`
5. Click **Save**.
6. Commit & push your changes to GitHub (or trigger a new Pages deployment).

---

## 3. Fallback & Security
- **Salted SHA-256 Hashing**: Passwords and security answers are stored only as salted cryptographic hashes inside Cloudflare D1. Plaintext passwords are never stored.
- **Offline / Local Fallback**: If the D1 binding is not yet attached or if developing locally without Wrangler, the site gracefully falls back to local storage so you are never locked out.

-- Migration: 0001_init.sql
-- Create credentials table for Araku Trails Admin
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

-- Create table for customer tour booking inquiries
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

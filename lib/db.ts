import { sql } from '@vercel/postgres';

// Initialize tables if they don't exist
export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        address TEXT DEFAULT '',
        county TEXT DEFAULT '',
        lat NUMERIC,
        lng NUMERIC,
        owner_name TEXT DEFAULT '',
        acres NUMERIC,
        market_value NUMERIC,
        land_value NUMERIC,
        improvement_value NUMERIC,
        estimated_savings NUMERIC,
        required_hives NUMERIC,
        search_count INTEGER DEFAULT 1,
        viewed_results BOOLEAN DEFAULT false,
        viewed_details BOOLEAN DEFAULT false,
        adjusted_estimate BOOLEAN DEFAULT false,
        started_signup BOOLEAN DEFAULT false,
        completed_signup BOOLEAN DEFAULT false,
        viewed_guide BOOLEAN DEFAULT false,
        time_on_results_ms INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        tier TEXT DEFAULT 'unknown',
        tags TEXT DEFAULT '',
        referrer TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        session_id TEXT DEFAULT '',
        first_seen TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW(),
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT ''
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        county TEXT DEFAULT '',
        lat NUMERIC,
        lng NUMERIC,
        acres NUMERIC,
        appraised_value NUMERIC,
        estimated_savings NUMERIC,
        parcel_data JSONB,
        source TEXT DEFAULT 'calculator',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS state_interest (
        id SERIAL PRIMARY KEY,
        state TEXT NOT NULL,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT DEFAULT '',
        state TEXT DEFAULT '',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        event TEXT NOT NULL,
        county TEXT,
        savings NUMERIC,
        step TEXT,
        address TEXT,
        referrer TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    return true;
  } catch (error) {
    console.error('DB init error:', error);
    return false;
  }
}

// Ensure tables exist (called on first request)
let dbInitialized = false;
export async function ensureDB() {
  if (!dbInitialized) {
    dbInitialized = await initDB();
  }
}

// Check if Postgres is configured
export function isPostgresConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

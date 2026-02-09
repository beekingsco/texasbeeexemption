/**
 * Database setup script
 * Run after connecting Neon Postgres to your Vercel project:
 * 
 * 1. Go to Vercel Dashboard → Your Project → Storage → Connect Store → Neon
 * 2. Pull env vars: `vercel env pull .env.local`
 * 3. Run: `npx tsx scripts/setup-db.ts`
 */

import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load env from .env.local
config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🗄️  Setting up database tables...\n');

  try {
    // Create contacts table
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
    console.log('✅ contacts table ready');

    // Create leads table
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
    console.log('✅ leads table ready');

    // Create state_interest table
    await sql`
      CREATE TABLE IF NOT EXISTS state_interest (
        id SERIAL PRIMARY KEY,
        state TEXT NOT NULL,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ state_interest table ready');

    // Create waitlist table
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT DEFAULT '',
        state TEXT DEFAULT '',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ waitlist table ready');

    // Create analytics table
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
    console.log('✅ analytics table ready');

    // Migrate existing data from JSON files
    console.log('\n📦 Checking for existing data to migrate...\n');

    // Migrate contacts
    const contactsPath = join(process.cwd(), 'data', 'contacts.json');
    if (existsSync(contactsPath)) {
      const contacts = JSON.parse(readFileSync(contactsPath, 'utf-8'));
      if (contacts.length > 0) {
        for (const c of contacts) {
          const tagsStr = (c.tags || []).join(',');
          await sql`
            INSERT INTO contacts (id, address, county, lat, lng, owner_name, acres, market_value, land_value,
              improvement_value, estimated_savings, required_hives, search_count, viewed_results, viewed_details,
              adjusted_estimate, started_signup, completed_signup, viewed_guide, time_on_results_ms, score, tier,
              tags, referrer, user_agent, session_id, first_seen, last_seen, email, phone, first_name, last_name)
            VALUES (${c.id}, ${c.address || ''}, ${c.county || ''}, ${c.lat || null}, ${c.lng || null},
              ${c.ownerName || ''}, ${c.acres || null}, ${c.marketValue || null}, ${c.landValue || null},
              ${c.improvementValue || null}, ${c.estimatedSavings || null}, ${c.requiredHives || null},
              ${c.searchCount || 1}, ${c.viewedResults || false}, ${c.viewedDetails || false},
              ${c.adjustedEstimate || false}, ${c.startedSignup || false}, ${c.completedSignup || false},
              ${c.viewedGuide || false}, ${c.timeOnResultsMs || 0}, ${c.score || 0}, ${c.tier || 'unknown'},
              ${tagsStr}, ${c.referrer || ''}, ${c.userAgent || ''}, ${c.sessionId || ''},
              ${c.firstSeen || new Date().toISOString()}, ${c.lastSeen || new Date().toISOString()},
              ${c.email || ''}, ${c.phone || ''}, ${c.firstName || ''}, ${c.lastName || ''})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        console.log(`✅ Migrated ${contacts.length} contacts`);
      }
    }

    // Migrate leads
    const leadsPath = join(process.cwd(), 'data', 'leads.json');
    if (existsSync(leadsPath)) {
      const leads = JSON.parse(readFileSync(leadsPath, 'utf-8'));
      if (leads.length > 0) {
        for (const l of leads) {
          await sql`
            INSERT INTO leads (id, first_name, last_name, email, phone, address, county, lat, lng,
              acres, appraised_value, estimated_savings, parcel_data, source, created_at)
            VALUES (${l.id}, ${l.firstName || ''}, ${l.lastName || ''}, ${l.email || ''}, ${l.phone || ''},
              ${l.address || ''}, ${l.county || ''}, ${l.lat || null}, ${l.lng || null}, ${l.acres || null},
              ${l.appraisedValue || null}, ${l.estimatedSavings || null},
              ${l.parcelData ? JSON.stringify(l.parcelData) : null},
              ${l.source || 'calculator'}, ${l.createdAt || new Date().toISOString()})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        console.log(`✅ Migrated ${leads.length} leads`);
      }
    }

    // Migrate state interest
    const siPath = join(process.cwd(), 'data', 'state-interest.json');
    if (existsSync(siPath)) {
      const interests = JSON.parse(readFileSync(siPath, 'utf-8'));
      if (interests.length > 0) {
        for (const i of interests) {
          await sql`
            INSERT INTO state_interest (state, user_agent, timestamp)
            VALUES (${i.state}, ${i.userAgent || null}, ${i.timestamp || new Date().toISOString()})
          `;
        }
        console.log(`✅ Migrated ${interests.length} state interest records`);
      }
    }

    // Migrate analytics
    const analyticsPath = join(process.cwd(), 'data', 'analytics.json');
    if (existsSync(analyticsPath)) {
      const events = JSON.parse(readFileSync(analyticsPath, 'utf-8'));
      if (events.length > 0) {
        for (const e of events) {
          await sql`
            INSERT INTO analytics (event, county, savings, step, address, referrer, user_agent, timestamp)
            VALUES (${e.event}, ${e.county || null}, ${e.savings || null}, ${e.step || null},
              ${e.address || null}, ${e.referrer || null}, ${e.userAgent || null},
              ${e.timestamp || new Date().toISOString()})
          `;
        }
        console.log(`✅ Migrated ${events.length} analytics events`);
      }
    }

    console.log('\n🎉 Database setup complete!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();

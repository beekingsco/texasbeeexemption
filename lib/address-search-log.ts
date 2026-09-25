import { sql } from '@vercel/postgres';
import { isPostgresConfigured } from '@/lib/db';
import {
  blankToNull,
  cleanCounty,
  clientIpFromHeaders,
  decodeGeoHeader,
  finiteOrNull,
  hashIp,
  isNorthTexas,
} from '@/lib/address-search';
import type { SearchContext } from '@/lib/search-attribution';

export type AddressSearchEntry = {
  rawAddress: string;
  normalizedAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  state?: string | null;
  county?: string | null;
  resultShown?: string | null;
  savingsShown?: number | null;
  context: SearchContext;
  userAgent?: string | null;
  headers: { get(name: string): string | null };
  email?: string | null;
  phone?: string | null;
};

let tableReady: Promise<void> | null = null;

/** Creates only the new search log. Does not read or write existing tables. */
export function ensureAddressSearchTable(): Promise<void> {
  if (!tableReady) {
    tableReady = createAddressSearchTable().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

async function createAddressSearchTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS address_searches (
      id BIGSERIAL PRIMARY KEY,
      searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_address TEXT,
      normalized_address TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      state TEXT,
      county TEXT,
      result_shown TEXT,
      savings_shown NUMERIC,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      gclid TEXT,
      fbclid TEXT,
      referrer TEXT,
      landing_path TEXT,
      user_agent TEXT,
      ip_hash TEXT,
      ip_country TEXT,
      ip_region TEXT,
      ip_city TEXT,
      email TEXT,
      phone TEXT,
      session_id TEXT,
      is_north_texas BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS address_searches_searched_at_idx ON address_searches (searched_at)`;
  await sql`CREATE INDEX IF NOT EXISTS address_searches_session_id_idx ON address_searches (session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS address_searches_state_county_idx ON address_searches (state, county)`;
  await sql`
    CREATE OR REPLACE VIEW address_search_daily AS
    SELECT
      search_day,
      state,
      county,
      region,
      COUNT(*)::bigint AS searches
    FROM (
      SELECT
        (searched_at AT TIME ZONE 'America/Chicago')::date AS search_day,
        COALESCE(NULLIF(btrim(state), ''), 'unknown') AS state,
        COALESCE(NULLIF(btrim(county), ''), 'unknown') AS county,
        CASE
          WHEN is_north_texas THEN 'north_texas'
          WHEN upper(btrim(COALESCE(state, ''))) IN ('FL', 'FLORIDA') THEN 'florida'
          ELSE 'other'
        END AS region
      FROM address_searches
    ) AS classified
    GROUP BY search_day, state, county, region
  `;
}

async function sessionContact(sessionId: string | null): Promise<{ email: string | null; phone: string | null }> {
  if (!sessionId) return { email: null, phone: null };
  const existing = await sql`
    SELECT email, phone
    FROM address_searches
    WHERE session_id = ${sessionId}
      AND searched_at > NOW() - INTERVAL '30 days'
      AND (NULLIF(email, '') IS NOT NULL OR NULLIF(phone, '') IS NOT NULL)
    ORDER BY searched_at DESC
    LIMIT 1
  `;
  const row = existing.rows[0];
  return {
    email: (row?.email as string | undefined) || null,
    phone: (row?.phone as string | undefined) || null,
  };
}

export async function insertAddressSearch(entry: AddressSearchEntry): Promise<Record<string, unknown> | null> {
  if (!isPostgresConfigured()) return null;
  await ensureAddressSearchTable();

  const state = blankToNull(entry.state, 40);
  const county = cleanCounty(entry.county);
  const prior = await sessionContact(entry.context.sessionId);
  const email = blankToNull(entry.email, 320) || prior.email;
  const phone = blankToNull(entry.phone, 40) || prior.phone;
  const ip = clientIpFromHeaders(entry.headers);

  const inserted = await sql`
    INSERT INTO address_searches (
      searched_at, raw_address, normalized_address, lat, lng, state, county,
      result_shown, savings_shown, utm_source, utm_medium, utm_campaign, gclid, fbclid,
      referrer, landing_path, user_agent, ip_hash, ip_country, ip_region, ip_city,
      email, phone, session_id, is_north_texas
    ) VALUES (
      NOW(),
      ${blankToNull(entry.rawAddress, 1000)},
      ${blankToNull(entry.normalizedAddress, 1000)},
      ${finiteOrNull(entry.lat)},
      ${finiteOrNull(entry.lng)},
      ${state},
      ${county},
      ${blankToNull(entry.resultShown, 500)},
      ${finiteOrNull(entry.savingsShown)},
      ${entry.context.utmSource},
      ${entry.context.utmMedium},
      ${entry.context.utmCampaign},
      ${entry.context.gclid},
      ${entry.context.fbclid},
      ${entry.context.referrer},
      ${entry.context.landingPath},
      ${blankToNull(entry.userAgent, 500)},
      ${ip ? hashIp(ip) : null},
      ${decodeGeoHeader(entry.headers.get('x-vercel-ip-country'))},
      ${decodeGeoHeader(entry.headers.get('x-vercel-ip-country-region'))},
      ${decodeGeoHeader(entry.headers.get('x-vercel-ip-city'))},
      ${email},
      ${phone},
      ${entry.context.sessionId},
      ${isNorthTexas(state, county)}
    )
    RETURNING id, searched_at, raw_address, normalized_address, lat, lng, state, county,
      result_shown, savings_shown, utm_source, utm_medium, utm_campaign, gclid, fbclid,
      referrer, landing_path, user_agent, ip_hash, ip_country, ip_region, ip_city,
      email, phone, session_id, is_north_texas
  `;
  return (inserted.rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Fire-and-forget wrapper. Failures are logged and never thrown. */
export async function logAddressSearch(entry: AddressSearchEntry): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('address search log timeout')), 4000);
      insertAddressSearch(entry).then(() => {
        clearTimeout(timer);
        resolve();
      }, (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  } catch (error) {
    console.error('address search log failed', error);
  }
}

/**
 * Fills email, phone, or savings onto rows in the new search log only.
 * Called when a later request in the same session already has that information.
 */
export async function recordSearchFollowUp(input: {
  sessionId: string | null;
  email?: string | null;
  phone?: string | null;
  savings?: number | null;
  resultNote?: string | null;
}): Promise<void> {
  try {
    if (!isPostgresConfigured() || !input.sessionId) return;
    const email = blankToNull(input.email, 320);
    const phone = blankToNull(input.phone, 40);
    const note = blankToNull(input.resultNote, 200);
    const savings = finiteOrNull(input.savings);
    if (!email && !phone && savings == null && !note) return;
    await ensureAddressSearchTable();

    if (email || phone) {
      await sql`
        UPDATE address_searches
        SET
          email = CASE
            WHEN ${email}::text IS NOT NULL AND ${email}::text <> '' THEN ${email}
            ELSE email
          END,
          phone = CASE
            WHEN ${phone}::text IS NOT NULL AND ${phone}::text <> '' THEN ${phone}
            ELSE phone
          END
        WHERE session_id = ${input.sessionId}
          AND searched_at > NOW() - INTERVAL '30 days'
      `;
    }

    if (savings != null || note) {
      await sql`
        UPDATE address_searches
        SET
          savings_shown = COALESCE(${savings}, savings_shown),
          result_shown = CASE
            WHEN ${note}::text IS NULL OR ${note}::text = '' THEN result_shown
            WHEN result_shown IS NULL OR result_shown = '' THEN ${note}
            WHEN position(${note} in result_shown) > 0 THEN result_shown
            ELSE left(result_shown || ' | ' || ${note}, 500)
          END
        WHERE id = (
          SELECT id FROM address_searches
          WHERE session_id = ${input.sessionId}
          ORDER BY searched_at DESC
          LIMIT 1
        )
      `;
    }
  } catch (error) {
    console.error('address search follow-up failed', error);
  }
}

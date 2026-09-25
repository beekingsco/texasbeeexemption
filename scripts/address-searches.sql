-- Additive search log for beeexemption.com.
-- Creates one new table and one read-only view.
-- Does not alter, update, or delete any existing table or row.

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
);

CREATE INDEX IF NOT EXISTS address_searches_searched_at_idx ON address_searches (searched_at);
CREATE INDEX IF NOT EXISTS address_searches_session_id_idx ON address_searches (session_id);
CREATE INDEX IF NOT EXISTS address_searches_state_county_idx ON address_searches (state, county);

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
GROUP BY search_day, state, county, region;

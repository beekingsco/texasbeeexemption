-- Bee Exemption lead and contact storage for the Contractor Command project.
-- Review and apply manually. Do not run this from the app deploy.
--
-- public.leads already exists and is the storm / contractor pipeline
-- (hail, tornado, required situs_address, source default 'storm').
-- Calculator leads do not fit that table, so these are separate tables.
--
-- RLS is on and there are no policies. anon and authenticated have no grants.
-- The app writes with the service role key, which bypasses RLS.

create table if not exists public.bee_exemption_leads (
  id text primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null default '',
  address text not null default '',
  county text not null default '',
  state text not null default '',
  lat double precision,
  lng double precision,
  acres numeric,
  appraised_value numeric,
  estimated_savings numeric,
  parcel_data jsonb,
  source text not null default '',
  entry text,
  channel text,
  agent_ref text,
  created_at timestamptz not null default now()
);

create index if not exists bee_exemption_leads_created_at_idx
  on public.bee_exemption_leads (created_at desc);

create table if not exists public.bee_exemption_contacts (
  id text primary key,
  address text not null default '',
  county text not null default '',
  state text not null default '',
  lat double precision,
  lng double precision,
  owner_name text not null default '',
  acres numeric,
  market_value numeric,
  land_value numeric,
  improvement_value numeric,
  estimated_savings numeric,
  required_hives integer,
  search_count integer not null default 1,
  viewed_results boolean not null default false,
  viewed_details boolean not null default false,
  adjusted_estimate boolean not null default false,
  started_signup boolean not null default false,
  completed_signup boolean not null default false,
  viewed_guide boolean not null default false,
  time_on_results_ms integer not null default 0,
  score integer not null default 0,
  tier text not null default 'unknown',
  tags text not null default '',
  referrer text not null default '',
  user_agent text not null default '',
  session_id text not null default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  email text not null default '',
  phone text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  parcel_status text not null default ''
);

create index if not exists bee_exemption_contacts_address_idx
  on public.bee_exemption_contacts (address);
create index if not exists bee_exemption_contacts_session_idx
  on public.bee_exemption_contacts (session_id);

-- One search alert per normalized address + IP. A later search after 60s
-- refreshes the timestamp and is allowed to email again.
create table if not exists public.bee_search_alert_dedupe (
  address_norm text not null,
  ip text not null,
  created_at timestamptz not null default now(),
  primary key (address_norm, ip)
);

create or replace function public.claim_bee_search_alert(p_address text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  insert into public.bee_search_alert_dedupe (address_norm, ip)
  values (p_address, p_ip)
  on conflict (address_norm, ip) do update
    set created_at = now()
    where public.bee_search_alert_dedupe.created_at <= now() - interval '60 seconds'
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

alter table public.bee_exemption_leads enable row level security;
alter table public.bee_exemption_contacts enable row level security;
alter table public.bee_search_alert_dedupe enable row level security;

revoke all on table public.bee_exemption_leads from public, anon, authenticated;
revoke all on table public.bee_exemption_contacts from public, anon, authenticated;
revoke all on table public.bee_search_alert_dedupe from public, anon, authenticated;
revoke all on function public.claim_bee_search_alert(text, text) from public, anon, authenticated;

grant all on table public.bee_exemption_leads to service_role;
grant all on table public.bee_exemption_contacts to service_role;
grant all on table public.bee_search_alert_dedupe to service_role;
grant execute on function public.claim_bee_search_alert(text, text) to service_role;

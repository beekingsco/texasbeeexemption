-- NOT APPLIED.
-- Chris must review and apply this manually. Do not run it from the app deploy,
-- and do not run it against the live Supabase project from CI.
--
-- Links a calculator lead to the address_searches row unlocked by the email gate.
-- The app already writes address_searches.email with the service role. This column
-- stores that row's id on the lead. Inserts omit the column until it exists.
--
-- RLS stays enabled from 20260928130000_bee_exemption_storage.sql.
-- This file adds no policies, no grants for anon or authenticated,
-- and no functions.

alter table public.bee_exemption_leads
  add column if not exists address_search_id text;

create index if not exists bee_exemption_leads_email_lower_idx
  on public.bee_exemption_leads (lower(email));

comment on column public.bee_exemption_leads.address_search_id is
  'address_searches.id for the search this lead unlocked. Nullable until a search row is found.';

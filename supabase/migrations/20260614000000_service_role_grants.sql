-- Webhooks, worker e server actions usam service_role (bypass RLS).
-- Sem estes grants, ingest/upload falham com "permission denied for table ...".

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant all on storage.objects to service_role;
grant all on storage.buckets to service_role;

alter default privileges in schema public
grant all on tables to service_role;

alter default privileges in schema public
grant all on sequences to service_role;

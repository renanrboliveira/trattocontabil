-- Seed piloto E2 (dev/local). Vincular user_id após criar usuário no Auth.
-- Exemplo: update escritorio_membros set user_id = '<uuid>' where escritorio_id = (select id from escritorios where slug = 'e2-piloto');

insert into public.escritorios (id, nome, slug, email_inbound)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Escritório E2 (piloto)',
  'e2-piloto',
  'e2@inbound.extratopronto.local'
)
on conflict (slug) do nothing;

insert into public.competencias (escritorio_id, ano, mes)
values
  ('a0000000-0000-4000-8000-000000000001', 2026, 7),
  ('a0000000-0000-4000-8000-000000000001', 2026, 6)
on conflict (escritorio_id, ano, mes) do nothing;

insert into public.clientes (id, escritorio_id, cnpj, razao_social, telefone, email)
values
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    '12345678000199',
    'Empresa Alpha Ltda',
    '5511999990001',
    'alpha@cliente.example.com'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    '98765432000188',
    'Beta Comércio ME',
    '5511999990002',
    'beta@cliente.example.com'
  )
on conflict (escritorio_id, cnpj) do nothing;

insert into public.cliente_bancos (cliente_id, banco_codigo, banco_nome, conta_ref)
values
  ('b0000000-0000-4000-8000-000000000001', 'itau', 'Itaú', 'cc-001'),
  ('b0000000-0000-4000-8000-000000000001', 'bradesco', 'Bradesco', 'cc-001'),
  ('b0000000-0000-4000-8000-000000000002', 'nubank', 'Nubank', 'cc-001')
on conflict (cliente_id, banco_codigo, conta_ref) do nothing;

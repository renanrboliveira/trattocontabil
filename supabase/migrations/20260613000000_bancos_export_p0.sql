-- P0: catálogo bancos (BANKID OFX → banco_codigo)
-- Etapa 2a: exportações Alterdata + status exportado

create table public.bancos (
  codigo text primary key,
  nome text not null,
  febraban_id text not null unique,
  created_at timestamptz not null default now()
);

insert into public.bancos (codigo, nome, febraban_id) values
  ('bb', 'Banco do Brasil', '001'),
  ('santander', 'Santander', '033'),
  ('caixa', 'Caixa Econômica', '104'),
  ('bradesco', 'Bradesco', '237'),
  ('itau', 'Itaú', '341'),
  ('nubank', 'Nubank', '260'),
  ('inter', 'Banco Inter', '077'),
  ('sicredi', 'Sicredi', '748'),
  ('sicoob', 'Sicoob', '756')
on conflict (codigo) do nothing;

alter type public.extrato_status add value if not exists 'exportado';

create table public.exportacoes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  extrato_id uuid not null references public.extratos (id) on delete cascade,
  formato text not null default 'alterdata_csv_v1',
  arquivo_nome text not null,
  storage_path text not null,
  transacao_count int not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index exportacoes_extrato_idx on public.exportacoes (extrato_id, created_at desc);

alter table public.bancos enable row level security;
alter table public.exportacoes enable row level security;

create policy "bancos_select_all"
on public.bancos for select to authenticated
using (true);

create policy "exportacoes_select"
on public.exportacoes for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

grant select on public.bancos to authenticated;
grant select on public.exportacoes to authenticated;

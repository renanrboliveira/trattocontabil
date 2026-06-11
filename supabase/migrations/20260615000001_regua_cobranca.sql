-- Etapa 4: régua de cobrança — opt-in/out em clientes + log de cobranças

alter table public.clientes
  add column if not exists contato_nome text,
  add column if not exists regua_opt_in boolean not null default false,
  add column if not exists regua_opt_out_em timestamptz;

create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  competencia_id uuid not null references public.competencias (id) on delete cascade,
  tentativa int not null check (tentativa between 1 and 3),
  pendencias jsonb not null,
  mensagem text not null,
  status text not null check (status in ('pendente', 'enviada', 'dry_run', 'falha')),
  canal text not null default 'whatsapp',
  wamid text,
  erro text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index cobrancas_escritorio_cliente_competencia_idx
on public.cobrancas (escritorio_id, cliente_id, competencia_id);

create index cobrancas_created_at_idx
on public.cobrancas (escritorio_id, created_at desc);

alter table public.cobrancas enable row level security;

create policy "cobrancas_select"
on public.cobrancas for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

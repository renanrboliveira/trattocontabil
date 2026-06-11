-- Etapa 1: espinha dorsal — schema multi-tenant + fila + idempotência

create extension if not exists "pgcrypto";

-- Escritórios (tenant)
create table public.escritorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  email_inbound text,
  created_at timestamptz not null default now()
);

create table public.escritorio_membros (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'operador')),
  created_at timestamptz not null default now(),
  unique (escritorio_id, user_id)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  cnpj text not null,
  razao_social text not null,
  telefone text,
  email text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (escritorio_id, cnpj)
);

create index clientes_telefone_idx on public.clientes (escritorio_id, telefone)
where telefone is not null;

create index clientes_email_idx on public.clientes (escritorio_id, lower(email))
where email is not null;

create table public.cliente_bancos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  banco_codigo text not null,
  banco_nome text not null,
  conta_ref text not null default 'principal',
  created_at timestamptz not null default now(),
  unique (cliente_id, banco_codigo, conta_ref)
);

create table public.competencias (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  ano int not null check (ano between 2000 and 2100),
  mes int not null check (mes between 1 and 12),
  created_at timestamptz not null default now(),
  unique (escritorio_id, ano, mes)
);

create type public.extrato_canal as enum ('whatsapp', 'email', 'upload');

create type public.extrato_status as enum (
  'recebido',
  'processando',
  'convertido',
  'duplicado',
  'erro',
  'triagem'
);

create table public.extratos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete set null,
  cliente_banco_id uuid references public.cliente_bancos (id) on delete set null,
  competencia_id uuid references public.competencias (id) on delete set null,
  canal public.extrato_canal not null,
  status public.extrato_status not null default 'recebido',
  arquivo_hash text not null,
  arquivo_nome text,
  arquivo_mime text,
  storage_path text,
  idempotency_key text not null,
  remetente text,
  banco_codigo text,
  banco_nome text,
  transacao_count int not null default 0,
  erro_mensagem text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (escritorio_id, idempotency_key)
);

create index extratos_escritorio_created_idx
on public.extratos (escritorio_id, created_at desc);

create index extratos_status_idx on public.extratos (escritorio_id, status);

create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  extrato_id uuid not null references public.extratos (id) on delete cascade,
  data date not null,
  valor numeric(15, 2) not null,
  descricao text not null,
  tipo text not null check (tipo in ('C', 'D')),
  fitid text,
  created_at timestamptz not null default now()
);

create index transacoes_extrato_idx on public.transacoes (extrato_id);

create type public.job_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.pipeline_jobs (
  id uuid primary key default gen_random_uuid(),
  extrato_id uuid not null references public.extratos (id) on delete cascade,
  status public.job_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pipeline_jobs_pending_idx
on public.pipeline_jobs (status, created_at)
where status = 'pending';

-- Storage bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'extratos',
  'extratos',
  false,
  10485760,
  array['application/octet-stream', 'application/x-ofx', 'text/plain', 'application/pdf']
)
on conflict (id) do nothing;

-- RLS helper
create or replace function public.get_user_escritorio_ids()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select escritorio_id
  from public.escritorio_membros
  where user_id = (select auth.uid());
$$;

-- RLS
alter table public.escritorios enable row level security;
alter table public.escritorio_membros enable row level security;
alter table public.clientes enable row level security;
alter table public.cliente_bancos enable row level security;
alter table public.competencias enable row level security;
alter table public.extratos enable row level security;
alter table public.transacoes enable row level security;
alter table public.pipeline_jobs enable row level security;

create policy "escritorios_select_membros"
on public.escritorios for select to authenticated
using (id in (select public.get_user_escritorio_ids()));

create policy "membros_select_own"
on public.escritorio_membros for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

create policy "clientes_select"
on public.clientes for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

create policy "cliente_bancos_select"
on public.cliente_bancos for select to authenticated
using (
  cliente_id in (
    select id from public.clientes
    where escritorio_id in (select public.get_user_escritorio_ids())
  )
);

create policy "competencias_select"
on public.competencias for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

create policy "extratos_select"
on public.extratos for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

create policy "transacoes_select"
on public.transacoes for select to authenticated
using (
  extrato_id in (
    select id from public.extratos
    where escritorio_id in (select public.get_user_escritorio_ids())
  )
);

create policy "jobs_select"
on public.pipeline_jobs for select to authenticated
using (
  extrato_id in (
    select id from public.extratos
    where escritorio_id in (select public.get_user_escritorio_ids())
  )
);

-- Storage: membros leem arquivos do próprio escritório (path prefix = escritorio_id)
create policy "extratos_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'extratos'
  and (storage.foldername(name))[1] in (
    select id::text from public.escritorios
    where id in (select public.get_user_escritorio_ids())
  )
);

-- Grants for Data API
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

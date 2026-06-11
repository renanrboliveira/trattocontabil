-- Import em lote de clientes (CSV)

create type public.import_batch_status as enum (
  'completed',
  'partial',
  'failed'
);

create table public.clientes_import_batches (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios (id) on delete cascade,
  filename text,
  status public.import_batch_status not null,
  total_rows int not null default 0,
  clientes_criados int not null default 0,
  clientes_atualizados int not null default 0,
  bancos_criados int not null default 0,
  bancos_atualizados int not null default 0,
  erros jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index clientes_import_batches_escritorio_idx
on public.clientes_import_batches (escritorio_id, created_at desc);

alter table public.clientes_import_batches enable row level security;

create policy "import_batches_select"
on public.clientes_import_batches for select to authenticated
using (escritorio_id in (select public.get_user_escritorio_ids()));

grant select on public.clientes_import_batches to authenticated;

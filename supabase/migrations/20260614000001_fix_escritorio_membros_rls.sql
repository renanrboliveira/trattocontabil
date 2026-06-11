-- membros_select_own usava get_user_escritorio_ids(), que consulta a mesma tabela
-- com RLS → recursão infinita e nenhum membro visível ao authenticated.

create or replace function public.get_user_escritorio_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select escritorio_id
  from public.escritorio_membros
  where user_id = (select auth.uid());
$$;

revoke all on function public.get_user_escritorio_ids() from public;
grant execute on function public.get_user_escritorio_ids() to authenticated;
grant execute on function public.get_user_escritorio_ids() to service_role;

drop policy if exists "membros_select_own" on public.escritorio_membros;

create policy "membros_select_own"
on public.escritorio_membros for select to authenticated
using (user_id = (select auth.uid()));

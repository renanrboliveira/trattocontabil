-- Etapa 2b: conversão PDF — telemetria, triagem e aprovação manual

alter table public.extratos
  add column if not exists saldo_inicial numeric(15, 2),
  add column if not exists saldo_final numeric(15, 2),
  add column if not exists triagem_motivo text,
  add column if not exists conversao_modelo text,
  add column if not exists conversao_tokens_entrada int,
  add column if not exists conversao_tokens_saida int,
  add column if not exists conversao_tentativas int,
  add column if not exists aprovado_por uuid references auth.users (id) on delete set null,
  add column if not exists aprovado_em timestamptz;

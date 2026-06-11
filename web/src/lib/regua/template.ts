import { formatCompetenciaRegua } from "@/lib/regua/dates";

export type PendenciaSnapshot = {
  banco_codigo: string | null;
  banco_nome: string;
};

export function renderCobrancaMensagem(params: {
  contatoNome: string;
  escritorioNome: string;
  competenciaAno: number;
  competenciaMes: number;
  bancos: PendenciaSnapshot[];
  emailInbound: string | null;
}): { variables: string[]; mensagem: string } {
  const competencia = formatCompetenciaRegua(
    params.competenciaAno,
    params.competenciaMes
  );
  const listaBancos = params.bancos.map((b) => b.banco_nome).join(" · ");
  const email = params.emailInbound ?? "seu contador";

  const variables = [
    params.contatoNome,
    params.escritorioNome,
    competencia,
    listaBancos,
    email,
  ];

  const mensagem = [
    `Olá ${variables[0]}, aqui é do ${variables[1]}.`,
    "",
    `Pendências de extrato bancário (${variables[2]}):`,
    variables[3],
    "",
    `Envie PDF ou OFX por este WhatsApp ou para ${variables[4]}.`,
    "",
    "Responda PARAR para não receber lembretes automáticos.",
  ].join("\n");

  return { variables, mensagem };
}

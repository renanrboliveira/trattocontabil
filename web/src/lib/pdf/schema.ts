export const PDF_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "banco_nome",
    "banco_codigo_febraban",
    "conta_ref",
    "competencia",
    "saldo_inicial",
    "saldo_final",
    "escaneado",
    "ilegivel",
    "transacoes",
  ],
  properties: {
    banco_nome: { type: "string" },
    banco_codigo_febraban: { type: ["string", "null"] },
    conta_ref: { type: ["string", "null"] },
    competencia: {
      type: ["string", "null"],
      pattern: "^\\d{4}-\\d{2}$",
    },
    saldo_inicial: { type: ["number", "null"] },
    saldo_final: { type: ["number", "null"] },
    escaneado: { type: "boolean" },
    ilegivel: { type: "boolean" },
    transacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["data", "valor", "tipo", "descricao"],
        properties: {
          data: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          valor: { type: "number", minimum: 0 },
          tipo: { type: "string", enum: ["C", "D"] },
          descricao: { type: "string" },
        },
      },
    },
  },
} as const;

export const PDF_EXTRACTION_INSTRUCTION = `Extraia os dados deste extrato bancário brasileiro em PDF.

Regras:
- banco_nome: nome do banco emissor
- banco_codigo_febraban: código FEBRABAN de 3 dígitos se visível, senão null
- conta_ref: identificador da conta/agência se visível, senão null
- competencia: mês de referência do extrato no formato YYYY-MM, senão null
- saldo_inicial e saldo_final: saldos de abertura e fechamento do período; null se não identificados
- escaneado: true se o PDF for imagem escaneada (não texto nativo)
- ilegivel: true se texto ilegível ou qualidade muito baixa
- transacoes: todas as movimentações do período; valor sempre positivo; tipo C=crédito, D=débito
- Não inclua linhas de saldo ou totais como transações
- Datas no formato YYYY-MM-DD`;

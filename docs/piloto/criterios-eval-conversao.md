# Critérios de acerto — eval set de conversão

> Referência: `docs/plano-piloto.md` §5.3. Alvo do piloto: **≥ 95% sem triagem** no eval set.

## Composição mínima do eval set

- [ ] ≥ 30 extratos reais anonimizados
- [ ] ≥ 5 bancos distintos
- [ ] Mix PDF + OFX
- [ ] ≥ 3 edge cases: PDF com senha, escaneado, multi-conta

Armazenar em `docs/knowledge/eval-set/` (gitignored — dados sensíveis).

## Nível transação

Cada transação convertida deve ter corretos:

- Data
- Valor
- Descrição / histórico
- Tipo (crédito / débito)

## Nível competência

- Saldo inicial e final batem com o extrato fonte (± R$ 0,01)
- Contagem de transações igual ao extrato (exceto linhas de saldo/agregadores)

## Contagem de erro

| Tipo | Peso |
|---|---|
| Campo errado em transação | 1 erro |
| Transação omitida | 1 erro |
| Transação duplicada | 1 erro |

## Resultado por extrato

| Resultado | Condição |
|---|---|
| **Pass** | 0 erros |
| **Pass-with-triage** | Erros apenas em campos abaixo do threshold de confiança; corrigível em < 5 min |
| **Fail** | Qualquer erro material em valor, data ou transação omitida |

## Métrica agregada

```
acerto = extratos_pass / total_extratos × 100
```

Incluir breakdown por banco e formato (PDF vs OFX).

## Log de execuções

| Data | Versão pipeline | Pass | Pass-triage | Fail | % acerto |
|---|---|---|---|---|---|
| | | | | | |

# Kill criteria — semáforo go/no-go

> Referência: `docs/plano-piloto.md` §9. Revisar ao fim do **mês 1** (primeira competência com automação parcial).

## Sinais de alerta

| Sinal | Limiar | Ação |
|---|---|---|
| Conversão PDF | < 85% após 2 ciclos de calibração no eval set | **Pivot:** focar OFX + bancos digitais; PDF com triagem manual assistida |
| Taxa resposta régua (ambos canais) | < 40% | **Investigar:** tom, horário, canal. Não escalar para E3/E4. |
| Importação Alterdata | falha > 1x no mês | **Parar** feature work; fix layout antes de continuar |
| Contadora não usa painel | usa planilha paralela | Entrevista de emergência antes de etapa 5 |
| Triagem consome > 30 min/dia | sustentado 2 semanas | Repensar thresholds de confiança ou escopo PDF |

## Go para mês 2

- [ ] Conversão ≥ 90%
- [ ] Import Alterdata OK
- [ ] ≥ 1 cliente piloto fechou ponta a ponta
- [ ] Contadora declarou intenção de continuar

## No-go

Encerrar ou pivotar se: nenhum cliente piloto fechou ponta a ponta após **2 competências** **e** contadora não vê valor vs baseline.

## Registro de revisões

| Data | Competência | Decisão | Notas |
|---|---|---|---|
| | | | |

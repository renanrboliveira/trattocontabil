# PLANO DE PILOTO — "Extrato Pronto" (nome provisório)

> Documento fundador. Status: validação qualitativa concluída (jun/2026) → fase de piloto.
> **Revisão:** jun/2026 — incorpora lacunas operacionais, reordenação de entregas e critérios de medição identificados na análise pré-execução.
> Anexos do repo: `docs/spec-arquitetura.md` (spec completa) · `docs/knowledge/entrevistas/` (transcrições)

---

## 1. O que foi validado (e como)

**Tese:** escritórios contábeis que atendem muitos CNPJs pequenos perdem horas/dias por mês no fluxo de documentos — cobrar cliente, receber extrato/nota por WhatsApp e e-mail, converter manualmente e lançar no sistema contábil. Nenhum player resolve o fluxo de ponta a ponta; portais existem e não são usados.

**Evidência (4 entrevistas, jun/2026):**

| | E1 | E2 | E3 | E4 |
|---|---|---|---|---|
| Porte | 20 clientes grandes | **100 CNPJs Simples** | **30–80 Simples** | até 30 Simples |
| ICP | Fora | 🎯 Dentro | 🎯 Dentro | Borderline |
| Canal de docs | portal/e-mail | e-mail + WhatsApp | e-mail | **WhatsApp** |
| Cobrança de pendência | — | manual | manual | manual |
| Lançamento de extrato | — | dor nº 1 citada | "mistura de tudo", dias/mês | "um a um", em caps lock |
| Dor espontânea (perg. aberta) | DF anual | converter extrato | caça docs + conversão | XML + lançar extratos |
| Gasto software/mês | alto (MXM) | R$ 1.100 | R$ 800–1.500 | até R$ 300 |
| Topou ver solução | sim | **sim** | **sim** | **sim** |

**Resultado:** 3 de 3 escritórios do perfil citaram espontaneamente a mesma dor. Critérios do semáforo: todos verdes.

**Limitação consciente:** amostra qualitativa pequena (n=4, n=3 no ICP). O piloto é o teste quantitativo — métricas e kill criteria (§9) definem go/no-go.

**Aprendizados de segmentação:**
- Clientes-grandes (E1) têm outra dor (fechamento/DF — fora de escopo).
- Escritórios até 30 CNPJs (E4) têm a dor mas teto de preço menor → pricing por faixa; posicionar como módulo de extrato, não suite.

---

## 2. Escopo do piloto

**Dentro (o fluxo do extrato, ponta a ponta):**

1. Cadastro de clientes do escritório + bancos de cada cliente + telefone/e-mail do responsável (checklist mensal de extratos esperados)
2. Régua de cobrança automática via WhatsApp (template utility, 1 msg/cliente/dia agregando pendências de todos os bancos)
3. Recepção de extratos por **WhatsApp + e-mail** (piloto híbrido — ver §2.1)
4. Conversão: parser OFX determinístico + Claude (visão) para PDF, com thresholds de confiança e fila de triagem
5. Exportação no layout de importação do **Alterdata** (sistema da E2; confirmar E3/E4 e priorizar o segundo layout por demanda)
6. Painel mínimo: matriz cliente × banco × competência (chegou / falta / convertido / exportado / triagem) + fila de triagem

**Fora (anotado, não esquecido):** busca de XML (mercado já atendido por Arquivei/SIEG — avaliar integração na fase 2) · assistente IA de dúvidas (fase 2, human-in-the-loop) · Embedded Signup/número por escritório (pós-piloto) · billing (pós-piloto) · gestão de tarefas internas · qualquer coisa fiscal (nunca).

**Topologia WhatsApp do piloto:** número único compartilhado (Cloud API direta da Meta). Migração para número-por-escritório antes de abrir vendas.

### 2.1 Decisão de canal: piloto híbrido

E2 e E3 recebem documentos principalmente por **e-mail**; E4 por **WhatsApp**. Piloto WhatsApp-only arriscaria confundir falha de produto com falha de canal.

| Canal | Uso no piloto |
|---|---|
| **WhatsApp** | Régua de cobrança + recepção de extratos (PDF/OFX) |
| **E-mail** | Recepção de extratos desde a etapa 1 (inbox dedicada por escritório ou endereço `@escritorio.extrato...`) |

Métricas de resposta **separadas por canal** (§5). Se taxa WhatsApp < 50% mas e-mail > 70%, conclusão é de canal, não de tese.

### 2.2 Roteamento multi-tenant (número compartilhado)

Antes da etapa 1 de código, definir protocolo de identificação:

1. **Cadastro prévio:** telefone e e-mail do cliente final ↔ CNPJ ↔ bancos esperados
2. **Match automático:** mensagem/e-mail de remetente conhecido → associa escritório + CNPJ + banco (inferido por checklist pendente ou confirmação)
3. **Confirmação automática:** "Recebi extrato Itaú jan/26 de Empresa X — confirma?" (botão/sim/não)
4. **Fallback:** remetente desconhecido → fila de triagem manual (contadora ou operador)
5. **Isolamento:** RLS garante que escritório A nunca vê dados de escritório B

### 2.3 Compliance mínimo (LGPD)

Fluxo B2B2C — cliente final envia dado financeiro sensível. Obrigatório antes do kick-off:

| Item | Responsável | Entregável |
|---|---|---|
| Termo piloto escritório ↔ produto | Produto | `docs/piloto/termo-piloto.md` |
| Modelo de opt-in cliente final | Escritório encaminha | Mensagem padrão autorizando envio de extrato via WhatsApp/e-mail |
| Papéis LGPD | Documentado | Escritório = controlador; produto = operador |
| Retenção | Produto | 90 dias pós-piloto; delete on request |
| Eval set anonimizado | Produto | Protocolo: remover CNPJ, nomes, contas; manter layout/valores relativos |
| Segurança | Produto (spec) | Nunca persistir senha de PDF; nunca logar conteúdo de extrato em plain text |

---

## 3. Oferta fundadora (E2, E3, E4)

- Piloto **gratuito por 60–90 dias** em troca de:
  - (a) feedback quinzenal de 20 min (roteiro fixo — §3.2)
  - (b) extratos reais anonimizados para calibrar conversão (eval set — §4.0)
  - (c) permissão para usar resultados como caso (anônimo se preferirem)
  - (d) baseline de tempo na semana 0 (§3.1)
- Ao final: **preço de fundador vitalício (50% da tabela) até N CNPJs** contratados no piloto (ex.: 30). Acima disso, tabela normal. Evita unit economics quebrado se E2 escalar para 100 CNPJs.
- **Sequência de escritórios:**
  - **E2 only** até 1 competência fechada com sucesso
  - **E3** na competência 2 (validar segundo layout/perfil)
  - **E4** na competência 3 (validar teto de preço + perfil WhatsApp-native)
- Começar pelo escritório E2 (100 CNPJs, Alterdata, dor mais aguda) com **5–10 clientes** dele — não os 100. Expandir dentro do escritório antes de expandir entre escritórios.

### 3.1 Baseline semana 0

Antes de ligar qualquer automação, a contadora E2 registra para os 5–10 clientes piloto (competência anterior):

- Tempo de cobrança manual (min)
- Tempo de conversão manual (min)
- Tempo de importação/lançamento (min)
- Nº de reenvios/erros no mês

Esse número vira referência para "horas economizadas" — não depender só de recall das entrevistas.

### 3.2 Roteiro feedback quinzenal (20 min)

1. **O que funcionou / quebrou** (5 min) — ela lista, não você
2. **Demo ao vivo** de 1 fluxo (5 min)
3. **Top 3 fricções** ranqueadas por ela (5 min)
4. **Próxima prioridade** — ela escolhe o que desbloquear (5 min)

### 3.3 Critérios de seleção dos 5–10 clientes (E2)

- Mix **PDF + OFX** (não só bancos digitais)
- Pelo menos **2 bancos "difíceis"** (Caixa, Bradesco layout antigo, etc.)
- Clientes que **já respondem** WhatsApp/e-mail (não os mais problemáticos do escritório)
- **1 edge case** de propósito: múltiplas contas, PDF com senha, ou extrato escaneado
- Cadastro completo: CNPJ, bancos, telefone, e-mail do responsável

---

## 4. Sequência de construção

Ritmo: sem prazo externo — qualidade sobre velocidade ("sem pressa" é vantagem).

**Regra anticaverna:** nenhuma etapa dura mais de 2 semanas sem algo ser mostrado a uma contadora real.

**Janela de mercado:** marcos da Reforma em ago/2026 (IBS/CBS) e set/2026 (opção do Simples) sobrecarregam escritórios. Kick-off do piloto **antes de ago/2026** ou explicitamente **após out/2026**. Marketing pode citar reforma; produto não depende dela.

### 4.0 Etapa 0 — Pré-requisitos (semana 0, sem código de produto)

| Entrega | Critério de pronto |
|---|---|
| Termo piloto + opt-in cliente final | Assinado pela E2; modelo de mensagem pronto para encaminhar |
| Eval set | ≥ 30 extratos reais anonimizados; ≥ 5 bancos; mix PDF/OFX; critérios em `docs/piloto/criterios-eval-conversao.md` |
| Import Alterdata validado | 1 arquivo gerado manualmente importa OK no Alterdata da E2 (`docs/knowledge/layouts-importacao/alterdata/sample-import.csv`) |
| Templates Meta submetidos | Utility templates em review (aprovação leva dias — não esperar etapa 4) |
| Baseline E2 | Tempos registrados para os 5–10 clientes piloto (§3.1) |
| Calendário competência | Definido: qual mês fecha quando (§4.1) |

**Checklist "pronto para codar":** todos os itens acima ✓ antes da etapa 1.

### 4.1 Calendário da competência piloto

Definir explicitamente com a E2 no kick-off:

| Marco | Exemplo (ajustar com E2) |
|---|---|
| Competência piloto | jul/2026 |
| Início régua | 01/ago/2026 |
| Deadline interno escritório | dia 10 do mês seguinte |
| Fechamento piloto (etapa 6) | ago/2026 |
| "Mês 2 zero manual" | set/2026 |

"Mês 2" = segunda competência completa com automação ligada, não 60 dias corridos desde o signup.

### 4.2 Etapas de produto

| Etapa | Entrega | Critério de pronto |
|---|---|---|
| **1. Espinha dorsal** | Webhook Meta + inbox e-mail + fila + schema/RLS + parser OFX + idempotência (hash arquivo + competência) | extrato OFX enviado no zap **ou** e-mail aparece classificado no banco; reenvio duplicado é ignorado |
| **2a. Export Alterdata** | Layout Alterdata + ZIP/manifest a partir de OFX ou fixture | contadora E2 importa um mês real **sem retrabalho** |
| **2b. Conversão PDF** | Claude visão + structured output + triagem + detecção PDF com senha/escaneado | ≥ 95% de acerto no eval set (§5.1) |
| **3. Painel** | Matriz cliente × banco × competência + fila de triagem | contadora vê a competência inteira numa tela; triagem < 5 min/extrato |
| **4. Régua + checklist** | Cron de cobrança agregada + rollover mensal | cliente-teste recebe cobrança; envio dá baixa sozinho |
| **5. Fechamento real** | 1 competência completa de 5–10 clientes da E2 | zero cobrança manual e zero conversão manual no mês |

**Por que export antes da régua:** integração contábil é onde está a dor #1 (E2). Validar layout cedo evita descobrir incompatibilidade na etapa final. Régua liga por último porque depende de recepção/conversão/export estáveis e é o componente mais sensível (Meta + comportamento do cliente final).

**Paralelismo:** 2a e 2b podem avançar em paralelo após etapa 1.

---

## 5. Métricas de sucesso do piloto

### 5.1 Norte

No **mês 2** (segunda competência — §4.1), o escritório fecha a competência dos clientes-piloto **sem nenhuma cobrança manual e nenhuma conversão manual**.

Triagem manual é aceitável se < 10% dos extratos e SLA < 5 min/extrato.

### 5.2 Métricas operacionais

| Métrica | Alvo | Notas |
|---|---|---|
| Taxa de resposta à régua | > 70% enviam após ≤ 3 lembretes | **Separar por canal** (WhatsApp vs e-mail) |
| Precisão conversão (sem triagem) | ≥ 95% | Definição formal abaixo |
| Precisão pós-triagem | 100% | Medir também **tempo médio de triagem** e **% auto-resolvido** |
| Horas/mês economizadas | > baseline semana 0 | Log simples: checkbox por cliente/competência |
| Time-to-export | < 24h após recebimento do último extrato | Proxy da dor "dias/mês" |
| Pergunta Van Westendorp | Ancorada | Mostrar faixa de preço (§6) **antes** de "quanto pagaria?" |

### 5.3 Definição de acerto (eval set)

Documento completo em `docs/piloto/criterios-eval-conversao.md`. Resumo:

**Nível transação:** data, valor, descrição, tipo (C/D) corretos.

**Nível competência:** saldo inicial/final bate com extrato (± R$ 0,01).

**Contagem de erro:**
- Campo errado em transação = 1 erro
- Transação omitida = 1 erro
- Transação duplicada = 1 erro

**Acerto por extrato:** 0 erros = pass; qualquer erro = fail (ou pass-with-triage se confiança < threshold).

**Eval set mínimo:** 30 extratos, ≥ 5 bancos, mix PDF/OFX, incluir ≥ 3 edge cases (senha, escaneado, multi-conta).

---

## 6. Pricing-alvo pós-piloto (hipótese a calibrar)

Faixas por **CNPJ ativo no fluxo** (só quem recebe régua na competência), transparentes no site, self-service:

| Faixa | Preço/mês (tabela) | Fundador (50%) |
|---|---|---|
| até 30 CNPJs | R$ 99–149 | R$ 50–75 |
| até 80 | R$ 249 | R$ 125 |
| até 150 | R$ 399 | R$ 200 |
| acima | sob consulta | — |

**Fundador vitalício:** 50% da tabela **até N CNPJs contratados no piloto** (sugerido: 30). Acima, tabela normal.

**E4 (borderline):** posicionar como módulo único de extrato (~R$ 99), não substituto de suite contábil.

Unit economics na spec: COGS variável 15–20%, margem bruta ~80–85%.

---

## 7. Estrutura do repo (dia 1)

```
CLAUDE.md                       # convenções, stack, regras (nunca tocar fiscal, LGPD, idempotência)
docs/
  plano-piloto.md               # este arquivo
  spec-arquitetura.md           # spec completa (features, schema, pipeline, LGPD)
  piloto/
    termo-piloto.md             # termo escritório ↔ produto
    protocolo-lgpd-piloto.md    # papéis, retenção, anonimização eval set
    roteiro-feedback-quinzenal.md
    criterios-eval-conversao.md # definição dos 95%
    calendario-competencia-piloto.md
    kill-criteria.md            # semáforo go/no-go (§9)
  knowledge/
    entrevistas/                # transcrições E1–E4 (palavras reais = contexto de produto)
    reforma-tributaria.md       # cronograma IBS/CBS (marketing + futuro assistente)
    layouts-importacao/
      alterdata/
        sample-import.csv       # arquivo real que importou OK
        field-mapping.md
    bancos/                     # particularidades de extrato por banco (vai crescendo)
.claude/commands/               # slash commands (ex.: /eval-conversao roda o eval set)
```

**Regras em CLAUDE.md (além das existentes):**
- Nunca persistir senha de PDF
- Nunca logar conteúdo de extrato em plain text
- Idempotência obrigatória: hash(arquivo) + competência + CNPJ + banco

---

## 8. Riscos e respostas

| Risco | Resposta |
|---|---|
| **Conversão vira commodity** | Produto = orquestração (régua + canal + integração), não conversor. Conversores grátis existem há anos e a dor persistiu (E2/E3/E4). |
| **Incumbente copia** (Ottimizza/Acessórias) | Velocidade no nicho + WhatsApp como posição + relação direta; aquisição é saída aceitável. |
| **Banimento/limites Meta** | API oficial, templates utility aprovados, opt-out respeitado. Templates submetidos na semana 0. Número por escritório pós-piloto isola risco. |
| **Cliente final não responde** | Métrica por canal desde etapa 4. Se WhatsApp < 50% mas e-mail > 70% → ajustar canal, não matar tese. Investigar tom/horário antes de concluir. |
| **PDF com senha / escaneado** | Detecção automática + mensagem ao cliente ("envie sem senha"); fila separada para escaneados; nunca persistir senha. |
| **Duplicatas e reenvios** | Idempotência na etapa 1 (hash + competência). |
| **Cross-tenant no WhatsApp compartilhado** | Protocolo de roteamento (§2.2) + RLS + confirmação automática. |
| **Layout Alterdata errado** | Validar import na etapa 0 (manual) e etapa 2a (automático) — antes de régua. |
| **Caverna** | Regra das 2 semanas + feedback quinzenal roteirizado (§3.2). |
| **Reforma sobrecarrega escritórios** | Kick-off antes ago/2026 ou após out/2026 (§4). |

---

## 9. Kill criteria (semáforo go/no-go)

Revisar ao fim do **mês 1** (primeira competência com automação parcial):

| Sinal | Limiar | Ação |
|---|---|---|
| Conversão PDF | < 85% após 2 ciclos de calibração no eval set | **Pivot:** focar OFX + bancos digitais; PDF com triagem manual assistida |
| Taxa resposta régua (ambos canais) | < 40% | **Investigar:** tom, horário, canal. Não escalar para E3/E4. |
| Importação Alterdata | falha > 1x no mês | **Parar** feature work; fix layout antes de continuar |
| Contadora não usa painel | usa planilha paralela | Problema de UX/adoption — entrevista de emergência antes de etapa 5 |
| Triagem consome > 30 min/dia | sustentado 2 semanas | Repensar thresholds de confiança ou escopo PDF |

**Go para mês 2 (competência completa):** conversão ≥ 90%, import Alterdata OK, ≥ 1 cliente piloto fechou ponta a ponta, contadora declarou intenção de continuar.

**No-go (encerrar ou pivotar produto):** nenhum cliente piloto fechou ponta a ponta após 2 competências **e** contadora não vê valor vs baseline.

---

## Changelog

| Data | Mudança |
|---|---|
| jun/2026 (original) | Documento fundador pós-entrevistas |
| jun/2026 (rev. 1) | Etapa 0 + checklist pré-código; piloto híbrido (WhatsApp + e-mail); roteamento multi-tenant; LGPD mínimo; baseline semana 0; reordenação export → painel → régua; definição formal de acerto; métricas refinadas; kill criteria; teto fundador; critérios seleção clientes; calendário competência; expansão estrutura repo |

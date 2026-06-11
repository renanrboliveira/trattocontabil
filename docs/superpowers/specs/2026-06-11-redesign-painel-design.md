# Redesign do painel — Extrato Pronto

Data: 2026-06-11
Status: aprovado pelo Renan (brainstorm com visual companion; mockups em `.superpowers/brainstorm/74891-1781192457/content/` e `docs/design/`)

## Contexto

O painel atual (header no topo, accent teal `#0c6464`, Plus Jakarta Sans) é limpo mas genérico e não escala: a matriz cliente × banco lista todas as linhas numa página única. Escritórios reais chegam a ~100 clientes (~220 contas bancárias). O redesign precisa ser mais profissional e continuar legível e navegável nesse volume.

Direções exploradas: A (editorial/serif), B (sidebar + densidade de dados), C (evolução do header atual). **Escolhida: B**, com paleta verde-pinheiro (continuidade do teal da marca). Referência de qualidade: SaaS B2B como Mercury/Stripe/Linear.

## Decisões de design

### 1. Estrutura

- **Sidebar fixa escura** (232px, `#0d1f1b`):
  - Marca (bloco "EP" + nome).
  - Bloco do escritório (nome + nº de clientes ativos).
  - Navegação agrupada — Operação: Painel, Extratos, Exportações; Cadastro: Clientes, Configurações.
  - Badge âmbar de pendências ao lado de "Extratos" (contagem de triagem/erro), visível de qualquer tela.
  - "Sair" no rodapé da sidebar.
- **Topbar branca** (56px, sticky) por página: título, seletor de competência, ação primária à direita (ex.: "Exportar p/ Alterdata").
- Conteúdo com `max-width` ~1080px.
- Mobile: sidebar colapsa em menu hambúrguer (drawer). Piloto é desktop-first; o drawer pode ser simples.

### 2. Tokens de cor (substituem os atuais em `globals.css`)

```css
--sidebar: #0d1f1b;        /* fundo sidebar */
--sidebar-hover: #16312b;  /* item ativo/hover */
--sidebar-text: #8fa39d;   /* texto inativo na sidebar */
--bg: #f4f7f6;             /* fundo geral */
--surface: #ffffff;
--ink: #14201d;            /* texto principal */
--ink-soft: #51635e;       /* texto secundário */
--ink-faint: #7e8d88;      /* labels, metadados */
--border: #e0e6e4;
--accent: #0e5246;         /* verde-pinheiro */
--accent-hover: #0a4038;
--accent-soft: #e2efec;
--amber: #b45309;          /* pendências/atenção */
```

Status badges (fundo suave + texto escuro, sem ring):

| status | fundo | texto |
|---|---|---|
| convertido | `#e3f2e9` | `#15633a` |
| exportado | `--accent-soft` | `--accent` |
| recebido | `#e6eefb` | `#1e51b8` |
| processando | `#faf0dc` | `--amber` |
| triagem | `#faf0dc` | `--amber` |
| duplicado | `#edf1ef` | `--ink-faint` |
| falta | `#edf1ef` | `--ink-faint` |
| erro | `#fbe8e8` | `#b42323` |

### 3. Tipografia

- **Hanken Grotesk** (400/500/600/700) substitui Plus Jakarta Sans — body 14px.
- **IBM Plex Mono** (mantida) para datas, competências (`05/2026`), CNPJ e números tabulares.
- `font-variant-numeric: tabular-nums` em valores numéricos de stats e tabelas.

### 4. Painel orientado a exceção (escala para 100+ clientes)

- **Stats** (4 cards): Recebidos `X / total` com barra de progresso; Convertidos (% do recebido); Exportados; Pendências (breakdown "N triagem · N falta · N erro" em âmbar).
- A matriz plana atual é substituída por **"Pendências da competência"**: lista só o que precisa de ação (falta, triagem, erro).
  - Chips de filtro com contagem: Todas / Falta / Triagem / Erro / Banco.
  - Busca por cliente ou CNPJ.
  - Paginação (server-side; ~25–50 por página) e `thead` sticky.
  - Coluna **Ação** com o próximo passo: "Cobrar via WhatsApp" (falta), "Identificar →" (triagem), "Ver detalhe →" (erro). No escopo atual, "Cobrar via WhatsApp" pode ser placeholder/link desabilitado até a régua (Etapa 4).
- A lista completa cliente × banco (incluindo OK) migra para as futuras páginas "Clientes" e "Extratos" com a mesma busca/filtros. Nesta etapa, a sidebar já existe com esses itens; os que não têm página própria ainda apontam para âncoras/seções do painel ou ficam ocultos (decidir na implementação pelo menor custo — não criar páginas vazias).
- Cards de upload (Importar clientes / Enviar extrato OFX) permanecem no painel, em grid 2 colunas, restilizados.

### 5. Navegação entre competências

- Seletor no topbar: `◀ MM/AAAA ▾ ▶`.
  - Setas trocam o mês adjacente; clique no chip abre dropdown.
  - Dropdown lista competências com barra de progresso, % e estado: `ativa`, `N pendências` (âmbar), `fechada ✓`.
- A competência selecionada escopa toda a página (stats, pendências, extratos) via query param: `/painel?comp=2026-04`. Default: competência ativa (mais recente).
- Ao visualizar competência não-ativa, banner âmbar: "Você está vendo 04/2026 — Voltar para a ativa →".
- "Fechada" = derivado (100% exportado), sem novo estado no banco nesta etapa.

### 6. Telas afetadas

- `web/src/app/globals.css` — novos tokens + fontes.
- `web/src/app/layout.tsx` — Hanken Grotesk no lugar de Plus Jakarta Sans.
- `web/src/components/app-shell.tsx` — reescrito: sidebar + topbar (server component; nav recebe contagem de pendências e competências).
- `web/src/components/ui/button.tsx`, `card.tsx` (Card/StatCard com barra de progresso), `status-badge.tsx`, `data-table.tsx` (+ paginação, chips de filtro, busca) — restilizados.
- `web/src/app/painel/page.tsx` — painel por exceção + seletor de competência.
- `web/src/app/login/page.tsx` — mesma paleta/tipografia (tela centrada, sem sidebar).
- `web/src/app/admin/page.tsx` — herda AppShell novo.
- Página de detalhe do extrato (`/painel/extratos/[id]`) — herda AppShell novo.

### 7. Fora de escopo (etapas futuras)

- Páginas dedicadas Extratos/Clientes/Exportações/Configurações com listas completas.
- Ação real "Cobrar via WhatsApp" (régua de cobrança — Etapa 4 do plano piloto).
- Dark mode.
- Fechamento explícito de competência (estado no banco).

## Critérios de aceite

1. Painel com sidebar escura, topbar com seletor de competência funcional (query param) e stats com progresso.
2. Tabela de pendências com chips de filtro, busca e paginação funcionando com 200+ pares cliente × banco (testar com seed de volume).
3. Nenhuma regressão funcional: upload OFX, import de clientes, navegação para detalhe do extrato e logout continuam funcionando.
4. Login e admin com a nova identidade.
5. Tipografia e tokens aplicados via CSS variables — nenhuma cor hardcoded nova fora de `globals.css`/config de status.

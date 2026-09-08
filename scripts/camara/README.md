# Sync RelGov ↔ Câmara dos Deputados (Dados Abertos v2)

Módulo de sincronização que **provisiona as coleções no Appwrite** (banco `relgov`) e **importa** os dados da API pública da Câmara. Sem dependências além do SDK de servidor `node-appwrite`.

Cobre os 10 endpoints do RelGov + `partidos` (apoio, para enumerar os líderes):

| Coleção Appwrite | Endpoint de origem |
|---|---|
| `deputados` | `/deputados` + `/deputados/{id}` |
| `deputado_frentes` | `/deputados/{id}/frentes` |
| `deputado_orgaos` | `/deputados/{id}/orgaos` |
| `proposicoes` | `/proposicoes` + `/proposicoes/{id}` |
| `tramitacoes` | `/proposicoes/{id}/tramitacoes` |
| `ref_situacoes_proposicao` | `/referencias/situacoesProposicao` |
| `orgaos` | `/orgaos` |
| `partidos` | `/partidos` (apoio) |
| `partido_lideres` | `/partidos/{id}/lideres` |
| `legislatura_lideres` | `/legislaturas/{id}/lideres` |

## Instalação

Sem instalação extra — usa o `node-appwrite` já presente no projeto (API `TablesDB`, v17+).

Coloque a pasta `scripts/camara/` no projeto RelGov. As variáveis já usadas pelo app são reaproveitadas (`.env.local`):

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://backend.eventco.com.br/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=default-6a83a090002d1ccba004
APPWRITE_API_KEY=...              # server-only (escopos: databases read+write)
APPWRITE_DATABASE_ID=relgov
```

> A `APPWRITE_API_KEY` precisa de permissão de escrita em Databases para criar coleções/atributos.

## Uso

```bash
# provisiona as coleções e sincroniza tudo (proposições dos últimos 12 meses)
node scripts/camara/run.mjs

# só cria/atualiza a estrutura das coleções
node scripts/camara/run.mjs --provisionar

# só sincroniza (coleções já existem)
node scripts/camara/run.mjs --sincronizar

# um passo específico
node scripts/camara/run.mjs --only=proposicoes
node scripts/camara/run.mjs --only=deputados,orgaos

# proposições filtradas por tipo e período
node scripts/camara/run.mjs --only=proposicoes --tipos=PL,PEC --desde=2025-01-01 --ate=2026-09-06

# pular sub-passos pesados
node scripts/camara/run.mjs --only=deputados --sem=frentes,orgaos-dep,detalhe-dep
node scripts/camara/run.mjs --only=proposicoes --sem=tramitacoes
```

Se o seu Node não tiver o carregamento de `.env.local` embutido, o próprio script já lê o arquivo. Alternativamente: `node --env-file=.env.local scripts/camara/run.mjs`.

### Flags

| Flag | Efeito |
|---|---|
| `--provisionar` | Só provisiona (não sincroniza) |
| `--sincronizar` | Só sincroniza (não provisiona) |
| `--only=a,b` | Executa apenas estes passos: `situacoes`, `orgaos`, `partidos`, `lideres-partido`, `lideres-legislatura`, `deputados`, `proposicoes` |
| `--tipos=PL,PEC` | Tipos de proposição (padrão: PL, PLP, PEC, MPV, PDL) |
| `--desde=YYYY-MM-DD` `--ate=YYYY-MM-DD` | Janela de `dataApresentacao` (padrão: últimos 12 meses) |
| `--leg=57` | Legislatura (padrão: atual, detectada pela API) |
| `--sem=...` | Pula sub-passos: `detalhe-dep`, `frentes`, `orgaos-dep`, `detalhe-prop`, `tramitacoes` |
| `--delay=120` | Pausa (ms) entre itens que fazem requisições por id |

## Como funciona

- **Idempotente**: cada documento usa um `$id` determinístico (ex.: id da proposição; `deputado_frente` = `depId_frenteId`; `tramitacao` = `propId_sequencia`). Rerodar **atualiza**, não duplica — seguro para agendar.
- **Upsert**: cria; em conflito (409), atualiza.
- **Paginação** segue `links rel="next"` (100 itens/página) com pausa entre páginas.
- **Retry** com backoff em 429/5xx (respeita `Retry-After`).
- **Referências** (`ref_situacoes_proposicao`) mudam raramente — sincronize de vez em quando e use como de-para de `codSituacao` no painel.
- **CPF** do deputado é ignorado de propósito (dado pessoal, desnecessário ao painel).

## Sugestão de agendamento

Um cron diário para o incremental (proposições/tramitações recentes) e um semanal para o resto:

```bash
# diário — proposições e tramitações dos últimos 30 dias
node scripts/camara/run.mjs --sincronizar --only=proposicoes --desde=$(date -d '30 days ago' +%F)

# semanal — estrutura + deputados + líderes + órgãos
node scripts/camara/run.mjs --sincronizar --only=situacoes,orgaos,partidos,lideres-partido,lideres-legislatura,deputados
```

## Nota sobre versão do SDK

O código usa a API `TablesDB` do `node-appwrite` (v17+) — a mesma usada no resto do RelGov (`scripts/setup-appwrite.mjs`). Se seu `node-appwrite` for anterior (v11–v14, API clássica `Databases`), `appwrite.mjs` avisa em vez de falhar sem explicação.

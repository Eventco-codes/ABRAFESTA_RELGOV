# RelGov · Sync Câmara — Appwrite Function (agendada)

Function que roda no seu Appwrite self-hosted e mantém o banco `relgov` sincronizado com a API pública da Câmara dos Deputados. Uma única função cobre **incremental diário** e **varredura completa semanal** (decidido pelo dia da semana).

## Como decide o que rodar

Nas execuções agendadas o modo é `auto`:

- **Dia da semana `RELGOV_FULL_DOW`** (padrão `0` = domingo, em UTC) → **full**: provisiona as coleções (idempotente) e sincroniza tudo — situações, órgãos, partidos, líderes, deputados (com frentes e órgãos) e proposições dos últimos `RELGOV_FULL_MONTHS` meses com tramitações.
- **Demais dias** → **incremental**: só proposições + tramitações dos últimos `RELGOV_INCREMENT_DAYS` dias.

Idempotente: cada documento tem `$id` determinístico, então rerodar **atualiza**, nunca duplica.

## Variáveis da função

Chave de acesso ao banco — escolha **um** caminho:

- **Appwrite 1.5+ (recomendado):** nada a fazer além dos `scopes` já declarados no `appwrite.json` (`databases.read`, `databases.write`). A cada execução a função recebe uma **chave dinâmica** no header `x-appwrite-key`, usada automaticamente.
- **Versões anteriores:** crie a variável `APPWRITE_API_KEY` na função (API key server com escopos de databases read+write).

`APPWRITE_FUNCTION_API_ENDPOINT` e `APPWRITE_FUNCTION_PROJECT_ID` são injetadas pelo Appwrite — não precisa configurar. Se o endpoint interno não resolver, defina `APPWRITE_ENDPOINT` manualmente.

Ajustes opcionais (todas têm padrão):

| Variável | Padrão | Efeito |
|---|---|---|
| `APPWRITE_DATABASE_ID` | `relgov` | Banco alvo |
| `RELGOV_FULL_DOW` | `0` | Dia da varredura completa (0=dom … 6=sáb, UTC) |
| `RELGOV_INCREMENT_DAYS` | `30` | Janela do incremental diário |
| `RELGOV_FULL_MONTHS` | `12` | Janela de proposições na varredura completa |
| `RELGOV_TIPOS` | `PL,PLP,PEC,MPV,PDL` | Tipos de proposição |
| `RELGOV_ITEM_DELAY_MS` | `120` | Pausa entre requisições por id |

## Deploy (Appwrite CLI)

```bash
npm i -g appwrite-cli
appwrite login
# a partir da raiz do projeto (onde está o appwrite.json):
appwrite push functions
```

Isso cria/atualiza a função `relgov-camara-sync` com o agendamento `0 8 * * *` (**08:00 UTC = 05:00 BRT**, diário). O ramo por dia da semana faz o resto.

Depois do primeiro deploy, rode uma vez em modo `full` para provisionar e popular:

```bash
appwrite functions create-execution \
  --function-id relgov-camara-sync \
  --body '{"mode":"full"}'
```

(ou dispare pelo Console → Functions → Execute, com o corpo `{"mode":"full"}`.)

## Sobre o timeout

A varredura **full** faz muitas requisições (deputados com detalhe/frentes/órgãos + proposições de 12 meses com tramitações) e pode levar vários minutos. O `appwrite.json` já pede `timeout: 900` (15 min). Confirme que o servidor permite: a env global `_APP_FUNCTIONS_TIMEOUT` do Appwrite precisa ser ≥ ao timeout da função. Se a full estourar o tempo:

- reduza `RELGOV_FULL_MONTHS` (ex.: 6), ou
- rode a full manualmente/menos vezes e deixe o agendamento só no incremental (`RELGOV_FULL_DOW` num dia que nunca cai, ou dispare a full sob demanda).

O **incremental diário** é leve e roda tranquilo dentro do timeout.

## Acionamento manual

- `{"mode":"provision"}` — só cria/atualiza as coleções.
- `{"mode":"incremental"}` — força o incremental fora do dia.
- `{"mode":"full"}` — força a varredura completa.

## Runtime

Escrita em ESM (`.mjs`) e `node-appwrite@^28` (API `TablesDB`) — a mesma versão usada no restante do RelGov. Se sua instância tiver runtime `node-22.0`, pode trocar em `appwrite.json`.

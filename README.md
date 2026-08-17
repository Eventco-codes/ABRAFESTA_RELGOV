# RelGov ABRAFESTA

Painel interno da ABRAFESTA para acompanhamento de pautas legislativas, regulatórias e tributárias do setor de eventos: cadastro de pautas, cadastro de pendências com prazo, e uma rotina semanal que resume o que mudou.

Stack: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, backend em **Appwrite self-hosted** (Databases, Auth, Functions).

## 1. Subir o Appwrite (self-hosted)

Instância própria, via instalador oficial (não é um `docker-compose.yml` escrito à mão — o stack do Appwrite tem vários serviços internos mantidos pelo instalador):

```sh
docker run -it --rm \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
  --entrypoint="install" \
  appwrite/appwrite:1.6.0
```

Isso gera um `docker-compose.yml` do Appwrite na pasta escolhida — suba com `docker compose up -d`. O Console fica disponível no host/porta configurados no instalador.

## 2. Configurar o projeto no Console

1. Crie um **Project** → anote o **Project ID**.
2. **Project → Overview → Integrate → API Keys**: crie uma API Key com escopos `databases.read`, `databases.write`, `users.read`, `users.write`, `functions.read`, `functions.write`. Nunca exponha essa key no cliente.
3. **Project → Overview → Add Platform → Web**: registre o hostname onde o Next.js roda (`localhost` em dev; o domínio real em produção).
4. **Auth → Settings**:
   - Habilite o método **Email/Password**.
   - **Desligue "User self registration"** — o acesso só existe por convite do Administrador (tela `/usuarios` do app, que usa a Users API com a API Key).
   - Configure o provider **Google** em OAuth2 Providers, com Client ID/Secret do Google Cloud Console. Redirect URI: `<endpoint>/account/sessions/oauth2/callback/google/<project-id>`.

## 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=relgov
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Provisionar o schema e popular dados

```sh
npm install
npm run setup:appwrite   # cria database, tabelas, colunas, índices e permissões por Label
npm run seed              # carrega as 22 pautas / 12 pendências reais + 3 usuários de teste
```

`npm run setup:appwrite` é idempotente (roda de novo sem duplicar). `npm run seed` cria linhas novas a cada execução — rode uma vez por instância limpa.

Usuários de teste criados pelo seed (senha `RelGov#2026`):

| E-mail | Papel |
|---|---|
| admin@relgov.local | Administrador |
| coordenador@relgov.local | Coordenador RelGov |
| leitor@relgov.local | Leitor |

## 5. Rodar localmente

```sh
npm run dev
```

Abra `http://localhost:3000` — redireciona para `/login`.

## Modelo de dados

6 tabelas no Appwrite Database `relgov` (ver `scripts/setup-appwrite.mjs` para o schema exato): `pautas`, `encaminhamentos`, `pendencias`, `movimentacoes`, `resumos_semanais`, `email_logs`. Perfil de usuário (papel, receber alertas, última aba do painel) não é uma tabela — usa os recursos nativos do Appwrite: **Labels** (`administrador` | `coordenador_relgov` | `leitor`) para o papel/RBAC, e **Account Preferences** para `receberAlertas`/`ultimaAbaPainel`.

**Pendências não têm pauta obrigatória.** No dado de origem (`scripts/data/relgov-data.json`), boa parte das pendências é acompanhamento institucional (ofícios, representação em conselhos, alinhamento entre entidades) sem uma pauta legislativa correspondente 1:1 — por isso `pendencias.pautaId` é opcional. Quando vazio, a pendência aparece como "institucional" nas telas.

## RBAC

| | Administrador | Coordenador RelGov | Leitor |
|---|:---:|:---:|:---:|
| Ler pautas/pendências/relatórios | ✅ | ✅ | ✅ |
| Registrar movimentação, marcar encaminhamento | ✅ | ✅ | ❌ |
| Criar/editar pendência | ✅ | ✅ | ❌ |
| Criar/editar/desativar pauta | ✅ | ❌ | ❌ |
| Gerenciar usuários (`/usuarios`) | ✅ | ❌ | ❌ |

Aplicado em três camadas: permissões nativas por Label em cada tabela do Appwrite (`scripts/setup-appwrite.mjs`), `proxy.ts` (guarda rápida por presença de cookie), e `requireRole()`/`requireSession()` (`lib/auth.ts`) em cada página/rota — que valida a sessão de verdade contra o Appwrite a cada acesso.

## O que fica pendente (fora do escopo deste MVP)

- **Varredura automática dos links oficiais**: o handoff de design descreve uma rotina que buscaria o andamento de cada pauta a partir do `linkOficial`. Isso é scraping heterogêneo por órgão (Câmara, MTE, Receita…) e não foi implementado — captura de novidades é sempre **registro manual** (botão "+ Registrar movimentação" na ficha da pauta). O botão "Rodar monitoramento" e a Appwrite Function `functions/weekly-summary` fazem a parte que é real: recalculam números da semana e garantem o resumo semanal.
- **Envio real do e-mail semanal**: "Enviar resumo aos gestores" gera o HTML (mesmo template da tela 1h do handoff) e grava um rascunho em `email_logs` (status `RASCUNHO`) com uma prévia em `/painel/email-preview/[id]` — não dispara e-mail de verdade. Ponto único de integração: `lib/relgov/email-template.ts` (render) + `app/(painel)/painel/actions.ts` (`enviarResumoAosGestores`) — plugar Resend/SMTP ali quando houver decisão de provedor.

## Appwrite Function agendada

`functions/weekly-summary/` — cria o Appwrite Function no Console (runtime Node.js, deploy do conteúdo dessa pasta), schedule sugerido `0 6 * * 1` (toda segunda 06:00 UTC — ajustar fuso). Variáveis da Function: `APPWRITE_DATABASE_ID` (e opcionalmente `APPWRITE_ENDPOINT` se o endpoint interno não for `http://appwrite/v1`). Roda independente do Next.js estar de pé.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run setup:appwrite` | Provisiona database/tabelas/colunas/índices/permissões |
| `npm run seed` | Popula dados reais + usuários de teste |

## Licença

Projeto interno ABRAFESTA.

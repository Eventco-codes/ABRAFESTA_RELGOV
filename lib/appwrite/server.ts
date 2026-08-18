import { Account, Client, Databases, TablesDB, Users } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

function baseClient() {
  if (!endpoint || !project) {
    throw new Error(
      "Appwrite não configurado: defina NEXT_PUBLIC_APPWRITE_ENDPOINT e NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  return new Client().setEndpoint(endpoint).setProject(project);
}

/**
 * Cliente sem sessão nem API Key — usado só para os passos públicos do login
 * (criar sessão por e-mail/senha, trocar o token OAuth por sessão).
 */
export function createAnonClient() {
  const client = baseClient();
  return { client, account: new Account(client) };
}

/**
 * Cliente autenticado com a sessão do usuário logado (cookie httpOnly).
 * Toda leitura/escrita de dados do app usa este cliente — a permissão de
 * verdade vem das permissões por Label configuradas em cada tabela no Appwrite.
 */
export function createSessionClient(sessionSecret: string) {
  const client = baseClient().setSession(sessionSecret);
  return {
    client,
    account: new Account(client),
    tablesDB: new TablesDB(client),
  };
}

/**
 * Cliente admin (API Key) — só para operações que exigem privilégio de
 * administração da plataforma: criar/gerenciar usuários (convite) e
 * provisionar o schema. Nunca usar para servir dados de tela.
 */
export function createAdminClient() {
  if (!apiKey) {
    throw new Error("APPWRITE_API_KEY não configurada.");
  }
  const client = baseClient().setKey(apiKey);
  return {
    client,
    account: new Account(client),
    users: new Users(client),
    databases: new Databases(client),
    tablesDB: new TablesDB(client),
  };
}

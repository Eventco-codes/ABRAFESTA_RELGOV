/**
 * Nesta instância Appwrite, os endpoints de criação de sessão
 * (`/account/sessions/email`, `/account/sessions/token`) não populam o
 * campo `secret` no corpo JSON de resposta — o token de sessão de verdade
 * só vem no header `Set-Cookie` (`a_session_<project>=<valor>`). O SDK
 * (`Account.createEmailPasswordSession`/`createSession`) não expõe esse
 * header, então login e troca de token OAuth fazem fetch cru aqui e leem
 * o cookie diretamente. Confirmado nesta versão do servidor (1.9.0); se
 * uma versão futura passar a popular `secret` no corpo, isso também
 * continua funcionando (o valor extraído do cookie é o mesmo aceito por
 * `Client.setSession()`).
 */

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export class SessionCreationError extends Error {}

export interface SessionCookie {
  value: string;
  expire: string;
}

function requireConfig() {
  if (!endpoint || !project) {
    throw new Error(
      "Appwrite não configurado: defina NEXT_PUBLIC_APPWRITE_ENDPOINT e NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  return { endpoint, project };
}

async function extractSessionCookie(res: Response): Promise<SessionCookie> {
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new SessionCreationError(body?.message ?? "Não foi possível criar a sessão.");
  }

  const { project: proj } = requireConfig();
  const cookieName = `a_session_${proj}`;
  const cookies = res.headers.getSetCookie();
  const match = cookies.find((c) => c.startsWith(`${cookieName}=`));

  if (!match) {
    throw new SessionCreationError("Sessão criada, mas o cookie de sessão não veio na resposta.");
  }

  const value = match.split(";")[0].split("=").slice(1).join("=");
  return { value, expire: body.expire as string };
}

export async function createEmailPasswordSessionCookie(
  email: string,
  password: string
): Promise<SessionCookie> {
  const { endpoint: url, project: proj } = requireConfig();
  const res = await fetch(`${url}/account/sessions/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Appwrite-Project": proj },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  return extractSessionCookie(res);
}

/** Troca o par (userId, secret) de um fluxo por token — OAuth2, magic URL, etc. */
export async function createTokenSessionCookie(
  userId: string,
  secret: string
): Promise<SessionCookie> {
  const { endpoint: url, project: proj } = requireConfig();
  const res = await fetch(`${url}/account/sessions/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Appwrite-Project": proj },
    body: JSON.stringify({ userId, secret }),
    cache: "no-store",
  });
  return extractSessionCookie(res);
}

import { Resend } from "resend";

export interface SendWeeklyEmailInput {
  to: string[];
  subject: string;
  html: string;
}

export interface SendWeeklyEmailResult {
  ok: boolean;
  erro?: string;
}

/**
 * Envio real do resumo semanal via Resend. Requer RESEND_API_KEY e
 * RESEND_FROM_EMAIL (remetente verificado no domínio configurado no Resend).
 */
export async function sendWeeklyEmail({
  to,
  subject,
  html,
}: SendWeeklyEmailInput): Promise<SendWeeklyEmailResult> {
  if (to.length === 0) {
    return { ok: false, erro: "Nenhum destinatário com alertas habilitados." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      ok: false,
      erro: "RESEND_API_KEY ou RESEND_FROM_EMAIL não configurados no ambiente.",
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

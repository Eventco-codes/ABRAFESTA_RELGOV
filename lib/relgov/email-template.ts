import type { Pauta, Pendencia, ResumoSemanal } from "@/lib/types";
import { formatDateBR } from "@/lib/relgov/derived";

export interface WeeklyEmailData {
  resumo: ResumoSemanal;
  pautasComMovimentacao: Pauta[];
  pendenciasVencidas: Pendencia[];
  numeros: {
    pautasAtivas: number;
    comMovimentacao: number;
    pendenciasAbertas: number;
    prazosVencidos: number;
  };
  appUrl: string;
  logoUrl: string;
}

/**
 * E-mail semanal (tela 1h) — tabelas + estilos inline para compatibilidade
 * com clientes de e-mail. Renderizado e guardado em email_logs.htmlRenderizado;
 * o envio real (SMTP/Resend) fica para uma próxima etapa (ver README).
 */
export function renderWeeklyEmailHtml(data: WeeklyEmailData): string {
  const { resumo, pendenciasVencidas, numeros, appUrl, logoUrl } = data;

  const cobrancasHtml = pendenciasVencidas
    .slice(0, 8)
    .map(
      (p) =>
        `<li style="margin:0 0 6px;">${escapeHtml(p.descricao)} — prazo ${formatDateBR(
          p.prazoSugerido
        )}</li>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 0;background:#e8e5de;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
      <tr>
        <td style="background:#16233d;padding:22px 26px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td><img src="${logoUrl}" width="132" alt="ABRAFESTA" style="display:block;" /></td>
              <td style="padding-left:16px;border-left:1px solid rgba(255,255,255,.25);padding-right:16px;">
                <span style="font-family:monospace;font-size:9.5px;letter-spacing:.2em;color:rgba(255,255,255,.7);">RELGOV</span>
              </td>
            </tr>
          </table>
          <h1 style="margin:14px 0 0;font-size:21px;line-height:1.3;color:#ffffff;">${escapeHtml(
            resumo.manchete
          )}</h1>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.6);">${formatDateBR(
            resumo.semanaInicio
          )} — ${formatDateBR(resumo.semanaFim)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#16233d;">${numeros.pautasAtivas}</div>
                <div style="font-size:10.5px;color:#6f7480;">pautas ativas</div>
              </td>
              <td width="4"></td>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#16233d;">${numeros.comMovimentacao}</div>
                <div style="font-size:10.5px;color:#6f7480;">com movimentação</div>
              </td>
              <td width="4"></td>
              <td width="33%" style="border:1px solid #e3e0d8;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:600;color:#b3382c;">${numeros.prazosVencidos}</div>
                <div style="font-size:10.5px;color:#b3382c;">prazos vencidos</div>
              </td>
            </tr>
          </table>

          <h2 style="margin:22px 0 8px;font-size:14px;color:#16233d;">Movimentações da semana</h2>
          <p style="margin:0;font-size:12.5px;line-height:1.55;color:#4a5160;">${escapeHtml(
            resumo.lide
          )}</p>

          ${
            pendenciasVencidas.length > 0
              ? `<div style="margin-top:18px;background:#fdf7f6;border-left:3px solid #b3382c;padding:14px 16px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#b3382c;">Cobranças em atraso</p>
                  <ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.7;color:#4a5160;">${cobrancasHtml}</ul>
                </div>`
              : ""
          }

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr>
              <td align="center">
                <a href="${appUrl}/painel" style="display:inline-block;background:#c8992f;color:#16233d;font-weight:600;font-size:13.5px;padding:12px 26px;border-radius:7px;text-decoration:none;">Abrir painel RelGov</a>
              </td>
            </tr>
          </table>

          <p style="margin:24px 0 0;text-align:center;font-size:11px;line-height:1.6;color:#9aa0ac;">
            RelGov ABRAFESTA · resumo automático gerado a partir dos dados cadastrados no painel.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

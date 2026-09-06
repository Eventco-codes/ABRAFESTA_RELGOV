import { PageHeader } from "@/components/relgov/page-header";
import { SecondaryLinkButton } from "@/components/relgov/buttons";
import { APPWRITE_DATABASE_ID, TABLES } from "@/lib/appwrite/constants";
import { requireRole } from "@/lib/auth";
import type { EmailLog } from "@/lib/types";

export default async function EmailPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tablesDB } = await requireRole("administrador", "coordenadorrelgov");

  const emailLog = await tablesDB.getRow<EmailLog>({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.emailLogs,
    rowId: id,
  });

  return (
    <div>
      <PageHeader
        title="Prévia do e-mail semanal"
        subtitle={
          emailLog.destinatarios.length > 0
            ? `Destinatários: ${emailLog.destinatarios.join(", ")}`
            : "Nenhum destinatário com alertas ligados no momento."
        }
        actions={<SecondaryLinkButton href="/painel">Voltar ao painel</SecondaryLinkButton>}
      />
      <div className="px-7 py-6">
        <p
          className={`mb-4 max-w-[640px] rounded-md border px-3.5 py-2.5 text-[12.5px] ${
            emailLog.status === "ENVIADO"
              ? "border-relgov-success-bg bg-relgov-success-bg text-relgov-success"
              : emailLog.status === "FALHA"
                ? "border-relgov-danger-bg bg-relgov-danger-bg text-relgov-danger"
                : "border-relgov-warning-bg bg-relgov-warning-bg text-relgov-warning-text"
          }`}
        >
          {emailLog.status === "ENVIADO" &&
            "E-mail enviado com sucesso aos destinatários acima via Resend."}
          {emailLog.status === "FALHA" &&
            "Falha ao enviar o e-mail. Confira RESEND_API_KEY/RESEND_FROM_EMAIL no ambiente e os logs do servidor."}
          {emailLog.status === "RASCUNHO" &&
            "Rascunho salvo em email_logs — envio ainda não foi disparado."}
        </p>
        <iframe
          title="Prévia do e-mail semanal"
          srcDoc={emailLog.htmlRenderizado}
          className="h-[900px] w-full max-w-[640px] rounded-lg border border-relgov-border bg-white"
        />
      </div>
    </div>
  );
}

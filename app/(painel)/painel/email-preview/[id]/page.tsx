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
        <p className="mb-4 max-w-[640px] rounded-md border border-relgov-warning-bg bg-relgov-warning-bg px-3.5 py-2.5 text-[12.5px] text-relgov-warning-text">
          Rascunho salvo em <strong>email_logs</strong> (status RASCUNHO) — o envio real
          ainda não está configurado neste MVP. Ver README para plugar um provedor de
          e-mail.
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

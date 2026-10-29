/**
 * Regrava `eixo` e `status` das pautas no formato da taxonomia fechada (lib/relgov/taxonomia.ts).
 *
 *   npx tsx --env-file=.env.local scripts/normalizar-taxonomia.ts            # só mostra o que mudaria
 *   npx tsx --env-file=.env.local scripts/normalizar-taxonomia.ts --aplicar  # grava no Appwrite
 *
 * Só toca `eixo` e `status` (nunca "Situação atual" nem os demais campos). Idempotente: pautas já
 * normalizadas são ignoradas. Rode primeiro sem --aplicar e confira a tabela de-para.
 */
import { Client, Query, TablesDB, type Models } from "node-appwrite";

import { eixoNormalizado, statusCanonico } from "../lib/relgov/taxonomia";

const aplicar = process.argv.includes("--aplicar");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Faltando variável de ambiente: ${name}`);
    process.exit(1);
  }
  return value;
}

const client = new Client()
  .setEndpoint(requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(requireEnv("APPWRITE_API_KEY"));
const tablesDB = new TablesDB(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || "relgov";

async function main() {
  const { rows } = await tablesDB.listRows<Models.Row & { titulo: string; eixo: string; status: string }>({
    databaseId,
    tableId: "pautas",
    queries: [Query.limit(500)],
  });

  let mudam = 0;
  for (const p of rows) {
    const eixo = eixoNormalizado(p.eixo);
    const status = statusCanonico(p.status);
    const mudaEixo = eixo !== p.eixo;
    const mudaStatus = status !== p.status;
    if (!mudaEixo && !mudaStatus) continue;
    mudam++;

    console.log(`• ${p.titulo}`);
    if (mudaEixo) console.log(`    eixo:   ${p.eixo}\n         →  ${eixo}`);
    if (mudaStatus) console.log(`    status: ${p.status}\n         →  ${status}`);

    if (aplicar) {
      await tablesDB.updateRow({
        databaseId,
        tableId: "pautas",
        rowId: p.$id,
        data: { ...(mudaEixo ? { eixo } : {}), ...(mudaStatus ? { status } : {}) },
      });
    }
  }

  console.log(
    `\n${mudam} de ${rows.length} pautas ${aplicar ? "atualizadas." : "mudariam. Nada foi gravado (use --aplicar para gravar)."}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

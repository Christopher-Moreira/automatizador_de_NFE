// Orquestrador: roda 1x por execução (o cron do Railway dispara todo dia 1).
// Fluxo: monta a nota -> emite no Focus -> aguarda autorização -> baixa PDF -> envia e-mail.
import { loadConfig } from "./config.js";
import {
  buildNotaPayload,
  emitirNota,
  aguardarAutorizacao,
  baixarPdf,
} from "./focus.js";
import { enviarEmail } from "./mailer.js";

// Referência idempotente por mês: reexecutar no mesmo mês NÃO duplica a nota.
function refDoMes(now) {
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  return `nfse-${ano}-${mes}`;
}

async function main() {
  const config = loadConfig();
  const now = new Date();
  const ref = refDoMes(now);

  const payload = buildNotaPayload(config);
  payload.data_emissao = now.toISOString();

  console.log(`[${now.toISOString()}] Iniciando emissão ref=${ref} ambiente=${config.focus.ambiente}`);

  if (config.dryRun) {
    console.log("DRY_RUN ativo — payload que SERIA enviado:");
    console.log(JSON.stringify(payload, null, 2));
    console.log(`E-mail SERIA enviado para: ${config.email.to}`);
    console.log("Nada foi emitido nem enviado.");
    return;
  }

  console.log("→ Emitindo nota no Focus NFe...");
  await emitirNota(config, ref, payload);

  console.log("→ Aguardando autorização...");
  const notaAutorizada = await aguardarAutorizacao(config, ref);
  console.log(`✓ Nota autorizada (número: ${notaAutorizada.numero || "n/d"})`);

  console.log("→ Baixando PDF (DANFSe)...");
  const pdfBuffer = await baixarPdf(config, notaAutorizada);

  console.log(`→ Enviando e-mail para ${config.email.to}...`);
  const messageId = await enviarEmail(config, {
    pdfBuffer,
    nomeArquivo: `${ref}.pdf`,
  });

  console.log(`✓ Concluído. E-mail enviado (messageId=${messageId}).`);
}

main().catch((err) => {
  console.error("✗ Erro na execução:", err.message);
  process.exitCode = 1;
});

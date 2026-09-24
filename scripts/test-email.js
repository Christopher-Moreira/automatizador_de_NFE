// Utilitário: testa só o envio de e-mail (SMTP), sem emitir nota.
// Uso: npm run test-email
// Verifica a conexão SMTP e envia uma mensagem de teste para EMAIL_TO.
import { loadConfig } from "../src/config.js";
import nodemailer from "nodemailer";

// Config mínima: só precisamos do bloco SMTP/e-mail. Preenchemos o resto
// com valores fictícios para não exigir os dados fiscais só para testar e-mail.
function smtpConfig() {
  const need = (k) => {
    const v = process.env[k];
    if (!v) throw new Error(`Variável ausente para teste de e-mail: ${k}`);
    return v;
  };
  return {
    smtp: {
      host: need("SMTP_HOST"),
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: (process.env.SMTP_SECURE || "true").toLowerCase() === "true",
      user: need("SMTP_USER"),
      pass: need("SMTP_PASS"),
    },
    from: need("EMAIL_FROM"),
    to: need("EMAIL_TO"),
  };
}

async function main() {
  const cfg = smtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
  });

  console.log(`Verificando conexão SMTP em ${cfg.smtp.host}:${cfg.smtp.port} (secure=${cfg.smtp.secure})...`);
  await transporter.verify();
  console.log("✓ Conexão e autenticação SMTP OK.");

  console.log(`Enviando e-mail de teste para ${cfg.to}...`);
  const info = await transporter.sendMail({
    from: cfg.from,
    to: cfg.to,
    subject: "Teste de SMTP - Automatizador de NFS-e",
    text: "Este é um e-mail de teste do automatizador de NFS-e. Se você recebeu, o SMTP está configurado corretamente.",
  });
  console.log(`✓ E-mail enviado (messageId=${info.messageId}).`);
}

main().catch((err) => {
  console.error("✗ Falha no teste de e-mail:", err.message);
  process.exitCode = 1;
});

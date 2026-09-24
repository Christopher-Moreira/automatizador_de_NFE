// Envio do e-mail com a nota anexada, via SMTP do seu webmail.
import nodemailer from "nodemailer";

export async function enviarEmail(config, { pdfBuffer, nomeArquivo, subject, body }) {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  const info = await transporter.sendMail({
    from: config.email.from,
    to: config.email.to,
    subject: subject ?? config.email.subject,
    text: body ?? config.email.body,
    attachments: [
      {
        filename: nomeArquivo,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return info.messageId;
}

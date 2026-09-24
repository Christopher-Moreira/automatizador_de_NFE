// Lê e valida toda a configuração a partir de variáveis de ambiente.
// Nenhum segredo ou dado da nota vive no código — tudo vem do .env (Railway Variables).

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function optional(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "sim"].includes(value.toLowerCase());
}

function int(name, fallback) {
  const value = process.env[name];
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig() {
  const ambiente = optional("FOCUS_NFE_AMBIENTE", "homologacao").toLowerCase();
  const baseUrl =
    ambiente === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

  const config = {
    dryRun: bool("DRY_RUN", false),
    poll: {
      intervalSeconds: int("POLL_INTERVAL_SECONDS", 5),
      maxAttempts: int("POLL_MAX_ATTEMPTS", 24),
    },
    focus: {
      token: required("FOCUS_NFE_TOKEN"),
      ambiente,
      baseUrl,
    },
    prestador: {
      cnpj: required("PRESTADOR_CNPJ"),
      inscricao_municipal: optional("PRESTADOR_INSCRICAO_MUNICIPAL"),
      codigo_municipio: required("PRESTADOR_CODIGO_MUNICIPIO"),
    },
    tomador: {
      cnpj: optional("TOMADOR_CNPJ"),
      cpf: optional("TOMADOR_CPF"),
      razao_social: required("TOMADOR_RAZAO_SOCIAL"),
      email: optional("TOMADOR_EMAIL"),
      endereco: {
        cep: optional("TOMADOR_CEP"),
        logradouro: optional("TOMADOR_LOGRADOURO"),
        numero: optional("TOMADOR_NUMERO"),
        complemento: optional("TOMADOR_COMPLEMENTO"),
        bairro: optional("TOMADOR_BAIRRO"),
        codigo_municipio: optional("TOMADOR_CODIGO_MUNICIPIO"),
        uf: optional("TOMADOR_UF"),
      },
    },
    servico: {
      valor_servicos: required("SERVICO_VALOR"),
      aliquota: required("SERVICO_ALIQUOTA"),
      iss_retido: bool("SERVICO_ISS_RETIDO", false),
      item_lista_servico: required("SERVICO_ITEM_LISTA"),
      codigo_tributacao_nacional: optional("SERVICO_CODIGO_TRIBUTACAO_NACIONAL"),
      codigo_tributario_municipio: optional("SERVICO_CODIGO_TRIBUTARIO_MUNICIPIO"),
      discriminacao: required("SERVICO_DISCRIMINACAO"),
    },
    smtp: {
      host: required("SMTP_HOST"),
      port: int("SMTP_PORT", 465),
      secure: bool("SMTP_SECURE", true),
      user: required("SMTP_USER"),
      pass: required("SMTP_PASS"),
    },
    email: {
      from: required("EMAIL_FROM"),
      to: required("EMAIL_TO"),
      subject: optional("EMAIL_SUBJECT", "Nota Fiscal de Serviço"),
      body: optional("EMAIL_BODY", "Segue em anexo a nota fiscal de serviço."),
      attachmentName: optional("EMAIL_ATTACHMENT_NAME", "Salario_Christopher_{mes}"),
    },
  };

  if (!config.tomador.cnpj && !config.tomador.cpf) {
    throw new Error("Informe TOMADOR_CNPJ ou TOMADOR_CPF no .env");
  }

  return config;
}

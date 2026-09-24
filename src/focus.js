// Integração com a API do Focus NFe (NFS-e).
// O Focus assina digitalmente e transmite a nota ao Sistema Nacional NFS-e por você.
// Docs: https://focusnfe.com.br/doc/ (seção NFS-e)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Autenticação do Focus: HTTP Basic com o token como usuário e senha vazia.
function authHeader(token) {
  const basic = Buffer.from(`${token}:`).toString("base64");
  return `Basic ${basic}`;
}

// Monta o corpo da NFS-e a partir da config (env). Nada hardcoded.
export function buildNotaPayload(config) {
  const tomador = { razao_social: config.tomador.razao_social };
  if (config.tomador.cnpj) tomador.cnpj = config.tomador.cnpj;
  if (config.tomador.cpf) tomador.cpf = config.tomador.cpf;
  if (config.tomador.email) tomador.email = config.tomador.email;

  const endereco = config.tomador.endereco;
  if (endereco.logradouro) {
    tomador.endereco = {
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      bairro: endereco.bairro,
      codigo_municipio: endereco.codigo_municipio,
      uf: endereco.uf,
      cep: endereco.cep,
    };
  }

  const servico = {
    aliquota: Number(config.servico.aliquota),
    discriminacao: config.servico.discriminacao,
    iss_retido: config.servico.iss_retido,
    item_lista_servico: config.servico.item_lista_servico,
    valor_servicos: Number(config.servico.valor_servicos),
  };
  if (config.servico.codigo_tributario_municipio) {
    servico.codigo_tributario_municipio = config.servico.codigo_tributario_municipio;
  }

  return {
    // data_emissao é gerada em index.js para manter buildNotaPayload puro
    prestador: {
      cnpj: config.prestador.cnpj,
      inscricao_municipal: config.prestador.inscricao_municipal || undefined,
      codigo_municipio: config.prestador.codigo_municipio,
    },
    tomador,
    servico,
  };
}

// Envia a nota para emissão. `ref` é o identificador único que você controla
// (idempotência: reenviar a mesma ref não gera nota duplicada).
export async function emitirNota(config, ref, payload) {
  const url = `${config.focus.baseUrl}/v2/nfse?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(config.focus.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  // 200/201/202 = aceito para processamento. Outros = erro.
  if (![200, 201, 202].includes(res.status)) {
    throw new Error(
      `Falha ao emitir (HTTP ${res.status}): ${JSON.stringify(body)}`
    );
  }
  return body;
}

// Consulta o status da nota até autorizar (ou falhar / estourar tentativas).
export async function aguardarAutorizacao(config, ref) {
  const url = `${config.focus.baseUrl}/v2/nfse/${encodeURIComponent(ref)}`;

  for (let attempt = 1; attempt <= config.poll.maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: authHeader(config.focus.token) },
    });
    const body = await res.json();
    const status = body.status;

    console.log(`  [poll ${attempt}/${config.poll.maxAttempts}] status=${status}`);

    if (status === "autorizado") return body;

    if (status === "erro_autorizacao" || status === "cancelado") {
      throw new Error(
        `Nota não autorizada (status=${status}): ${JSON.stringify(
          body.erros || body
        )}`
      );
    }

    // status "processando_autorizacao" (ou similar) → aguarda e tenta de novo.
    await sleep(config.poll.intervalSeconds * 1000);
  }

  throw new Error(
    `Tempo esgotado aguardando autorização após ${config.poll.maxAttempts} tentativas.`
  );
}

// Baixa o PDF (DANFSe) da nota autorizada.
export async function baixarPdf(config, notaAutorizada) {
  const caminho =
    notaAutorizada.url_danfse ||
    notaAutorizada.caminho_danfse ||
    notaAutorizada.url;
  if (!caminho) {
    throw new Error("Nota autorizada não retornou caminho do PDF (DANFSe).");
  }

  const pdfUrl = caminho.startsWith("http")
    ? caminho
    : `${config.focus.baseUrl}${caminho}`;

  const res = await fetch(pdfUrl, {
    headers: { Authorization: authHeader(config.focus.token) },
  });
  if (!res.ok) {
    throw new Error(`Falha ao baixar PDF (HTTP ${res.status}) em ${pdfUrl}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

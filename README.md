# Automatizador de NFS-e

Worker que **emite uma NFS-e Nacional fixa todo dia 1 de cada mês e a envia por e-mail**, sem intervenção manual. Roda sozinho via **cron do Railway**.

```
cron (dia 1) ──▶ emite a nota no Focus NFe ──▶ aguarda autorização ──▶ baixa o PDF ──▶ envia por e-mail
```

- **Você não assina nada.** O [Focus NFe](https://focusnfe.com.br/) assina digitalmente e transmite a nota ao Sistema Nacional NFS-e por você.
- **Nenhum segredo no código.** Token, senhas SMTP e dados da nota vivem só em variáveis de ambiente (`.env` local / *Variables* no Railway).
- **Idempotente por mês.** A nota usa a referência `nfse-AAAA-MM`; reexecutar no mesmo mês não gera nota duplicada.

## Como funciona a autenticação da nota

Emitir NFS-e por API exige um **certificado digital A1 (ICP-Brasil)**. Você faz **um único cadastro**: sobe o `.pfx` no painel do Focus NFe uma vez, e a partir daí toda nota é assinada automaticamente. Depois disso você nunca mais toca no processo.

## Setup (feito uma vez)

### 1. Focus NFe
1. Crie conta em [focusnfe.com.br](https://focusnfe.com.br/) e habilite o produto **NFS-e Nacional**.
2. Suba seu certificado **A1 (.pfx)** e configure o prestador no painel.
3. Pegue seu **token de homologação** (para testes) e o **token de produção**.

### 2. Configuração local
```bash
cp .env.example .env
# preencha o .env com seus dados (veja os comentários no arquivo)
npm install
```

### 3. Testar sem emitir nada
```bash
npm run dry-run    # monta a nota e mostra o payload, sem emitir nem mandar e-mail
```

### 4. Teste real em homologação
Deixe `FOCUS_NFE_AMBIENTE=homologacao` e rode:
```bash
npm start
```
Confira se a nota é autorizada e o e-mail chega. Depois troque para `FOCUS_NFE_AMBIENTE=producao`.

## Deploy no Railway

1. Crie um projeto no [Railway](https://railway.com/) e conecte este repositório.
2. Em **Variables**, cadastre **todas** as variáveis do `.env.example` (com os valores reais). É aqui que os segredos ficam — nunca no código.
3. O `railway.json` já define o agendamento:
   - `cronSchedule: "0 12 1 * *"` → **12:00 UTC = 09:00 (horário de Brasília) no dia 1 de cada mês**. Ajuste o horário se quiser.
   - `restartPolicyType: NEVER` → o serviço roda, termina e não reinicia (comportamento correto para cron job).
4. Pronto. O Railway dispara o worker todo dia 1 automaticamente.

> **Cron do Railway roda em UTC.** Para 9h de Brasília use `0 12 1 * *`. Para 8h, `0 11 1 * *`, etc.

## Variáveis de ambiente

Todas estão documentadas no [`.env.example`](./.env.example), em quatro blocos: **Focus NFe**, **Prestador/Tomador/Serviço** (o conteúdo fixo da nota), **SMTP/E-mail** (seu webmail) e **Operação** (`DRY_RUN`, polling).

## Estrutura

```
src/
  config.js   Lê e valida o ambiente (falha cedo se faltar algo)
  focus.js    Emite, aguarda autorização e baixa o PDF no Focus NFe
  mailer.js   Envia o e-mail com o PDF anexo via SMTP
  index.js    Orquestra o fluxo
railway.json  Build + cron + restart policy (sem segredos)
```

## Segurança

- `.env` está no `.gitignore` e **nunca** deve ser commitado. Só o `.env.example` (sem valores) vai pro repositório.
- Se algum segredo vazar, **rotacione**: gere novo token no Focus e troque a senha do e-mail.

# Marcket – API REST (Marketplace Multi-Loja)

API em **português** com Express, Prisma, Zod e Firebase Auth. Multi-loja com CRUD de lojas, produtos, usuários e pedidos.

## Pré-requisitos

- Node.js 18+
- Conta no [Firebase](https://console.firebase.google.com/) (Auth + Service Account)

## Instalação

```bash
cd backend
npm install
```

## Banco de dados (Prisma)

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Criar banco e aplicar migrações (SQLite)
npm run prisma:migrate
```

## Configuração do Firebase (Auth no backend)

Para o middleware de autenticação funcionar, o backend precisa validar o JWT do Firebase usando a **Service Account** (Admin SDK).

### 1. Service Account no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/) → seu projeto.
2. **Configurações do projeto** (ícone de engrenagem) → **Contas de serviço**.
3. Clique em **Gerar nova chave privada**.
4. Salve o JSON em um local seguro (ex.: `backend/serviceAccountKey.json`).
5. **Não** faça commit desse arquivo no Git (adicione ao `.gitignore`).

### 2. Variável de ambiente

**Opção A – Arquivo (recomendado em desenvolvimento)**

```bash
# Linux/macOS
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/absoluto/para/serviceAccountKey.json"

# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\para\serviceAccountKey.json"
```

**Opção B – JSON na variável (útil em hospedagem)**

Defina a variável `FIREBASE_SERVICE_ACCOUNT` com o **conteúdo** do JSON da Service Account (uma única linha):

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...", ...}'
```

Se `GOOGLE_APPLICATION_CREDENTIALS` ou `FIREBASE_SERVICE_ACCOUNT` não estiverem definidos, a API sobe normalmente, mas as rotas que exigem autenticação retornarão **401** (token não será validado).

## Executar o servidor

```bash
npm start
# ou
node index.js
```

Servidor em: **http://localhost:3000** (ou na porta definida em `PORT`).

## Backup e restore do banco

O projeto inclui scripts para backup completo do PostgreSQL em arquivo compactado `.sql.gz`.

### Backup manual

```bash
npm run backup:db
```

### Backup + upload para S3

```bash
npm run backup:db:s3
```

Saída padrão: `backend/backups/db-backup-YYYYMMDD-HHMMSSZ.sql.gz`

Variáveis opcionais:

- `BACKUP_DIR`: diretório onde salvar os arquivos (default: `backend/backups`)
- `BACKUP_RETENTION_DAYS`: dias de retenção para apagar backups antigos (default: `30`)
- `BACKUP_FILENAME_PREFIX`: prefixo do nome do arquivo (default: `db-backup`)
- `S3_BACKUP_BUCKET`: bucket de destino (obrigatória para `backup:db:s3`)
- `S3_BACKUP_REGION`: região do bucket (obrigatória para `backup:db:s3`)
- `S3_BACKUP_PREFIX`: pasta/base no bucket (default: `database`)
- `S3_BACKUP_STORAGE_CLASS`: classe de armazenamento (default: `STANDARD_IA`)
- `S3_BACKUP_SSE`: criptografia server-side (`AES256` ou `aws:kms`)
- `S3_BACKUP_SSE_KMS_KEY_ID`: chave KMS (quando `S3_BACKUP_SSE=aws:kms`)

### Restore manual

```bash
npm run restore:db -- ./backups/db-backup-YYYYMMDD-HHMMSSZ.sql.gz
```

O restore usa `psql` com `ON_ERROR_STOP=1` e transação única.

### Proteção contra restore acidental em produção

Por padrão, o script bloqueia restore quando `NODE_ENV=production`.
Para liberar intencionalmente, defina explicitamente:

```bash
ALLOW_PROD_RESTORE=true npm run restore:db -- ./backups/arquivo.sql.gz
```

### Agendamento (recomendado)

No servidor/VM, agende um cron diário (exemplo 03:00):

```bash
0 3 * * * cd /caminho/do/projeto/backend && npm run backup:db >> backup.log 2>&1
```

Com envio direto para S3:

```bash
0 3 * * * cd /caminho/do/projeto/backend && npm run backup:db:s3 >> backup.log 2>&1
```

> Observação: os scripts dependem de `pg_dump` e `psql` instalados no ambiente.

## Endpoints (resumo)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/lojas` | Listar lojas (filtros: `categoria_negocio`, `cidade`) | opcional |
| GET | `/lojas/ativos` | Listar lojas ativas (marketplace) | não |
| GET | `/lojas/:id` | Obter uma loja | não |
| POST | `/lojas` | Criar loja (vincula usuário Firebase como ADMIN) | token Firebase |
| PUT | `/lojas/:id` | Atualizar loja | ADMIN da loja |
| DELETE | `/lojas/:id` | Excluir loja | ADMIN da loja |
| GET | `/produtos` | Listar produtos (paginação 12/página; `loja_id`, `pagina`, `ativo`) | opcional |
| GET | `/lojas/:lojaId/produtos` | Produtos da loja (por id ou slug) | não |
| GET | `/produtos/:id` | Obter produto | não |
| POST | `/produtos` | Criar produto | usuário da loja |
| PUT | `/produtos/:id` | Atualizar produto | usuário da loja |
| DELETE | `/produtos/:id` | Excluir produto | ADMIN da loja |
| GET | `/usuarios` | Listar usuários da loja | ADMIN |
| GET | `/usuarios/:id` | Obter usuário | usuário da loja |
| POST | `/usuarios` | Criar usuário | ADMIN da loja |
| PUT | `/usuarios/:id` | Atualizar usuário | ADMIN |
| DELETE | `/usuarios/:id` | Excluir usuário | ADMIN |
| GET | `/pedidos` | Listar pedidos da loja | usuário da loja |
| GET | `/pedidos/:id` | Obter pedido | usuário da loja |
| POST | `/pedidos` | Criar pedido (cliente) | não |
| PATCH | `/pedidos/:id/status` | Atualizar status do pedido | usuário da loja |
| PUT | `/pedidos/:id` | Atualizar pedido | usuário da loja |
| DELETE | `/pedidos/:id` | Excluir pedido | ADMIN da loja |
| GET | `/health` | Health check | não |

### Autenticação

Envie o token do Firebase no header:

```
Authorization: Bearer <idToken>
```

O backend valida o JWT, busca o usuário pelo `firebase_uid` e anexa `req.user` (id, loja_id, role). Apenas ADMIN pode criar/atualizar loja e gerenciar usuários; ADMIN e EMPLOYEE podem gerenciar produtos da própria loja.

### Exemplo – Criar pedido (POST /pedidos)

```json
{
  "loja_id": "clxx...",
  "nome_cliente": "João",
  "telefone_cliente": "11999999999",
  "endereco": "Rua X, 123",
  "total": 45.90,
  "forma_pagamento": "PIX"
}
```

Status do pedido: `PENDING`, `IN_ROUTE`, `PAID`, `CANCELLED`.  
Forma de pagamento: `PIX`, `DEBIT`, `CREDIT`, `CASH`.

### Exemplo – Atualizar status (PATCH /pedidos/:id/status)

```json
{
  "status": "PAID"
}
```

## Estrutura do projeto (MVC + Service)

Fluxo da requisição: **Route → Middleware (auth/validação) → Controller → Service → Prisma**.

| Pasta / arquivo | Responsabilidade |
|-----------------|------------------|
| `index.js` | Entrada: `dotenv`, Express, `routes`, `errorHandler`, `listen`. |
| `config/` | `database.js` (Prisma + SQLite), `firebase.js` (Firebase Admin). |
| `middleware/` | `index.js` (barrel), `auth.js` (JWT + permissões), `validacao.js` (Zod), `errorHandler.js`. |
| `schemas/` | Schemas Zod (lojas, produtos, usuarios, pedidos). |
| `services/` | Regras de negócio e acesso ao banco; sem `req`/`res`. |
| `controllers/` | Recebem `req`/`res`, chamam services e respondem com JSON. |
| `routes/` | `index.js` agrega rotas; um arquivo por recurso (lojas, produtos, usuarios, pedidos). |
| `prisma/` | `schema.prisma` e migrações. |
| `generated/prisma` | Cliente Prisma (gerado com `npm run prisma:generate`). |

Imports: rotas usam `require('../middleware')` para auth e validação; o app usa `require('./middleware').errorHandler`.

Respostas e mensagens de erro da API estão em **português**.

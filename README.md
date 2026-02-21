# Dashboard Lojista - Marcket

Área para donos de lojas se cadastrarem e gerenciarem suas lojas e produtos.

## Funcionalidades

- **Cadastro** – criar conta com e-mail e senha (Firebase Auth)
- **Cadastro da loja** – após criar conta, cadastrar a primeira loja
- **Login** – entrar com conta existente
- **Minha loja** – editar dados da loja (nome, slug, categoria, cidade, logo, taxa de entrega, etc.)
- **Produtos** – criar, editar e excluir produtos

## Configuração

1. Copie `.env.example` para `.env` dentro de `vite-project/`:

   ```
   cp vite-project/.env.example vite-project/.env
   ```

2. Configure as variáveis no `.env`:

   - `VITE_API_URL` – URL da API (ex: http://localhost:3000)
   - `VITE_FIREBASE_*` – credenciais do Firebase (Console do Firebase > Configurações do projeto)

3. No Firebase Console:

   - Ative **Authentication** > **Sign-in method** > **E-mail/senha**
   - Copie a configuração do projeto em "Seus apps" para preencher o `.env`

## Como rodar

```bash
cd dashboardLojista/vite-project
npm install
npm run dev
```

O dashboard ficará em http://localhost:5174

**Requisitos:** Backend rodando (porta 3000) e Firebase configurado.

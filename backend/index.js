/**
 * API REST - Marketplace Multi-Loja (marcket)
 * Padrão MVC com camada de Services.
 * Express + Prisma + Firebase Auth
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { errorHandler } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ],
}));
app.use(express.json());
app.use(routes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor marcket rodando em http://localhost:${PORT}`);
});

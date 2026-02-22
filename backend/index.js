/**
 * API REST - Marketplace Multi-Loja (marcket)
 * Padrão MVC com camada de Services.
 * Express + Prisma + Firebase Auth
 */
require('dotenv').config();

// ── Validação de variáveis obrigatórias ──
const REQUIRED_ENV = ['DATABASE_URL'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`FATAL: Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}`);
  process.exit(1);
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { errorHandler } = require('./middleware');
const { initSocket } = require('./config/socket');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Segurança HTTP ──
app.use(helmet());
app.disable('x-powered-by');

// ── CORS ──
const corsOriginsRaw = process.env.CORS_ORIGINS || '';
const allowedOrigins = corsOriginsRaw === '*'
  ? '*'
  : corsOriginsRaw
    ? corsOriginsRaw.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.' },
});
app.use('/clientes/cadastro', authLimiter);
app.use('/lojas', authLimiter);

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' },
});
app.use('/auth/forgot-password', forgotLimiter);

// ── Body parsing com limite ──
app.use(express.json({ limit: '1mb' }));

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rotas ──
app.use(routes);

// ── Error handler ──
app.use(errorHandler);

// ── Exportar app para testes ──
module.exports = app;

// ── HTTP Server + Socket.io ──
const server = http.createServer(app);
initSocket(server, allowedOrigins);

// ── Graceful shutdown ──
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor marcket rodando em http://0.0.0.0:${PORT} [${IS_PROD ? 'PROD' : 'DEV'}] (WebSocket ativo)`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando...');
  server.close(() => process.exit(0));
});

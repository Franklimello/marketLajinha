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
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { errorHandler } = require('./middleware');
const { initSocket } = require('./config/socket');
const { getRedis } = require('./config/redis');
const { startWeeklyReportJob } = require('./jobs/weeklyReportJob');
const { startStoriesExpirationJob } = require('./jobs/storiesExpirationJob');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Em produção atrás de proxy (Railway/Nginx), usa o IP real do cliente no rate limit.
if (IS_PROD) app.set('trust proxy', 1);

// ── Segurança HTTP ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.disable('x-powered-by');

// ── CORS ──
const corsOriginsRaw = process.env.CORS_ORIGINS || '';
const allowedOrigins = corsOriginsRaw === '*'
  ? true
  : corsOriginsRaw
    ? corsOriginsRaw.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
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
app.use('/auth/session', authLimiter);
app.use('/auth/session/refresh', authLimiter);
app.use('/lojas/cadastro', authLimiter);

const lojasReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 1200 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições de consulta. Tente novamente em alguns minutos.' },
  skip: (req) => !['GET', 'HEAD', 'OPTIONS'].includes(req.method),
});
app.use('/lojas', lojasReadLimiter);

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
app.use(cookieParser());

// ── Uploads públicos (somente arquivos estáticos) ──
const uploadsDir = path.join(__dirname, 'uploads');
const uploadsStoriesDir = path.join(uploadsDir, 'stories');
fs.mkdirSync(uploadsStoriesDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, {
  dotfiles: 'deny',
  index: false,
  maxAge: IS_PROD ? '7d' : 0,
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

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
  startWeeklyReportJob();
  startStoriesExpirationJob();
});

function gracefulShutdown(signal) {
  console.log(`${signal} recebido. Encerrando...`);
  const r = getRedis();
  if (r) r.quit().catch(() => {});
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

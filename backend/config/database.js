/**
 * Configuração do Prisma Client (SQLite com adapter).
 * dotenv é carregado em index.js antes das rotas.
 */
const { PrismaClient } = require('../generated/prisma');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

module.exports = { prisma };

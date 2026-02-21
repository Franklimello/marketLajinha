/**
 * Configuração do Prisma Client (PostgreSQL via Neon).
 * Singleton pattern para evitar múltiplas conexões.
 * dotenv é carregado em index.js antes das rotas.
 */
const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const IS_PROD = process.env.NODE_ENV === 'production';

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: IS_PROD ? { rejectUnauthorized: false } : false,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = global.__prisma || createPrismaClient();
if (!IS_PROD) global.__prisma = prisma;

module.exports = { prisma };

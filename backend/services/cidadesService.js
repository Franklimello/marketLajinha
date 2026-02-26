const { prisma } = require('../config/database');
const { cacheOuBuscar, invalidarCache } = require('../config/redis');

const ESTADOS_SUPORTADOS = new Set(['MG', 'ES']);

function normalizarEstado(estado) {
  return String(estado || '').trim().toUpperCase();
}

function validarEstado(estado) {
  const uf = normalizarEstado(estado);
  return ESTADOS_SUPORTADOS.has(uf) ? uf : null;
}

async function listarPorEstado(estado) {
  const uf = validarEstado(estado);
  if (!uf) return null;

  return cacheOuBuscar(`cidades:${uf}`, async () => {
    const cidades = await prisma.cidades.findMany({
      where: { estado: uf },
      select: { id_ibge: true, nome: true, estado: true },
      orderBy: { nome: 'asc' },
    });
    return cidades;
  }, 60 * 60 * 12);
}

async function upsertLote(cidades) {
  const itens = Array.isArray(cidades) ? cidades : [];
  if (itens.length === 0) return { total: 0 };

  for (const cidade of itens) {
    const idIbge = Number(cidade.id_ibge);
    const nome = String(cidade.nome || '').trim();
    const estado = validarEstado(cidade.estado);
    if (!idIbge || !nome || !estado) continue;

    await prisma.cidades.upsert({
      where: { id_ibge: idIbge },
      update: { nome, estado },
      create: { id_ibge: idIbge, nome, estado },
    });
  }

  await invalidarCache('cidades:*');
  return { total: itens.length };
}

module.exports = {
  listarPorEstado,
  upsertLote,
  validarEstado,
};

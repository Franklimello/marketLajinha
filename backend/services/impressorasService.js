const { prisma } = require('../config/database');

async function listarPorLoja(lojaId) {
  return prisma.impressora.findMany({
    where: { loja_id: lojaId },
    orderBy: { setor: 'asc' },
  });
}

async function buscarPorId(id) {
  return prisma.impressora.findUnique({ where: { id } });
}

async function buscarPorSetor(lojaId, setor) {
  return prisma.impressora.findFirst({
    where: { loja_id: lojaId, setor, ativa: true },
  });
}

async function criar(data) {
  return prisma.impressora.create({ data });
}

async function atualizar(id, data) {
  return prisma.impressora.update({ where: { id }, data });
}

async function excluir(id) {
  return prisma.impressora.delete({ where: { id } });
}

module.exports = { listarPorLoja, buscarPorId, buscarPorSetor, criar, atualizar, excluir };

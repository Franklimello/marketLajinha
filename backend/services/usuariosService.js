const { prisma } = require('../config/database');

async function listarPorLoja(lojaId) {
  return prisma.usuarios.findMany({
    where: { loja_id: lojaId },
    select: { id: true, nome: true, email: true, role: true, loja_id: true },
  });
}

async function buscarPorId(id) {
  return prisma.usuarios.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, role: true, loja_id: true },
  });
}

async function criar(data) {
  return prisma.usuarios.create({ data });
}

async function atualizar(id, data) {
  return prisma.usuarios.update({ where: { id }, data });
}

async function excluir(id) {
  return prisma.usuarios.delete({ where: { id } });
}

module.exports = {
  listarPorLoja,
  buscarPorId,
  criar,
  atualizar,
  excluir,
};

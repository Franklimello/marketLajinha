const { prisma } = require('../config/database');

async function listarPorLoja(loja_id) {
  return prisma.bairroTaxa.findMany({
    where: { loja_id },
    orderBy: { nome: 'asc' },
  });
}

async function criar(loja_id, nome, taxa) {
  return prisma.bairroTaxa.create({
    data: { loja_id, nome, taxa },
  });
}

async function criarVarios(loja_id, bairros) {
  const operacoes = bairros.map((b) =>
    prisma.bairroTaxa.upsert({
      where: { loja_id_nome: { loja_id, nome: b.nome } },
      update: { taxa: b.taxa },
      create: { loja_id, nome: b.nome, taxa: b.taxa },
    })
  );
  return prisma.$transaction(operacoes);
}

async function atualizar(id, data) {
  return prisma.bairroTaxa.update({
    where: { id },
    data,
  });
}

async function excluir(id) {
  return prisma.bairroTaxa.delete({ where: { id } });
}

async function buscarPorId(id) {
  return prisma.bairroTaxa.findUnique({ where: { id } });
}

module.exports = {
  listarPorLoja,
  criar,
  criarVarios,
  atualizar,
  excluir,
  buscarPorId,
};

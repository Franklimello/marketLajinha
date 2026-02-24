const { prisma } = require('../config/database');

function promocaoAtivaNoPeriodo(promocao, now = new Date()) {
  if (!promocao.ativo) return false;
  if (promocao.destaque_inicio && new Date(promocao.destaque_inicio) > now) return false;
  if (promocao.destaque_fim && new Date(promocao.destaque_fim) < now) return false;
  return true;
}

async function listarPorLoja(lojaId, apenasAtivas = false) {
  const promocoes = await prisma.promocao.findMany({
    where: { loja_id: lojaId },
    orderBy: [{ ativo: 'desc' }, { created_at: 'desc' }],
  });
  if (!apenasAtivas) return promocoes;
  const now = new Date();
  return promocoes.filter((p) => promocaoAtivaNoPeriodo(p, now));
}

async function buscarPorId(id) {
  return prisma.promocao.findUnique({ where: { id } });
}

async function criar(lojaId, data) {
  return prisma.promocao.create({
    data: {
      loja_id: lojaId,
      titulo: data.titulo,
      descricao: data.descricao || '',
      imagem_url: data.imagem_url || '',
      preco_promocional: data.preco_promocional || 0,
      ativo: data.ativo !== undefined ? data.ativo : true,
      destaque_inicio: data.destaque_inicio ? new Date(data.destaque_inicio) : null,
      destaque_fim: data.destaque_fim ? new Date(data.destaque_fim) : null,
    },
  });
}

async function atualizar(id, data) {
  const updateData = {};
  if (data.titulo !== undefined) updateData.titulo = data.titulo;
  if (data.descricao !== undefined) updateData.descricao = data.descricao;
  if (data.imagem_url !== undefined) updateData.imagem_url = data.imagem_url;
  if (data.preco_promocional !== undefined) updateData.preco_promocional = data.preco_promocional;
  if (data.ativo !== undefined) updateData.ativo = data.ativo;
  if (data.destaque_inicio !== undefined) updateData.destaque_inicio = data.destaque_inicio ? new Date(data.destaque_inicio) : null;
  if (data.destaque_fim !== undefined) updateData.destaque_fim = data.destaque_fim ? new Date(data.destaque_fim) : null;
  return prisma.promocao.update({ where: { id }, data: updateData });
}

async function excluir(id) {
  return prisma.promocao.delete({ where: { id } });
}

module.exports = {
  listarPorLoja,
  buscarPorId,
  criar,
  atualizar,
  excluir,
  promocaoAtivaNoPeriodo,
};

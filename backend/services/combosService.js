const { prisma } = require('../config/database');

const INCLUDE_ITENS = {
  itens: {
    include: {
      produto: { select: { id: true, nome: true, preco: true, imagem_url: true, categoria: true } },
    },
  },
};

async function listarPorLoja(lojaId, apenasAtivos = false) {
  const where = { loja_id: lojaId };
  if (apenasAtivos) where.ativo = true;
  return prisma.combo.findMany({
    where,
    include: INCLUDE_ITENS,
    orderBy: { created_at: 'desc' },
  });
}

async function buscarPorId(id) {
  return prisma.combo.findUnique({ where: { id }, include: INCLUDE_ITENS });
}

async function criar(lojaId, data) {
  const { itens, ...comboData } = data;

  return prisma.$transaction(async (tx) => {
    const combo = await tx.combo.create({
      data: {
        loja_id: lojaId,
        nome: comboData.nome,
        descricao: comboData.descricao || '',
        preco: comboData.preco,
        imagem_url: comboData.imagem_url || '',
        ativo: comboData.ativo !== undefined ? comboData.ativo : true,
      },
    });

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await tx.comboItem.create({
          data: {
            combo_id: combo.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade || 1,
          },
        });
      }
    }

    return tx.combo.findUnique({ where: { id: combo.id }, include: INCLUDE_ITENS });
  });
}

async function atualizar(id, data) {
  const { itens, ...comboData } = data;

  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (comboData.nome !== undefined) updateData.nome = comboData.nome;
    if (comboData.descricao !== undefined) updateData.descricao = comboData.descricao;
    if (comboData.preco !== undefined) updateData.preco = comboData.preco;
    if (comboData.imagem_url !== undefined) updateData.imagem_url = comboData.imagem_url;
    if (comboData.ativo !== undefined) updateData.ativo = comboData.ativo;

    await tx.combo.update({ where: { id }, data: updateData });

    if (itens !== undefined) {
      await tx.comboItem.deleteMany({ where: { combo_id: id } });
      for (const item of itens) {
        await tx.comboItem.create({
          data: {
            combo_id: id,
            produto_id: item.produto_id,
            quantidade: item.quantidade || 1,
          },
        });
      }
    }

    return tx.combo.findUnique({ where: { id }, include: INCLUDE_ITENS });
  });
}

async function excluir(id) {
  return prisma.combo.delete({ where: { id } });
}

module.exports = { listarPorLoja, buscarPorId, criar, atualizar, excluir };

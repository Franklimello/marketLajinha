const { prisma } = require('../config/database');

const ITENS_POR_PAGINA = 12;

const INCLUDE_COMPLETO = {
  variacoes: { orderBy: { preco: 'asc' } },
  adicionais: { orderBy: { nome: 'asc' } },
};

async function listar(filtros = {}, pagina = 1) {
  const { loja_id, ativo, categoria } = filtros;
  const where = {};
  if (loja_id) where.loja_id = loja_id;
  if (ativo !== undefined) where.ativo = ativo === 'true';
  if (categoria) where.categoria = categoria;

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const [dados, total] = await Promise.all([
    prisma.produtos.findMany({
      where,
      skip: (paginaNum - 1) * ITENS_POR_PAGINA,
      take: ITENS_POR_PAGINA,
      orderBy: { nome: 'asc' },
      include: INCLUDE_COMPLETO,
    }),
    prisma.produtos.count({ where }),
  ]);
  return { dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / ITENS_POR_PAGINA) };
}

async function listarPorLoja(lojaIdOuSlug, pagina = 1) {
  const loja = await prisma.lojas.findFirst({
    where: { OR: [{ id: lojaIdOuSlug }, { slug: lojaIdOuSlug }], ativa: true },
  });
  if (!loja) return { loja: null, dados: [], total: 0, pagina: 1, total_paginas: 0 };

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const [dados, total] = await Promise.all([
    prisma.produtos.findMany({
      where: { loja_id: loja.id, ativo: true },
      skip: (paginaNum - 1) * ITENS_POR_PAGINA,
      take: ITENS_POR_PAGINA,
      orderBy: { nome: 'asc' },
      include: INCLUDE_COMPLETO,
    }),
    prisma.produtos.count({ where: { loja_id: loja.id, ativo: true } }),
  ]);
  return {
    loja: { id: loja.id, nome: loja.nome, slug: loja.slug },
    dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / ITENS_POR_PAGINA),
  };
}

async function buscarPorId(id) {
  return prisma.produtos.findUnique({
    where: { id },
    include: { loja: { select: { id: true, nome: true, slug: true } }, ...INCLUDE_COMPLETO },
  });
}

async function criar(data) {
  const { variacoes, adicionais, ...rest } = data;
  const produto = await prisma.produtos.create({
    data: {
      loja_id: rest.loja_id,
      nome: rest.nome,
      descricao: rest.descricao || '',
      preco: rest.preco,
      estoque: rest.estoque || 0,
      imagem_url: rest.imagem_url || '',
      categoria: rest.categoria || '',
      setor_impressao: rest.setor_impressao || '',
      ativo: rest.ativo !== undefined ? rest.ativo : true,
    },
    include: INCLUDE_COMPLETO,
  });

  if (variacoes?.length) {
    for (const v of variacoes) {
      await prisma.variacaoProduto.create({
        data: { nome: v.nome, preco: v.preco, produto_id: produto.id },
      });
    }
  }
  if (adicionais?.length) {
    for (const a of adicionais) {
      await prisma.adicionalProduto.create({
        data: { nome: a.nome, preco: a.preco, produto_id: produto.id },
      });
    }
  }

  return prisma.produtos.findUnique({ where: { id: produto.id }, include: INCLUDE_COMPLETO });
}

async function atualizar(id, data) {
  const { variacoes, adicionais, ...produtoData } = data;

  return prisma.$transaction(async (tx) => {
    if (variacoes !== undefined) {
      await tx.variacaoProduto.deleteMany({ where: { produto_id: id } });
      for (const v of variacoes) {
        await tx.variacaoProduto.create({
          data: { nome: v.nome, preco: v.preco, produto_id: id },
        });
      }
    }

    if (adicionais !== undefined) {
      await tx.adicionalProduto.deleteMany({ where: { produto_id: id } });
      for (const a of adicionais) {
        await tx.adicionalProduto.create({
          data: { nome: a.nome, preco: a.preco, produto_id: id },
        });
      }
    }

    return tx.produtos.update({
      where: { id },
      data: produtoData,
      include: INCLUDE_COMPLETO,
    });
  });
}

async function excluir(id) {
  return prisma.produtos.delete({ where: { id } });
}

module.exports = { listar, listarPorLoja, buscarPorId, criar, atualizar, excluir, ITENS_POR_PAGINA };

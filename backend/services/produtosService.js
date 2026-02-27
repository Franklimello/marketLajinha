const { prisma } = require('../config/database');
const { cacheOuBuscar, invalidarCache } = require('../config/redis');

const ITENS_POR_PAGINA = 12;

const INCLUDE_COMPLETO = {
  variacoes: { orderBy: { preco: 'asc' } },
  adicionais: {
    orderBy: [
      { ordem_grupo: 'asc' },
      { grupo_nome: 'asc' },
      { ordem_item: 'asc' },
      { nome: 'asc' },
    ],
  },
};

async function listar(filtros = {}, pagina = 1, limite) {
  const { loja_id, ativo, categoria } = filtros;
  const where = {};
  if (loja_id) where.loja_id = loja_id;
  if (ativo !== undefined) where.ativo = ativo === 'true';
  if (categoria) where.categoria = categoria;

  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  // Permite que o dashboard passe limite=200 para buscar todos os produtos de uma vez.
  // Máximo de 200 para evitar sobrecarga.
  const limiteNum = limite
    ? Math.min(200, Math.max(1, parseInt(limite, 10) || ITENS_POR_PAGINA))
    : ITENS_POR_PAGINA;

  const [dados, total] = await Promise.all([
    prisma.produtos.findMany({
      where,
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum,
      orderBy: { nome: 'asc' },
      include: INCLUDE_COMPLETO,
    }),
    prisma.produtos.count({ where }),
  ]);
  return { dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / limiteNum) };
}

async function listarPorLoja(lojaIdOuSlug, pagina = 1) {
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const cacheKey = `produtos:loja:${lojaIdOuSlug}:p${paginaNum}`;

  return cacheOuBuscar(cacheKey, async () => {
    const loja = await prisma.lojas.findFirst({
      where: { OR: [{ id: lojaIdOuSlug }, { slug: lojaIdOuSlug }], ativa: true },
    });
    if (!loja) return { loja: null, dados: [], total: 0, pagina: 1, total_paginas: 0 };

    // Parse categorias desativadas com fallback seguro
    let catsDesativadas = [];
    try {
      const parsed = JSON.parse(loja.categorias_desativadas || '[]');
      catsDesativadas = Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string' && c.trim()) : [];
    } catch {
      catsDesativadas = [];
    }

    // Filtro base: apenas produtos ativos
    const whereBase = { loja_id: loja.id, ativo: true };

    // Só aplica notIn se houver categorias para excluir (array vazio não quebra a query)
    if (catsDesativadas.length > 0) {
      whereBase.categoria = { notIn: catsDesativadas };
    }

    const [dados, total] = await Promise.all([
      prisma.produtos.findMany({
        where: whereBase,
        skip: (paginaNum - 1) * ITENS_POR_PAGINA,
        take: ITENS_POR_PAGINA,
        orderBy: { nome: 'asc' },
        include: INCLUDE_COMPLETO,
      }),
      prisma.produtos.count({ where: whereBase }),
    ]);
    return {
      loja: { id: loja.id, nome: loja.nome, slug: loja.slug },
      dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / ITENS_POR_PAGINA),
    };
  }, 45);
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
      preco_promocional: rest.preco_promocional || 0,
      em_promocao: rest.em_promocao !== undefined ? rest.em_promocao : false,
      estoque: rest.estoque || 0,
      controla_estoque: rest.controla_estoque !== undefined ? rest.controla_estoque : false,
      imagem_url: rest.imagem_url || '',
      categoria: rest.categoria || '',
      setor_impressao: rest.setor_impressao || '',
      ativo: rest.ativo !== undefined ? rest.ativo : true,
      destaque: rest.destaque !== undefined ? rest.destaque : false,
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
    for (const [idx, a] of adicionais.entries()) {
      await prisma.adicionalProduto.create({
        data: {
          nome: a.nome,
          preco: a.preco,
          produto_id: produto.id,
          grupo_nome: a.grupo_nome || 'Complementos',
          grupo_min: Number.isFinite(a.grupo_min) ? a.grupo_min : 0,
          grupo_max: Number.isFinite(a.grupo_max) ? a.grupo_max : 99,
          ordem_grupo: Number.isFinite(a.ordem_grupo) ? a.ordem_grupo : 0,
          ordem_item: Number.isFinite(a.ordem_item) ? a.ordem_item : idx,
        },
      });
    }
  }

  const resultado = await prisma.produtos.findUnique({ where: { id: produto.id }, include: INCLUDE_COMPLETO });
  await invalidarCache(`produtos:loja:${rest.loja_id}:*`);
  return resultado;
}

async function atualizar(id, data) {
  const { variacoes, adicionais, ...produtoData } = data;

  const resultado = await prisma.$transaction(async (tx) => {
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
      for (const [idx, a] of adicionais.entries()) {
        await tx.adicionalProduto.create({
          data: {
            nome: a.nome,
            preco: a.preco,
            produto_id: id,
            grupo_nome: a.grupo_nome || 'Complementos',
            grupo_min: Number.isFinite(a.grupo_min) ? a.grupo_min : 0,
            grupo_max: Number.isFinite(a.grupo_max) ? a.grupo_max : 99,
            ordem_grupo: Number.isFinite(a.ordem_grupo) ? a.ordem_grupo : 0,
            ordem_item: Number.isFinite(a.ordem_item) ? a.ordem_item : idx,
          },
        });
      }
    }

    return tx.produtos.update({
      where: { id },
      data: produtoData,
      include: INCLUDE_COMPLETO,
    });
  });
  await invalidarCache('produtos:loja:*');
  return resultado;
}

async function excluir(id) {
  const produto = await prisma.produtos.delete({ where: { id } });
  await invalidarCache('produtos:loja:*');
  return produto;
}

module.exports = { listar, listarPorLoja, buscarPorId, criar, atualizar, excluir, ITENS_POR_PAGINA };

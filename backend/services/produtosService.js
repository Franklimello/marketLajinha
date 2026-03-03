const { prisma } = require('../config/database');
const { cacheOuBuscar, invalidarCache } = require('../config/redis');

const ITENS_POR_PAGINA = 12;
const CACHE_TTL_SECONDS = 300;

const INCLUDE_COMPLETO = {
  variacoes: { orderBy: { preco: 'asc' } },
  adicionais: {
    include: {
      precos_variacoes: {
        include: { variacao: { select: { id: true, nome: true } } },
        orderBy: { variacao_id: 'asc' },
      },
    },
    orderBy: [
      { ordem_grupo: 'asc' },
      { grupo_nome: 'asc' },
      { ordem_item: 'asc' },
      { nome: 'asc' },
    ],
  },
};

function normalizarNomeVariacao(valor) {
  return String(valor || '').trim().toUpperCase();
}

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
  const cacheKey = `produtos:loja:${lojaIdOuSlug}:pagina:${paginaNum}`;

  return cacheOuBuscar(cacheKey, async () => buscarPaginaProdutosPorLojaRef(lojaIdOuSlug, paginaNum), {
    ttlSeconds: CACHE_TTL_SECONDS,
    swrThresholdRatio: 0.3,
    meta: { storeSlug: lojaIdOuSlug, storeId: lojaIdOuSlug },
  });
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
      tipo_produto: rest.tipo_produto || 'NORMAL',
      pizza_preco_sabores: rest.pizza_preco_sabores || 'MAIOR',
    },
    include: INCLUDE_COMPLETO,
  });

  const variacaoMap = new Map();
  if (variacoes?.length) {
    for (const v of variacoes) {
      const criada = await prisma.variacaoProduto.create({
        data: {
          nome: v.nome,
          preco: v.preco,
          produto_id: produto.id,
          fatias: Number.isFinite(v.fatias) ? v.fatias : 0,
          max_sabores: Number.isFinite(v.max_sabores) ? Math.max(1, v.max_sabores) : 1,
        },
      });
      variacaoMap.set(normalizarNomeVariacao(v.nome), criada.id);
    }
  }
  if (adicionais?.length) {
    for (const [idx, a] of adicionais.entries()) {
      const adicionalCriado = await prisma.adicionalProduto.create({
        data: {
          nome: a.nome,
          preco: a.preco,
          descricao: a.descricao || '',
          ativo: a.ativo !== undefined ? !!a.ativo : true,
          produto_id: produto.id,
          grupo_nome: a.grupo_nome || 'Complementos',
          grupo_min: Number.isFinite(a.grupo_min) ? a.grupo_min : 0,
          grupo_max: Number.isFinite(a.grupo_max) ? a.grupo_max : 99,
          ordem_grupo: Number.isFinite(a.ordem_grupo) ? a.ordem_grupo : 0,
          ordem_item: Number.isFinite(a.ordem_item) ? a.ordem_item : idx,
          is_sabor: !!a.is_sabor,
        },
      });
      if (Array.isArray(a.precos_variacoes) && a.precos_variacoes.length > 0) {
        for (const pv of a.precos_variacoes) {
          const variacaoId = variacaoMap.get(normalizarNomeVariacao(pv.variacao_nome));
          if (!variacaoId) continue;
          await prisma.adicionalPrecoVariacao.create({
            data: {
              adicional_id: adicionalCriado.id,
              variacao_id: variacaoId,
              preco: Number(pv.preco || 0),
            },
          });
        }
      }
    }
  }

  const resultado = await prisma.produtos.findUnique({ where: { id: produto.id }, include: INCLUDE_COMPLETO });
  await invalidarCache(`produtos:loja:${rest.loja_id}:*`);
  const loja = await prisma.lojas.findUnique({ where: { id: rest.loja_id }, select: { slug: true } });
  if (loja?.slug) {
    await invalidarCache(`produtos:loja:${loja.slug}:*`);
    await invalidarCache(`loja:slug:${loja.slug}`);
  }
  preaquecerCachesProduto(rest.loja_id).catch((err) => {
    console.warn(`[CACHE] PREWARM_ERROR loja=${rest.loja_id} erro=${err.message}`);
  });
  return resultado;
}

async function atualizar(id, data) {
  const { variacoes, adicionais, ...produtoData } = data;

  const resultado = await prisma.$transaction(async (tx) => {
    const variacaoMap = new Map();
    if (variacoes !== undefined) {
      await tx.variacaoProduto.deleteMany({ where: { produto_id: id } });
      for (const v of variacoes) {
        const criada = await tx.variacaoProduto.create({
          data: {
            nome: v.nome,
            preco: v.preco,
            produto_id: id,
            fatias: Number.isFinite(v.fatias) ? v.fatias : 0,
            max_sabores: Number.isFinite(v.max_sabores) ? Math.max(1, v.max_sabores) : 1,
          },
        });
        variacaoMap.set(normalizarNomeVariacao(v.nome), criada.id);
      }
    }
    if (variacoes === undefined && adicionais !== undefined) {
      const existentes = await tx.variacaoProduto.findMany({
        where: { produto_id: id },
        select: { id: true, nome: true },
      });
      for (const v of existentes) {
        variacaoMap.set(normalizarNomeVariacao(v.nome), v.id);
      }
    }

    if (adicionais !== undefined) {
      await tx.adicionalProduto.deleteMany({ where: { produto_id: id } });
      for (const [idx, a] of adicionais.entries()) {
        const adicionalCriado = await tx.adicionalProduto.create({
          data: {
            nome: a.nome,
            preco: a.preco,
            descricao: a.descricao || '',
            ativo: a.ativo !== undefined ? !!a.ativo : true,
            produto_id: id,
            grupo_nome: a.grupo_nome || 'Complementos',
            grupo_min: Number.isFinite(a.grupo_min) ? a.grupo_min : 0,
            grupo_max: Number.isFinite(a.grupo_max) ? a.grupo_max : 99,
            ordem_grupo: Number.isFinite(a.ordem_grupo) ? a.ordem_grupo : 0,
            ordem_item: Number.isFinite(a.ordem_item) ? a.ordem_item : idx,
            is_sabor: !!a.is_sabor,
          },
        });
        if (Array.isArray(a.precos_variacoes) && a.precos_variacoes.length > 0) {
          for (const pv of a.precos_variacoes) {
            const variacaoId = variacaoMap.get(normalizarNomeVariacao(pv.variacao_nome));
            if (!variacaoId) continue;
            await tx.adicionalPrecoVariacao.create({
              data: {
                adicional_id: adicionalCriado.id,
                variacao_id: variacaoId,
                preco: Number(pv.preco || 0),
              },
            });
          }
        }
      }
    }

    return tx.produtos.update({
      where: { id },
      data: produtoData,
      include: INCLUDE_COMPLETO,
    });
  });
  const loja = await prisma.lojas.findUnique({
    where: { id: resultado.loja_id },
    select: { id: true, slug: true },
  });
  if (loja) {
    await invalidarCache(`produtos:loja:${loja.id}:*`);
    if (loja.slug) await invalidarCache(`produtos:loja:${loja.slug}:*`);
    if (loja.slug) await invalidarCache(`loja:slug:${loja.slug}`);
    preaquecerCachesProduto(loja.id).catch((err) => {
      console.warn(`[CACHE] PREWARM_ERROR loja=${loja.id} erro=${err.message}`);
    });
  } else {
    await invalidarCache('produtos:loja:*');
  }
  return resultado;
}

async function excluir(id) {
  const produto = await prisma.produtos.findUnique({
    where: { id },
    select: { loja_id: true },
  });
  const excluido = await prisma.produtos.delete({ where: { id } });
  if (produto?.loja_id) {
    const loja = await prisma.lojas.findUnique({ where: { id: produto.loja_id }, select: { slug: true } });
    await invalidarCache(`produtos:loja:${produto.loja_id}:*`);
    if (loja?.slug) await invalidarCache(`produtos:loja:${loja.slug}:*`);
    if (loja?.slug) await invalidarCache(`loja:slug:${loja.slug}`);
    preaquecerCachesProduto(produto.loja_id).catch((err) => {
      console.warn(`[CACHE] PREWARM_ERROR loja=${produto.loja_id} erro=${err.message}`);
    });
  } else {
    await invalidarCache('produtos:loja:*');
  }
  return excluido;
}

async function preaquecerCachesProduto(lojaId, pagina = 1) {
  const loja = await prisma.lojas.findUnique({
    where: { id: lojaId },
    select: { id: true, slug: true, ativa: true },
  });
  if (!loja || !loja.ativa) return;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  await Promise.all([
    cacheOuBuscar(
      `produtos:loja:${loja.id}:pagina:${paginaNum}`,
      async () => buscarPaginaProdutosPorLojaRef(loja.id, paginaNum),
      { ttlSeconds: CACHE_TTL_SECONDS, forceRefresh: true, disableSWR: true, meta: { storeId: loja.id, storeSlug: loja.slug } }
    ),
    loja.slug
      ? cacheOuBuscar(
        `produtos:loja:${loja.slug}:pagina:${paginaNum}`,
        async () => buscarPaginaProdutosPorLojaRef(loja.slug, paginaNum),
        { ttlSeconds: CACHE_TTL_SECONDS, forceRefresh: true, disableSWR: true, meta: { storeId: loja.id, storeSlug: loja.slug } }
      )
      : Promise.resolve(),
  ]);
}

async function buscarPaginaProdutosPorLojaRef(lojaIdOuSlug, paginaNum) {
  const loja = await prisma.lojas.findFirst({
    where: { OR: [{ id: lojaIdOuSlug }, { slug: lojaIdOuSlug }], ativa: true },
  });
  if (!loja) return { loja: null, dados: [], total: 0, pagina: 1, total_paginas: 0 };

  let catsDesativadas = [];
  try {
    const parsed = JSON.parse(loja.categorias_desativadas || '[]');
    catsDesativadas = Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string' && c.trim()) : [];
  } catch {
    catsDesativadas = [];
  }

  const whereBase = { loja_id: loja.id, ativo: true };
  if (catsDesativadas.length > 0) whereBase.categoria = { notIn: catsDesativadas };

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
    dados,
    total,
    pagina: paginaNum,
    total_paginas: Math.ceil(total / ITENS_POR_PAGINA),
  };
}

module.exports = {
  listar,
  listarPorLoja,
  buscarPorId,
  criar,
  atualizar,
  excluir,
  ITENS_POR_PAGINA,
  preaquecerCachesProduto,
};

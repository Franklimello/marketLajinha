const { prisma } = require('../config/database');
const { calcularAbertaAgora } = require('./lojasService');
const cuponsService = require('./cuponsService');

const INCLUDE_ITENS = {
  itens: {
    include: { produto: { select: { id: true, nome: true, imagem_url: true } } },
  },
};

async function listarPorLoja(lojaId, pagina = 1, limite = 50) {
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const limiteNum = Math.min(100, Math.max(1, parseInt(limite, 10) || 50));

  const [dados, total] = await Promise.all([
    prisma.pedidos.findMany({
      where: { loja_id: lojaId },
      orderBy: { created_at: 'desc' },
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum,
      include: INCLUDE_ITENS,
    }),
    prisma.pedidos.count({ where: { loja_id: lojaId } }),
  ]);

  return { dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / limiteNum) };
}

async function listarPorCliente(clienteId) {
  return prisma.pedidos.findMany({
    where: { cliente_id: clienteId },
    orderBy: { created_at: 'desc' },
    take: 10,
    include: {
      loja: { select: { id: true, nome: true, slug: true, logo_url: true } },
      ...INCLUDE_ITENS,
    },
  });
}

async function buscarPorId(id) {
  return prisma.pedidos.findUnique({
    where: { id },
    include: { loja: { select: { id: true, nome: true } }, ...INCLUDE_ITENS },
  });
}

/**
 * Cada item pode ter:
 *  - produto_id, quantidade
 *  - variacao_id (opcional) -> busca preço da variação
 *  - adicionais_ids (opcional) -> busca preço dos adicionais
 * preco_unitario = (variação OU produto base) + soma dos adicionais
 */
async function criar(data) {
  const { itens, ...pedidoData } = data;

  const lojaCompleta = await prisma.lojas.findUnique({ where: { id: data.loja_id } });
  if (!lojaCompleta) {
    const err = new Error('Loja não encontrada.');
    err.status = 404;
    throw err;
  }
  if (!calcularAbertaAgora(lojaCompleta)) {
    const err = new Error('Esta loja está fechada no momento. Tente novamente no horário de funcionamento.');
    err.status = 400;
    throw err;
  }

  const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
  const produtos = await prisma.produtos.findMany({
    where: { id: { in: produtoIds }, loja_id: data.loja_id, ativo: true },
    include: { variacoes: true, adicionais: true },
  });
  const produtoMap = new Map(produtos.map((p) => [p.id, p]));

  const naoEncontrados = produtoIds.filter((id) => !produtoMap.has(id));
  if (naoEncontrados.length > 0) {
    const err = new Error(`Produtos não encontrados ou inativos: ${naoEncontrados.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const itensComPreco = itens.map((item) => {
    const produto = produtoMap.get(item.produto_id);

    let precoBase = Number(produto.preco);
    let variacaoNome = '';
    let variacaoPreco = 0;

    if (item.variacao_id) {
      const variacao = produto.variacoes.find((v) => v.id === item.variacao_id);
      if (variacao) {
        precoBase = Number(variacao.preco);
        variacaoNome = variacao.nome;
        variacaoPreco = Number(variacao.preco);
      }
    }

    let adicionaisSelecionados = [];
    let somaAdicionais = 0;
    if (item.adicionais_ids?.length) {
      adicionaisSelecionados = produto.adicionais.filter((a) =>
        item.adicionais_ids.includes(a.id)
      );
      somaAdicionais = adicionaisSelecionados.reduce((s, a) => s + Number(a.preco), 0);
    }

    const precoUnitario = precoBase + somaAdicionais;

    return {
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: precoUnitario,
      variacao_nome: variacaoNome,
      variacao_preco: variacaoPreco,
      adicionais_json: JSON.stringify(
        adicionaisSelecionados.map((a) => ({ nome: a.nome, preco: Number(a.preco) }))
      ),
    };
  });

  const subtotal = itensComPreco.reduce(
    (acc, item) => acc + item.preco_unitario * item.quantidade, 0
  );
  const isRetirada = pedidoData.tipo_entrega === 'RETIRADA';
  const taxaEntrega = isRetirada ? 0 : (Number(pedidoData.taxa_entrega) || 0);
  if (isRetirada) {
    pedidoData.taxa_entrega = 0;
    pedidoData.endereco = pedidoData.endereco || '';
    pedidoData.bairro = pedidoData.bairro || '';
  }

  const codigoCupom = pedidoData.codigo_cupom || '';
  delete pedidoData.codigo_cupom;

  let desconto = 0;
  let cupomId = null;
  let cupomValidado = null;

  if (codigoCupom) {
    cupomValidado = await cuponsService.validarCupom(
      data.loja_id, codigoCupom, subtotal, pedidoData.cliente_id || null
    );
    desconto = cupomValidado.desconto;
    cupomId = cupomValidado.cupom_id;
  }

  const total = Math.max(0, Math.round((subtotal - desconto + taxaEntrega) * 100) / 100);

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedidos.create({
      data: {
        ...pedidoData,
        taxa_entrega: taxaEntrega,
        subtotal,
        desconto,
        cupom_id: cupomId,
        total,
        status: 'PENDING',
        itens: { create: itensComPreco },
      },
      include: INCLUDE_ITENS,
    });

    if (cupomId && pedidoData.cliente_id) {
      await tx.cupom.update({
        where: { id: cupomId },
        data: { usos_count: { increment: 1 } },
      });
      await tx.cupomUso.create({
        data: {
          cupom_id: cupomId,
          cliente_id: pedidoData.cliente_id,
          pedido_id: pedido.id,
        },
      });
    }

    return pedido;
  });
}

async function atualizarStatus(id, status) {
  return prisma.pedidos.update({ where: { id }, data: { status }, include: INCLUDE_ITENS });
}

async function atualizar(id, data) {
  return prisma.pedidos.update({ where: { id }, data, include: INCLUDE_ITENS });
}

async function excluir(id) {
  return prisma.pedidos.delete({ where: { id } });
}

async function getLoja(lojaId) {
  return prisma.lojas.findUnique({ where: { id: lojaId }, select: { id: true, ativa: true } });
}

module.exports = { listarPorLoja, listarPorCliente, buscarPorId, criar, atualizarStatus, atualizar, excluir, getLoja };

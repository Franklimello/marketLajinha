const { prisma } = require('../config/database');
const { calcularAbertaAgora } = require('./lojasService');

const INCLUDE_ITENS = {
  itens: {
    include: { produto: { select: { id: true, nome: true, imagem_url: true } } },
  },
};

async function listarPorLoja(lojaId) {
  return prisma.pedidos.findMany({
    where: { loja_id: lojaId },
    orderBy: { created_at: 'desc' },
    include: INCLUDE_ITENS,
  });
}

async function listarPorCliente(clienteId) {
  return prisma.pedidos.findMany({
    where: { cliente_id: clienteId },
    orderBy: { created_at: 'desc' },
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
  const taxaEntrega = Number(pedidoData.taxa_entrega) || 0;
  const total = subtotal + taxaEntrega;

  return prisma.pedidos.create({
    data: {
      ...pedidoData,
      taxa_entrega: taxaEntrega,
      total,
      status: 'PENDING',
      itens: { create: itensComPreco },
    },
    include: INCLUDE_ITENS,
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

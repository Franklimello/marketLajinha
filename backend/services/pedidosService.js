const { prisma } = require('../config/database');
const { calcularAbertaAgora } = require('./lojasService');
const cuponsService = require('./cuponsService');
const DATA_LANCAMENTO_OFICIAL = new Date('2026-02-28T00:00:00');

const INCLUDE_ITENS = {
  itens: {
    include: { produto: { select: { id: true, nome: true, imagem_url: true } } },
  },
};

function isPizzaProduto(produto) {
  return String(produto?.tipo_produto || '').toUpperCase() === 'PIZZA';
}

function normalizarEstrategiaPizza(produto) {
  const valor = String(produto?.pizza_preco_sabores || 'MAIOR').toUpperCase();
  if (valor === 'MEDIA' || valor === 'SOMA_PROPORCIONAL' || valor === 'MAIOR') return valor;
  return 'MAIOR';
}

function calcularPrecoSaboresPizza(estrategia, sabores = []) {
  if (!sabores.length) return 0;
  const precos = sabores.map((s) => Number(s.preco || 0));
  if (estrategia === 'MEDIA') {
    return precos.reduce((s, p) => s + p, 0) / sabores.length;
  }
  if (estrategia === 'SOMA_PROPORCIONAL') {
    return precos.reduce((s, p) => s + p, 0) / sabores.length;
  }
  return Math.max(...precos);
}

function getPrecoAdicionalPorVariacao(adicional, variacaoId) {
  const precos = Array.isArray(adicional?.precos_variacoes) ? adicional.precos_variacoes : [];
  if (!variacaoId || precos.length === 0) return Number(adicional?.preco || 0);
  const match = precos.find((p) => p.variacao_id === variacaoId);
  if (!match) return Number(adicional?.preco || 0);
  return Number(match.preco || 0);
}

function agruparAdicionaisPorGrupo(adicionais = []) {
  const map = new Map();
  for (const adicional of adicionais) {
    const nome = String(adicional?.grupo_nome || 'Complementos').trim() || 'Complementos';
    if (!map.has(nome)) {
      map.set(nome, {
        nome,
        min: Math.max(0, Number(adicional?.grupo_min || 0)),
        max: Math.max(0, Number(adicional?.grupo_max ?? 99)),
        isSabor: !!adicional?.is_sabor,
      });
    } else if (adicional?.is_sabor) {
      map.get(nome).isSabor = true;
    }
  }
  return [...map.values()].map((g) => ({ ...g, max: Math.max(g.min, g.max) }));
}

function calcularRiscoNivel(cancelamentosValidos) {
  if (cancelamentosValidos >= 2) return 'alto';
  if (cancelamentosValidos === 1) return 'medio';
  return 'baixo';
}

async function obterCancelamentosValidosPorCliente(clienteIds = []) {
  const idsValidos = [...new Set(clienteIds.filter(Boolean))];
  if (idsValidos.length === 0) return new Map();

  const agrupados = await prisma.pedidos.groupBy({
    by: ['cliente_id'],
    where: {
      cliente_id: { in: idsValidos },
      status: 'CANCELLED',
      created_at: { gte: DATA_LANCAMENTO_OFICIAL },
    },
    _count: { _all: true },
  });

  const mapa = new Map();
  for (const row of agrupados) {
    if (!row.cliente_id) continue;
    mapa.set(row.cliente_id, Number(row._count?._all || 0));
  }
  return mapa;
}

async function anexarRiscoPedidos(pedidos = []) {
  if (!Array.isArray(pedidos) || pedidos.length === 0) return pedidos;
  const mapaCancelamentos = await obterCancelamentosValidosPorCliente(
    pedidos.map((p) => p?.cliente_id)
  );

  return pedidos.map((pedido) => {
    const cancelamentosValidos = Number(mapaCancelamentos.get(pedido?.cliente_id) || 0);
    return {
      ...pedido,
      cancelamentos_validos: cancelamentosValidos,
      risco_nivel: calcularRiscoNivel(cancelamentosValidos),
    };
  });
}

async function listarPorLoja(lojaId, pagina = 1, limite = 50, filtros = {}) {
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);
  const limiteNum = Math.min(100, Math.max(1, parseInt(limite, 10) || 50));
  const includeFinalizados = String(filtros?.include_finalizados || '').toLowerCase() === 'true';
  const status = String(filtros?.status || '').toUpperCase();
  const statusValidos = ['PENDING', 'APPROVED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED'];

  const where = { loja_id: lojaId };
  if (statusValidos.includes(status)) {
    where.status = status;
  } else if (!includeFinalizados) {
    where.status = { notIn: ['DELIVERED', 'CANCELLED'] };
  }

  const [dados, total] = await Promise.all([
    prisma.pedidos.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (paginaNum - 1) * limiteNum,
      take: limiteNum,
      include: INCLUDE_ITENS,
    }),
    prisma.pedidos.count({ where }),
  ]);

  const dadosComRisco = await anexarRiscoPedidos(dados);
  return { dados: dadosComRisco, total, pagina: paginaNum, total_paginas: Math.ceil(total / limiteNum) };
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
  const pedido = await prisma.pedidos.findUnique({
    where: { id },
    include: { loja: { select: { id: true, nome: true } }, ...INCLUDE_ITENS },
  });
  if (!pedido) return null;
  const [pedidoComRisco] = await anexarRiscoPedidos([pedido]);
  return pedidoComRisco;
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
  const isAgendado = data.agendado_para && data.agendado_para !== '';
  if (!isAgendado && !calcularAbertaAgora(lojaCompleta)) {
    const err = new Error('Esta loja está fechada no momento. Tente novamente no horário de funcionamento.');
    err.status = 400;
    throw err;
  }

  const produtoIds = [...new Set(itens.map((i) => i.produto_id))];
  const produtos = await prisma.produtos.findMany({
    where: { id: { in: produtoIds }, loja_id: data.loja_id, ativo: true },
    include: { variacoes: true, adicionais: { include: { precos_variacoes: true } } },
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
    const ehPizza = isPizzaProduto(produto);

    let precoBase = Number(produto.preco);
    let variacaoNome = '';
    let variacaoPreco = 0;

    const variacao = item.variacao_id
      ? produto.variacoes.find((v) => v.id === item.variacao_id)
      : null;

    if (item.variacao_id) {
      if (variacao) {
        precoBase = Number(variacao.preco);
        variacaoNome = variacao.nome;
        variacaoPreco = Number(variacao.preco);
      }
    }
    if (ehPizza && !variacao) {
      const err = new Error(`Selecione um tamanho válido para a pizza "${produto.nome}".`);
      err.status = 400;
      throw err;
    }

    const adicionaisAtivos = (produto.adicionais || []).filter((a) => a.ativo !== false);
    let adicionaisSelecionados = [];
    if (item.adicionais_ids?.length) {
      adicionaisSelecionados = adicionaisAtivos.filter((a) =>
        item.adicionais_ids.includes(a.id)
      );
    }

    const grupos = agruparAdicionaisPorGrupo(adicionaisAtivos);
    for (const grupo of grupos) {
      const selecionadosNoGrupo = adicionaisSelecionados.filter((a) => a.grupo_nome === grupo.nome).length;
      const min = Number(grupo.min || 0);
      const maxBase = Number(grupo.max || 99);
      const maxPizza = ehPizza && grupo.isSabor ? Number(variacao?.max_sabores || maxBase || 1) : maxBase;
      const max = Math.max(min, maxPizza);
      if (selecionadosNoGrupo < min || selecionadosNoGrupo > max) {
        const err = new Error(`Seleção inválida no grupo "${grupo.nome}" para "${produto.nome}".`);
        err.status = 400;
        throw err;
      }
    }

    let precoAdicionais = 0;
    if (ehPizza) {
      const sabores = adicionaisSelecionados.filter((a) => !!a.is_sabor);
      const extras = adicionaisSelecionados.filter((a) => !a.is_sabor);
      const maxSabores = Number(variacao?.max_sabores || 1);
      if (sabores.length < 1 || sabores.length > maxSabores) {
        const err = new Error(`Pizza "${produto.nome}" permite de 1 até ${maxSabores} sabor(es) para este tamanho.`);
        err.status = 400;
        throw err;
      }
      const saboresComPrecoVariacao = sabores.map((a) => ({
        ...a,
        preco: getPrecoAdicionalPorVariacao(a, variacao?.id),
      }));
      precoAdicionais = calcularPrecoSaboresPizza(normalizarEstrategiaPizza(produto), saboresComPrecoVariacao)
        + extras.reduce((s, a) => s + getPrecoAdicionalPorVariacao(a, variacao?.id), 0);
    } else {
      precoAdicionais = adicionaisSelecionados.reduce((s, a) => s + getPrecoAdicionalPorVariacao(a, variacao?.id), 0);
    }

    const precoUnitario = precoBase + precoAdicionais;

    return {
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: precoUnitario,
      variacao_nome: variacaoNome,
      variacao_preco: variacaoPreco,
      adicionais_json: JSON.stringify(
        adicionaisSelecionados.map((a) => ({
          nome: a.nome,
          preco: getPrecoAdicionalPorVariacao(a, variacao?.id),
          is_sabor: !!a.is_sabor,
        }))
      ),
    };
  });

  const subtotal = itensComPreco.reduce(
    (acc, item) => acc + item.preco_unitario * item.quantidade, 0
  );

  const pedidoMinimo = Number(lojaCompleta.pedido_minimo) || 0;
  if (pedidoMinimo > 0 && subtotal < pedidoMinimo) {
    const err = new Error(`Pedido mínimo é R$ ${pedidoMinimo.toFixed(2).replace('.', ',')}. Seu subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}.`);
    err.status = 400;
    throw err;
  }

  const isRetirada = pedidoData.tipo_entrega === 'RETIRADA';
  const modoAtendimento = String(lojaCompleta.modo_atendimento || 'AMBOS');
  if (modoAtendimento === 'ENTREGA' && isRetirada) {
    const err = new Error('Esta loja atende apenas por entrega.');
    err.status = 400;
    throw err;
  }
  if (modoAtendimento === 'BALCAO' && !isRetirada) {
    const err = new Error('Esta loja atende apenas retirada no balcão.');
    err.status = 400;
    throw err;
  }
  const taxaEntrega = isRetirada ? 0 : (Number(pedidoData.taxa_entrega) || 0);
  if (isRetirada) {
    pedidoData.taxa_entrega = 0;
    pedidoData.endereco = pedidoData.endereco || '';
    pedidoData.bairro = pedidoData.bairro || '';
  }

  const agendadoPara = isAgendado ? new Date(data.agendado_para) : null;
  delete pedidoData.agendado_para;

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
    // Controle de estoque opcional por produto:
    // se controla_estoque=true, valida saldo e decrementa no momento da venda.
    const quantidadesPorProduto = new Map();
    for (const item of itensComPreco) {
      const atual = quantidadesPorProduto.get(item.produto_id) || 0;
      quantidadesPorProduto.set(item.produto_id, atual + Number(item.quantidade || 0));
    }

    if (quantidadesPorProduto.size > 0) {
      const produtosEstoque = await tx.produtos.findMany({
        where: { id: { in: [...quantidadesPorProduto.keys()] }, loja_id: data.loja_id },
        select: { id: true, nome: true, estoque: true, controla_estoque: true },
      });
      const byId = new Map(produtosEstoque.map((p) => [p.id, p]));

      for (const [produtoId, qtd] of quantidadesPorProduto.entries()) {
        const produto = byId.get(produtoId);
        if (!produto || !produto.controla_estoque) continue;

        if (Number(produto.estoque) < qtd) {
          const err = new Error(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}, solicitado: ${qtd}.`);
          err.status = 400;
          throw err;
        }

        const updated = await tx.produtos.updateMany({
          where: {
            id: produtoId,
            loja_id: data.loja_id,
            controla_estoque: true,
            estoque: { gte: qtd },
          },
          data: { estoque: { decrement: qtd } },
        });

        if (updated.count === 0) {
          const err = new Error(`Estoque insuficiente para "${produto.nome}".`);
          err.status = 400;
          throw err;
        }
      }
    }

    const pedido = await tx.pedidos.create({
      data: {
        ...pedidoData,
        taxa_entrega: taxaEntrega,
        subtotal,
        desconto,
        cupom_id: cupomId,
        total,
        agendado_para: agendadoPara,
        // Novo pedido sempre entra como "Pedido recebido" no painel.
        status: 'APPROVED',
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

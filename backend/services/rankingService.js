const { prisma } = require('../config/database');

function getMesReferencia() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getPeriodoMesAtual() {
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { inicio, fim };
}

async function recalcularRankingMensalCidade(cidadeId) {
  const mesReferencia = getMesReferencia();
  const { inicio, fim } = getPeriodoMesAtual();

  const agregados = await prisma.pedidos.groupBy({
    by: ['cliente_id'],
    where: {
      cliente_id: { not: null },
      created_at: { gte: inicio, lt: fim },
      status: { not: 'CANCELLED' },
      loja: { cidade_id: cidadeId },
    },
    _count: { _all: true },
  });

  if (!agregados.length) {
    return { mesReferencia, linhas: [] };
  }

  const clienteIds = agregados.map((a) => a.cliente_id).filter(Boolean);
  const clientes = await prisma.clientes.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, nome: true, foto_url: true, ranking_publico: true },
  });

  const clientesMap = new Map(clientes.map((c) => [c.id, c]));
  const linhas = agregados
    .map((a) => {
      const cliente = clientesMap.get(a.cliente_id);
      if (!cliente) return null;
      return {
        cliente_id: cliente.id,
        pedidos_mes: Number(a._count?._all || 0),
        ranking_publico: Boolean(cliente.ranking_publico),
        nome_snapshot: String(cliente.nome || '').trim(),
        foto_snapshot: String(cliente.foto_url || '').trim(),
      };
    })
    .filter(Boolean);

  if (!linhas.length) {
    return { mesReferencia, linhas: [] };
  }

  await prisma.$transaction(
    linhas.map((linha) =>
      prisma.rankingMensalUsuario.upsert({
        where: {
          cidade_id_mes_referencia_cliente_id: {
            cidade_id: cidadeId,
            mes_referencia: mesReferencia,
            cliente_id: linha.cliente_id,
          },
        },
        update: {
          pedidos_mes: linha.pedidos_mes,
          ranking_publico: linha.ranking_publico,
          nome_snapshot: linha.nome_snapshot,
          foto_snapshot: linha.foto_snapshot,
        },
        create: {
          cidade_id: cidadeId,
          mes_referencia: mesReferencia,
          cliente_id: linha.cliente_id,
          pedidos_mes: linha.pedidos_mes,
          ranking_publico: linha.ranking_publico,
          nome_snapshot: linha.nome_snapshot,
          foto_snapshot: linha.foto_snapshot,
        },
      })
    )
  );

  return { mesReferencia, linhas };
}

async function obterRankingMensalCidade(cidadeId, currentUserId = '') {
  const userId = String(currentUserId || '').trim();
  const { mesReferencia, linhas } = await recalcularRankingMensalCidade(cidadeId);

  const ordenado = [...linhas].sort((a, b) => {
    if (b.pedidos_mes !== a.pedidos_mes) return b.pedidos_mes - a.pedidos_mes;
    return String(a.cliente_id).localeCompare(String(b.cliente_id));
  });

  const totalParticipantes = ordenado.length;
  const publicos = ordenado.filter((u) => u.ranking_publico);
  const top3 = publicos.slice(0, 3);
  const top10 = publicos.slice(0, 10);

  let userPosition = 0;
  let userPedidosMes = 0;
  let userRankingPublico = true;
  if (userId) {
    const idx = ordenado.findIndex((u) => u.cliente_id === userId);
    if (idx >= 0) {
      userPosition = idx + 1;
      userPedidosMes = Number(ordenado[idx].pedidos_mes || 0);
      userRankingPublico = Boolean(ordenado[idx].ranking_publico);
    } else {
      const current = await prisma.clientes.findUnique({
        where: { id: userId },
        select: { ranking_publico: true },
      });
      if (current) userRankingPublico = Boolean(current.ranking_publico);
    }
  }

  const terceiro = top3[2];
  const faltamParaTop3 = terceiro
    ? Math.max(0, Number(terceiro.pedidos_mes || 0) - userPedidosMes + (userPosition > 0 && userPosition <= 3 ? 0 : 1))
    : 0;

  return {
    cidadeId,
    mesReferencia,
    totalParticipantes,
    userPosition,
    userPedidosMes,
    userRankingPublico,
    faltamParaTop3,
    top3,
    top10,
  };
}

module.exports = {
  obterRankingMensalCidade,
};

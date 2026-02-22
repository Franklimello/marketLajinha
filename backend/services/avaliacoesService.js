const { prisma } = require('../config/database');

async function criar(clienteId, data) {
  const pedido = await prisma.pedidos.findUnique({
    where: { id: data.pedido_id },
    select: { id: true, loja_id: true, cliente_id: true, status: true },
  });

  if (!pedido) {
    const err = new Error('Pedido não encontrado.');
    err.status = 404;
    throw err;
  }

  if (pedido.cliente_id !== clienteId) {
    const err = new Error('Você não pode avaliar um pedido de outro cliente.');
    err.status = 403;
    throw err;
  }

  if (pedido.status !== 'DELIVERED') {
    const err = new Error('Só é possível avaliar pedidos entregues.');
    err.status = 400;
    throw err;
  }

  const existente = await prisma.avaliacao.findUnique({
    where: { pedido_id: data.pedido_id },
  });

  if (existente) {
    const err = new Error('Você já avaliou este pedido.');
    err.status = 409;
    throw err;
  }

  return prisma.avaliacao.create({
    data: {
      loja_id: pedido.loja_id,
      cliente_id: clienteId,
      pedido_id: data.pedido_id,
      nota: data.nota,
      comentario: data.comentario || '',
    },
    include: {
      cliente: { select: { nome: true } },
    },
  });
}

async function listarPorLoja(lojaId, pagina = 1) {
  const limite = 10;
  const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

  const [dados, total] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { loja_id: lojaId },
      orderBy: { created_at: 'desc' },
      skip: (paginaNum - 1) * limite,
      take: limite,
      include: {
        cliente: { select: { nome: true } },
      },
    }),
    prisma.avaliacao.count({ where: { loja_id: lojaId } }),
  ]);

  return { dados, total, pagina: paginaNum, total_paginas: Math.ceil(total / limite) };
}

async function mediaPorLoja(lojaId) {
  const result = await prisma.avaliacao.aggregate({
    where: { loja_id: lojaId },
    _avg: { nota: true },
    _count: { nota: true },
  });

  return {
    media: result._avg.nota ? Math.round(result._avg.nota * 10) / 10 : 0,
    total: result._count.nota,
  };
}

module.exports = { criar, listarPorLoja, mediaPorLoja };

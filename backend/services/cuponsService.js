const { prisma } = require('../config/database');
const { invalidarCache } = require('../config/redis');

async function listarPorLoja(lojaId) {
  return prisma.cupom.findMany({
    where: { loja_id: lojaId },
    orderBy: { created_at: 'desc' },
    include: { _count: { select: { usos: true } } },
  });
}

async function listarDisponiveisPublico(lojaId) {
  const agora = new Date();
  return prisma.cupom.findMany({
    where: {
      loja_id: lojaId,
      ativo: true,
      data_inicio: { lte: agora },
      data_fim: { gte: agora },
      OR: [
        { max_usos: null },
        { max_usos: { gt: 0 } },
      ],
    },
    orderBy: { data_fim: 'asc' },
    select: {
      id: true,
      codigo: true,
      tipo_desconto: true,
      valor_desconto: true,
      valor_minimo: true,
      max_usos: true,
      usos_count: true,
      usos_por_cliente: true,
      data_inicio: true,
      data_fim: true,
      ativo: true,
    },
  }).then((cupons) =>
    cupons
      .filter((c) => c.max_usos === null || c.usos_count < c.max_usos)
      .map((c) => ({
        ...c,
        valor_desconto: Number(c.valor_desconto),
        valor_minimo: c.valor_minimo === null ? null : Number(c.valor_minimo),
        usos_restantes: c.max_usos === null ? null : Math.max(0, c.max_usos - c.usos_count),
      }))
  );
}

async function buscarPorId(id) {
  return prisma.cupom.findUnique({
    where: { id },
    include: { _count: { select: { usos: true } } },
  });
}

async function criar(lojaId, data) {
  const cupom = await prisma.cupom.create({
    data: {
      loja_id: lojaId,
      codigo: data.codigo.toUpperCase().trim(),
      tipo_desconto: data.tipo_desconto,
      valor_desconto: data.valor_desconto,
      valor_minimo: data.valor_minimo ?? null,
      max_usos: data.max_usos ?? null,
      usos_por_cliente: data.usos_por_cliente ?? null,
      data_inicio: new Date(data.data_inicio),
      data_fim: new Date(data.data_fim),
      ativo: data.ativo ?? true,
    },
  });
  await invalidarCache('lojas:*');
  return cupom;
}

async function atualizar(id, data) {
  const updateData = {};
  if (data.codigo !== undefined) updateData.codigo = data.codigo.toUpperCase().trim();
  if (data.tipo_desconto !== undefined) updateData.tipo_desconto = data.tipo_desconto;
  if (data.valor_desconto !== undefined) updateData.valor_desconto = data.valor_desconto;
  if (data.valor_minimo !== undefined) updateData.valor_minimo = data.valor_minimo;
  if (data.max_usos !== undefined) updateData.max_usos = data.max_usos;
  if (data.usos_por_cliente !== undefined) updateData.usos_por_cliente = data.usos_por_cliente;
  if (data.data_inicio !== undefined) updateData.data_inicio = new Date(data.data_inicio);
  if (data.data_fim !== undefined) updateData.data_fim = new Date(data.data_fim);
  if (data.ativo !== undefined) updateData.ativo = data.ativo;

  const cupom = await prisma.cupom.update({ where: { id }, data: updateData });
  await invalidarCache('lojas:*');
  return cupom;
}

async function excluir(id) {
  const cupom = await prisma.cupom.delete({ where: { id } });
  await invalidarCache('lojas:*');
  return cupom;
}

function criarErro(msg, status = 400) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

async function validarCupom(lojaId, codigoCupom, subtotal, clienteId) {
  const codigo = codigoCupom.toUpperCase().trim();

  const cupom = await prisma.cupom.findUnique({
    where: { loja_id_codigo: { loja_id: lojaId, codigo } },
  });

  if (!cupom) throw criarErro('Cupom não encontrado.');
  if (!cupom.ativo) throw criarErro('Cupom inativo.');

  const agora = new Date();
  if (agora < cupom.data_inicio) throw criarErro('Cupom ainda não está válido.');
  if (agora > cupom.data_fim) throw criarErro('Cupom expirado.');

  if (cupom.max_usos !== null && cupom.usos_count >= cupom.max_usos) {
    throw criarErro('Limite máximo de usos atingido.');
  }

  if (cupom.valor_minimo !== null && subtotal < Number(cupom.valor_minimo)) {
    throw criarErro(`Valor mínimo do pedido não atingido (R$ ${Number(cupom.valor_minimo).toFixed(2).replace('.', ',')}).`);
  }

  if (cupom.usos_por_cliente !== null && clienteId) {
    const usosCliente = await prisma.cupomUso.count({
      where: { cupom_id: cupom.id, cliente_id: clienteId },
    });
    if (usosCliente >= cupom.usos_por_cliente) {
      throw criarErro('Você já usou este cupom o número máximo de vezes permitido.');
    }
  }

  let descontoAmount;
  if (cupom.tipo_desconto === 'PERCENTAGE') {
    descontoAmount = subtotal * (Number(cupom.valor_desconto) / 100);
  } else {
    descontoAmount = Number(cupom.valor_desconto);
  }

  descontoAmount = Math.min(descontoAmount, subtotal);
  descontoAmount = Math.round(descontoAmount * 100) / 100;

  const totalFinal = Math.max(0, Math.round((subtotal - descontoAmount) * 100) / 100);

  return {
    cupom,
    subtotal,
    desconto: descontoAmount,
    total_final: totalFinal,
    cupom_id: cupom.id,
  };
}

async function registrarUso(cupomId, clienteId, pedidoId) {
  return prisma.$transaction([
    prisma.cupom.update({
      where: { id: cupomId },
      data: { usos_count: { increment: 1 } },
    }),
    prisma.cupomUso.create({
      data: {
        cupom_id: cupomId,
        cliente_id: clienteId,
        pedido_id: pedidoId,
      },
    }),
  ]);
}

module.exports = { listarPorLoja, listarDisponiveisPublico, buscarPorId, criar, atualizar, excluir, validarCupom, registrarUso };

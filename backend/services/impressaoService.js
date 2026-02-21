const { prisma } = require('../config/database');
const impressorasService = require('./impressorasService');
const { buildTicket } = require('../utils/escpos');
const crypto = require('crypto');

async function imprimirPedidoPorSetor(pedidoId) {
  const pedido = await prisma.pedidos.findUnique({
    where: { id: pedidoId },
    include: {
      itens: {
        include: {
          produto: { select: { id: true, nome: true, setor_impressao: true } },
        },
      },
    },
  });

  if (!pedido) {
    console.error(`[Impressão] Pedido ${pedidoId} não encontrado.`);
    return { sucesso: false, erro: 'Pedido não encontrado' };
  }

  const porSetor = {};
  for (const item of pedido.itens) {
    const setor = item.produto?.setor_impressao || 'GERAL';
    if (!porSetor[setor]) porSetor[setor] = [];
    porSetor[setor].push(item);
  }

  const resultados = [];

  for (const [setor, itens] of Object.entries(porSetor)) {
    const impressora = await impressorasService.buscarPorSetor(pedido.loja_id, setor);

    if (!impressora) {
      console.warn(`[Impressão] Sem impressora para setor "${setor}" da loja ${pedido.loja_id}.`);
      resultados.push({ setor, status: 'sem_impressora', itens: itens.length });
      continue;
    }

    const ticket = buildTicket(pedido, itens, setor, impressora.largura || 80);

    await prisma.filaImpressao.create({
      data: {
        loja_id: pedido.loja_id,
        pedido_id: pedido.id,
        setor,
        impressora_ip: impressora.ip,
        impressora_porta: impressora.porta,
        largura: impressora.largura || 80,
        conteudo: ticket,
        status: 'PENDING',
      },
    });

    console.log(`[Impressão] Job enfileirado: setor "${setor}" -> ${impressora.ip}:${impressora.porta}`);
    resultados.push({ setor, status: 'enfileirado', impressora: `${impressora.ip}:${impressora.porta}`, itens: itens.length });
  }

  return { sucesso: true, pedidoId, setores: resultados };
}

async function buscarFilaPendente(lojaId) {
  return prisma.filaImpressao.findMany({
    where: { loja_id: lojaId, status: 'PENDING' },
    orderBy: { created_at: 'asc' },
  });
}

async function marcarImpresso(jobId, lojaId) {
  const job = await prisma.filaImpressao.findUnique({ where: { id: jobId } });
  if (!job || job.loja_id !== lojaId) return null;
  return prisma.filaImpressao.update({
    where: { id: jobId },
    data: { status: 'PRINTED', printed_at: new Date() },
  });
}

async function marcarErro(jobId, lojaId, erro) {
  const job = await prisma.filaImpressao.findUnique({ where: { id: jobId } });
  if (!job || job.loja_id !== lojaId) return null;
  return prisma.filaImpressao.update({
    where: { id: jobId },
    data: { status: 'ERROR', erro, tentativas: { increment: 1 } },
  });
}

async function reenviar(jobId, lojaId) {
  const job = await prisma.filaImpressao.findUnique({ where: { id: jobId } });
  if (!job || job.loja_id !== lojaId) return null;
  return prisma.filaImpressao.update({
    where: { id: jobId },
    data: { status: 'PENDING', erro: '' },
  });
}

async function gerarTokenImpressao(lojaId) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.lojas.update({ where: { id: lojaId }, data: { token_impressao: token } });
  return token;
}

async function validarTokenImpressao(token) {
  if (!token) return null;
  const loja = await prisma.lojas.findFirst({ where: { token_impressao: token, ativa: true } });
  return loja;
}

module.exports = {
  imprimirPedidoPorSetor,
  buscarFilaPendente, marcarImpresso, marcarErro, reenviar,
  gerarTokenImpressao, validarTokenImpressao,
};

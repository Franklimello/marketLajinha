const { prisma } = require('../config/database');

async function listarMensagens(pedidoId, limite = 50) {
  return prisma.mensagem.findMany({
    where: { pedido_id: pedidoId },
    orderBy: { created_at: 'asc' },
    take: limite,
  });
}

async function enviarMensagem({ pedido_id, loja_id, remetente, conteudo, arquivo_url, arquivo_nome, arquivo_mime }) {
  return prisma.mensagem.create({
    data: {
      pedido_id,
      loja_id,
      remetente,
      conteudo: conteudo || '',
      arquivo_url: arquivo_url || '',
      arquivo_nome: arquivo_nome || '',
      arquivo_mime: arquivo_mime || '',
    },
  });
}

async function marcarLidas(pedidoId, remetente) {
  const quemLer = remetente === 'CLIENTE' ? 'LOJA' : 'CLIENTE';
  return prisma.mensagem.updateMany({
    where: { pedido_id: pedidoId, remetente: quemLer, lido: false },
    data: { lido: true },
  });
}

async function contarNaoLidas(lojaId) {
  return prisma.mensagem.count({
    where: { loja_id: lojaId, remetente: 'CLIENTE', lido: false },
  });
}

async function contarNaoLidasCliente(pedidoId) {
  return prisma.mensagem.count({
    where: { pedido_id: pedidoId, remetente: 'LOJA', lido: false },
  });
}

async function pedidosComNaoLidas(lojaId) {
  const result = await prisma.mensagem.groupBy({
    by: ['pedido_id'],
    where: { loja_id: lojaId, remetente: 'CLIENTE', lido: false },
    _count: true,
  });
  return result.map((r) => ({ pedido_id: r.pedido_id, count: r._count }));
}

module.exports = {
  listarMensagens,
  enviarMensagem,
  marcarLidas,
  contarNaoLidas,
  contarNaoLidasCliente,
  pedidosComNaoLidas,
};

const { prisma } = require('../config/database');
const impressorasService = require('./impressorasService');
const { buildTicket, enviarParaImpressora } = require('../utils/escpos');

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
      const msg = `[Impressão] Sem impressora para setor "${setor}" da loja ${pedido.loja_id}. ${itens.length} item(ns) não impresso(s).`;
      console.warn(msg);
      resultados.push({ setor, status: 'sem_impressora', itens: itens.length });
      continue;
    }

    const ticket = buildTicket(pedido, itens, setor);

    try {
      await enviarParaImpressora(impressora.ip, impressora.porta, ticket);
      console.log(`[Impressão] Setor "${setor}" -> ${impressora.ip}:${impressora.porta} OK (${itens.length} itens)`);
      resultados.push({ setor, status: 'impresso', impressora: `${impressora.ip}:${impressora.porta}`, itens: itens.length });
    } catch (err) {
      console.error(`[Impressão] Falha setor "${setor}" -> ${impressora.ip}:${impressora.porta}: ${err.message}`);
      resultados.push({ setor, status: 'erro', erro: err.message, itens: itens.length });
    }
  }

  return { sucesso: true, pedidoId, setores: resultados };
}

module.exports = { imprimirPedidoPorSetor };

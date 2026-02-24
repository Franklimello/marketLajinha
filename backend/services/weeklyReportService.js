const { prisma } = require('../config/database');
const { sendWeeklyReportEmail } = require('./emailService');

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function getPreviousWeekRange(referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const day = now.getDay(); // 0 = domingo, 1 = segunda

  const currentMonday = new Date(now);
  const diffToMonday = day === 0 ? 6 : day - 1;
  currentMonday.setDate(now.getDate() - diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const start = new Date(currentMonday);
  start.setDate(start.getDate() - 7);

  const end = new Date(currentMonday);
  end.setMilliseconds(-1); // domingo da semana anterior às 23:59:59.999

  return { start, end };
}

function formatPeriodLabel(start, end) {
  const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt.format(start)} a ${fmt.format(end)}`;
}

async function getStoreContactEmail(lojaId) {
  const admin = await prisma.usuarios.findFirst({
    where: { loja_id: lojaId, role: 'ADMIN' },
    select: { email: true },
  });
  if (admin?.email) return admin.email;

  const anyUser = await prisma.usuarios.findFirst({
    where: { loja_id: lojaId },
    select: { email: true },
  });
  return anyUser?.email || '';
}

async function generateWeeklyReports() {
  const { start, end } = getPreviousWeekRange();
  const periodoLabel = formatPeriodLabel(start, end);

  const pedidos = await prisma.pedidos.findMany({
    where: { created_at: { gte: start, lte: end } },
    select: { loja_id: true, total: true },
  });

  if (!pedidos.length) {
    console.log(`[WEEKLY_REPORT] Nenhum pedido encontrado para o período ${periodoLabel}.`);
    return { periodo: { inicio: start, fim: end, label: periodoLabel }, enviados: 0, erros: 0 };
  }

  const resumoPorLoja = new Map();
  for (const pedido of pedidos) {
    const atual = resumoPorLoja.get(pedido.loja_id) || { totalVendido: 0, totalPedidos: 0 };
    atual.totalVendido += Number(pedido.total || 0);
    atual.totalPedidos += 1;
    resumoPorLoja.set(pedido.loja_id, atual);
  }

  const lojaIds = Array.from(resumoPorLoja.keys());
  const lojas = await prisma.lojas.findMany({
    where: { id: { in: lojaIds } },
    select: { id: true, nome: true },
  });
  const lojaById = new Map(lojas.map((loja) => [loja.id, loja]));

  let enviados = 0;
  let erros = 0;

  for (const lojaId of lojaIds) {
    const loja = lojaById.get(lojaId);
    if (!loja) continue;

    try {
      const email = await getStoreContactEmail(lojaId);
      if (!email) {
        throw new Error('Loja sem email de contato cadastrado.');
      }

      const resumoBase = resumoPorLoja.get(lojaId);
      const resumo = {
        periodoInicio: start,
        periodoFim: end,
        periodoLabel,
        totalVendido: resumoBase.totalVendido,
        totalPedidos: resumoBase.totalPedidos,
        ticketMedio: resumoBase.totalPedidos > 0 ? resumoBase.totalVendido / resumoBase.totalPedidos : 0,
      };

      await sendWeeklyReportEmail(
        { id: loja.id, nome: loja.nome, email },
        resumo
      );

      enviados += 1;
      console.log(
        `[WEEKLY_REPORT] Loja enviada com sucesso: ${loja.nome} | ` +
        `Total: ${currencyFormatter.format(resumo.totalVendido)} | ` +
        `Pedidos: ${resumo.totalPedidos}`
      );
    } catch (err) {
      erros += 1;
      console.error(`[WEEKLY_REPORT] Erro ao enviar (${loja.nome}): ${err.message}`);
    }
  }

  return { periodo: { inicio: start, fim: end, label: periodoLabel }, enviados, erros };
}

module.exports = { generateWeeklyReports, getPreviousWeekRange };

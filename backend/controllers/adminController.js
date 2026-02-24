const { prisma } = require('../config/database');
const bcrypt = require('bcryptjs');
const { getAuth } = require('../config/firebase');

const SALT_ROUNDS = 10;
const PERCENTUAL_PADRAO = Number(process.env.COMISSAO_PADRAO_PERCENTUAL || 12);

async function listarTodasLojas(req, res, next) {
  try {
    const inicio30Dias = new Date();
    inicio30Dias.setDate(inicio30Dias.getDate() - 30);

    const [
      lojas,
      pedidosPorLoja,
      vendasPorLoja,
      canceladosPorLoja,
      pedidos30dPorLoja,
      vendas30dPorLoja,
    ] = await Promise.all([
      prisma.lojas.findMany({
        orderBy: { nome: 'asc' },
        include: {
          _count: { select: { produtos: true, pedidos: true, usuarios: true } },
          usuarios: { select: { id: true, nome: true, email: true, role: true } },
        },
      }),
      prisma.pedidos.groupBy({ by: ['loja_id'], _count: { _all: true } }),
      prisma.pedidos.groupBy({
        by: ['loja_id'],
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.pedidos.groupBy({
        by: ['loja_id'],
        where: { status: 'CANCELLED' },
        _count: { _all: true },
      }),
      prisma.pedidos.groupBy({
        by: ['loja_id'],
        where: { created_at: { gte: inicio30Dias } },
        _count: { _all: true },
      }),
      prisma.pedidos.groupBy({
        by: ['loja_id'],
        where: { created_at: { gte: inicio30Dias }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    const pedidosMap = Object.fromEntries(pedidosPorLoja.map((p) => [p.loja_id, p._count?._all || 0]));
    const vendasMap = Object.fromEntries(vendasPorLoja.map((p) => [p.loja_id, Number(p._sum?.total || 0)]));
    const canceladosMap = Object.fromEntries(canceladosPorLoja.map((p) => [p.loja_id, p._count?._all || 0]));
    const pedidos30dMap = Object.fromEntries(pedidos30dPorLoja.map((p) => [p.loja_id, p._count?._all || 0]));
    const vendas30dMap = Object.fromEntries(vendas30dPorLoja.map((p) => [p.loja_id, Number(p._sum?.total || 0)]));

    const lojasComMetricas = lojas.map((loja) => {
      const pedidosTotal = pedidosMap[loja.id] || 0;
      const faturamentoTotal = vendasMap[loja.id] || 0;
      const pedidosCancelados = canceladosMap[loja.id] || 0;
      const pedidos30d = pedidos30dMap[loja.id] || 0;
      const faturamento30d = vendas30dMap[loja.id] || 0;
      const pedidosValidos = Math.max(pedidosTotal - pedidosCancelados, 0);
      const ticketMedio = pedidosValidos > 0 ? faturamentoTotal / pedidosValidos : 0;
      const taxaCancelamento = pedidosTotal > 0 ? (pedidosCancelados / pedidosTotal) * 100 : 0;

      return {
        ...loja,
        metricas: {
          pedidos_total: pedidosTotal,
          faturamento_total: faturamentoTotal,
          ticket_medio: ticketMedio,
          pedidos_cancelados: pedidosCancelados,
          taxa_cancelamento: taxaCancelamento,
          pedidos_30d: pedidos30d,
          faturamento_30d: faturamento30d,
        },
      };
    });

    res.json(lojasComMetricas);
  } catch (e) {
    next(e);
  }
}

async function buscarLoja(req, res, next) {
  try {
    const inicio30Dias = new Date();
    inicio30Dias.setDate(inicio30Dias.getDate() - 30);

    const loja = await prisma.lojas.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { produtos: true, pedidos: true, usuarios: true } },
        usuarios: { select: { id: true, nome: true, email: true, role: true } },
        produtos: { select: { id: true, nome: true, preco: true, ativo: true, categoria: true } },
      },
    });
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });

    const [resumoPedidos, resumo30d] = await Promise.all([
      prisma.pedidos.groupBy({
        by: ['status'],
        where: { loja_id: req.params.id },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.pedidos.groupBy({
        by: ['status'],
        where: { loja_id: req.params.id, created_at: { gte: inicio30Dias } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const metricasStatus = {
      PENDING: 0,
      APPROVED: 0,
      IN_ROUTE: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    let pedidosTotal = 0;
    let faturamentoTotal = 0;
    for (const item of resumoPedidos) {
      const count = item._count?._all || 0;
      metricasStatus[item.status] = count;
      pedidosTotal += count;
      if (item.status !== 'CANCELLED') faturamentoTotal += Number(item._sum?.total || 0);
    }

    const pedidosCancelados = metricasStatus.CANCELLED || 0;
    const pedidosValidos = Math.max(pedidosTotal - pedidosCancelados, 0);
    const ticketMedio = pedidosValidos > 0 ? faturamentoTotal / pedidosValidos : 0;

    let pedidos30d = 0;
    let faturamento30d = 0;
    for (const item of resumo30d) {
      pedidos30d += item._count?._all || 0;
      if (item.status !== 'CANCELLED') faturamento30d += Number(item._sum?.total || 0);
    }

    const taxaCancelamento = pedidosTotal > 0 ? (pedidosCancelados / pedidosTotal) * 100 : 0;

    res.json({
      ...loja,
      metricas: {
        pedidos_total: pedidosTotal,
        faturamento_total: faturamentoTotal,
        ticket_medio: ticketMedio,
        pedidos_cancelados: pedidosCancelados,
        taxa_cancelamento: taxaCancelamento,
        pedidos_30d: pedidos30d,
        faturamento_30d: faturamento30d,
        status: metricasStatus,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function bloquearLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.update({
      where: { id: req.params.id },
      data: { ativa: false, aberta: false },
    });
    res.json({ mensagem: `Loja "${loja.nome}" bloqueada.`, loja });
  } catch (e) {
    next(e);
  }
}

async function desbloquearLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.update({
      where: { id: req.params.id },
      data: { ativa: true },
    });
    res.json({ mensagem: `Loja "${loja.nome}" desbloqueada.`, loja });
  } catch (e) {
    next(e);
  }
}

async function excluirLoja(req, res, next) {
  try {
    const loja = await prisma.lojas.findUnique({ where: { id: req.params.id } });
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    await prisma.lojas.delete({ where: { id: req.params.id } });
    res.json({ mensagem: `Loja "${loja.nome}" excluída permanentemente.` });
  } catch (e) {
    next(e);
  }
}

async function estatisticas(req, res, next) {
  try {
    const inicio30Dias = new Date();
    inicio30Dias.setDate(inicio30Dias.getDate() - 30);

    const [lojas, usuarios, produtos, pedidos, clientes, lojasAtivas, faturamentoAgg, pedidos30d, faturamento30dAgg] = await Promise.all([
      prisma.lojas.count(),
      prisma.usuarios.count(),
      prisma.produtos.count(),
      prisma.pedidos.count(),
      prisma.clientes.count(),
      prisma.lojas.count({ where: { ativa: true } }),
      prisma.pedidos.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.pedidos.count({ where: { created_at: { gte: inicio30Dias } } }),
      prisma.pedidos.aggregate({
        where: { created_at: { gte: inicio30Dias }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    res.json({
      lojas,
      lojasAtivas,
      usuarios,
      produtos,
      pedidos,
      clientes,
      pedidos30d,
      faturamentoTotal: Number(faturamentoAgg._sum?.total || 0),
      faturamento30d: Number(faturamento30dAgg._sum?.total || 0),
    });
  } catch (e) {
    next(e);
  }
}

async function listarMotoboys(req, res, next) {
  try {
    const motoboys = await prisma.motoboy.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, ativo: true, loja_id: true, loja: { select: { nome: true } } },
    });
    res.json(motoboys);
  } catch (e) {
    next(e);
  }
}

async function resetSenhaMotoboy(req, res, next) {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 4) {
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 4 caracteres.' });
    }

    const motoboy = await prisma.motoboy.findUnique({ where: { id }, select: { id: true, nome: true } });
    if (!motoboy) return res.status(404).json({ erro: 'Motoboy não encontrado.' });

    const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await prisma.motoboy.update({ where: { id }, data: { senha_hash: senhaHash } });

    await prisma.passwordReset.updateMany({
      where: { motoboy_id: id, used: false },
      data: { used: true },
    });

    res.json({ mensagem: `Senha do motoboy "${motoboy.nome}" redefinida com sucesso.` });
  } catch (e) {
    next(e);
  }
}

async function listarLojistas(req, res, next) {
  try {
    const usuarios = await prisma.usuarios.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, email: true, role: true, firebase_uid: true, loja_id: true, loja: { select: { nome: true } } },
    });
    res.json(usuarios);
  } catch (e) {
    next(e);
  }
}

async function resetSenhaLojista(req, res, next) {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres.' });
    }

    const usuario = await prisma.usuarios.findUnique({ where: { id }, select: { id: true, nome: true, firebase_uid: true } });
    if (!usuario) return res.status(404).json({ erro: 'Lojista não encontrado.' });

    await getAuth().updateUser(usuario.firebase_uid, { password: novaSenha });
    res.json({ mensagem: `Senha do lojista "${usuario.nome}" redefinida com sucesso.` });
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      return res.status(404).json({ erro: 'Usuário não encontrado no Firebase.' });
    }
    next(e);
  }
}

async function flushCache(req, res, next) {
  try {
    const { invalidarCache } = require('../config/redis');
    await invalidarCache('lojas:*');
    await invalidarCache('produtos:*');
    res.json({ mensagem: 'Cache limpo com sucesso.' });
  } catch (e) {
    next(e);
  }
}

function parseDateOnly(raw) {
  const s = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ymdUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function gerarCobrancaLoja(req, res, next) {
  try {
    const lojaId = req.params.id;
    const loja = await prisma.lojas.findUnique({
      where: { id: lojaId },
      select: { id: true, nome: true },
    });
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });

    const inicioRaw = parseDateOnly(req.body?.data_inicio);
    const fimRaw = parseDateOnly(req.body?.data_fim);
    if (!inicioRaw || !fimRaw) {
      return res.status(400).json({ erro: 'Datas inválidas. Use o formato YYYY-MM-DD.' });
    }
    if (inicioRaw > fimRaw) {
      return res.status(400).json({ erro: 'Período inválido. A data inicial deve ser menor ou igual à final.' });
    }

    const percentual = Number(req.body?.percentual ?? PERCENTUAL_PADRAO);
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      return res.status(400).json({ erro: 'Percentual inválido. Use valor entre 0 e 100.' });
    }

    const inicio = new Date(inicioRaw);
    inicio.setUTCHours(0, 0, 0, 0);
    const fim = new Date(fimRaw);
    fim.setUTCHours(23, 59, 59, 999);
    const competencia = `${ymdUTC(inicio)}__${ymdUTC(fim)}`;

    const pedidos = await prisma.pedidos.findMany({
      where: {
        loja_id: lojaId,
        created_at: { gte: inicio, lte: fim },
      },
      select: {
        id: true,
        total: true,
        status: true,
        created_at: true,
      },
    });

    const faturamentoBruto = pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const pedidosCount = pedidos.length;
    const valorComissao = Number(((faturamentoBruto * percentual) / 100).toFixed(2));

    const cobranca = await prisma.cobrancaLojista.upsert({
      where: {
        loja_id_competencia: {
          loja_id: lojaId,
          competencia,
        },
      },
      create: {
        loja_id: lojaId,
        competencia,
        periodo_inicio: inicio,
        periodo_fim: fim,
        percentual,
        faturamento_bruto: faturamentoBruto,
        pedidos_count: pedidosCount,
        valor_comissao: valorComissao,
        status: 'FECHADA',
        fechado_em: new Date(),
        vencimento_em: null,
      },
      update: {
        periodo_inicio: inicio,
        periodo_fim: fim,
        percentual,
        faturamento_bruto: faturamentoBruto,
        pedidos_count: pedidosCount,
        valor_comissao: valorComissao,
        status: 'FECHADA',
        fechado_em: new Date(),
        vencimento_em: null,
        pago_em: null,
      },
    });

    await prisma.cobrancaPedido.deleteMany({ where: { cobranca_id: cobranca.id } });
    if (pedidos.length > 0) {
      await prisma.cobrancaPedido.createMany({
        data: pedidos.map((p) => ({
          cobranca_id: cobranca.id,
          pedido_id: p.id,
          loja_id: lojaId,
          total: Number(p.total || 0),
          status_pedido: String(p.status || ''),
          pedido_criado_em: p.created_at,
        })),
      });
    }

    res.json({
      mensagem: `Cobrança gerada para "${loja.nome}".`,
      cobranca: {
        ...cobranca,
        percentual: Number(cobranca.percentual || 0),
        faturamento_bruto: Number(cobranca.faturamento_bruto || 0),
        valor_comissao: Number(cobranca.valor_comissao || 0),
      },
    });
  } catch (e) {
    next(e);
  }
}

async function listarCobrancasPorLoja(req, res, next) {
  try {
    const lojaId = req.params.id;
    const cobrancas = await prisma.cobrancaLojista.findMany({
      where: { loja_id: lojaId },
      orderBy: { periodo_inicio: 'desc' },
      take: 24,
      select: {
        id: true,
        competencia: true,
        periodo_inicio: true,
        periodo_fim: true,
        percentual: true,
        faturamento_bruto: true,
        pedidos_count: true,
        valor_comissao: true,
        status: true,
        fechado_em: true,
        pago_em: true,
      },
    });

    res.json(
      cobrancas.map((c) => ({
        ...c,
        percentual: Number(c.percentual || 0),
        faturamento_bruto: Number(c.faturamento_bruto || 0),
        valor_comissao: Number(c.valor_comissao || 0),
      }))
    );
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listarTodasLojas,
  buscarLoja,
  bloquearLoja,
  desbloquearLoja,
  excluirLoja,
  estatisticas,
  listarMotoboys,
  resetSenhaMotoboy,
  listarLojistas,
  resetSenhaLojista,
  flushCache,
  gerarCobrancaLoja,
  listarCobrancasPorLoja,
};

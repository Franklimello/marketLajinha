const { prisma } = require('../config/database');
const { cacheOuBuscar, invalidarCache } = require('../config/redis');

function parseHorariosSemana(loja) {
  try {
    const parsed = JSON.parse(loja.horarios_semana || '[]');
    return Array.isArray(parsed) && parsed.length === 7 ? parsed : null;
  } catch { return null; }
}

function checarHorario(abertura, fechamento) {
  if (!abertura || !fechamento) return true;
  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();
  const [hAb, mAb] = abertura.split(':').map(Number);
  const [hFe, mFe] = fechamento.split(':').map(Number);
  const minAb = hAb * 60 + (mAb || 0);
  const minFe = hFe * 60 + (mFe || 0);
  if (minFe > minAb) return horaAtual >= minAb && horaAtual < minFe;
  return horaAtual >= minAb || horaAtual < minFe;
}

/**
 * Verifica se a loja está aberta agora.
 * Prioridade: forcar_status > horarios_semana > horario_abertura/fechamento > campo aberta.
 */
function calcularAbertaAgora(loja) {
  if (loja.forcar_status) return loja.aberta;

  const semana = parseHorariosSemana(loja);
  if (semana) {
    const diaAtual = new Date().getDay();
    const hoje = semana[diaAtual];
    if (!hoje || !hoje.aberto) return false;
    return checarHorario(hoje.abertura, hoje.fechamento);
  }

  const ab = loja.horario_abertura;
  const fe = loja.horario_fechamento;
  if (!ab || !fe) return loja.aberta;
  return checarHorario(ab, fe);
}

function horarioHoje(loja) {
  const semana = parseHorariosSemana(loja);
  if (!semana) {
    if (loja.horario_abertura && loja.horario_fechamento) {
      return { aberto: true, abertura: loja.horario_abertura, fechamento: loja.horario_fechamento };
    }
    return null;
  }
  return semana[new Date().getDay()] || null;
}

function adicionarAbertaAgora(loja) {
  if (!loja) return loja;
  const hoje = horarioHoje(loja);
  return {
    ...loja,
    aberta_agora: calcularAbertaAgora(loja),
    horario_hoje: hoje,
  };
}

function adicionarAbertaAgoraLista(lojas) {
  return lojas.map(adicionarAbertaAgora);
}

async function toggleAberta(id, forcar) {
  const loja = await prisma.lojas.findUnique({ where: { id } });
  if (!loja) return null;

  let atualizada;
  if (forcar !== undefined) {
    atualizada = await prisma.lojas.update({
      where: { id },
      data: { aberta: forcar, forcar_status: true },
    });
  } else {
    atualizada = await prisma.lojas.update({
      where: { id },
      data: { aberta: !loja.aberta, forcar_status: true },
    });
  }
  await invalidarCache('lojas:*');
  return atualizada;
}

async function desativarForcamento(id) {
  const loja = await prisma.lojas.update({
    where: { id },
    data: { forcar_status: false },
  });
  await invalidarCache('lojas:*');
  return loja;
}

async function listar(filtros = {}) {
  const { categoria_negocio, cidade } = filtros;
  const where = {};
  if (categoria_negocio) {
    where.categoria_negocio = { contains: categoria_negocio, mode: 'insensitive' };
  }
  if (cidade) where.cidade = cidade;
  return prisma.lojas.findMany({
    where,
    include: { _count: { select: { produtos: true } } },
  });
}

async function listarAtivas() {
  return cacheOuBuscar('lojas:ativas', async () => {
    const lojas = await prisma.lojas.findMany({
      where: { ativa: true },
      include: {
        _count: { select: { produtos: true } },
        avaliacoes: { select: { nota: true } },
      },
    });

    return lojas.map((loja) => {
      const notas = loja.avaliacoes || [];
      const media = notas.length > 0
        ? Math.round((notas.reduce((s, a) => s + a.nota, 0) / notas.length) * 10) / 10
        : 0;
      const { avaliacoes, ...rest } = loja;
      return { ...rest, nota_media: media, total_avaliacoes: notas.length };
    });
  }, 30);
}

async function listarAtivasHome() {
  return cacheOuBuscar('lojas:home', async () => {
    const agora = new Date();
    const lojas = await prisma.lojas.findMany({
      where: { ativa: true },
      select: {
        id: true,
        nome: true,
        slug: true,
        logo_url: true,
        cor_primaria: true,
        categoria_negocio: true,
        cidade: true,
        aberta: true,
        forcar_status: true,
        horarios_semana: true,
        horario_abertura: true,
        horario_fechamento: true,
        taxa_entrega: true,
        tempo_entrega: true,
        cupons: {
          where: {
            ativo: true,
            data_inicio: { lte: agora },
            data_fim: { gte: agora },
          },
          select: {
            codigo: true,
            tipo_desconto: true,
            valor_desconto: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        avaliacoes: { select: { nota: true } },
      },
    });

    return lojas.map((loja) => {
      const notas = loja.avaliacoes || [];
      const media = notas.length > 0
        ? Math.round((notas.reduce((s, a) => s + a.nota, 0) / notas.length) * 10) / 10
        : 0;
      const cupomAtivo = Array.isArray(loja.cupons) && loja.cupons.length > 0 ? loja.cupons[0] : null;
      const { avaliacoes, cupons, ...rest } = loja;
      return {
        ...rest,
        cupom_ativo: cupomAtivo
          ? {
              codigo: cupomAtivo.codigo,
              tipo_desconto: cupomAtivo.tipo_desconto,
              valor_desconto: Number(cupomAtivo.valor_desconto || 0),
            }
          : null,
        nota_media: media,
        total_avaliacoes: notas.length,
      };
    });
  }, 60);
}

async function buscarPorId(id) {
  return prisma.lojas.findUnique({
    where: { id },
    include: { _count: { select: { produtos: true, pedidos: true } } },
  });
}

async function buscarPorUsuario(lojaId) {
  return prisma.lojas.findUnique({
    where: { id: lojaId },
    include: { _count: { select: { produtos: true, pedidos: true } } },
  });
}

async function buscarPorSlug(slug) {
  const loja = await prisma.lojas.findFirst({
    where: { slug, ativa: true },
    include: { _count: { select: { produtos: true } } },
  });
  if (loja) {
    try { loja.horarios_semana_parsed = JSON.parse(loja.horarios_semana || '[]'); } catch { loja.horarios_semana_parsed = []; }
  }
  return loja;
}

async function criar(data, firebaseDecoded, bodyAdmin = {}) {
  const payload = { ...data };
  if (payload.vencimento) payload.vencimento = new Date(payload.vencimento);
  const loja = await prisma.lojas.create({ data: payload });
  if (firebaseDecoded) {
    try {
      await prisma.usuarios.create({
        data: {
          loja_id: loja.id,
          nome: firebaseDecoded.name || bodyAdmin.nome_admin || 'Admin',
          email: firebaseDecoded.email || bodyAdmin.email_admin || '',
          firebase_uid: firebaseDecoded.uid,
          role: 'ADMIN',
        },
      });
    } catch (err) {
      // Loja já criada; usuário pode ser vinculado depois
    }
  }
  await invalidarCache('lojas:*');
  return loja;
}

async function atualizar(id, data) {
  const payload = { ...data };
  // Camada extra de proteção para não apagar mídia por envio acidental de string vazia.
  if (Object.prototype.hasOwnProperty.call(payload, 'logo_url') && !String(payload.logo_url || '').trim()) {
    delete payload.logo_url;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'banner_url') && !String(payload.banner_url || '').trim()) {
    delete payload.banner_url;
  }
  if (payload.vencimento) payload.vencimento = new Date(payload.vencimento);
  const loja = await prisma.lojas.update({ where: { id }, data: payload });
  await invalidarCache('lojas:*');
  return loja;
}

async function excluir(id) {
  const loja = await prisma.lojas.delete({ where: { id } });
  await invalidarCache('lojas:*');
  return loja;
}

module.exports = {
  listar,
  listarAtivas,
  listarAtivasHome,
  buscarPorId,
  buscarPorSlug,
  buscarPorUsuario,
  criar,
  atualizar,
  excluir,
  toggleAberta,
  desativarForcamento,
  calcularAbertaAgora,
  adicionarAbertaAgora,
  adicionarAbertaAgoraLista,
};

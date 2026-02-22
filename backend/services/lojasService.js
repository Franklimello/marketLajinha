const { prisma } = require('../config/database');
const { cacheOuBuscar, invalidarCache } = require('../config/redis');

/**
 * Verifica se a loja está aberta agora com base nos horários configurados.
 * Se forcar_status=true, usa o campo `aberta` diretamente (controle manual).
 * Se horarios estão definidos, calcula pelo relógio.
 * Se não tem horários, usa o campo `aberta`.
 */
function calcularAbertaAgora(loja) {
  if (loja.forcar_status) return loja.aberta;

  const ab = loja.horario_abertura;
  const fe = loja.horario_fechamento;
  if (!ab || !fe) return loja.aberta;

  const agora = new Date();
  const horaAtual = agora.getHours() * 60 + agora.getMinutes();

  const [hAb, mAb] = ab.split(':').map(Number);
  const [hFe, mFe] = fe.split(':').map(Number);
  const minAb = hAb * 60 + (mAb || 0);
  const minFe = hFe * 60 + (mFe || 0);

  if (minFe > minAb) {
    return horaAtual >= minAb && horaAtual < minFe;
  }
  // Caso cruza meia-noite (ex: 20:00 às 02:00)
  return horaAtual >= minAb || horaAtual < minFe;
}

function adicionarAbertaAgora(loja) {
  if (!loja) return loja;
  return { ...loja, aberta_agora: calcularAbertaAgora(loja) };
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
  if (categoria_negocio) where.categoria_negocio = categoria_negocio;
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
  return prisma.lojas.findFirst({
    where: { slug, ativa: true },
    include: { _count: { select: { produtos: true } } },
  });
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

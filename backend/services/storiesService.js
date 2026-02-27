const { prisma } = require('../config/database');

const STORY_TTL_HOURS = 24;
const MAX_STORIES_ATIVAS = 5;

function getExpiresAt(baseDate = new Date()) {
  return new Date(baseDate.getTime() + STORY_TTL_HOURS * 60 * 60 * 1000);
}

async function contarAtivasPorLoja(lojaId) {
  return prisma.lojaStory.count({
    where: {
      restaurant_id: lojaId,
      is_active: true,
      expires_at: { gt: new Date() },
    },
  });
}

async function criarStory(lojaId, data) {
  const ativas = await contarAtivasPorLoja(lojaId);
  if (ativas >= MAX_STORIES_ATIVAS) {
    const err = new Error('Limite de 5 stories ativos atingido para esta loja.');
    err.status = 400;
    throw err;
  }

  return prisma.lojaStory.create({
    data: {
      restaurant_id: lojaId,
      image_url: data.image_url,
      media_type: 'image',
      link_url: data.link_url || null,
      coupon_code: data.coupon_code || null,
      is_sponsored: !!data.is_sponsored,
      expires_at: getExpiresAt(),
      is_active: true,
    },
  });
}

async function listarAtivosAgrupados() {
  const now = new Date();
  const stories = await prisma.lojaStory.findMany({
    where: {
      is_active: true,
      expires_at: { gt: now },
    },
    include: {
      restaurant: {
        select: {
          id: true,
          nome: true,
          logo_url: true,
          slug: true,
          ativa: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const grouped = new Map();
  for (const story of stories) {
    if (!story.restaurant?.ativa) continue;
    const key = story.restaurant_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        restaurant_id: story.restaurant.id,
        restaurant_name: story.restaurant.nome,
        restaurant_logo: story.restaurant.logo_url,
        restaurant_slug: story.restaurant.slug,
        stories: [],
      });
    }

    grouped.get(key).stories.push({
      id: story.id,
      image_url: story.image_url,
      media_type: story.media_type,
      link_url: story.link_url,
      coupon_code: story.coupon_code,
      is_sponsored: story.is_sponsored,
      created_at: story.created_at,
      expires_at: story.expires_at,
    });
  }

  return Array.from(grouped.values());
}

async function listarAtivosDaLoja(lojaId) {
  return prisma.lojaStory.findMany({
    where: {
      restaurant_id: lojaId,
      is_active: true,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });
}

async function buscarPorId(id) {
  return prisma.lojaStory.findUnique({ where: { id } });
}

async function desativarStory(id) {
  return prisma.lojaStory.update({
    where: { id },
    data: { is_active: false },
  });
}

async function expirarStories() {
  const result = await prisma.lojaStory.updateMany({
    where: {
      is_active: true,
      expires_at: { lte: new Date() },
    },
    data: { is_active: false },
  });
  return result.count || 0;
}

module.exports = {
  STORY_TTL_HOURS,
  MAX_STORIES_ATIVAS,
  criarStory,
  listarAtivosAgrupados,
  listarAtivosDaLoja,
  buscarPorId,
  desativarStory,
  expirarStories,
};

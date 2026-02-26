const { prisma } = require('../config/database');

const INCLUDE_ITENS = {
  itens: {
    include: {
      produto: { select: { id: true, nome: true, preco: true, imagem_url: true, categoria: true } },
    },
  },
};

const MAX_COMBO_IMAGES = 4;

function sanitizeImageUrls(input) {
  if (!Array.isArray(input)) return [];
  const clean = input
    .map((url) => String(url || '').trim())
    .filter(Boolean);
  return [...new Set(clean)].slice(0, MAX_COMBO_IMAGES);
}

function parseImageUrls(rawJson) {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    return sanitizeImageUrls(parsed);
  } catch {
    return [];
  }
}

function getItemImageUrls(combo) {
  return sanitizeImageUrls((combo?.itens || []).map((item) => item?.produto?.imagem_url));
}

function normalizeComboImages(combo) {
  const fromJson = parseImageUrls(combo.imagens_urls_json);
  const fromLegacy = sanitizeImageUrls([combo.imagem_url]);
  const fromItems = getItemImageUrls(combo);
  const imagens_urls = fromJson.length ? fromJson : (fromLegacy.length ? fromLegacy : fromItems);
  return {
    ...combo,
    imagem_url: combo.imagem_url || imagens_urls[0] || '',
    imagens_urls,
  };
}

function buildPersistedImagesPayload(comboData, fallbackItemImages = []) {
  const requested = sanitizeImageUrls(comboData.imagens_urls);
  const imagens_urls = requested.length ? requested : sanitizeImageUrls(fallbackItemImages);
  const imagem_url = String(comboData.imagem_url || '').trim() || imagens_urls[0] || '';
  return {
    imagem_url,
    imagens_urls_json: JSON.stringify(imagens_urls),
  };
}

async function listarPorLoja(lojaId, apenasAtivos = false) {
  const where = { loja_id: lojaId };
  if (apenasAtivos) where.ativo = true;
  const combos = await prisma.combo.findMany({
    where,
    include: INCLUDE_ITENS,
    orderBy: { created_at: 'desc' },
  });
  return combos.map(normalizeComboImages);
}

async function buscarPorId(id) {
  const combo = await prisma.combo.findUnique({ where: { id }, include: INCLUDE_ITENS });
  return combo ? normalizeComboImages(combo) : null;
}

async function criar(lojaId, data) {
  const { itens, ...comboData } = data;

  return prisma.$transaction(async (tx) => {
    const itemIds = Array.isArray(itens) ? itens.map((item) => item.produto_id).filter(Boolean) : [];
    const produtos = itemIds.length
      ? await tx.produtos.findMany({
        where: { id: { in: itemIds }, loja_id: lojaId },
        select: { id: true, imagem_url: true },
      })
      : [];
    const imagensDosItens = sanitizeImageUrls(produtos.map((p) => p.imagem_url));
    const imagensPayload = buildPersistedImagesPayload(comboData, imagensDosItens);

    const combo = await tx.combo.create({
      data: {
        loja_id: lojaId,
        nome: comboData.nome,
        descricao: comboData.descricao || '',
        preco: comboData.preco,
        imagem_url: imagensPayload.imagem_url,
        imagens_urls_json: imagensPayload.imagens_urls_json,
        ativo: comboData.ativo !== undefined ? comboData.ativo : true,
      },
    });

    if (itens && itens.length > 0) {
      for (const item of itens) {
        await tx.comboItem.create({
          data: {
            combo_id: combo.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade || 1,
          },
        });
      }
    }

    const created = await tx.combo.findUnique({ where: { id: combo.id }, include: INCLUDE_ITENS });
    return normalizeComboImages(created);
  });
}

async function atualizar(id, data) {
  const { itens, ...comboData } = data;

  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (comboData.nome !== undefined) updateData.nome = comboData.nome;
    if (comboData.descricao !== undefined) updateData.descricao = comboData.descricao;
    if (comboData.preco !== undefined) updateData.preco = comboData.preco;
    if (comboData.ativo !== undefined) updateData.ativo = comboData.ativo;

    if (itens !== undefined) {
      await tx.comboItem.deleteMany({ where: { combo_id: id } });
      for (const item of itens) {
        await tx.comboItem.create({
          data: {
            combo_id: id,
            produto_id: item.produto_id,
            quantidade: item.quantidade || 1,
          },
        });
      }
    }

    const comboAtual = await tx.combo.findUnique({ where: { id }, include: INCLUDE_ITENS });
    const imagensDosItens = getItemImageUrls(comboAtual);
    if (
      comboData.imagens_urls !== undefined ||
      comboData.imagem_url !== undefined ||
      (comboAtual && !parseImageUrls(comboAtual.imagens_urls_json).length)
    ) {
      const imagensPayload = buildPersistedImagesPayload(comboData, imagensDosItens);
      updateData.imagem_url = imagensPayload.imagem_url;
      updateData.imagens_urls_json = imagensPayload.imagens_urls_json;
    }

    const atualizado = await tx.combo.update({ where: { id }, data: updateData, include: INCLUDE_ITENS });
    return normalizeComboImages(atualizado);
  });
}

async function excluir(id) {
  return prisma.combo.delete({ where: { id } });
}

module.exports = { listarPorLoja, buscarPorId, criar, atualizar, excluir };

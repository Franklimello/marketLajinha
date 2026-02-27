const storiesService = require('../services/storiesService');

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

async function criar(req, res, next) {
  try {
    const restauranteId = String(req.params.id || '');
    if (!req.user) return res.status(401).json({ erro: 'Não autorizado.' });
    if (req.user.loja_id !== restauranteId) {
      return res.status(403).json({ erro: 'Você só pode publicar stories da sua loja.' });
    }
    const imageUrl = String(req.body?.image_url || '').trim();
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return res.status(400).json({ erro: 'URL pública da imagem é obrigatória.' });
    }

    const story = await storiesService.criarStory(restauranteId, {
      image_url: imageUrl,
      link_url: req.body?.link_url || null,
      coupon_code: req.body?.coupon_code || null,
      is_sponsored: toBoolean(req.body?.is_sponsored),
    });

    return res.status(201).json(story);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function listarAtivos(req, res, next) {
  try {
    const data = await storiesService.listarAtivosAgrupados();
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function listarDaMinhaLoja(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ erro: 'Não autorizado.' });
    const data = await storiesService.listarAtivosDaLoja(req.user.loja_id);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ erro: 'Não autorizado.' });
    const story = await storiesService.buscarPorId(req.params.id);
    if (!story) return res.status(404).json({ erro: 'Story não encontrado.' });
    if (story.restaurant_id !== req.user.loja_id) {
      return res.status(403).json({ erro: 'Você só pode excluir stories da sua loja.' });
    }

    await storiesService.desativarStory(story.id);
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
}

module.exports = {
  criar,
  listarAtivos,
  listarDaMinhaLoja,
  excluir,
};

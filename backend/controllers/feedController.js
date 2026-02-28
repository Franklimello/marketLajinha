const feedService = require('../services/feedService');
const clientesService = require('../services/clientesService');

async function obterClienteAutenticado(req) {
  if (!req.firebaseDecoded?.uid) return null;
  return clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
}

async function criarPost(req, res, next) {
  try {
    if (!req.user?.loja_id) return res.status(401).json({ erro: 'Não autorizado.' });
    const post = await feedService.criarPostDaLoja(req.user.loja_id, req.body || {});
    res.status(201).json(post);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function listarPosts(req, res, next) {
  try {
    const cityId = String(req.query.city_id || '').trim();
    if (!cityId) return res.status(400).json({ erro: 'city_id é obrigatório.' });

    const cliente = await obterClienteAutenticado(req);
    const posts = await feedService.listarPostsAtivosPorCidade(cityId, cliente?.id || null);
    res.json(posts);
  } catch (e) {
    next(e);
  }
}

async function toggleLike(req, res, next) {
  try {
    const cliente = await obterClienteAutenticado(req);
    if (!cliente) return res.status(401).json({ erro: 'Faça login para curtir.' });
    const payload = await feedService.toggleLike(req.params.id, cliente.id);
    res.json(payload);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function comentar(req, res, next) {
  try {
    const cliente = await obterClienteAutenticado(req);
    if (!cliente) return res.status(401).json({ erro: 'Faça login para comentar.' });
    const payload = await feedService.comentarPost(req.params.id, cliente.id, req.body?.comment);
    res.status(201).json(payload);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function listarComentarios(req, res, next) {
  try {
    const comentarios = await feedService.listarComentarios(req.params.id);
    res.json(comentarios);
  } catch (e) {
    next(e);
  }
}

async function votar(req, res, next) {
  try {
    const cliente = await obterClienteAutenticado(req);
    if (!cliente) return res.status(401).json({ erro: 'Faça login para votar.' });
    const resultados = await feedService.votarEnquete(req.params.id, cliente.id, req.body?.option_selected);
    res.json({ vote_results: resultados });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

module.exports = {
  criarPost,
  listarPosts,
  toggleLike,
  comentar,
  listarComentarios,
  votar,
};

const promocoesService = require('../services/promocoesService');

async function listar(req, res, next) {
  try {
    const promocoes = await promocoesService.listarPorLoja(req.user.loja_id);
    res.json(promocoes);
  } catch (e) { next(e); }
}

async function listarPublico(req, res, next) {
  try {
    const promocoes = await promocoesService.listarPorLoja(req.params.lojaId, true);
    res.json(promocoes);
  } catch (e) { next(e); }
}

async function buscar(req, res, next) {
  try {
    const promocao = await promocoesService.buscarPorId(req.params.id);
    if (!promocao) return res.status(404).json({ erro: 'Promoção não encontrada.' });
    if (promocao.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Promoção de outra loja.' });
    res.json(promocao);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const promocao = await promocoesService.criar(req.user.loja_id, req.validated);
    res.status(201).json(promocao);
  } catch (e) { next(e); }
}

async function atualizar(req, res, next) {
  try {
    const existente = await promocoesService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Promoção não encontrada.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Promoção de outra loja.' });
    const promocao = await promocoesService.atualizar(req.params.id, req.validated);
    res.json(promocao);
  } catch (e) { next(e); }
}

async function excluir(req, res, next) {
  try {
    const existente = await promocoesService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Promoção não encontrada.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Promoção de outra loja.' });
    await promocoesService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listar, listarPublico, buscar, criar, atualizar, excluir };

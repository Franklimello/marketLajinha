const combosService = require('../services/combosService');

async function listar(req, res, next) {
  try {
    const combos = await combosService.listarPorLoja(req.user.loja_id);
    res.json(combos);
  } catch (e) { next(e); }
}

async function listarPublico(req, res, next) {
  try {
    const combos = await combosService.listarPorLoja(req.params.lojaId, true);
    res.json(combos);
  } catch (e) { next(e); }
}

async function buscar(req, res, next) {
  try {
    const combo = await combosService.buscarPorId(req.params.id);
    if (!combo) return res.status(404).json({ erro: 'Combo não encontrado.' });
    res.json(combo);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const { nome, descricao, preco, imagem_url, itens } = req.body;
    if (!nome || preco === undefined) return res.status(400).json({ erro: 'Nome e preço são obrigatórios.' });
    if (!itens || itens.length < 2) return res.status(400).json({ erro: 'Um combo precisa ter pelo menos 2 produtos.' });

    const combo = await combosService.criar(req.user.loja_id, { nome, descricao, preco, imagem_url, itens });
    res.status(201).json(combo);
  } catch (e) { next(e); }
}

async function atualizar(req, res, next) {
  try {
    const existente = await combosService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Combo não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Combo de outra loja.' });

    const combo = await combosService.atualizar(req.params.id, req.body);
    res.json(combo);
  } catch (e) { next(e); }
}

async function excluir(req, res, next) {
  try {
    const existente = await combosService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Combo não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Combo de outra loja.' });

    await combosService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

module.exports = { listar, listarPublico, buscar, criar, atualizar, excluir };

const cuponsService = require('../services/cuponsService');

async function listar(req, res, next) {
  try {
    const cupons = await cuponsService.listarPorLoja(req.user.loja_id);
    res.json(cupons);
  } catch (e) { next(e); }
}

async function buscarPorId(req, res, next) {
  try {
    const cupom = await cuponsService.buscarPorId(req.params.id);
    if (!cupom) return res.status(404).json({ erro: 'Cupom não encontrado.' });
    if (cupom.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Cupom de outra loja.' });
    res.json(cupom);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const cupom = await cuponsService.criar(req.user.loja_id, req.validated);
    res.status(201).json(cupom);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Já existe um cupom com esse código nesta loja.' });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const existente = await cuponsService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Cupom não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Cupom de outra loja.' });
    const cupom = await cuponsService.atualizar(req.params.id, req.validated);
    res.json(cupom);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Já existe um cupom com esse código nesta loja.' });
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const existente = await cuponsService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Cupom não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Cupom de outra loja.' });
    await cuponsService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function aplicar(req, res, next) {
  try {
    const { loja_id, codigo_cupom, subtotal } = req.validated;
    let clienteId = null;
    if (req.clienteId) clienteId = req.clienteId;

    const resultado = await cuponsService.validarCupom(loja_id, codigo_cupom, subtotal, clienteId);
    res.json({
      subtotal: resultado.subtotal,
      desconto: resultado.desconto,
      total_final: resultado.total_final,
      cupom_id: resultado.cupom_id,
      tipo_desconto: resultado.cupom.tipo_desconto,
      valor_desconto: Number(resultado.cupom.valor_desconto),
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir, aplicar };

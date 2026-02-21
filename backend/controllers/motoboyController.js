const motoboyService = require('../services/motoboyService');
const { notificarCliente } = require('../services/notificacaoService');

async function listar(req, res, next) {
  try {
    const motoboys = await motoboyService.listarPorLoja(req.user.loja_id);
    res.json(motoboys);
  } catch (e) { next(e); }
}

async function buscarPorId(req, res, next) {
  try {
    const m = await motoboyService.buscarPorId(req.params.id);
    if (!m) return res.status(404).json({ erro: 'Motoboy não encontrado.' });
    if (m.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Motoboy de outra loja.' });
    res.json(m);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
    }
    if (senha.length < 4) {
      return res.status(400).json({ erro: 'Senha deve ter no mínimo 4 caracteres.' });
    }
    const m = await motoboyService.criar(req.user.loja_id, { nome, email, senha });
    res.status(201).json(m);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Já existe um motoboy com esse email nesta loja.' });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const existente = await motoboyService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Motoboy não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Motoboy de outra loja.' });
    const m = await motoboyService.atualizar(req.params.id, req.body);
    res.json(m);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Email já usado por outro motoboy.' });
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const existente = await motoboyService.buscarPorId(req.params.id);
    if (!existente) return res.status(404).json({ erro: 'Motoboy não encontrado.' });
    if (existente.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Motoboy de outra loja.' });
    await motoboyService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    const resultado = await motoboyService.login(email, senha);
    res.json(resultado);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function meusPedidos(req, res, next) {
  try {
    const pedidos = await motoboyService.listarPedidos(req.motoboy.lojaId);
    res.json(pedidos);
  } catch (e) { next(e); }
}

async function atualizarStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ erro: 'Status é obrigatório.' });

    const pedido = await motoboyService.atualizarStatusPedido(
      req.params.id, req.motoboy.lojaId, status
    );

    if (pedido.cliente_id) {
      notificarCliente(pedido.cliente_id, status, pedido.id, '').catch(() => {});
    }

    res.json(pedido);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir, login, meusPedidos, atualizarStatus };

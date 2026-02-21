const usuariosService = require('../services/usuariosService');

async function listar(req, res, next) {
  try {
    const usuarios = await usuariosService.listarPorLoja(req.user.loja_id);
    res.json(usuarios);
  } catch (e) {
    next(e);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const usuario = await usuariosService.buscarPorId(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    if (usuario.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Usuário de outra loja.' });
    res.json(usuario);
  } catch (e) {
    next(e);
  }
}

async function criar(req, res, next) {
  try {
    if (req.validated.loja_id !== req.user.loja_id) {
      return res.status(403).json({ erro: 'Só é possível criar usuários da sua loja.' });
    }
    const usuario = await usuariosService.criar(req.validated);
    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      loja_id: usuario.loja_id,
    });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Email ou firebase_uid já cadastrado.' });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const usuario = await usuariosService.buscarPorId(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    if (usuario.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Usuário de outra loja.' });
    const atualizado = await usuariosService.atualizar(req.params.id, req.validated);
    res.json(atualizado);
  } catch (e) {
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const usuario = await usuariosService.buscarPorId(req.params.id);
    if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    if (usuario.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Usuário de outra loja.' });
    await usuariosService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  excluir,
};

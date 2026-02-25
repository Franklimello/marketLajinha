const produtosService = require('../services/produtosService');

async function listar(req, res, next) {
  try {
    const { loja_id, pagina, ativo, categoria, limite } = req.query;
    const resultado = await produtosService.listar({ loja_id, ativo, categoria }, pagina, limite);
    res.json(resultado);
  } catch (e) {
    next(e);
  }
}

async function listarPorLoja(req, res, next) {
  try {
    const { lojaId } = req.params;
    const { pagina = '1' } = req.query;
    const resultado = await produtosService.listarPorLoja(lojaId, pagina);
    if (!resultado.loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    res.json(resultado);
  } catch (e) {
    next(e);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const produto = await produtosService.buscarPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(produto);
  } catch (e) {
    next(e);
  }
}

async function criar(req, res, next) {
  try {
    if (req.user.loja_id !== req.validated.loja_id) {
      return res.status(403).json({ erro: 'Você só pode criar produtos da sua loja.' });
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
      return res.status(403).json({ erro: 'Sem permissão para criar produto.' });
    }
    const produto = await produtosService.criar(req.validated);
    res.status(201).json(produto);
  } catch (e) {
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const produto = await produtosService.buscarPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    if (produto.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Produto de outra loja.' });
    const atualizado = await produtosService.atualizar(req.params.id, req.validated);
    res.json(atualizado);
  } catch (e) {
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const produto = await produtosService.buscarPorId(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
    if (produto.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Produto de outra loja.' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ erro: 'Apenas administradores podem excluir produtos.' });
    await produtosService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listar,
  listarPorLoja,
  buscarPorId,
  criar,
  atualizar,
  excluir,
};

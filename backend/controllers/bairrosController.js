const bairrosService = require('../services/bairrosService');

async function listar(req, res, next) {
  try {
    const loja_id = req.params.lojaId;
    const incluirInativos = String(req.query?.incluir_inativos || '').toLowerCase() === 'true';
    const bairros = await bairrosService.listarPorLoja(loja_id, { incluirInativos });
    res.json(bairros);
  } catch (e) {
    next(e);
  }
}

async function criar(req, res, next) {
  try {
    const loja_id = req.params.lojaId;
    if (req.user.loja_id !== loja_id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { nome, taxa } = req.body;
    if (!nome || taxa === undefined) {
      return res.status(400).json({ erro: 'Nome e taxa são obrigatórios.' });
    }
    const bairro = await bairrosService.criar(loja_id, nome.trim(), Number(taxa), req.user.id);
    res.status(201).json(bairro);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ erro: e.message });
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Bairro já cadastrado nesta loja.' });
    next(e);
  }
}

async function criarVarios(req, res, next) {
  try {
    const loja_id = req.params.lojaId;
    if (req.user.loja_id !== loja_id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const { bairros } = req.body;
    if (!Array.isArray(bairros) || bairros.length === 0) {
      return res.status(400).json({ erro: 'Envie um array de bairros com nome e taxa.' });
    }
    const resultado = await bairrosService.criarVarios(loja_id, bairros, req.user.id);
    res.status(201).json(resultado);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ erro: e.message });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const bairro = await bairrosService.buscarPorId(req.params.id);
    if (!bairro) return res.status(404).json({ erro: 'Bairro não encontrado.' });
    if (bairro.loja_id !== req.user.loja_id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const data = {};
    if (req.body.nome !== undefined) data.nome = req.body.nome.trim();
    if (req.body.taxa !== undefined) data.taxa = Number(req.body.taxa);
    const atualizado = await bairrosService.atualizar(req.params.id, data);
    if (!atualizado) return res.status(404).json({ erro: 'Bairro não encontrado.' });
    res.json(atualizado);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ erro: e.message });
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Bairro já cadastrado nesta loja.' });
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const bairro = await bairrosService.buscarPorId(req.params.id);
    if (!bairro) return res.status(404).json({ erro: 'Bairro não encontrado.' });
    if (bairro.loja_id !== req.user.loja_id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    await bairrosService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

async function alterarAtivo(req, res, next) {
  try {
    const bairro = await bairrosService.buscarPorId(req.params.id);
    if (!bairro) return res.status(404).json({ erro: 'Bairro não encontrado.' });
    if (bairro.loja_id !== req.user.loja_id) {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    const ativo = req.body?.ativo;
    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ erro: 'Campo "ativo" deve ser booleano.' });
    }
    const atualizado = await bairrosService.definirAtivo(req.params.id, ativo);
    res.json(atualizado);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listar,
  criar,
  criarVarios,
  atualizar,
  excluir,
  alterarAtivo,
};

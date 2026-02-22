const avaliacoesService = require('../services/avaliacoesService');
const { prisma } = require('../config/database');

async function criar(req, res, next) {
  try {
    if (!req.firebaseDecoded) {
      return res.status(401).json({ erro: 'Faça login para avaliar.' });
    }

    const cliente = await prisma.clientes.findUnique({
      where: { firebase_uid: req.firebaseDecoded.uid },
      select: { id: true },
    });

    if (!cliente) {
      return res.status(401).json({ erro: 'Cliente não encontrado. Faça o cadastro.' });
    }

    const avaliacao = await avaliacoesService.criar(cliente.id, req.validated);
    res.status(201).json(avaliacao);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function listarPorLoja(req, res, next) {
  try {
    const { pagina } = req.query;
    const result = await avaliacoesService.listarPorLoja(req.params.lojaId, pagina);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function mediaPorLoja(req, res, next) {
  try {
    const media = await avaliacoesService.mediaPorLoja(req.params.lojaId);
    res.json(media);
  } catch (e) {
    next(e);
  }
}

module.exports = { criar, listarPorLoja, mediaPorLoja };

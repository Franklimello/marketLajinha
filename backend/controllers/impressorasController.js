const impressorasService = require('../services/impressorasService');
const { imprimirPedidoPorSetor, buscarFilaPendente, marcarImpresso, marcarErro, reenviar, gerarTokenImpressao, validarTokenImpressao } = require('../services/impressaoService');
const { buildTicket } = require('../utils/escpos');
const { prisma } = require('../config/database');

async function listar(req, res, next) {
  try {
    const impressoras = await impressorasService.listarPorLoja(req.user.loja_id);
    res.json(impressoras);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const { setor, nome, ip, porta, largura } = req.body;
    if (!setor || !ip) return res.status(400).json({ erro: 'Setor e IP são obrigatórios.' });
    const impressora = await impressorasService.criar({
      loja_id: req.user.loja_id,
      setor: setor.toUpperCase().trim(),
      nome: nome || '',
      ip: ip.trim(),
      porta: porta || 9100,
      largura: largura || 80,
    });
    res.status(201).json(impressora);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Já existe uma impressora para este setor.' });
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const imp = await impressorasService.buscarPorId(req.params.id);
    if (!imp) return res.status(404).json({ erro: 'Impressora não encontrada.' });
    if (imp.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Impressora de outra loja.' });

    const { setor, nome, ip, porta, ativa, largura } = req.body;
    const data = {};
    if (setor !== undefined) data.setor = setor.toUpperCase().trim();
    if (nome !== undefined) data.nome = nome;
    if (ip !== undefined) data.ip = ip.trim();
    if (porta !== undefined) data.porta = porta;
    if (ativa !== undefined) data.ativa = ativa;
    if (largura !== undefined) data.largura = largura;

    const atualizada = await impressorasService.atualizar(req.params.id, data);
    res.json(atualizada);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ erro: 'Já existe uma impressora para este setor.' });
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const imp = await impressorasService.buscarPorId(req.params.id);
    if (!imp) return res.status(404).json({ erro: 'Impressora não encontrada.' });
    if (imp.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Impressora de outra loja.' });
    await impressorasService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

async function testar(req, res, next) {
  try {
    const imp = await impressorasService.buscarPorId(req.params.id);
    if (!imp) return res.status(404).json({ erro: 'Impressora não encontrada.' });
    if (imp.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Impressora de outra loja.' });

    const ticket = buildTicket(
      { id: 'TESTE123', nome_cliente: 'TESTE', endereco: '', bairro: '', telefone_cliente: '', observacao: '', forma_pagamento: 'CASH', total: 0, taxa_entrega: 0, desconto: 0, created_at: new Date() },
      [{ quantidade: 1, preco_unitario: 0, produto: { nome: 'Produto de Teste' }, variacao_nome: '', adicionais_json: '[]' }],
      imp.setor,
      imp.largura || 80,
    );

    await prisma.filaImpressao.create({
      data: {
        loja_id: req.user.loja_id,
        pedido_id: 'TESTE',
        setor: imp.setor,
        impressora_ip: imp.ip,
        impressora_porta: imp.porta,
        largura: imp.largura || 80,
        conteudo: ticket,
      },
    });

    res.json({ mensagem: `Teste enfileirado para ${imp.ip}:${imp.porta}. O agente local irá imprimir.` });
  } catch (e) {
    res.status(500).json({ erro: `Falha: ${e.message}` });
  }
}

async function imprimirPedido(req, res, next) {
  try {
    const resultado = await imprimirPedidoPorSetor(req.params.pedidoId);
    res.json(resultado);
  } catch (e) { next(e); }
}

async function gerarToken(req, res, next) {
  try {
    const token = await gerarTokenImpressao(req.user.loja_id);
    res.json({ token_impressao: token });
  } catch (e) { next(e); }
}

async function obterToken(req, res, next) {
  try {
    const loja = await prisma.lojas.findUnique({
      where: { id: req.user.loja_id },
      select: { token_impressao: true },
    });
    res.json({ token_impressao: loja?.token_impressao || '' });
  } catch (e) { next(e); }
}

async function filaAgente(req, res, next) {
  try {
    const token = req.headers['x-print-token'];
    if (!token) return res.status(401).json({ erro: 'Token de impressão obrigatório.' });
    const loja = await validarTokenImpressao(token);
    if (!loja) return res.status(401).json({ erro: 'Token de impressão inválido.' });
    const jobs = await buscarFilaPendente(loja.id);
    res.json(jobs);
  } catch (e) { next(e); }
}

async function filaMarcarImpresso(req, res, next) {
  try {
    const token = req.headers['x-print-token'];
    if (!token) return res.status(401).json({ erro: 'Token obrigatório.' });
    const loja = await validarTokenImpressao(token);
    if (!loja) return res.status(401).json({ erro: 'Token inválido.' });
    const result = await marcarImpresso(req.params.id, loja.id);
    if (!result) return res.status(404).json({ erro: 'Job não encontrado.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function filaMarcarErro(req, res, next) {
  try {
    const token = req.headers['x-print-token'];
    if (!token) return res.status(401).json({ erro: 'Token obrigatório.' });
    const loja = await validarTokenImpressao(token);
    if (!loja) return res.status(401).json({ erro: 'Token inválido.' });
    const result = await marcarErro(req.params.id, loja.id, req.body.erro || 'Erro desconhecido');
    if (!result) return res.status(404).json({ erro: 'Job não encontrado.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function filaReenviar(req, res, next) {
  try {
    const result = await reenviar(req.params.id, req.user.loja_id);
    if (!result) return res.status(404).json({ erro: 'Job não encontrado.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = {
  listar, criar, atualizar, excluir, testar, imprimirPedido,
  gerarToken, obterToken,
  filaAgente, filaMarcarImpresso, filaMarcarErro, filaReenviar,
};

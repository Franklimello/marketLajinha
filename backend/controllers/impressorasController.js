const impressorasService = require('../services/impressorasService');
const { imprimirPedidoPorSetor } = require('../services/impressaoService');

async function listar(req, res, next) {
  try {
    const impressoras = await impressorasService.listarPorLoja(req.user.loja_id);
    res.json(impressoras);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const { setor, nome, ip, porta } = req.body;
    if (!setor || !ip) return res.status(400).json({ erro: 'Setor e IP são obrigatórios.' });
    const impressora = await impressorasService.criar({
      loja_id: req.user.loja_id,
      setor: setor.toUpperCase().trim(),
      nome: nome || '',
      ip: ip.trim(),
      porta: porta || 9100,
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

    const { setor, nome, ip, porta, ativa } = req.body;
    const data = {};
    if (setor !== undefined) data.setor = setor.toUpperCase().trim();
    if (nome !== undefined) data.nome = nome;
    if (ip !== undefined) data.ip = ip.trim();
    if (porta !== undefined) data.porta = porta;
    if (ativa !== undefined) data.ativa = ativa;

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

    const { buildTicket, enviarParaImpressora } = require('../utils/escpos');
    const ticket = buildTicket(
      { id: 'TESTE123', nome_cliente: 'TESTE', endereco: '', telefone_cliente: '', observacao: '' },
      [{ quantidade: 1, produto: { nome: 'Produto de Teste' }, variacao_nome: '', adicionais_json: '[]' }],
      imp.setor
    );

    await enviarParaImpressora(imp.ip, imp.porta, ticket);
    res.json({ mensagem: `Teste enviado para ${imp.ip}:${imp.porta}` });
  } catch (e) {
    res.status(500).json({ erro: `Falha ao imprimir: ${e.message}` });
  }
}

async function imprimirPedido(req, res, next) {
  try {
    const resultado = await imprimirPedidoPorSetor(req.params.pedidoId);
    res.json(resultado);
  } catch (e) { next(e); }
}

module.exports = { listar, criar, atualizar, excluir, testar, imprimirPedido };

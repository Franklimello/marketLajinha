const impressorasService = require('../services/impressorasService');
const { imprimirPedidoPorSetor, buscarFilaPendente, marcarImpresso, marcarErro, reenviar, gerarTokenImpressao, validarTokenImpressao } = require('../services/impressaoService');
const { buildTicket } = require('../utils/escpos');
const { prisma } = require('../config/database');
const { getIO } = require('../config/socket');

async function emitirResumoOrdemImpressao(lojaId, pedidoId) {
  if (!lojaId || !pedidoId) return;
  const [pendentes, erros] = await Promise.all([
    prisma.filaImpressao.count({ where: { loja_id: lojaId, pedido_id: pedidoId, status: 'PENDING' } }),
    prisma.filaImpressao.count({ where: { loja_id: lojaId, pedido_id: pedidoId, status: 'ERROR' } }),
  ]);
  const io = getIO();
  if (erros > 0) {
    io?.to(`store_${lojaId}`).emit('order_status', { orderId: pedidoId, status: 'error' });
    return;
  }
  if (pendentes === 0) {
    io?.to(`store_${lojaId}`).emit('order_status', { orderId: pedidoId, status: 'printed' });
  }
}

async function listar(req, res, next) {
  try {
    const impressoras = await impressorasService.listarPorLoja(req.user.loja_id);
    res.json(impressoras);
  } catch (e) { next(e); }
}

async function criar(req, res, next) {
  try {
    const { setor, nome, type, ip, porta, largura, usb_identifier } = req.body;
    const tipo = String(type || 'ip').toUpperCase() === 'USB' ? 'USB' : 'IP';
    if (!setor) return res.status(400).json({ erro: 'Setor é obrigatório.' });
    if (tipo === 'IP' && !String(ip || '').trim()) {
      return res.status(400).json({ erro: 'IP é obrigatório para impressora do tipo IP.' });
    }
    const impressora = await impressorasService.criar({
      loja_id: req.user.loja_id,
      setor: setor.toUpperCase().trim(),
      nome: nome || '',
      type: tipo,
      ip: tipo === 'IP' ? String(ip || '').trim() : '',
      porta: tipo === 'IP' ? (porta || 9100) : null,
      usb_identifier: tipo === 'USB' ? String(usb_identifier || '').trim() : null,
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

    const { setor, nome, ip, porta, ativa, largura, type, usb_identifier } = req.body;
    const data = {};
    if (setor !== undefined) data.setor = setor.toUpperCase().trim();
    if (nome !== undefined) data.nome = nome;
    if (type !== undefined) data.type = String(type).toUpperCase() === 'USB' ? 'USB' : 'IP';
    if (ip !== undefined) data.ip = String(ip || '').trim();
    if (porta !== undefined) data.porta = porta === null ? null : Number(porta || 9100);
    if (usb_identifier !== undefined) data.usb_identifier = String(usb_identifier || '').trim() || null;
    if (ativa !== undefined) data.ativa = ativa;
    if (largura !== undefined) data.largura = largura;

    const typeFinal = String(data.type || imp.type || 'IP').toUpperCase() === 'USB' ? 'USB' : 'IP';
    if (typeFinal === 'IP') {
      const ipFinal = String(data.ip !== undefined ? data.ip : (imp.ip || '')).trim();
      if (!ipFinal) {
        return res.status(400).json({ erro: 'IP é obrigatório para impressora do tipo IP.' });
      }
      if (data.porta === undefined || data.porta === null) data.porta = imp.porta || 9100;
      data.usb_identifier = null;
    } else {
      data.ip = '';
      data.porta = null;
    }

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
        impressora_tipo: String(imp.type || 'IP').toUpperCase() === 'USB' ? 'USB' : 'IP',
        impressora_ip: String(imp.ip || ''),
        impressora_porta: Number(imp.porta || 9100),
        impressora_usb_identifier: String(imp.usb_identifier || ''),
        largura: imp.largura || 80,
        conteudo: ticket,
      },
    });

    const alvo = String(imp.type || 'IP').toUpperCase() === 'USB'
      ? `USB:${imp.usb_identifier || imp.nome || imp.setor}`
      : `${imp.ip}:${imp.porta}`;
    res.json({ mensagem: `Teste enfileirado para ${alvo}. O agente local irá imprimir.` });
  } catch (e) {
    res.status(500).json({ erro: `Falha: ${e.message}` });
  }
}

async function imprimirPedido(req, res, next) {
  try {
    const pedido = await prisma.pedidos.findUnique({
      where: { id: req.params.pedidoId },
      select: { loja_id: true },
    });
    if (pedido?.loja_id) {
      getIO()?.to(`store_${pedido.loja_id}`).emit('order_status', {
        orderId: req.params.pedidoId,
        status: 'printing',
        createdAt: new Date().toISOString(),
      });
    }
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

async function listarAgente(req, res, next) {
  try {
    const token = req.headers['x-print-token'];
    if (!token) return res.status(401).json({ erro: 'Token de impressão obrigatório.' });
    const loja = await validarTokenImpressao(token);
    if (!loja) return res.status(401).json({ erro: 'Token de impressão inválido.' });

    const impressoras = await impressorasService.listarPorLoja(loja.id);
    res.json((impressoras || []).map((imp) => ({
      id: imp.id,
      name: imp.nome || imp.setor,
      sector: imp.setor,
      type: String(imp?.type || 'IP').toUpperCase() === 'USB' ? 'usb' : 'ip',
      ip_address: String(imp?.ip || ''),
      port: imp?.porta === null || imp?.porta === undefined ? null : Number(imp.porta),
      usb_identifier: String(imp?.usb_identifier || ''),
      paper_width: Number(imp?.largura || 80),
      is_active: Boolean(imp?.ativa),
    })));
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
    const io = getIO();
    io?.to(`store_${loja.id}`).emit('print_job:status', {
      jobId: result.id,
      orderId: result.pedido_id,
      sector: result.setor,
      status: 'printed',
      printedAt: result.printed_at,
    });
    await emitirResumoOrdemImpressao(loja.id, result.pedido_id);
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
    const io = getIO();
    io?.to(`store_${loja.id}`).emit('print_job:status', {
      jobId: result.id,
      orderId: result.pedido_id,
      sector: result.setor,
      status: 'error',
      error: result.erro,
      attempts: result.tentativas,
    });
    await emitirResumoOrdemImpressao(loja.id, result.pedido_id);
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
  listarAgente,
  filaAgente, filaMarcarImpresso, filaMarcarErro, filaReenviar,
};

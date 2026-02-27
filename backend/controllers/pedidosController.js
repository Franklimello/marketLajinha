const pedidosService = require('../services/pedidosService');
const clientesService = require('../services/clientesService');
const { statusPedidoEnum, formaPagamentoEnum } = require('../schemas/pedidosSchema');
const { imprimirPedidoPorSetor } = require('../services/impressaoService');
const { notificarCliente, notificarLoja } = require('../services/notificacaoService');
const { emitNovoPedido, emitStatusPedido } = require('../config/socket');

async function listar(req, res, next) {
  try {
    const { pagina, limite, include_finalizados, status } = req.query;
    const resultado = await pedidosService.listarPorLoja(req.user.loja_id, pagina, limite, {
      include_finalizados,
      status,
    });
    res.json(resultado);
  } catch (e) {
    next(e);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const pedido = await pedidosService.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Pedido de outra loja.' });
    res.json(pedido);
  } catch (e) {
    next(e);
  }
}

async function meusPedidos(req, res, next) {
  try {
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Faça login para ver seus pedidos.' });
    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.json([]);
    const pedidos = await pedidosService.listarPorCliente(cliente.id);
    res.json(pedidos);
  } catch (e) { next(e) }
}

async function criar(req, res, next) {
  try {
    const loja = await pedidosService.getLoja(req.validated.loja_id);
    if (!loja) return res.status(404).json({ erro: 'Loja não encontrada.' });
    if (!loja.ativa) return res.status(400).json({ erro: 'Loja não está ativa para pedidos.' });

    const dados = { ...req.validated };
    if (req.firebaseDecoded) {
      const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
      if (cliente) {
        dados.cliente_id = cliente.id;
        if (!dados.nome_cliente) dados.nome_cliente = cliente.nome;
        if (!dados.telefone_cliente) dados.telefone_cliente = cliente.telefone;
      }
    }

    const pedido = await pedidosService.criar(dados);

    emitNovoPedido(dados.loja_id, pedido);

    imprimirPedidoPorSetor(pedido.id).catch((err) => {
      console.error(`[Impressão Auto] Falha ao imprimir pedido ${pedido.id}:`, err.message);
    });

    const qtdItens = dados.itens?.length || 0;
    notificarLoja(
      dados.loja_id,
      'Novo pedido!',
      `${dados.nome_cliente || 'Cliente'} fez um pedido com ${qtdItens} item(ns).`,
      { pedidoId: pedido.id, url: '/pedidos' }
    ).catch((err) => console.error('[Notificação Loja] Falha:', err.message));

    res.status(201).json(pedido);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ erro: e.message });
    next(e);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const pedido = await pedidosService.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Pedido de outra loja.' });
    const atualizado = await pedidosService.atualizarStatus(req.params.id, req.validated.status);

    emitStatusPedido(pedido.loja_id, pedido.cliente_id, atualizado);

    if (pedido.cliente_id) {
      const nomeLoja = pedido.loja?.nome || '';
      notificarCliente(pedido.cliente_id, req.validated.status, pedido.id, nomeLoja).catch((err) => {
        console.error(`[Notificação] Falha:`, err.message);
      });
    }

    res.json(atualizado);
  } catch (e) {
    next(e);
  }
}

async function atualizar(req, res, next) {
  try {
    const pedido = await pedidosService.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Pedido de outra loja.' });
    const body = req.body || {};
    const data = {};
    if (body.status !== undefined) data.status = statusPedidoEnum.parse(body.status);
    if (body.nome_cliente !== undefined) data.nome_cliente = body.nome_cliente;
    if (body.telefone_cliente !== undefined) data.telefone_cliente = body.telefone_cliente;
    if (body.endereco !== undefined) data.endereco = body.endereco;
    if (body.forma_pagamento !== undefined) data.forma_pagamento = formaPagamentoEnum.parse(body.forma_pagamento);
    if (body.observacao !== undefined) data.observacao = body.observacao;
    const atualizado = await pedidosService.atualizar(req.params.id, data);
    res.json(atualizado);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ erro: 'Validação falhou.', detalhes: e.errors });
    next(e);
  }
}

async function excluir(req, res, next) {
  try {
    const pedido = await pedidosService.buscarPorId(req.params.id);
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.loja_id !== req.user.loja_id) return res.status(403).json({ erro: 'Pedido de outra loja.' });
    await pedidosService.excluir(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listar,
  meusPedidos,
  buscarPorId,
  criar,
  atualizarStatus,
  atualizar,
  excluir,
};

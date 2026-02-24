const chatService = require('../services/chatService');
const { prisma } = require('../config/database');
const clientesService = require('../services/clientesService');
const { getIO } = require('../config/socket');

async function listarMensagens(req, res, next) {
  try {
    const { pedidoId } = req.params;
    const pedido = await prisma.pedidos.findUnique({ where: { id: pedidoId } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    if (req.user && req.user.loja_id === pedido.loja_id) {
      const msgs = await chatService.listarMensagens(pedidoId);
      await chatService.marcarLidas(pedidoId, 'LOJA');
      return res.json(msgs);
    }

    if (req.firebaseDecoded) {
      const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
      if (cliente && pedido.cliente_id === cliente.id) {
        const msgs = await chatService.listarMensagens(pedidoId);
        await chatService.marcarLidas(pedidoId, 'CLIENTE');
        return res.json(msgs);
      }
    }

    return res.status(403).json({ erro: 'Acesso negado.' });
  } catch (e) { next(e); }
}

async function enviarMensagemLoja(req, res, next) {
  try {
    const { pedidoId } = req.params;
    const { conteudo, arquivo_url, arquivo_nome, arquivo_mime } = req.body || {};
    const texto = String(conteudo || '').trim();
    const arquivoUrl = String(arquivo_url || '').trim();
    const arquivoNome = String(arquivo_nome || '').trim();
    const arquivoMime = String(arquivo_mime || '').trim();
    if (!texto && !arquivoUrl) return res.status(400).json({ erro: 'Mensagem vazia.' });

    const pedido = await prisma.pedidos.findUnique({ where: { id: pedidoId } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (req.user.loja_id !== pedido.loja_id) return res.status(403).json({ erro: 'Acesso negado.' });

    const msg = await chatService.enviarMensagem({
      pedido_id: pedidoId,
      loja_id: pedido.loja_id,
      remetente: 'LOJA',
      conteudo: texto,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      arquivo_mime: arquivoMime,
    });

    const io = getIO();
    if (io && pedido.cliente_id) {
      io.to(`cliente:${pedido.cliente_id}`).emit('chat:nova_mensagem', msg);
    }

    res.status(201).json(msg);
  } catch (e) { next(e); }
}

async function enviarMensagemCliente(req, res, next) {
  try {
    const { pedidoId } = req.params;
    const { conteudo, arquivo_url, arquivo_nome, arquivo_mime } = req.body || {};
    const texto = String(conteudo || '').trim();
    const arquivoUrl = String(arquivo_url || '').trim();
    const arquivoNome = String(arquivo_nome || '').trim();
    const arquivoMime = String(arquivo_mime || '').trim();
    if (!texto && !arquivoUrl) return res.status(400).json({ erro: 'Mensagem vazia.' });
    if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Token obrigatório.' });

    const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
    if (!cliente) return res.status(401).json({ erro: 'Cliente não encontrado.' });

    const pedido = await prisma.pedidos.findUnique({ where: { id: pedidoId } });
    if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    if (pedido.cliente_id !== cliente.id) return res.status(403).json({ erro: 'Acesso negado.' });

    const msg = await chatService.enviarMensagem({
      pedido_id: pedidoId,
      loja_id: pedido.loja_id,
      remetente: 'CLIENTE',
      conteudo: texto,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      arquivo_mime: arquivoMime,
    });

    const io = getIO();
    if (io) {
      io.to(`loja:${pedido.loja_id}`).emit('chat:nova_mensagem', msg);
    }

    res.status(201).json(msg);
  } catch (e) { next(e); }
}

async function naoLidasLoja(req, res, next) {
  try {
    const total = await chatService.contarNaoLidas(req.user.loja_id);
    const porPedido = await chatService.pedidosComNaoLidas(req.user.loja_id);
    res.json({ total, porPedido });
  } catch (e) { next(e); }
}

module.exports = {
  listarMensagens,
  enviarMensagemLoja,
  enviarMensagemCliente,
  naoLidasLoja,
};

/**
 * Configuração do Socket.io para eventos em tempo real.
 * Salas: loja:<id> (lojistas) e cliente:<id> (clientes)
 */
const { Server } = require('socket.io');
const { validarTokenImpressao } = require('../services/impressaoService');
const { upsertHeartbeat, markOffline } = require('../services/printRuntimeService');

let io = null;

function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins === '*' ? '*' : allowedOrigins,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    socket.data = socket.data || {};

    socket.on('register:print-agent', async (payload = {}, ack) => {
      try {
        const storeId = String(payload?.storeId || '').trim();
        const token = String(payload?.token || '').trim();
        if (!storeId || !token) {
          if (typeof ack === 'function') ack({ ok: false, erro: 'storeId e token são obrigatórios.' });
          return;
        }
        const loja = await validarTokenImpressao(token);
        if (!loja || String(loja.id) !== storeId) {
          if (typeof ack === 'function') ack({ ok: false, erro: 'Token de impressão inválido para a loja.' });
          return;
        }

        socket.data.storeId = storeId;
        socket.data.printAgent = true;
        socket.join(`store_${storeId}`);
        socket.join(`loja:${storeId}`);
        upsertHeartbeat(storeId, payload?.printersOnline || []);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, erro: err.message || 'Falha ao registrar agente.' });
      }
    });

    socket.on('heartbeat', (payload = {}, ack) => {
      const storeId = String(payload?.storeId || socket.data?.storeId || '').trim();
      if (!storeId) {
        if (typeof ack === 'function') ack({ ok: false, erro: 'storeId ausente no heartbeat.' });
        return;
      }
      upsertHeartbeat(storeId, payload?.printersOnline || []);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('join:loja', (lojaId) => {
      if (lojaId) socket.join(`loja:${lojaId}`);
    });

    socket.on('join:cliente', (clienteId) => {
      if (clienteId) socket.join(`cliente:${clienteId}`);
    });

    socket.on('disconnect', () => {
      if (socket.data?.printAgent && socket.data?.storeId) {
        markOffline(socket.data.storeId);
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitNovoPedido(lojaId, pedido) {
  if (!io) return;
  io.to(`store_${lojaId}`).emit('new_order', pedido);
  io.to(`loja:${lojaId}`).emit('pedido:novo', pedido);
}

function emitStatusPedido(lojaId, clienteId, pedido) {
  if (!io) return;
  io.to(`loja:${lojaId}`).emit('pedido:atualizado', pedido);
  io.to(`store_${lojaId}`).emit('order_status', pedido);
  if (clienteId) {
    io.to(`cliente:${clienteId}`).emit('pedido:atualizado', pedido);
  }
}

module.exports = { initSocket, getIO, emitNovoPedido, emitStatusPedido };

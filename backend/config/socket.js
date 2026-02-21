/**
 * Configuração do Socket.io para eventos em tempo real.
 * Salas: loja:<id> (lojistas) e cliente:<id> (clientes)
 */
const { Server } = require('socket.io');

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
    socket.on('join:loja', (lojaId) => {
      if (lojaId) socket.join(`loja:${lojaId}`);
    });

    socket.on('join:cliente', (clienteId) => {
      if (clienteId) socket.join(`cliente:${clienteId}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

function getIO() {
  return io;
}

function emitNovoPedido(lojaId, pedido) {
  if (!io) return;
  io.to(`loja:${lojaId}`).emit('pedido:novo', pedido);
}

function emitStatusPedido(lojaId, clienteId, pedido) {
  if (!io) return;
  io.to(`loja:${lojaId}`).emit('pedido:atualizado', pedido);
  if (clienteId) {
    io.to(`cliente:${clienteId}`).emit('pedido:atualizado', pedido);
  }
}

module.exports = { initSocket, getIO, emitNovoPedido, emitStatusPedido };

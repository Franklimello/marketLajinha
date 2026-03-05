/**
 * Configuração do Socket.io para eventos em tempo real.
 * Salas: loja:<id> (lojistas) e cliente:<id> (clientes)
 */
const { Server } = require('socket.io');
const { prisma } = require('./database');
const { isFirebaseInitialized, getAuth } = require('./firebase');
const { validarTokenImpressao } = require('../services/impressaoService');
const { upsertHeartbeat, markOffline } = require('../services/printRuntimeService');

let io = null;
const LEGACY_SOCKET_JOIN_ENABLED = String(
  process.env.SOCKET_ALLOW_LEGACY_JOIN || 'false'
).toLowerCase() === 'true';

function parseJoinPayload(payload, idKeys = []) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const possibleId = [payload.id, ...idKeys.map((k) => payload[k])].find((v) => v !== undefined && v !== null);
    return {
      id: String(possibleId || '').trim(),
      token: String(payload.token || '').trim(),
    };
  }
  return {
    id: String(payload || '').trim(),
    token: '',
  };
}

function getSocketToken(socket, payloadToken = '') {
  const fromPayload = String(payloadToken || '').trim();
  if (fromPayload) return fromPayload;

  const fromAuth = String(socket?.handshake?.auth?.token || '').trim();
  if (fromAuth) return fromAuth;

  const headerAuth = String(socket?.handshake?.headers?.authorization || '').trim();
  if (headerAuth.startsWith('Bearer ')) return headerAuth.slice(7).trim();

  return '';
}

async function decodeFirebaseToken(token) {
  if (!token || !isFirebaseInitialized()) return null;
  const firebaseAuth = getAuth();
  try {
    return await firebaseAuth.verifyIdToken(token);
  } catch {
    try {
      return await firebaseAuth.verifySessionCookie(token, true);
    } catch {
      return null;
    }
  }
}

async function resolveSocketPrincipal(socket, payloadToken = '') {
  const token = getSocketToken(socket, payloadToken);
  if (!token) return null;

  if (socket.data?.principalToken === token && socket.data?.principalResolved) {
    return socket.data.principal || null;
  }

  socket.data.principalToken = token;
  socket.data.principalResolved = true;

  const decoded = await decodeFirebaseToken(token);
  if (!decoded?.uid) {
    socket.data.principal = null;
    return null;
  }

  const [usuario, cliente] = await Promise.all([
    prisma.usuarios.findUnique({
      where: { firebase_uid: decoded.uid },
      select: { id: true, loja_id: true, role: true },
    }),
    prisma.clientes.findUnique({
      where: { firebase_uid: decoded.uid },
      select: { id: true },
    }),
  ]);

  const principal = {
    uid: decoded.uid,
    lojaId: usuario?.loja_id ? String(usuario.loja_id) : null,
    lojaRole: usuario?.role || null,
    clienteId: cliente?.id ? String(cliente.id) : null,
  };
  socket.data.principal = principal;
  return principal;
}

function ack(ackFn, payload) {
  if (typeof ackFn === 'function') ackFn(payload);
}

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

    socket.on('join:loja', async (payload = {}, ackFn) => {
      try {
        const { id: lojaId, token: payloadToken } = parseJoinPayload(payload, ['lojaId', 'storeId']);
        if (!lojaId) {
          ack(ackFn, { ok: false, erro: 'lojaId é obrigatório.' });
          return;
        }

        if (socket.data?.printAgent && String(socket.data.storeId || '') === lojaId) {
          socket.join(`loja:${lojaId}`);
          ack(ackFn, { ok: true });
          return;
        }

        const principal = await resolveSocketPrincipal(socket, payloadToken);
        if (principal?.lojaId === lojaId) {
          socket.join(`loja:${lojaId}`);
          ack(ackFn, { ok: true });
          return;
        }

        const socketToken = getSocketToken(socket, payloadToken);
        if (!socketToken && LEGACY_SOCKET_JOIN_ENABLED) {
          socket.join(`loja:${lojaId}`);
          ack(ackFn, { ok: true, legacy: true });
          return;
        }

        ack(ackFn, { ok: false, erro: 'Não autorizado para entrar nesta loja.' });
      } catch (err) {
        ack(ackFn, { ok: false, erro: err.message || 'Falha ao entrar na sala da loja.' });
      }
    });

    socket.on('join:cliente', async (payload = {}, ackFn) => {
      try {
        const { id: clienteId, token: payloadToken } = parseJoinPayload(payload, ['clienteId']);
        if (!clienteId) {
          ack(ackFn, { ok: false, erro: 'clienteId é obrigatório.' });
          return;
        }

        const principal = await resolveSocketPrincipal(socket, payloadToken);
        if (principal?.clienteId === clienteId) {
          socket.join(`cliente:${clienteId}`);
          ack(ackFn, { ok: true });
          return;
        }

        const socketToken = getSocketToken(socket, payloadToken);
        if (!socketToken && LEGACY_SOCKET_JOIN_ENABLED) {
          socket.join(`cliente:${clienteId}`);
          ack(ackFn, { ok: true, legacy: true });
          return;
        }

        ack(ackFn, { ok: false, erro: 'Não autorizado para entrar neste cliente.' });
      } catch (err) {
        ack(ackFn, { ok: false, erro: err.message || 'Falha ao entrar na sala do cliente.' });
      }
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

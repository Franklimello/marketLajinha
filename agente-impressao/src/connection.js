const { io } = require('socket.io-client');
const { apiRequest } = require('./auth');
const { sendToPrinter } = require('./printer');
const logger = require('./logger');

let socket = null;
let pollTimer = null;
let status = 'offline';
let onStatusChange = null;
let onNewOrder = null;
let config = { apiUrl: '', printToken: '', lojaId: '' };

function setCallbacks(callbacks) {
  onStatusChange = callbacks.onStatusChange || null;
  onNewOrder = callbacks.onNewOrder || null;
}

function updateStatus(newStatus) {
  if (status === newStatus) return;
  status = newStatus;
  if (onStatusChange) onStatusChange(status);
}

function getStatus() { return status; }

async function processJob(job) {
  const pedidoShort = job.pedido_id.slice(-6).toUpperCase();
  logger.info(`Imprimindo pedido #${pedidoShort} → ${job.impressora_ip}:${job.impressora_porta} (${job.setor})`);

  try {
    await sendToPrinter(job.impressora_ip, job.impressora_porta, job.conteudo);
    await apiRequest(config.apiUrl, `/impressoras/fila/${job.id}/impresso`, config.printToken, { method: 'PATCH' });
    logger.ok(`Pedido #${pedidoShort} impresso com sucesso`);
    return true;
  } catch (err) {
    logger.erro(`Falha pedido #${pedidoShort}: ${err.message}`);
    await apiRequest(config.apiUrl, `/impressoras/fila/${job.id}/erro`, config.printToken, {
      method: 'PATCH',
      body: { erro: err.message },
    }).catch(() => {});
    return false;
  }
}

async function fetchAndPrint() {
  try {
    const jobs = await apiRequest(config.apiUrl, '/impressoras/fila', config.printToken);
    updateStatus('online');

    if (Array.isArray(jobs) && jobs.length > 0) {
      logger.info(`${jobs.length} impressão(ões) na fila`);
      for (const job of jobs) await processJob(job);
    }
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) {
      updateStatus('offline');
      logger.erro('Token de impressão inválido. Faça login novamente.');
      disconnect();
      return 'auth_error';
    }
    updateStatus('reconnecting');
    logger.erro(`Sem conexão com o servidor`);
  }
  return 'ok';
}

function connect(cfg) {
  config = { ...cfg };
  disconnect();

  logger.info('Conectando ao servidor...');

  socket = io(config.apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    logger.ok('Conectado ao servidor em tempo real');
    socket.emit('join:loja', config.lojaId);
    updateStatus('online');
    fetchAndPrint();
  });

  socket.on('disconnect', () => {
    updateStatus('reconnecting');
    logger.info('Conexão perdida. Reconectando...');
  });

  socket.on('reconnect_failed', () => {
    updateStatus('offline');
  });

  socket.on('pedido:novo', (pedido) => {
    logger.info(`Novo pedido recebido: #${pedido.id?.slice(-6).toUpperCase()}`);
    if (onNewOrder) onNewOrder(pedido);
    setTimeout(() => fetchAndPrint(), 500);
  });

  pollTimer = setInterval(async () => {
    const result = await fetchAndPrint();
    if (result === 'auth_error' && onStatusChange) onStatusChange('auth_error');
  }, 10000);

  fetchAndPrint();
}

function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  updateStatus('offline');
}

module.exports = { connect, disconnect, getStatus, setCallbacks, fetchAndPrint };

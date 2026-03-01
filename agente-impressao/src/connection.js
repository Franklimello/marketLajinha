const { io } = require('socket.io-client');
const { apiRequest } = require('./auth');
const { sendToPrinter, sendToUsbPrinter } = require('./printer');
const logger = require('./logger');
const { detectPrinters } = require('./printerDetector');

let socket = null;
let pollTimer = null;
let heartbeatTimer = null;
let status = 'offline';
let onStatusChange = null;
let onNewOrder = null;
let config = { apiUrl: '', printToken: '', lojaId: '' };
let fetchInFlight = false;

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

function getPrinterQueueKey(job) {
  const tipo = String(job?.impressora_tipo || 'IP').toUpperCase() === 'USB' ? 'USB' : 'IP';
  if (tipo === 'USB') return `USB:${String(job?.impressora_usb_identifier || '').toUpperCase()}`;
  return `IP:${String(job?.impressora_ip || '')}:${Number(job?.impressora_porta || 9100)}`;
}

async function processJob(job) {
  const pedidoShort = job.pedido_id.slice(-6).toUpperCase();
  const tipo = String(job?.impressora_tipo || 'IP').toUpperCase() === 'USB' ? 'USB' : 'IP';
  const alvo = tipo === 'USB'
    ? `USB:${job.impressora_usb_identifier || 'desconhecido'}`
    : `${job.impressora_ip}:${job.impressora_porta}`;
  logger.info(`Imprimindo pedido #${pedidoShort} → ${alvo} (${job.setor})`);

  try {
    if (tipo === 'USB') {
      await sendToUsbPrinter(job.impressora_usb_identifier, job.conteudo);
    } else {
      await sendToPrinter(job.impressora_ip, job.impressora_porta, job.conteudo);
    }
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

async function processJobsInParallelByPrinter(jobs) {
  const groups = new Map();
  for (const job of jobs) {
    const key = getPrinterQueueKey(job);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }

  await Promise.all(
    [...groups.values()].map(async (queue) => {
      for (const job of queue) {
        // Mantém ordem por impressora, mas processa impressoras em paralelo.
        await processJob(job);
      }
    })
  );
}

async function fetchAndPrint() {
  if (fetchInFlight) return 'ok';
  fetchInFlight = true;
  try {
    const jobs = await apiRequest(config.apiUrl, '/impressoras/fila', config.printToken);
    updateStatus('online');

    if (Array.isArray(jobs) && jobs.length > 0) {
      logger.info(`${jobs.length} impressão(ões) na fila`);
      await processJobsInParallelByPrinter(jobs);
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
  } finally {
    fetchInFlight = false;
  }
  return 'ok';
}

async function sendHeartbeat() {
  if (!socket || !config?.lojaId) return;
  const printersOnline = await detectPrinters(config.apiUrl, config.printToken);
  socket.emit('heartbeat', {
    storeId: config.lojaId,
    printersOnline,
  });
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
    socket.emit('register:print-agent', {
      storeId: config.lojaId,
      token: config.printToken,
    }, (resp = {}) => {
      if (!resp.ok) {
        logger.erro(`Falha ao registrar agente: ${resp.erro || 'erro desconhecido'}`);
      }
    });
    socket.emit('join:loja', config.lojaId);
    updateStatus('online');
    fetchAndPrint();
    sendHeartbeat();
  });

  socket.on('disconnect', () => {
    updateStatus('reconnecting');
    logger.info('Conexão perdida. Reconectando...');
  });

  socket.on('reconnect_failed', () => {
    updateStatus('offline');
  });

  const onNewOrderEvent = (pedido) => {
    logger.info(`Novo pedido recebido: #${pedido.id?.slice(-6).toUpperCase()}`);
    if (onNewOrder) onNewOrder(pedido);
    setTimeout(() => fetchAndPrint(), 500);
  };
  socket.on('pedido:novo', onNewOrderEvent);
  socket.on('new_order', onNewOrderEvent);

  pollTimer = setInterval(async () => {
    const result = await fetchAndPrint();
    if (result === 'auth_error' && onStatusChange) onStatusChange('auth_error');
  }, 10000);
  heartbeatTimer = setInterval(() => {
    sendHeartbeat().catch(() => {});
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
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  updateStatus('offline');
}

module.exports = { connect, disconnect, getStatus, setCallbacks, fetchAndPrint };

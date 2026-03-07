const { io } = require('socket.io-client');
const { apiRequest } = require('./auth');
const { sendToPrinter, sendToUsbPrinter } = require('./printer');
const logger = require('./logger');
const { detectPrinters } = require('./printerDetector');
const store = require('./store');

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

function getShortId(value) {
  const raw = String(value || '');
  return raw ? raw.slice(-6).toUpperCase() : '------';
}

function isAuthError(err) {
  const statusCode = Number(err?.statusCode || 0);
  if (statusCode === 401 || statusCode === 403) return true;

  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('token de impressao invalido') || msg.includes('token invalido');
}

function isNotFoundError(err) {
  return Number(err?.statusCode || 0) === 404;
}

async function confirmPrintedJob(job, pedidoShort, { replay = false } = {}) {
  try {
    await apiRequest(config.apiUrl, `/impressoras/fila/${job.id}/impresso`, config.printToken, { method: 'PATCH' });
    store.removePendingPrintJob(job.id);
    logger.ok(
      replay
        ? `Confirmacao sincronizada para pedido #${pedidoShort}`
        : `Pedido #${pedidoShort} impresso com sucesso`
    );
    return true;
  } catch (err) {
    if (isNotFoundError(err)) {
      store.removePendingPrintJob(job.id);
      logger.info(`Job ${getShortId(job.id)} nao existe mais no servidor. Estado local limpo.`);
      return true;
    }
    throw err;
  }
}

async function reportPrintError(job, err) {
  try {
    await apiRequest(config.apiUrl, `/impressoras/fila/${job.id}/erro`, config.printToken, {
      method: 'PATCH',
      body: { erro: err.message },
    });
  } catch (reportErr) {
    if (isAuthError(reportErr)) throw reportErr;
  }
}

async function retryPendingPrintConfirmations() {
  const pendingJobs = Object.values(store.loadPendingPrintJobs());
  if (pendingJobs.length === 0) return;

  for (const pendingJob of pendingJobs) {
    const pedidoShort = getShortId(pendingJob.pedidoId || pendingJob.jobId);
    try {
      await apiRequest(
        config.apiUrl,
        `/impressoras/fila/${pendingJob.jobId}/impresso`,
        config.printToken,
        { method: 'PATCH' }
      );
      store.removePendingPrintJob(pendingJob.jobId);
      logger.ok(`Confirmacao pendente sincronizada para pedido #${pedidoShort}`);
    } catch (err) {
      if (isNotFoundError(err)) {
        store.removePendingPrintJob(pendingJob.jobId);
        logger.info(`Job local ${getShortId(pendingJob.jobId)} ja nao existe no servidor. Limpando estado local.`);
        continue;
      }
      if (isAuthError(err)) throw err;
      logger.info(`Confirmacao ainda pendente para pedido #${pedidoShort}: ${err.message}`);
    }
  }
}

async function processJob(job) {
  const pedidoShort = getShortId(job?.pedido_id);
  const tipo = String(job?.impressora_tipo || 'IP').toUpperCase() === 'USB' ? 'USB' : 'IP';
  const alvo = tipo === 'USB'
    ? `USB:${job.impressora_usb_identifier || 'desconhecido'}`
    : `${job.impressora_ip}:${job.impressora_porta}`;

  if (store.getPendingPrintJob(job.id)) {
    logger.info(`Pedido #${pedidoShort} ja foi impresso localmente. Reenviando confirmacao.`);
    try {
      await confirmPrintedJob(job, pedidoShort, { replay: true });
      return true;
    } catch (err) {
      if (isAuthError(err)) throw err;
      logger.info(`Confirmacao ainda pendente para pedido #${pedidoShort}: ${err.message}`);
      return false;
    }
  }

  logger.info(`Imprimindo pedido #${pedidoShort} -> ${alvo} (${job.setor})`);

  try {
    if (tipo === 'USB') {
      await sendToUsbPrinter(job.impressora_usb_identifier, job.conteudo);
    } else {
      await sendToPrinter(job.impressora_ip, job.impressora_porta, job.conteudo);
    }
  } catch (err) {
    logger.erro(`Falha pedido #${pedidoShort}: ${err.message}`);
    await reportPrintError(job, err);
    return false;
  }

  store.upsertPendingPrintJob({
    jobId: job.id,
    pedidoId: job.pedido_id,
    setor: job.setor,
    printer: alvo,
    printedAt: new Date().toISOString(),
  });

  try {
    await confirmPrintedJob(job, pedidoShort);
    return true;
  } catch (err) {
    if (isAuthError(err)) throw err;
    logger.info(`Pedido #${pedidoShort} foi impresso, mas a confirmacao falhou: ${err.message}`);
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
        await processJob(job);
      }
    })
  );
}

async function fetchAndPrint() {
  if (fetchInFlight) return 'ok';
  fetchInFlight = true;
  try {
    await retryPendingPrintConfirmations();
    const jobs = await apiRequest(config.apiUrl, '/impressoras/fila', config.printToken);
    updateStatus('online');

    if (Array.isArray(jobs) && jobs.length > 0) {
      logger.info(`${jobs.length} impressoes na fila`);
      await processJobsInParallelByPrinter(jobs);
    }
  } catch (err) {
    if (isAuthError(err)) {
      updateStatus('offline');
      logger.erro('Token de impressao invalido. Faca login novamente.');
      disconnect();
      return 'auth_error';
    }
    updateStatus('reconnecting');
    logger.erro('Sem conexao com o servidor');
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
    logger.info('Conexao perdida. Reconectando...');
  });

  socket.on('reconnect_failed', () => {
    updateStatus('offline');
  });

  const onNewOrderEvent = (pedido) => {
    logger.info(`Novo pedido recebido: #${getShortId(pedido?.id)}`);
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

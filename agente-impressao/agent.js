const express = require('express');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3333;
const BASE_DIR = path.dirname(process.execPath || process.argv[0]);
const CONFIG_PATH = path.join(BASE_DIR, 'config.json');
const MAX_LOGS = 100;

let config = { apiUrl: '', token: '', intervalo: 3 };
let status = { conectado: false, ultimoPoll: null, imprimindo: false };
let logs = [];
let polling = null;
let rodando = false;

function carregarConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    }
  } catch {}
}

function salvarConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function addLog(tipo, msg) {
  const entry = { tipo, msg, hora: new Date().toLocaleTimeString('pt-BR') };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  const prefix = tipo === 'erro' ? 'ERRO' : tipo === 'ok' ? ' OK ' : 'INFO';
  console.log(`[${entry.hora}] ${prefix}: ${msg}`);
}

async function fetchApi(pathUrl, options = {}) {
  const url = `${config.apiUrl}${pathUrl}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-print-token': config.token,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function enviarParaImpressora(ip, porta, dados, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; socket.destroy(); reject(new Error(`Timeout ${ip}:${porta}`)); }
    }, timeoutMs);
    socket.connect(porta, ip, () => {
      socket.write(dados, 'binary', () => {
        clearTimeout(timer); done = true; socket.end(); resolve();
      });
    });
    socket.on('error', (err) => {
      if (!done) { clearTimeout(timer); done = true; socket.destroy(); reject(err); }
    });
  });
}

async function processarJob(job) {
  addLog('info', `Imprimindo pedido #${job.pedido_id.slice(-6).toUpperCase()} → ${job.impressora_ip}:${job.impressora_porta} (${job.setor})`);
  try {
    await enviarParaImpressora(job.impressora_ip, job.impressora_porta, job.conteudo);
    await fetchApi(`/impressoras/fila/${job.id}/impresso`, { method: 'PATCH' });
    addLog('ok', `Pedido #${job.pedido_id.slice(-6).toUpperCase()} impresso com sucesso`);
  } catch (err) {
    addLog('erro', `Falha pedido #${job.pedido_id.slice(-6).toUpperCase()}: ${err.message}`);
    await fetchApi(`/impressoras/fila/${job.id}/erro`, {
      method: 'PATCH',
      body: JSON.stringify({ erro: err.message }),
    }).catch(() => {});
  }
}

async function poll() {
  if (rodando || !config.apiUrl || !config.token) return;
  rodando = true;
  try {
    const jobs = await fetchApi('/impressoras/fila');
    status.conectado = true;
    status.ultimoPoll = new Date().toLocaleTimeString('pt-BR');
    if (jobs && jobs.length > 0) {
      addLog('info', `${jobs.length} job(s) na fila`);
      for (const job of jobs) {
        await processarJob(job);
      }
    }
  } catch (err) {
    status.conectado = false;
    if (err.message.includes('401')) {
      addLog('erro', 'Token inválido. Verifique nas configurações.');
    } else if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
      addLog('erro', 'Sem conexão com o servidor.');
    } else {
      addLog('erro', `Polling: ${err.message}`);
    }
  } finally { rodando = false; }
}

function iniciarPolling() {
  pararPolling();
  if (!config.apiUrl || !config.token) return;
  poll();
  polling = setInterval(poll, (config.intervalo || 3) * 1000);
  addLog('info', 'Monitoramento iniciado');
}

function pararPolling() {
  if (polling) { clearInterval(polling); polling = null; }
}

carregarConfig();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send(HTML_PAGE);
});

app.get('/api/status', (req, res) => {
  res.json({
    configurado: !!(config.apiUrl && config.token),
    ativo: !!polling,
    conectado: status.conectado,
    ultimoPoll: status.ultimoPoll,
    intervalo: config.intervalo,
    apiUrl: config.apiUrl,
    logs,
  });
});

app.post('/api/config', (req, res) => {
  const { apiUrl, token, intervalo } = req.body;
  config.apiUrl = (apiUrl || '').replace(/\/+$/, '');
  config.token = token || '';
  config.intervalo = Math.max(1, parseInt(intervalo) || 3);
  salvarConfig();
  addLog('info', 'Configurações salvas');
  iniciarPolling();
  res.json({ ok: true });
});

app.post('/api/iniciar', (req, res) => {
  iniciarPolling();
  res.json({ ok: true });
});

app.post('/api/parar', (req, res) => {
  pararPolling();
  addLog('info', 'Monitoramento pausado');
  status.conectado = false;
  res.json({ ok: true });
});

app.post('/api/testar', async (req, res) => {
  try {
    await fetchApi('/impressoras/fila');
    status.conectado = true;
    addLog('ok', 'Conexão com servidor OK!');
    res.json({ ok: true, msg: 'Conexão OK!' });
  } catch (err) {
    status.conectado = false;
    addLog('erro', `Teste falhou: ${err.message}`);
    res.json({ ok: false, msg: err.message });
  }
});

const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MarketLajinha - Impressão</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f4; color: #1c1917; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #d97706, #b45309); color: white; padding: 20px 24px; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header p { font-size: 12px; opacity: .85; margin-top: 2px; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .card { background: white; border-radius: 16px; border: 1px solid #e7e5e4; padding: 20px; margin-bottom: 16px; }
  .card h2 { font-size: 15px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .dot-green { background: #22c55e; box-shadow: 0 0 6px #22c55e88; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #eab308; animation: pulse 1.5s infinite; }
  .dot-gray { background: #a8a29e; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
  .status-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; }
  .status-ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
  .status-off { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
  .status-wait { background: #fefce8; color: #a16207; border: 1px solid #fef08a; }
  .status-idle { background: #f5f5f4; color: #78716c; border: 1px solid #e7e5e4; }
  label { display: block; font-size: 13px; font-weight: 600; color: #57534e; margin-bottom: 6px; }
  input[type="text"], input[type="number"], input[type="url"] { width: 100%; padding: 10px 12px; border: 1px solid #d6d3d1; border-radius: 10px; font-size: 14px; outline: none; transition: border .2s; }
  input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,.15); }
  .field { margin-bottom: 14px; }
  .hint { font-size: 11px; color: #a8a29e; margin-top: 4px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all .2s; }
  .btn-primary { background: #d97706; color: white; }
  .btn-primary:hover { background: #b45309; }
  .btn-success { background: #16a34a; color: white; }
  .btn-success:hover { background: #15803d; }
  .btn-danger { background: #dc2626; color: white; }
  .btn-danger:hover { background: #b91c1c; }
  .btn-outline { background: white; color: #57534e; border: 1px solid #d6d3d1; }
  .btn-outline:hover { background: #f5f5f4; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .log-list { max-height: 300px; overflow-y: auto; font-size: 12px; font-family: 'SF Mono', 'Consolas', monospace; }
  .log-item { padding: 6px 10px; border-bottom: 1px solid #f5f5f4; display: flex; gap: 8px; align-items: flex-start; }
  .log-item:last-child { border: none; }
  .log-hora { color: #a8a29e; white-space: nowrap; }
  .log-ok { color: #16a34a; }
  .log-erro { color: #dc2626; }
  .log-info { color: #57534e; }
  .log-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
  .badge-ok { background: #dcfce7; color: #15803d; }
  .badge-erro { background: #fee2e2; color: #b91c1c; }
  .badge-info { background: #f5f5f4; color: #78716c; }
  .empty { text-align: center; padding: 30px; color: #a8a29e; font-size: 13px; }
</style>
</head>
<body>
  <div class="header">
    <h1>🖨️ MarketLajinha - Central de Impressão</h1>
    <p>Programa de impressão automática para sua loja</p>
  </div>

  <div class="container">
    <div class="card" id="statusCard">
      <div id="statusBar" class="status-bar status-idle">
        <span class="status-dot dot-gray"></span>
        Carregando...
      </div>
    </div>

    <div class="card">
      <h2>⚙️ Configuração</h2>
      <div class="field">
        <label>Endereço do servidor</label>
        <input type="url" id="apiUrl" placeholder="https://sua-api.railway.app">
        <div class="hint">Cole o endereço da API que você recebeu</div>
      </div>
      <div class="field">
        <label>Token de impressão</label>
        <input type="text" id="token" placeholder="Cole o token gerado no painel">
        <div class="hint">Gere o token no Dashboard → Impressoras → Agente de Impressão</div>
      </div>
      <div class="field">
        <label>Verificar a cada (segundos)</label>
        <input type="number" id="intervalo" value="3" min="1" max="30">
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="salvarConfig()">💾 Salvar</button>
        <button class="btn btn-outline" onclick="testarConexao()">🔌 Testar conexão</button>
      </div>
    </div>

    <div class="card">
      <h2>▶️ Controle</h2>
      <div class="btn-row">
        <button class="btn btn-success" id="btnIniciar" onclick="iniciar()">▶ Iniciar impressão</button>
        <button class="btn btn-danger" id="btnParar" onclick="parar()" style="display:none">⏸ Pausar</button>
      </div>
    </div>

    <div class="card">
      <h2>📋 Registro de atividades</h2>
      <div class="log-list" id="logList">
        <div class="empty">Nenhuma atividade ainda</div>
      </div>
    </div>
  </div>

<script>
let ativo = false;
let refreshTimer = null;

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

async function carregarStatus() {
  try {
    const s = await api('/api/status');
    document.getElementById('apiUrl').value = s.apiUrl || '';
    document.getElementById('token').value = '';
    document.getElementById('intervalo').value = s.intervalo || 3;
    ativo = s.ativo;
    atualizarUI(s);
    renderLogs(s.logs || []);
  } catch {}
}

function atualizarUI(s) {
  const bar = document.getElementById('statusBar');
  const btnI = document.getElementById('btnIniciar');
  const btnP = document.getElementById('btnParar');
  
  if (!s.configurado) {
    bar.className = 'status-bar status-idle';
    bar.innerHTML = '<span class="status-dot dot-gray"></span> Configure o servidor e o token abaixo';
    btnI.style.display = 'inline-flex'; btnP.style.display = 'none';
  } else if (s.ativo && s.conectado) {
    bar.className = 'status-bar status-ok';
    bar.innerHTML = '<span class="status-dot dot-green"></span> Conectado e monitorando pedidos' + (s.ultimoPoll ? ' <span style="font-size:11px;opacity:.7;margin-left:auto">Último check: ' + s.ultimoPoll + '</span>' : '');
    btnI.style.display = 'none'; btnP.style.display = 'inline-flex';
  } else if (s.ativo && !s.conectado) {
    bar.className = 'status-bar status-wait';
    bar.innerHTML = '<span class="status-dot dot-yellow"></span> Tentando conectar ao servidor...';
    btnI.style.display = 'none'; btnP.style.display = 'inline-flex';
  } else {
    bar.className = 'status-bar status-off';
    bar.innerHTML = '<span class="status-dot dot-red"></span> Impressão pausada';
    btnI.style.display = 'inline-flex'; btnP.style.display = 'none';
  }
}

function renderLogs(logArr) {
  const el = document.getElementById('logList');
  if (!logArr.length) { el.innerHTML = '<div class="empty">Nenhuma atividade ainda</div>'; return; }
  el.innerHTML = logArr.map(l => {
    const badgeCls = l.tipo === 'ok' ? 'badge-ok' : l.tipo === 'erro' ? 'badge-erro' : 'badge-info';
    const badgeTxt = l.tipo === 'ok' ? 'OK' : l.tipo === 'erro' ? 'ERRO' : 'INFO';
    return '<div class="log-item"><span class="log-hora">' + l.hora + '</span><span class="log-badge ' + badgeCls + '">' + badgeTxt + '</span><span>' + l.msg + '</span></div>';
  }).join('');
}

async function salvarConfig() {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const token = document.getElementById('token').value.trim();
  const intervalo = document.getElementById('intervalo').value;
  if (!apiUrl) { alert('Preencha o endereço do servidor'); return; }
  const body = { apiUrl, intervalo };
  if (token) body.token = token;
  await api('/api/config', { method: 'POST', body: JSON.stringify(body) });
  ativo = true;
  await refreshStatus();
}

async function testarConexao() {
  const res = await api('/api/testar', { method: 'POST' });
  if (res.ok) { alert('✅ Conexão OK! Tudo funcionando.'); }
  else { alert('❌ Falha: ' + res.msg); }
  await refreshStatus();
}

async function iniciar() {
  await api('/api/iniciar', { method: 'POST' });
  ativo = true;
  await refreshStatus();
}

async function parar() {
  await api('/api/parar', { method: 'POST' });
  ativo = false;
  await refreshStatus();
}

async function refreshStatus() {
  try {
    const s = await api('/api/status');
    ativo = s.ativo;
    atualizarUI(s);
    renderLogs(s.logs || []);
  } catch {}
}

carregarStatus();
refreshTimer = setInterval(refreshStatus, 2000);
</script>
</body>
</html>`;

app.listen(PORT, () => {
  addLog('info', `Interface aberta em http://localhost:${PORT}`);
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} http://localhost:${PORT}`);
});

if (config.apiUrl && config.token) {
  iniciarPolling();
}

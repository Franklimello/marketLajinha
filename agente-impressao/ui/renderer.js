/* =========================================
   State
   ========================================= */
const DEFAULT_API_URL = 'https://marketlajinha-production.up.railway.app';

let selectedPrinterIp = '';
let selectedPrinterPort = 9100;
let logsVisible = false;
let currentScreen = 'login';
let logRefreshTimer = null;

/* =========================================
   Screen management
   ========================================= */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.style.display = 'none'));
  document.getElementById(id).style.display = '';
  currentScreen = id;
}

/* =========================================
   Init
   ========================================= */
async function init() {
  const state = await window.api.checkAuth();

  if (state.loggedIn) {
    if (state.printerIp) {
      showScreen('screenDash');
      loadDashboard(state);
      await window.api.startConnection();
    } else {
      showScreen('screenScan');
      startScan();
    }
  } else {
    showScreen('screenLogin');
  }

  const config = await window.api.getConfig();
  document.getElementById('loginApiUrl').value = config.apiUrl || DEFAULT_API_URL;
}

/* =========================================
   Title bar
   ========================================= */
document.getElementById('btnMinimize').addEventListener('click', () => window.api.minimize());
document.getElementById('btnClose').addEventListener('click', () => window.api.close());

/* =========================================
   Login
   ========================================= */
function toggleAdvanced() {
  const panel = document.getElementById('loginAdvanced');
  const arrow = document.getElementById('advArrow');
  if (panel.style.display === 'none') {
    panel.style.display = '';
    arrow.textContent = '▾';
  } else {
    panel.style.display = 'none';
    arrow.textContent = '▸';
  }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const apiUrl = document.getElementById('loginApiUrl').value.trim();

  if (!email || !password) {
    showLoginError('Preencha email e senha');
    return;
  }
  if (!apiUrl) {
    showLoginError('Informe o endereço do servidor nas configurações avançadas');
    return;
  }

  setLoginLoading(true);
  hideLoginError();

  const result = await window.api.login({ apiUrl, email, password });

  setLoginLoading(false);

  if (result.ok) {
    document.getElementById('loginPassword').value = '';
    showScreen('screenScan');
    startScan();
  } else {
    showLoginError(result.erro || 'Erro ao entrar');
  }
}

function setLoginLoading(loading) {
  const btn = document.getElementById('btnLogin');
  const text = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginSpinner');
  btn.disabled = loading;
  text.style.display = loading ? 'none' : '';
  spinner.style.display = loading ? '' : 'none';
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = '';
}

function hideLoginError() {
  document.getElementById('loginError').style.display = 'none';
}

document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('loginEmail').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginPassword').focus();
});

/* =========================================
   Network scan
   ========================================= */
let scanFoundPrinters = [];

async function startScan() {
  scanFoundPrinters = [];
  document.getElementById('printerList').innerHTML = '';
  document.getElementById('scanResults').style.display = 'none';
  document.getElementById('scanEmpty').style.display = 'none';
  document.getElementById('scanProgress').style.width = '0%';
  document.getElementById('scanProgressText').textContent = 'Iniciando busca...';
  document.getElementById('btnUsePrinter').disabled = true;
  selectedPrinterIp = '';

  const found = await window.api.scanNetwork();

  if (found.length === 0) {
    document.getElementById('scanEmpty').style.display = '';
    document.getElementById('scanProgressText').textContent = 'Busca concluída';
  } else {
    document.getElementById('scanProgressText').textContent = `${found.length} impressora(s) encontrada(s)`;
  }
  document.getElementById('scanProgress').style.width = '100%';
}

window.api.on('scan:progress', (pct) => {
  document.getElementById('scanProgress').style.width = pct + '%';
  document.getElementById('scanProgressText').textContent = `Verificando rede... ${pct}%`;
});

window.api.on('scan:found', (p) => {
  scanFoundPrinters.push(p);
  document.getElementById('scanResults').style.display = '';

  const list = document.getElementById('printerList');
  const div = document.createElement('div');
  div.className = 'printer-option';
  div.dataset.ip = p.ip;
  div.dataset.port = p.port;
  div.innerHTML = `
    <div class="radio"></div>
    <div>
      <div class="printer-label">Impressora ${p.ip}</div>
      <div class="printer-sub">Porta ${p.port}</div>
    </div>
  `;
  div.addEventListener('click', () => selectPrinterOption(p.ip, p.port, div));
  list.appendChild(div);
});

function selectPrinterOption(ip, port, el) {
  document.querySelectorAll('.printer-option').forEach((o) => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPrinterIp = ip;
  selectedPrinterPort = port;
  document.getElementById('btnUsePrinter').disabled = false;
  document.getElementById('manualIp').value = '';
}

document.getElementById('manualIp').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  if (val) {
    document.querySelectorAll('.printer-option').forEach((o) => o.classList.remove('selected'));
    selectedPrinterIp = val;
    selectedPrinterPort = 9100;
    document.getElementById('btnUsePrinter').disabled = false;
  } else if (scanFoundPrinters.length === 0) {
    document.getElementById('btnUsePrinter').disabled = true;
  }
});

function selectPrinter() {
  if (!selectedPrinterIp) return;
  document.getElementById('selectedPrinterIp').textContent = selectedPrinterIp;
  showScreen('screenTest');
}

function skipScan() {
  showScreen('screenDash');
  loadDashboardFromConfig();
  window.api.startConnection();
}

/* =========================================
   Test Print
   ========================================= */
async function doTestPrint() {
  const btn = document.getElementById('btnTestPrint');
  const text = document.getElementById('testBtnText');
  const spinner = document.getElementById('testSpinner');
  const resultEl = document.getElementById('testResult');

  btn.disabled = true;
  text.style.display = 'none';
  spinner.style.display = '';
  resultEl.style.display = 'none';

  const result = await window.api.testPrinter({
    ip: selectedPrinterIp,
    port: selectedPrinterPort,
  });

  text.style.display = '';
  spinner.style.display = 'none';
  resultEl.style.display = '';

  if (result.ok) {
    resultEl.innerHTML = `
      <div class="test-success">
        <div class="check">✓</div>
        <p>Impressora funcionando!</p>
      </div>
    `;
    text.textContent = 'Imprimir novamente';
    btn.disabled = false;

    await window.api.savePrinter({
      ip: selectedPrinterIp,
      port: selectedPrinterPort,
    });

    document.getElementById('btnTestSkip').textContent = 'Continuar';
    document.getElementById('btnTestSkip').className = 'btn btn-primary btn-full';
    document.getElementById('btnTestSkip').onclick = goToReady;
  } else {
    resultEl.innerHTML = `
      <div class="test-error">
        ${result.erro || 'Não foi possível imprimir'}
      </div>
    `;
    text.textContent = 'Tentar novamente';
    btn.disabled = false;
  }
}

async function goToReady() {
  const config = await window.api.getConfig();
  document.getElementById('readyLoja').textContent = config.lojaNome || '—';
  document.getElementById('readyPrinter').textContent = selectedPrinterIp || config.printerIp || '—';
  showScreen('screenReady');
}

/* =========================================
   Dashboard
   ========================================= */
async function goToDashboard() {
  showScreen('screenDash');
  await loadDashboardFromConfig();
  window.api.startConnection();
}

async function loadDashboardFromConfig() {
  const config = await window.api.getConfig();
  const state = await window.api.checkAuth();
  loadDashboard({ ...state, ...config });
}

function loadDashboard(data) {
  document.getElementById('dashLoja').textContent = data.lojaNome || 'Minha Loja';
  document.getElementById('dashPrinter').textContent = data.printerIp
    ? `Impressora: ${data.printerIp}`
    : 'Impressora: não configurada';
  updateDashStatus(data.status || 'offline');

  if (logRefreshTimer) clearInterval(logRefreshTimer);
  logRefreshTimer = setInterval(refreshLogs, 5000);
  refreshLogs();
}

function updateDashStatus(status) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const sub = document.getElementById('statusSub');

  dot.className = 'status-dot ' + status;

  const labels = {
    online: 'Conectado e monitorando',
    reconnecting: 'Reconectando ao servidor...',
    offline: 'Desconectado',
    auth_error: 'Sessão expirada',
  };

  const subs = {
    online: 'Pedidos serão impressos automaticamente',
    reconnecting: 'Tentando reconectar a cada 5 segundos',
    offline: 'Clique em Reconectar para tentar novamente',
    auth_error: 'Faça login novamente nas opções',
  };

  text.textContent = labels[status] || 'Verificando...';
  sub.textContent = subs[status] || '';
}

window.api.on('status:changed', (status) => {
  if (currentScreen === 'screenDash') updateDashStatus(status);
});

window.api.on('order:received', () => {
  if (currentScreen === 'screenDash') refreshLogs();
});

window.api.on('auth:expired', () => {
  if (logRefreshTimer) clearInterval(logRefreshTimer);
  showScreen('screenLogin');
});

/* =========================================
   Logs
   ========================================= */
function toggleLogs() {
  const card = document.getElementById('logsCard');
  logsVisible = !logsVisible;
  card.style.display = logsVisible ? '' : 'none';
  if (logsVisible) refreshLogs();
}

async function refreshLogs() {
  const logs = await window.api.getLogs();
  const list = document.getElementById('logList');

  if (!logs || logs.length === 0) {
    list.innerHTML = '<p class="empty-small">Nenhuma atividade ainda</p>';
    return;
  }

  list.innerHTML = logs
    .slice(0, 50)
    .map((l) => {
      const badgeCls = l.tipo === 'ok' ? 'badge-ok' : l.tipo === 'erro' ? 'badge-erro' : 'badge-info';
      const badgeTxt = l.tipo === 'ok' ? 'OK' : l.tipo === 'erro' ? 'ERRO' : 'INFO';
      return `<div class="log-item">
        <span class="log-hora">${l.hora}</span>
        <span class="log-badge ${badgeCls}">${badgeTxt}</span>
        <span class="log-msg">${escapeHtml(l.msg)}</span>
      </div>`;
    })
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =========================================
   Dashboard actions
   ========================================= */
async function doReconnect() {
  updateDashStatus('reconnecting');
  await window.api.startConnection();
}

async function doDashTestPrint() {
  const config = await window.api.getConfig();
  if (!config.printerIp) {
    alert('Nenhuma impressora configurada. Vá em Opções > Trocar impressora.');
    return;
  }
  const result = await window.api.testPrinter({
    ip: config.printerIp,
    port: config.printerPort || 9100,
  });
  if (result.ok) {
    alert('Página de teste impressa com sucesso!');
  } else {
    alert('Falha: ' + (result.erro || 'Verifique a impressora'));
  }
}

/* =========================================
   Settings
   ========================================= */
function showSettings() { document.getElementById('settingsModal').style.display = ''; }
function hideSettings() { document.getElementById('settingsModal').style.display = 'none'; }

document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') hideSettings();
});

function changePrinter() {
  hideSettings();
  showScreen('screenScan');
  startScan();
}

async function doLogout() {
  if (!confirm('Deseja sair da conta?')) return;
  hideSettings();
  if (logRefreshTimer) clearInterval(logRefreshTimer);
  await window.api.logout();
  showScreen('screenLogin');
}

function openLogsFolder() {
  window.api.openLogsFolder();
}

/* =========================================
   Start
   ========================================= */
init();

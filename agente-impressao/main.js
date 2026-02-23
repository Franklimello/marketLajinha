const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  Notification,
  nativeImage,
  shell,
} = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); process.exit(0); }

let mainWindow = null;
let tray = null;
let store, logger, auth, network, printer, connection;

function initModules() {
  store = require('./src/store');
  logger = require('./src/logger');
  auth = require('./src/auth');
  network = require('./src/network');
  printer = require('./src/printer');
  connection = require('./src/connection');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 660,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    const config = store.loadConfig();
    const token = store.loadToken();
    if (token && config.apiUrl && config.lojaId) {
      autoConnect(config, token);
    }
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error();
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('MarketLajinha - Impressão');
  updateTrayMenu('offline');

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu(status) {
  const labels = {
    online: '🟢 Conectado',
    reconnecting: '🟡 Reconectando...',
    offline: '🔴 Desconectado',
    auth_error: '🔴 Login necessário',
  };

  const menu = Menu.buildFromTemplate([
    { label: 'MarketLajinha Impressão', enabled: false },
    { type: 'separator' },
    { label: labels[status] || labels.offline, enabled: false },
    { type: 'separator' },
    { label: 'Abrir', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Sair', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray?.setContextMenu(menu);
}

function autoConnect(config, token) {
  connection.setCallbacks({
    onStatusChange: (s) => {
      updateTrayMenu(s);
      mainWindow?.webContents.send('status:changed', s);
      if (s === 'auth_error') {
        store.saveToken(null);
        mainWindow?.webContents.send('auth:expired');
        mainWindow?.show();
      }
    },
    onNewOrder: (pedido) => {
      const nota = new Notification({
        title: 'Novo pedido recebido!',
        body: `Pedido #${(pedido.id || '').slice(-6).toUpperCase()} - Imprimindo automaticamente`,
        icon: path.join(__dirname, 'assets', 'icon.png'),
      });
      nota.show();
      mainWindow?.webContents.send('order:received', pedido);
    },
  });

  connection.connect({
    apiUrl: config.apiUrl,
    printToken: token,
    lojaId: config.lojaId,
  });
}

function setupAutoStart() {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
    args: ['--minimized'],
  });
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;

  autoUpdater.on('update-available', () => {
    logger.info('Nova versão disponível. Baixando...');
  });
  autoUpdater.on('update-downloaded', () => {
    logger.ok('Atualização baixada. Será instalada ao fechar.');
  });
  autoUpdater.on('error', () => {});

  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

function registerIPC() {
  ipcMain.handle('app:close', () => { mainWindow?.hide(); });
  ipcMain.handle('app:minimize', () => { mainWindow?.minimize(); });
  ipcMain.handle('app:quit', () => { app.isQuitting = true; app.quit(); });

  ipcMain.handle('auth:check', () => {
    const config = store.loadConfig();
    const token = store.loadToken();
    return {
      loggedIn: !!(token && config.apiUrl && config.lojaId),
      lojaNome: config.lojaNome || '',
      printerIp: config.printerIp || '',
      status: connection.getStatus(),
    };
  });

  ipcMain.handle('auth:login', async (_, { apiUrl, email, password }) => {
    try {
      const cleanUrl = apiUrl.replace(/\/+$/, '');
      const result = await auth.login(cleanUrl, email, password);
      store.saveToken(result.printToken);
      store.saveConfig({
        apiUrl: cleanUrl,
        lojaId: result.loja.id,
        lojaNome: result.loja.nome,
        lojaSlug: result.loja.slug,
      });
      logger.ok(`Login realizado: ${result.loja.nome}`);
      return { ok: true, loja: result.loja };
    } catch (err) {
      const msg = translateFirebaseError(err.message);
      logger.erro(`Falha no login: ${msg}`);
      return { ok: false, erro: msg };
    }
  });

  ipcMain.handle('auth:logout', () => {
    connection.disconnect();
    store.saveToken(null);
    store.saveConfig({ lojaId: '', lojaNome: '' });
    logger.info('Logout realizado');
    updateTrayMenu('offline');
    return { ok: true };
  });

  ipcMain.handle('network:scan', async () => {
    const found = [];
    await network.scanNetwork(
      (progress) => mainWindow?.webContents.send('scan:progress', progress),
      (p) => {
        found.push(p);
        mainWindow?.webContents.send('scan:found', p);
      }
    );
    return found;
  });

  ipcMain.handle('printer:test', async (_, { ip, port }) => {
    try {
      const config = store.loadConfig();
      const ticket = printer.buildTestTicket(config.lojaNome || 'MarketLajinha');
      await printer.sendToPrinter(ip, port || 9100, ticket);
      logger.ok(`Teste de impressão OK: ${ip}:${port || 9100}`);
      return { ok: true };
    } catch (err) {
      logger.erro(`Teste falhou: ${err.message}`);
      return { ok: false, erro: err.message };
    }
  });

  ipcMain.handle('printer:save', (_, { ip, port }) => {
    store.saveConfig({ printerIp: ip, printerPort: port || 9100 });
    logger.info(`Impressora salva: ${ip}:${port || 9100}`);
    return { ok: true };
  });

  ipcMain.handle('connection:start', () => {
    const config = store.loadConfig();
    const token = store.loadToken();
    if (!token || !config.apiUrl) return { ok: false, erro: 'Login necessário' };
    autoConnect(config, token);
    return { ok: true };
  });

  ipcMain.handle('connection:stop', () => {
    connection.disconnect();
    updateTrayMenu('offline');
    return { ok: true };
  });

  ipcMain.handle('connection:status', () => connection.getStatus());

  ipcMain.handle('logs:get', () => logger.getLogs());

  ipcMain.handle('logs:open-folder', () => {
    shell.openPath(logger.LOG_DIR);
  });

  ipcMain.handle('config:get', () => store.loadConfig());
}

function translateFirebaseError(msg) {
  if (msg.includes('EMAIL_NOT_FOUND') || msg.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Email ou senha incorretos';
  }
  if (msg.includes('INVALID_PASSWORD')) return 'Senha incorreta';
  if (msg.includes('USER_DISABLED')) return 'Esta conta foi desativada';
  if (msg.includes('TOO_MANY_ATTEMPTS')) return 'Muitas tentativas. Aguarde um momento.';
  if (msg.includes('INVALID_EMAIL')) return 'Email inválido';
  if (msg.includes('Nenhuma loja')) return 'Nenhuma loja vinculada a este email';
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Timeout')) {
    return 'Servidor indisponível. Verifique sua internet.';
  }
  return msg;
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  initModules();
  registerIPC();
  createWindow();
  createTray();
  setupAutoStart();
  setupAutoUpdater();

  if (process.argv.includes('--minimized')) {
    mainWindow?.hide();
  }

  logger.info('Aplicativo iniciado');
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('before-quit', () => { connection?.disconnect(); });

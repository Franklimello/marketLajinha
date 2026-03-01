const net = require('net');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

const ESC = '\x1B';
const GS = '\x1D';

function sendToPrinter(ip, port, data, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      err ? reject(err) : resolve();
    };

    const timer = setTimeout(() => {
      finish(new Error('Impressora não respondeu. Verifique se está ligada.'));
    }, timeoutMs);

    socket.connect(port, ip, () => {
      socket.write(data, 'binary', () => finish(null));
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        finish(new Error('Impressora recusou a conexão. Verifique o IP e porta.'));
      } else if (err.code === 'EHOSTUNREACH') {
        finish(new Error('Impressora não encontrada na rede.'));
      } else {
        finish(new Error('Não foi possível conectar à impressora.'));
      }
    });
  });
}

function parseUsbIdentifier(identifier = '') {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  // Expected patterns: "VID:04B8_PID:0202", "04B8:0202"
  const regexA = /VID[:=_-]?([0-9A-F]{4}).*PID[:=_-]?([0-9A-F]{4})/i;
  const matchA = raw.match(regexA);
  if (matchA) return { vid: parseInt(matchA[1], 16), pid: parseInt(matchA[2], 16) };
  const regexB = /^([0-9A-F]{4})[:_-]([0-9A-F]{4})$/i;
  const matchB = raw.match(regexB);
  if (matchB) return { vid: parseInt(matchB[1], 16), pid: parseInt(matchB[2], 16) };
  return null;
}

function sendToUsbPrinter(usbIdentifier, data, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsed = parseUsbIdentifier(usbIdentifier);
    if (!parsed) {
      reject(new Error('Identificador USB inválido. Use formato VID:XXXX_PID:YYYY.'));
      return;
    }

    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      err ? reject(err) : resolve();
    };

    const timer = setTimeout(() => {
      finish(new Error('Impressora USB não respondeu. Verifique conexão/driver.'));
    }, timeoutMs);

    try {
      const device = new escpos.USB(parsed.vid, parsed.pid);
      device.open((error) => {
        if (error) {
          finish(new Error('Não foi possível abrir a impressora USB.'));
          return;
        }
        const printer = new escpos.Printer(device);
        printer.raw(Buffer.from(data, 'binary'), (rawErr) => {
          if (rawErr) {
            finish(new Error('Falha ao enviar dados para impressora USB.'));
            return;
          }
          try { printer.close(); } catch {}
          finish(null);
        });
      });
    } catch {
      finish(new Error('Impressora USB indisponível.'));
    }
  });
}

function buildTestTicket(lojaNome = 'MarketLajinha') {
  let t = '';
  t += `${ESC}@`;
  t += `${ESC}a\x01`;
  t += `${GS}!\x11`;
  t += `${ESC}E\x01`;
  t += 'TESTE DE IMPRESSAO\n';
  t += `${GS}!\x00`;
  t += `${ESC}E\x00`;
  t += '================================\n';
  t += `${lojaNome}\n`;
  t += '================================\n\n';
  t += `${ESC}a\x00`;
  t += 'Se voce esta lendo isso,\n';
  t += 'a impressora esta funcionando!\n\n';
  t += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
  t += '================================\n';
  t += `${ESC}a\x01`;
  t += 'Sistema pronto para uso\n';
  t += '================================\n';
  t += '\n\n\n';
  t += `${GS}V\x00`;
  return t;
}

module.exports = { sendToPrinter, sendToUsbPrinter, buildTestTicket };

const net = require('net');

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

module.exports = { sendToPrinter, buildTestTicket };

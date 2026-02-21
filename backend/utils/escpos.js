const net = require('net');

const ESC = '\x1B';
const GS = '\x1D';

const CMD = {
  INIT: `${ESC}@`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  FONT_DOUBLE: `${GS}!\x11`,
  FONT_NORMAL: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  FEED_3: '\n\n\n',
};

function buildTicket(pedido, itens, setorNome) {
  let txt = '';
  txt += CMD.INIT;
  txt += CMD.ALIGN_CENTER;
  txt += CMD.BOLD_ON;
  txt += CMD.FONT_DOUBLE;
  txt += `NOVO PEDIDO\n`;
  txt += CMD.FONT_NORMAL;
  txt += `***************\n`;
  txt += `Pedido: #${pedido.id.slice(-6).toUpperCase()}\n`;
  txt += `Setor: ${setorNome}\n`;
  txt += `***************\n\n`;

  txt += CMD.ALIGN_LEFT;
  txt += CMD.BOLD_OFF;

  for (const item of itens) {
    txt += CMD.BOLD_ON;
    txt += `${item.quantidade}x ${item.produto?.nome || 'Produto'}\n`;
    txt += CMD.BOLD_OFF;

    if (item.variacao_nome) {
      txt += `   Tam: ${item.variacao_nome}\n`;
    }

    try {
      const adicionais = JSON.parse(item.adicionais_json || '[]');
      if (adicionais.length > 0) {
        for (const ad of adicionais) {
          txt += `   + ${ad.nome}\n`;
        }
      }
    } catch { /* ignore */ }
  }

  if (pedido.observacao) {
    txt += `\n`;
    txt += CMD.BOLD_ON;
    txt += `OBS: `;
    txt += CMD.BOLD_OFF;
    txt += `${pedido.observacao}\n`;
  }

  txt += `\n`;
  txt += CMD.ALIGN_CENTER;
  txt += `***************\n`;
  txt += `${pedido.nome_cliente}\n`;
  txt += `${pedido.endereco || ''}\n`;
  txt += `${pedido.telefone_cliente || ''}\n`;
  txt += `***************\n`;

  txt += CMD.FEED_3;
  txt += CMD.CUT;

  return txt;
}

function enviarParaImpressora(ip, porta, dados, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let encerrado = false;

    const timer = setTimeout(() => {
      if (!encerrado) {
        encerrado = true;
        socket.destroy();
        reject(new Error(`Timeout ao conectar na impressora ${ip}:${porta}`));
      }
    }, timeoutMs);

    socket.connect(porta, ip, () => {
      socket.write(dados, 'binary', () => {
        clearTimeout(timer);
        encerrado = true;
        socket.end();
        resolve();
      });
    });

    socket.on('error', (err) => {
      if (!encerrado) {
        clearTimeout(timer);
        encerrado = true;
        socket.destroy();
        reject(new Error(`Erro na impressora ${ip}:${porta} - ${err.message}`));
      }
    });
  });
}

module.exports = { buildTicket, enviarParaImpressora, CMD };

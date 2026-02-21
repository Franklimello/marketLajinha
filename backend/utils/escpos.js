const net = require('net');

const ESC = '\x1B';
const GS = '\x1D';

const CMD = {
  INIT: `${ESC}@`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  FONT_DOUBLE: `${GS}!\x11`,
  FONT_NORMAL: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  FEED_3: '\n\n\n',
};

const COLS = { 58: 32, 80: 48 };

function getCols(larguraMm) {
  return COLS[larguraMm] || COLS[80];
}

function linha(char, cols) {
  return char.repeat(cols) + '\n';
}

function linhaDupla(esq, dir, cols) {
  const espaco = cols - esq.length - dir.length;
  if (espaco <= 0) return esq.slice(0, cols - dir.length - 1) + ' ' + dir + '\n';
  return esq + ' '.repeat(espaco) + dir + '\n';
}

function quebrarTexto(texto, cols, indent = 0) {
  const prefix = ' '.repeat(indent);
  const max = cols - indent;
  if (texto.length <= max) return prefix + texto + '\n';
  let result = '';
  let pos = 0;
  while (pos < texto.length) {
    result += prefix + texto.slice(pos, pos + max) + '\n';
    pos += max;
  }
  return result;
}

function formatCurrency(val) {
  return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
}

function buildTicket(pedido, itens, setorNome, larguraMm = 80) {
  const cols = getCols(larguraMm);
  let txt = '';

  txt += CMD.INIT;

  // Cabeçalho
  txt += CMD.ALIGN_CENTER;
  txt += CMD.BOLD_ON;
  txt += CMD.FONT_DOUBLE;
  txt += 'NOVO PEDIDO\n';
  txt += CMD.FONT_NORMAL;
  txt += CMD.BOLD_OFF;
  txt += linha('=', cols);
  txt += CMD.BOLD_ON;
  txt += `Pedido: #${pedido.id.slice(-6).toUpperCase()}\n`;
  txt += `Setor: ${setorNome}\n`;
  txt += CMD.BOLD_OFF;
  const data = new Date(pedido.created_at || Date.now());
  txt += data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + '\n';
  txt += linha('=', cols);

  // Itens
  txt += CMD.ALIGN_LEFT;
  txt += '\n';

  for (const item of itens) {
    const nome = item.produto?.nome || 'Produto';
    const precoUnit = Number(item.preco_unitario);
    const precoTotal = precoUnit * item.quantidade;

    txt += CMD.BOLD_ON;
    txt += linhaDupla(
      `${item.quantidade}x ${nome}`,
      formatCurrency(precoTotal),
      cols
    );
    txt += CMD.BOLD_OFF;

    if (item.variacao_nome) {
      txt += quebrarTexto(`Tam: ${item.variacao_nome}`, cols, 3);
    }

    try {
      const adicionais = JSON.parse(item.adicionais_json || '[]');
      for (const ad of adicionais) {
        const adTxt = ad.preco ? `+ ${ad.nome} (${formatCurrency(ad.preco)})` : `+ ${ad.nome}`;
        txt += quebrarTexto(adTxt, cols, 3);
      }
    } catch { /* ignore */ }
  }

  // Observação
  if (pedido.observacao) {
    txt += '\n';
    txt += linha('-', cols);
    txt += CMD.BOLD_ON;
    txt += 'OBS: ';
    txt += CMD.BOLD_OFF;
    txt += quebrarTexto(pedido.observacao, cols, 5).trimStart();
  }

  // Totais
  txt += '\n';
  txt += linha('-', cols);

  const subtotal = itens.reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0);
  txt += linhaDupla('Subtotal setor:', formatCurrency(subtotal), cols);

  if (Number(pedido.taxa_entrega) > 0) {
    txt += linhaDupla('Taxa entrega:', formatCurrency(pedido.taxa_entrega), cols);
  }
  if (Number(pedido.desconto) > 0) {
    txt += linhaDupla('Desconto:', '- ' + formatCurrency(pedido.desconto), cols);
  }

  txt += CMD.BOLD_ON;
  txt += CMD.FONT_DOUBLE;
  txt += linhaDupla('TOTAL:', formatCurrency(pedido.total), Math.floor(cols / 2));
  txt += CMD.FONT_NORMAL;
  txt += CMD.BOLD_OFF;

  // Dados do cliente
  txt += '\n';
  txt += linha('=', cols);
  txt += CMD.ALIGN_CENTER;
  txt += CMD.BOLD_ON;
  txt += (pedido.nome_cliente || 'Cliente') + '\n';
  txt += CMD.BOLD_OFF;
  if (pedido.tipo_entrega === 'RETIRADA') {
    txt += CMD.BOLD_ON + '*** RETIRADA NO BALCAO ***\n' + CMD.BOLD_OFF;
  } else {
    if (pedido.endereco) txt += quebrarTexto(pedido.endereco, cols);
    if (pedido.bairro) txt += `Bairro: ${pedido.bairro}\n`;
  }
  if (pedido.telefone_cliente) txt += `Tel: ${pedido.telefone_cliente}\n`;

  const pgto = { PIX: 'PIX', CREDIT: 'Credito', DEBIT: 'Debito', CASH: 'Dinheiro' };
  txt += `Pgto: ${pgto[pedido.forma_pagamento] || pedido.forma_pagamento}\n`;
  txt += linha('=', cols);

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

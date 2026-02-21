/**
 * Gerador de payload PIX estático no padrão EMV QRCode.
 * Gera a string "copia e cola" e o QR Code em base64.
 */
const QRCode = require('qrcode');

function pad(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload PIX (string "copia e cola").
 * @param {{ chave: string, nome: string, cidade: string, valor: number, txid?: string }} opts
 */
function gerarPayloadPix({ chave, nome, cidade, valor, txid }) {
  const nomeNorm = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 25);
  const cidadeNorm = cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 15);
  const txidNorm = (txid || '***').substring(0, 25);

  const merchantAccount = pad('00', 'br.gov.bcb.pix') + pad('01', chave);

  let payload = '';
  payload += pad('00', '01');
  payload += pad('26', merchantAccount);
  payload += pad('52', '0000');
  payload += pad('53', '986');

  if (valor && valor > 0) {
    payload += pad('54', valor.toFixed(2));
  }

  payload += pad('58', 'BR');
  payload += pad('59', nomeNorm);
  payload += pad('60', cidadeNorm);
  payload += pad('62', pad('05', txidNorm));

  payload += '6304';
  payload += crc16(payload);

  return payload;
}

/**
 * Gera o payload + QR Code em base64.
 */
async function gerarPixQRCode({ chave, nome, cidade, valor, txid }) {
  const payload = gerarPayloadPix({ chave, nome, cidade, valor, txid });
  const qrBase64 = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return { payload, qrBase64 };
}

module.exports = { gerarPayloadPix, gerarPixQRCode };

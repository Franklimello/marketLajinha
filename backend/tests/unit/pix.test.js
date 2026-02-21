/**
 * Testes unitários para utilitário PIX (payload EMV).
 */
const { gerarPayloadPix, gerarPixQRCode } = require('../../utils/pix');

describe('Utils: PIX', () => {
  const dadosPix = {
    chave: '12345678900',
    nome: 'Frank Melo',
    cidade: 'Sao Paulo',
    valor: 49.90,
    txid: 'pedido123',
  };

  test('gera payload com formato EMV válido', () => {
    const payload = gerarPayloadPix(dadosPix);
    expect(typeof payload).toBe('string');
    expect(payload.length).toBeGreaterThan(50);
    expect(payload.startsWith('0002')).toBe(true);
    expect(payload).toContain('br.gov.bcb.pix');
    expect(payload).toContain('12345678900');
    expect(payload).toContain('49.90');
  });

  test('payload sem valor não inclui campo 54', () => {
    const payload = gerarPayloadPix({ ...dadosPix, valor: 0 });
    expect(payload).not.toContain('5404');
  });

  test('nome é normalizado (sem acentos)', () => {
    const payload = gerarPayloadPix({ ...dadosPix, nome: 'José André' });
    expect(payload).toContain('Jose Andre');
  });

  test('nome truncado em 25 caracteres', () => {
    const payload = gerarPayloadPix({ ...dadosPix, nome: 'A'.repeat(50) });
    expect(payload).toContain('A'.repeat(25));
    expect(payload).not.toContain('A'.repeat(26));
  });

  test('cidade truncada em 15 caracteres', () => {
    const payload = gerarPayloadPix({ ...dadosPix, cidade: 'B'.repeat(30) });
    expect(payload).toContain('B'.repeat(15));
    expect(payload).not.toContain('B'.repeat(16));
  });

  test('payload termina com CRC16 (4 chars hex)', () => {
    const payload = gerarPayloadPix(dadosPix);
    const crc = payload.slice(-4);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });

  test('payload contém "6304" antes do CRC', () => {
    const payload = gerarPayloadPix(dadosPix);
    expect(payload).toContain('6304');
  });

  test('gerarPixQRCode retorna payload e qrBase64', async () => {
    const result = await gerarPixQRCode(dadosPix);
    expect(result).toHaveProperty('payload');
    expect(result).toHaveProperty('qrBase64');
    expect(result.qrBase64).toMatch(/^data:image\/png;base64,/);
  });

  test('txid padrão *** quando não fornecido', () => {
    const payload = gerarPayloadPix({ ...dadosPix, txid: undefined });
    expect(payload).toContain('***');
  });
});

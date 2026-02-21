/**
 * Testes de integração para rotas de Cupons.
 */
const request = require('supertest');

jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../config/firebase', () => require('../mocks/firebase'));

const app = require('../../index');

beforeEach(() => jest.clearAllMocks());

describe('POST /cupons/aplicar', () => {
  test('retorna 400 com body vazio', async () => {
    const res = await request(app)
      .post('/cupons/aplicar')
      .send({});
    expect(res.status).toBe(400);
  });

  test('retorna 400 sem codigo_cupom', async () => {
    const res = await request(app)
      .post('/cupons/aplicar')
      .send({ loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', subtotal: 100 });
    expect(res.status).toBe(400);
  });

  test('retorna 400 sem loja_id', async () => {
    const res = await request(app)
      .post('/cupons/aplicar')
      .send({ codigo_cupom: 'PROMO10', subtotal: 100 });
    expect(res.status).toBe(400);
  });
});

describe('POST /cupons (autenticado)', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app)
      .post('/cupons')
      .send({
        codigo: 'NOVO10',
        tipo_desconto: 'PERCENTAGE',
        valor_desconto: 10,
        data_inicio: new Date().toISOString(),
        data_fim: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(res.status).toBe(401);
  });
});

describe('GET /cupons (autenticado)', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app).get('/cupons');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /cupons/:id (autenticado)', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app).delete('/cupons/cl_cupom_1');
    expect(res.status).toBe(401);
  });
});

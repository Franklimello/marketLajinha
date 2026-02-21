/**
 * Testes de integração para rotas de Pedidos.
 */
const request = require('supertest');

jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../config/firebase', () => require('../mocks/firebase'));
jest.mock('../../services/notificacaoService', () => ({
  notificarCliente: jest.fn(),
  notificarLojista: jest.fn(),
}));
jest.mock('../../services/impressaoService', () => ({
  imprimirPedidoPorSetor: jest.fn(),
}));

const app = require('../../index');

beforeEach(() => jest.clearAllMocks());

describe('GET /pedidos', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app).get('/pedidos');
    expect(res.status).toBe(401);
  });
});

describe('GET /pedidos/meus', () => {
  test('retorna array vazio sem user autenticado', async () => {
    const res = await request(app).get('/pedidos/meus');
    expect([200, 401]).toContain(res.status);
  });
});

describe('POST /pedidos', () => {
  test('retorna 400 com body vazio', async () => {
    const res = await request(app)
      .post('/pedidos')
      .send({});
    expect(res.status).toBe(400);
  });

  test('retorna 400 sem itens', async () => {
    const res = await request(app)
      .post('/pedidos')
      .send({
        loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        forma_pagamento: 'PIX',
        itens: [],
      });
    expect(res.status).toBe(400);
  });

  test('retorna 400 com forma de pagamento inválida', async () => {
    const res = await request(app)
      .post('/pedidos')
      .send({
        loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        forma_pagamento: 'BITCOIN',
        itens: [{ produto_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', quantidade: 1 }],
      });
    expect(res.status).toBe(400);
  });

  test('validação aceita tipo_entrega RETIRADA', async () => {
    const res = await request(app)
      .post('/pedidos')
      .send({
        loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        tipo_entrega: 'RETIRADA',
        forma_pagamento: 'CASH',
        itens: [{ produto_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', quantidade: 1 }],
      });
    expect(res.status).not.toBe(400);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app)
      .patch('/pedidos/cl_pedido_1/status')
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(401);
  });
});

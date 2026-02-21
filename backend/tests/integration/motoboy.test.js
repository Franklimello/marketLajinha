/**
 * Testes de integração para rotas de Motoboy.
 */
const request = require('supertest');

jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../config/firebase', () => require('../mocks/firebase'));
jest.mock('../../services/notificacaoService', () => ({
  notificarCliente: jest.fn(),
  notificarLojista: jest.fn(),
}));

const app = require('../../index');

beforeEach(() => jest.clearAllMocks());

describe('POST /motoboys/login', () => {
  test('retorna 400 sem email ou senha', async () => {
    const res = await request(app)
      .post('/motoboys/login')
      .send({});
    expect([400, 401]).toContain(res.status);
  });

  test('retorna 400 com campos vazios', async () => {
    const res = await request(app)
      .post('/motoboys/login')
      .send({ email: '', senha: '' });
    expect([400, 401]).toContain(res.status);
  });
});

describe('GET /motoboys/pedidos', () => {
  test('retorna 401 sem token de motoboy', async () => {
    const res = await request(app).get('/motoboys/pedidos');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /motoboys/pedidos/:id/status', () => {
  test('retorna 401 sem token de motoboy', async () => {
    const res = await request(app)
      .patch('/motoboys/pedidos/pedido123/status')
      .send({ status: 'IN_ROUTE' });
    expect(res.status).toBe(401);
  });
});

describe('GET /motoboys (CRUD lojista)', () => {
  test('retorna 401 sem autenticação Firebase', async () => {
    const res = await request(app).get('/motoboys');
    expect(res.status).toBe(401);
  });
});

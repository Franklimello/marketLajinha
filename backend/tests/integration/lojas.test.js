/**
 * Testes de integração para rotas de Lojas.
 */
const request = require('supertest');

jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../config/firebase', () => require('../mocks/firebase'));

const app = require('../../index');
const { prisma } = require('../../config/database');

const LOJA_MOCK = {
  id: 'cl_loja_1',
  nome: 'Loja Teste',
  slug: 'loja-teste',
  categoria_negocio: 'Alimentação',
  cidade: 'São Paulo',
  endereco: '',
  telefone: '',
  logo_url: 'https://example.com/logo.png',
  banner_url: '',
  cor_primaria: '#ff0000',
  ativa: true,
  aberta: true,
  forcar_status: false,
  horario_abertura: '08:00',
  horario_fechamento: '22:00',
  taxa_entrega: 5,
  tempo_entrega: '40 min',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /lojas/ativos', () => {
  test('retorna lista de lojas ativas', async () => {
    prisma.lojas.findMany.mockResolvedValue([LOJA_MOCK]);
    const res = await request(app).get('/lojas/ativos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe('Loja Teste');
  });

  test('filtra por cidade', async () => {
    prisma.lojas.findMany.mockResolvedValue([LOJA_MOCK]);
    const res = await request(app).get('/lojas/ativos?cidade=São Paulo');
    expect(res.status).toBe(200);
    expect(prisma.lojas.findMany).toHaveBeenCalled();
  });

  test('filtra por categoria', async () => {
    prisma.lojas.findMany.mockResolvedValue([]);
    const res = await request(app).get('/lojas/ativos?categoria=Pizzaria');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /lojas/slug/:slug', () => {
  test('retorna loja pelo slug', async () => {
    prisma.lojas.findFirst.mockResolvedValue(LOJA_MOCK);
    const res = await request(app).get('/lojas/slug/loja-teste');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('loja-teste');
  });

  test('retorna 404 para slug inexistente', async () => {
    prisma.lojas.findFirst.mockResolvedValue(null);
    const res = await request(app).get('/lojas/slug/nao-existe');
    expect(res.status).toBe(404);
  });
});

describe('GET /lojas/:id', () => {
  test('retorna loja por ID', async () => {
    prisma.lojas.findUnique.mockResolvedValue(LOJA_MOCK);
    const res = await request(app).get('/lojas/cl_loja_1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('cl_loja_1');
  });
});

describe('POST /lojas', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app)
      .post('/lojas')
      .send({ nome: 'Nova Loja', slug: 'nova-loja', categoria_negocio: 'Bar', cidade: 'RJ' });
    expect(res.status).toBe(401);
  });
});

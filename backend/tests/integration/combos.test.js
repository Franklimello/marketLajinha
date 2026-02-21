/**
 * Testes de integração para rotas de Combos.
 */
const request = require('supertest');

jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../config/firebase', () => require('../mocks/firebase'));

const app = require('../../index');
const { prisma } = require('../../config/database');

const COMBO_MOCK = {
  id: 'cl_combo_1',
  loja_id: 'cl_loja_1',
  nome: 'Combo Família',
  descricao: '2 burgers + 2 refris',
  preco: 49.90,
  imagem_url: '',
  ativo: true,
  itens: [
    { id: 'i1', combo_id: 'cl_combo_1', produto_id: 'p1', quantidade: 2, produto: { id: 'p1', nome: 'Burger', preco: 20 } },
    { id: 'i2', combo_id: 'cl_combo_1', produto_id: 'p2', quantidade: 2, produto: { id: 'p2', nome: 'Refri', preco: 8 } },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('GET /combos/loja/:lojaId (público)', () => {
  test('retorna combos ativos de uma loja', async () => {
    prisma.combo.findMany.mockResolvedValue([COMBO_MOCK]);
    const res = await request(app).get('/combos/loja/cl_loja_1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe('Combo Família');
  });

  test('retorna array vazio se loja sem combos', async () => {
    prisma.combo.findMany.mockResolvedValue([]);
    const res = await request(app).get('/combos/loja/cl_loja_x');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /combos (autenticado)', () => {
  test('retorna 401 sem autenticação', async () => {
    const res = await request(app)
      .post('/combos')
      .send({ nome: 'Combo Teste', preco: 30 });
    expect(res.status).toBe(401);
  });
});

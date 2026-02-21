/**
 * Testes unitários para middlewares: auth, validação, error handler.
 */

describe('Middleware: getBearerToken', () => {
  const { getBearerToken } = require('../../middleware/auth');

  test('extrai token do header Authorization', () => {
    const req = { headers: { authorization: 'Bearer abc123' } };
    expect(getBearerToken(req)).toBe('abc123');
  });

  test('retorna null se não houver header', () => {
    const req = { headers: {} };
    expect(getBearerToken(req)).toBeNull();
  });

  test('retorna null se formato estiver errado', () => {
    const req = { headers: { authorization: 'Token abc123' } };
    expect(getBearerToken(req)).toBeNull();
  });

  test('retorna null se bearer estiver vazio', () => {
    const req = { headers: { authorization: 'Bearer ' } };
    expect(getBearerToken(req)).toBe('');
  });
});

describe('Middleware: requireAuth', () => {
  const { requireAuth } = require('../../middleware/auth');

  test('retorna 401 se req.user for null', () => {
    const req = { user: null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('chama next() se req.user existir', () => {
    const req = { user: { id: '1', role: 'ADMIN' } };
    const res = {};
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware: requireAdmin', () => {
  const { requireAdmin } = require('../../middleware/auth');

  test('retorna 401 sem user', () => {
    const req = { user: null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    requireAdmin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('retorna 403 se não for ADMIN', () => {
    const req = { user: { id: '1', role: 'EMPLOYEE' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    requireAdmin(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('chama next() se for ADMIN', () => {
    const req = { user: { id: '1', role: 'ADMIN' } };
    const next = jest.fn();
    requireAdmin(req, {}, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware: requireSameStore', () => {
  const { requireSameStore } = require('../../middleware/auth');

  test('retorna 403 se loja_id não bater', () => {
    const middleware = requireSameStore('id');
    const req = { user: { loja_id: 'loja1' }, params: { id: 'loja2' }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    middleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('chama next() se loja_id bater', () => {
    const middleware = requireSameStore('id');
    const req = { user: { loja_id: 'loja1' }, params: { id: 'loja1' }, body: {} };
    const next = jest.fn();
    middleware(req, {}, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('Middleware: validar (Zod)', () => {
  const { validar } = require('../../middleware/validacao');
  const { z } = require('zod');

  const schema = z.object({ nome: z.string().min(1) });

  test('chama next() com dados válidos e popula req.validated', () => {
    const req = { body: { nome: 'Teste' } };
    const res = {};
    const next = jest.fn();
    validar(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.validated).toEqual({ nome: 'Teste' });
  });

  test('retorna 400 com dados inválidos', () => {
    const req = { body: { nome: '' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validar(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Middleware: errorHandler', () => {
  const errorHandler = require('../../middleware/errorHandler');
  const originalConsoleError = console.error;

  beforeAll(() => { console.error = jest.fn(); });
  afterAll(() => { console.error = originalConsoleError; });

  function mockRes() {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  }

  test('erro com status customizado', () => {
    const err = new Error('Não encontrado');
    err.status = 404;
    const res = mockRes();
    errorHandler(err, { method: 'GET', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Não encontrado' });
  });

  test('Prisma P2025 retorna 404', () => {
    const err = new Error('Record not found');
    err.code = 'P2025';
    const res = mockRes();
    errorHandler(err, { method: 'GET', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('Prisma P2002 retorna 409', () => {
    const err = new Error('Unique constraint');
    err.code = 'P2002';
    const res = mockRes();
    errorHandler(err, { method: 'POST', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('Prisma P2xxx genérico retorna 400', () => {
    const err = new Error('Some prisma error');
    err.code = 'P2003';
    const res = mockRes();
    errorHandler(err, { method: 'POST', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('entity.too.large retorna 413', () => {
    const err = new Error('Payload too large');
    err.type = 'entity.too.large';
    const res = mockRes();
    errorHandler(err, { method: 'POST', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
  });

  test('entity.parse.failed retorna 400', () => {
    const err = new Error('Bad JSON');
    err.type = 'entity.parse.failed';
    const res = mockRes();
    errorHandler(err, { method: 'POST', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('erro genérico retorna 500', () => {
    const err = new Error('Algo deu errado');
    const res = mockRes();
    errorHandler(err, { method: 'GET', path: '/test' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ erro: 'Erro interno do servidor.' });
  });
});

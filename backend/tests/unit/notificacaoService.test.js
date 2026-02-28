const mockSend = jest.fn();
const mockIsFirebaseInitialized = jest.fn(() => true);

const mockPrisma = {
  fcmToken: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  fcmTokenLoja: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  },
  lojas: {
    findUnique: jest.fn(),
  },
};

jest.mock('firebase-admin', () => ({
  messaging: () => ({
    send: mockSend,
  }),
}));

jest.mock('../../config/firebase', () => ({
  isFirebaseInitialized: (...args) => mockIsFirebaseInitialized(...args),
}));

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

const notificacaoService = require('../../services/notificacaoService');

beforeEach(() => {
  jest.clearAllMocks();
  mockIsFirebaseInitialized.mockReturnValue(true);
});

describe('notificacaoService - push notifications', () => {
  test('nao envia push quando Firebase nao esta inicializado', async () => {
    mockIsFirebaseInitialized.mockReturnValue(false);

    await notificacaoService.notificarCliente('cliente_1', 'APPROVED', 'pedido_1', 'Loja Teste');

    expect(mockPrisma.fcmToken.findMany).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  test('salva token de cliente via upsert', async () => {
    mockPrisma.fcmToken.upsert.mockResolvedValue({ id: 'token_1' });

    await notificacaoService.salvarToken('cliente_10', 'token_abc');

    expect(mockPrisma.fcmToken.upsert).toHaveBeenCalledWith({
      where: { token: 'token_abc' },
      update: { cliente_id: 'cliente_10' },
      create: { cliente_id: 'cliente_10', token: 'token_abc' },
    });
  });

  test('remove tokens invalidos ao notificar cliente', async () => {
    mockPrisma.fcmToken.findMany.mockResolvedValue([
      { token: 'token_ok' },
      { token: 'token_invalido' },
    ]);
    mockSend.mockResolvedValueOnce({ ok: true });
    mockSend.mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' });
    mockPrisma.fcmToken.deleteMany.mockResolvedValue({ count: 1 });

    await notificacaoService.notificarCliente('cliente_20', 'IN_ROUTE', 'pedido_20', 'Loja XPTO');

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockPrisma.fcmToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['token_invalido'] } },
    });
  });

  test('envia push de novo cupom para tokens e limpa invalidos', async () => {
    mockPrisma.lojas.findUnique.mockResolvedValue({ nome: 'Loja Cupom' });
    mockPrisma.fcmToken.findMany.mockResolvedValue([
      { token: 'cliente_token_1' },
      { token: 'cliente_token_2' },
    ]);
    mockSend.mockResolvedValueOnce({ ok: true });
    mockSend.mockRejectedValueOnce({ code: 'messaging/invalid-registration-token' });
    mockPrisma.fcmToken.deleteMany.mockResolvedValue({ count: 1 });

    await notificacaoService.notificarTodosClientesNovoCupom({
      lojaId: 'loja_1',
      codigoCupom: 'BEMVINDO',
      valorDesconto: 10,
      tipoDesconto: 'PERCENTAGE',
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockPrisma.fcmToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['cliente_token_2'] } },
    });
  });
});


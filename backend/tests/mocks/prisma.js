/**
 * Mock do Prisma Client para testes unitários.
 * Cada model expõe os métodos padrão como jest.fn().
 */
const modelMethods = () => ({
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  upsert: jest.fn(),
});

const prisma = {
  lojas: modelMethods(),
  usuarios: modelMethods(),
  produtos: modelMethods(),
  pedidos: modelMethods(),
  itensPedido: modelMethods(),
  bairroTaxa: modelMethods(),
  clientes: modelMethods(),
  enderecoCliente: modelMethods(),
  variacaoProduto: modelMethods(),
  adicionalProduto: modelMethods(),
  impressora: modelMethods(),
  cupom: modelMethods(),
  cupomUso: modelMethods(),
  motoboy: modelMethods(),
  filaImpressao: modelMethods(),
  combo: modelMethods(),
  comboItem: modelMethods(),
  fcmToken: modelMethods(),
  fcmTokenLoja: modelMethods(),
  $transaction: jest.fn((fn) => fn(prisma)),
};

module.exports = { prisma };

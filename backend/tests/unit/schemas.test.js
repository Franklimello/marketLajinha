/**
 * Testes unitários para schemas Zod de validação.
 */
const { schemaLojas, schemaLojasPut } = require('../../schemas/lojasSchema');
const { schemaPedidos, schemaPedidosStatus } = require('../../schemas/pedidosSchema');
const { schemaProdutos } = require('../../schemas/produtosSchema');
const { schemaUsuarios } = require('../../schemas/usuariosSchema');
const { schemaCupom } = require('../../schemas/cuponsSchema');

describe('Schema: Lojas', () => {
  const lojaValida = {
    nome: 'Loja Teste',
    slug: 'loja-teste',
    categoria_negocio: 'Alimentação',
    cidade: 'São Paulo',
    cor_primaria: '#ff0000',
  };

  test('aceita loja válida', () => {
    const result = schemaLojas.safeParse(lojaValida);
    expect(result.success).toBe(true);
  });

  test('rejeita loja sem nome', () => {
    const result = schemaLojas.safeParse({ ...lojaValida, nome: '' });
    expect(result.success).toBe(false);
  });

  test('rejeita slug com caracteres especiais', () => {
    const result = schemaLojas.safeParse({ ...lojaValida, slug: 'Loja Teste!' });
    expect(result.success).toBe(false);
  });

  test('aceita banner_url válida', () => {
    const result = schemaLojas.safeParse({ ...lojaValida, banner_url: 'https://example.com/banner.jpg' });
    expect(result.success).toBe(true);
  });

  test('aceita banner_url vazia', () => {
    const result = schemaLojas.safeParse({ ...lojaValida, banner_url: '' });
    expect(result.success).toBe(true);
  });

  test('PUT schema aceita atualização com cidade', () => {
    const result = schemaLojasPut.safeParse({ nome: 'Novo Nome', cidade: 'Ibatiba' });
    expect(result.success).toBe(true);
  });

  test('PUT schema rejeita payload sem cidade', () => {
    const result = schemaLojasPut.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('Schema: Pedidos', () => {
  const pedidoValido = {
    loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    forma_pagamento: 'PIX',
    itens: [{ produto_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', quantidade: 2 }],
  };

  test('aceita pedido válido', () => {
    const result = schemaPedidos.safeParse(pedidoValido);
    expect(result.success).toBe(true);
  });

  test('rejeita pedido sem itens', () => {
    const result = schemaPedidos.safeParse({ ...pedidoValido, itens: [] });
    expect(result.success).toBe(false);
  });

  test('rejeita forma de pagamento inválida', () => {
    const result = schemaPedidos.safeParse({ ...pedidoValido, forma_pagamento: 'BITCOIN' });
    expect(result.success).toBe(false);
  });

  test('aceita tipo_entrega ENTREGA', () => {
    const result = schemaPedidos.safeParse({ ...pedidoValido, tipo_entrega: 'ENTREGA' });
    expect(result.success).toBe(true);
  });

  test('aceita tipo_entrega RETIRADA', () => {
    const result = schemaPedidos.safeParse({ ...pedidoValido, tipo_entrega: 'RETIRADA' });
    expect(result.success).toBe(true);
  });

  test('rejeita tipo_entrega inválido', () => {
    const result = schemaPedidos.safeParse({ ...pedidoValido, tipo_entrega: 'DRONE' });
    expect(result.success).toBe(false);
  });

  test('status aceita valores válidos', () => {
    for (const status of ['PENDING', 'APPROVED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']) {
      const result = schemaPedidosStatus.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  test('status rejeita valor inválido', () => {
    const result = schemaPedidosStatus.safeParse({ status: 'PERDIDO' });
    expect(result.success).toBe(false);
  });
});

describe('Schema: Produtos', () => {
  const produtoValido = {
    loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    nome: 'X-Burger',
    preco: 25.90,
    estoque: 10,
    categoria: 'Hambúrgueres',
  };

  test('aceita produto válido', () => {
    const result = schemaProdutos.safeParse(produtoValido);
    expect(result.success).toBe(true);
  });

  test('rejeita produto sem nome', () => {
    const result = schemaProdutos.safeParse({ ...produtoValido, nome: '' });
    expect(result.success).toBe(false);
  });

  test('rejeita preço negativo', () => {
    const result = schemaProdutos.safeParse({ ...produtoValido, preco: -5 });
    expect(result.success).toBe(false);
  });

  test('rejeita estoque negativo', () => {
    const result = schemaProdutos.safeParse({ ...produtoValido, estoque: -1 });
    expect(result.success).toBe(false);
  });

  test('aceita variações e adicionais', () => {
    const result = schemaProdutos.safeParse({
      ...produtoValido,
      variacoes: [{ nome: 'P', preco: 20 }, { nome: 'G', preco: 30 }],
      adicionais: [{ nome: 'Queijo extra', preco: 5 }],
    });
    expect(result.success).toBe(true);
  });

  test('rejeita variação sem nome', () => {
    const result = schemaProdutos.safeParse({
      ...produtoValido,
      variacoes: [{ nome: '', preco: 10 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema: Usuários', () => {
  const userValido = {
    nome: 'Frank',
    email: 'frank@test.com',
    firebase_uid: 'uid123',
    role: 'ADMIN',
    loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  };

  test('aceita usuário válido', () => {
    const result = schemaUsuarios.safeParse(userValido);
    expect(result.success).toBe(true);
  });

  test('rejeita email inválido', () => {
    const result = schemaUsuarios.safeParse({ ...userValido, email: 'nao-email' });
    expect(result.success).toBe(false);
  });

  test('rejeita role inválida', () => {
    const result = schemaUsuarios.safeParse({ ...userValido, role: 'SUPERUSER' });
    expect(result.success).toBe(false);
  });
});

describe('Schema: Cupons', () => {
  const cupomValido = {
    codigo: 'PROMO10',
    tipo_desconto: 'PERCENTAGE',
    valor_desconto: 10,
    data_inicio: new Date().toISOString(),
    data_fim: new Date(Date.now() + 86400000).toISOString(),
  };

  test('aceita cupom válido', () => {
    const result = schemaCupom.safeParse(cupomValido);
    expect(result.success).toBe(true);
  });

  test('rejeita tipo de desconto inválido', () => {
    const result = schemaCupom.safeParse({ ...cupomValido, tipo_desconto: 'FREE' });
    expect(result.success).toBe(false);
  });

  test('rejeita valor de desconto negativo', () => {
    const result = schemaCupom.safeParse({ ...cupomValido, valor_desconto: -5 });
    expect(result.success).toBe(false);
  });
});

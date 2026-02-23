/**
 * Garante coercao de campos numericos vindos como string.
 */
const { schemaLojasPut } = require('../../schemas/lojasSchema');
const { schemaProdutos, schemaProdutosPut } = require('../../schemas/produtosSchema');
const { schemaPedidos } = require('../../schemas/pedidosSchema');
const { schemaCupom, schemaAplicarCupom } = require('../../schemas/cuponsSchema');
const { schemaAvaliacao } = require('../../schemas/avaliacoesSchema');

describe('Coercao numerica: Lojas', () => {
  test('PUT aceita pedido_minimo e taxa_entrega como string numerica', () => {
    const result = schemaLojasPut.safeParse({
      pedido_minimo: '12.5',
      taxa_entrega: '4.9',
    });

    expect(result.success).toBe(true);
    expect(result.data.pedido_minimo).toBe(12.5);
    expect(result.data.taxa_entrega).toBe(4.9);
  });
});

describe('Coercao numerica: Produtos', () => {
  test('POST aceita preco e estoque como string', () => {
    const result = schemaProdutos.safeParse({
      loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nome: 'Produto teste',
      preco: '19.9',
      estoque: '7',
    });

    expect(result.success).toBe(true);
    expect(result.data.preco).toBe(19.9);
    expect(result.data.estoque).toBe(7);
  });

  test('PUT aceita preco e estoque como string', () => {
    const result = schemaProdutosPut.safeParse({
      preco: '42.0',
      estoque: '3',
    });

    expect(result.success).toBe(true);
    expect(result.data.preco).toBe(42);
    expect(result.data.estoque).toBe(3);
  });
});

describe('Coercao numerica: Pedidos', () => {
  test('aceita taxa_entrega e quantidade como string', () => {
    const result = schemaPedidos.safeParse({
      loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      forma_pagamento: 'PIX',
      taxa_entrega: '6.5',
      itens: [{ produto_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx', quantidade: '2' }],
    });

    expect(result.success).toBe(true);
    expect(result.data.taxa_entrega).toBe(6.5);
    expect(result.data.itens[0].quantidade).toBe(2);
  });
});

describe('Coercao numerica: Cupons', () => {
  test('aceita valor_desconto e limites como string', () => {
    const result = schemaCupom.safeParse({
      codigo: 'PROMO20',
      tipo_desconto: 'PERCENTAGE',
      valor_desconto: '20',
      valor_minimo: '30',
      max_usos: '100',
      usos_por_cliente: '1',
      data_inicio: new Date().toISOString(),
      data_fim: new Date(Date.now() + 86400000).toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.data.valor_desconto).toBe(20);
    expect(result.data.valor_minimo).toBe(30);
    expect(result.data.max_usos).toBe(100);
    expect(result.data.usos_por_cliente).toBe(1);
  });

  test('aplicar cupom aceita subtotal como string', () => {
    const result = schemaAplicarCupom.safeParse({
      loja_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      codigo_cupom: 'PROMO10',
      subtotal: '55.4',
    });

    expect(result.success).toBe(true);
    expect(result.data.subtotal).toBe(55.4);
  });
});

describe('Coercao numerica: Avaliacoes', () => {
  test('aceita nota como string', () => {
    const result = schemaAvaliacao.safeParse({
      pedido_id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      nota: '5',
      comentario: 'Muito bom',
    });

    expect(result.success).toBe(true);
    expect(result.data.nota).toBe(5);
  });
});

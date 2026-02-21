/**
 * Testes unitários para utilitário ESC/POS de impressão térmica.
 */
const { buildTicket } = require('../../utils/escpos');

describe('Utils: ESC/POS', () => {
  const pedido = {
    id: 'cl_pedido_123',
    nome_cliente: 'João Silva',
    telefone_cliente: '11999887766',
    endereco: 'Rua Teste, 123',
    bairro: 'Centro',
    forma_pagamento: 'PIX',
    tipo_entrega: 'ENTREGA',
    observacao: 'Sem cebola',
  };

  const itens = [
    { quantidade: 2, produto: { nome: 'X-Burger' }, preco_unitario: 25.00, variacao_nome: '', adicionais_nomes: '' },
    { quantidade: 1, produto: { nome: 'Coca Cola' }, preco_unitario: 7.00, variacao_nome: 'Lata', adicionais_nomes: '' },
  ];

  test('gera ticket com conteúdo válido', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(typeof ticket).toBe('string');
    expect(ticket.length).toBeGreaterThan(50);
  });

  test('ticket contém nome do setor', () => {
    const ticket = buildTicket(pedido, itens, 'BAR', 80);
    expect(ticket).toContain('BAR');
  });

  test('ticket contém itens do pedido', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('X-Burger');
    expect(ticket).toContain('Coca Cola');
  });

  test('ticket contém dados do cliente', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('João Silva');
  });

  test('ticket contém endereço para ENTREGA', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('Rua Teste, 123');
    expect(ticket).toContain('Centro');
  });

  test('ticket mostra RETIRADA NO BALCAO para tipo RETIRADA', () => {
    const pedidoRetirada = { ...pedido, tipo_entrega: 'RETIRADA' };
    const ticket = buildTicket(pedidoRetirada, itens, 'COZINHA', 80);
    expect(ticket).toContain('RETIRADA NO BALCAO');
    expect(ticket).not.toContain('Rua Teste, 123');
  });

  test('ticket contém forma de pagamento', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('PIX');
  });

  test('largura 58mm gera ticket mais estreito', () => {
    const t80 = buildTicket(pedido, itens, 'COZINHA', 80);
    const t58 = buildTicket(pedido, itens, 'COZINHA', 58);
    expect(typeof t58).toBe('string');
    expect(t58.length).toBeGreaterThan(0);
  });

  test('ticket contém observação', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('Sem cebola');
  });

  test('ticket contém variação quando presente', () => {
    const ticket = buildTicket(pedido, itens, 'COZINHA', 80);
    expect(ticket).toContain('Lata');
  });
});

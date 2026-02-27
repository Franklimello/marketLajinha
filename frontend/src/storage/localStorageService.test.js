import { beforeEach, describe, expect, it } from 'vitest';
import { clear, getItem, removeItem, setItem } from './localStorageService';

describe('localStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    clear();
  });

  it('salva e lê valores simples', () => {
    setItem('cidade', 'Belo Horizonte');
    expect(getItem('cidade')).toBe('Belo Horizonte');
  });

  it('remove funções ao serializar objetos', () => {
    setItem('payload', { nome: 'Teste', fn: () => 'x' });
    expect(getItem('payload')).toEqual({ nome: 'Teste' });
  });

  it('remove item corretamente', () => {
    setItem('token', 'abc');
    removeItem('token');
    expect(getItem('token', null)).toBeNull();
  });
});

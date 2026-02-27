import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSessionCookie, createSessionCookie, refreshSessionCookie } from './authStorage';

describe('authStorage API wrappers', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envia createSessionCookie com payload correto', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await createSessionCookie('token-123');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/auth/session');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(options.body).toBe(JSON.stringify({ idToken: 'token-123' }));
  });

  it('envia clearSessionCookie com DELETE', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await clearSessionCookie();

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/auth/session');
    expect(options.method).toBe('DELETE');
  });

  it('envia refreshSessionCookie com endpoint de refresh', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await refreshSessionCookie('token-xyz');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/auth/session/refresh');
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ idToken: 'token-xyz' }));
  });
});

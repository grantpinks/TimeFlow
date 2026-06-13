import { describe, expect, it, vi, beforeEach } from 'vitest';
import { validateOrigin } from '../validateOrigin.js';

vi.mock('../../config/env.js', () => ({
  env: { APP_BASE_URL: 'https://time-flow.app' },
}));

function mockRequest(overrides: {
  method?: string;
  url?: string;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string>;
}) {
  return {
    method: overrides.method ?? 'POST',
    url: overrides.url ?? '/api/events/categorizations',
    headers: overrides.headers ?? {},
    cookies: overrides.cookies ?? {},
  } as any;
}

function mockReply() {
  const reply = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply as any;
}

describe('validateOrigin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows same-origin Sec-Fetch-Site with cookie and no Origin', async () => {
    const request = mockRequest({
      headers: { 'sec-fetch-site': 'same-origin' },
      cookies: { tf_access: 'jwt' },
    });
    const reply = mockReply();

    await validateOrigin(request, reply);

    expect(reply.statusCode).toBe(200);
  });

  it('allows POST when Origin matches APP_BASE_URL', async () => {
    const request = mockRequest({
      headers: { origin: 'https://time-flow.app' },
      cookies: { tf_access: 'jwt' },
    });
    const reply = mockReply();

    await validateOrigin(request, reply);

    expect(reply.statusCode).toBe(200);
  });

  it('blocks cross-site cookie POST', async () => {
    const request = mockRequest({
      headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example.com' },
      cookies: { tf_access: 'jwt' },
    });
    const reply = mockReply();

    await validateOrigin(request, reply);

    expect(reply.statusCode).toBe(403);
  });

  it('allows proxied POST with cookie when no origin headers present', async () => {
    const request = mockRequest({
      headers: {},
      cookies: { tf_access: 'jwt' },
    });
    const reply = mockReply();

    await validateOrigin(request, reply);

    expect(reply.statusCode).toBe(200);
  });

  it('skips GET requests', async () => {
    const request = mockRequest({ method: 'GET' });
    const reply = mockReply();

    await validateOrigin(request, reply);

    expect(reply.statusCode).toBe(200);
  });
});

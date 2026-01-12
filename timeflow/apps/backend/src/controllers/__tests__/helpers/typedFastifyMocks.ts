import { vi } from 'vitest';
import type { FastifyBaseLogger, FastifyReply, FastifyRequest, FastifyRequestGenericInterface } from 'fastify';

type RequestOverrides<T extends FastifyRequestGenericInterface> = Partial<{
  params: T['Params'];
  query: T['Querystring'];
  body: T['Body'];
  headers: T['Headers'];
  user: T['User'];
  log: T['Log'];
}>;

function createLogger(): FastifyBaseLogger {
  const logger: Partial<FastifyBaseLogger> = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child() {
      return logger as FastifyBaseLogger;
    },
  };

  return logger as FastifyBaseLogger;
}

export function createControllerRequest<T extends FastifyRequestGenericInterface>(
  overrides: RequestOverrides<T> = {}
): FastifyRequest<T> {
  const request: Partial<FastifyRequest<T>> = {
    params: overrides.params ?? ({} as T['Params']),
    query: overrides.query ?? ({} as T['Querystring']),
    body: overrides.body ?? ({} as T['Body']),
    headers: overrides.headers ?? ({} as T['Headers']),
    user: overrides.user,
    log: overrides.log ?? createLogger(),
  };

  return request as FastifyRequest<T>;
}

export function createControllerReply(): FastifyReply {
  const reply = {
    statusCode: 200,
    status(this: typeof reply, code: number) {
      this.statusCode = code;
      return this;
    },
    send: vi.fn(),
  };

  return reply as unknown as FastifyReply;
}

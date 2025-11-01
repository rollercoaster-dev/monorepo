/// <reference types="jest" />

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import request from 'supertest';
import { honoLogger } from '../hono';


// Mock chalk to disable color codes in tests for easier string matching
jest.mock('chalk', () => {
  const chalkMock = {
    gray: (msg: string) => msg,
    whiteBright: (msg: string) => msg,
    blue: (msg: string) => msg,
    green: (msg: string) => msg,
    yellow: (msg: string) => msg,
    red: (msg: string) => msg,
    magenta: (msg: string) => msg,
    dim: (msg: string) => msg,
    cyan: (msg: string) => msg,
  };
  return {
    __esModule: true,
    default: chalkMock,
    ...chalkMock,
  };
});

describe('Hono Adapter Integration', () => {
  let server: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const app = new Hono();
    app.use('*', honoLogger());
    app.get('/test', (c) => c.json({ ok: true }, 200));
    server = serve({ fetch: app.fetch, port: 0 });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    server.close();
  });

  it('should set x-request-id header and log incoming and outgoing requests', async () => {
    const res = await request(server).get('/test');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    const [inLog, outLog] = consoleSpy.mock.calls.map(c => c[0]);
    expect(inLog).toContain('Incoming request');
    expect(outLog).toContain('Request completed');
  });
});

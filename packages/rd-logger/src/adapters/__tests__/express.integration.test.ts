/// <reference types="jest" />

import express from 'express';
import request from 'supertest';
import { expressLogger } from '../express';


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

describe('Express Adapter Integration', () => {
  let app: express.Express;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    app = express();
    app.use(expressLogger());
    app.get('/test', (_req, res) => {
      res.setHeader('x-test-header', 'test');
      res.status(200).json({ ok: true });
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should set x-request-id header and log incoming and outgoing requests', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-test-header']).toBe('test');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    const logs = consoleSpy.mock.calls.map(c => c[0]);
    expect(logs[0]).toContain('Incoming request');
    expect(logs[1]).toContain('Request completed');
  });
});

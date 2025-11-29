import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import express from "express";
import request from "supertest";
import { expressLogger } from "../express.js";
import type { Spy } from "bun:test";

describe("Express Adapter Integration", () => {
  let app: express.Express;
  let consoleSpy: Spy<typeof console.log>;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    app = express();
    app.use(expressLogger());
    app.get("/test", (_req, res) => {
      res.setHeader("x-test-header", "test");
      res.status(200).json({ ok: true });
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should set x-request-id header and log incoming and outgoing requests", async () => {
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.headers["x-test-header"]).toBe("test");
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    const logs = consoleSpy.mock.calls.map((c) => c[0]);
    expect(logs[0]).toContain("Incoming request");
    expect(logs[1]).toContain("Request completed");
  });
});

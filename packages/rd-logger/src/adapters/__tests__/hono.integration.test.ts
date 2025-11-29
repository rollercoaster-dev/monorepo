import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import request from "supertest";
import { honoLogger } from "../hono.js";
import type { Spy } from "bun:test";

describe("Hono Adapter Integration", () => {
  let server: any;
  let consoleSpy: Spy<typeof console.log>;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});
    const app = new Hono();
    app.use("*", honoLogger());
    app.get("/test", (c) => c.json({ ok: true }, 200));
    server = serve({ fetch: app.fetch, port: 0 });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    server.close();
  });

  it("should set x-request-id header and log incoming and outgoing requests", async () => {
    const res = await request(server).get("/test");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    const [inLog, outLog] = consoleSpy.mock.calls.map((c) => c[0]);
    expect(inLog).toContain("Incoming request");
    expect(outLog).toContain("Request completed");
  });
});

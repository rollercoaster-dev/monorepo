import { describe, test, expect } from "bun:test";
import { SensitiveValue } from "@rollercoaster-dev/rd-logger";

describe("SensitiveValue Protection", () => {
  test("passwords are redacted in logs", () => {
    const password = "SuperSecret123!";
    const sensitivePassword = new SensitiveValue(password);

    expect(sensitivePassword.toString()).toBe("[REDACTED]");
    expect(JSON.stringify({ password: sensitivePassword })).toContain(
      "[REDACTED]",
    );
    expect(sensitivePassword.getValue()).toBe(password); // Actual value accessible
  });

  test("API keys are redacted in logs", () => {
    const apiKey = "sk_live_1234567890abcdef";
    const sensitiveKey = new SensitiveValue(apiKey);

    expect(sensitiveKey.toString()).toBe("[REDACTED]");
    expect(sensitiveKey.getValue()).toBe(apiKey);
  });

  test("JWT tokens are redacted in logs", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const sensitiveToken = new SensitiveValue(token);

    expect(sensitiveToken.toJSON()).toBe("[REDACTED]");
  });

  test("getValue() extracts the actual value", () => {
    const secret = "my-secret-value";
    const sensitive = new SensitiveValue(secret);

    // Actual value is accessible via getValue()
    expect(sensitive.getValue()).toBe(secret);
    // But toString() and toJSON() redact it
    expect(sensitive.toString()).toBe("[REDACTED]");
    expect(sensitive.toJSON()).toBe("[REDACTED]");
  });
});

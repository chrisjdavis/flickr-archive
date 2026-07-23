import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientIp, resetRateLimitBuckets } from "./rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  resetRateLimitBuckets();
});

describe("clientIp", () => {
  it("ignores forwarded headers unless TRUST_PROXY is enabled", () => {
    delete process.env.TRUST_PROXY;
    const request = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" },
    });
    expect(clientIp(request)).toBe("direct");
  });

  it("uses X-Forwarded-For when TRUST_PROXY is enabled", () => {
    vi.stubEnv("TRUST_PROXY", "true");
    const request = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "1.2.3.4, 9.9.9.9" },
    });
    expect(clientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP when TRUST_PROXY is enabled", () => {
    vi.stubEnv("TRUST_PROXY", "1");
    const request = new Request("http://localhost/api", {
      headers: { "x-real-ip": "5.6.7.8" },
    });
    expect(clientIp(request)).toBe("5.6.7.8");
  });
});

describe("checkRateLimit", () => {
  it("blocks after max attempts in the window", () => {
    expect(checkRateLimit("k", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit("k", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit("k", 2, 60_000).allowed).toBe(false);
  });
});

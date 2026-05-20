import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "./index.js";

describe("withRetry", () => {
  it("resolves with the return value and calls fn once on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries retries times and rejects with the last error", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("e1"))
      .mockRejectedValueOnce(new Error("e2"))
      .mockRejectedValueOnce(new Error("e3"));
    await expect(withRetry(fn, { retries: 2, delay: 0 })).rejects.toThrow("e3");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("resolves with the value when fn eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("eventual");
    const result = await withRetry(fn, { retries: 2, delay: 0 });
    expect(result).toBe("eventual");
  });

  it("makes one attempt and rejects immediately when retries is 0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("nope"));
    await expect(withRetry(fn, { retries: 0 })).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("defaults to 3 retries (4 total calls) when no options are passed", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn, { delay: 0 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("does not retry an AbortError and propagates it immediately", async () => {
    const abort = new DOMException("aborted", "AbortError");
    const fn = vi.fn().mockRejectedValue(abort);
    await expect(withRetry(fn, { retries: 3 })).rejects.toBe(abort);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  describe("exponential backoff", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("doubles the delay with each retry", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      const promise = withRetry(fn, { retries: 3, delay: 100 });
      // Attach rejection handler immediately — before advancing timers — to
      // prevent Node from surfacing an unhandled rejection during timer advancement.
      const settled = expect(promise).rejects.toThrow("fail");

      await vi.runAllTimersAsync();
      await settled;

      const delays = setTimeoutSpy.mock.calls.map((args) => args[1]);
      expect(delays).toEqual(expect.arrayContaining([100, 200, 400]));
    });
  });

  it("works with a synchronous fn and returns its value", async () => {
    const fn = vi.fn().mockReturnValue("sync-result");
    const result = await withRetry(fn);
    expect(result).toBe("sync-result");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

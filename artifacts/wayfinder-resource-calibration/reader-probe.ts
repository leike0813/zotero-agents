// THROWAWAY: production reader + modeled XPCOM input, not a Zotero/network acceptance test.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync } from "node:fs";
import {
  beginHostHttpRequestRead,
  DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS,
  parseHostHttpRequestBytes,
  HostHttpRequestReadError,
} from "../../src/modules/hostBridge/server/hostHttpRequestReader.ts";

class ModeledInput {
  chunks: Uint8Array[] = [];
  callback: { onInputStreamReady: (stream: ModeledInput) => void } | null = null;
  closeCount = 0;
  available() { return this.chunks[0]?.byteLength || 0; }
  readByteArray(n: number) {
    const chunk = this.chunks.shift()!;
    assert.ok(n <= chunk.length);
    if (n < chunk.length) this.chunks.unshift(chunk.subarray(n));
    return Array.from(chunk.subarray(0, n));
  }
  asyncWait(callback: ModeledInput["callback"]) { this.callback = callback; this.notify(); }
  push(chunk: Uint8Array) { this.chunks.push(chunk); this.notify(); }
  notify() {
    if (!this.callback || !this.chunks.length) return;
    const callback = this.callback;
    this.callback = null;
    queueMicrotask(() => callback.onInputStreamReady(this));
  }
  close() { this.closeCount++; this.chunks = []; }
}

const caseName = process.argv[2];
const MiB = 1024 * 1024;
const cases: Record<string, { size: number; cap: number; expected: string; pause?: number; idle?: number; abort?: boolean; json?: boolean }> = {
  control_at: { size: MiB, cap: MiB, expected: "success", json: true },
  control_over: { size: MiB + 1, cap: MiB, expected: "body_too_large" },
  upload_at: { size: 16 * MiB, cap: 16 * MiB, expected: "success" },
  upload_over: { size: 16 * MiB + 1, cap: 16 * MiB, expected: "body_too_large" },
  idle500: { size: 8192, cap: MiB, expected: "idle_timeout", pause: 1000 },
  idle10000: { size: 8192, cap: MiB, expected: "success", pause: 1000, idle: 10000 },
  abort: { size: MiB, cap: MiB, expected: "aborted", abort: true },
};
const scenario = cases[caseName];
assert.ok(scenario, "Select an explicit reader calibration case");
const stream = new ModeledInput();
Object.defineProperty(globalThis, "Components", { configurable: true, value: {
  classes: {
    "@mozilla.org/binaryinputstream;1": { createInstance: () => {
      let source: ModeledInput;
      return {
        setInputStream(input: ModeledInput) { source = input; },
        available: () => source.available(),
        readByteArray: (n: number) => source.readByteArray(n),
        close: () => source.close(),
      };
    } },
    "@mozilla.org/thread-manager;1": { getService: () => ({ mainThread: {} }) },
  },
  interfaces: { nsIAsyncInputStream: {}, nsIBinaryInputStream: {}, nsIThreadManager: {} },
} });
const baseline = process.memoryUsage().rss;
const start = performance.now();
const operation = beginHostHttpRequestRead(stream, {
  deferBody: true,
  limits: { ...DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS, idleTimeoutMs: scenario.idle ?? 500 },
});
const completed = operation.completion.then(
  (value) => ({ outcome: "success", value }),
  (error: unknown) => {
    assert.ok(error instanceof HostHttpRequestReadError);
    return { outcome: error.code, error };
  },
);
stream.push(Buffer.from(`POST /bridge/v2/${scenario.json ? "call" : "files/upload"} HTTP/1.1\r\nContent-Length: ${scenario.size}\r\n\r\n`, "latin1"));
try {
  await operation.head;
  operation.continue(scenario.cap);
} catch (error: unknown) {
  assert.ok(error instanceof HostHttpRequestReadError);
  assert.equal(error.code, scenario.expected);
}
if (scenario.expected !== "body_too_large") {
  let body: Buffer;
  if (scenario.json) {
    const envelope = Buffer.byteLength('{"payload":""}');
    const count = Math.floor((scenario.size - envelope) / 3);
    const text = JSON.stringify({ payload: "文".repeat(count) + "x".repeat(scenario.size - envelope - count * 3) });
    body = Buffer.from(text, "utf8");
  } else body = Buffer.alloc(scenario.size, 0x6b);
  assert.equal(body.length, scenario.size);
  const split = Math.min(4096, body.length);
  stream.push(body.subarray(0, split));
  await delay(0);
  if (scenario.abort) operation.abort();
  else {
    if (scenario.pause) await delay(scenario.pause);
    for (let offset = split; offset < body.length && stream.closeCount === 0; offset += 65536) {
      assert.ok(process.memoryUsage().rss < 256 * MiB, "calibration RSS guard");
      stream.push(body.subarray(offset, Math.min(offset + 65536, body.length)));
      await delay(0);
    }
  }
}
const result = await completed;
assert.equal(result.outcome, scenario.expected);
if (result.outcome === "success" && "value" in result) {
  assert.equal(result.value.bodyBytes, scenario.size);
  if (scenario.json) {
    const parsed = parseHostHttpRequestBytes(result.value.bytes);
    const decoded: unknown = JSON.parse(parsed.body!);
    assert.ok(decoded !== null && typeof decoded === "object" && "payload" in decoded && typeof decoded.payload === "string");
  }
}
assert.equal(stream.closeCount, 1);
const metrics = {
  evidenceLayer: "production-reader-modeled-xpcom-input",
  case: caseName,
  outcome: result.outcome,
  expected: scenario.expected,
  bytesDeclared: scenario.size,
  admissionCapBytes: scenario.cap,
  idleBudgetMs: scenario.idle ?? 500,
  deliberatePauseMs: scenario.pause ?? 0,
  elapsedMs: performance.now() - start,
  baselineRssBytes: baseline,
  peakRssKiB: Number(readFileSync("/proc/self/status", "utf8").match(/^VmHWM:\s+(\d+)\s+kB$/m)?.[1]),
  inheritedRusageMaxRssKiB: process.resourceUsage().maxRSS,
  peakMemorySource: "Linux /proc/self/status VmHWM; rusage contains an inherited launcher watermark",
  finalRssBytes: process.memoryUsage().rss,
  processScope: "single Node process including modeled source bytes and production reader",
  modeledFragmentBytes: 65536,
  closeCount: stream.closeCount,
  stats: "value" in result ? { bodyBytes: result.value.bodyBytes, fragments: result.value.fragments, maxCallbackDurationMs: result.value.maxCallbackDurationMs } : result.error.stats,
  limits: "Modeled XPCOM, no real Zotero, no actual HTTP server, no remote throughput or new workflow proof",
};
console.log(JSON.stringify(metrics));
assert.ok(Number.isFinite(metrics.peakRssKiB) && metrics.peakRssKiB * 1024 < 256 * MiB, "calibration process memory safety ceiling");

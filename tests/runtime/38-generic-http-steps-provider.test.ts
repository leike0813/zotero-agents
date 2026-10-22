import { assert } from "chai";
import { GenericHttpProvider } from "../../src/providers/generic-http/provider";
import type { BackendInstance } from "../../src/backends/types";
import { fixturePath, readBytes } from "../zotero/workflow-test-utils";
import { JobQueueManager } from "../../src/jobQueue/manager";
import { BoundedWaitError } from "../../src/utils/wait";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("generic-http provider: steps", function () {
  for (const scenario of [
    "single-body",
    "single-body-without-controller",
    "step-fetch",
    "step-bytes",
    "poll-interval",
  ]) {
    it(`bounds ${scenario} and ignores late results`, async function () {
      const nativeController = Object.getOwnPropertyDescriptor(
        globalThis,
        "AbortController",
      );
      const withoutController = scenario === "single-body-without-controller";
      if (withoutController) {
        Object.defineProperty(globalThis, "AbortController", {
          value: undefined,
          configurable: true,
        });
      }
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const calls: string[] = [];
      const signals: Array<AbortSignal | null | undefined> = [];
      const provider = new GenericHttpProvider({
        fetchImpl: async (url, init) => {
          calls.push(url);
          signals.push(init?.signal);
          if (scenario === "step-fetch") {
            await gate;
            return jsonResponse({ state: "done" });
          }
          if (scenario === "poll-interval") {
            return jsonResponse({ state: "running" });
          }
          return {
            ok: true,
            text: async () => {
              await gate;
              return "{}";
            },
            arrayBuffer: async () => {
              await gate;
              return new ArrayBuffer(0);
            },
          } as Response;
        },
      });
      const single = scenario.startsWith("single-body");
      const execution = provider.execute({
        requestKind: single
          ? "generic-http.request.v1"
          : "generic-http.steps.v1",
        backend: {
          id: "deadline",
          type: "generic-http",
          baseUrl: "http://example.invalid",
          auth: { kind: "none" },
        },
        request: single
          ? { request: { method: "GET", path: "/start" }, timeout_ms: 30 }
          : {
              poll: { timeout_ms: 30, interval_ms: 1000 },
              steps: [
                {
                  id: "start",
                  request: {
                    method: "GET",
                    path: "/start",
                    response_type: scenario === "step-bytes" ? "bytes" : "json",
                  },
                  ...(scenario === "poll-interval"
                    ? { repeat_until: { json_path: "$.state", in: ["done"] } }
                    : {}),
                },
                { id: "next", request: { method: "POST", path: "/next" } },
              ],
            },
      });
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      try {
        const error = await Promise.race([
          execution.then(
            () => null,
            (error: unknown) => error,
          ),
          new Promise((resolve) => {
            watchdog = setTimeout(
              () => resolve(new Error("deadline missing")),
              500,
            );
          }),
        ]);
        assert.instanceOf(error, BoundedWaitError);
        assert.equal((error as BoundedWaitError).kind, "timed-out");
        if (withoutController) assert.isUndefined(signals[0]);
        else assert.isTrue(signals[0]?.aborted);
      } finally {
        clearTimeout(watchdog);
        release();
        await execution.catch(() => undefined);
        if (withoutController && nativeController) {
          Object.defineProperty(
            globalThis,
            "AbortController",
            nativeController,
          );
        }
      }
      assert.deepEqual(calls, ["http://example.invalid/start"]);
    });
  }

  it("shares a request budget across fetch and body but resets it for each step", async function () {
    const originalNow = Date.now;
    let now = originalNow();
    Date.now = () => now;
    const backend: BackendInstance = {
      id: "budget",
      type: "generic-http",
      baseUrl: "http://example.invalid",
      auth: { kind: "none" },
    };
    try {
      const provider = new GenericHttpProvider({
        fetchImpl: async () => {
          now += 60;
          return {
            ok: true,
            text: async () => {
              now += 60;
              return "{}";
            },
          } as Response;
        },
      });
      const error = await provider
        .execute({
          requestKind: "generic-http.request.v1",
          backend,
          request: { request: { method: "GET", path: "/" }, timeout_ms: 100 },
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      assert.instanceOf(error, BoundedWaitError);
      assert.equal((error as BoundedWaitError).kind, "timed-out");
      const withoutDeadline = await provider.execute({
        requestKind: "generic-http.request.v1",
        backend,
        request: { request: { method: "GET", path: "/" } },
      });
      assert.equal(withoutDeadline.status, "succeeded");

      const stepsProvider = new GenericHttpProvider({
        fetchImpl: async () => {
          now += 60;
          return jsonResponse({ ok: true });
        },
      });
      const result = await stepsProvider.execute({
        requestKind: "generic-http.steps.v1",
        backend,
        request: {
          poll: { timeout_ms: 100 },
          steps: ["first", "second"].map((id) => ({
            id,
            request: { method: "GET", path: "/" },
          })),
        },
      });
      assert.equal(result.status, "succeeded");
    } finally {
      Date.now = originalNow;
    }
  });

  it("rejects invalid timer budgets before dispatch and treats zero as expired", async function () {
    let calls = 0;
    const provider = new GenericHttpProvider({
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({});
      },
    });
    for (const timeout of [NaN, Infinity, -1, 2 ** 31, 0]) {
      const error = await provider
        .execute({
          requestKind: "generic-http.request.v1",
          backend: {
            id: "invalid-deadline",
            type: "generic-http",
            baseUrl: "http://example.invalid",
            auth: { kind: "none" },
          },
          request: {
            request: { method: "POST", path: "/" },
            timeout_ms: timeout,
          },
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      assert.instanceOf(error, timeout === 0 ? BoundedWaitError : RangeError);
    }
    assert.equal(calls, 0);
  });

  it("times out a stalled request and releases its queue slot", async function () {
    this.timeout(2000);
    let signal: AbortSignal | null | undefined;
    let release!: (response: Response) => void;
    const stalled = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const provider = new GenericHttpProvider({
      fetchImpl: async (url, init) => {
        if (url.endsWith("/stalled")) {
          signal = init?.signal;
          return stalled;
        }
        return jsonResponse({ ok: true });
      },
    });
    const queue = new JobQueueManager({
      concurrency: 1,
      executeJob: (job) =>
        provider.execute({
          requestKind: "generic-http.request.v1",
          request: job.request,
          backend: {
            id: "http-timeout",
            type: "generic-http",
            baseUrl: "http://example.invalid",
            auth: { kind: "none" },
          },
        }),
    });
    const enqueue = (path: string) =>
      queue.enqueue({
        workflowId: "http-timeout",
        request: {
          kind: "generic-http.request.v1",
          timeout_ms: 30,
          request: { method: "GET", path },
        },
      });
    const first = enqueue("/stalled");
    const second = enqueue("/next");
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        queue.waitForIdle(),
        new Promise((_, reject) => {
          watchdog = setTimeout(() => reject(new Error("queue stuck")), 500);
        }),
      ]);
      assert.equal(queue.getJob(first)?.state, "failed");
      assert.equal(queue.getJob(second)?.state, "succeeded");
      assert.isTrue(signal?.aborted);
    } finally {
      clearTimeout(watchdog);
      release(jsonResponse({ late: true }));
      await queue.waitForIdle();
    }
    assert.equal(queue.getJob(first)?.state, "failed");
  });

  it("executes steps sequentially with upload/poll/download and bearer headers", async function () {
    const calls: Array<{
      url: string;
      method: string;
      headers: Record<string, string>;
      body: unknown;
    }> = [];
    const pollResponses = [
      jsonResponse({ data: { state: "running" } }),
      jsonResponse({
        data: {
          state: "done",
          full_zip_url: "http://download.local/full.zip",
        },
      }),
    ];
    const bundleBytes = new Uint8Array([1, 2, 3, 4]);

    const provider = new GenericHttpProvider({
      fetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers as HeadersInit);
        calls.push({
          url: String(input),
          method: String(init?.method || "GET").toUpperCase(),
          headers: Object.fromEntries(headers.entries()),
          body: init?.body,
        });
        const url = String(input);
        if (url.endsWith("/api/v4/file-urls/batch")) {
          return jsonResponse({
            code: 0,
            data: {
              batch_id: "batch-1",
              files: ["http://upload.local/file-1"],
            },
          });
        }
        if (url === "http://upload.local/file-1") {
          return jsonResponse({ code: 0, msg: "uploaded" });
        }
        if (url.endsWith("/api/v4/extract-results/batch/batch-1")) {
          return (
            pollResponses.shift() || pollResponses[pollResponses.length - 1]
          );
        }
        if (url === "http://download.local/full.zip") {
          return new Response(bundleBytes, {
            status: 200,
            headers: { "content-type": "application/zip" },
          });
        }
        return jsonResponse({ code: -1, msg: `unexpected url: ${url}` }, 500);
      },
    });

    const backend: BackendInstance = {
      id: "generic-http-mineru",
      type: "generic-http",
      baseUrl: "http://mineru.local",
      auth: {
        kind: "bearer",
        token: "token-123",
      },
      defaults: {
        headers: {
          "x-default": "default-v",
        },
      },
    };

    const sourcePath = fixturePath("literature-analysis", "example.md");
    const sourceBytes = await readBytes(sourcePath);

    const result = await provider.execute({
      requestKind: "generic-http.steps.v1",
      backend,
      request: {
        kind: "generic-http.steps.v1",
        sourceAttachmentPaths: [sourcePath],
        context: {
          source_attachment_path: sourcePath,
          source_attachment_name: "example.md",
        },
        steps: [
          {
            id: "create-upload-url",
            request: {
              method: "POST",
              path: "/api/v4/file-urls/batch",
              json: {
                files: [{ name: "{source_attachment_name}" }],
              },
            },
            extract: {
              batch_id: "$.data.batch_id",
              upload_url: "$.data.file_urls[0] || $.data.files[0]",
            },
          },
          {
            id: "upload-source",
            request: {
              method: "PUT",
              url: "{upload_url}",
              binary_from: "{source_attachment_path}",
              headers: {
                "x-step": "upload",
              },
            },
          },
          {
            id: "poll-result",
            request: {
              method: "GET",
              path: "/api/v4/extract-results/batch/{batch_id}",
            },
            repeat_until: {
              json_path: "$.data.state",
              in: ["done", "failed"],
            },
            fail_when: {
              json_path: "$.data.state",
              equals: "failed",
              message: "mineru extraction failed",
            },
            extract: {
              full_zip_url: "$.data.full_zip_url",
            },
          },
          {
            id: "download-bundle",
            request: {
              method: "GET",
              url: "{full_zip_url}",
              response_type: "bytes",
            },
          },
        ],
        poll: {
          interval_ms: 0,
          timeout_ms: 1000,
        },
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.fetchType, "bundle");
    assert.equal(result.requestId, "batch-1");
    assert.deepEqual(
      Array.from(result.bundleBytes || []),
      Array.from(bundleBytes),
    );

    assert.lengthOf(calls, 5);
    assert.equal(calls[0].url, "http://mineru.local/api/v4/file-urls/batch");
    assert.equal(calls[1].url, "http://upload.local/file-1");
    assert.equal(
      calls[2].url,
      "http://mineru.local/api/v4/extract-results/batch/batch-1",
    );
    assert.equal(
      calls[3].url,
      "http://mineru.local/api/v4/extract-results/batch/batch-1",
    );
    assert.equal(calls[4].url, "http://download.local/full.zip");

    assert.equal(calls[0].headers.authorization, "Bearer token-123");
    assert.equal(calls[0].headers["content-type"], "application/json");
    assert.equal(calls[0].headers["x-default"], "default-v");
    assert.equal(calls[1].headers["x-step"], "upload");

    assert.instanceOf(calls[1].body, Uint8Array);
    assert.equal((calls[1].body as Uint8Array).length, sourceBytes.length);
  });

  it("throws when polling reaches failed state", async function () {
    const provider = new GenericHttpProvider({
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith("/create")) {
          return jsonResponse({
            data: {
              batch_id: "batch-fail",
              upload_url: "http://upload.local/f",
            },
          });
        }
        if (url === "http://upload.local/f") {
          return jsonResponse({ ok: true });
        }
        if (url.endsWith("/poll/batch-fail")) {
          return jsonResponse({
            data: { state: "failed", err_msg: "bad input" },
          });
        }
        return jsonResponse({ code: -1 }, 500);
      },
    });

    const backend: BackendInstance = {
      id: "generic-http-mineru",
      type: "generic-http",
      baseUrl: "http://mineru.local",
      auth: { kind: "none" },
      defaults: { headers: {} },
    };
    const sourcePath = fixturePath("literature-analysis", "example.md");

    let thrown: unknown;
    try {
      await provider.execute({
        requestKind: "generic-http.steps.v1",
        backend,
        request: {
          kind: "generic-http.steps.v1",
          context: {
            source_attachment_path: sourcePath,
          },
          steps: [
            {
              id: "create",
              request: {
                method: "POST",
                path: "/create",
              },
              extract: {
                batch_id: "$.data.batch_id",
                upload_url: "$.data.upload_url",
              },
            },
            {
              id: "upload",
              request: {
                method: "PUT",
                url: "{upload_url}",
                binary_from: "{source_attachment_path}",
              },
            },
            {
              id: "poll",
              request: {
                method: "GET",
                path: "/poll/{batch_id}",
              },
              repeat_until: {
                json_path: "$.data.state",
                in: ["done", "failed"],
              },
              fail_when: {
                json_path: "$.data.state",
                equals: "failed",
                message_path: "$.data.err_msg",
              },
            },
          ],
          poll: {
            interval_ms: 0,
            timeout_ms: 1000,
          },
        },
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /bad input/i);
  });
});

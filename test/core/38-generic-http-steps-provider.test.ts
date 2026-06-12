import { assert } from "chai";
import { GenericHttpProvider } from "../../src/providers/generic-http/provider";
import type { BackendInstance } from "../../src/backends/types";
import { fixturePath, readBytes } from "./workflow-test-utils";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("generic-http provider: steps", function () {
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
          return pollResponses.shift() || pollResponses[pollResponses.length - 1];
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
    assert.deepEqual(Array.from(result.bundleBytes || []), Array.from(bundleBytes));

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
            data: { batch_id: "batch-fail", upload_url: "http://upload.local/f" },
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

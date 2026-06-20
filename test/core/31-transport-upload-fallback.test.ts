import { assert } from "chai";
import { SkillRunnerClient } from "../../src/providers/skillrunner/client";
import {
  SkillRunnerHttpError,
  SkillRunnerPollingTimeoutError,
} from "../../src/providers/skillrunner/errors";
import { createZipFromNamedFiles } from "../../src/providers/skillrunner/zipTransport";
import { fixturePath } from "./workflow-test-utils";

function createJsonResponse(payload: unknown, status = 200): Response {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as unknown as Response;
}

function createBinaryResponse(bytes: Uint8Array, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

function findFirstZipLocalHeaderOffset(bytes: Uint8Array) {
  for (let i = 0; i <= bytes.length - 4; i++) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x03 &&
      bytes[i + 3] === 0x04
    ) {
      return i;
    }
  }
  return -1;
}

function readZipGeneralPurposeFlagFromMultipart(bytes: Uint8Array) {
  const offset = findFirstZipLocalHeaderOffset(bytes);
  if (offset < 0 || offset + 8 > bytes.length) {
    throw new Error("zip local header not found in multipart body");
  }
  return bytes[offset + 6] | (bytes[offset + 7] << 8);
}

describe("transport: upload fallback without FormData", function () {
  it("aborts a hanging create request after the SkillRunner request timeout", async function () {
    let abortObserved = false;
    let createCalls = 0;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      requestTimeoutMs: 5,
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          createCalls += 1;
          return new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (!signal) {
              reject(new Error("missing abort signal"));
              return;
            }
            signal.addEventListener(
              "abort",
              () => {
                abortObserved = true;
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
              },
              { once: true },
            );
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    let thrown: unknown;
    try {
      await client.executeSkillRunnerJob(
        {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          skill_source: "installed",
          fetch_type: "result",
        },
        {
          engine: "gemini",
        },
      );
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, Error);
    assert.match(String((thrown as Error).message), /timed out after 5ms/);
    assert.equal((thrown as Error).name, "SkillRunnerHttpTimeoutError");
    assert.equal(createCalls, 1);
    assert.isTrue(abortObserved);
  });

  it("parses namespaced result.json from SkillRunner bundle terminal result", async function () {
    const bundleBytes = createZipFromNamedFiles([
      {
        name: "result/literature-analysis.1/result.json",
        data: new TextEncoder().encode(
          JSON.stringify({ digest_path: "result/digest.md" }),
        ),
      },
      {
        name: "result/result.json",
        data: new TextEncoder().encode(JSON.stringify({ legacy: true })),
      },
    ]);
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
    });

    const result = await (client as any).normalizeBundleTerminalResult({
      requestId: "req-bundle-1",
      skillId: "literature-analysis",
      bundleBytes,
      responseJson: {
        request_id: "req-bundle-1",
        status: "succeeded",
        workspaceDir: "/tmp/workspace",
      },
    });

    assert.deepEqual(result.resultJson, {
      digest_path: "result/digest.md",
    });
    assert.equal(
      result.resultJsonPath,
      "result/literature-analysis.1/result.json",
    );
    assert.equal(result.resultArtifactBasePath, "result/literature-analysis.1");
    assert.equal(result.workspaceDir, "/tmp/workspace");
  });

  it("unwraps SkillRunner /result envelopes into provider resultJson", async function () {
    const resultData = {
      ok: true,
      checks: [{ name: "connectivity", ok: true }],
      failure_code: "",
    };
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs/req-result-envelope/result")) {
          return createJsonResponse({
            request_id: "req-result-envelope",
            result: {
              status: "success",
              data: resultData,
              success_source: "done_signal_payload",
              error: null,
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.fetchRunResultPayload({
      requestId: "req-result-envelope",
      stateJson: {
        request_id: "req-result-envelope",
        status: "succeeded",
        workspaceDir: "/tmp/skillrunner-workspace",
      },
    });

    assert.deepEqual(result.resultJson, resultData);
    assert.equal(result.workspaceDir, "/tmp/skillrunner-workspace");
    assert.deepInclude(result.responseJson as Record<string, unknown>, {
      provider: "skillrunner",
      workspaceDir: "/tmp/skillrunner-workspace",
    });
    assert.deepEqual(
      (result.responseJson as { resultResponseJson?: unknown })
        .resultResponseJson,
      {
        request_id: "req-result-envelope",
        result: {
          status: "success",
          data: resultData,
          success_source: "done_signal_payload",
          error: null,
        },
      },
    );
  });

  it("preserves direct SkillRunner result payloads that contain a result field", async function () {
    const directPayload = {
      ok: true,
      result: {
        label: "business-output",
      },
    };
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs/req-direct-result/result")) {
          return createJsonResponse(directPayload);
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.fetchRunResultPayload({
      requestId: "req-direct-result",
    });

    assert.deepEqual(result.resultJson, directPayload);
  });

  it("emits request-ready progress only after upload succeeds", async function () {
    const progressEvents: Array<{ type: string; requestId?: string }> = [];
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-progress-1" });
        }
        if (url.endsWith("/v1/jobs/req-progress-1/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-progress-1")) {
          return createJsonResponse({
            request_id: "req-progress-1",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-progress-1/result")) {
          return createJsonResponse({
            request_id: "req-progress-1",
            result: {
              status: "success",
              data: {},
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        upload_files: [
          {
            key: "source_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        fetch_type: "result",
      },
      {
        engine: "gemini",
      },
      {
        onProgress: (event) => {
          progressEvents.push({
            type: String(event.type || ""),
            requestId: String(
              (event as { requestId?: unknown }).requestId || "",
            ),
          });
        },
      },
    );

    assert.deepEqual(progressEvents, [
      {
        type: "request-creating",
        requestId: "",
      },
      {
        type: "request-created",
        requestId: "req-progress-1",
      },
      {
        type: "request-uploading",
        requestId: "req-progress-1",
      },
      {
        type: "request-ready",
        requestId: "req-progress-1",
      },
    ]);
  });

  it("forwards optional inline input to /v1/jobs create body", async function () {
    let capturedCreateBody: unknown;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          capturedCreateBody = JSON.parse(String(init?.body || "{}"));
          return createJsonResponse({ request_id: "req-1" });
        }
        if (url.endsWith("/v1/jobs/req-1/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-1")) {
          return createJsonResponse({
            request_id: "req-1",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-1/result")) {
          return createJsonResponse({
            request_id: "req-1",
            status: "succeeded",
            data: {
              digest_path: "digest.md",
              references_path: "references.json",
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        upload_files: [
          {
            key: "source_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        parameter: { mode: "strict" },
        input: {
          source_path: "inputs/source_path/example.md",
          metadata: { parentKey: "AAA111" },
          valid_tags: ["alpha", "beta"],
        },
        fetch_type: "result",
      },
      {
        engine: "gemini",
      },
    );

    assert.equal(result.status, "succeeded");
    assert.equal(result.fetchType, "result");
    assert.deepEqual(
      (capturedCreateBody as { input?: unknown })?.input,
      {
        source_path: "inputs/source_path/example.md",
        metadata: { parentKey: "AAA111" },
        valid_tags: ["alpha", "beta"],
      },
      `capturedCreateBody=${JSON.stringify(capturedCreateBody)}`,
    );
    assert.deepEqual(
      (capturedCreateBody as { parameter?: unknown })?.parameter,
      { mode: "strict" },
      `capturedCreateBody=${JSON.stringify(capturedCreateBody)}`,
    );
  });

  it("sends provider_id, model, and effort as separate fields in create body", async function () {
    let capturedCreateBody: unknown;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          capturedCreateBody = JSON.parse(String(init?.body || "{}"));
          return createJsonResponse({ request_id: "req-provider-id" });
        }
        if (url.endsWith("/v1/jobs/req-provider-id")) {
          return createJsonResponse({
            request_id: "req-provider-id",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-provider-id/result")) {
          return createJsonResponse({
            request_id: "req-provider-id",
            status: "succeeded",
            data: {},
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        fetch_type: "result",
      },
      {
        engine: "opencode",
        provider_id: "openai",
        model: "gpt-5",
        effort: "high",
      },
    );

    assert.deepEqual(capturedCreateBody, {
      skill_id: "tag-regulator",
      engine: "opencode",
      provider_id: "openai",
      model: "gpt-5",
      effort: "high",
      input: {
        source_path: "inputs/source_path/example.md",
      },
      parameter: {},
      runtime_options: {
        execution_mode: "auto",
      },
    });
  });

  it("uses temp_upload create body and multipart skill_package for local-package source without FormData", async function () {
    const originalFormData = (globalThis as { FormData?: unknown }).FormData;
    const originalBlob = (globalThis as { Blob?: unknown }).Blob;
    (globalThis as { FormData?: unknown }).FormData = undefined;
    (globalThis as { Blob?: unknown }).Blob = undefined;

    let capturedCreateBody: Record<string, unknown> = {};
    const capturedUpload: {
      headers?: Record<string, string>;
      bodyBytes?: Uint8Array;
    } = {};

    try {
      const client = new SkillRunnerClient({
        baseUrl: "http://127.0.0.1:8030",
        fetchImpl: async (url: string, init?: RequestInit) => {
          if (url.endsWith("/v1/jobs")) {
            capturedCreateBody = JSON.parse(String(init?.body || "{}"));
            return createJsonResponse({ request_id: "req-temp-upload" });
          }
          if (url.endsWith("/v1/jobs/req-temp-upload/upload")) {
            capturedUpload.headers = (init?.headers || {}) as Record<
              string,
              string
            >;
            const body = init?.body as Uint8Array;
            capturedUpload.bodyBytes =
              body instanceof Uint8Array ? body : new Uint8Array();
            return createJsonResponse({ ok: true });
          }
          if (url.endsWith("/v1/jobs/req-temp-upload")) {
            return createJsonResponse({
              request_id: "req-temp-upload",
              status: "succeeded",
            });
          }
          if (url.endsWith("/v1/jobs/req-temp-upload/result")) {
            return createJsonResponse({
              request_id: "req-temp-upload",
              status: "succeeded",
              data: {},
            });
          }
          return createJsonResponse({ error: "unexpected route" }, 404);
        },
      });

      await client.executeSkillRunnerJob(
        {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          input: {
            source_path: "inputs/source_path/example.md",
          },
          upload_files: [
            {
              key: "source_path",
              path: fixturePath("literature-analysis", "example.md"),
            },
          ],
          fetch_type: "result",
        },
        {
          engine: "gemini",
        },
      );

      assert.equal(capturedCreateBody.skill_source, "temp_upload");
      assert.notProperty(capturedCreateBody, "skill_id");
      const contentType = String(
        capturedUpload.headers?.["content-type"] || "",
      );
      assert.match(contentType, /^multipart\/form-data;\s*boundary=/);
      const uploadText = new TextDecoder().decode(capturedUpload.bodyBytes);
      assert.include(uploadText, 'name="skill_package"');
      assert.include(uploadText, 'filename="skill_package.zip"');
      assert.include(uploadText, 'name="file"');
      assert.include(uploadText, 'filename="inputs.zip"');
    } finally {
      (globalThis as { FormData?: unknown }).FormData = originalFormData;
      (globalThis as { Blob?: unknown }).Blob = originalBlob;
    }
  });

  it("uses native FormData for local-package skill and input zip fields", async function () {
    const originalFormData = (globalThis as { FormData?: unknown }).FormData;
    const originalBlob = (globalThis as { Blob?: unknown }).Blob;
    class MockBlob {
      parts: unknown[];

      constructor(parts: unknown[]) {
        this.parts = parts;
      }
    }
    class MockFormData {
      fields: Array<{ name: string; filename?: string; value: unknown }> = [];

      append(name: string, value: unknown, filename?: string) {
        this.fields.push({ name, filename, value });
      }
    }
    (globalThis as { FormData?: unknown }).FormData = MockFormData;
    (globalThis as { Blob?: unknown }).Blob = MockBlob;

    let capturedCreateBody: Record<string, unknown> = {};
    let capturedUploadBody: MockFormData | null = null;

    try {
      const client = new SkillRunnerClient({
        baseUrl: "http://127.0.0.1:8030",
        fetchImpl: async (url: string, init?: RequestInit) => {
          if (url.endsWith("/v1/jobs")) {
            capturedCreateBody = JSON.parse(String(init?.body || "{}"));
            return createJsonResponse({ request_id: "req-native-form" });
          }
          if (url.endsWith("/v1/jobs/req-native-form/upload")) {
            capturedUploadBody = init?.body as unknown as MockFormData;
            return createJsonResponse({ ok: true });
          }
          if (url.endsWith("/v1/jobs/req-native-form")) {
            return createJsonResponse({
              request_id: "req-native-form",
              status: "succeeded",
            });
          }
          if (url.endsWith("/v1/jobs/req-native-form/result")) {
            return createJsonResponse({
              request_id: "req-native-form",
              status: "succeeded",
              data: {},
            });
          }
          return createJsonResponse({ error: "unexpected route" }, 404);
        },
      });

      await client.executeSkillRunnerJob(
        {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          input: {
            source_path: "inputs/source_path/example.md",
          },
          upload_files: [
            {
              key: "source_path",
              path: fixturePath("literature-analysis", "example.md"),
            },
          ],
          fetch_type: "result",
        },
        {
          engine: "gemini",
        },
      );

      assert.equal(capturedCreateBody.skill_source, "temp_upload");
      assert.notProperty(capturedCreateBody, "skill_id");
      assert.deepEqual(
        capturedUploadBody?.fields.map((field) => ({
          name: field.name,
          filename: field.filename,
        })),
        [
          { name: "skill_package", filename: "skill_package.zip" },
          { name: "file", filename: "inputs.zip" },
        ],
      );
    } finally {
      (globalThis as { FormData?: unknown }).FormData = originalFormData;
      (globalThis as { Blob?: unknown }).Blob = originalBlob;
    }
  });

  it("omits no_cache for interactive execution and keeps interactive options", async function () {
    let capturedCreateBody: unknown;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          capturedCreateBody = JSON.parse(String(init?.body || "{}"));
          return createJsonResponse({ request_id: "req-merge-options" });
        }
        if (url.endsWith("/v1/jobs/req-merge-options/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-merge-options")) {
          return createJsonResponse({
            request_id: "req-merge-options",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-merge-options/result")) {
          return createJsonResponse({
            request_id: "req-merge-options",
            result: {
              status: "success",
              data: {},
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        upload_files: [
          {
            key: "source_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        runtime_options: {
          execution_mode: "interactive",
        },
        fetch_type: "result",
      },
      {
        engine: "gemini",
        no_cache: true,
        interactive_auto_reply: true,
        hard_timeout_seconds: 900,
      },
    );

    assert.deepEqual(
      (capturedCreateBody as { runtime_options?: unknown })?.runtime_options,
      {
        execution_mode: "interactive",
        interactive_auto_reply: true,
        hard_timeout_seconds: 900,
      },
      `capturedCreateBody=${JSON.stringify(capturedCreateBody)}`,
    );
  });

  it("keeps no_cache for auto execution and drops interactive_auto_reply", async function () {
    let capturedCreateBody: unknown;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          capturedCreateBody = JSON.parse(String(init?.body || "{}"));
          return createJsonResponse({ request_id: "req-auto-options" });
        }
        if (url.endsWith("/v1/jobs/req-auto-options/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-auto-options")) {
          return createJsonResponse({
            request_id: "req-auto-options",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-auto-options/result")) {
          return createJsonResponse({
            request_id: "req-auto-options",
            result: {
              status: "success",
              data: {},
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        upload_files: [
          {
            key: "source_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        runtime_options: {
          execution_mode: "auto",
        },
        fetch_type: "result",
      },
      {
        engine: "gemini",
        no_cache: true,
        interactive_auto_reply: true,
        hard_timeout_seconds: "1200",
      },
    );

    assert.deepEqual(
      (capturedCreateBody as { runtime_options?: unknown })?.runtime_options,
      {
        execution_mode: "auto",
        no_cache: true,
        hard_timeout_seconds: 1200,
      },
      `capturedCreateBody=${JSON.stringify(capturedCreateBody)}`,
    );
  });

  it("supports inline-only skillrunner request without upload step", async function () {
    let uploadCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string, init?: RequestInit) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-inline-only" });
        }
        if (url.endsWith("/v1/jobs/req-inline-only/upload")) {
          uploadCalled = true;
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-inline-only")) {
          return createJsonResponse({
            request_id: "req-inline-only",
            status: "succeeded",
          });
        }
        if (url.endsWith("/v1/jobs/req-inline-only/result")) {
          return createJsonResponse({
            request_id: "req-inline-only",
            result: {
              status: "success",
              data: {},
              error: null,
            },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          metadata: { parentKey: "AAA111" },
          input_tags: ["topic:test"],
        },
        fetch_type: "result",
      },
      {
        engine: "gemini",
      },
    );

    assert.equal(result.status, "succeeded");
    assert.equal(result.fetchType, "result");
    assert.isFalse(
      uploadCalled,
      "upload step should be skipped for inline-only payload",
    );
  });

  it("uploads using multipart bytes when FormData is unavailable", async function () {
    const originalFormData = (globalThis as { FormData?: unknown }).FormData;
    const originalBlob = (globalThis as { Blob?: unknown }).Blob;

    (globalThis as { FormData?: unknown }).FormData = undefined;
    (globalThis as { Blob?: unknown }).Blob = undefined;

    const capturedUpload: {
      headers?: Record<string, string>;
      bodyBytes?: Uint8Array;
    } = {};

    try {
      const client = new SkillRunnerClient({
        baseUrl: "http://127.0.0.1:8030",
        fetchImpl: async (url: string, init?: RequestInit) => {
          if (url.endsWith("/v1/jobs")) {
            return createJsonResponse({ request_id: "req-1" });
          }
          if (url.endsWith("/v1/jobs/req-1/upload")) {
            capturedUpload.headers = (init?.headers || {}) as Record<
              string,
              string
            >;
            const body = init?.body as Uint8Array;
            capturedUpload.bodyBytes =
              body instanceof Uint8Array ? body : new Uint8Array();
            return createJsonResponse({ ok: true });
          }
          if (url.endsWith("/v1/jobs/req-1")) {
            return createJsonResponse({
              request_id: "req-1",
              status: "succeeded",
            });
          }
          if (url.endsWith("/v1/jobs/req-1/result")) {
            return createJsonResponse({
              request_id: "req-1",
              status: "succeeded",
              data: {
                digest_path: "digest.md",
                references_path: "references.json",
              },
            });
          }
          return createJsonResponse({ error: "unexpected route" }, 404);
        },
      });

      const result = await client.executeHttpSteps({
        kind: "http.steps",
        poll: { interval_ms: 0, timeout_ms: 1000 },
        steps: [
          {
            id: "create",
            request: {
              method: "POST",
              path: "/v1/jobs",
              json: {
                skill_id: "literature-analysis",
                engine: "gemini",
                parameter: { language: "en-US" },
              },
            },
            extract: { request_id: "$.request_id" },
          },
          {
            id: "upload",
            request: {
              method: "POST",
              path: "/v1/jobs/{request_id}/upload",
              multipart: true,
            },
            files: [
              {
                key: "inputs/source_path/Li 等 - 2022 - DN-DETR Accelerate DETR Training by Introducing Query DeNoising.md",
                path: fixturePath(
                  "selection-context",
                  "attachments/7YXZJKNL/Li 等 - 2022 - DN-DETR Accelerate DETR Training by Introducing Query DeNoising.md",
                ),
              },
            ],
          },
          {
            id: "poll",
            request: {
              method: "GET",
              path: "/v1/jobs/{request_id}",
            },
          },
          {
            id: "result",
            request: {
              method: "GET",
              path: "/v1/jobs/{request_id}/result",
            },
          },
        ],
      });

      assert.equal(result.status, "succeeded");
      assert.equal(result.fetchType, "result");
      const contentType = String(
        capturedUpload.headers?.["content-type"] || "",
      );
      assert.match(contentType, /^multipart\/form-data;\s*boundary=/);
      const uploadText = new TextDecoder().decode(capturedUpload.bodyBytes);
      assert.include(uploadText, 'name="file"');
      assert.include(uploadText, 'filename="inputs.zip"');
      const zipFlag = readZipGeneralPurposeFlagFromMultipart(
        capturedUpload.bodyBytes || new Uint8Array(),
      );
      assert.equal(
        zipFlag & 0x0800,
        0x0800,
        "zip entry names must set UTF-8 filename flag (bit 11)",
      );
    } finally {
      (globalThis as { FormData?: unknown }).FormData = originalFormData;
      (globalThis as { Blob?: unknown }).Blob = originalBlob;
    }
  });

  it("returns terminal failed after upload succeeds and backend fails", async function () {
    let pollCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-failed" });
        }
        if (url.endsWith("/v1/jobs/req-failed/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-failed")) {
          pollCalled = true;
          return createJsonResponse({
            request_id: "req-failed",
            status: "failed",
            error: "mock backend failed",
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          md_path: "inputs/md_path/example.md",
        },
        upload_files: [
          {
            key: "md_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        fetch_type: "result",
      },
      { engine: "gemini" },
    );

    assert.equal(result.status, "failed");
    assert.equal(result.error, "mock backend failed");
    assert.isTrue(pollCalled);
  });

  it("times out while polling non-terminal backend state", async function () {
    let pollCount = 0;
    let resultFetchCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-submit-only" });
        }
        if (url.endsWith("/v1/jobs/req-submit-only")) {
          pollCount += 1;
          return createJsonResponse({
            request_id: "req-submit-only",
            status: "queued",
          });
        }
        if (url.endsWith("/v1/jobs/req-submit-only/result")) {
          resultFetchCalled = true;
          return createJsonResponse({
            result: { status: "success", data: {} },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    let rejected: unknown;
    try {
      await client.executeHttpSteps({
        kind: "http.steps",
        poll: { interval_ms: 0, timeout_ms: 5 },
        steps: [
          {
            id: "create",
            request: {
              method: "POST",
              path: "/v1/jobs",
              json: {
                skill_id: "literature-analysis",
                engine: "gemini",
              },
            },
            extract: { request_id: "$.request_id" },
          },
          {
            id: "poll",
            request: {
              method: "GET",
              path: "/v1/jobs/{request_id}",
            },
          },
          {
            id: "result",
            request: {
              method: "GET",
              path: "/v1/jobs/{request_id}/result",
            },
          },
        ],
      });
    } catch (error) {
      rejected = error;
    }

    assert.instanceOf(rejected, SkillRunnerPollingTimeoutError);
    assert.isAtLeast(pollCount, 1);
    assert.isFalse(resultFetchCalled);
  });

  it("detaches foreground interactive waiting_user without result fetch", async function () {
    let pollCount = 0;
    let resultFetchCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-waiting-user" });
        }
        if (url.endsWith("/v1/jobs/req-waiting-user/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-waiting-user")) {
          pollCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return createJsonResponse({
            request_id: "req-waiting-user",
            status: "waiting_user",
          });
        }
        if (url.endsWith("/v1/jobs/req-waiting-user/result")) {
          resultFetchCalled = true;
          return createJsonResponse({
            request_id: "req-waiting-user",
            result: { status: "success", data: {} },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "literature-explainer",
        skill_source: "installed",
        input: {
          source_path: "inputs/source_path/example.md",
        },
        upload_files: [
          {
            key: "source_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        runtime_options: {
          execution_mode: "interactive",
        },
        poll: {
          interval_ms: 0,
          timeout_ms: 1,
        },
        fetch_type: "result",
      },
      { engine: "gemini" },
    );

    assert.equal(result.status, "deferred");
    if (result.status === "deferred") {
      assert.equal(result.backendStatus, "waiting_user");
      assert.equal(result.detachReason, "waiting");
      assert.equal(result.continuationOwner, "foreground");
    }
    assert.isAtLeast(pollCount, 1);
    assert.isFalse(
      resultFetchCalled,
      "result fetch should wait for terminal success",
    );
  });

  it("returns canceled terminal state without fetching result", async function () {
    let pollCalled = false;
    let resultFetchCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-canceled" });
        }
        if (url.endsWith("/v1/jobs/req-canceled/upload")) {
          return createJsonResponse({ ok: true });
        }
        if (url.endsWith("/v1/jobs/req-canceled")) {
          pollCalled = true;
          return createJsonResponse({
            request_id: "req-canceled",
            status: "canceled",
            error: "canceled by mock",
          });
        }
        if (url.endsWith("/v1/jobs/req-canceled/result")) {
          resultFetchCalled = true;
          return createJsonResponse({
            request_id: "req-canceled",
            result: { status: "success", data: {} },
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    const result = await client.executeSkillRunnerJob(
      {
        kind: "skillrunner.job.v1",
        skill_id: "tag-regulator",
        skill_source: "installed",
        input: {
          md_path: "inputs/md_path/example.md",
        },
        upload_files: [
          {
            key: "md_path",
            path: fixturePath("literature-analysis", "example.md"),
          },
        ],
        fetch_type: "result",
      },
      { engine: "gemini" },
    );

    assert.equal(result.status, "canceled");
    assert.equal(result.error, "canceled by mock");
    assert.isTrue(pollCalled);
    assert.isFalse(resultFetchCalled, "result fetch should be skipped");
  });

  it("throws structured run-level client error when post-create upload is rejected", async function () {
    const progressEvents: Array<{ type: string; requestId?: string }> = [];
    let pollCalled = false;
    const client = new SkillRunnerClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url: string) => {
        if (url.endsWith("/v1/jobs")) {
          return createJsonResponse({ request_id: "req-upload-rejected" });
        }
        if (url.endsWith("/v1/jobs/req-upload-rejected/upload")) {
          return createJsonResponse({ detail: "invalid skill package" }, 422);
        }
        if (url.endsWith("/v1/jobs/req-upload-rejected")) {
          pollCalled = true;
          return createJsonResponse({
            request_id: "req-upload-rejected",
            status: "running",
          });
        }
        return createJsonResponse({ error: "unexpected route" }, 404);
      },
    });

    let thrown: unknown = null;
    try {
      await client.executeSkillRunnerJob(
        {
          kind: "skillrunner.job.v1",
          skill_id: "tag-regulator",
          skill_source: "installed",
          input: {
            md_path: "inputs/md_path/example.md",
          },
          upload_files: [
            {
              key: "md_path",
              path: fixturePath("literature-analysis", "example.md"),
            },
          ],
          fetch_type: "result",
        },
        { engine: "gemini" },
        {
          onProgress: (event) => {
            progressEvents.push({
              type: String(event.type || ""),
              requestId: String(
                (event as { requestId?: unknown }).requestId || "",
              ),
            });
          },
        },
      );
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, SkillRunnerHttpError);
    assert.equal((thrown as SkillRunnerHttpError).status, 422);
    assert.deepEqual(progressEvents, [
      {
        type: "request-creating",
        requestId: "",
      },
      {
        type: "request-created",
        requestId: "req-upload-rejected",
      },
      {
        type: "request-uploading",
        requestId: "req-upload-rejected",
      },
    ]);
    assert.isFalse(
      pollCalled,
      "polling should not continue after upload rejection",
    );
  });
});

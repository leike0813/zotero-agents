import { assert } from "chai";
import type { BackendInstance } from "../../../src/backends/types";
import { DEFAULT_BACKEND_TYPE } from "../../../src/config/defaults";
import {
  assertSkillRunnerBackendSupportsProtocol,
  resetSkillRunnerHandshakeCacheForTests,
  resolveRequiredSkillRunnerProtocolForExecution,
  resolveSkillRunnerBackendCapabilities,
} from "../../../src/modules/skillRunnerHandshake";
import {
  createLegacySkillRunnerCapabilities,
  SKILLRUNNER_JOB_PROTOCOL,
  SKILLRUNNER_SEQUENCE_PROTOCOL,
  type SkillRunnerBackendCapabilities,
} from "../../../src/modules/skillRunnerHandshakeProtocol";
import { SkillRunnerHttpError } from "../../../src/providers/skillrunner/errors";
import type { SkillRunnerManagementClient } from "../../../src/providers/skillrunner/managementClient";
import { SkillRunnerProvider } from "../../../src/providers/skillrunner/provider";

function backend(args?: Partial<BackendInstance>): BackendInstance {
  return {
    id: "backend-handshake",
    type: DEFAULT_BACKEND_TYPE,
    baseUrl: "http://127.0.0.1:8030",
    enabled: true,
    ...args,
  };
}

function remoteCapabilities(
  protocols: Record<string, { supported: boolean }>,
): SkillRunnerBackendCapabilities {
  return {
    source: "remote",
    backend: {
      name: "Skill-Runner",
      version: "0.7.3",
    },
    protocols,
  };
}

describe("skillrunner handshake capabilities", function () {
  afterEach(function () {
    resetSkillRunnerHandshakeCacheForTests();
  });

  it("resolves remote capabilities and caches by backend id plus baseUrl", async function () {
    let handshakeCount = 0;
    const client = {
      handshake: async () => {
        handshakeCount += 1;
        return remoteCapabilities({
          [SKILLRUNNER_JOB_PROTOCOL]: {
            supported: true,
          },
        });
      },
    } as unknown as SkillRunnerManagementClient;
    const firstBackend = backend();
    const first = await resolveSkillRunnerBackendCapabilities({
      backend: firstBackend,
      client,
    });
    const second = await resolveSkillRunnerBackendCapabilities({
      backend: firstBackend,
      client,
    });
    const third = await resolveSkillRunnerBackendCapabilities({
      backend: backend({ baseUrl: "http://127.0.0.1:8031" }),
      client,
    });

    assert.equal(first.source, "remote");
    assert.equal(second.source, "remote");
    assert.equal(third.source, "remote");
    assert.equal(handshakeCount, 2);
  });

  it("uses legacy capabilities when handshake endpoint is missing but ping is reachable", async function () {
    let probeCount = 0;
    const client = {
      handshake: async () => {
        throw new SkillRunnerHttpError({
          message: "missing",
          status: 404,
          path: "/v1/system/handshake",
        });
      },
      probeReachability: async () => {
        probeCount += 1;
      },
    } as unknown as SkillRunnerManagementClient;

    const capabilities = await resolveSkillRunnerBackendCapabilities({
      backend: backend(),
      client,
    });

    assert.equal(probeCount, 1);
    assert.equal(capabilities.source, "legacy-fallback");
    assert.equal(
      capabilities.protocols[SKILLRUNNER_JOB_PROTOCOL]?.supported,
      true,
    );
    assert.equal(
      capabilities.protocols[SKILLRUNNER_SEQUENCE_PROTOCOL]?.supported,
      false,
    );
  });

  it("does not convert auth failures into legacy capabilities", async function () {
    let probeCount = 0;
    const client = {
      handshake: async () => {
        throw new SkillRunnerHttpError({
          message: "unauthorized",
          status: 401,
          path: "/v1/system/handshake",
        });
      },
      probeReachability: async () => {
        probeCount += 1;
      },
    } as unknown as SkillRunnerManagementClient;

    let thrown: unknown;
    try {
      await resolveSkillRunnerBackendCapabilities({
        backend: backend(),
        client,
      });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, SkillRunnerHttpError);
    assert.equal(probeCount, 0);
  });

  it("maps current sequence execution to the job protocol requirement", function () {
    assert.equal(
      resolveRequiredSkillRunnerProtocolForExecution({
        requestKind: SKILLRUNNER_SEQUENCE_PROTOCOL,
      }),
      SKILLRUNNER_JOB_PROTOCOL,
    );
  });

  it("fails preflight when a required protocol is unsupported", function () {
    const capabilities = createLegacySkillRunnerCapabilities();

    assert.throws(
      () =>
        assertSkillRunnerBackendSupportsProtocol({
          backend: backend(),
          capabilities,
          protocolId: SKILLRUNNER_SEQUENCE_PROTOCOL,
        }),
      /不支持该执行协议/,
    );
  });

  it("blocks provider submission before creating a job when job protocol is unsupported", async function () {
    const runtime = globalThis as { fetch?: typeof fetch };
    const originalFetch = runtime.fetch;
    const calls: Array<{ url: string; method: string }> = [];
    runtime.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method || "GET");
      calls.push({ url, method });
      if (url.endsWith("/v1/system/handshake")) {
        return new Response(
          JSON.stringify({
            schema: "zotero-agents.skillrunner-handshake.response.v1",
            backend: {
              name: "Skill-Runner",
              version: "0.7.3",
            },
            protocols: {
              [SKILLRUNNER_JOB_PROTOCOL]: {
                supported: false,
              },
              [SKILLRUNNER_SEQUENCE_PROTOCOL]: {
                supported: false,
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response(JSON.stringify({ request_id: "unexpected" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;
    try {
      const provider = new SkillRunnerProvider();
      let thrown: unknown;
      try {
        await provider.execute({
          requestKind: SKILLRUNNER_JOB_PROTOCOL,
          backend: backend({
            id: "backend-provider-preflight",
            baseUrl: "http://127.0.0.1:8032",
          }),
          request: {
            kind: SKILLRUNNER_JOB_PROTOCOL,
            skill_id: "example",
            input: {},
          },
        });
      } catch (error) {
        thrown = error;
      }

      assert.instanceOf(thrown, Error);
      assert.match(String((thrown as Error).message), /不支持该执行协议/);
      assert.deepEqual(
        calls.map((entry) => `${entry.method} ${new URL(entry.url).pathname}`),
        ["POST /v1/system/handshake"],
      );
    } finally {
      runtime.fetch = originalFetch;
    }
  });

  it("allows provider job submission when job protocol is supported", async function () {
    const runtime = globalThis as { fetch?: typeof fetch };
    const originalFetch = runtime.fetch;
    const calls: Array<{ url: string; method: string }> = [];
    runtime.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method || "GET");
      const pathname = new URL(url).pathname;
      calls.push({ url, method });
      if (pathname === "/v1/system/handshake") {
        return new Response(
          JSON.stringify({
            schema: "zotero-agents.skillrunner-handshake.response.v1",
            backend: {
              name: "Skill-Runner",
              version: "0.7.3",
            },
            protocols: {
              [SKILLRUNNER_JOB_PROTOCOL]: {
                supported: true,
              },
              [SKILLRUNNER_SEQUENCE_PROTOCOL]: {
                supported: false,
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      if (pathname === "/v1/jobs" && method === "POST") {
        return new Response(JSON.stringify({ request_id: "job-1" }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        });
      }
      if (pathname === "/v1/jobs/job-1") {
        return new Response(
          JSON.stringify({
            request_id: "job-1",
            status: "succeeded",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      if (pathname === "/v1/jobs/job-1/result") {
        return new Response(
          JSON.stringify({
            request_id: "job-1",
            result: {
              status: "success",
              data: {
                ok: true,
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;
    try {
      const provider = new SkillRunnerProvider();
      const result = await provider.execute({
        requestKind: SKILLRUNNER_JOB_PROTOCOL,
        backend: backend({
          id: "backend-provider-supported",
          baseUrl: "http://127.0.0.1:8033",
        }),
        request: {
          kind: SKILLRUNNER_JOB_PROTOCOL,
          skill_id: "example",
          skill_source: "installed",
          fetch_type: "result",
          input: {},
        },
      });

      assert.equal(result.status, "succeeded");
      assert.equal(result.requestId, "job-1");
      assert.deepEqual(
        calls.map((entry) => `${entry.method} ${new URL(entry.url).pathname}`),
        [
          "POST /v1/system/handshake",
          "POST /v1/jobs",
          "GET /v1/jobs/job-1",
          "GET /v1/jobs/job-1/result",
        ],
      );
    } finally {
      runtime.fetch = originalFetch;
    }
  });
});

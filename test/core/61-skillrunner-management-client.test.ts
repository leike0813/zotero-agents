import { assert } from "chai";
import {
  SkillRunnerManagementClient,
  isAbortErrorLike,
  type SkillRunnerManagementSseFrame,
} from "../../src/providers/skillrunner/managementClient";
import { SkillRunnerHttpError } from "../../src/providers/skillrunner/errors";
import { resolveSkillRunnerManagementResponseSemantic } from "../../src/modules/skillRunnerRunSettlement";

describe("skillrunner management client", function () {
  it("classifies accepted=false terminal cancel responses as terminal reconciliation", function () {
    const semantic = resolveSkillRunnerManagementResponseSemantic({
      response: {
        request_id: "req-1",
        status: "SUCCEEDED",
        accepted: false,
        message: "already in terminal state",
      },
      fallbackStatus: "running",
    });

    assert.equal(semantic.accepted, false);
    assert.equal(semantic.status, "succeeded");
    assert.equal(semantic.terminalStatus, "succeeded");
    assert.isUndefined(semantic.nonTerminalStatus);
    assert.equal(semantic.shouldClearPending, true);
    assert.equal(semantic.message, "already in terminal state");
  });

  it("keeps accepted=false non-terminal cancel responses non-terminal", function () {
    const semantic = resolveSkillRunnerManagementResponseSemantic({
      response: {
        request_id: "req-2",
        status: "running",
        accepted: false,
        reason: "run is not cancelable",
      },
      fallbackStatus: "waiting_user",
    });

    assert.equal(semantic.accepted, false);
    assert.equal(semantic.status, "running");
    assert.equal(semantic.nonTerminalStatus, "running");
    assert.isUndefined(semantic.terminalStatus);
    assert.equal(semantic.shouldClearPending, true);
    assert.equal(semantic.message, "run is not cancelable");
  });

  it("classifies pending=null with a non-waiting status as stale pending", function () {
    const semantic = resolveSkillRunnerManagementResponseSemantic({
      response: {
        request_id: "req-3",
        status: "queued",
        pending: null,
      },
      fallbackStatus: "waiting_user",
    });

    assert.equal(semantic.status, "queued");
    assert.equal(semantic.hasPendingField, true);
    assert.equal(semantic.hasPendingPayload, false);
    assert.equal(semantic.shouldClearPending, true);
  });

  it("retries once with prompted basic auth on 401", async function () {
    const calls: Array<{ url: string; auth?: string | null }> = [];
    let count = 0;
    let savedAuth: unknown;
    const fetchImpl = async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        auth: headers.get("authorization"),
      });
      count += 1;
      if (count === 1) {
        return new Response("unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        });
      }
      return new Response(
        JSON.stringify({
          runs: [],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
      promptBasicAuth: async () => ({
        username: "admin",
        password: "secret",
      }),
      saveManagementAuth: (auth) => {
        savedAuth = auth;
      },
      getManagementAuth: () => ({
        kind: "none",
      }),
    });

    const runs = await client.listRuns();
    assert.deepEqual(runs, { runs: [] });
    assert.lengthOf(calls, 2);
    assert.isNull(calls[0].auth);
    assert.match(String(calls[1].auth || ""), /^Basic\s+/i);
    assert.deepEqual(savedAuth, {
      kind: "basic",
      username: "admin",
      password: "secret",
    });
  });

  it("uses HEAD-only reachability probe by default and releases successful response bodies", async function () {
    const methods: string[] = [];
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ok"));
      },
      cancel() {
        canceled = true;
      },
    });
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (_url, init) => {
        methods.push(String(init?.method || "GET"));
        return new Response(stream, { status: 200 });
      },
    });

    await client.probeReachability();

    assert.deepEqual(methods, ["HEAD"]);
    assert.isTrue(canceled);
  });

  it("uses GET reachability fallback only when explicitly allowed", async function () {
    const methods: string[] = [];
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (_url, init) => {
        const method = String(init?.method || "GET");
        methods.push(method);
        if (method === "HEAD") {
          return new Response("no head", { status: 405 });
        }
        return new Response("ok", { status: 200 });
      },
    });

    await client.probeReachability({ allowGetFallback: true });

    assert.deepEqual(methods, ["HEAD", "GET"]);
  });

  it("posts handshake requests with the stable schema and requested protocols", async function () {
    const requests: Array<{ url: string; method: string; body: unknown }> = [];
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async (url, init) => {
        requests.push({
          url,
          method: String(init?.method || "GET"),
          body: JSON.parse(String(init?.body || "{}")),
        });
        return new Response(
          JSON.stringify({
            schema: "zotero-agents.skillrunner-handshake.response.v1",
            backend: {
              name: "Skill-Runner",
              version: "0.7.3",
            },
            protocols: {
              "skillrunner.job.v1": {
                supported: true,
              },
              "skillrunner.sequence.v1": {
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
      },
    });

    const capabilities = await client.handshake({
      requestedProtocols: ["skillrunner.job.v1", "skillrunner.sequence.v1"],
    });

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].url, "http://127.0.0.1:8030/v1/system/handshake");
    assert.equal(requests[0].method, "POST");
    assert.deepInclude(requests[0].body as Record<string, unknown>, {
      schema: "zotero-agents.skillrunner-handshake.request.v1",
    });
    assert.deepEqual(
      (requests[0].body as { requested_protocols?: unknown })
        .requested_protocols,
      ["skillrunner.job.v1", "skillrunner.sequence.v1"],
    );
    assert.equal(capabilities.source, "remote");
    assert.equal(capabilities.backend?.version, "0.7.3");
    assert.equal(capabilities.protocols["skillrunner.job.v1"]?.supported, true);
  });

  it("parses SSE chat frames", async function () {
    const frames: SkillRunnerManagementSseFrame[] = [];
    const urls: string[] = [];
    const payload =
      "event: snapshot\n" +
      'data: {"status":"running","cursor":0}\n\n' +
      "event: chat_event\n" +
      'data: {"seq":1,"text":"hello"}\n\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": "text/event-stream",
        },
      });
    };

    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });
    await client.streamRunChat({
      requestId: "req-1",
      onFrame: (frame) => {
        frames.push(frame);
      },
    });

    assert.lengthOf(frames, 2);
    assert.equal(frames[0].event, "snapshot");
    assert.deepEqual(frames[1].data, {
      seq: 1,
      text: "hello",
    });
    assert.equal(urls[0], "http://127.0.0.1:8030/v1/jobs/req-1/chat?cursor=0");
  });

  it("parses CRLF-delimited SSE chat frames", async function () {
    const frames: SkillRunnerManagementSseFrame[] = [];
    const payload =
      "event: snapshot\r\n" +
      'data: {"status":"running","cursor":0}\r\n\r\n' +
      "event: chat_event\r\n" +
      'data: {"seq":2,"text":"hello crlf"}\r\n\r\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async () =>
        new Response(stream, {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
          },
        }),
    });

    await client.streamRunChat({
      requestId: "req-1",
      onFrame: (frame) => {
        frames.push(frame);
      },
    });

    assert.lengthOf(frames, 2);
    assert.equal(frames[1].event, "chat_event");
    assert.deepEqual(frames[1].data, {
      seq: 2,
      text: "hello crlf",
    });
  });

  it("parses SSE event frames from jobs events endpoint", async function () {
    const frames: SkillRunnerManagementSseFrame[] = [];
    const urls: string[] = [];
    const payload =
      "event: snapshot\n" +
      'data: {"status":"running","cursor":8}\n\n' +
      "event: chat_event\n" +
      'data: {"type":"conversation.state.changed","data":{"to":"waiting_user"}}\n\n';
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const fetchImpl = async (url: string) => {
      urls.push(url);
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": "text/event-stream",
        },
      });
    };
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });
    await client.streamRunEvents({
      requestId: "req-1",
      cursor: 8,
      onFrame: (frame) => {
        frames.push(frame);
      },
    });
    assert.lengthOf(frames, 2);
    assert.equal(frames[0].event, "snapshot");
    assert.equal(frames[1].event, "chat_event");
    assert.equal(
      urls[0],
      "http://127.0.0.1:8030/v1/jobs/req-1/events?cursor=8",
    );
  });

  it("passes abort signals into stream requests and classifies canceled SSE reads as AbortError", async function () {
    const requests: Array<{ url: string; signal?: AbortSignal }> = [];
    const controller = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      start(bodyController) {
        controller.signal.addEventListener(
          "abort",
          () => {
            bodyController.error(new Error("stream canceled"));
          },
          { once: true },
        );
      },
    });
    const fetchImpl = async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        signal: init?.signal as AbortSignal | undefined,
      });
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": "text/event-stream",
        },
      });
    };
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });
    const task = client.streamRunChat({
      requestId: "req-1",
      signal: controller.signal,
      onFrame: () => {},
    });
    await Promise.resolve();
    controller.abort();
    let rejected: unknown;
    try {
      await task;
    } catch (error) {
      rejected = error;
    }
    assert.instanceOf(requests[0]?.signal, AbortSignal);
    assert.isTrue(requests[0]?.signal?.aborted);
    assert.equal(
      requests[0]?.url,
      "http://127.0.0.1:8030/v1/jobs/req-1/chat?cursor=0",
    );
    assert.isTrue(isAbortErrorLike(rejected));
  });

  it("uses jobs endpoints for run state, pending and history", async function () {
    const requests: Array<{ url: string; method: string }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        method: String(init?.method || "GET"),
      });
      if (url.endsWith("/chat/history?from_seq=2")) {
        return new Response(
          JSON.stringify({
            request_id: "req-2",
            events: [],
            cursor_floor: 2,
            cursor_ceiling: 2,
            source: "jobs",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      if (url.endsWith("/events/history?from_seq=3")) {
        return new Response(
          JSON.stringify({
            request_id: "req-2",
            events: [],
            cursor_floor: 3,
            cursor_ceiling: 3,
            source: "jobs",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response(
        JSON.stringify({
          request_id: "req-2",
          status: "running",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });

    await client.getRun({ requestId: "req-2" });
    await client.getPending({ requestId: "req-2" });
    await client.getAuthSession({ requestId: "req-2" });
    await client.listRunChatHistory({ requestId: "req-2", fromSeq: 2 });
    await client.listRunEventHistory({ requestId: "req-2", fromSeq: 3 });

    assert.deepEqual(
      requests.map((entry) => `${entry.method} ${entry.url}`),
      [
        "GET http://127.0.0.1:8030/v1/jobs/req-2",
        "GET http://127.0.0.1:8030/v1/jobs/req-2/interaction/pending",
        "GET http://127.0.0.1:8030/v1/jobs/req-2/auth/session",
        "GET http://127.0.0.1:8030/v1/jobs/req-2/chat/history?from_seq=2",
        "GET http://127.0.0.1:8030/v1/jobs/req-2/events/history?from_seq=3",
      ],
    );
  });

  it("throws structured HTTP errors with status for run endpoints", async function () {
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async () =>
        new Response(JSON.stringify({ detail: "missing" }), {
          status: 404,
          statusText: "Not Found",
          headers: {
            "content-type": "application/json",
          },
        }),
    });

    let thrown: unknown = null;
    try {
      await client.getRun({ requestId: "req-missing" });
    } catch (error) {
      thrown = error;
    }

    assert.instanceOf(thrown, SkillRunnerHttpError);
    assert.equal((thrown as SkillRunnerHttpError).status, 404);
    assert.equal((thrown as SkillRunnerHttpError).path, "/v1/jobs/req-missing");
  });

  it("passes assistant_revision rows through chat history without reshaping", async function () {
    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            request_id: "req-3",
            events: [
              {
                seq: 4,
                role: "assistant",
                kind: "assistant_revision",
                text: "",
                correlation: {
                  message_id: "f-1",
                  message_family_id: "family-1",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
    });
    const history = await client.listRunChatHistory({
      requestId: "req-3",
    });
    assert.equal(history.events[0]?.kind, "assistant_revision");
    assert.deepEqual(history.events[0]?.correlation, {
      message_id: "f-1",
      message_family_id: "family-1",
    });
  });

  it("posts reply/cancel to management endpoints with stable payload", async function () {
    const requests: Array<{ url: string; method: string; body: string }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      requests.push({
        url,
        method: String(init?.method || "GET"),
        body: String(init?.body || ""),
      });
      if (url.endsWith("/reply")) {
        return new Response(
          JSON.stringify({
            request_id: "req-1",
            status: "waiting_user",
            accepted: true,
            mode: "interaction",
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response(
        JSON.stringify({
          request_id: "req-1",
          run_id: "run-1",
          status: "canceled",
          accepted: true,
          message: "canceled",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });
    const reply = await client.submitReply({
      requestId: "req-1",
      payload: {
        mode: "interaction",
        interaction_id: 3,
        response: "ok",
      },
    });
    const canceled = await client.cancelRun({
      requestId: "req-1",
    });

    assert.equal(reply.accepted, true);
    assert.equal(canceled.accepted, true);
    assert.lengthOf(requests, 2);
    assert.equal(
      requests[0].url,
      "http://127.0.0.1:8030/v1/jobs/req-1/interaction/reply",
    );
    assert.equal(requests[0].method, "POST");
    assert.deepEqual(JSON.parse(requests[0].body), {
      mode: "interaction",
      interaction_id: 3,
      response: "ok",
    });
    assert.equal(requests[1].url, "http://127.0.0.1:8030/v1/jobs/req-1/cancel");
    assert.equal(requests[1].method, "POST");
    assert.equal(requests[1].body, "{}");
  });

  it("posts auth import files to jobs interaction auth import endpoint", async function () {
    const requests: Array<{
      url: string;
      method: string;
      body?: BodyInit | null;
      contentType?: string | null;
    }> = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url,
        method: String(init?.method || "GET"),
        body: init?.body,
        contentType: headers.get("content-type"),
      });
      return new Response(
        JSON.stringify({
          request_id: "req-1",
          status: "waiting_auth",
          accepted: true,
          mode: "auth",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const client = new SkillRunnerManagementClient({
      baseUrl: "http://127.0.0.1:8030",
      fetchImpl,
    });
    const response = await client.submitAuthImport({
      requestId: "req-1",
      providerId: "google",
      files: [
        {
          name: "creds.json",
          content_base64: "eyJvayI6dHJ1ZX0=",
        },
      ],
    });

    assert.equal(response.accepted, true);
    assert.lengthOf(requests, 1);
    assert.equal(
      requests[0].url,
      "http://127.0.0.1:8030/v1/jobs/req-1/interaction/auth/import",
    );
    assert.equal(requests[0].method, "POST");
    assert.isNull(requests[0].contentType);
    const body = requests[0].body as FormData;
    assert.equal(body.get("provider_id"), "google");
    const files = body.getAll("files");
    assert.lengthOf(files, 1);
  });
});

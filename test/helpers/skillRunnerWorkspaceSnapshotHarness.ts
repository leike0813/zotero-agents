import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import {
  attachSkillRunnerSidebarHost,
  detachSkillRunnerSidebarHost,
  dispatchRunWorkspaceAction,
  getSkillRunnerWorkspaceSelectedOwner,
  refreshSkillRunnerSidebarHostSnapshot,
  resetSkillRunnerRunDialogForTests,
  subscribeSkillRunnerWorkspaceChanges,
} from "../../src/modules/skillRunnerRunDialog";
import { SKILLRUNNER_WORKSPACE_ADAPTER } from "../../src/modules/skillRunnerWorkspaceSurface";
import {
  assertAssistantWorkspacePublication,
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspacePublication,
} from "../../src/modules/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import { AssistantWorkspacePublicationRuntime } from "../../src/modules/assistantWorkspacePublicationRuntime";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  resetSkillRunnerRunStoreForTests,
  updateSkillRunnerRunMessageCounts,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import { resetWorkflowTasks } from "../../src/modules/taskRuntime";
import { resetTaskDashboardHistory } from "../../src/modules/taskDashboardHistory";
import { createBackendsPrefsDocument } from "../../src/backends/registry";
import { clearPref, setPref } from "../../src/utils/prefs";
import {
  markSkillRunnerBackendHealthSuccess,
  registerSkillRunnerBackendForHealthTracking,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunnerBackendHealthRegistry";
import type { AssistantMessageCountsSnapshot } from "../../src/modules/assistantMessageCounts";

/**
 * Behavior-level harness for the SkillRunner workspace publication pipeline.
 *
 * It seeds the real run stores, points the persisted backend registry at a
 * local mock management server, attaches the real sidebar host, and captures
 * the v1 publications the workspace runtime emits through the shared
 * publication plane. Shared by
 * `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts` (contract
 * assertions) and `test/core/97-acp-ui-smoke.test.ts` (envelope source).
 */

export type SkillRunnerHarnessTaskSeed = {
  taskName?: string;
  skillId?: string;
  workflowId?: string;
  /** When omitted the task stays a local pre-request run (no requestId). */
  requestId?: string;
  /** Final lifecycle status; defaults to "queued" (local) or "waiting_user". */
  status?:
    | "queued"
    | "running"
    | "waiting_user"
    | "waiting_auth"
    | "succeeded"
    | "failed"
    | "canceled";
  executionMode?: "auto" | "interactive";
  /** Request payload stored on the run record (e.g. auto-reply options). */
  requestPayload?: Record<string, unknown>;
  /** Raw `pending` payload served by the mock `/interaction/pending`. */
  pending?: Record<string, unknown>;
  /** Raw `pending_auth` payload served by the mock `/interaction/pending`. */
  pendingAuth?: Record<string, unknown>;
  /** Raw `pending_auth_method_selection` payload (takes precedence). */
  pendingAuthMethodSelection?: Record<string, unknown>;
  /** Response body for the mock `/auth/session` endpoint. */
  authSession?: Record<string, unknown>;
  /** Events served by the mock `/chat/history` endpoint. */
  chatEvents?: Array<Record<string, unknown>>;
  messageCounts?: AssistantMessageCountsSnapshot;
  updatedAt?: string;
};

export type SkillRunnerHarnessSeededTask = {
  runKey: string;
  requestId: string;
};

/**
 * v1 publication-plane capture for the SkillRunner workspace. Wired exactly
 * like the production sidebar (`assistantWorkspaceSidebar.ts`): run-store
 * changes flow through `subscribeSkillRunnerWorkspaceChanges` →
 * `AssistantWorkspacePublicationRuntime.schedule` with
 * `SKILLRUNNER_WORKSPACE_ADAPTER` → coordinator → captured posts. The run
 * host is attached so the production refresh pipeline runs while assertions
 * stay on the publication boundary.
 */
export type SkillRunnerWorkspacePublicationCapture = {
  hostWindow: Window;
  publications: AssistantWorkspacePublication[];
  runtime: AssistantWorkspacePublicationRuntime;
  flush: () => Promise<void>;
  transcriptSnapshots: () => AssistantWorkspacePublication[];
  waitFor: (
    predicate: (publication: AssistantWorkspacePublication) => boolean,
    description?: string,
    timeoutMs?: number,
  ) => Promise<AssistantWorkspacePublication>;
  detachHost: () => void;
  reattachHost: (args?: { selectRunKey?: string }) => Promise<void>;
  stop: () => void;
};

export type SkillRunnerWorkspaceSnapshotHarness = {
  backendId: string;
  baseUrl: string;
  seedTask: (seed?: SkillRunnerHarnessTaskSeed) => SkillRunnerHarnessSeededTask;
  appendChatEvents: (
    requestId: string,
    events: Array<Record<string, unknown>>,
  ) => void;
  setBackendStatus: (
    requestId: string,
    status: MockRunChannel["status"],
  ) => void;
  /**
   * Registers a mock run channel after seeding, for runs whose request id is
   * assigned late (local-only run graduating to a backend request).
   */
  registerRunChannel: (
    requestId: string,
    channel?: Partial<
      Pick<
        MockRunChannel,
        | "status"
        | "pending"
        | "pendingAuth"
        | "pendingAuthMethodSelection"
        | "authSession"
        | "chatEvents"
      >
    >,
  ) => void;
  setPendingInteraction: (
    requestId: string,
    pending: Record<string, unknown>,
  ) => void;
  /**
   * Gates the mock `/chat/history` response behind a promise so tests can
   * observe the same-owner history-loading window deterministically.
   */
  setHistoryGate: (requestId: string, gate: Promise<void> | null) => void;
  getChatStreamState: (requestId: string) => {
    openCount: number;
    requestCount: number;
    cursors: number[];
  };
  closeChatStreams: (requestId: string) => void;
  attachPublications: (args?: {
    selectRunKey?: string;
  }) => Promise<SkillRunnerWorkspacePublicationCapture>;
  dispatch: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  reset: () => Promise<void>;
};

type MockRunChannel = {
  requestId: string;
  status: string;
  pending?: Record<string, unknown>;
  pendingAuth?: Record<string, unknown>;
  pendingAuthMethodSelection?: Record<string, unknown>;
  authSession?: Record<string, unknown>;
  chatEvents: Array<Record<string, unknown>>;
  /** When set, the /chat/history response waits for this promise. */
  historyGate: Promise<void> | null;
  chatStreams: Set<{
    response: ServerResponse;
    cursor: number;
  }>;
  chatStreamRequestCount: number;
  chatStreamCursors: number[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function jsonResponse(
  res: import("node:http").ServerResponse,
  statusCode: number,
  body: unknown,
) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function derivePendingOwner(channel: MockRunChannel) {
  if (channel.status === "waiting_user") {
    return "waiting_user";
  }
  if (channel.status === "waiting_auth") {
    const phase = String(
      channel.pendingAuthMethodSelection?.phase ||
        channel.pendingAuth?.phase ||
        "challenge_active",
    ).trim();
    return `waiting_auth.${phase || "challenge_active"}`;
  }
  return "running";
}

function resolveAuthSessionBody(channel: MockRunChannel) {
  if (channel.authSession) {
    return channel.authSession;
  }
  if (channel.status === "waiting_auth") {
    return {
      request_id: channel.requestId,
      auth_session_id: "sess-mock-auth",
      status: "waiting_auth",
      phase: "challenge_active",
      challenge_kind: String(
        channel.pendingAuth?.challenge_kind || "auth_code_or_url",
      ),
    };
  }
  return {
    request_id: channel.requestId,
    status: channel.status,
    phase: "none",
  };
}

async function startMockManagementServer(runs: Map<string, MockRunChannel>) {
  const writeChatEvent = (
    stream: { response: ServerResponse; cursor: number },
    event: Record<string, unknown>,
  ) => {
    const seq = Number(event.seq || 0);
    if (!Number.isFinite(seq) || seq <= stream.cursor) {
      return;
    }
    stream.response.write(
      `event: chat_event\ndata: ${JSON.stringify(event)}\n\n`,
    );
    stream.cursor = seq;
  };
  const server: Server = createServer((req, res) => {
    void (async () => {
      const method = req.method || "GET";
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const pathname = url.pathname;
      const runMatch = pathname.match(/^\/v1\/jobs\/([^/]+)$/);
      if (method === "GET" && runMatch) {
        const channel = runs.get(decodeURIComponent(runMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        jsonResponse(res, 200, {
          request_id: channel.requestId,
          status: channel.status,
        });
        return;
      }
      const pendingMatch = pathname.match(
        /^\/v1\/jobs\/([^/]+)\/interaction\/pending$/,
      );
      if (method === "GET" && pendingMatch) {
        const channel = runs.get(decodeURIComponent(pendingMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        jsonResponse(res, 200, {
          request_id: channel.requestId,
          status: channel.status,
          pending_owner: derivePendingOwner(channel),
          ...(isObject(channel.pending) ? { pending: channel.pending } : {}),
          ...(isObject(channel.pendingAuth)
            ? { pending_auth: channel.pendingAuth }
            : {}),
          ...(isObject(channel.pendingAuthMethodSelection)
            ? {
                pending_auth_method_selection:
                  channel.pendingAuthMethodSelection,
              }
            : {}),
        });
        return;
      }
      const replyMatch = pathname.match(
        /^\/v1\/jobs\/([^/]+)\/interaction\/reply$/,
      );
      if (method === "POST" && replyMatch) {
        const channel = runs.get(decodeURIComponent(replyMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        jsonResponse(res, 200, {
          request_id: channel.requestId,
          accepted: true,
          status: "running",
        });
        return;
      }
      const historyMatch = pathname.match(
        /^\/v1\/jobs\/([^/]+)\/chat\/history$/,
      );
      if (method === "GET" && historyMatch) {
        const channel = runs.get(decodeURIComponent(historyMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        if (channel.historyGate) {
          await channel.historyGate;
        }
        jsonResponse(res, 200, {
          request_id: channel.requestId,
          count: channel.chatEvents.length,
          events: channel.chatEvents,
          cursor_floor: 0,
          cursor_ceiling: channel.chatEvents.length,
          source: "mock",
        });
        return;
      }
      const authSessionMatch = pathname.match(
        /^\/v1\/jobs\/([^/]+)\/auth\/session$/,
      );
      if (method === "GET" && authSessionMatch) {
        const channel = runs.get(decodeURIComponent(authSessionMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        jsonResponse(res, 200, resolveAuthSessionBody(channel));
        return;
      }
      const chatStreamMatch = pathname.match(/^\/v1\/jobs\/([^/]+)\/chat$/);
      if (method === "GET" && chatStreamMatch) {
        const channel = runs.get(decodeURIComponent(chatStreamMatch[1]));
        if (!channel) {
          jsonResponse(res, 404, { error: "job not found" });
          return;
        }
        const rawCursor = Number(url.searchParams.get("cursor") || 0);
        const cursor = Number.isFinite(rawCursor) ? Math.max(0, rawCursor) : 0;
        res.statusCode = 200;
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("cache-control", "no-cache");
        res.setHeader("connection", "keep-alive");
        res.write(
          `event: snapshot\ndata: ${JSON.stringify({
            status: channel.status,
            cursor,
          })}\n\n`,
        );
        const stream = { response: res, cursor };
        channel.chatStreams.add(stream);
        channel.chatStreamRequestCount += 1;
        channel.chatStreamCursors.push(cursor);
        for (const event of channel.chatEvents) {
          writeChatEvent(stream, event);
        }
        req.on("close", () => {
          channel.chatStreams.delete(stream);
        });
        return;
      }
      jsonResponse(res, 404, { error: "not found" });
    })().catch((error) => {
      jsonResponse(res, 500, { error: String(error || "mock failure") });
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address() as AddressInfo | null;
  if (!address || typeof address === "string") {
    throw new Error("mock management server failed to bind");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function createHostWindowStub() {
  return {
    addEventListener() {},
    removeEventListener() {},
  } as unknown as Window;
}

export async function startSkillRunnerWorkspaceSnapshotHarness(): Promise<SkillRunnerWorkspaceSnapshotHarness> {
  // Clean up state potentially left over by other suites before seeding.
  await resetSkillRunnerRunDialogForTests();
  resetSkillRunnerRunStoreForTests();
  resetWorkflowTasks();
  resetTaskDashboardHistory();
  resetSkillRunnerBackendHealthRegistryForTests();

  const runs = new Map<string, MockRunChannel>();
  const server = await startMockManagementServer(runs);
  const backendId = "skillrunner-harness-backend";
  setPref(
    "backendsConfigJson",
    JSON.stringify(
      createBackendsPrefsDocument([
        {
          id: backendId,
          displayName: "SkillRunner Harness Backend",
          type: "skillrunner",
          baseUrl: server.baseUrl,
        },
      ]),
    ),
  );
  registerSkillRunnerBackendForHealthTracking(backendId);
  markSkillRunnerBackendHealthSuccess(backendId);

  let taskCounter = 0;
  let publicationCounter = 0;
  let closed = false;
  const publicationCaptures: SkillRunnerWorkspacePublicationCapture[] = [];

  const harness: SkillRunnerWorkspaceSnapshotHarness = {
    backendId,
    baseUrl: server.baseUrl,
    seedTask(seed = {}) {
      taskCounter += 1;
      const ordinal = taskCounter;
      const updatedAt =
        String(seed.updatedAt || "").trim() ||
        `2026-07-18T00:00:${String(ordinal).padStart(2, "0")}.000Z`;
      const run = createSkillRunnerRun({
        backendId,
        workflowId: seed.workflowId || "literature-digest",
        workflowRunId: `harness-workflow-run-${ordinal}`,
        jobId: `harness-job-${ordinal}`,
        taskName: seed.taskName || `Harness Task ${ordinal}`,
        skillId: seed.skillId,
        executionMode: seed.executionMode || "interactive",
        requestPayload: seed.requestPayload,
        createdAt: updatedAt,
        updatedAt,
      });
      if (!run) {
        throw new Error("failed to seed SkillRunner run record");
      }
      const runKey = run.runKey;
      let requestId = "";
      if (typeof seed.requestId === "string") {
        requestId = seed.requestId.trim() || `req-harness-${ordinal}`;
        attachSkillRunnerRequestId({ runKey, requestId, updatedAt });
        updateSkillRunnerRunStateByRunKey({
          runKey,
          state: "request_ready",
          updatedAt,
        });
      }
      const status = seed.status || (requestId ? "waiting_user" : "queued");
      updateSkillRunnerRunStateByRunKey({
        runKey,
        state: status,
        backendStatus: status,
        updatedAt,
      });
      if (seed.messageCounts) {
        updateSkillRunnerRunMessageCounts({
          runKey,
          messageCounts: seed.messageCounts,
        });
      }
      if (requestId) {
        runs.set(requestId, {
          requestId,
          status,
          pending: seed.pending,
          pendingAuth: seed.pendingAuth,
          pendingAuthMethodSelection: seed.pendingAuthMethodSelection,
          authSession: seed.authSession,
          chatEvents: Array.isArray(seed.chatEvents) ? seed.chatEvents : [],
          historyGate: null,
          chatStreams: new Set(),
          chatStreamRequestCount: 0,
          chatStreamCursors: [],
        });
      }
      return { runKey, requestId };
    },
    appendChatEvents(requestId, events) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      channel.chatEvents.push(...events);
      for (const stream of channel.chatStreams) {
        for (const event of events) {
          const seq = Number(event.seq || 0);
          if (!Number.isFinite(seq) || seq <= stream.cursor) {
            continue;
          }
          stream.response.write(
            `event: chat_event\ndata: ${JSON.stringify(event)}\n\n`,
          );
          stream.cursor = seq;
        }
      }
    },
    setBackendStatus(requestId, status) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      channel.status = status;
    },
    registerRunChannel(requestId, channel = {}) {
      const key = String(requestId || "").trim();
      if (!key) {
        throw new Error("registerRunChannel requires a request id");
      }
      if (runs.has(key)) {
        throw new Error(`duplicate SkillRunner harness request: ${key}`);
      }
      runs.set(key, {
        requestId: key,
        status: String(channel.status || "running"),
        pending: channel.pending,
        pendingAuth: channel.pendingAuth,
        pendingAuthMethodSelection: channel.pendingAuthMethodSelection,
        authSession: channel.authSession,
        chatEvents: Array.isArray(channel.chatEvents) ? channel.chatEvents : [],
        historyGate: null,
        chatStreams: new Set(),
        chatStreamRequestCount: 0,
        chatStreamCursors: [],
      });
    },
    setHistoryGate(requestId, gate) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      channel.historyGate = gate;
    },
    setPendingInteraction(requestId, pending) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      channel.status = "waiting_user";
      channel.pending = pending;
    },
    getChatStreamState(requestId) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      return {
        openCount: channel.chatStreams.size,
        requestCount: channel.chatStreamRequestCount,
        cursors: [...channel.chatStreamCursors],
      };
    },
    closeChatStreams(requestId) {
      const channel = runs.get(String(requestId || "").trim());
      if (!channel) {
        throw new Error(`unknown SkillRunner harness request: ${requestId}`);
      }
      for (const stream of [...channel.chatStreams]) {
        stream.response.end();
      }
      channel.chatStreams.clear();
    },
    async attachPublications(args = {}) {
      publicationCounter += 1;
      const publications: AssistantWorkspacePublication[] = [];
      const hostWindow = createHostWindowStub();
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: `skillrunner-harness-publications-${publicationCounter}`,
        getActiveOwner(source) {
          if (source !== "skillrunner") return null;
          const selected = getSkillRunnerWorkspaceSelectedOwner();
          return selected
            ? createSkillRunnerWorkspaceOwner({
                requestId: selected.requestId || undefined,
                runKey: selected.runKey,
              })
            : null;
        },
        post(publication) {
          assertAssistantWorkspacePublication(publication);
          publications.push(structuredClone(publication));
          // Acknowledge immediately so the coordinator transcript lane keeps
          // pumping like it would behind a rendering child.
          queueMicrotask(() => {
            coordinator.acknowledge({
              publicationId: publication.publicationId,
              stage: "render-complete",
              outcome: "accepted",
              reason: null,
              failure: null,
            });
          });
          return true;
        },
      });
      const runtime = new AssistantWorkspacePublicationRuntime({
        coordinator,
        activity: () => "matching-target",
      });
      const unsubscribe = subscribeSkillRunnerWorkspaceChanges((change) => {
        runtime.schedule({
          adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
          change,
          context: undefined,
        });
      });
      const attachHost = () =>
        attachSkillRunnerSidebarHost({
          hostWindow,
          isHostAlive: () => true,
        });
      attachHost();
      await refreshSkillRunnerSidebarHostSnapshot({
        forceInit: true,
        runKey: args.selectRunKey,
      });
      let stopped = false;
      const capture: SkillRunnerWorkspacePublicationCapture = {
        hostWindow,
        publications,
        runtime,
        flush: () => runtime.flush(),
        transcriptSnapshots: () =>
          publications.filter(
            (publication) =>
              publication.publicationKind === "transcript" &&
              publication.publicationForm === "snapshot",
          ),
        async waitFor(predicate, description, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          for (;;) {
            for (let index = publications.length - 1; index >= 0; index -= 1) {
              if (predicate(publications[index])) {
                return publications[index];
              }
            }
            if (Date.now() > deadline) {
              throw new Error(
                `timed out waiting for ${description || "the expected SkillRunner workspace publication"}`,
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
        },
        detachHost() {
          detachSkillRunnerSidebarHost({ hostWindow });
        },
        async reattachHost(reattachArgs = {}) {
          attachHost();
          await refreshSkillRunnerSidebarHostSnapshot({
            forceInit: true,
            runKey: reattachArgs.selectRunKey,
          });
        },
        stop() {
          if (stopped) {
            return;
          }
          stopped = true;
          unsubscribe();
        },
      };
      publicationCaptures.push(capture);
      return capture;
    },
    async dispatch(action, payload = {}) {
      await dispatchRunWorkspaceAction({
        action,
        payload,
      });
    },
    async reset() {
      if (closed) {
        return;
      }
      closed = true;
      for (const capture of publicationCaptures) {
        capture.stop();
      }
      publicationCaptures.length = 0;
      await resetSkillRunnerRunDialogForTests();
      resetSkillRunnerRunStoreForTests();
      resetWorkflowTasks();
      resetTaskDashboardHistory();
      clearPref("backendsConfigJson");
      resetSkillRunnerBackendHealthRegistryForTests();
      for (const channel of runs.values()) {
        for (const stream of [...channel.chatStreams]) {
          stream.response.end();
        }
        channel.chatStreams.clear();
      }
      await server.close();
    },
  };
  return harness;
}

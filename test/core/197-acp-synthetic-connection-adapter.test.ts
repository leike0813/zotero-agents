import { assert } from "chai";
import type {
  AcpDiagnosticsEntry,
  AcpPendingPermissionRequest,
} from "../../src/modules/acpTypes";
import type {
  RequestPermissionOutcome,
  SessionNotification,
} from "../../src/modules/acpProtocol";
import {
  createAcpSyntheticConnectionAdapter,
  inspectAcpSyntheticConnectionAdapterTimers,
} from "../../src/modules/acpSyntheticConnectionAdapter";

function notification(
  sessionId: string,
  update: SessionNotification["update"],
): SessionNotification {
  return { sessionId, update };
}

function permissionRequest(
  requestId = "permission-1",
): AcpPendingPermissionRequest {
  return {
    requestId,
    sessionId: "replay-session",
    toolCallId: requestId,
    toolTitle: "Zotero MCP: write",
    approvalKind: "zotero-write",
    source: "zotero-mcp-write",
    summary: "Write an item",
    requestedAt: "2026-08-15T12:00:00.000Z",
    options: [
      { optionId: "approve", kind: "allow_once", name: "Approve" },
      { optionId: "deny", kind: "reject_once", name: "Deny" },
    ],
  };
}

describe("ACP synthetic connection adapter", function () {
  it("initializes and creates the configured session identity", async function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });

    const initialized = await adapter.initialize();
    assert.equal(initialized.canLoadSession, false);
    assert.equal(initialized.canResumeSession, false);
    assert.equal(initialized.canUseHttpMcp, false);
    assert.equal(initialized.canUseSseMcp, false);

    const created = await adapter.newSession();
    assert.equal(created.sessionId, "synthetic-session");
  });

  it("emits session updates through update listeners", async function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    const seen: SessionNotification[] = [];
    const unsubscribe = adapter.onUpdate((update) => {
      seen.push(update);
    });

    const event = notification("synthetic-session", {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "hello" },
    });
    adapter.emitSessionNotification(event);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.update.sessionUpdate, "agent_message_chunk");

    unsubscribe();
    adapter.emitSessionNotification(event);
    assert.equal(seen.length, 1);
  });

  it("emits user message chunk updates without special replay hooks", async function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    const seen: SessionNotification[] = [];
    adapter.onUpdate((update) => {
      seen.push(update);
    });
    adapter.emitSessionNotification(
      notification("synthetic-session", {
        sessionUpdate: "user_message_chunk",
        content: { type: "text", text: "replayed prompt" },
      }),
    );
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.update.sessionUpdate, "user_message_chunk");
  });

  it("emits diagnostics through diagnostics listeners", function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    const seen: AcpDiagnosticsEntry[] = [];
    adapter.onDiagnostics((entry) => {
      seen.push(entry);
    });
    adapter.emitDiagnostic({
      id: "diag-1",
      ts: "2026-08-15T12:00:00.000Z",
      kind: "replay",
      level: "info",
      message: "replayed diagnostic",
      detail: "",
    });
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.kind, "replay");
  });

  it("emits permission requests and resolves the recorded outcome", function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    let received:
      | (AcpPendingPermissionRequest & {
          resolve: (outcome: RequestPermissionOutcome) => void;
        })
      | undefined;
    adapter.onPermissionRequest((request) => {
      received = request;
    });
    adapter.emitPermissionRequest(permissionRequest());

    assert.isOk(received);
    assert.equal(received?.requestId, "permission-1");
    const outcome: RequestPermissionOutcome = {
      outcome: "selected",
      optionId: "approve",
    };
    assert.isTrue(adapter.resolvePermission(outcome));
    assert.isFalse(adapter.resolvePermission(outcome));
  });

  it("closes through close listeners and unregisters timer inspection", async function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    let closed = 0;
    adapter.onClose(() => {
      closed += 1;
    });
    assert.deepEqual(
      inspectAcpSyntheticConnectionAdapterTimers({
        backendId: "acp-replay",
        conversationId: "synthetic-conversation",
      }),
      { timers: [], warnings: [] },
    );
    await adapter.close();
    assert.equal(closed, 1);
    assert.deepEqual(
      inspectAcpSyntheticConnectionAdapterTimers({
        backendId: "acp-replay",
        conversationId: "synthetic-conversation",
      }),
      {
        timers: [],
        warnings: ["logical-timer-contamination:acp-synthetic-adapter-missing"],
      },
    );
  });

  it("returns an immediate synthetic prompt result when prompt is called", async function () {
    const adapter = createAcpSyntheticConnectionAdapter({
      backendId: "acp-replay",
      conversationId: "synthetic-conversation",
      sessionId: "synthetic-session",
    });
    const result = await adapter.prompt({
      sessionId: "synthetic-session",
      message: "hello",
    });
    assert.equal(result.stopReason, "end_turn");
  });
});

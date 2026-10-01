import { assert } from "chai";
import {
  record,
  flushOwner,
  exportDiagnostics,
  resetPiRuntimeAuditForTests,
} from "../../src/modules/piRuntimeAudit";
import {
  createPiOwner,
  appendPiOwnerEntry,
  createPiConversationOwner,
  updatePiConversationMetadata,
  markPiConversationDeleting,
  cleanupPiConversation,
} from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import {
  readRuntimeTextFileStrict,
  runtimePathExists,
  ensureRuntimeDirectoryStrict,
  writeRuntimeTextFile,
  removeRuntimePath,
} from "../../src/modules/runtimePersistence";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  setRuntimeLogDiagnosticMode,
} from "../../src/modules/runtimeLogManager";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";
import { joinPath } from "../../src/utils/path";

export function piRuntimeAuditSharedTests(getRoot: () => string) {
  beforeEach(async function () {
    await resetPiRuntimeAuditForTests();
    await clearRuntimeLogs();
    setRuntimeLogDiagnosticMode(false);
  });
  afterEach(async function () {
    await resetPiRuntimeAuditForTests();
    setRuntimeLogDiagnosticMode(false);
  });
  it("routes structural owner facts once and excludes semantic attributes", async function () {
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "audit-owner" };
    await createPiOwner(owner, root);
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
      correlation: { turnId: "turn-1" },
      attributes: {
        status: "completed",
        prompt: "private-prompt-canary",
        path: "/private/path",
        body: "private-body-canary",
      },
    });
    record({ operation: "turn.started", origin: "runtime", owner, root });
    await flushOwner(owner, root);
    const auditPath = joinPath(
      piOwnerPaths(owner, root).dir,
      "workspace",
      "runtime-audit",
      "audit.ndjson",
    );
    const text = await readRuntimeTextFileStrict(auditPath);
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.lengthOf(entries, 1);
    assert.equal(entries[0].operation, "owner.terminal");
    assert.equal(entries[0].conversationId, owner.ownerId);
    assert.notInclude(text, "private-");
    const zip = joinPath(root, "owner.zip");
    const exported = await exportDiagnostics(
      {
        kind: "owner",
        owner: {
          ...owner,
          privateBody: "private-scope-canary",
        } as typeof owner,
        root,
      },
      zip,
    );
    assert.equal(exported.status, "exported");
    await createWorkflowArchiveApi().withExtractedZip(
      { sourcePath: zip },
      {},
      async (archive) => {
        const manifest = JSON.parse(await archive.readText("manifest.json"));
        assert.equal(manifest.scope.owner.ownerId, owner.ownerId);
        assert.notInclude(JSON.stringify(manifest), "private-scope-canary");
        assert.equal(manifest.complete, true);
        assert.equal(
          JSON.parse(await archive.readText("runtime-diagnostics.json")).entries
            .length,
          0,
        );
        assert.notInclude(
          await archive.readText("owner-audit.ndjson"),
          "private-",
        );
      },
    );
  });
  it("rejects prose in permitted fields and admits structural diagnostic tiers only", async function () {
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "tier-owner" };
    await createPiOwner(owner, root);
    setRuntimeLogDiagnosticMode(true);
    record({
      operation: "turn.started",
      origin: "runtime",
      owner,
      root,
      attributes: { count: 1, reason: "private-reason-canary" },
    });
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
      attributes: {
        status: "private-status-canary",
        reason: "private-reason-canary",
      },
    });
    record({
      operation: "stream.shape",
      origin: "runtime",
      owner,
      root,
      attributes: { kind: "chunk", count: 1 },
    });
    await flushOwner(owner, root);
    const text = await readRuntimeTextFileStrict(
      joinPath(
        piOwnerPaths(owner, root).dir,
        "workspace",
        "runtime-audit",
        "audit.ndjson",
      ),
    );
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.lengthOf(entries, 2);
    assert.equal(entries[0].operation, "turn.started");
    assert.notInclude(text, "private-");
  });
  it("global export excludes owner logs and strips arbitrary global prose", async function () {
    const root = getRoot();
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      stage: "private-stage-canary",
      component: "private-component-canary",
      operation: "private-operation-canary",
      message: "private-message-canary",
      details: { body: "private-body-canary", token: "private-token-canary" },
      transport: {
        url: "https://example.test/?private-query-canary",
        status: 503,
      },
      error: new Error("private-error-canary"),
    });
    appendRuntimeLog({
      level: "error",
      scope: "system",
      stage: "owner-fixture",
      message: "owner-sensitive",
      conversationId: "other-owner",
      requestId: "owner-request",
    });
    const zip = joinPath(root, "global.zip");
    assert.equal(
      (await exportDiagnostics({ kind: "global" }, zip)).status,
      "exported",
    );
    await createWorkflowArchiveApi().withExtractedZip(
      { sourcePath: zip },
      {},
      async (archive) => {
        const text = await archive.readText("runtime-diagnostics.json");
        const content = JSON.parse(text);
        assert.lengthOf(content.entries, 1);
        assert.notInclude(text, "private-");
        assert.notInclude(text, "other-owner");
      },
    );
    assert.isFalse(
      await runtimePathExists(joinPath(root, "data", "pi", "owners")),
    );
  });
  it("compacts to both targets and preserves the newest warning with explicit gaps", async function () {
    await resetPiRuntimeAuditForTests({ fileEntries: 8, fileBytes: 8000 });
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "retained-owner" };
    await createPiOwner(owner, root);
    for (let index = 0; index < 10; index++) {
      record({
        operation: index === 9 ? "security.decision_denied" : "owner.terminal",
        origin: index === 9 ? "tool_gateway" : "conversation",
        owner,
        root,
        correlation: { callId: `call-${index}` },
        attributes: { status: "completed" },
      });
      await flushOwner(owner, root);
    }
    const text = await readRuntimeTextFileStrict(
      joinPath(
        piOwnerPaths(owner, root).dir,
        "workspace",
        "runtime-audit",
        "audit.ndjson",
      ),
    );
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.isAtMost(entries.length, 6);
    assert.isAtMost(new TextEncoder().encode(text).length, 6000);
    assert.isTrue(entries.some((entry) => entry.operation === "audit.gap"));
    assert.isTrue(entries.some((entry) => entry.callId === "call-9"));
  });
  it("recovers write failures and bounded overflow without changing canonical history", async function () {
    await resetPiRuntimeAuditForTests({
      pendingEntries: 3,
      pendingBytes: 1600,
    });
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "gap-owner" };
    await createPiOwner(owner, root);
    const workspace = joinPath(piOwnerPaths(owner, root).dir, "workspace");
    await ensureRuntimeDirectoryStrict(workspace);
    const auditDir = joinPath(workspace, "runtime-audit");
    await writeRuntimeTextFile(auditDir, "blocked");
    for (let index = 0; index < 8; index++)
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
        correlation: { turnId: `turn-${index}` },
      });
    await flushOwner(owner, root);
    await removeRuntimePath(auditDir);
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
      correlation: { turnId: "recovered" },
    });
    await flushOwner(owner, root);
    const text = await readRuntimeTextFileStrict(
      joinPath(auditDir, "audit.ndjson"),
    );
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.isTrue(entries.some((entry) => entry.operation === "audit.gap"));
    assert.isTrue(entries.some((entry) => entry.turnId === "recovered"));
  });
  it("bounds bytes independently and reports an oversized structural record", async function () {
    await resetPiRuntimeAuditForTests({
      fileBytes: 3000,
      fileEntries: 100,
      entryBytes: 800,
    });
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "byte-owner" };
    await createPiOwner(owner, root);
    const longId = "a".repeat(250);
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
      correlation: {
        sessionId: longId,
        turnId: longId,
        invocationId: longId,
        callId: longId,
        failureId: longId,
      },
    });
    for (let index = 0; index < 12; index++) {
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
        correlation: { turnId: `byte-turn-${index}` },
      });
      await flushOwner(owner, root);
    }
    const text = await readRuntimeTextFileStrict(
      joinPath(
        piOwnerPaths(owner, root).dir,
        "workspace",
        "runtime-audit",
        "audit.ndjson",
      ),
    );
    assert.isAtMost(new TextEncoder().encode(text).length, 3000);
    assert.notInclude(text, longId);
    const entries = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.isTrue(entries.some((entry) => entry.operation === "audit.gap"));
    for (const entry of entries)
      assert.isAtMost(
        new TextEncoder().encode(JSON.stringify(entry) + "\n").length,
        800,
      );
  });
  it("trims export copies and keeps structured failures without semantic transcript content", async function () {
    await resetPiRuntimeAuditForTests({ exportBytes: 2200 });
    const root = getRoot();
    const owner = { kind: "conversation" as const, ownerId: "trim-owner" };
    await createPiOwner(owner, root);
    await appendPiOwnerEntry(
      owner,
      {
        entryId: "failure-entry",
        kind: "failure_observed",
        payload: {
          failureId: "failure-1",
          origin: "pi_runtime",
          category: "execution",
          code: "model_failed",
          retryable: true,
          body: "private-failure-canary",
        },
      },
      root,
    );
    for (let index = 0; index < 12; index++)
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
        correlation: { turnId: `turn-${index}` },
      });
    await flushOwner(owner, root);
    const audit = joinPath(
      piOwnerPaths(owner, root).dir,
      "workspace",
      "runtime-audit",
      "audit.ndjson",
    );
    const before = await readRuntimeTextFileStrict(audit);
    const zip = joinPath(root, "trim.zip");
    const result = await exportDiagnostics({ kind: "owner", owner, root }, zip);
    assert.equal(result.status, "exported");
    if (result.status === "exported") {
      assert.isAtMost(result.bytes, 2200);
      assert.isFalse(result.complete);
    }
    await createWorkflowArchiveApi().withExtractedZip(
      { sourcePath: zip },
      {},
      async (archive) => {
        const diagnostic = await archive.readText("runtime-diagnostics.json");
        assert.equal(JSON.parse(diagnostic).failures[0].failureId, "failure-1");
        assert.notInclude(diagnostic, "private-");
        assert.isAbove(
          JSON.parse(await archive.readText("manifest.json"))
            .trimmedOwnerEntries,
          0,
        );
      },
    );
    assert.equal(await readRuntimeTextFileStrict(audit), before);
  });
  it("fails atomically and rejects missing owners without creating their directories", async function () {
    const root = getRoot();
    await ensureRuntimeDirectoryStrict(root);
    const target = joinPath(root, "blocked");
    await writeRuntimeTextFile(target, "original");
    assert.deepEqual(
      await exportDiagnostics(
        { kind: "global" },
        joinPath(target, "result.zip"),
      ),
      { status: "failed", code: "diagnostic_export_failed" },
    );
    assert.equal(await readRuntimeTextFileStrict(target), "original");
    const owner = { kind: "conversation" as const, ownerId: "missing-owner" };
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    await flushOwner(owner, root);
    assert.equal(
      (
        await exportDiagnostics(
          { kind: "owner", owner, root },
          joinPath(root, "missing.zip"),
        )
      ).status,
      "failed",
    );
    assert.isFalse(await runtimePathExists(piOwnerPaths(owner, root).dir));
  });
  it("retains archived evidence and never recreates a permanently deleted owner", async function () {
    const root = getRoot();
    const created = await createPiConversationOwner(
      { conversationId: "delete-owner" },
      root,
    );
    const owner = created.ref;
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    await flushOwner(owner, root);
    updatePiConversationMetadata(owner.ownerId, { lifecycle: "archived" });
    const zip = joinPath(root, "archived.zip");
    assert.equal(
      (await exportDiagnostics({ kind: "owner", owner, root }, zip)).status,
      "exported",
    );
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    markPiConversationDeleting(owner.ownerId);
    await cleanupPiConversation(owner, root);
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    await flushOwner(owner, root);
    assert.isFalse(await runtimePathExists(piOwnerPaths(owner, root).dir));
  });
}

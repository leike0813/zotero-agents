import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import {
  normalizeRuntimeLogEntry,
  appendRuntimeLog,
  listRuntimeLogs,
  clearRuntimeLogs,
  flushRuntimeLogsPersistence,
  initializeRuntimeLogsPersistence,
  resetRuntimeLogHydrationForTests,
} from "../../src/modules/runtimeLogManager";
import { piRuntimeAuditSharedTests } from "./piRuntimeAuditShared";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  record,
  flushOwner,
  exportDiagnostics,
  resetPiRuntimeAuditForTests,
  shutdownPiRuntimeAudit,
} from "../../src/modules/piRuntimeAudit";
import {
  createPiOwner,
  createPiConversationOwner,
  updatePiConversationMetadata,
  markPiConversationDeleting,
  cleanupPiConversation,
} from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import { createWorkflowArchiveApi } from "../../src/workflows/archive";

describe("Pi Runtime Audit normalization", function () {
  it("retains Pi correlations through hydration and filters by invocation", async function () {
    await initializeRuntimeLogsPersistence();
    await clearRuntimeLogs();
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      stage: "fixture",
      message: "fixture",
      conversationId: "owner-a",
      invocationId: "invocation-a",
      failureId: "failure-a",
    });
    appendRuntimeLog({
      level: "warn",
      scope: "system",
      stage: "fixture",
      message: "fixture",
      conversationId: "owner-b",
      invocationId: "invocation-b",
    });
    await flushRuntimeLogsPersistence();
    resetRuntimeLogHydrationForTests();
    await initializeRuntimeLogsPersistence();
    const selected = listRuntimeLogs({
      conversationId: "owner-a",
      invocationId: "invocation-a",
    });
    assert.lengthOf(selected, 1);
    assert.equal(selected[0].failureId, "failure-a");
    await clearRuntimeLogs();
  });
  it("normalizes Pi correlations without retaining an owner event globally", function () {
    const entry = normalizeRuntimeLogEntry(
      {
        level: "info",
        scope: "system",
        stage: "turn.started",
        message: "turn.started",
        conversationId: "conversation-test",
        turnId: "turn-test",
        invocationId: "invocation-test",
        details: { authorization: "Bearer private-canary" },
      },
      { id: "audit-test" },
    );
    assert.equal(entry.conversationId, "conversation-test");
    assert.equal(entry.invocationId, "invocation-test");
    assert.notInclude(JSON.stringify(entry), "private-canary");
  });
});

// The filesystem behavior suite is shared with the actual Zotero runtime.
describe("Pi Runtime Audit in Node", function () {
  let root: string;
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-audit-"));
    resetPluginStateStoreForTests();
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    if (root) await fs.rm(root, { recursive: true, force: true });
  });
  piRuntimeAuditSharedTests(() => root);
  it("ends shutdown at the shared deadline while audit owner resolution is stalled", async function () {
    const owner = { kind: "conversation" as const, ownerId: "stalled-audit" };
    await createPiOwner(owner, root);
    await resetPiRuntimeAuditForTests();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "IOUtils");
    let release!: () => void;
    let entered!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    Object.defineProperty(globalThis, "IOUtils", {
      configurable: true,
      value: {
        exists: async () => {
          entered();
          await pending;
          return true;
        },
      },
    });
    try {
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
      });
      await started;
      await shutdownPiRuntimeAudit(Date.now());
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
      });
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "IOUtils", descriptor);
      else Reflect.deleteProperty(globalThis, "IOUtils");
      release();
      await resetPiRuntimeAuditForTests();
    }
    assert.isFalse(
      await fs
        .stat(
          path.join(
            piOwnerPaths(owner, root).dir,
            "workspace",
            "runtime-audit",
            "audit.ndjson",
          ),
        )
        .then(
          () => true,
          () => false,
        ),
    );
    assert.isTrue(
      await fs.stat(piOwnerPaths(owner, root).log).then(
        () => true,
        () => false,
      ),
    );
  });
  it("rejects audit symlinks without writing outside the owner workspace", async function () {
    const owner = { kind: "conversation" as const, ownerId: "link-owner" };
    await createPiOwner(owner, root);
    const workspace = path.join(piOwnerPaths(owner, root).dir, "workspace");
    const outside = path.join(root, "outside");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(outside);
    await fs.symlink(
      outside,
      path.join(workspace, "runtime-audit"),
      process.platform === "win32" ? "junction" : "dir",
    );
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    await flushOwner(owner, root);
    assert.deepEqual(await fs.readdir(outside), []);
    await resetPiRuntimeAuditForTests();
  });
  it("reports a failed watermark write as incomplete export evidence", async function () {
    const owner = {
      kind: "conversation" as const,
      ownerId: "failed-watermark",
    };
    await createPiOwner(owner, root);
    const auditDir = path.join(
      piOwnerPaths(owner, root).dir,
      "workspace",
      "runtime-audit",
    );
    await fs.mkdir(path.dirname(auditDir), { recursive: true });
    await fs.writeFile(auditDir, "blocked");
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
    });
    await flushOwner(owner, root);
    await fs.unlink(auditDir);
    const zip = path.join(root, "incomplete.zip");
    const result = await exportDiagnostics({ kind: "owner", owner, root }, zip);
    assert.equal(result.status, "exported");
    if (result.status === "exported") assert.isFalse(result.complete);
    await createWorkflowArchiveApi().withExtractedZip(
      { sourcePath: zip },
      {},
      async (archive) => {
        const manifest = JSON.parse(await archive.readText("manifest.json"));
        assert.isTrue(
          manifest.gaps.some(
            (gap: { reason: string }) => gap.reason === "audit_write_failed",
          ),
        );
      },
    );
  });
  it("freezes active export before later records and settles deletion without recreating the owner", async function () {
    const { ref: owner } = await createPiConversationOwner(
      { conversationId: "snapshot-owner" },
      root,
    );
    record({
      operation: "owner.terminal",
      origin: "conversation",
      owner,
      root,
      correlation: { turnId: "before-snapshot" },
    });
    await flushOwner(owner, root);
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "IOUtils");
    await resetPiRuntimeAuditForTests();
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const copying = new Promise<void>((resolve) => {
      started = resolve;
    });
    Object.defineProperty(globalThis, "IOUtils", {
      configurable: true,
      value: {
        copy: async (source: string, target: string) => {
          started();
          await held;
          await fs.copyFile(source, target);
        },
      },
    });
    try {
      const zip = path.join(root, "snapshot.zip");
      const exporting = exportDiagnostics({ kind: "owner", owner, root }, zip);
      await copying;
      record({
        operation: "owner.terminal",
        origin: "conversation",
        owner,
        root,
        correlation: { turnId: "after-snapshot" },
      });
      updatePiConversationMetadata(owner.ownerId, { lifecycle: "archived" });
      markPiConversationDeleting(owner.ownerId);
      const deleting = cleanupPiConversation(owner, root);
      release();
      assert.equal((await exporting).status, "exported");
      assert.equal((await deleting).status, "deleted");
      await createWorkflowArchiveApi().withExtractedZip(
        { sourcePath: zip },
        {},
        async (archive) => {
          const audit = await archive.readText("owner-audit.ndjson");
          assert.include(audit, "before-snapshot");
          assert.notInclude(audit, "after-snapshot");
        },
      );
      await flushOwner(owner, root);
      assert.isFalse(
        await fs.stat(piOwnerPaths(owner, root).dir).then(
          () => true,
          () => false,
        ),
      );
    } finally {
      release();
      if (descriptor) Object.defineProperty(globalThis, "IOUtils", descriptor);
      else Reflect.deleteProperty(globalThis, "IOUtils");
      await resetPiRuntimeAuditForTests();
    }
  });
});

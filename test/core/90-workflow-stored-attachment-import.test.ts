import { assert } from "chai";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { createZoteroHostPreparedFiles } from "../../src/modules/zoteroHostPreparedFiles";
import {
  configureMutationAuthorityRuntimeForTests,
  executeReservedMutation,
  MutationAuthorityAdmissionError,
  resetMutationAuthorityRuntimeForTests,
} from "../../src/modules/zoteroHostMutationAuthority";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import type {
  MutationRequestByOperation,
  WorkflowAttachmentCreateRequestDto,
  WorkflowFileRef,
} from "../../src/workflows/types";
import { createCanonicalStoredAttachmentSource } from "../../src/workflows/workflowHostOwners";
import {
  createWorkflowStoredAttachmentStager,
  WorkflowStoredAttachmentInputError,
} from "../../src/workflows/workflowStoredAttachmentImport";

function storedAttachmentCreateInput(
  operationId: string,
  title = "Original",
): MutationRequestByOperation["attachments.create"] {
  return {
    operation: "attachments.create",
    operationId,
    placement: { kind: "top_level", libraryId: 1 },
    metadata: { title },
    source: {
      kind: "stored_file",
      content: {
        schema: "zotero-agents.attachment-content.v1",
        identity: "sha256:content-a",
        main: {
          relativePath: "paper.pdf",
          sizeBytes: 17,
          sha256: "sha256:main-a",
        },
        companions: [],
      },
    },
  };
}

function storedAttachmentCreateRequest(
  operationId: string,
  source: WorkflowFileRef,
  title = "Original",
): WorkflowAttachmentCreateRequestDto {
  return {
    operationId,
    placement: { kind: "top_level" as const, libraryId: 1 },
    metadata: { title },
    source: {
      kind: "stored_file",
      main: { source },
    },
  };
}

describe("Workflow Stored Attachment Preparation", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetMutationAuthorityRuntimeForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
    resetMutationAuthorityRuntimeForTests();
  });

  it("keeps staged paths private while revalidating an immutable source snapshot", async function () {
    const files = new Map<string, Uint8Array>([
      ["/stage/main.pdf", new TextEncoder().encode("main")],
      ["/stage/assets/data.bin", new TextEncoder().encode("data")],
    ]);
    let cleaned = 0;
    const preparedFiles = createZoteroHostPreparedFiles({
      async stageStoredAttachmentSources() {
        return {
          stagingDirectory: "/stage",
          mainFilename: "main.pdf",
          stagedMainPath: "/stage/main.pdf",
          entries: [
            {
              relativePath: "assets/data.bin",
              stagedPath: "/stage/assets/data.bin",
            },
          ],
          async cleanup() {
            cleaned += 1;
          },
        };
      },
      async readBytes(path) {
        const bytes = files.get(path);
        if (!bytes) throw new Error("missing staged file");
        return bytes;
      },
    });

    const prepared = await preparedFiles.prepareStoredAttachment({
      path: "/source/main.pdf",
    });
    assert.isTrue(Object.isFrozen(prepared.snapshot));
    assert.equal(prepared.snapshot.main.relativePath, "main.pdf");
    assert.equal(prepared.snapshot.main.sizeBytes, 4);
    assert.match(prepared.snapshot.main.sha256, /^[a-f0-9]{64}$/);
    assert.notProperty(prepared.snapshot.main, "path");
    const canonical = createCanonicalStoredAttachmentSource(
      {
        main: {
          source: { kind: "local_path", path: "/source/main.pdf" },
        },
      },
      prepared.snapshot,
    );
    assert.match(canonical.content.main.sha256, /^sha256:[a-f0-9]{64}$/);
    assert.match(
      canonical.content.companions[0].sha256,
      /^sha256:[a-f0-9]{64}$/,
    );

    const resolved = await preparedFiles.resolveStoredAttachment(prepared);
    assert.equal(resolved.mainPath, "/stage/main.pdf");
    files.set("/stage/main.pdf", new TextEncoder().encode("changed"));
    try {
      await preparedFiles.resolveStoredAttachment(prepared);
      assert.fail("expected source revalidation to fail");
    } catch (error) {
      assert.match(String(error), /source changed/);
    }
    await resolved.cleanup();
    assert.equal(cleaned, 1);
  });

  it("validates all sources before exposing staged files", async function () {
    const events: string[] = [];
    const stage = createWorkflowStoredAttachmentStager({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async validateSource(path) {
        events.push("validate:" + path);
      },
      async ensureDirectory() {},
      async copyFile(sourcePath, targetPath) {
        events.push("copy:" + sourcePath + "->" + targetPath);
      },
      async removePath() {},
    });

    const staged = await stage({
      path: "/source/main.pdf",
      companionFiles: [
        {
          sourcePath: "/source/assets/image.png",
          relativePath: "assets/image.png",
        },
      ],
    });
    assert.deepEqual(events.slice(0, 2), [
      "validate:/source/main.pdf",
      "validate:/source/assets/image.png",
    ]);
    assert.match(staged.stagedMainPath, /^\/managed\/tmp\/attachment-import\//);
    assert.deepEqual(
      staged.entries.map((entry) => entry.relativePath),
      ["assets/image.png"],
    );
    assert.isTrue(
      events.slice(2).every((entry) => entry.includes("/managed/tmp/")),
    );
  });

  it("rejects unsafe or colliding companion targets before staging", async function () {
    let copied = false;
    const stage = createWorkflowStoredAttachmentStager({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile() {
        copied = true;
      },
      async removePath() {},
    });
    for (const companionFiles of [
      [{ sourcePath: "/source/data.bin", relativePath: "../data.bin" }],
      [
        { sourcePath: "/source/A.bin", relativePath: "assets/Data.bin" },
        { sourcePath: "/source/B.bin", relativePath: "assets/data.bin" },
      ],
    ]) {
      try {
        await stage({ path: "/source/main.pdf", companionFiles });
        assert.fail("expected invalid companion targets");
      } catch (error) {
        assert.instanceOf(error, WorkflowStoredAttachmentInputError);
      }
    }
    assert.isFalse(copied);
  });

  it("cleans staging after a source copy failure", async function () {
    let cleaned = false;
    const stage = createWorkflowStoredAttachmentStager({
      getStagingRoot: () => "/managed/tmp/attachment-import",
      async ensureDirectory() {},
      async copyFile() {
        throw new Error("source is unreadable");
      },
      async removePath() {
        cleaned = true;
      },
    });
    try {
      await stage({ path: "/source/main.pdf" });
      assert.fail("expected staging to fail");
    } catch (error) {
      assert.include(String(error), "source is unreadable");
    }
    assert.isTrue(cleaned);
  });

  it("waits for a running stored-file operation without acquiring its source", async function () {
    const ownerId = "workflow-stored-running";
    const operationId = "stored-file-running";
    const semanticInput = storedAttachmentCreateInput(operationId);
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const enteredEffect = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const active = executeReservedMutation({
      scope: { ownerId },
      operationId,
      operation: "attachments.create",
      semanticInput,
      execute: async () => {
        entered();
        await gate;
        return {
          outcome: "unchanged" as const,
          result: {
            attachment: {
              ref: { libraryId: 1, key: "ABC12345" },
              title: "Existing",
            },
          },
          changes: [],
        };
      },
    });
    await enteredEffect;

    const hostApi = createWorkflowHostApi({ ownerId });
    let settled = false;
    const replay = hostApi.attachments
      .create(
        storedAttachmentCreateRequest(operationId, {
          kind: "local_path",
          path: "/must-not-read.pdf",
        }),
      )
      .then((result) => {
        settled = true;
        return result;
      });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.isFalse(settled);

    release();
    await active;
    const result = await replay;
    assert.equal(result.outcome, "unchanged");
    if (result.outcome === "unchanged") {
      assert.equal(result.result.attachment.title, "Existing");
    }
  });

  it("replays settled stored-file operations before local or resource acquisition", async function () {
    const ownerId = "workflow-stored-settled";
    const operationId = "stored-file-settled";
    const semanticInput = storedAttachmentCreateInput(operationId);
    await executeReservedMutation({
      scope: { ownerId },
      operationId,
      operation: "attachments.create",
      semanticInput,
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {
          attachment: {
            ref: { libraryId: 1, key: "ABC12345" },
            title: "Existing",
          },
        },
        changes: [],
      }),
    });

    const hostApi = createWorkflowHostApi({ ownerId });
    for (const source of [
      { kind: "local_path" as const, path: "/must-not-read.pdf" },
      {
        kind: "resource" as const,
        resourceRef: {
          kind: "workflow_resource" as const,
          id: "must-not-read",
        },
      },
    ]) {
      const result = await hostApi.attachments.create(
        storedAttachmentCreateRequest(operationId, source),
      );
      assert.equal(result.outcome, "unchanged");
    }
  });

  it("returns a tombstone result and rejects changed non-resource semantics before reading the source", async function () {
    const day = 24 * 60 * 60 * 1000;
    let now = 0;
    configureMutationAuthorityRuntimeForTests({ now: () => now });
    const ownerId = "workflow-stored-tombstone";
    const operationId = "stored-file-tombstone";
    const semanticInput = storedAttachmentCreateInput(operationId);
    await executeReservedMutation({
      scope: { ownerId },
      operationId,
      operation: "attachments.create",
      semanticInput,
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {
          attachment: {
            ref: { libraryId: 1, key: "ABC12345" },
            title: "Existing",
          },
        },
        changes: [],
      }),
    });
    now = 30 * day + 1;

    const hostApi = createWorkflowHostApi({ ownerId });
    const tombstone = await hostApi.attachments.create(
      storedAttachmentCreateRequest(operationId, {
        kind: "local_path",
        path: "/must-not-read.pdf",
      }),
    );
    assert.equal(tombstone.outcome, "failed");
    if (tombstone.outcome === "failed") {
      assert.equal(tombstone.attempt.error.code, "unavailable");
    }

    try {
      await hostApi.attachments.create(
        storedAttachmentCreateRequest(
          operationId,
          { kind: "local_path", path: "/must-not-read.pdf" },
          "Changed",
        ),
      );
      assert.fail("expected idempotency conflict");
    } catch (error) {
      assert.instanceOf(error, MutationAuthorityAdmissionError);
      if (error instanceof MutationAuthorityAdmissionError) {
        assert.equal(error.code, "conflict");
        assert.equal(error.details.reason, "idempotency_conflict");
      }
    }
  });
});

import { strict as assert } from "node:assert";

import {
  claimPluginMutationAuthorityEntry,
  configurePluginMutationAuthorityStorageFaultForTests,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
import {
  assertWorkflowHostErrorDetails,
  assertWorkflowHostStrictJsonValue,
} from "../../src/workflows/workflowHostErrorContract";
import {
  MutationAuthorityAdmissionError,
  MutationAuthorityExecutionError,
  configureMutationAuthorityRuntimeForTests,
  executeReservedMutation,
  getMutationOperation,
  lookupReservedMutation,
  lookupTrustedStoredAttachmentMutation,
  resetMutationAuthorityLiveStateForTests,
  resetMutationAuthorityRuntimeForTests,
} from "../../src/modules/zoteroHostMutationAuthority";

describe("Zotero host mutation authority", function () {
  const scope = { ownerId: "authority-interface-test" };
  const operation = "item.updateMetadata" as const;

  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetMutationAuthorityRuntimeForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
    resetMutationAuthorityRuntimeForTests();
  });

  it("admits one durable winner and replays it before preflight or effect", async function () {
    let preflights = 0;
    let effects = 0;
    const args = {
      scope,
      operationId: "durable-winner",
      operation,
      semanticInput: { item: "A" },
      preflight: async () => {
        preflights += 1;
      },
      execute: async () => {
        effects += 1;
        return {
          outcome: "unchanged" as const,
          result: { effects },
          changes: [],
        };
      },
    };

    const first = await executeReservedMutation(args);
    const replay = await executeReservedMutation(args);

    assert.equal(effects, 1);
    assert.equal(preflights, 1);
    assert.deepEqual(replay, first);
  });

  it("never redispatches a failed operation identity", async function () {
    let effects = 0;
    const args = {
      scope,
      operationId: "failed-once",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        effects += 1;
        throw new MutationAuthorityExecutionError(
          "failed",
          "execution_failed",
          "commit",
          "retry_same_operation",
          { phase: "commit", recovery: "retry_same_operation" },
          "write failed",
        );
      },
    };

    const first = await executeReservedMutation(args);
    const replay = await executeReservedMutation(args);

    assert.equal(first.outcome, "failed");
    assert.deepEqual(replay, first);
    assert.equal(effects, 1);
  });

  it("binds nested user previewToken fields as semantic input", async function () {
    let effects = 0;
    const args = {
      scope,
      operationId: "nested-preview-token-binding",
      operation,
      semanticInput: {
        item: "A",
        payload: { previewToken: "user-value-a" },
      },
      execute: async () => {
        effects += 1;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    };

    await executeReservedMutation(args);
    await assert.rejects(
      () =>
        executeReservedMutation({
          ...args,
          semanticInput: {
            item: "A",
            payload: { previewToken: "user-value-b" },
          },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
    assert.equal(effects, 1);
  });

  it("shares one in-progress effect between concurrent submissions", async function () {
    let effects = 0;
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const enteredEffect = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const args = {
      scope,
      operationId: "concurrent-winner",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        effects += 1;
        entered();
        await gate;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    };

    const first = executeReservedMutation(args);
    await enteredEffect;
    const replay = executeReservedMutation(args);
    release();

    assert.deepEqual(await replay, await first);
    assert.equal(effects, 1);
  });

  it("does not reserve an identity when preflight rejects", async function () {
    let preflightFails = true;
    let effects = 0;
    const args = {
      scope,
      operationId: "preflight-retry",
      operation,
      semanticInput: { item: "A" },
      preflight: async () => {
        if (preflightFails) throw new Error("preflight failed");
      },
      execute: async () => {
        effects += 1;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    };

    await assert.rejects(
      () => executeReservedMutation(args),
      /preflight failed/,
    );
    preflightFails = false;
    await executeReservedMutation(args);

    assert.equal(effects, 1);
  });

  it("propagates an admission write failure before any effect", async function () {
    let effects = 0;
    configurePluginMutationAuthorityStorageFaultForTests("admission");

    await assert.rejects(
      () =>
        executeReservedMutation({
          scope,
          operationId: "admission-write-failure",
          operation,
          semanticInput: { item: "A" },
          execute: async () => {
            effects += 1;
            return { outcome: "unchanged" as const, result: {}, changes: [] };
          },
        }),
      /plugin_mutation_authority_test_admission_failure/,
    );

    assert.equal(effects, 0);
    configurePluginMutationAuthorityStorageFaultForTests();
    await executeReservedMutation({
      scope,
      operationId: "admission-write-failure",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        effects += 1;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    });
    assert.equal(effects, 1);
  });

  it("retains settled evidence across a live-runtime reset", async function () {
    let effects = 0;
    const args = {
      scope,
      operationId: "restart-replay",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        effects += 1;
        return {
          outcome: "unchanged" as const,
          result: { effects },
          changes: [],
        };
      },
    };

    const first = await executeReservedMutation(args);
    resetMutationAuthorityLiveStateForTests();
    const replay = await executeReservedMutation(args);

    assert.deepEqual(replay, first);
    assert.equal(effects, 1);
  });

  it("returns unknown and never replays an effect after terminal persistence fails", async function () {
    let effects = 0;
    const args = {
      scope,
      operationId: "terminal-persistence-failure",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        effects += 1;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    };
    configurePluginMutationAuthorityStorageFaultForTests("terminal");
    const returned = await executeReservedMutation(args);
    assert.equal(returned.outcome, "unknown");
    assert.equal(effects, 1);

    configurePluginMutationAuthorityStorageFaultForTests();
    resetMutationAuthorityLiveStateForTests();
    const replay = await executeReservedMutation(args);
    assert.equal(replay.outcome, "unknown");
    assert.equal(effects, 1);
  });

  it("propagates authority read failure rather than reporting unavailable", async function () {
    configurePluginMutationAuthorityStorageFaultForTests("read");

    assert.throws(
      () =>
        getMutationOperation({ scope, operationId: "storage-read-failure" }),
      /plugin_mutation_authority_test_read_failure/,
    );
    await assert.rejects(
      () =>
        executeReservedMutation({
          scope,
          operationId: "storage-read-failure",
          operation,
          semanticInput: { item: "A" },
          execute: async () => {
            assert.fail("storage read failure must occur before effect");
          },
        }),
      /plugin_mutation_authority_test_read_failure/,
    );
    await assert.rejects(
      () =>
        lookupReservedMutation({
          scope,
          operationId: "storage-read-failure",
          operation,
          semanticInput: { item: "A" },
        }),
      /plugin_mutation_authority_test_read_failure/,
    );
  });

  it("reports running and settled operation observations without effects", async function () {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const enteredEffect = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const operationId = "observe-operation";
    const executing = executeReservedMutation({
      scope,
      operationId,
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        entered();
        await gate;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    });

    await enteredEffect;
    assert.deepEqual(getMutationOperation({ scope, operationId }), {
      state: "running",
    });
    release();
    const result = await executing;

    assert.deepEqual(getMutationOperation({ scope, operationId }), {
      state: "settled",
      result,
    });
  });

  it("resolves stored attachment identities before resource acquisition without exposing paths", async function () {
    const attachmentOperation = "attachments.create" as const;
    const fullInput = {
      operationId: "stored-attachment-identity",
      placement: {
        kind: "child" as const,
        parentRef: { libraryId: 1, key: "PARENT01" },
      },
      source: {
        kind: "stored_file" as const,
        content: {
          schema: "zotero-agents.attachment-content.v1" as const,
          identity: "sha256:content-a",
          main: {
            relativePath: "paper.pdf",
            sizeBytes: 17,
            sha256: "sha256:main-a",
          },
          companions: [],
        },
        targetFilename: "paper.pdf",
      },
      metadata: { title: "Original" },
    };
    const { content: _content, ...sourceWithoutContent } = fullInput.source;
    const nonResourceSemanticInput = {
      ...fullInput,
      source: sourceWithoutContent,
    };
    const args = {
      scope,
      operationId: fullInput.operationId,
      operation: attachmentOperation,
      semanticInput: fullInput,
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {},
        changes: [],
      }),
    };

    const first = await executeReservedMutation(args);
    const identity = await lookupTrustedStoredAttachmentMutation({
      scope,
      operationId: fullInput.operationId,
      operation: attachmentOperation,
      nonResourceSemanticInput,
      completeSemanticInput: fullInput,
    });

    assert.deepEqual(identity, { state: "settled", result: first });
  });

  it("resolves a running stored attachment identity before reading content", async function () {
    const attachmentOperation = "attachments.create" as const;
    const fullInput = {
      operationId: "stored-attachment-states",
      placement: {
        kind: "top_level" as const,
        libraryId: 1,
      },
      source: {
        kind: "stored_file" as const,
        content: {
          schema: "zotero-agents.attachment-content.v1" as const,
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
    const { content: _content, ...sourceWithoutContent } = fullInput.source;
    const nonResourceSemanticInput = {
      ...fullInput,
      source: sourceWithoutContent,
    };
    const query = () =>
      lookupTrustedStoredAttachmentMutation({
        scope,
        operationId: fullInput.operationId,
        operation: attachmentOperation,
        nonResourceSemanticInput,
      });

    assert.deepEqual(await query(), { state: "missing" });

    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const enteredEffect = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const executing = executeReservedMutation({
      scope,
      operationId: fullInput.operationId,
      operation: attachmentOperation,
      semanticInput: fullInput,
      execute: async () => {
        entered();
        await gate;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    });
    await enteredEffect;
    let resolved = false;
    const waiting = query().then((result) => {
      resolved = true;
      return result;
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    assert.equal(resolved, false);
    release();
    await executing;
    assert.equal((await waiting).state, "settled");

    const day = 24 * 60 * 60 * 1000;
    let now = 0;
    configureMutationAuthorityRuntimeForTests({ now: () => now });
    const expiringInput = {
      ...fullInput,
      operationId: "stored-attachment-tombstone",
    };
    await executeReservedMutation({
      scope,
      operationId: expiringInput.operationId,
      operation: attachmentOperation,
      semanticInput: expiringInput,
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {},
        changes: [],
      }),
    });
    now = 30 * day + 1;
    const tombstone = await lookupTrustedStoredAttachmentMutation({
      scope,
      operationId: expiringInput.operationId,
      operation: attachmentOperation,
      nonResourceSemanticInput: {
        ...nonResourceSemanticInput,
        operationId: expiringInput.operationId,
      },
    });
    assert.equal(tombstone.state, "tombstone");
    if (tombstone.state !== "tombstone") {
      assert.fail("expected retained tombstone");
    }
    assert.equal(Object.hasOwn(tombstone, "content"), false);
    assert.equal(tombstone.result.outcome, "failed");
    if (tombstone.result.outcome !== "failed") {
      assert.fail("expected unavailable tombstone result");
    }
    assert.equal(tombstone.result.attempt.error.code, "unavailable");
    await assert.rejects(
      () =>
        lookupTrustedStoredAttachmentMutation({
          scope,
          operationId: expiringInput.operationId,
          operation: attachmentOperation,
          nonResourceSemanticInput: {
            ...nonResourceSemanticInput,
            operationId: expiringInput.operationId,
          },
          completeSemanticInput: {
            ...expiringInput,
            source: {
              ...expiringInput.source,
              content: {
                ...expiringInput.source.content,
                identity: "sha256:content-b",
              },
            },
          },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
  });

  it("rejects changed non-resource attachment semantics before lookup and changed known content by full binding", async function () {
    const attachmentOperation = "attachments.create" as const;
    const fullInput = {
      operationId: "stored-attachment-binding",
      placement: {
        kind: "child" as const,
        parentRef: { libraryId: 1, key: "PARENT01" },
      },
      source: {
        kind: "stored_file" as const,
        content: {
          schema: "zotero-agents.attachment-content.v1" as const,
          identity: "sha256:content-a",
          main: {
            relativePath: "paper.pdf",
            sizeBytes: 17,
            sha256: "sha256:main-a",
          },
          companions: [],
        },
      },
      metadata: { title: "Original" },
    };
    const { content: _content, ...sourceWithoutContent } = fullInput.source;
    const nonResourceSemanticInput = {
      ...fullInput,
      source: sourceWithoutContent,
    };
    await executeReservedMutation({
      scope,
      operationId: fullInput.operationId,
      operation: attachmentOperation,
      semanticInput: fullInput,
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {},
        changes: [],
      }),
    });

    for (const changed of [
      {
        ...nonResourceSemanticInput,
        metadata: { title: "Changed" },
      },
      {
        ...nonResourceSemanticInput,
        placement: {
          kind: "child" as const,
          parentRef: { libraryId: 1, key: "PARENT02" },
        },
      },
    ]) {
      await assert.rejects(
        () =>
          lookupTrustedStoredAttachmentMutation({
            scope,
            operationId: fullInput.operationId,
            operation: attachmentOperation,
            nonResourceSemanticInput: changed,
          }),
        (error: unknown) =>
          error instanceof MutationAuthorityAdmissionError &&
          error.code === "conflict" &&
          error.details.reason === "idempotency_conflict",
      );
    }
    await assert.rejects(
      () =>
        lookupTrustedStoredAttachmentMutation({
          scope,
          operationId: fullInput.operationId,
          operation: "attachments.replaceFile",
          nonResourceSemanticInput,
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict",
    );
    await assert.rejects(
      () =>
        lookupTrustedStoredAttachmentMutation({
          scope,
          operationId: fullInput.operationId,
          operation: attachmentOperation,
          nonResourceSemanticInput: {
            ...nonResourceSemanticInput,
            source: { kind: "stored_url", url: "https://example.invalid/a" },
          },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
    await assert.rejects(
      () =>
        lookupTrustedStoredAttachmentMutation({
          scope,
          operationId: fullInput.operationId,
          operation: attachmentOperation,
          nonResourceSemanticInput,
          completeSemanticInput: {
            ...fullInput,
            source: {
              ...fullInput.source,
              content: {
                ...fullInput.source.content,
                identity: "sha256:content-b",
              },
            },
          },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
  });

  it("turns expired evidence into a permanent unavailable identity", async function () {
    const day = 24 * 60 * 60 * 1000;
    let now = 0;
    configureMutationAuthorityRuntimeForTests({ now: () => now });
    const args = {
      scope,
      operationId: "expired-evidence",
      operation,
      semanticInput: { item: "A" },
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {},
        changes: [],
      }),
    };
    await executeReservedMutation(args);
    now = 30 * day + 1;

    assert.deepEqual(await lookupReservedMutation(args), {
      state: "unavailable",
    });
    const unavailable = await executeReservedMutation(args);
    assert.equal(unavailable.outcome, "failed");
    if (unavailable.outcome !== "failed") {
      assert.fail("expected unavailable terminal failure");
    }
    assert.equal(unavailable.attempt.error.code, "unavailable");
    assert.deepEqual(unavailable.attempt.error.details, {
      reason: "outcome_unavailable",
    });
    assert.doesNotThrow(() =>
      assertWorkflowHostErrorDetails(
        "unavailable",
        unavailable.attempt.error.details,
      ),
    );
    assert.equal(unavailable.attempt.error.recovery, "none");
    await assert.rejects(
      () =>
        lookupReservedMutation({
          ...args,
          semanticInput: { item: "B" },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
  });

  it("retains unknown and repair-required evidence beyond normal expiry", async function () {
    const day = 24 * 60 * 60 * 1000;
    let now = 0;
    let effects = 0;
    configureMutationAuthorityRuntimeForTests({ now: () => now });
    for (const status of ["unknown", "repair_required"] as const) {
      now = 0;
      const args = {
        scope,
        operationId: `${status}-retention`,
        operation,
        semanticInput: { item: status },
        execute: async () => {
          effects += 1;
          throw new MutationAuthorityExecutionError(
            status,
            "execution_failed",
            "verification",
            status === "unknown" ? "reconcile" : "manual_repair",
            {
              phase: "verification",
              recovery: status === "unknown" ? "reconcile" : "manual_repair",
            },
            "effect state could not be verified",
          );
        },
      };
      const first = await executeReservedMutation(args);
      now = 30 * day + 1;

      const replay = await lookupReservedMutation(args);
      assert.deepEqual(replay, { state: "settled", result: first });
    }
    assert.equal(effects, 2);
  });

  it("never exposes raw native failure text or non-JSON structured errors", async function () {
    let effects = 0;
    class NativePathSnapshot {
      path = "/private/zotero/profile.sqlite";
    }
    await assert.rejects(
      () =>
        Reflect.apply(executeReservedMutation, undefined, [
          {
            scope,
            operationId: "native-semantic-input",
            operation,
            semanticInput: new NativePathSnapshot(),
            execute: async () => {
              effects += 1;
              return {
                outcome: "unchanged" as const,
                result: {},
                changes: [],
              };
            },
          },
        ]),
      TypeError,
    );
    assert.equal(effects, 0);

    const nativeFailure = await executeReservedMutation({
      scope,
      operationId: "native-error-redaction",
      operation,
      semanticInput: { item: "A" },
      execute: async () => {
        throw new Error(
          "NS_ERROR_FAILURE: native file /private/zotero/profile.sqlite failed",
        );
      },
    });
    assert.equal(nativeFailure.outcome, "failed");
    if (nativeFailure.outcome !== "failed") {
      assert.fail("expected failed attempt");
    }
    assert.equal(
      nativeFailure.attempt.error.message,
      "Mutation execution failed",
    );
    assertWorkflowHostStrictJsonValue(nativeFailure);

    const invalidStructuredFailure = await executeReservedMutation({
      scope,
      operationId: "invalid-structured-error",
      operation,
      semanticInput: { item: "B" },
      execute: async () => {
        const error = new MutationAuthorityExecutionError(
          "failed",
          "unavailable",
          "commit",
          "none",
          { reason: "runtime" },
          "native storage failure",
        );
        Object.assign(error, {
          details: {
            reason: "runtime",
            nativeCause: { path: "/private/zotero/profile.sqlite" },
          },
          affectedRefs: [
            {
              kind: "item",
              ref: {
                libraryId: 1,
                key: "ABCD1234",
                nativePath: "/private/zotero/profile.sqlite",
              },
            },
          ],
        });
        throw error;
      },
    });
    assert.equal(invalidStructuredFailure.outcome, "failed");
    if (invalidStructuredFailure.outcome !== "failed") {
      assert.fail("expected failed attempt");
    }
    assert.equal(
      invalidStructuredFailure.attempt.error.message,
      "Mutation execution failed",
    );
    assert.deepEqual(invalidStructuredFailure.attempt.error.details, {
      phase: "commit",
      recovery: "refresh_and_retry_new_operation",
    });
    assertWorkflowHostStrictJsonValue(invalidStructuredFailure);

    let confirmedEffects = 0;
    const invalidConfirmedResult = await executeReservedMutation({
      scope,
      operationId: "invalid-confirmed-result",
      operation,
      semanticInput: { item: "C" },
      execute: async () => {
        confirmedEffects += 1;
        return {
          outcome: "unchanged" as const,
          result: { native: new NativePathSnapshot() },
          changes: [],
        };
      },
    });
    assert.equal(invalidConfirmedResult.outcome, "unknown");
    resetMutationAuthorityLiveStateForTests();
    const invalidConfirmedReplay = await executeReservedMutation({
      scope,
      operationId: "invalid-confirmed-result",
      operation,
      semanticInput: { item: "C" },
      execute: async () => {
        confirmedEffects += 1;
        return { outcome: "unchanged" as const, result: {}, changes: [] };
      },
    });
    assert.equal(invalidConfirmedReplay.outcome, "unknown");
    assert.equal(confirmedEffects, 1);
  });

  it("reconciles an interrupted durable admission to unknown", async function () {
    const now = new Date().toISOString();
    claimPluginMutationAuthorityEntry({
      scope: scope.ownerId,
      operationId: "interrupted-operation",
      operation,
      semanticDigest: "sha256:interrupted",
      semanticInput: '{"item":"A"}',
      state: "started",
      result: "",
      createdAt: now,
      terminalAt: "",
      lastAccessedAt: now,
    });

    const observed = getMutationOperation({
      scope,
      operationId: "interrupted-operation",
    });

    assert.equal(observed.state, "settled");
    if (observed.state !== "settled") assert.fail("expected settled");
    assert.equal(observed.result.outcome, "unknown");
  });

  it("reports the INSERT OR IGNORE winner rather than matching row content", function () {
    const now = new Date().toISOString();
    const entry = {
      scope: scope.ownerId,
      operationId: "claim-winner",
      operation,
      semanticDigest: "sha256:claim-winner",
      semanticInput: '{"item":"A"}',
      state: "started" as const,
      result: "",
      createdAt: now,
      terminalAt: "",
      lastAccessedAt: now,
    };

    const winner = claimPluginMutationAuthorityEntry(entry);
    const replay = claimPluginMutationAuthorityEntry(entry);

    assert.equal(winner.claimed, true);
    assert.equal(replay.claimed, false);
    assert.equal(replay.entry.operationId, entry.operationId);
  });

  it("rejects a changed binding before replay or effect", async function () {
    const args = {
      scope,
      operationId: "bound-operation",
      operation,
      semanticInput: { item: "A" },
      execute: async () => ({
        outcome: "unchanged" as const,
        result: {},
        changes: [],
      }),
    };
    await executeReservedMutation(args);

    await assert.rejects(
      () =>
        lookupReservedMutation({
          ...args,
          semanticInput: { item: "B" },
        }),
      (error: unknown) =>
        error instanceof MutationAuthorityAdmissionError &&
        error.code === "conflict" &&
        error.details.reason === "idempotency_conflict",
    );
  });
});

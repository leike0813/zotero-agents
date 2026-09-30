import { assert } from "chai";
import { createPiConversationCoordinator } from "../../../../src/modules/piConversation";
import { createPiTextProviderSource } from "../../../../src/modules/piRuntime";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import { createPiTrustedNativeExecution } from "../../../../src/modules/piTrustedNativeExecution";
import {
  ensureRuntimeDirectoryStrict,
  removeRuntimePath,
  writeRuntimeBytes,
} from "../../../../src/modules/runtimePersistence";
import { joinPath } from "../../../../src/utils/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";

const mutationModel: PiModelSelectionSnapshot = {
  configurationId: "host-fixture",
  configurationLabel: "Fixture",
  provider: "fixture",
  modelId: "fixture",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "fixture",
  adapterVersion: "0.84.4",
  runtimeVersion: "0.84.4",
  requiresLocalNetwork: false,
  policy: {
    contextWindow: 32000,
    maxTokens: 2048,
    input: ["text"],
    supportsTools: true,
  },
};

describe("Pi Conversations in real Zotero", function () {
  it("runs tools, reconstructs a second turn and preserves the owner lifecycle without Node", async function () {
    this.timeout(30000);
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-conversation-${Date.now()}`,
    );
    const prior = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
    const model: PiModelSelectionSnapshot = {
      configurationId: "host-fixture",
      configurationLabel: "Fixture",
      provider: "fixture",
      modelId: "fixture",
      authVariant: "none",
      api: "openai-completions",
      baseUrl: "https://example.test",
      reasoning: "off",
      catalogRevision: "fixture",
      adapterVersion: "0.84.4",
      runtimeVersion: "0.84.4",
      requiresLocalNetwork: false,
      policy: {
        contextWindow: 32000,
        maxTokens: 2048,
        input: ["text"],
        supportsTools: true,
      },
    };
    let effects = 0;
    let calls = 0;
    const contexts: string[][] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => {
        const execution = createPiTextProviderSource({
          steps:
            calls++ === 0
              ? [
                  {
                    text: "Read fixture",
                    toolCalls: [
                      {
                        callId: "read-fixture",
                        name: "fixture_read",
                        arguments: {},
                      },
                    ],
                  },
                  { text: "First answer" },
                ]
              : [{ text: "Second answer" }],
        });
        return {
          ...execution,
          source: (input) => {
            contexts.push(
              input.context.messages.map((message) => {
                if (typeof message.content === "string") return message.content;
                return message.content
                  .filter((part) => part.type === "text")
                  .map((part) => (part as { text: string }).text)
                  .join("");
              }),
            );
            return execution.source(input);
          },
        };
      },
      definitions: async () => [
        {
          capabilityId: "fixture.read",
          name: "fixture_read",
          description: "Read a fixture",
          schema: { type: "object", additionalProperties: false },
          minimumEffects: ["bounded-read"],
          maxResultBytes: 1024,
          classify: () => ({
            effects: ["bounded-read"],
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
          }),
          execute: async () => {
            effects++;
            return {
              status: "completed",
              effectCertainty: "not_applicable",
              value: { answer: 42 },
            };
          },
        },
      ],
    });
    let ownerId: string | undefined;
    try {
      await coordinator.create();
      ownerId = coordinator.selectedId!;
      assert.equal(
        (await (await coordinator.send(ownerId, "First question")).result)
          .status,
        "completed",
      );
      assert.equal(effects, 1);
      assert.equal(
        (await (await coordinator.send(ownerId, "Second question")).result)
          .status,
        "completed",
      );
      assert.includeMembers(contexts.at(-1)!, [
        "First question",
        "First answer",
        "Second question",
      ]);
      const history = await inspectPiOwner(
        { kind: "conversation", ownerId },
        root,
      );
      assert.isTrue(
        history.entries.some((entry) => entry.kind === "tool_call_receipt"),
      );
      await coordinator.archive(ownerId);
      assert.lengthOf(await coordinator.list(), 0);
      await coordinator.restore(ownerId);
      assert.equal(coordinator.selectedId, ownerId);
      await coordinator.archive(ownerId);
      await coordinator.delete(ownerId);
      ownerId = undefined;
    } finally {
      await coordinator.dispose();
      if (ownerId) {
        await coordinator.archive(ownerId).catch(() => {});
        await coordinator.delete(ownerId).catch(() => {});
      }
      setPref("piProviderConfigurationJson", prior);
      await removeRuntimePath(root);
    }
  });

  it("snapshots a small owner file through the bounded host reader", async function () {
    this.timeout(30000);
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const workspaceRoot = joinPath(
      Zotero.getTempDirectory().path,
      `pi-snapshot-${Date.now()}`,
    );
    const sourcePath = joinPath(workspaceRoot, "small-note.txt");
    const body = "snapshot-body";
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    await writeRuntimeBytes(sourcePath, new TextEncoder().encode(body));
    const native = await createPiTrustedNativeExecution({
      workspaceRoot,
      ownerRoot: joinPath(workspaceRoot, ".owner"),
      mode: "trusted",
    });
    try {
      const snapshots = await native.snapshotUserFiles([
        { path: sourcePath, displayName: "small-note.txt" },
      ]);
      assert.lengthOf(snapshots, 1);
      const snapshot = snapshots[0];
      assert.equal(snapshot.size, body.length);
      assert.match(snapshot.ref, /^managed:sha256:/);
      assert.equal(
        (await native.resolveUserFileSnapshot(snapshot.ref))?.sha256,
        snapshot.sha256,
      );
      const listed = await native.listUserFileSnapshots();
      assert.deepEqual(
        listed.map((item) => item.ref),
        [snapshot.ref],
      );
      // The transient source path never reaches the managed projection.
      assert.notInclude(JSON.stringify(listed), sourcePath);
      const read = native.definitions.find((item) => item.name === "read")!;
      const result = await read.execute(
        { path: snapshot.path },
        {
          signal: new AbortController().signal,
          onUpdate: () => undefined,
        },
      );
      assert.equal(result.status, "completed");
      assert.equal((result.value as { text: string }).text, body);
    } finally {
      await removeRuntimePath(workspaceRoot);
    }
  });

  it("executes a Zotero mutation through the production Conversation callbacks", async function () {
    this.timeout(30000);
    assert.isUndefined(
      (globalThis as { process?: { versions?: { node?: string } } }).process
        ?.versions?.node,
    );
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-conversation-mutation-${Date.now()}`,
    );
    const prior = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
    const originalTitle = `Pi conversation canary ${Date.now()}`;
    const item = new Zotero.Item("journalArticle");
    item.setField("title", originalTitle);
    await item.saveTx();
    let invocations = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => mutationModel,
      execution: () =>
        createPiTextProviderSource({
          steps:
            invocations++ === 0
              ? [
                  {
                    text: "Rename the item",
                    toolCalls: [
                      {
                        callId: "rename-item",
                        name: "zotero_item_update_metadata",
                        arguments: {
                          itemRef: { libraryId: item.libraryID, key: item.key },
                          patch: {
                            fields: { title: "Pi conversation renamed" },
                          },
                        },
                      },
                    ],
                  },
                ]
              : [{ text: "Renamed" }],
        }),
    });
    let ownerId: string | undefined;
    try {
      await coordinator.create();
      ownerId = coordinator.selectedId!;
      const turn = await coordinator.send(ownerId, "Rename the item");
      assert.equal((await turn.result).status, "waiting_permission");
      const pending = (await coordinator.readModel(ownerId)).pending;
      assert.lengthOf(pending, 1);
      assert.equal(pending[0].call.name, "zotero_item_update_metadata");
      // The mutation is deferred until the domain approval and never applied early.
      assert.equal(item.getField("title"), originalTitle);

      const approval = await coordinator.permission(
        ownerId,
        "rename-item",
        "approve",
      );
      assert.isOk(approval);
      assert.equal((await approval!.result).status, "completed");
      assert.equal(item.getField("title"), "Pi conversation renamed");

      const history = await inspectPiOwner(
        { kind: "conversation", ownerId },
        root,
      );
      const identities = history.entries.filter(
        (entry) => entry.kind === "zotero_mutation_identity",
      );
      const receipts = history.entries.filter(
        (entry) => entry.kind === "zotero_mutation_receipt",
      );
      assert.lengthOf(identities, 1);
      assert.lengthOf(receipts, 1);
      const receipt = receipts[0].payload as {
        outcome: string;
        receipt: { receiptId: string };
      };
      assert.include(["committed", "unchanged"], receipt.outcome);
      assert.isString(receipt.receipt.receiptId);
    } finally {
      if (ownerId) {
        await coordinator.archive(ownerId).catch(() => {});
        await coordinator.delete(ownerId).catch(() => {});
      }
      await coordinator.dispose().catch(() => {});
      await Zotero.Items.trashTx([item.id]).catch(() => false);
      setPref("piProviderConfigurationJson", prior);
      await removeRuntimePath(root);
    }
  });

  it("renews a changed Zotero domain plan without a second model invocation", async function () {
    this.timeout(30000);
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-conversation-renew-${Date.now()}`,
    );
    const prior = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
    const item = new Zotero.Item("journalArticle");
    item.setField("title", `Pi renewal canary ${Date.now()}`);
    await item.saveTx();
    const itemRef = { libraryId: item.libraryID, key: item.key };
    let invocations = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => mutationModel,
      execution: () =>
        createPiTextProviderSource({
          steps:
            invocations++ === 0
              ? [
                  {
                    text: "Rename the item",
                    toolCalls: [
                      {
                        callId: "renew-item",
                        name: "zotero_item_update_metadata",
                        arguments: {
                          itemRef,
                          patch: { fields: { title: "Pi renewal renamed" } },
                        },
                      },
                    ],
                  },
                ]
              : [{ text: "Renamed" }],
        }),
    });
    let ownerId: string | undefined;
    try {
      await coordinator.create();
      ownerId = coordinator.selectedId!;
      const turn = await coordinator.send(ownerId, "Rename the item");
      assert.equal((await turn.result).status, "waiting_permission");
      const original = (await coordinator.readModel(ownerId)).pending[0];

      // An out-of-band change moves the observed revision, so the pending plan
      // can no longer authorize the original approval.
      item.setField("title", "Pi renewal external change");
      await item.saveTx();
      const renewed = await coordinator.permission(
        ownerId,
        "renew-item",
        "approve",
      );
      assert.isUndefined(renewed);
      const renewedState = await coordinator.readModel(ownerId);
      assert.equal(renewedState.status, "waiting_permission");
      assert.lengthOf(renewedState.pending, 1);
      assert.equal(
        renewedState.pending[0].binding.sourceTurnId,
        original.binding.sourceTurnId,
      );
      assert.notEqual(
        renewedState.pending[0].binding.domainPlanDigest,
        original.binding.domainPlanDigest,
      );
      assert.equal(invocations, 1);

      const approved = await coordinator.permission(
        ownerId,
        "renew-item",
        "approve",
      );
      assert.isOk(approved);
      assert.equal((await approved!.result).status, "completed");
      assert.equal(item.getField("title"), "Pi renewal renamed");
      assert.equal(invocations, 2);
    } finally {
      if (ownerId) {
        await coordinator.archive(ownerId).catch(() => {});
        await coordinator.delete(ownerId).catch(() => {});
      }
      await coordinator.dispose().catch(() => {});
      await Zotero.Items.trashTx([item.id]).catch(() => false);
      setPref("piProviderConfigurationJson", prior);
      await removeRuntimePath(root);
    }
  });

  it("keeps generated Source Reference IDs stable across a reference write approval", async function () {
    this.timeout(30000);
    const root = joinPath(
      Zotero.getTempDirectory().path,
      `pi-conversation-references-${Date.now()}`,
    );
    const prior = String(getPref("piProviderConfigurationJson") || "");
    setPref("piProviderConfigurationJson", "");
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", `Pi references canary ${Date.now()}`);
    await parent.saveTx();
    const parentRef = { libraryId: parent.libraryID, key: parent.key };
    let invocations = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => mutationModel,
      execution: () =>
        createPiTextProviderSource({
          steps:
            invocations++ === 0
              ? [
                  {
                    text: "Write references",
                    toolCalls: [
                      {
                        callId: "write-references",
                        name: "zotero_literature_references_upsert",
                        arguments: {
                          parentRef,
                          references: {
                            references: [
                              {
                                extraction: {
                                  raw: "Canary et al. 2024",
                                  confidence: 0.5,
                                },
                                bibliography: {
                                  title: "Canary reference",
                                  authors: ["Canary"],
                                  year: 2024,
                                },
                                matching: {},
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                ]
              : [{ text: "Written" }],
        }),
    });
    let ownerId: string | undefined;
    try {
      await coordinator.create();
      ownerId = coordinator.selectedId!;
      const turn = await coordinator.send(ownerId, "Write the references");
      assert.equal((await turn.result).status, "waiting_permission");

      const sourceIds = async () => {
        const history = await inspectPiOwner(
          { kind: "conversation", ownerId: ownerId! },
          root,
        );
        return history.entries
          .filter((entry) => entry.kind === "zotero_mutation_source_ids")
          .map(
            (entry) =>
              (entry.payload as { generatedSourceReferenceIds: string[] })
                .generatedSourceReferenceIds,
          );
      };
      const before = await sourceIds();
      assert.lengthOf(before, 1);
      assert.isNotEmpty(before[0]);

      const approval = await coordinator.permission(
        ownerId,
        "write-references",
        "approve",
      );
      assert.isOk(approval);
      assert.equal((await approval!.result).status, "completed");

      const after = await sourceIds();
      assert.deepEqual(after, before);
      assert.isNotEmpty(parent.getNotes());
    } finally {
      if (ownerId) {
        await coordinator.archive(ownerId).catch(() => {});
        await coordinator.delete(ownerId).catch(() => {});
      }
      await coordinator.dispose().catch(() => {});
      await Zotero.Items.trashTx([parent.id]).catch(() => false);
      setPref("piProviderConfigurationJson", prior);
      await removeRuntimePath(root);
    }
  });
});

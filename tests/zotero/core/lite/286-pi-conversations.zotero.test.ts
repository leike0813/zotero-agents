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
});

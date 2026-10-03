import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";
import { getCurrentTools } from "@earendil-works/pi-ai";
import { readOwnerAudit } from "./piOwnerAuditRead";
import { createPiConversationCoordinator } from "../../src/modules/piConversation";
import { inspectPiOwner } from "../../src/modules/piOwnerPersistence";
import { piOwnerPaths } from "../../src/modules/piTranscriptStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import { createPiTextProviderSource } from "../../src/modules/piRuntime";
import {
  createPiConversationWorkspaceSurfaceAdapter,
  createPiConversationWorkspaceOwner,
} from "../../src/modules/piConversationWorkspaceSurface";

const model: PiModelSelectionSnapshot = {
  configurationId: "deterministic",
  configurationLabel: "Deterministic",
  provider: "test",
  modelId: "test",
  authVariant: "none",
  api: "openai-completions",
  baseUrl: "https://example.test",
  reasoning: "off",
  catalogRevision: "test",
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

describe("Pi Conversation integration", function () {
  let root: string;
  let prior: string | undefined;
  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-conversation-"));
    prior = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
    installPluginStateNodeSqliteAdapter();
  });
  afterEach(async function () {
    resetPluginStateStoreForTests();
    if (prior === undefined) delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    else process.env.ZOTERO_SKILLS_RUNTIME_ROOT = prior;
    await fs.rm(root, { recursive: true, force: true });
  });

  it("admits durable turns and reconstructs the next invocation from canonical history", async function () {
    const contexts: string[][] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      modelSource: () =>
        async function* (input) {
          contexts.push(input.messages.map((message) => message.text));
          const owner = await inspectPiOwner(
            { kind: "conversation", ownerId: coordinator.selectedId! },
            root,
          );
          assert.isTrue(
            owner.entries.some((entry) => entry.kind === "turn_started"),
          );
          yield "Answer";
        },
      definitions: async () => [],
    });
    const created = await coordinator.create();
    assert.equal(created.status, "created");
    const id = coordinator.selectedId!;
    assert.equal(
      (await (await coordinator.send(id, "First")).result).status,
      "completed",
    );
    assert.equal(
      (await (await coordinator.send(id, "Second")).result).status,
      "completed",
    );
    assert.includeMembers(contexts[1], ["First", "Answer", "Second"]);
    const restored = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
    });
    assert.equal((await restored.list())[0].conversationId, id);
    assert.equal((await restored.readModel(id)).status, "idle");
    await coordinator.archive(id);
    assert.lengthOf(await coordinator.list(), 0);
    await coordinator.restore(id);
    assert.equal((await coordinator.list())[0].conversationId, id);
    await coordinator.dispose();
    await restored.dispose();
  });

  it("retains captured resources before admission and clears them after pure-attachment send", async function () {
    const file = path.join(root, "input.bin");
    await fs.writeFile(file, "immutable");
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      modelSource: () =>
        async function* () {
          yield "What would you like to do?";
        },
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    await coordinator.addFiles(id, [{ path: file, displayName: "input.bin" }]);
    await coordinator.addFiles(id, [{ path: file, displayName: "input.bin" }]);
    assert.lengthOf((await coordinator.readModel(id)).resources, 1);
    const result = await (await coordinator.send(id, "")).result;
    assert.equal(result.status, "completed", JSON.stringify(result));
    assert.lengthOf((await coordinator.readModel(id)).resources, 0);
    const log = JSON.stringify(
      (await inspectPiOwner({ kind: "conversation", ownerId: id }, root))
        .entries,
    );
    assert.notInclude(log, file);
    assert.include(log, "input.bin");
    await coordinator.archive(id);
    await coordinator.delete(id);
    assert.lengthOf(await coordinator.list({ archived: true }), 0);
    await coordinator.dispose();
  });

  it("commits one canonical failure identity before its terminal and audit facts", async function () {
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      modelSource: () =>
        // eslint-disable-next-line require-yield -- deliberate failure before any output
        async function* () {
          throw new Error("private-provider-canary");
        },
      definitions: async () => [],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const result = await (await coordinator.send(id, "First")).result;
    assert.equal(result.status, "failed");

    const entries = (
      await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
    ).entries;
    const failures = entries.filter(
      (entry) => entry.kind === "failure_observed",
    );
    // Exactly one observation, and the terminal that propagates it reuses the
    // same identity rather than describing the cause a second time.
    assert.lengthOf(failures, 1);
    const failureId = (failures[0].payload as { failureId: string }).failureId;
    assert.isString(failureId);
    if (result.status === "failed")
      assert.equal(result.failure.failureId, failureId);
    const terminal = entries.find((entry) => entry.kind === "turn_terminal");
    assert.equal(
      (terminal?.payload as { failureId?: string }).failureId,
      failureId,
    );
    // Canonical-first: the observation is committed before the terminal that
    // references it.
    assert.isBelow(failures[0].seq, terminal!.seq);
    // A failure core carries identity and classification, never the cause text.
    const serialized = JSON.stringify(failures[0].payload);
    assert.notInclude(serialized, "private-provider-canary");
    assert.notProperty(failures[0].payload as object, "message");
    await coordinator.dispose();
  });

  it("keeps the failure observation out of the next model context", async function () {
    const contexts: string[][] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      modelSource: () =>
        async function* (input) {
          contexts.push(input.messages.map((message) => message.text));
          if (contexts.length === 1) throw new Error("private-failure");
          yield "Recovered";
        },
      definitions: async () => [],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    assert.equal(
      (await (await coordinator.send(id, "First")).result).status,
      "failed",
    );
    assert.equal(
      (await (await coordinator.send(id, "Second")).result).status,
      "completed",
    );
    // The durable failure fact exists, yet the rebuilt context carries only the
    // semantic messages a model should see.
    const entries = (
      await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
    ).entries;
    assert.isTrue(entries.some((entry) => entry.kind === "failure_observed"));
    assert.notInclude(JSON.stringify(contexts.at(-1)), "failureId");
    assert.includeMembers(contexts.at(-1)!, ["First", "Second"]);
    await coordinator.dispose();
  });

  it("requires recovery instead of a fictional terminal when the failure fact cannot commit", async function () {
    const response = createPiTextProviderSource({ steps: [{ text: "nope" }] });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => ({
        ...response,
        source: async (input) => {
          // Corrupt the canonical log from inside the turn, so the failure
          // observation that follows cannot be appended.
          const paths = piOwnerPaths(
            { kind: "conversation", ownerId: coordinator.selectedId! },
            root,
          );
          await fs.appendFile(paths.log, "invalid-json\n");
          throw new Error("private-failure");
        },
      }),
      definitions: async () => [],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const result = await (await coordinator.send(id, "First")).result;
    // A failure whose canonical observation could not be committed is an
    // integrity gap, not a settled failure: the owner must require recovery
    // rather than publish a terminal describing a fact that does not exist.
    assert.equal(result.status, "failed");
    assert.equal((await coordinator.readModel(id)).status, "recovery_required");
    // The failure observation never reached the log, so nothing may claim a
    // failureId for it; the owner simply requires recovery.
    const inspection = await inspectPiOwner(
      { kind: "conversation", ownerId: id },
      root,
    );
    assert.notEqual(inspection.status, "valid");
    await coordinator.dispose();
  });

  it("keeps an uncertain tool failure as one observation without inventing a turn cause", async function () {
    const response = createPiTextProviderSource({
      steps: [
        {
          text: "Read",
          toolCalls: [{ callId: "read", name: "fixture_read", arguments: {} }],
        },
      ],
    });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => response,
      definitions: async () => [
        {
          capabilityId: "fixture.read",
          name: "fixture_read",
          description: "Read",
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
            throw new Error("private-tool-cause");
          },
        },
      ],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const result = await (await coordinator.send(id, "Read something")).result;
    const entries = (
      await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
    ).entries;
    const failures = entries.filter(
      (entry) => entry.kind === "failure_observed",
    );
    const gatewayFailures = failures.filter(
      (entry) =>
        (entry.payload as { origin?: string }).origin === "pi_tool_gateway",
    );
    assert.lengthOf(gatewayFailures, 1);
    assert.lengthOf(failures, 1);
    assert.equal(
      (gatewayFailures[0].payload as { effectCertainty: string })
        .effectCertainty,
      "unknown",
    );
    const turnTerminal = entries
      .filter((entry) => entry.kind === "turn_terminal")
      .at(-1);
    assert.equal(result.status, "state_unknown");
    assert.notProperty(turnTerminal!.payload as object, "failureId");
    await coordinator.dispose();
  });

  it("keeps resources and admits no prompt when a local provider is not authorized", async function () {
    const file = path.join(root, "local.txt");
    await fs.writeFile(file, "resource");
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => ({
        ...model,
        baseUrl: "http://127.0.0.1:1234",
        requiresLocalNetwork: true,
      }),
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: "Answer" }] }),
      definitions: async () => [],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    await coordinator.addFiles(id, [{ path: file }]);
    try {
      await coordinator.send(id, "Prompt");
      assert.fail("local provider was admitted");
    } catch (error) {
      assert.include(String(error), "local_network");
    }
    assert.lengthOf((await coordinator.readModel(id)).resources, 1);
    assert.lengthOf(
      (await inspectPiOwner({ kind: "conversation", ownerId: id }, root))
        .entries,
      0,
    );
    await coordinator.dispose();
  });

  it("interrupts preflight without admitting or clearing the owner's draft", async function () {
    let hold = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => {
        if (hold) await gate;
        return model;
      },
      definitions: async () => [],
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: "Answer" }] }),
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    hold = true;
    const send = coordinator.send(id, "Keep this draft").catch(() => null);
    coordinator.cancel(id);
    release();
    await send;
    assert.lengthOf(
      (await inspectPiOwner({ kind: "conversation", ownerId: id }, root))
        .entries,
      0,
    );
    const restored = await coordinator.readModel(id);
    assert.equal(restored.status, "idle");
    assert.equal(restored.sendAdmissionRevision, 0);
    const admitted = await coordinator.send(id, "Send now");
    assert.equal((await admitted.result).status, "completed");
    assert.equal((await coordinator.readModel(id)).sendAdmissionRevision, 1);
    await coordinator.dispose();
  });

  it("compacts settled history and uses the committed summary in the next invocation", async function () {
    const contexts: string[][] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [],
      modelSource: () =>
        async function* (input) {
          if (input.systemPrompt.includes("Summarize")) {
            const request = JSON.parse(input.messages[0].text);
            yield JSON.stringify({
              schemaVersion: 1,
              inputDigest: request.inputDigest,
              coveredEntryIds: request.coveredEntryIds,
              retainedEntryIds: request.retainedEntryIds,
              goals: ["Condensed history"],
              decisions: [],
              constraints: [],
              unfinishedWork: [],
              artifactRefs: [],
              effectReceiptRefs: [],
              unresolved: [],
              facts: [],
            });
          } else {
            contexts.push(input.messages.map((message) => message.text));
            yield "Answer";
          }
        },
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    await (
      await coordinator.send(id, "First")
    ).result;
    await (
      await coordinator.send(id, "Second")
    ).result;
    await coordinator.compact(id);
    assert.isTrue(
      (
        await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
      ).entries.some((entry) => entry.kind === "compaction"),
    );
    assert.equal(
      (await (await coordinator.send(id, "Third")).result).status,
      "completed",
    );
    assert.isTrue(
      contexts.at(-1)!.some((text) => text.includes("Condensed history")),
    );
    await coordinator.dispose();
  });

  it("reports a failed compaction while preserving the original history", async function () {
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [],
      modelSource: () =>
        async function* (input) {
          yield input.systemPrompt.includes("Summarize")
            ? "invalid summary"
            : "Answer";
        },
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    await (
      await coordinator.send(id, "First")
    ).result;
    let failed = false;
    try {
      await coordinator.compact(id);
    } catch {
      failed = true;
    }
    assert.isTrue(failed);
    const view = await coordinator.readModel(id);
    assert.equal(view.status, "failed");
    assert.equal(view.failure, "compaction_failed");
    assert.isFalse(
      (
        await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
      ).entries.some((entry) => entry.kind === "compaction"),
    );
    await coordinator.dispose();
  });

  it("interrupts manual compaction without replacing the selected history", async function () {
    let begin!: () => void;
    const entered = new Promise<void>((resolve) => {
      begin = resolve;
    });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [],
      modelSource: () =>
        async function* (input) {
          if (input.systemPrompt.includes("Summarize")) {
            begin();
            await new Promise<void>((resolve) =>
              input.signal.addEventListener("abort", () => resolve(), {
                once: true,
              }),
            );
            yield "Late summary";
          } else yield "Answer";
        },
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    await (
      await coordinator.send(id, "First")
    ).result;
    const compacted = coordinator.compact(id).catch(() => {});
    await entered;
    coordinator.cancel(id);
    await Promise.race([
      compacted,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("compaction did not stop")), 500),
      ),
    ]);
    assert.equal((await coordinator.readModel(id)).status, "idle");
    assert.isFalse(
      (
        await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
      ).entries.some((entry) => entry.kind === "compaction"),
    );
    await coordinator.dispose();
  });

  it("routes an entire tool batch through the Gateway and prepares the continuation", async function () {
    let effects = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () =>
        createPiTextProviderSource({
          steps: [
            {
              text: "Reading",
              toolCalls: [
                { callId: "read-1", name: "read_fact", arguments: {} },
              ],
            },
            { text: "Finished" },
          ],
        }),
      definitions: async () => [
        {
          capabilityId: "test.read",
          name: "read_fact",
          description: "Read a deterministic fact",
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
    await coordinator.create();
    const id = coordinator.selectedId!;
    assert.equal(
      (await (await coordinator.send(id, "Read fact")).result).status,
      "completed",
    );
    assert.equal(effects, 1);
    const entries = (
      await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
    ).entries;
    assert.equal(
      entries.filter((entry) => entry.kind === "turn_preparation").length,
      2,
    );
    assert.equal(
      entries.filter((entry) => entry.kind === "tool_result").length,
      1,
    );
    assert.equal(
      entries.filter((entry) => entry.kind === "tool_call_receipt").length,
      1,
    );
    await coordinator.dispose();
  });

  it("permanently revokes original navigation when Conversation selection changes away and back", async function () {
    let effects = 0;
    let original = "";
    let other = "";
    const sourceWindow = {} as _ZoteroTypes.MainWindow;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => {
        const execution = createPiTextProviderSource({
          steps: [
            {
              toolCalls: [
                { callId: "navigate", name: "navigate", arguments: {} },
              ],
            },
            { text: "Done" },
          ],
        });
        return {
          ...execution,
          source: (input) => {
            void coordinator.select(other);
            void coordinator.select(original);
            return execution.source(input);
          },
        };
      },
      definitions: async () => [
        {
          capabilityId: "test.navigate",
          name: "navigate",
          description: "Navigate",
          schema: { type: "object", additionalProperties: false },
          minimumEffects: ["host-control"],
          requiresForegroundConversation: true,
          maxResultBytes: 1024,
          classify: () => ({
            effects: ["host-control"],
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
          }),
          execute: async () => {
            effects++;
            return {
              status: "completed",
              effectCertainty: "confirmed_complete",
            };
          },
        },
      ],
    });
    await coordinator.create();
    original = coordinator.selectedId!;
    await coordinator.create();
    other = coordinator.selectedId!;
    await coordinator.select(original);
    await (
      await coordinator.send(original, "Navigate", undefined, {
        resolveAndValidate: () => sourceWindow,
      })
    ).result;
    assert.equal(effects, 0);
    const history = await inspectPiOwner(
      { kind: "conversation", ownerId: original },
      root,
    );
    const result = history.entries.find((entry) => entry.kind === "tool_result")
      ?.payload as { text: string };
    assert.equal(JSON.parse(result.text).failure.code, "policy_denied");
    await coordinator.dispose();
  });

  for (const validAtContinuation of [true, false]) {
    it(`suspends a permission batch and resumes only the reviewed call in a new turn (source ${validAtContinuation})`, async function () {
      let writes = 0;
      let executions = 0;
      let sourceValid = true;
      let navigations = 0;
      const sourceWindow = {} as _ZoteroTypes.MainWindow;
      const coordinator = createPiConversationCoordinator({
        root,
        resolveModel: async () => model,
        execution: () => {
          const iteration = executions++;
          const execution = createPiTextProviderSource({
            steps:
              iteration === 0
                ? [
                    {
                      text: "Need permission",
                      toolCalls: [
                        {
                          callId: "write-1",
                          name: "write_fact",
                          arguments: {},
                        },
                      ],
                    },
                  ]
                : iteration === 2 || (iteration === 1 && !sourceValid)
                  ? [{ text: "No navigation" }]
                  : [
                      {
                        text: "Navigate",
                        toolCalls: [
                          { callId: "nav-1", name: "navigate", arguments: {} },
                        ],
                      },
                      { text: "Done" },
                    ],
          });
          return {
            ...execution,
            source: (input) => {
              if (iteration === 2 || (iteration === 1 && !sourceValid))
                assert.notInclude(
                  getCurrentTools(input.context.messages).map(
                    (tool) => tool.name,
                  ),
                  "navigate",
                  "model only sees the effective catalog",
                );
              return execution.source(input);
            },
          };
        },
        definitions: async () => [
          {
            capabilityId: "test.navigate",
            name: "navigate",
            description: "Navigate",
            schema: { type: "object", additionalProperties: false },
            minimumEffects: ["host-control"],
            requiresForegroundConversation: true,
            maxResultBytes: 1024,
            classify: () => ({
              effects: ["host-control"],
              authorizationKeys: [],
              resourceKeys: [],
              cost: 1,
            }),
            execute: async () => {
              navigations++;
              return {
                status: "completed",
                effectCertainty: "confirmed_complete",
              };
            },
          },
          {
            capabilityId: "test.write",
            name: "write_fact",
            description: "Write a deterministic fact",
            schema: { type: "object", additionalProperties: false },
            minimumEffects: ["workspace-mutation"],
            maxResultBytes: 1024,
            classify: () => ({
              effects: ["workspace-mutation"],
              authorizationKeys: ["workspace:fixture"],
              resourceKeys: ["workspace:fixture"],
              cost: 1,
            }),
            execute: async () => {
              writes++;
              return {
                status: "completed",
                effectCertainty: "confirmed_complete",
                value: { changed: true },
              };
            },
          },
        ],
      });
      await coordinator.create();
      const id = coordinator.selectedId!;
      assert.equal(
        (
          await (
            await coordinator.send(id, "Write fact", undefined, {
              resolveAndValidate: () => (sourceValid ? sourceWindow : null),
            })
          ).result
        ).status,
        "waiting_permission",
      );
      assert.equal(writes, 0);
      assert.equal(
        (await coordinator.readModel(id)).status,
        "waiting_permission",
      );
      sourceValid = validAtContinuation;
      let resumed = await coordinator.permission(id, "write-1", "approve");
      if (!validAtContinuation) {
        assert.isUndefined(resumed);
        assert.equal(
          (await coordinator.readModel(id)).status,
          "waiting_permission",
        );
        assert.equal(
          executions,
          1,
          "a changed catalog renews review without model reissue",
        );
        resumed = await coordinator.permission(id, "write-1", "approve");
      }
      assert.exists(resumed);
      assert.equal((await resumed!.result).status, "completed");
      assert.equal(writes, 1);
      assert.equal(
        navigations,
        validAtContinuation ? 1 : 0,
        "original authority survives a permission continuation",
      );
      sourceValid = false;
      assert.equal(
        (
          await (
            await coordinator.send(id, "Later", undefined, {
              resolveAndValidate: () => (sourceValid ? sourceWindow : null),
            })
          ).result
        ).status,
        "completed",
      );
      assert.equal(
        navigations,
        validAtContinuation ? 1 : 0,
        "later turns cannot reuse previous authority",
      );
      const laterWindow = {} as _ZoteroTypes.MainWindow;
      assert.equal(
        (
          await (
            await coordinator.send(id, "New source", undefined, {
              resolveAndValidate: () => laterWindow,
            })
          ).result
        ).status,
        "completed",
      );
      assert.equal(
        navigations,
        validAtContinuation ? 2 : 1,
        "new prompt receives its own source authority",
      );
      const entries = (
        await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
      ).entries;
      const resumedTurnId = entries
        .filter((entry) => entry.kind === "turn_terminal")
        .at(-1)!.turnId;
      assert.isTrue(
        entries.some(
          (entry) =>
            entry.kind === "turn_started" && entry.turnId === resumedTurnId,
        ),
        "permission continuation has durable turn admission",
      );
      await coordinator.dispose();
    });
  }

  it("keeps a changed domain plan actionable without model reissue", async function () {
    let revision = 1;
    let writes = 0;
    let invocations = 0;
    const sources: string[] = [];
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () =>
        createPiTextProviderSource({
          steps:
            invocations++ === 0
              ? [
                  {
                    text: "Review write",
                    toolCalls: [
                      {
                        callId: "domain-write",
                        name: "write_domain",
                        arguments: {},
                      },
                    ],
                  },
                ]
              : [{ text: "Done" }],
        }),
      definitions: async () => [
        {
          capabilityId: "test.domain-write",
          name: "write_domain",
          description: "Write with current domain facts",
          schema: { type: "object", additionalProperties: false },
          minimumEffects: ["zotero-mutation"],
          maxResultBytes: 1024,
          classify: () => ({
            effects: ["zotero-mutation"],
            authorizationKeys: [],
            resourceKeys: ["library:1"],
            cost: 1,
          }),
          execute: async () => {
            throw new Error("preflight required");
          },
          preflight: async (_args, context) => {
            sources.push(context.sourceTurnId);
            return {
              status: "prepared",
              domainPlanDigest: `sha256:${String(revision).repeat(64)}`,
              admissionFacts: { plan: { revision } },
              dispose: async () => {},
              execute: async () => {
                writes++;
                return {
                  status: "completed",
                  effectCertainty: "confirmed_complete",
                  value: { changed: true },
                };
              },
            };
          },
        },
      ],
    });
    await coordinator.create();
    const ownerId = coordinator.selectedId!;
    assert.equal(
      (await (await coordinator.send(ownerId, "Write")).result).status,
      "waiting_permission",
    );
    const original = (await coordinator.readModel(ownerId)).pending[0];
    revision++;
    assert.isUndefined(
      await coordinator.permission(ownerId, "domain-write", "approve"),
    );
    const renewed = await coordinator.readModel(ownerId);
    assert.equal(renewed.status, "waiting_permission");
    assert.lengthOf(renewed.pending, 1);
    assert.deepEqual(renewed.pending[0].admissionFacts, {
      plan: { revision: 2 },
    });
    assert.equal(
      renewed.pending[0].binding.sourceTurnId,
      original.binding.sourceTurnId,
    );
    const surface = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    const regions = await surface.readOwnerRegions({
      owner: createPiConversationWorkspaceOwner(ownerId),
      kinds: ["permission"],
    });
    assert.include(JSON.stringify(regions), '\\"revision\\":2');
    assert.equal(writes, 0);
    assert.equal(invocations, 1);
    const continued = await coordinator.permission(
      ownerId,
      "domain-write",
      "approve",
    );
    assert.equal((await continued!.result).status, "completed");
    assert.equal(writes, 1);
    assert.equal(new Set(sources).size, 1);
    await coordinator.dispose();
  });

  it("halts after an unknown tool effect without another invocation or replay", async function () {
    let calls = 0;
    let effects = 0;
    const built = createPiTextProviderSource({
      steps: [
        {
          toolCalls: [
            { callId: "unknown-1", name: "read_fact", arguments: {} },
          ],
        },
        { text: "Must not run" },
      ],
    });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => ({
        model: built.model,
        source: async (request) => {
          calls++;
          return built.source(request);
        },
      }),
      definitions: async () => [
        {
          capabilityId: "test.read",
          name: "read_fact",
          description: "Read a fact",
          schema: { type: "object" },
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
              status: "failed",
              effectCertainty: "unknown",
              code: "effect_unknown",
            };
          },
        },
      ],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const result = await (await coordinator.send(id, "Read fact")).result;
    assert.equal(result.status, "state_unknown");
    assert.equal((await coordinator.readModel(id)).status, "recovery_required");
    assert.equal(calls, 1);
    assert.equal(effects, 1);
    const restored = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
    });
    assert.equal((await restored.readModel(id)).status, "recovery_required");
    await coordinator.dispose();
    await restored.dispose();
  });

  it("stops before tool effects when an assistant fact cannot be committed", async function () {
    let effects = 0;
    const response = createPiTextProviderSource({
      steps: [
        {
          text: "Read",
          toolCalls: [{ callId: "read", name: "fixture_read", arguments: {} }],
        },
      ],
    });
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () => ({
        ...response,
        source: async (input) => {
          const paths = piOwnerPaths(
            { kind: "conversation", ownerId: coordinator.selectedId! },
            root,
          );
          await fs.appendFile(paths.log, "invalid-json\n");
          return response.source(input);
        },
      }),
      definitions: async () => [
        {
          capabilityId: "fixture.read",
          name: "fixture_read",
          description: "Read",
          schema: { type: "object" },
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
              value: {},
            };
          },
        },
      ],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const result = await (await coordinator.send(id, "First")).result;
    assert.equal(result.status, "failed");
    assert.equal(effects, 0);
    assert.equal((await coordinator.readModel(id)).status, "recovery_required");
    await coordinator.dispose();
  });

  it("preserves settled tool results when a running tool batch is interrupted", async function () {
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let invocation = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      execution: () =>
        createPiTextProviderSource({
          steps:
            invocation++ === 0
              ? [
                  {
                    text: "Read",
                    toolCalls: [
                      { callId: "read", name: "fixture_read", arguments: {} },
                    ],
                  },
                ]
              : [{ text: "Next answer" }],
        }),
      definitions: async () => [
        {
          capabilityId: "fixture.read",
          name: "fixture_read",
          description: "Read",
          schema: { type: "object" },
          minimumEffects: ["bounded-read"],
          maxResultBytes: 1024,
          classify: () => ({
            effects: ["bounded-read"],
            authorizationKeys: [],
            resourceKeys: [],
            cost: 1,
          }),
          execute: async () => {
            enter();
            await gate;
            return { status: "canceled", effectCertainty: "confirmed_none" };
          },
        },
      ],
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const first = await coordinator.send(id, "First");
    await entered;
    coordinator.cancel(id);
    release();
    assert.equal((await first.result).status, "canceled");
    const cancellationAudit = await readOwnerAudit(root, {
      kind: "conversation",
      ownerId: id,
    });
    assert.lengthOf(
      cancellationAudit.filter(
        (entry) => entry.operation === "execution.canceled",
      ),
      1,
    );
    const history = await inspectPiOwner(
      { kind: "conversation", ownerId: id },
      root,
    );
    assert.isTrue(
      history.entries.some((entry) => entry.kind === "tool_result"),
    );
    assert.equal(
      (await (await coordinator.send(id, "Next")).result).status,
      "completed",
    );
    await coordinator.dispose();
  });

  it("interrupts without admitting another prompt and permits a new settled turn", async function () {
    let release!: () => void;
    let entered!: () => void;
    const begun = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let calls = 0;
    const coordinator = createPiConversationCoordinator({
      root,
      resolveModel: async () => model,
      definitions: async () => [],
      modelSource: () =>
        async function* (input) {
          calls++;
          if (calls === 1) {
            yield "Partial";
            entered();
            await new Promise<void>((resolve) => {
              release = resolve;
              input.signal.addEventListener("abort", resolve, { once: true });
            });
            yield "Late";
          } else yield "Next";
        },
    });
    await coordinator.create();
    const id = coordinator.selectedId!;
    const first = await coordinator.send(id, "First");
    await begun;
    try {
      await coordinator.send(id, "Queued");
      assert.fail("busy owner accepted another prompt");
    } catch (error) {
      assert.include(String(error), "replyable");
    }
    coordinator.cancel(id);
    release();
    assert.equal((await first.result).status, "canceled");
    assert.equal(
      (await (await coordinator.send(id, "Second")).result).status,
      "completed",
    );
    const entries = (
      await inspectPiOwner({ kind: "conversation", ownerId: id }, root)
    ).entries;
    assert.equal(
      entries.filter(
        (entry) =>
          entry.kind === "message" && (entry.payload as any).role === "user",
      ).length,
      2,
    );
    assert.notInclude(JSON.stringify(entries), "Late");
    await coordinator.dispose();
  });
});

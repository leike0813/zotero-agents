import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assert } from "chai";

import { createPiConversationCoordinator } from "../../src/modules/piConversation";
import { createPiSkillRunCoordinator } from "../../src/modules/piSkillRun";
import {
  createPiConversationWorkspaceOwner,
  createPiConversationWorkspaceSurfaceAdapter,
} from "../../src/modules/piConversationWorkspaceSurface";
import {
  createPiSkillRunsWorkspaceOwner,
  createPiSkillRunsWorkspaceSurfaceAdapter,
  PI_SKILL_RUN_CHANGE_PUBLICATION_MAPPING,
} from "../../src/modules/piSkillRunWorkspaceSurface";
import { mapWorkspaceChangeKindsToPublicationKinds } from "../../src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton";
import type { ProviderExecuteArgs } from "../../src/providers/types";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  assertAssistantWorkspacePublication,
  type AssistantWorkspacePublication,
  type AssistantWorkspaceOwner,
} from "../../src/modules/assistant/publication/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistant/publication/assistantWorkspacePublicationCoordinator";
import { AssistantWorkspacePublicationRuntime } from "../../src/modules/assistant/publication/assistantWorkspacePublicationRuntime";
import { parseAssistantWorkspaceTranscriptPageRequest } from "../../src/modules/assistant/publication/assistantWorkspaceTranscriptPublication";
import { assistantWorkspaceTestPublication } from "../helpers/assistantWorkspacePublicationHarness";
import { installPluginStateNodeSqliteAdapter } from "../helpers/pluginStateNodeSqliteAdapter";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { createPiTextProviderSource } from "../../src/modules/piRuntime";
import {
  ASSISTANT_WORKSPACE_LANE_ORDER,
  ASSISTANT_WORKSPACE_LANE_REGISTRY,
  ASSISTANT_WORKSPACE_SOURCE_REGISTRY,
  DEFAULT_ASSISTANT_WORKSPACE_LANE_ID,
  DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID,
  listNavigableAssistantWorkspaceLaneSources,
  type AssistantWorkspaceSourceId,
} from "../../src/shared/assistantWorkspaceSourceRegistry";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";
import { getPref, setPref } from "../../src/utils/prefs";
import { upsertPiProviderConfiguration } from "../../src/modules/piProviderConfiguration";

const SOURCE_IDS: AssistantWorkspaceSourceId[] = [
  "pi-conversations",
  "acp-chat",
  "pi-skill-runs",
  "acp-skills",
  "skillrunner",
];

// Every non-navigation, non-transcript region the Pi surface can read. Each
// returned payload is wrapped in the real envelope shell and pushed through
// the strict publication assertion (the tests184 pattern); the adapter's
// readOwnerRegions is the production shape the coordinator publishes against.
const REGION_KINDS = [
  "owner-control",
  "message-counts",
  "plan",
  "permission",
  "composer",
  "owner-presentation",
  "owner-details",
] as const;

const MODEL: PiModelSelectionSnapshot = {
  configurationId: "deterministic",
  configurationLabel: "Deterministic",
  provider: "test",
  modelId: "test-model",
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

function publicationError(
  owner: AssistantWorkspaceOwner,
  kind: (typeof REGION_KINDS)[number] | "owner-navigation",
  payload: unknown,
): string | null {
  try {
    assertAssistantWorkspacePublication(
      assistantWorkspaceTestPublication({
        owner,
        kind: kind as never,
        payload: payload as never,
      }),
    );
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe("Pi Conversation workspace publication", function () {
  this.timeout(30_000);

  let root: string;
  let prior: string | undefined;

  beforeEach(async function () {
    root = await fs.mkdtemp(
      path.join(os.tmpdir(), "pi-workspace-publication-"),
    );
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

  function createCoordinator(streamedText = "Answer") {
    return createPiConversationCoordinator({
      root,
      resolveModel: async () => MODEL,
      execution: () =>
        createPiTextProviderSource({ steps: [{ text: streamedText }] }),
      definitions: async () => [],
    });
  }

  it("publishes the two-lane five-source registry with action parity", function () {
    assert.deepEqual(ASSISTANT_WORKSPACE_LANE_ORDER, [
      "conversations",
      "skill-runs",
    ]);
    assert.deepEqual(
      Object.keys(ASSISTANT_WORKSPACE_SOURCE_REGISTRY).sort(),
      [...SOURCE_IDS].sort(),
    );
    assert.equal(DEFAULT_ASSISTANT_WORKSPACE_LANE_ID, "conversations");
    assert.equal(DEFAULT_ASSISTANT_WORKSPACE_SOURCE_ID, "pi-conversations");
    assert.equal(
      ASSISTANT_WORKSPACE_LANE_REGISTRY.conversations.defaultSourceId,
      "pi-conversations",
    );
    assert.equal(
      ASSISTANT_WORKSPACE_LANE_REGISTRY["skill-runs"].defaultSourceId,
      "skillrunner",
    );
    assert.deepEqual(listNavigableAssistantWorkspaceLaneSources("skill-runs"), [
      "pi-skill-runs",
      "acp-skills",
      "skillrunner",
    ]);

    const actionIds = Object.keys(
      ASSISTANT_WORKSPACE_ACTION_REGISTRY,
    ) as (keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY)[];
    for (const sourceId of SOURCE_IDS) {
      const descriptor = ASSISTANT_WORKSPACE_SOURCE_REGISTRY[sourceId];
      assert.equal(descriptor.id, sourceId);
      assert.include(
        ASSISTANT_WORKSPACE_LANE_REGISTRY[descriptor.lane].sourceIds,
        sourceId,
      );
      assert.isAbove(descriptor.label.length, 0, sourceId + " label");
      const expected = actionIds
        .filter((actionId) =>
          (
            ASSISTANT_WORKSPACE_ACTION_REGISTRY[actionId]
              .sources as readonly string[]
          ).includes(sourceId),
        )
        .sort();
      assert.deepEqual(
        [...descriptor.actions].sort(),
        expected,
        sourceId + " registration must match the action registry",
      );
    }
  });

  it("accepts the Pi canonical owner and publishes every ready region", async function () {
    const coordinator = createCoordinator();
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);

    const navigation = await adapter.readOwnerNavigation();
    assert.equal(navigation.selectedOwner?.conversationId, id);
    assert.lengthOf(navigation.entries, 1);
    assert.equal(navigation.entries[0].owner.conversationId, id);
    assert.equal(publicationError(owner, "owner-navigation", navigation), null);

    assert.deepEqual(
      parseAssistantWorkspaceTranscriptPageRequest({
        owner,
        request: { cursor: null, limit: 50 },
      }),
      { owner, request: { cursor: null, limit: 50 } },
    );

    const regions = await adapter.readOwnerRegions({
      owner,
      kinds: REGION_KINDS,
    });
    const failures = REGION_KINDS.map((kind) => {
      const payload = regions[kind];
      if (!payload) return kind + ": missing region payload";
      return publicationError(owner, kind, payload);
    }).filter((value): value is string => value !== null);
    assert.deepEqual(failures, []);
    assert.include(regions["owner-details"]!.actions, "rename-conversation");

    await coordinator.dispose();
  });

  it("publishes owner-scoped optional composer resources", async function () {
    const coordinator = createCoordinator();
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);
    const file = path.join(root, "note.txt");
    await fs.writeFile(file, "hello");
    await coordinator.addFiles(id, [{ path: file, displayName: "note.txt" }]);

    const regions = await adapter.readOwnerRegions({
      owner,
      kinds: ["composer"],
    });
    const composer = regions.composer!;
    assert.lengthOf(composer.resources ?? [], 1);
    assert.equal(composer.resources![0].label, "note.txt");
    assert.equal(composer.resources![0].status, "ready");
    assert.equal(publicationError(owner, "composer", composer), null);
    coordinator.setComposerError(id, "pi_resource_add_failed");
    const failed = await adapter.readOwnerRegions({
      owner,
      kinds: ["composer"],
    });
    assert.equal(failed.composer?.errors?.[0].code, "pi_resource_add_failed");
    assert.lengthOf(failed.composer?.resources ?? [], 1);

    await coordinator.dispose();
  });

  it("maps live transcript deltas and reads the canonical page first", async function () {
    const coordinator = createCoordinator("Streamed answer");
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);
    const changes: Parameters<typeof adapter.mapChange>[0][] = [];
    coordinator.subscribe((change) => changes.push(change));

    const sent = await coordinator.send(id, "First question");
    assert.equal((await sent.result).status, "completed");
    const navigation = await adapter.readOwnerNavigation();
    assert.equal(navigation.entries[0].messageCount, 2);
    assert.isTrue(navigation.entries[0].canArchive);

    const transcriptChanges = changes.filter((change) =>
      change.kinds.includes("transcript"),
    );
    assert.isAbove(transcriptChanges.length, 0, "expected transcript changes");
    const mapped = adapter.mapChange(
      transcriptChanges[transcriptChanges.length - 1],
    );
    assert.include(mapped.publicationKinds, "transcript");
    assert.equal(mapped.transcript?.visibility, "live");
    assert.isAbove(mapped.transcript?.events.length ?? 0, 0);

    const region = await adapter.readTranscriptPage({
      owner,
      request: { cursor: null, limit: 50 },
    });
    assert.equal(region.status, "ready");
    assert.isOk(region.page);
    const texts = region
      .page!.items.map((item) => item.text)
      .filter((text): text is string => typeof text === "string");
    assert.includeMembers(texts, ["First question", "Streamed answer"]);

    await coordinator.dispose();
  });

  it("archives into the archived list and restores the same owner identity", async function () {
    const coordinator = createCoordinator();
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);

    await coordinator.archive(id);
    const archived = await adapter.readOwnerNavigation();
    assert.lengthOf(archived.entries, 0);
    assert.lengthOf(archived.archivedEntries ?? [], 1);
    const entry = archived.archivedEntries![0];
    assert.equal(entry.owner.conversationId, id);
    assert.equal(entry.lifecycle, "archived");
    assert.isTrue(entry.canRestore);
    assert.isTrue(entry.canDelete);
    assert.equal(publicationError(owner, "owner-navigation", archived), null);

    await coordinator.restore(id);
    const restored = await adapter.readOwnerNavigation();
    assert.lengthOf(restored.entries, 1);
    assert.equal(restored.entries[0].owner.conversationId, id);

    await coordinator.dispose();
  });

  it("publishes selected-owner loading before readPage resolves, then the ready page", async function () {
    const coordinator = createCoordinator("Owner-first answer");
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);
    const sent = await coordinator.send(id, "Owner-first question");
    assert.equal((await sent.result).status, "completed");

    const mutable = coordinator as unknown as {
      readPage: (
        conversationId: string,
        request?: { cursor?: number | null; limit?: number },
      ) => Promise<unknown>;
    };
    const originalReadPage = mutable.readPage;
    let releasePage!: () => void;
    const pageGate = new Promise<void>((resolve) => {
      releasePage = resolve;
    });
    let pageReads = 0;
    mutable.readPage = async (conversationId, request) => {
      pageReads += 1;
      await pageGate;
      return originalReadPage(conversationId, request);
    };

    const posts: AssistantWorkspacePublication[] = [];
    const publicationCoordinator = new AssistantWorkspacePublicationCoordinator(
      {
        scopeKey: "pi-owner-first",
        getActiveOwner: () => owner,
        post: (publication) => {
          posts.push(publication);
          if (
            publication.publicationKind === "transcript" &&
            (publication.payload as { status?: string }).status === "loading"
          ) {
            queueMicrotask(() => {
              publicationCoordinator.acknowledge({
                publicationId: publication.publicationId,
                stage: "render-complete",
                outcome: "accepted",
                reason: null,
                failure: null,
              });
            });
          }
          return true;
        },
      },
    );
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator: publicationCoordinator,
      activity: () => "matching-target",
    });

    const initialization = runtime.initialize({
      adapter,
      context: {},
      cause: "activation",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Owner-first: the selected owner's loading transcript is out before any
    // canonical page read resolves, and no ready page has been published.
    const loadingPosts = posts.filter(
      (publication) => publication.publicationKind === "transcript",
    );
    assert.isAbove(pageReads, 0, "readPage must be entered");
    assert.lengthOf(loadingPosts, 1);
    assert.equal(loadingPosts[0].owner?.ownerKey, owner.ownerKey);
    const loading = loadingPosts[0].payload as {
      status: string;
      page: unknown;
    };
    assert.equal(loading.status, "loading");
    assert.isNull(loading.page);

    releasePage();
    await initialization;

    // Page-first: the released canonical read publishes the ready page.
    const transcripts = posts.filter(
      (publication) => publication.publicationKind === "transcript",
    );
    assert.lengthOf(transcripts, 2);
    const ready = transcripts[1].payload as {
      status: string;
      page: { items: Array<{ text?: string }> } | null;
    };
    assert.equal(ready.status, "ready");
    assert.isOk(ready.page);
    const texts = ready
      .page!.items.map((item) => item.text)
      .filter((text): text is string => typeof text === "string");
    assert.includeMembers(texts, [
      "Owner-first question",
      "Owner-first answer",
    ]);

    await coordinator.dispose();
  });

  it("projects main and title usage independently", async function () {
    const coordinator = createCoordinator();
    const adapter = createPiConversationWorkspaceSurfaceAdapter(coordinator);
    await coordinator.create();
    const id = coordinator.selectedId!;
    const owner = createPiConversationWorkspaceOwner(id);
    const model = await coordinator.readModel(id);
    const mutable = coordinator as unknown as {
      readModel: (conversationId: string) => Promise<unknown>;
    };
    mutable.readModel = async () => ({
      ...model,
      usage: { main: 100, title: 20, input: 0, output: 0 },
    });

    const regions = await adapter.readOwnerRegions({
      owner,
      kinds: ["owner-presentation", "owner-details"],
    });
    assert.equal(regions["owner-presentation"]?.usage?.used, 120);
    const usage = regions["owner-details"]!.sections.find(
      (section) => section.sectionId === "usage",
    )!;
    const byField = new Map(
      usage.items.map((item) => [item.fieldId, item.value]),
    );
    assert.equal(byField.get("usage-main"), "100");
    assert.equal(byField.get("usage-title"), "20");

    await coordinator.dispose();
  });
});

describe("Pi Skill Run workspace publication", function () {
  this.timeout(30_000);

  let root: string;
  let prior: string | undefined;

  beforeEach(async function () {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "pi-skill-run-surface-"));
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

  const request = (): ProviderExecuteArgs => ({
    requestKind: "skillrunner.job.v1",
    request: { kind: "skillrunner.job.v1", skill_id: "deterministic" },
    backend: {
      id: "builtin-pi",
      type: "builtin-pi",
      baseUrl: "local://builtin-pi",
    },
    orchestrationContext: { workflowId: "test-workflow", jobId: "test-job" },
  });

  it("publishes navigation, every region and a page-first transcript", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("preparation failed");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const adapter = createPiSkillRunsWorkspaceSurfaceAdapter(coordinator);
    const result = await coordinator.execute(request());
    assert.equal(result.status, "failed");
    await coordinator.select(result.requestId);
    const owner = createPiSkillRunsWorkspaceOwner(result.requestId);
    assert.deepEqual(adapter.selectedOwner(), owner);

    const navigation = await adapter.readOwnerNavigation();
    assert.equal(navigation.selectedOwner?.requestId, result.requestId);
    assert.lengthOf(navigation.entries, 1);
    assert.equal(navigation.entries[0].owner.requestId, result.requestId);
    assert.isFalse(navigation.canCreateOwner);
    assert.isTrue(navigation.entries[0].canArchive);
    assert.equal(navigation.entries[0].attention, null);
    assert.equal(publicationError(owner, "owner-navigation", navigation), null);

    const regions = await adapter.readOwnerRegions({
      owner,
      kinds: REGION_KINDS,
    });
    const failures = REGION_KINDS.map((kind) => {
      const payload = regions[kind];
      if (!payload) return kind + ": missing region payload";
      return publicationError(owner, kind, payload);
    }).filter((value): value is string => value !== null);
    assert.deepEqual(failures, []);
    assert.deepEqual(regions["owner-details"]!.actions, ["copy-id"]);
    // Execution mode is immutable after admission, so no mode selector ships.
    assert.deepEqual(regions.composer!.runtimeOptions.mode, {
      enabled: false,
      selectedOptionId: null,
      options: [],
    });
    assert.isNull(regions.composer!.interactionBatch ?? null);

    const region = await adapter.readTranscriptPage({
      owner,
      request: { cursor: null, limit: 50 },
    });
    assert.equal(region.status, "ready");
    assert.equal(region.owner.ownerKey, result.requestId);

    await coordinator.archive(result.requestId);
    assert.lengthOf((await adapter.readOwnerNavigation()).entries, 0);
  });

  it("maps change kinds so a draft-only update repaints the composer alone", function () {
    assert.deepEqual(
      mapWorkspaceChangeKindsToPublicationKinds(
        PI_SKILL_RUN_CHANGE_PUBLICATION_MAPPING,
        ["resources"],
      ),
      ["composer"],
    );
    assert.deepEqual(
      mapWorkspaceChangeKindsToPublicationKinds(
        PI_SKILL_RUN_CHANGE_PUBLICATION_MAPPING,
        ["transcript"],
      ),
      ["transcript"],
    );
  });

  it("maps select and terminal callbacks into owner-first publications", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("preparation failed");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const adapter = createPiSkillRunsWorkspaceSurfaceAdapter(coordinator);
    const changes: Parameters<typeof adapter.mapChange>[0][] = [];
    coordinator.subscribe((change) => changes.push(change));
    const result = await coordinator.execute(request());

    await coordinator.select(result.requestId);
    const selected = changes.find((change) =>
      change.kinds.includes("navigation"),
    )!;
    const selectedMapping = adapter.mapChange(selected);
    assert.isTrue(selectedMapping.targetsActiveOwner);
    assert.include(selectedMapping.publicationKinds, "owner-navigation");

    await coordinator.archive(result.requestId);
    const archived = changes[changes.length - 1];
    const archivedMapping = adapter.mapChange(archived);
    assert.include(archivedMapping.publicationKinds, "owner-navigation");
    assert.equal(adapter.selectedOwner(), null);
  });

  it("publishes the interaction only through the versioned composer batch", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("preparation failed");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const adapter = createPiSkillRunsWorkspaceSurfaceAdapter(coordinator);
    const result = await coordinator.execute(request());
    const owner = createPiSkillRunsWorkspaceOwner(result.requestId);
    const original = await coordinator.readModel(result.requestId);
    const question = (over: Record<string, unknown> = {}) => ({
      questionId: "q1",
      toolCallId: "call-1",
      callIndex: 0,
      questionIndex: 0,
      kind: "text",
      prompt: "Which library?",
      header: null,
      hint: null,
      required: true,
      options: [],
      files: [],
      ...over,
    });
    const batchOf = (questions: ReturnType<typeof question>[]) => ({
      schema: "zotero-agents.user-interaction-batch.v1",
      batchId: "batch-1",
      ownerKey: result.requestId,
      turnId: "turn-1",
      assistantMessageId: "message-1",
      status: "collecting",
      revision: 0,
      calls: [
        {
          toolCallId: "call-1",
          callIndex: 0,
          questionIds: questions.map((entry) => entry.questionId),
        },
      ],
      questions,
      draftAnswers: {},
    });
    const mutable = coordinator as unknown as {
      readModel: (requestId: string) => Promise<unknown>;
    };
    const readWithBatch = async (batch: unknown) => {
      mutable.readModel = async () => ({
        ...original,
        status: "waiting_user",
        interactionBatch: batch,
      });
      const regions = await adapter.readOwnerRegions({
        owner,
        kinds: ["owner-control", "composer"],
      });
      return {
        interaction: regions["owner-control"]!.interaction,
        composerBatch: regions.composer!.interactionBatch ?? null,
      };
    };

    // The versioned batch is the single source of truth: no shape (single
    // question, several questions, multi-select) is downgraded into the
    // singular legacy DTO, so the Reply region is the only presenter.
    const single = await readWithBatch(batchOf([question()]));
    assert.isNull(single.interaction);
    assert.isNotNull(single.composerBatch);

    const multi = await readWithBatch(
      batchOf([
        question(),
        question({ questionId: "q2", questionIndex: 1, kind: "confirm" }),
      ]),
    );
    assert.isNull(multi.interaction);
    assert.isNotNull(multi.composerBatch);

    const multiSelect = await readWithBatch(
      batchOf([
        question({
          kind: "multi_select",
          options: [
            { optionId: "o1", label: "A", value: "a", description: null },
            { optionId: "o2", label: "B", value: "b", description: null },
          ],
        }),
      ]),
    );
    assert.isNull(multiSelect.interaction);
    assert.isNotNull(multiSelect.composerBatch);
  });

  it("keeps model controls available while waiting or suspended, never running", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("preparation failed");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const adapter = createPiSkillRunsWorkspaceSurfaceAdapter(coordinator);
    const result = await coordinator.execute(request());
    const owner = createPiSkillRunsWorkspaceOwner(result.requestId);
    const original = await coordinator.readModel(result.requestId);
    const mutable = coordinator as unknown as {
      readModel: (requestId: string) => Promise<unknown>;
    };
    const composerFor = async (status: string) => {
      mutable.readModel = async () => ({ ...original, status });
      const regions = await adapter.readOwnerRegions({
        owner,
        kinds: ["composer"],
      });
      return regions.composer!;
    };
    const priorConfig = getPref("piProviderConfigurationJson");
    setPref("piProviderConfigurationJson", "");
    upsertPiProviderConfiguration({
      id: "surface-fixture",
      label: "Fixture",
      provider: "openai",
      modelId: "gpt-4.1",
      authVariant: "api-key",
      credentialRef: "key",
      enabled: true,
    });
    try {
      // Execution mode is immutable, so the mode selector never enables.
      const running = await composerFor("running");
      assert.isFalse(running.runtimeOptions.mode.enabled);
      assert.isFalse(running.runtimeOptions.model.enabled);
      assert.equal(running.reply.status, "busy");

      const suspended = await composerFor("suspended");
      assert.isTrue(suspended.runtimeOptions.model.enabled);
      assert.equal(suspended.reply.status, "enabled");

      const waiting = await composerFor("waiting_user");
      assert.isTrue(waiting.runtimeOptions.model.enabled);
      // A waiting run is answered through the interaction batch, not the composer.
      assert.equal(waiting.reply.status, "disabled");

      const terminal = await composerFor("succeeded");
      assert.isFalse(terminal.runtimeOptions.model.enabled);
      assert.equal(terminal.reply.status, "disabled");
    } finally {
      setPref("piProviderConfigurationJson", priorConfig as string);
    }
  });

  it("publishes owner-switch loading before the new run's page and regions resolve", async function () {
    const coordinator = createPiSkillRunCoordinator({
      root,
      prepare: async () => {
        throw new Error("preparation failed");
      },
      execution: () => {
        throw new Error("must not dispatch");
      },
    });
    const adapter = createPiSkillRunsWorkspaceSurfaceAdapter(coordinator);
    await coordinator.execute(request());
    const second = await coordinator.execute(request());
    await coordinator.select(second.requestId);
    const owner = createPiSkillRunsWorkspaceOwner(second.requestId);

    const mutable = coordinator as unknown as {
      readPage: (
        requestId: string,
        request?: { cursor?: number | null; limit?: number },
      ) => Promise<unknown>;
      readModel: (requestId: string) => Promise<unknown>;
    };
    const originalReadPage = mutable.readPage;
    const originalReadModel = mutable.readModel;
    let releaseReads!: () => void;
    const readsGate = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    let pageReads = 0;
    mutable.readPage = async (requestId, request) => {
      pageReads += 1;
      await readsGate;
      return originalReadPage(requestId, request);
    };
    mutable.readModel = async (requestId) => {
      await readsGate;
      return originalReadModel(requestId);
    };

    const posts: AssistantWorkspacePublication[] = [];
    const publicationCoordinator = new AssistantWorkspacePublicationCoordinator(
      {
        scopeKey: "pi-skill-run-owner-first",
        getActiveOwner: () => owner,
        post: (publication) => {
          posts.push(publication);
          if (
            publication.publicationKind === "transcript" &&
            (publication.payload as { status?: string }).status === "loading"
          ) {
            queueMicrotask(() => {
              publicationCoordinator.acknowledge({
                publicationId: publication.publicationId,
                stage: "render-complete",
                outcome: "accepted",
                reason: null,
                failure: null,
              });
            });
          }
          return true;
        },
      },
    );
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator: publicationCoordinator,
      activity: () => "matching-target",
    });

    const initialization = runtime.initialize({
      adapter,
      context: undefined,
      cause: "owner-switch",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Owner-first: the switched owner's loading transcript is published before
    // any canonical page read or read model resolves a ready state.
    const loadingPosts = posts.filter(
      (publication) => publication.publicationKind === "transcript",
    );
    assert.isAbove(pageReads, 0, "the canonical page read must be entered");
    assert.lengthOf(loadingPosts, 1);
    assert.equal(loadingPosts[0].owner?.ownerKey, owner.ownerKey);
    assert.equal(
      (loadingPosts[0].payload as { status: string }).status,
      "loading",
    );

    releaseReads();
    await initialization;
    const transcripts = posts.filter(
      (publication) => publication.publicationKind === "transcript",
    );
    assert.lengthOf(transcripts, 2);
    assert.equal(
      (transcripts[1].payload as { status: string }).status,
      "ready",
    );
  });
});

import { assert } from "chai";
import * as AssistantWorkspaceAcpChild from "../../src/sidebar/assistantWorkspaceAcpChild.js";
import {
  ASSISTANT_WORKSPACE_PUBLICATION_KINDS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY,
  ASSISTANT_WORKSPACE_REGION_REGISTRY,
  ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
  ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
  assertAssistantWorkspacePublication,
  assertAssistantWorkspacePublicationAck,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createAssistantWorkspaceUnownedScope,
  createLoadingTranscriptRegion,
  type AssistantWorkspaceOwner,
  type AssistantWorkspaceOwnerNavigation,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
} from "../../src/modules/assistantWorkspacePublication";
import type { AssistantWorkspaceTranscriptRegion } from "../../src/modules/assistantWorkspaceTranscriptPublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import {
  AssistantWorkspacePublicationRuntime,
  defineAssistantWorkspacePublicationAdapter,
  readAssistantWorkspaceServiceStatus,
  type AssistantWorkspacePublicationRuntimePayloadByKind,
} from "../../src/modules/assistantWorkspacePublicationRuntime";
import {
  upsertAcpSkillRun,
  recordAcpSkillRunSessionUpdate,
  resetAcpSkillRunsForTests,
  selectAcpSkillRun,
  readAcpSkillRunTranscriptRegionFromMemoryForTests,
} from "../../src/modules/acpSkillRunStore";
import {
  ACP_SKILLS_WORKSPACE_ADAPTER,
  readAcpSkillRunWorkspaceRegions,
} from "../../src/modules/acpSkillsWorkspaceSurface";
import {
  ACP_CHAT_WORKSPACE_ADAPTER,
  readAcpChatWorkspaceRegions,
} from "../../src/modules/acpChatWorkspaceSurface";
import {
  getActiveAcpChatOwner,
  getAcpChatWorkspaceOwnerNavigation,
} from "../../src/modules/acpSessionManager";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { resetWorkflowTasks } from "../../src/modules/taskRuntime";
import { resetRuntimeCommandRegistryForTests } from "../../src/platform/command";
import { assistantWorkspaceTestPublication } from "../helpers/assistantWorkspacePublicationHarness";
import {
  FakeAcpConnectionAdapter,
  installAcpSessionManagerTestHooks,
  sendAcpConversationPrompt,
  resolveAcpConversationPermission,
  setAcpConnectionAdapterFactoryForTests,
  startNewAcpConversation,
  waitForAcpConversationSnapshot,
} from "../helpers/acpSessionManagerHarness";

const expectedKinds = [
  "owner-navigation",
  "service-status",
  "owner-control",
  "message-counts",
  "transcript",
  "plan",
  "permission",
  "composer",
  "owner-presentation",
  "owner-details",
] as const;

const workspaceRegionKinds = [
  "owner-control",
  "message-counts",
  "plan",
  "permission",
  "composer",
  "owner-presentation",
] as const;

// Publication payloads fed to these tests are produced by the production
// workspace surface readers against seeded ACP Skills / ACP Chat state; only
// the envelope shells (publicationId/regionRevision/deliverySequence/schema)
// stay hand-written because they are runtime artifacts.
let skillsOwner: Extract<AssistantWorkspaceOwner, { source: "acp-skills" }>;
let skillsNavigation: AssistantWorkspaceOwnerNavigation;
let skillsRegions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind>;
let skillsTranscript: AssistantWorkspaceTranscriptRegion;
let chatOwner: Extract<AssistantWorkspaceOwner, { source: "acp-chat" }>;
let chatNavigation: AssistantWorkspaceOwnerNavigation;
let chatRegions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind>;
let chatTranscript: AssistantWorkspaceTranscriptRegion;

describe("Assistant Workspace ACP publication data plane v1", function () {
  const harness = installAcpSessionManagerTestHooks();

  beforeEach(async function () {
    // Reset sequence mirrors test/core/107 beforeEach; the acp-chat side is
    // cleaned by installAcpSessionManagerTestHooks like the 96-* suites.
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
    resetRuntimeCommandRegistryForTests();

    upsertAcpSkillRun({
      requestId: "request-1",
      backendId: "backend-acp",
      backendType: "acp",
      backendLabel: "ACP Backend",
      taskName: "Task",
      skillName: "Skill",
      workspaceDir: "/workspace/request-1",
      sessionId: "session-1",
      status: "running",
      conversationState: "active",
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      activePrompt: true,
    });
    recordAcpSkillRunSessionUpdate("request-1", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "hello" },
      },
    } as never);
    await selectAcpSkillRun("request-1");
    skillsOwner = createAcpSkillsWorkspaceOwner("request-1");
    skillsNavigation = await ACP_SKILLS_WORKSPACE_ADAPTER.readOwnerNavigation();
    skillsRegions = await readAcpSkillRunWorkspaceRegions({
      requestId: "request-1",
      kinds: workspaceRegionKinds,
    });
    skillsTranscript = readAcpSkillRunTranscriptRegionFromMemoryForTests({
      requestId: "request-1",
    });

    await startNewAcpConversation();
    const activeChat = getActiveAcpChatOwner();
    chatOwner = createAcpChatWorkspaceOwner(
      activeChat.backendId,
      activeChat.conversationId,
    );
    chatNavigation = getAcpChatWorkspaceOwnerNavigation();
    chatRegions = await readAcpChatWorkspaceRegions({
      owner: chatOwner,
      kinds: workspaceRegionKinds,
    });
    chatTranscript = await ACP_CHAT_WORKSPACE_ADAPTER.readTranscriptPage({
      owner: chatOwner,
      context: undefined as never,
      request: undefined,
    });

    for (const regions of [skillsRegions, chatRegions]) {
      for (const kind of workspaceRegionKinds) {
        if (!regions[kind]) {
          throw new Error(
            `workspace publication fixture seed missing region: ${kind}`,
          );
        }
      }
    }
  });

  it("defines one exhaustive strict registry for both ACP sources", function () {
    assert.deepEqual(ASSISTANT_WORKSPACE_PUBLICATION_KINDS, expectedKinds);
    assert.deepEqual(
      Object.keys(ASSISTANT_WORKSPACE_REGION_REGISTRY),
      expectedKinds,
    );
    assert.deepEqual(
      Object.keys(ACP_CHAT_WORKSPACE_DOMAIN_MAPPING),
      expectedKinds,
    );
    assert.deepEqual(
      Object.keys(ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING),
      expectedKinds,
    );
    assert.equal(ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING.plan, "plan");
    assert.equal(
      ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING["owner-details"],
      "owner-details",
    );
    assert.include(
      ASSISTANT_WORKSPACE_REGION_REGISTRY["owner-control"].managedRegions,
      "hint",
    );
    assert.include(
      ASSISTANT_WORKSPACE_REGION_REGISTRY.permission.managedRegions,
      "hint",
    );
    assert.notInclude(
      ASSISTANT_WORKSPACE_REGION_REGISTRY.composer.managedRegions,
      "hint",
    );
  });

  it("accepts only the exact v1 envelope and rejects removed versions and aliases", function () {
    const owner = skillsOwner;
    const publication = assistantWorkspaceTestPublication({
      owner,
      kind: "owner-control",
      payload: skillsRegions["owner-control"]!,
    });
    assert.doesNotThrow(() => assertAssistantWorkspacePublication(publication));
    assert.equal(
      publication.schema,
      "zotero-agents.assistant-workspace-publication.v1",
    );
    for (const invalid of [
      ...[3, 4, 5, 6].map((version) => ({
        ...publication,
        schema: `zotero-agents.assistant-workspace-publication.v${version}`,
      })),
      { ...publication, tab: "acp-skills" },
      { ...publication, publicationKind: "baseline-status" },
      {
        ...publication,
        payload: { ...skillsRegions["owner-control"], selectedRun: {} },
      },
    ]) {
      assert.throws(() => assertAssistantWorkspacePublication(invalid));
    }
  });

  it("defines exact semantic presentation and action registries", function () {
    assert.includeMembers(
      Object.keys(ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY),
      [
        "backend",
        "workflow",
        "status",
        "backend-status",
        "apply-state",
        "updated-at",
        "conversation",
        "session",
        "workspace",
        "runtime",
        "model",
        "reasoning",
      ],
    );
    assert.deepInclude(ASSISTANT_WORKSPACE_ACTION_REGISTRY["select-run"], {
      scope: "target-owner",
      sources: ["acp-skills"],
      payloadKeys: [],
    });
    assert.deepInclude(
      ASSISTANT_WORKSPACE_ACTION_REGISTRY["new-conversation"],
      {
        scope: "navigation-group",
        sources: ["acp-chat"],
        payloadKeys: ["groupId"],
      },
    );
    assert.deepInclude(
      ASSISTANT_WORKSPACE_ACTION_REGISTRY["request-owner-details"],
      {
        scope: "selected-owner",
        sources: ["acp-chat", "acp-skills"],
        payloadKeys: [],
      },
    );
  });

  it("accepts only the exact v1 owner presentation payload", function () {
    const owner = skillsOwner;
    const presentation = skillsRegions["owner-presentation"]!;
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner,
          kind: "owner-presentation",
          payload: presentation,
        }),
      ),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner,
          kind: "owner-presentation",
          payload: {
            ...presentation,
            sections: [],
          } as never,
        }),
      ),
    );
  });

  it("accepts structured permission and rejects legacy source or raw detail", async function () {
    const owner = chatOwner;
    setAcpConnectionAdapterFactoryForTests(async () => {
      harness.lastAdapter = new FakeAcpConnectionAdapter();
      harness.lastAdapter.emitPermissionDuringPrompt = true;
      return harness.lastAdapter;
    });
    const promptPromise = sendAcpConversationPrompt({
      message: "Need permission",
    });
    await waitForAcpConversationSnapshot(
      (entry) => !!entry.pendingPermissionRequest,
    );
    const regions = await readAcpChatWorkspaceRegions({
      owner,
      kinds: ["permission"],
    });
    const request = regions.permission?.request;
    if (!request) {
      throw new Error("permission fixture seed missing pending request");
    }
    await resolveAcpConversationPermission({
      outcome: "selected",
      optionId: "allow-once",
    });
    await promptPromise;
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner,
          kind: "permission",
          payload: { request },
        }),
      ),
    );
    for (const legacy of [
      { ...request, source: "zotero-write" },
      { ...request, detail: { arbitrary: true } },
      {
        ...request,
        review: { ...request.review, sourceLabel: "Zotero" },
      },
    ]) {
      assert.throws(() =>
        assertAssistantWorkspacePublication(
          assistantWorkspaceTestPublication({
            owner,
            kind: "permission",
            payload: { request: legacy } as never,
          }),
        ),
      );
    }
  });

  it("accepts only bounded owner details sections and actions", function () {
    const owner = skillsOwner;
    // acp-skills owner-details stays hand-written here: the production reader
    // (readAcpSkillRunWorkspaceRegions with "owner-details") depends on run
    // directory files; its output is covered by the smoke test below.
    const details = {
      status: "ready" as const,
      title: "Task",
      subtitle: "request-1",
      sections: [
        {
          sectionId: "run-paths" as const,
          collapsed: false,
          items: [
            {
              fieldId: "workspace" as const,
              value: "/tmp/run",
              format: "path" as const,
            },
          ],
        },
      ],
      actions: ["copy-id" as const, "open-workspace" as const],
      error: null,
    };
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner,
          kind: "owner-details",
          payload: details,
        }),
      ),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner,
          kind: "owner-details",
          payload: { ...details, transcript: [] } as never,
        }),
      ),
    );
  });

  it("projects the live Host Bridge service status through the v1 envelope", function () {
    // service-status payloads stay hand-written in the scenarios below because
    // the production constructor reads the hostBridgeServer singleton; this
    // smoke test locks the production constructor output to the v1 contract.
    const publication = assistantWorkspaceTestPublication({
      owner: createAssistantWorkspaceUnownedScope("acp-skills"),
      kind: "service-status",
      payload: readAssistantWorkspaceServiceStatus(),
    });
    assert.doesNotThrow(() => assertAssistantWorkspacePublication(publication));
  });

  it("projects seeded ACP Skills owner details through the v1 envelope", async function () {
    const regions = await readAcpSkillRunWorkspaceRegions({
      requestId: "request-1",
      kinds: ["owner-details"],
    });
    const details = regions["owner-details"];
    if (!details) {
      throw new Error("owner-details fixture seed missing production payload");
    }
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner: skillsOwner,
          kind: "owner-details",
          payload: details,
        }),
      ),
    );
  });

  it("accepts bounded renderer failures and rejects arbitrary ACK fields", function () {
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublicationAck({
        publicationId: "publication-1",
        stage: "render-complete",
        outcome: "rejected",
        reason: "render-failed",
        failure: { stage: "transcript", code: "dom-commit-failed" },
      }),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublicationAck({
        publicationId: "publication-1",
        stage: "render-complete",
        outcome: "rejected",
        reason: "render-failed",
        failure: { stage: "banner", code: "render-failed", message: "secret" },
      }),
    );
  });

  it("drops inactive changes before invoking the producer adapter", function () {
    const owner = chatOwner;
    let mapCalls = 0;
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-chat" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => owner,
      mapChange: () => {
        mapCalls += 1;
        throw new Error("inactive producer must not run");
      },
      readOwnerNavigation: async () => chatNavigation,
      readOwnerRegions: async () => ({}),
      readTranscriptPage: async () => chatTranscript,
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post: () => true,
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "inactive-source",
    });
    const result = runtime.schedule({ adapter, change: {}, context: {} });
    assert.equal(result.status, "dropped");
    assert.equal(mapCalls, 0);
  });

  it("drops an owner mismatch before any region read", async function () {
    const activeOwner = skillsOwner;
    const changedOwner = {
      ...activeOwner,
      ownerKey: "request-2",
      requestId: "request-2",
    };
    let reads = 0;
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-skills" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => activeOwner,
      mapChange: () => ({
        owner: changedOwner,
        targetsActiveOwner: true,
        publicationKinds: ["owner-control"] as const,
      }),
      readOwnerNavigation: async () => skillsNavigation,
      readOwnerRegions: async () => {
        reads += 1;
        return {};
      },
      readTranscriptPage: async () => skillsTranscript,
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "owner-mismatch",
      getActiveOwner: () => activeOwner,
      post: (publication) => {
        if (
          publication.publicationKind === "transcript" &&
          (publication.payload as { status?: string }).status === "loading"
        ) {
          queueMicrotask(() => {
            coordinator.acknowledge({
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
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
    });
    await runtime.initialize({
      adapter: {
        ...adapter,
        selectedOwner: () => activeOwner,
        mapChange: adapter.mapChange,
      },
      context: {},
      cause: "activation",
    });
    reads = 0;
    const result = runtime.schedule({ adapter, change: {}, context: {} });
    assert.equal(result.status, "dropped");
    assert.equal(reads, 0);
  });

  it("coalesces one owner lane into one minimal batch read", async function () {
    const owner = chatOwner;
    let reads = 0;
    const posts: AssistantWorkspacePublication[] = [];
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-chat" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => owner,
      mapChange: (change: { kind: "owner-control" | "composer" }) => ({
        owner,
        targetsActiveOwner: true,
        publicationKinds: [change.kind],
      }),
      readOwnerNavigation: async () => chatNavigation,
      readOwnerRegions: async ({ kinds }) => {
        reads += 1;
        return readAcpChatWorkspaceRegions({ owner, kinds });
      },
      readTranscriptPage: async () => chatTranscript,
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "coalesce",
      getActiveOwner: () => owner,
      post: (publication) => {
        posts.push(publication);
        if (
          publication.publicationKind === "transcript" &&
          (publication.payload as { status?: string }).status === "loading"
        ) {
          queueMicrotask(() => {
            coordinator.acknowledge({
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
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
    });
    await runtime.initialize({
      adapter,
      context: {},
      cause: "activation",
      serviceStatus: { items: [] },
    });
    reads = 0;
    posts.length = 0;
    // A completed prompt turn is the production state change: it flips the
    // owner-control connection/hint fields and enables composer runtime
    // options, so the coalesced batch read publishes both scheduled regions.
    await sendAcpConversationPrompt({ message: "Coalesce batch" });
    runtime.schedule({
      adapter,
      change: { kind: "owner-control" },
      context: {},
    });
    runtime.schedule({
      adapter,
      change: { kind: "composer" },
      context: {},
    });
    await runtime.flush();
    assert.equal(reads, 1);
    assert.deepEqual(
      posts.map((publication) => publication.publicationKind).sort(),
      ["composer", "owner-control"],
    );
  });

  it("keeps diagnostic-only owner presentation reads out of transcript and other managed regions", async function () {
    const owner = chatOwner;
    const posts: AssistantWorkspacePublication[] = [];
    const regionReads: string[][] = [];
    let transcriptReads = 0;
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-chat" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => owner,
      mapChange: () => ({
        owner,
        targetsActiveOwner: true,
        publicationKinds: ["owner-presentation"] as const,
      }),
      readOwnerNavigation: async () => chatNavigation,
      readOwnerRegions: async ({ kinds }) => {
        regionReads.push([...kinds]);
        return readAcpChatWorkspaceRegions({ owner, kinds });
      },
      readTranscriptPage: async () => {
        transcriptReads += 1;
        return chatTranscript;
      },
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "diagnostic-owner-presentation",
      getActiveOwner: () => owner,
      post: (publication) => {
        posts.push(publication);
        if (
          publication.publicationKind === "transcript" &&
          (publication.payload as { status?: string }).status === "loading"
        ) {
          queueMicrotask(() => {
            coordinator.acknowledge({
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
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
    });
    await runtime.initialize({ adapter, context: {}, cause: "activation" });
    posts.length = 0;
    regionReads.length = 0;
    transcriptReads = 0;
    // A completed prompt turn attaches a live session to the conversation,
    // which changes the production owner-presentation metadata payload.
    await sendAcpConversationPrompt({ message: "Presentation update" });

    runtime.schedule({ adapter, change: {}, context: {} });
    await runtime.flush();

    assert.deepEqual(regionReads, [["owner-presentation"]]);
    assert.equal(transcriptReads, 0);
    assert.deepEqual(
      posts.map((publication) => publication.publicationKind),
      ["owner-presentation"],
    );
  });

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`initializes ${source} owner-first and batch-reads owned regions once`, async function () {
      const owner = source === "acp-chat" ? chatOwner : skillsOwner;
      const posts: AssistantWorkspacePublication[] = [];
      const materializations: Array<{
        kind: AssistantWorkspacePublicationKind;
        cause: string;
        publicationForm: string;
        materializationSource: string;
      }> = [];
      let batchReads = 0;
      const supportedKinds = expectedKinds;
      const adapter = defineAssistantWorkspacePublicationAdapter({
        source,
        supportedKinds,
        selectedOwner: () => owner as never,
        mapChange: () => ({
          owner: owner as never,
          targetsActiveOwner: true,
          publicationKinds: [],
        }),
        readOwnerNavigation: async () =>
          source === "acp-chat" ? chatNavigation : skillsNavigation,
        readOwnerRegions: async ({ kinds }) => {
          batchReads += 1;
          return source === "acp-chat"
            ? readAcpChatWorkspaceRegions({ owner: chatOwner, kinds })
            : readAcpSkillRunWorkspaceRegions({
                requestId: skillsOwner.requestId,
                kinds,
              });
        },
        readTranscriptPage: async () =>
          source === "acp-chat" ? chatTranscript : skillsTranscript,
      });
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: source,
        getActiveOwner: () => owner,
        post: (publication) => {
          posts.push(publication);
          if (
            publication.publicationKind === "transcript" &&
            (publication.payload as { status?: string }).status === "loading"
          ) {
            queueMicrotask(() => {
              coordinator.acknowledge({
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
      });
      const runtime = new AssistantWorkspacePublicationRuntime({
        coordinator,
        activity: () => "matching-target",
        hooks: {
          onMaterialized(entry) {
            materializations.push(entry);
          },
        },
      });
      await runtime.initialize({
        adapter,
        context: {},
        cause: "activation",
        serviceStatus: { items: [] },
      });
      assert.equal(batchReads, 1);
      assert.deepInclude(materializations[0], {
        kind: "transcript",
        cause: "activation",
        publicationForm: "snapshot",
        materializationSource: "transcript-page",
      });
      assert.sameMembers(
        materializations
          .filter((entry) => entry.materializationSource === "region")
          .map((entry) => entry.kind),
        supportedKinds.filter(
          (kind) =>
            kind !== "owner-navigation" &&
            kind !== "service-status" &&
            kind !== "transcript" &&
            kind !== "owner-details",
        ),
      );
      assert.deepEqual(
        posts
          .slice(0, 4)
          .map((entry) => [
            entry.publicationKind,
            entry.publicationKind === "transcript"
              ? (entry.payload as { status?: string }).status
              : null,
          ]),
        [
          ["owner-navigation", null],
          ["service-status", null],
          ["transcript", "loading"],
          ["transcript", "ready"],
        ],
      );
    });
  }

  it("drops lazy owner details that arrive after an owner switch", async function () {
    const ownerA = skillsOwner;
    const ownerB = { ...ownerA, ownerKey: "request-2", requestId: "request-2" };
    let selectedOwner = ownerA;
    let resolveDetails: ((value: Record<string, unknown>) => void) | undefined;
    const detailsRead = new Promise<Record<string, unknown>>((resolve) => {
      resolveDetails = resolve;
    });
    const posts: AssistantWorkspacePublication[] = [];
    const dropped: string[] = [];
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-skills" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => selectedOwner,
      mapChange: () => ({
        owner: selectedOwner,
        targetsActiveOwner: true,
        publicationKinds: [],
      }),
      readOwnerNavigation: async () => skillsNavigation,
      readOwnerRegions: async () => detailsRead as never,
      readTranscriptPage: async () => skillsTranscript,
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "details-owner-guard",
      getActiveOwner: () => selectedOwner,
      post: (publication) => {
        posts.push(publication);
        return true;
      },
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
      hooks: {
        onDropped(entry) {
          dropped.push(entry.reason);
        },
      },
    });
    const request = runtime.requestOwnerDetails({
      adapter,
      owner: ownerA,
      context: {},
    });
    selectedOwner = ownerB;
    // acp-skills owner-details stays hand-written (production reader needs run
    // directory files); the value is dropped before any publication anyway.
    resolveDetails?.({
      "owner-details": {
        status: "ready",
        title: "Old owner",
        subtitle: null,
        sections: [],
        actions: [],
        error: null,
      },
    });
    assert.isUndefined(await request);
    assert.isEmpty(posts);
    assert.deepEqual(dropped, ["owner-mismatch"]);
  });

  it("atomically invalidates every old-owner selection region", async function () {
    const receiver = AssistantWorkspaceAcpChild.createReceiver({
      source: "acp-skills",
    });
    const oldOwner = skillsOwner;
    const oldState = {
      source: "acp-skills",
      navigation: skillsNavigation,
      services: { items: [] },
      selection: {
        owner: oldOwner,
        phase: "ready",
        control: skillsRegions["owner-control"],
        messageCounts: skillsRegions["message-counts"],
        transcript: skillsTranscript,
        plan: skillsRegions.plan,
        permission: skillsRegions.permission,
        composer: skillsRegions.composer,
        presentation: skillsRegions["owner-presentation"],
        // acp-skills owner-details stays hand-written (production reader
        // needs run directory files); smoke coverage lives above.
        details: {
          status: "ready",
          title: "old",
          subtitle: null,
          sections: [],
          actions: [],
          error: null,
        },
      },
    };
    upsertAcpSkillRun({
      requestId: "request-2",
      backendId: "backend-acp",
      backendType: "acp",
      status: "running",
    });
    await selectAcpSkillRun("request-2");
    const newNavigation =
      await ACP_SKILLS_WORKSPACE_ADAPTER.readOwnerNavigation();
    const result = receiver.apply(
      oldState,
      assistantWorkspaceTestPublication({
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
        kind: "owner-navigation",
        payload: newNavigation,
        deliverySequence: 2,
      }),
      oldOwner.ownerKey,
    );
    assert.isTrue(result.accepted);
    assert.equal(result.snapshot.selection.owner.ownerKey, "request-2");
    assert.equal(result.snapshot.selection.phase, "loading");
    assert.isNull(result.snapshot.selection.control);
    assert.isNull(result.snapshot.selection.presentation);
    assert.isNull(result.snapshot.selection.details);
    assert.equal(result.snapshot.selection.transcript.status, "loading");
    assert.equal(
      result.snapshot.selection.transcript.owner.ownerKey,
      "request-2",
    );
  });

  it("keeps child-visible region revisions monotonic across host deactivation", async function () {
    const receiver = AssistantWorkspaceAcpChild.createReceiver({
      source: "acp-chat",
    });
    const owner = chatOwner;
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "deactivation-continuity",
      getActiveOwner: () => owner,
      post: (publication) => {
        posts.push(publication);
        return true;
      },
    });
    const runtime = new AssistantWorkspacePublicationRuntime({
      coordinator,
      activity: () => "matching-target",
    });
    const publish = () =>
      coordinator.publishRegion({
        owner,
        publicationKind: "owner-control",
        cause: "activation",
        payload: chatRegions["owner-control"]!,
        force: true,
      });

    const first = publish();
    assert.isDefined(first);
    const firstResult = receiver.apply({}, first, owner.ownerKey);
    assert.isTrue(firstResult.accepted);

    runtime.deactivate();

    const second = publish();
    assert.isDefined(second);
    assert.isAbove(second!.regionRevision, first!.regionRevision);
    const secondResult = receiver.apply(
      firstResult.snapshot,
      second,
      owner.ownerKey,
    );
    assert.isTrue(secondResult.accepted);
    assert.deepEqual(posts, [first, second]);
  });

  it("retries an identical region when transport did not accept the first post", function () {
    const owner = chatOwner;
    let accepts = false;
    let attempts = 0;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "retry",
      getActiveOwner: () => owner,
      post: () => {
        attempts += 1;
        return accepts;
      },
    });
    assert.isUndefined(
      coordinator.publishRegion({
        owner,
        publicationKind: "owner-control",
        cause: "steady-state",
        payload: chatRegions["owner-control"]!,
      }),
    );
    accepts = true;
    assert.isDefined(
      coordinator.publishRegion({
        owner,
        publicationKind: "owner-control",
        cause: "steady-state",
        payload: chatRegions["owner-control"]!,
      }),
    );
    assert.equal(attempts, 2);
  });

  it("turns a rejected render ACK into one coordinator-owned rebase", function () {
    const owner = chatOwner;
    let rebases = 0;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "rebase",
      getActiveOwner: () => owner,
      post: () => true,
      onTranscriptRebaseRequired: () => {
        rebases += 1;
      },
    });
    const publication = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "activation",
      region: chatTranscript,
    });
    assert.isDefined(publication);
    coordinator.acknowledge({
      publicationId: publication!.publicationId,
      stage: "render-complete",
      outcome: "rejected",
      reason: "render-failed",
      failure: { stage: "transcript", code: "render-failed" },
    });
    coordinator.acknowledge({
      publicationId: publication!.publicationId,
      stage: "render-complete",
      outcome: "rejected",
      reason: "render-failed",
      failure: { stage: "transcript", code: "render-failed" },
    });
    assert.equal(rebases, 1);
  });

  it("keeps page requests owner-enveloped without duplicated source IDs", function () {
    const owner = chatOwner;
    const publication = assistantWorkspaceTestPublication({
      owner,
      kind: "transcript",
      payload: createLoadingTranscriptRegion(owner),
    });
    assert.equal(publication.schema, ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA);
    assert.notProperty(publication, "tab");
    assert.notProperty(publication.payload, "backendId");
    assert.notProperty(publication.payload, "conversationId");
  });
});

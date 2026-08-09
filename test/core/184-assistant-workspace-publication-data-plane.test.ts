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
  SKILLRUNNER_WORKSPACE_DOMAIN_MAPPING,
  assertAssistantWorkspacePublication,
  assertAssistantWorkspacePublicationAck,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createSkillRunnerWorkspaceOwner,
  createAssistantWorkspaceUnownedScope,
  createLoadingTranscriptRegion,
  projectAssistantWorkspacePermissionRequest,
  type AssistantWorkspaceOwner,
  type AssistantWorkspaceOwnerNavigation,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
} from "../../src/modules/assistantWorkspacePublication";
import { parseAssistantWorkspaceTranscriptPageRequest } from "../../src/modules/assistantWorkspaceTranscriptPublication";
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
  projectAcpSkillRunOutputEnvelopeToTranscript,
  resetAcpSkillRunsForTests,
  selectAcpSkillRun,
  readAcpSkillRunTranscriptRegionFromMemoryForTests,
  registerAcpSkillRunController,
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
// stay hand-written because they are runtime artifacts. The skillrunner
// fixtures stay hand-written until the Stage 2 surface adapter lands
// (openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence):
// no production skillrunner region reader exists yet, so the payloads below
// pin the contract shapes the adapter will have to produce.
let skillsOwner: Extract<AssistantWorkspaceOwner, { source: "acp-skills" }>;
let skillsNavigation: AssistantWorkspaceOwnerNavigation;
let skillsRegions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind>;
let skillsTranscript: AssistantWorkspaceTranscriptRegion;
let chatOwner: Extract<AssistantWorkspaceOwner, { source: "acp-chat" }>;
let chatNavigation: AssistantWorkspaceOwnerNavigation;
let chatRegions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind>;
let chatTranscript: AssistantWorkspaceTranscriptRegion;
let skillrunnerOwner: Extract<
  AssistantWorkspaceOwner,
  { source: "skillrunner" }
>;
let skillrunnerNavigation: AssistantWorkspaceOwnerNavigation;
let skillrunnerRegions: Partial<AssistantWorkspacePublicationRuntimePayloadByKind>;
let skillrunnerTranscript: AssistantWorkspaceTranscriptRegion;

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

    // SkillRunner owner identity is request-scoped (design Decision 1):
    // ownerKey is the request id when assigned and falls back to the run key
    // for unassigned local runs. The owner must come from the production
    // constructor, never a hand-written literal.
    skillrunnerOwner = createSkillRunnerWorkspaceOwner({
      requestId: "sr-request-1",
      runKey: "sr-run-1",
    });
    skillrunnerNavigation = {
      selectedOwner: skillrunnerOwner,
      selectedGroupId: "backend-sr",
      groups: [
        {
          groupId: "backend-sr",
          label: "SkillRunner Backend",
          status: "running",
          disabledReason: null,
        },
      ],
      entries: [
        {
          owner: skillrunnerOwner,
          groupId: "backend-sr",
          label: "SkillRunner Task",
          subtitle: null,
          description: null,
          groupLabel: "SkillRunner Backend",
          status: "running",
          backendStatus: "running",
          applyState: null,
          attention: null,
          updatedAt: "2026-07-21T00:00:00.000Z",
          messageCount: 1,
          canArchive: false,
          submission: null,
          resumptionPending: false,
        },
      ],
      queuedEntries: [],
      canCreateOwner: false,
      notice: "Showing recent runs only. View older records in Dashboard.",
    };
    skillrunnerRegions = {
      "owner-control": {
        status: "running",
        busy: true,
        hint: { kind: "running", message: null },
        interaction: null,
        connection: {
          status: "connected",
          sessionAvailable: true,
          connected: true,
          canConnect: false,
          canDisconnect: false,
        },
        execution: { canCancel: true, canInterrupt: false },
        authentication: {
          required: false,
          canAuthenticate: false,
          methodId: null,
        },
        permissionPolicy: { autoApprove: false, canSetAutoApprove: false },
        badges: {
          control: { state: "streaming", tone: "success", title: null },
          autoReply: {
            active: true,
            remainingSeconds: 30,
            progressPercent: 50,
          },
        },
      },
      "message-counts": { counts: null },
      permission: { request: null },
      composer: {
        reply: { status: "enabled" },
        runtimeOptions: {
          mode: { selectedOptionId: null, options: [], enabled: false },
          model: { selectedOptionId: null, options: [], enabled: false },
          reasoningEffort: {
            selectedOptionId: null,
            options: [],
            enabled: false,
          },
        },
      },
      "owner-presentation": {
        title: "SkillRunner Task",
        subtitle: null,
        description: null,
        notice: null,
        metadata: [],
        usage: null,
      },
    };
    skillrunnerTranscript = {
      owner: skillrunnerOwner,
      status: "ready",
      error: null,
      transcriptRevision: 1,
      page: {
        pageKey: `${skillrunnerOwner.ownerKey}\ntail:80`,
        startCursor: 0,
        limit: 80,
        totalVisibleItemCount: 1,
        previousCursor: null,
        nextCursor: null,
        sourceEventSeq: 1,
        items: [
          {
            itemId: "sr-message-1",
            itemKind: "message",
            role: "assistant",
            text: "hello from skillrunner",
            status: "complete",
            createdAt: "2026-07-21T00:00:00.000Z",
            updatedAt: null,
            revision: null,
          },
        ],
      },
    };
  });

  it("defines one exhaustive strict registry for all three sources", function () {
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
    assert.deepEqual(
      Object.keys(SKILLRUNNER_WORKSPACE_DOMAIN_MAPPING),
      expectedKinds,
    );
    assert.equal(ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING.plan, "plan");
    assert.equal(
      ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING["owner-details"],
      "owner-details",
    );
    // SkillRunner has no plan surface and reports backend health through the
    // banner rather than service-status (design Decision 3).
    assert.equal(SKILLRUNNER_WORKSPACE_DOMAIN_MAPPING.plan, "not-applicable");
    assert.equal(
      SKILLRUNNER_WORKSPACE_DOMAIN_MAPPING["service-status"],
      "not-applicable",
    );
    for (const kind of expectedKinds) {
      if (kind === "plan" || kind === "service-status") {
        assert.notInclude(
          ASSISTANT_WORKSPACE_REGION_REGISTRY[kind].sources,
          "skillrunner",
          `${kind} must not admit the skillrunner source`,
        );
      } else {
        assert.include(
          ASSISTANT_WORKSPACE_REGION_REGISTRY[kind].sources,
          "skillrunner",
          `${kind} must admit the skillrunner source`,
        );
      }
    }
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

  it("preserves nullable ACP Skills status facts in owner navigation", function () {
    const entry = skillsNavigation.entries.find(
      (candidate) => candidate.owner.ownerKey === skillsOwner.ownerKey,
    );
    assert.isOk(entry);
    assert.deepInclude(entry, {
      status: "running",
      backendStatus: null,
      applyState: null,
      canArchive: false,
    });

    const publication = assistantWorkspaceTestPublication({
      owner: createAssistantWorkspaceUnownedScope("acp-skills"),
      kind: "owner-navigation",
      payload: skillsNavigation,
    });
    assert.doesNotThrow(() => assertAssistantWorkspacePublication(publication));
    const publishedEntry = (
      publication.payload as AssistantWorkspaceOwnerNavigation
    ).entries.find(
      (candidate) => candidate.owner.ownerKey === skillsOwner.ownerKey,
    );
    assert.deepInclude(publishedEntry, {
      status: "running",
      backendStatus: null,
      applyState: null,
      canArchive: false,
    });
  });

  it("projects terminal Connect, composer, and archive state independently", async function () {
    upsertAcpSkillRun({
      requestId: skillsOwner.requestId,
      status: "succeeded",
      backendStatus: "succeeded",
      sessionId: "terminal-session-1",
      applyResultState: "succeeded",
      conversationState: "closed",
      conversationRecoveryState: "available",
      activePrompt: false,
      replyState: "idle",
      connectionActionState: "idle",
    });

    const detachedNavigation =
      await ACP_SKILLS_WORKSPACE_ADAPTER.readOwnerNavigation();
    const detachedEntry = detachedNavigation.entries.find(
      (entry) => entry.owner.ownerKey === skillsOwner.ownerKey,
    );
    const detachedRegions = await readAcpSkillRunWorkspaceRegions({
      requestId: skillsOwner.requestId,
      kinds: ["owner-control", "composer"],
    });
    assert.equal(detachedEntry?.status, "succeeded");
    assert.isTrue(detachedEntry?.canArchive);
    assert.isTrue(detachedRegions["owner-control"]?.connection.canConnect);
    assert.equal(detachedRegions.composer?.reply.status, "disabled");

    registerAcpSkillRunController(
      skillsOwner.requestId,
      {
        cancel: async () => undefined,
        reply: async () => undefined,
        disconnect: async () => undefined,
      },
      undefined,
      "post-terminal-conversation",
    );
    const connectedNavigation =
      await ACP_SKILLS_WORKSPACE_ADAPTER.readOwnerNavigation();
    const connectedEntry = connectedNavigation.entries.find(
      (entry) => entry.owner.ownerKey === skillsOwner.ownerKey,
    );
    const connectedRegions = await readAcpSkillRunWorkspaceRegions({
      requestId: skillsOwner.requestId,
      kinds: ["owner-control", "composer"],
    });
    assert.equal(connectedEntry?.status, "succeeded");
    assert.isFalse(connectedEntry?.canArchive);
    assert.isFalse(connectedRegions["owner-control"]?.connection.canConnect);
    assert.isTrue(connectedRegions["owner-control"]?.connection.canDisconnect);
    assert.equal(connectedRegions.composer?.reply.status, "enabled");
  });

  it("publishes ACP ui_hints without duplicating the pending message", async function () {
    projectAcpSkillRunOutputEnvelopeToTranscript({
      requestId: "request-1",
      kind: "pending",
      message: "Transcript-only pending message",
      candidateText: '{"__SKILL_DONE__":false}',
      repairRound: 0,
    });
    upsertAcpSkillRun({
      requestId: "request-1",
      status: "waiting_user",
      activePrompt: false,
      pendingInteraction: {
        message: "Transcript-only pending message",
        uiHints: {
          kind: "choose_one",
          prompt: "Choose a typed value",
          hint: "Any value is accepted",
          options: [
            { label: "Approve", value: true },
            { label: "Configure", value: { mode: "deep" } },
          ],
        },
      },
    });

    const regions = await readAcpSkillRunWorkspaceRegions({
      requestId: "request-1",
      kinds: ["owner-control"],
    });
    const control = regions["owner-control"]!;

    assert.equal(control.hint.kind, "waiting_user");
    assert.isNull(control.hint.message);
    assert.notProperty(control.interaction || {}, "interactionToken");
    assert.equal(control.interaction?.inputKind, "choose_one");
    assert.equal(control.interaction?.prompt, "Choose a typed value");
    assert.strictEqual(control.interaction?.options[0].value, true);
    assert.deepEqual(control.interaction?.options[1].value, { mode: "deep" });
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
        sources: ["acp-chat", "acp-skills", "skillrunner"],
        payloadKeys: [],
      },
    );
    // Actions with identical semantics and payloads gain "skillrunner" in
    // their sources; skillrunner-only actions join as typed entries (design
    // Decision 4).
    assert.deepInclude(ASSISTANT_WORKSPACE_ACTION_REGISTRY["cancel-run"], {
      scope: "selected-owner",
      sources: ["acp-skills", "skillrunner"],
      payloadKeys: [],
    });
    assert.deepInclude(
      ASSISTANT_WORKSPACE_ACTION_REGISTRY["cancel-queued-workflow-unit"],
      {
        scope: "global",
        sources: ["acp-skills", "skillrunner"],
        payloadKeys: ["queueId"],
      },
    );
    assert.deepInclude(ASSISTANT_WORKSPACE_ACTION_REGISTRY["select-task"], {
      scope: "target-owner",
      sources: ["skillrunner"],
      payloadKeys: [],
    });
    assert.deepInclude(ASSISTANT_WORKSPACE_ACTION_REGISTRY["auth-import-run"], {
      scope: "selected-owner",
      sources: ["skillrunner"],
      payloadKeys: ["providerId", "files", "error"],
    });
    assert.deepInclude(ASSISTANT_WORKSPACE_ACTION_REGISTRY["open-auth-url"], {
      scope: "global",
      sources: ["skillrunner"],
      payloadKeys: ["url"],
    });
  });

  it("admits the skillrunner owner and rejects legacy vocabulary and non-applicable kinds", function () {
    assert.equal(skillrunnerOwner.ownerKey, "sr-request-1");
    assert.equal(skillrunnerOwner.runKey, "sr-run-1");
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner: skillrunnerOwner,
          kind: "owner-control",
          payload: skillrunnerRegions["owner-control"]!,
        }),
      ),
    );
    // Unassigned local runs fall back to the run key (design Decision 1).
    const localOwner = createSkillRunnerWorkspaceOwner({
      runKey: "sr-run-local",
    });
    assert.isNull(localOwner.requestId);
    assert.equal(localOwner.ownerKey, "sr-run-local");
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner: localOwner,
          kind: "owner-control",
          payload: skillrunnerRegions["owner-control"]!,
        }),
      ),
    );
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication(
        assistantWorkspaceTestPublication({
          owner: createAssistantWorkspaceUnownedScope("skillrunner"),
          kind: "owner-navigation",
          payload: skillrunnerNavigation,
        }),
      ),
    );
    assert.throws(() =>
      createSkillRunnerWorkspaceOwner({ requestId: "sr-request-2" }),
    );
    // plan and service-status stay ACP-only (design Decision 3).
    for (const kind of ["plan", "service-status"] as const) {
      assert.throws(() =>
        assertAssistantWorkspacePublication(
          assistantWorkspaceTestPublication({
            owner: skillrunnerOwner,
            kind,
            payload: (kind === "plan" ? { items: [] } : { items: [] }) as never,
          }),
        ),
      );
      assert.throws(() =>
        assertAssistantWorkspacePublication(
          assistantWorkspaceTestPublication({
            owner: createAssistantWorkspaceUnownedScope("skillrunner"),
            kind,
            payload: { items: [] } as never,
          }),
        ),
      );
    }
    // Owner invariants: strict key set plus the ownerKey derivation rule.
    for (const owner of [
      {
        source: "skillrunner",
        ownerKey: "sr-run-1",
        requestId: null,
        runKey: "other-run",
      },
      { source: "skillrunner", ownerKey: "sr-run-1", requestId: null },
      {
        source: "skillrunner",
        ownerKey: "sr-run-1",
        requestId: null,
        runKey: "sr-run-1",
        taskKey: "sr-run-1",
      },
      {
        source: "skillrunner",
        ownerKey: "sr-run-1",
        requestId: "",
        runKey: "sr-run-1",
      },
    ]) {
      assert.throws(() =>
        assertAssistantWorkspacePublication(
          assistantWorkspaceTestPublication({
            owner: owner as never,
            kind: "owner-control",
            payload: skillrunnerRegions["owner-control"]!,
          }),
        ),
      );
    }
    // The legacy bridge vocabulary does not leak into the v1 registry:
    // panel-local drawer/dialog actions stay out of
    // ASSISTANT_WORKSPACE_ACTION_REGISTRY (design Decision 4).
    for (const action of [
      "toggle-drawer",
      "close-drawer",
      "toggle-group-collapse",
      "toggle-finished-collapse",
      "close-dialog",
    ]) {
      assert.notProperty(ASSISTANT_WORKSPACE_ACTION_REGISTRY, action);
    }
    // Transcript page requests parse the skillrunner owner branch, including
    // the run-key fallback for unassigned local runs.
    assert.deepEqual(
      parseAssistantWorkspaceTranscriptPageRequest({
        owner: skillrunnerOwner,
        request: { cursor: null, limit: 80 },
      }),
      { owner: skillrunnerOwner, request: { cursor: null, limit: 80 } },
    );
    assert.deepEqual(
      parseAssistantWorkspaceTranscriptPageRequest({
        owner: localOwner,
        request: { cursor: 40, limit: 80 },
      }),
      { owner: localOwner, request: { cursor: 40, limit: 80 } },
    );
    assert.isNull(
      parseAssistantWorkspaceTranscriptPageRequest({
        owner: { ...skillrunnerOwner, ownerKey: "sr-run-1" },
        request: { cursor: null, limit: 80 },
      }),
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

  it("projects explicit Host Bridge write approval kind without rewriting its source", function () {
    const projected = projectAssistantWorkspacePermissionRequest({
      requestId: "host-bridge-permission-1",
      sessionId: "session-1",
      toolCallId: "mutation.execute",
      toolTitle: "Approve Zotero write?",
      source: "host-bridge-cli",
      approvalKind: "zotero-write",
      summary: "Update one Zotero item.",
      detail: JSON.stringify({ preview: "title: Revised" }),
      requestedAt: "2026-07-28T00:00:00.000Z",
      options: [],
    });

    assert.equal(projected?.approvalKind, "zotero-write");
    assert.equal(projected?.review.preview, "title: Revised");
    assert.equal(
      projectAssistantWorkspacePermissionRequest({
        requestId: "legacy-host-bridge-permission",
        source: "host-bridge-cli",
        options: [],
      })?.approvalKind,
      "zotero-write",
    );
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

  it("keeps source navigation independent from mismatched owner regions", async function () {
    const activeOwner = skillsOwner;
    const changedOwner = createAcpSkillsWorkspaceOwner("request-2");
    const posts: AssistantWorkspacePublication[] = [];
    let navigationReads = 0;
    let regionReads = 0;
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-skills" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => activeOwner,
      mapChange: () => ({
        owner: changedOwner,
        targetsActiveOwner: false,
        publicationKinds: [
          "owner-navigation",
          "owner-control",
          "permission",
          "transcript",
        ] as const,
        transcript: {
          events: [],
          sourceEventSeq: 1,
          visibility: "live" as const,
        },
      }),
      readOwnerNavigation: async () => {
        navigationReads += 1;
        return skillsNavigation;
      },
      readOwnerRegions: async () => {
        regionReads += 1;
        return {};
      },
      readTranscriptPage: async () => skillsTranscript,
    });
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "source-navigation-owner-mismatch",
      getActiveOwner: () => activeOwner,
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
    });
    posts.length = 0;
    navigationReads = 0;
    regionReads = 0;

    const result = runtime.schedule({ adapter, change: {}, context: {} });
    await runtime.flush();

    assert.equal(result.status, "scheduled");
    assert.equal(navigationReads, 1);
    assert.equal(regionReads, 0);
    assert.deepEqual(posts, []);
  });

  it("does not rebind an ACP Skills background run change to the selected owner", function () {
    const mapped = ACP_SKILLS_WORKSPACE_ADAPTER.mapChange(
      {
        requestIds: ["request-2"],
        kinds: ["run", "transcript"],
        transcriptEvents: [],
        transcriptEventSeq: 1,
        transcriptItemCount: 1,
      },
      undefined,
    );

    assert.equal(mapped.owner?.ownerKey, "request-2");
    assert.isFalse(mapped.targetsActiveOwner);
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

  for (const source of ["acp-chat", "acp-skills", "skillrunner"] as const) {
    it(`initializes ${source} owner-first and batch-reads owned regions once`, async function () {
      const owner =
        source === "acp-chat"
          ? chatOwner
          : source === "acp-skills"
            ? skillsOwner
            : skillrunnerOwner;
      // SkillRunner publishes every region kind except plan and
      // service-status (design Decision 3), so its adapter neither supports
      // plan nor receives a service-status initialization payload.
      const supportedKinds =
        source === "skillrunner"
          ? expectedKinds.filter(
              (kind) => kind !== "plan" && kind !== "service-status",
            )
          : expectedKinds;
      const posts: AssistantWorkspacePublication[] = [];
      const materializations: Array<{
        kind: AssistantWorkspacePublicationKind;
        cause: string;
        publicationForm: string;
        materializationSource: string;
      }> = [];
      let batchReads = 0;
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
          source === "acp-chat"
            ? chatNavigation
            : source === "acp-skills"
              ? skillsNavigation
              : skillrunnerNavigation,
        readOwnerRegions: async ({ kinds }) => {
          batchReads += 1;
          return source === "acp-chat"
            ? readAcpChatWorkspaceRegions({ owner: chatOwner, kinds })
            : source === "acp-skills"
              ? readAcpSkillRunWorkspaceRegions({
                  requestId: skillsOwner.requestId,
                  kinds,
                })
              : (Object.fromEntries(
                  kinds
                    .filter((kind) => skillrunnerRegions[kind])
                    .map((kind) => [kind, skillrunnerRegions[kind]]),
                ) as Partial<AssistantWorkspacePublicationRuntimePayloadByKind>);
        },
        readTranscriptPage: async () =>
          source === "acp-chat"
            ? chatTranscript
            : source === "acp-skills"
              ? skillsTranscript
              : skillrunnerTranscript,
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
        ...(source === "skillrunner" ? {} : { serviceStatus: { items: [] } }),
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
      const expectedHead: Array<[string, string | null]> =
        source === "skillrunner"
          ? [
              ["owner-navigation", null],
              ["transcript", "loading"],
              ["transcript", "ready"],
            ]
          : [
              ["owner-navigation", null],
              ["service-status", null],
              ["transcript", "loading"],
              ["transcript", "ready"],
            ];
      assert.deepEqual(
        posts
          .slice(0, expectedHead.length)
          .map((entry) => [
            entry.publicationKind,
            entry.publicationKind === "transcript"
              ? (entry.payload as { status?: string }).status
              : null,
          ]),
        expectedHead,
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

  for (const source of ["acp-chat", "acp-skills", "skillrunner"] as const) {
    it(`keeps the ${source} live-tail mutation base across out-of-order historical page responses`, function () {
      const selectedOwner =
        source === "acp-chat"
          ? chatOwner
          : source === "acp-skills"
            ? skillsOwner
            : skillrunnerOwner;
      const posts: AssistantWorkspacePublication[] = [];
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: `page-cache-${source}`,
        getActiveOwner: () => selectedOwner,
        post: (publication) => {
          posts.push(publication);
          return true;
        },
      });
      const message = (itemId: string, text: string) => ({
        itemId,
        itemKind: "message" as const,
        role: "assistant" as const,
        text,
        status: "streaming" as const,
        createdAt: "2026-07-16T00:00:00.000Z",
        updatedAt: null,
        revision: null,
      });
      const tail: AssistantWorkspaceTranscriptRegion = {
        owner: selectedOwner,
        status: "ready",
        error: null,
        transcriptRevision: 7,
        page: {
          pageKey: `${selectedOwner.ownerKey}\ntail:2`,
          startCursor: 4,
          limit: 2,
          totalVisibleItemCount: 6,
          previousCursor: 2,
          nextCursor: null,
          sourceEventSeq: 7,
          items: [message("tail-4", "four"), message("tail-5", "five")],
        },
      };
      const publishAndAck = (
        region: AssistantWorkspaceTranscriptRegion,
        cause: "activation" | "page-request",
      ) => {
        const publication = coordinator.publishTranscriptSnapshot({
          owner: selectedOwner,
          cause,
          region,
        });
        assert.isDefined(publication);
        coordinator.acknowledge({
          publicationId: publication!.publicationId,
          stage: "render-complete",
          outcome: "accepted",
          reason: null,
          failure: null,
        });
        return publication!;
      };

      publishAndAck(tail, "activation");
      for (const startCursor of [2, 0]) {
        publishAndAck(
          {
            ...tail,
            page: {
              ...tail.page!,
              pageKey: `${selectedOwner.ownerKey}\npage:${startCursor}:2`,
              startCursor,
              previousCursor: startCursor > 0 ? startCursor - 2 : null,
              nextCursor: startCursor + 2,
              items: [
                message(`history-${startCursor}`, `${startCursor}`),
                message(`history-${startCursor + 1}`, `${startCursor + 1}`),
              ],
            },
          },
          "page-request",
        );
      }

      const delta = coordinator.publishTranscriptMutations({
        owner: selectedOwner,
        sourceEventSeq: 8,
        visibility: "live",
        events: [
          {
            boundary: "hard-boundary",
            cardinality: "retain",
            mutation: {
              op: "patch_item",
              itemId: "tail-5",
              patch: { status: "complete", text: "terminal" },
            },
          },
        ],
      });
      assert.isDefined(delta);
      assert.equal(delta?.publicationForm, "delta");
      if (delta?.publicationKind !== "transcript") {
        throw new Error("expected transcript delta");
      }
      assert.equal(delta.payload.page.pageKey, tail.page?.pageKey);
      assert.equal(delta.payload.baseTranscriptRevision, 7);
      assert.deepEqual(delta.payload.mutations, [
        {
          op: "patch_item",
          itemId: "tail-5",
          patch: { status: "complete", text: "terminal" },
        },
      ]);
      assert.equal(
        posts.filter(
          (publication) => publication.publicationCause === "page-request",
        ).length,
        2,
      );
    });

    it(`projects ${source} historical snapshots as cache pages without replacing the selected tail`, function () {
      const selectedOwner =
        source === "acp-chat"
          ? chatOwner
          : source === "acp-skills"
            ? skillsOwner
            : skillrunnerOwner;
      const message = (itemId: string, text: string, status = "complete") => ({
        itemId,
        itemKind: "message" as const,
        role: "assistant" as const,
        text,
        status,
        createdAt: "2026-07-16T00:00:00.000Z",
        updatedAt: null,
        revision: null,
      });
      const tail: AssistantWorkspaceTranscriptRegion = {
        owner: selectedOwner,
        status: "ready",
        error: null,
        transcriptRevision: 1,
        page: {
          pageKey: `${selectedOwner.ownerKey}\ntail:2`,
          startCursor: 2,
          limit: 2,
          totalVisibleItemCount: 3,
          previousCursor: 0,
          nextCursor: null,
          sourceEventSeq: 1,
          items: [message("tail-item", "streaming", "streaming")],
        },
      };
      const historical: AssistantWorkspaceTranscriptRegion = {
        ...tail,
        page: {
          ...tail.page!,
          pageKey: `${selectedOwner.ownerKey}\npage:0:2`,
          startCursor: 0,
          previousCursor: null,
          nextCursor: 2,
          items: [message("history-0", "zero"), message("history-1", "one")],
        },
      };
      const publication = (
        publicationId: string,
        deliverySequence: number,
        regionRevision: number,
        cause: "activation" | "page-request",
        payload: unknown,
        form: "snapshot" | "delta" = "snapshot",
      ) =>
        ({
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId,
          owner: selectedOwner,
          publicationKind: "transcript",
          publicationForm: form,
          publicationCause: cause,
          regionRevision,
          deliverySequence,
          payload,
        }) as AssistantWorkspacePublication;
      const receiver = AssistantWorkspaceAcpChild.createReceiver({ source });
      const initialized = receiver.apply(
        {},
        publication("tail", 1, 1, "activation", tail),
        "",
      );
      assert.isTrue(initialized.accepted);
      const pageResult = receiver.apply(
        initialized.snapshot,
        publication("history", 2, 2, "page-request", historical),
        selectedOwner.ownerKey,
      );
      assert.isTrue(pageResult.accepted);
      assert.equal(pageResult.effect.kind, "cache-page");
      assert.equal(
        pageResult.effect.region.page.pageKey,
        historical.page?.pageKey,
      );
      assert.equal(
        pageResult.snapshot.selection.transcript.page.pageKey,
        tail.page?.pageKey,
      );

      const terminal = receiver.apply(
        pageResult.snapshot,
        publication(
          "terminal",
          3,
          3,
          "activation",
          {
            page: {
              ...tail.page!,
              sourceEventSeq: 2,
            },
            baseTranscriptRevision: 1,
            transcriptRevision: 2,
            mutations: [
              {
                op: "patch_item",
                itemId: "tail-item",
                patch: { status: "complete", text: "terminal" },
              },
            ],
          },
          "delta",
        ),
        selectedOwner.ownerKey,
      );
      assert.isTrue(terminal.accepted);
      assert.isTrue(terminal.effect.onSelectedPage);
      assert.equal(
        terminal.snapshot.selection.transcript.page.items[0].text,
        "terminal",
      );
    });
  }

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

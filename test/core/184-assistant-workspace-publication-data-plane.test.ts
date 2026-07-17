import { assert } from "chai";
import { readFile } from "fs/promises";
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
  createAssistantWorkspaceUnownedScope,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
} from "../../src/modules/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import {
  AssistantWorkspacePublicationRuntime,
  defineAssistantWorkspacePublicationAdapter,
} from "../../src/modules/assistantWorkspacePublicationRuntime";
import {
  assistantWorkspaceTestOwner,
  assistantWorkspaceTestPage,
  assistantWorkspaceTestPublication,
} from "../helpers/assistantWorkspacePublicationHarness";

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

function ownerControl() {
  return {
    status: "running",
    busy: true,
    hint: { kind: "running" as const, message: null },
    connection: {
      status: "connected",
      sessionAvailable: true,
      connected: true,
      canConnect: false,
      canDisconnect: true,
    },
    execution: { canCancel: true, canInterrupt: true },
    authentication: {
      required: false,
      canAuthenticate: false,
      methodId: null,
    },
    permissionPolicy: { autoApprove: false, canSetAutoApprove: false },
  };
}

function navigation(owner: ReturnType<typeof assistantWorkspaceTestOwner>) {
  return {
    selectedOwner: owner,
    selectedGroupId: null,
    groups: [],
    entries: [
      {
        owner,
        groupId: null,
        label: "Selected owner",
        subtitle: null,
        description: null,
        groupLabel: null,
        status: "running",
        backendStatus: "running",
        applyState: null,
        attention: null,
        updatedAt: null,
        messageCount: 1,
      },
    ],
    canCreateOwner: false,
  };
}

describe("Assistant Workspace ACP publication data plane v1", function () {
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
    const owner = assistantWorkspaceTestOwner("acp-skills");
    const publication = assistantWorkspaceTestPublication({
      owner,
      kind: "owner-control",
      payload: ownerControl(),
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
      { ...publication, payload: { ...ownerControl(), selectedRun: {} } },
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
    const owner = assistantWorkspaceTestOwner("acp-skills");
    const presentation = {
      title: "Task",
      subtitle: "Skill",
      description: null,
      notice: { tone: "warning" as const, text: "Needs input" },
      metadata: [{ fieldId: "workflow" as const, value: "Literature" }],
      usage: { used: 4, limit: 10, costText: null },
    };
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

  it("accepts structured permission and rejects legacy source or raw detail", function () {
    const owner = assistantWorkspaceTestOwner("acp-chat");
    const request = {
      requestId: "permission-1",
      approvalKind: "zotero-write" as const,
      title: "Write Zotero item",
      summary: "Update one item",
      tool: {
        title: "Update item",
        callId: "call-1",
      },
      review: {
        requestedAt: "2026-07-17T00:00:00.000Z",
        command: null,
        preview: "title: Revised",
      },
      options: [{ optionId: "allow", label: "Allow", description: null }],
    };
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
    const owner = assistantWorkspaceTestOwner("acp-skills");
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
    const owner = assistantWorkspaceTestOwner("acp-chat");
    let mapCalls = 0;
    const adapter = defineAssistantWorkspacePublicationAdapter({
      source: "acp-chat" as const,
      supportedKinds: expectedKinds,
      selectedOwner: () => owner,
      mapChange: () => {
        mapCalls += 1;
        throw new Error("inactive producer must not run");
      },
      readOwnerNavigation: async () => navigation(owner),
      readOwnerRegions: async () => ({}),
      readTranscriptPage: async () =>
        createReadyTranscriptRegion(
          owner,
          assistantWorkspaceTestPage(owner),
          0,
        ),
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
    const activeOwner = assistantWorkspaceTestOwner("acp-skills");
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
      readOwnerNavigation: async () => navigation(activeOwner),
      readOwnerRegions: async () => {
        reads += 1;
        return {};
      },
      readTranscriptPage: async () =>
        createReadyTranscriptRegion(
          activeOwner,
          assistantWorkspaceTestPage(activeOwner),
          0,
        ),
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
    const owner = assistantWorkspaceTestOwner("acp-chat");
    let reads = 0;
    let changed = false;
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
      readOwnerNavigation: async () => navigation(owner),
      readOwnerRegions: async ({ kinds }) => {
        reads += 1;
        return Object.fromEntries(
          kinds.map((kind) => [
            kind,
            kind === "owner-control"
              ? {
                  ...ownerControl(),
                  hint: {
                    kind: "running",
                    message: changed ? "changed" : null,
                  },
                }
              : {
                  reply: { status: "enabled" },
                  runtimeOptions: {
                    mode: {
                      selectedOptionId: null,
                      options: [],
                      enabled: changed,
                    },
                    model: {
                      selectedOptionId: null,
                      options: [],
                      enabled: false,
                    },
                    reasoningEffort: {
                      selectedOptionId: null,
                      options: [],
                      enabled: false,
                    },
                  },
                },
          ]),
        );
      },
      readTranscriptPage: async () =>
        createReadyTranscriptRegion(
          owner,
          assistantWorkspaceTestPage(owner),
          0,
        ),
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
    changed = true;
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

  for (const source of ["acp-chat", "acp-skills"] as const) {
    it(`initializes ${source} owner-first and batch-reads owned regions once`, async function () {
      const owner = assistantWorkspaceTestOwner(source);
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
        readOwnerNavigation: async () => navigation(owner),
        readOwnerRegions: async ({ kinds }) => {
          batchReads += 1;
          return Object.fromEntries(
            kinds.map((kind) => [
              kind,
              kind === "owner-control"
                ? ownerControl()
                : kind === "message-counts"
                  ? { counts: null }
                  : kind === "plan"
                    ? { items: [] }
                    : kind === "permission"
                      ? { request: null }
                      : kind === "composer"
                        ? {
                            reply: { status: "disabled" },
                            runtimeOptions: {
                              mode: {
                                selectedOptionId: null,
                                options: [],
                                enabled: false,
                              },
                              model: {
                                selectedOptionId: null,
                                options: [],
                                enabled: false,
                              },
                              reasoningEffort: {
                                selectedOptionId: null,
                                options: [],
                                enabled: false,
                              },
                            },
                          }
                        : kind === "owner-details"
                          ? {
                              status: "ready",
                              title: "Owner",
                              subtitle: null,
                              sections: [],
                              actions: [],
                              error: null,
                            }
                          : {
                              title: "Owner",
                              subtitle: null,
                              description: null,
                              notice: null,
                              metadata: [],
                              usage: null,
                              sections: [],
                            },
            ]),
          );
        },
        readTranscriptPage: async () =>
          createReadyTranscriptRegion(
            owner,
            assistantWorkspaceTestPage(owner),
            0,
          ),
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
    const ownerA = assistantWorkspaceTestOwner("acp-skills");
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
      readOwnerNavigation: async () => navigation(selectedOwner),
      readOwnerRegions: async () => detailsRead as never,
      readTranscriptPage: async () =>
        createReadyTranscriptRegion(
          selectedOwner,
          assistantWorkspaceTestPage(selectedOwner),
          0,
        ),
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
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-child.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const receiver = (
      context.window as any
    ).AssistantWorkspaceAcpChild.createReceiver({
      source: "acp-skills",
    });
    const oldOwner = assistantWorkspaceTestOwner("acp-skills");
    const newOwner = {
      ...oldOwner,
      ownerKey: "request-2",
      requestId: "request-2",
    };
    const oldState = {
      source: "acp-skills",
      navigation: navigation(oldOwner),
      services: { items: [] },
      selection: {
        owner: oldOwner,
        phase: "ready",
        control: ownerControl(),
        messageCounts: { counts: null },
        transcript: createReadyTranscriptRegion(
          oldOwner,
          assistantWorkspaceTestPage(oldOwner),
          3,
        ),
        plan: null,
        permission: { request: null },
        composer: null,
        presentation: { title: "old" },
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
    const result = receiver.apply(
      oldState,
      assistantWorkspaceTestPublication({
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
        kind: "owner-navigation",
        payload: navigation(newOwner),
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
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-child.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const receiver = (
      context.window as any
    ).AssistantWorkspaceAcpChild.createReceiver({ source: "acp-chat" });
    const owner = assistantWorkspaceTestOwner("acp-chat");
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
        payload: ownerControl(),
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
    const owner = assistantWorkspaceTestOwner("acp-chat");
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
        payload: ownerControl(),
      }),
    );
    accepts = true;
    assert.isDefined(
      coordinator.publishRegion({
        owner,
        publicationKind: "owner-control",
        cause: "steady-state",
        payload: ownerControl(),
      }),
    );
    assert.equal(attempts, 2);
  });

  it("turns a rejected render ACK into one coordinator-owned rebase", function () {
    const owner = assistantWorkspaceTestOwner("acp-chat");
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
      region: createReadyTranscriptRegion(
        owner,
        assistantWorkspaceTestPage(owner),
        0,
      ),
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
    const owner = assistantWorkspaceTestOwner("acp-chat");
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

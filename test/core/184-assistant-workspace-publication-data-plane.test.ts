import { assert } from "chai";
import { readFile } from "fs/promises";
import {
  ASSISTANT_WORKSPACE_PUBLICATION_KINDS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_REGION_REGISTRY,
  ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
  ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
  assertAssistantWorkspacePublication,
  assertAssistantWorkspacePublicationAck,
  createAssistantWorkspaceUnownedScope,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublication,
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
] as const;

function ownerControl() {
  return {
    status: "running",
    busy: true,
    message: null,
    connection: {
      status: "connected",
      sessionAvailable: true,
      connected: true,
      canConnect: false,
      canDisconnect: true,
    },
    execution: { canCancel: true, canInterrupt: true },
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

describe("Assistant Workspace ACP publication data plane v5", function () {
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
    assert.equal(ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING.plan, "not-applicable");
  });

  it("accepts only the exact v5 envelope and rejects legacy aliases", function () {
    const owner = assistantWorkspaceTestOwner("acp-skills");
    const publication = assistantWorkspaceTestPublication({
      owner,
      kind: "owner-control",
      payload: ownerControl(),
    });
    assert.doesNotThrow(() => assertAssistantWorkspacePublication(publication));
    for (const invalid of [
      {
        ...publication,
        schema: "zotero-agents.assistant-workspace-publication.v4",
      },
      { ...publication, tab: "acp-skills" },
      { ...publication, publicationKind: "baseline-status" },
      { ...publication, payload: { ...ownerControl(), selectedRun: {} } },
    ]) {
      assert.throws(() => assertAssistantWorkspacePublication(invalid));
    }
  });

  it("accepts bounded renderer failures and rejects arbitrary ACK fields", function () {
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublicationAck({
        publicationId: "publication-1",
        stage: "render-complete",
        outcome: "rejected",
        reason: "render-failed",
        failure: { stage: "banner", code: "render-failed" },
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
      supportedKinds: expectedKinds.filter((kind) => kind !== "plan"),
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
              ? { ...ownerControl(), message: changed ? "changed" : null }
              : {
                  reply: {
                    status: "enabled",
                    hint: changed ? "changed" : null,
                  },
                  runtimeOptions: {
                    mode: { selectedOptionId: null, options: [] },
                    model: { selectedOptionId: null, options: [] },
                    reasoningEffort: {
                      selectedOptionId: null,
                      options: [],
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
      let batchReads = 0;
      const supportedKinds =
        source === "acp-chat"
          ? expectedKinds
          : expectedKinds.filter((kind) => kind !== "plan");
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
                            reply: { status: "disabled", hint: null },
                            runtimeOptions: {
                              mode: { selectedOptionId: null, options: [] },
                              model: { selectedOptionId: null, options: [] },
                              reasoningEffort: {
                                selectedOptionId: null,
                                options: [],
                              },
                            },
                          }
                        : {
                            title: "Owner",
                            subtitle: null,
                            description: null,
                            metadata: [],
                            banner: {
                              status: "running",
                              message: null,
                              usage: [],
                              connection: [],
                              recovery: [],
                              workspace: [],
                              details: [],
                              diagnostics: [],
                            },
                            context: [],
                            details: [],
                            tasks: [],
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
      });
      await runtime.initialize({
        adapter,
        context: {},
        cause: "activation",
        serviceStatus: { items: [] },
      });
      assert.equal(batchReads, 1);
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
    assert.equal(result.snapshot.selection.transcript.status, "loading");
    assert.equal(
      result.snapshot.selection.transcript.owner.ownerKey,
      "request-2",
    );
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

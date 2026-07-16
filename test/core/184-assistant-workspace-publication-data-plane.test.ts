import { assert } from "chai";
import { readFile } from "fs/promises";
import {
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
  ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
  assertAssistantWorkspacePublication,
  createAssistantWorkspaceUnownedScope,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublication,
} from "../../src/modules/assistantWorkspacePublication";
import {
  defineAssistantWorkspaceAcpSurfaceAdapter,
  initializeAssistantWorkspaceAcpSurface,
  scheduleAssistantWorkspaceAcpSurfaceChange,
} from "../../src/modules/assistantWorkspaceAcpSurface";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import { mapAcpSkillRunChangeToPublicationKinds } from "../../src/modules/acpSkillsWorkspaceSurface";
import {
  AssistantWorkspaceTranscriptProjection,
  createAssistantWorkspaceTranscriptMutation,
  parseAssistantWorkspaceTranscriptPageRequest,
  type AssistantWorkspaceTranscriptPage,
} from "../../src/modules/assistantWorkspaceTranscriptPublication";

const productionVocabularyFiles = [
  "src/modules/assistantSidebarViewModel.ts",
  "src/modules/acpSidebarModel.ts",
  "src/modules/acpTypes.ts",
  "src/modules/acpChatPanelReadModel.ts",
  "src/modules/acpSkillRunStore.ts",
  "src/modules/assistantWorkspaceSidebar.ts",
  "addon/content/shared/assistant/assistant-panel-model.js",
  "addon/content/shared/assistant/assistant-transcript-renderer.js",
  "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
  "addon/content/sidebar/acp-chat.js",
  "addon/content/sidebar/acp-skill-run.js",
];

function page(ownerKey: string): AssistantWorkspaceTranscriptPage {
  return {
    pageKey: `${ownerKey}\ntail:80`,
    startCursor: 0,
    limit: 80,
    totalVisibleItemCount: 1,
    previousCursor: null,
    nextCursor: null,
    sourceEventSeq: 1,
    items: [
      {
        itemId: "message-1",
        itemKind: "message",
        role: "assistant",
        text: "hello",
        status: "streaming",
      },
    ],
  };
}

function browserSnapshot(
  transcript: ReturnType<typeof createReadyTranscriptRegion>,
) {
  return { regions: { transcript } };
}

function browserTranscript(snapshot: any) {
  return snapshot.regions.transcript;
}

function baselineStatus(status = "running", busy = true) {
  return {
    status,
    busy,
    message: null,
    connection: {
      status: busy ? "connected" : "idle",
      sessionAvailable: true,
      connected: true,
      canConnect: false,
      canDisconnect: !busy,
    },
    execution: {
      canCancel: busy,
      canInterrupt: busy,
    },
  };
}

describe("Assistant Workspace ACP surface v4", function () {
  it("uses one owner and transcript region vocabulary for Chat and Skills", function () {
    const chat = createAcpChatWorkspaceOwner("backend", "conversation");
    const skills = createAcpSkillsWorkspaceOwner("request");
    assert.deepEqual(chat, {
      source: "acp-chat",
      ownerKey: "backend\nconversation",
      backendId: "backend",
      conversationId: "conversation",
    });
    assert.deepEqual(skills, {
      source: "acp-skills",
      ownerKey: "request",
      requestId: "request",
    });
    assert.deepEqual(
      createReadyTranscriptRegion(chat, page(chat.ownerKey), 7),
      {
        owner: chat,
        status: "ready",
        error: null,
        page: page(chat.ownerKey),
        transcriptRevision: 7,
      },
    );
    assert.throws(() => createAcpChatWorkspaceOwner("backend", ""));
    assert.throws(() => createAcpSkillsWorkspaceOwner(""));
  });

  it("uses one owner-plus-request page action for Chat and Skills", function () {
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      assert.deepEqual(
        parseAssistantWorkspaceTranscriptPageRequest({
          owner,
          request: { cursor: 12, limit: 40 },
        }),
        { owner, request: { cursor: 12, limit: 40 } },
      );
    }
    assert.isNull(
      parseAssistantWorkspaceTranscriptPageRequest({
        requestId: "surface-specific-alias",
        cursor: 0,
        limit: 80,
      }),
    );
  });

  it("maps broad ACP Skills run changes to every affected canonical region", function () {
    assert.sameMembers(mapAcpSkillRunChangeToPublicationKinds(["run"]), [
      "baseline-status",
      "owner-navigation",
      "permission",
      "reply-hint",
      "context-details",
    ]);
    assert.deepEqual(
      mapAcpSkillRunChangeToPublicationKinds([
        "transcript",
        "progress",
        "runtime-options",
      ]),
      ["transcript", "message-counts", "reply-hint"],
    );
  });

  it("rejects old aliases and undefined wire values", function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const valid: AssistantWorkspacePublication = {
      schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
      publicationId: "publication-1",
      owner,
      publicationKind: "transcript",
      publicationForm: "snapshot",
      publicationCause: "initialization",
      regionRevision: 1,
      deliverySequence: 1,
      payload: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    };
    assert.doesNotThrow(() => assertAssistantWorkspacePublication(valid));
    assert.throws(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        payload: { ...valid.payload, selectedTranscript: {} },
      }),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        payload: { ...valid.payload, page: undefined },
      }),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        publicationKind: "baseline-status",
        publicationForm: "region",
      }),
    );
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        publicationKind: "baseline-status",
        publicationForm: "region",
        payload: baselineStatus(),
      }),
    );
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
        publicationForm: "snapshot",
        payload: createIdleTranscriptRegion(),
      }),
    );
    assert.doesNotThrow(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
        publicationKind: "owner-navigation",
        publicationForm: "region",
        payload: {
          selectedOwner: owner,
          selectedGroupId: null,
          groups: [],
          entries: [
            {
              owner,
              groupId: null,
              label: "Run",
              description: null,
              groupLabel: null,
              status: "running",
            },
          ],
          canCreateOwner: false,
        },
      }),
    );
    assert.throws(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
        publicationKind: "baseline-status",
        publicationForm: "region",
        payload: baselineStatus(),
      }),
    );
  });

  it("selects the canonical child owner through unowned navigation", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    const owner = createAcpSkillsWorkspaceOwner("request");
    const receiver = api.createReceiver({ source: owner.source });
    const result = receiver.apply(
      {},
      {
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: "owner-navigation-1",
        owner: createAssistantWorkspaceUnownedScope(owner.source),
        publicationKind: "owner-navigation",
        publicationForm: "region",
        publicationCause: "initialization",
        regionRevision: 1,
        deliverySequence: 1,
        payload: {
          selectedOwner: owner,
          selectedGroupId: null,
          groups: [],
          entries: [
            {
              owner,
              groupId: null,
              label: "Run",
              description: null,
              groupLabel: null,
              status: "running",
            },
          ],
          canCreateOwner: false,
        },
      },
      "",
    );
    assert.isTrue(result.accepted);
    assert.deepEqual(result.snapshot.owner, owner);
    assert.deepEqual(
      result.snapshot.regions.ownerNavigation.selectedOwner,
      owner,
    );
  });

  it("holds boundary text and releases suffix mutations through one projection", function () {
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const projection = new AssistantWorkspaceTranscriptProjection();
      projection.registerSnapshot(owner, page(owner.ownerKey));
      assert.deepEqual(
        projection.record(owner, {
          boundary: "text-continuation",
          mutation: {
            op: "append_text",
            itemId: "message-1",
            text: " world",
          },
          cardinality: "retain",
          visibility: "boundary",
        }),
        [],
      );
      assert.deepEqual(projection.release(owner), [
        {
          op: "append_text",
          itemId: "message-1",
          text: " world",
        },
      ]);
    }
  });

  it("projects minimal canonical mutations from before and after items", function () {
    const before = {
      id: "tool-1",
      kind: "tool_call",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: null,
      toolCallId: "call-1",
      title: "Read",
      toolKind: "read",
      toolName: "read_file",
      inputSummary: "input",
      resultSummary: null,
      summary: null,
      state: "in_progress",
    };
    const after = {
      ...before,
      resultSummary: "done",
      state: "completed",
    };
    assert.deepEqual(
      createAssistantWorkspaceTranscriptMutation({
        op: "patch_item",
        itemId: "tool-1",
        beforeItem: before,
        afterItem: after,
      }),
      {
        op: "patch_item",
        itemId: "tool-1",
        patch: { resultSummary: "done", status: "completed" },
      },
    );
    assert.deepEqual(
      createAssistantWorkspaceTranscriptMutation({
        op: "append_text",
        itemId: "message-1",
        beforeItem: {
          id: "message-1",
          kind: "message",
          role: "assistant",
          text: "a".repeat(16_000),
          state: "streaming",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        afterItem: {
          id: "message-1",
          kind: "message",
          role: "assistant",
          text: `${"a".repeat(16_000)}!`,
          state: "streaming",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        text: "!",
      }),
      { op: "append_text", itemId: "message-1", text: "!" },
    );
  });

  it("keeps initialization in flight until terminal child acknowledgement", function () {
    const posts: AssistantWorkspacePublication[] = [];
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post: (publication) => {
        posts.push(publication);
        return true;
      },
    });
    const snapshot = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    assert.equal(posts.length, 1);
    coordinator.enqueueTranscriptMutations({
      owner,
      page: page(owner.ownerKey),
      mutations: [{ op: "append_text", itemId: "message-1", text: "!" }],
    });
    coordinator.acknowledge({
      publicationId: snapshot!.publicationId,
      stage: "shell-forward",
      outcome: "accepted",
      reason: null,
    });
    assert.equal(posts.length, 1, "shell acknowledgement is observational");
    coordinator.acknowledge({
      publicationId: snapshot!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    assert.equal(posts.length, 2);
    assert.equal(posts[1].publicationForm, "delta");
  });

  it("publishes the same unowned idle transcript snapshot for both surfaces", function () {
    for (const source of ["acp-chat", "acp-skills"] as const) {
      const posts: AssistantWorkspacePublication[] = [];
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: "test",
        getActiveOwner: () => null,
        post(publication) {
          posts.push(publication);
          return true;
        },
      });
      const publication = coordinator.publishTranscriptSnapshot({
        owner: createAssistantWorkspaceUnownedScope(source),
        cause: "diagnostic",
        region: createIdleTranscriptRegion(),
      });

      assert.deepInclude(publication, {
        owner: { source, ownerKey: null },
        publicationKind: "transcript",
        publicationForm: "snapshot",
        publicationCause: "diagnostic",
      });
      assert.lengthOf(posts, 1);
    }
  });

  it("serializes loading and ready snapshots in one owner lane", function () {
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        posts.push(publication);
        return true;
      },
    });
    const loading = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createLoadingTranscriptRegion(owner),
    });
    const ready = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "activation",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });

    assert.equal(posts.length, 1);
    assert.equal(posts[0].publicationId, loading?.publicationId);
    coordinator.acknowledge({
      publicationId: loading!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    assert.equal(posts.length, 2);
    assert.equal(posts[1].publicationId, ready?.publicationId);
  });

  it("initializes Chat and Skills through the same typed owner-first chain", async function () {
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const posts: AssistantWorkspacePublication[] = [];
      const reads: string[] = [];
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: owner.source,
        getActiveOwner: () => owner,
        post(publication) {
          posts.push(publication);
          return true;
        },
      });
      const adapter = defineAssistantWorkspaceAcpSurfaceAdapter({
        source: owner.source,
        domainMapping:
          owner.source === "acp-chat"
            ? ACP_CHAT_WORKSPACE_DOMAIN_MAPPING
            : ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
        getActiveOwner: () => owner,
        async readOwnerNavigation() {
          reads.push("owner-navigation");
          return {
            selectedOwner: owner,
            selectedGroupId: null,
            groups: [],
            entries: [
              {
                owner,
                groupId: null,
                label: "Owner",
                description: null,
                groupLabel: null,
                status: "running",
              },
            ],
            canCreateOwner: false,
          };
        },
        mapChange: () => ({
          owner,
          targetsActiveOwner: true,
          publicationKinds: [],
        }),
        async readPublication(args: any) {
          reads.push(args.publicationKind);
          if (args.publicationKind === "transcript") {
            return createReadyTranscriptRegion(owner, page(owner.ownerKey), 0);
          }
          if (args.publicationKind === "baseline-status") {
            return baselineStatus();
          }
          if (args.publicationKind === "message-counts") {
            return { counts: null };
          }
          if (args.publicationKind === "plan") return { items: [] };
          if (args.publicationKind === "permission") {
            return { request: null };
          }
          if (args.publicationKind === "reply-hint") {
            const optionGroup = { selectedOptionId: null, options: [] };
            return {
              reply: { status: "enabled", hint: null },
              runtimeOptions: {
                mode: optionGroup,
                model: optionGroup,
                reasoningEffort: optionGroup,
              },
            };
          }
          if (args.publicationKind === "context-details") {
            return { context: [], details: [] };
          }
          return null;
        },
      } as any);

      const publicationIds = await initializeAssistantWorkspaceAcpSurface({
        adapter,
        coordinator,
        context: undefined,
        cause: "initialization",
      });

      assert.equal(posts[0].publicationKind, "owner-navigation");
      assert.equal(posts[0].owner.ownerKey, null);
      assert.equal(posts[1].publicationKind, "transcript");
      assert.equal(posts[1].publicationForm, "snapshot");
      assert.equal((posts[1].payload as any).status, "loading");
      assert.notInclude(
        posts.slice(2).map((publication) => publication.publicationKind),
        "transcript",
      );
      assert.include(reads, "transcript");
      const loadingId = posts[1].publicationId;
      coordinator.acknowledge({
        publicationId: loadingId,
        stage: "render-complete",
        outcome: "accepted",
        reason: null,
      });
      const ready = posts.at(-1)!;
      assert.equal(ready.publicationKind, "transcript");
      assert.equal((ready.payload as any).status, "ready");
      assert.include(publicationIds, ready.publicationId);
    }
  });

  it("rebases the owner lane after a child render failure", function () {
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const posts: AssistantWorkspacePublication[] = [];
    const rebases: Array<{
      ownerKey: string;
      pageKey: string;
      reason: string;
    }> = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        posts.push(publication);
        return true;
      },
      onTranscriptRebaseRequired(args) {
        rebases.push({
          ownerKey: args.owner.ownerKey,
          pageKey: args.pageKey,
          reason: args.reason,
        });
      },
    });
    const snapshot = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });

    coordinator.acknowledge({
      publicationId: snapshot!.publicationId,
      stage: "render-complete",
      outcome: "rejected",
      reason: "render-failed",
    });
    assert.lengthOf(posts, 1);
    assert.deepEqual(rebases, [
      {
        ownerKey: owner.ownerKey,
        pageKey: page(owner.ownerKey).pageKey,
        reason: "render-failed",
      },
    ]);
  });

  it("does not consume transcript mutations or revisions when post fails", function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const posts: AssistantWorkspacePublication[] = [];
    let allowPost = false;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        if (!allowPost) return false;
        posts.push(publication);
        return true;
      },
    });
    const snapshot = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    allowPost = true;
    coordinator.publishTranscriptMutations({
      owner,
      sourceEventSeq: 2,
      visibility: "live",
      events: [
        {
          boundary: "text-continuation",
          mutation: { op: "append_text", itemId: "message-1", text: "!" },
          cardinality: "retain",
        },
      ],
    });
    assert.equal(posts[0].publicationId, snapshot?.publicationId);
    coordinator.acknowledge({
      publicationId: snapshot!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    assert.equal(posts[1].publicationForm, "delta");
    assert.deepEqual((posts[1].payload as any).mutations, [
      { op: "append_text", itemId: "message-1", text: "!" },
    ]);
    assert.equal((posts[1].payload as any).baseTranscriptRevision, 0);
    assert.equal((posts[1].payload as any).transcriptRevision, 1);
  });

  it("does not commit a region signature when delivery fails", function () {
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const posts: AssistantWorkspacePublication[] = [];
    let allowPost = false;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        if (!allowPost) return false;
        posts.push(publication);
        return true;
      },
    });
    const payload = { completed: 1, total: 2 };

    assert.isUndefined(
      coordinator.publishRegion({
        owner,
        publicationKind: "message-counts",
        cause: "steady-state",
        payload,
      }),
    );
    allowPost = true;
    assert.isDefined(
      coordinator.publishRegion({
        owner,
        publicationKind: "message-counts",
        cause: "steady-state",
        payload,
      }),
    );
    assert.lengthOf(posts, 1);
  });

  it("clears every owner-scoped publication lane and signature on owner switch", async function () {
    const firstOwner = createAcpChatWorkspaceOwner("backend", "first");
    const secondOwner = createAcpChatWorkspaceOwner("backend", "second");
    let activeOwner = firstOwner;
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "owner-cleanup",
      getActiveOwner: () => activeOwner,
      post(publication) {
        posts.push(publication);
        return true;
      },
    });
    const regionPayload = { completed: 1, total: 2 };
    const region = coordinator.publishRegion({
      owner: firstOwner,
      publicationKind: "message-counts",
      cause: "steady-state",
      payload: regionPayload,
    });
    const snapshot = coordinator.publishTranscriptSnapshot({
      owner: firstOwner,
      cause: "initialization",
      region: createReadyTranscriptRegion(
        firstOwner,
        page(firstOwner.ownerKey),
        0,
      ),
    });
    assert.isDefined(region);
    assert.isDefined(snapshot);

    activeOwner = secondOwner;
    coordinator.clearOwner(firstOwner);
    activeOwner = firstOwner;
    const republished = coordinator.publishRegion({
      owner: firstOwner,
      publicationKind: "message-counts",
      cause: "owner-switch",
      payload: regionPayload,
    });

    assert.isDefined(republished);
    assert.equal(republished?.regionRevision, 1);
    assert.isUndefined(
      await coordinator.waitForPostedPublication(snapshot!.publicationId),
    );
  });

  it("lets a queued snapshot supersede mutations already represented by it", function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        posts.push(publication);
        return true;
      },
    });
    const initial = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    coordinator.enqueueTranscriptMutations({
      owner,
      page: page(owner.ownerKey),
      mutations: [{ op: "append_text", itemId: "message-1", text: "!" }],
    });
    const replacementPage = {
      ...page(owner.ownerKey),
      pageKey: `${owner.ownerKey}\n0:80`,
      items: [{ ...page(owner.ownerKey).items[0], text: "hello!" }],
      sourceEventSeq: 2,
    };
    const replacement = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "activation",
      region: createReadyTranscriptRegion(owner, replacementPage, 0),
    });

    coordinator.acknowledge({
      publicationId: initial!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    coordinator.acknowledge({
      publicationId: replacement!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    assert.deepEqual(
      posts.map((publication) => publication.publicationForm),
      ["snapshot", "snapshot"],
    );
  });

  it("resolves a queued diagnostic identity only after its post is owned", async function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        posts.push(publication);
        return true;
      },
    });
    const initial = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    const queued = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
      force: true,
    });
    let resolved = false;
    const posted = coordinator
      .waitForPostedPublication(queued!.publicationId)
      .then((publication) => {
        resolved = true;
        return publication;
      });
    await Promise.resolve();
    assert.isFalse(resolved);

    coordinator.acknowledge({
      publicationId: initial!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });

    assert.equal((await posted)?.publicationId, queued!.publicationId);
    assert.deepEqual(
      posts.map((publication) => publication.publicationId),
      [initial!.publicationId, queued!.publicationId],
    );
  });

  it("settles a queued diagnostic identity when a newer snapshot supersedes it", async function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post: () => true,
    });
    coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    const superseded = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
      force: true,
    });
    const posted = coordinator.waitForPostedPublication(
      superseded!.publicationId,
    );

    coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
      force: true,
    });

    assert.isUndefined(await posted);
  });

  it("terminates posted and queued publication state when the target closes", async function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post: () => true,
    });
    const initial = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    const queued = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
      force: true,
    });
    const posted = coordinator.waitForPostedPublication(queued!.publicationId);

    coordinator.reset();

    assert.isUndefined(await posted);
    assert.isFalse(
      coordinator.acknowledge({
        publicationId: initial!.publicationId,
        stage: "render-complete",
        outcome: "accepted",
        reason: null,
      }),
    );
    const replacement = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "activation",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });
    assert.equal(replacement?.regionRevision, 3);
  });

  it("lets an initialization snapshot replace undelivered transcript work", function () {
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const posts: AssistantWorkspacePublication[] = [];
    let allowPost = false;
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post(publication) {
        if (!allowPost) return false;
        posts.push(publication);
        return true;
      },
    });

    coordinator.publishTranscriptMutations({
      owner,
      sourceEventSeq: 1,
      visibility: "live",
      events: [],
    });
    allowPost = true;
    coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    });

    assert.deepEqual(
      posts.map((publication) => publication.publicationForm),
      ["snapshot"],
    );
  });

  it("forces an exact diagnostic snapshot even when content is unchanged", function () {
    const owner = createAcpSkillsWorkspaceOwner("request");
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "test",
      getActiveOwner: () => owner,
      post: (publication) => {
        posts.push(publication);
        return true;
      },
    });
    const region = createReadyTranscriptRegion(owner, page(owner.ownerKey), 0);
    const first = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region,
      force: true,
    });
    coordinator.acknowledge({
      publicationId: first!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    const second = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "diagnostic",
      region,
      force: true,
    });
    assert.notEqual(first?.publicationId, second?.publicationId);
    assert.equal(posts.length, 2);
  });

  it("publishes the same suffix delta form for Chat and Skills", function () {
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const posts: AssistantWorkspacePublication[] = [];
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: owner.source,
        getActiveOwner: () => owner,
        post(publication) {
          posts.push(publication);
          return true;
        },
      });
      const initialPage = page(owner.ownerKey);
      const snapshot = coordinator.publishTranscriptSnapshot({
        owner,
        cause: "initialization",
        region: createReadyTranscriptRegion(owner, initialPage, 0),
      });
      coordinator.acknowledge({
        publicationId: snapshot!.publicationId,
        stage: "render-complete",
        outcome: "accepted",
        reason: null,
      });
      coordinator.publishTranscriptMutations({
        owner,
        sourceEventSeq: 2,
        visibility: "live",
        events: [
          {
            boundary: "text-continuation",
            mutation: {
              op: "append_text",
              itemId: "message-1",
              text: " world",
            },
            cardinality: "retain",
          },
          {
            boundary: "hard-boundary",
            mutation: {
              op: "patch_item",
              itemId: "message-1",
              patch: { role: "assistant", status: "complete" },
            },
            cardinality: "retain",
          },
        ],
      });
      assert.equal(posts.length, 2);
      assert.equal(posts[1].publicationForm, "delta");
      assert.deepEqual((posts[1].payload as any).mutations, [
        { op: "append_text", itemId: "message-1", text: " world" },
        {
          op: "patch_item",
          itemId: "message-1",
          patch: {
            role: "assistant",
            status: "complete",
          },
        },
      ]);
      assert.notInclude(JSON.stringify(posts[1]), "hello world");
    }
  });

  it("schedules Chat and Skills changes through one source-neutral runtime", function () {
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const queued: string[][] = [];
      const dropped: string[] = [];
      const coordinator = new AssistantWorkspacePublicationCoordinator({
        scopeKey: owner.source,
        getActiveOwner: () => owner,
        post: () => true,
      });
      const adapter = defineAssistantWorkspaceAcpSurfaceAdapter({
        source: owner.source,
        domainMapping:
          owner.source === "acp-chat"
            ? ACP_CHAT_WORKSPACE_DOMAIN_MAPPING
            : ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING,
        getActiveOwner: () => owner,
        async readOwnerNavigation() {
          throw new Error("not-used");
        },
        mapChange() {
          return {
            owner,
            targetsActiveOwner: true,
            publicationKinds: ["message-counts"],
          };
        },
        async readPublication() {
          throw new Error("not-used");
        },
      });
      const scheduled = scheduleAssistantWorkspaceAcpSurfaceChange({
        adapter,
        coordinator,
        change: {},
        context: undefined,
        activity: "matching-target",
        synchronizeOwner: () => false,
        initialize: () => assert.fail("unexpected initialization"),
        queueRegions: (_owner, kinds) => queued.push([...kinds]),
      });
      assert.equal(scheduled.status, "scheduled");
      assert.deepEqual(queued, [["message-counts"]]);

      const inactive = scheduleAssistantWorkspaceAcpSurfaceChange({
        adapter,
        coordinator,
        change: {},
        context: undefined,
        activity: "opposite-active",
        synchronizeOwner: () => false,
        initialize: () => assert.fail("unexpected initialization"),
        queueRegions: () => assert.fail("unexpected publication"),
        onDropped: ({ reason }) => dropped.push(reason),
      });
      assert.equal(inactive.status, "dropped");
      assert.deepEqual(dropped, ["opposite-active"]);
    }
  });

  it("keeps the selected tail page bounded while its cursor advances", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;

    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const receiver = api.createReceiver({ source: owner.source });
      const initialPage = {
        ...page(owner.ownerKey),
        pageKey: `${owner.ownerKey}\ntail:2`,
        limit: 2,
        totalVisibleItemCount: 2,
        items: [
          page(owner.ownerKey).items[0],
          {
            ...page(owner.ownerKey).items[0],
            itemId: "message-2",
            text: "second",
          },
        ],
      };
      const region = createReadyTranscriptRegion(owner, initialPage, 0);
      const adopted = receiver.apply(
        browserSnapshot(region),
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-bounded-snapshot`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "initialization",
          regionRevision: 1,
          deliverySequence: 1,
          payload: region,
        },
        owner.ownerKey,
      );
      const applied = receiver.apply(
        adopted.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-bounded-delta`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 2,
          deliverySequence: 2,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:2`,
              startCursor: 1,
              limit: 2,
              totalVisibleItemCount: 3,
              previousCursor: 0,
              nextCursor: null,
              sourceEventSeq: 2,
            },
            baseTranscriptRevision: 0,
            transcriptRevision: 1,
            mutations: [
              {
                op: "upsert_item",
                item: {
                  ...page(owner.ownerKey).items[0],
                  itemId: "message-3",
                  text: "third",
                },
              },
            ],
          },
        },
        owner.ownerKey,
      );

      assert.isTrue(applied.accepted);
      assert.equal(browserTranscript(applied.snapshot).page.startCursor, 1);
      assert.deepEqual(
        Array.from(
          browserTranscript(applied.snapshot).page.items,
          (item: any) => item.itemId,
        ),
        ["message-2", "message-3"],
      );
      assert.lengthOf(browserTranscript(applied.snapshot).page.items, 2);
    }
  });

  it("commits an inserted item to the index before the next delta", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;

    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const receiver = api.createReceiver({ source: owner.source });
      const initialPage = {
        ...page(owner.ownerKey),
        items: [],
        totalVisibleItemCount: 0,
      };
      const region = createReadyTranscriptRegion(owner, initialPage, 0);
      const adopted = receiver.apply(
        browserSnapshot(region),
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-continuity-snapshot`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "initialization",
          regionRevision: 1,
          deliverySequence: 1,
          payload: region,
        },
        owner.ownerKey,
      );
      const inserted = receiver.apply(
        adopted.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-continuity-insert`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 2,
          deliverySequence: 2,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 0,
              limit: 80,
              totalVisibleItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              sourceEventSeq: 2,
            },
            baseTranscriptRevision: 0,
            transcriptRevision: 1,
            mutations: [
              {
                op: "upsert_item",
                item: {
                  itemId: "new-message",
                  itemKind: "message",
                  role: "assistant",
                  text: "hello",
                  status: "streaming",
                },
              },
            ],
          },
        },
        owner.ownerKey,
      );
      assert.isTrue(inserted.accepted);

      const patched = receiver.apply(
        inserted.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-continuity-patch`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 3,
          deliverySequence: 3,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 0,
              limit: 80,
              totalVisibleItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              sourceEventSeq: 3,
            },
            baseTranscriptRevision: 1,
            transcriptRevision: 2,
            mutations: [
              { op: "append_text", itemId: "new-message", text: " world" },
              {
                op: "patch_item",
                itemId: "new-message",
                patch: { status: "complete" },
              },
            ],
          },
        },
        owner.ownerKey,
      );

      assert.isTrue(patched.accepted);
      assert.equal(
        browserTranscript(patched.snapshot).page.items[0].text,
        "hello world",
      );
      assert.equal(
        browserTranscript(patched.snapshot).page.items[0].status,
        "complete",
      );
    }
  });

  it("publishes advancing tail metadata from the shared coordinator", function () {
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const posts: AssistantWorkspacePublication[] = [];
    const coordinator = new AssistantWorkspacePublicationCoordinator({
      scopeKey: "bounded-tail",
      getActiveOwner: () => owner,
      post(publication) {
        posts.push(publication);
        return true;
      },
    });
    const initialPage = {
      ...page(owner.ownerKey),
      pageKey: `${owner.ownerKey}\ntail:2`,
      limit: 2,
      totalVisibleItemCount: 2,
      items: [
        page(owner.ownerKey).items[0],
        {
          ...page(owner.ownerKey).items[0],
          itemId: "message-2",
        },
      ],
    };
    const snapshot = coordinator.publishTranscriptSnapshot({
      owner,
      cause: "initialization",
      region: createReadyTranscriptRegion(owner, initialPage, 0),
    });
    coordinator.acknowledge({
      publicationId: snapshot!.publicationId,
      stage: "render-complete",
      outcome: "accepted",
      reason: null,
    });
    coordinator.publishTranscriptMutations({
      owner,
      sourceEventSeq: 2,
      visibility: "live",
      events: [
        {
          boundary: "hard-boundary",
          mutation: {
            op: "upsert_item",
            item: {
              ...page(owner.ownerKey).items[0],
              itemId: "message-3",
            },
          },
          cardinality: "insert",
        },
      ],
    });

    assert.equal((posts[1].payload as any).page.startCursor, 1);
    assert.equal((posts[1].payload as any).page.previousCursor, 0);
    assert.equal((posts[1].payload as any).page.totalVisibleItemCount, 3);
  });

  it("rejects a mixed invalid mutation batch atomically", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    const receiver = api.createReceiver({ source: owner.source });
    const region = createReadyTranscriptRegion(owner, page(owner.ownerKey), 0);
    const adopted = receiver.apply(
      browserSnapshot(region),
      {
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: "atomic-snapshot",
        owner,
        publicationKind: "transcript",
        publicationForm: "snapshot",
        publicationCause: "initialization",
        regionRevision: 1,
        deliverySequence: 1,
        payload: region,
      },
      owner.ownerKey,
    );
    const result = receiver.apply(
      adopted.snapshot,
      {
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: "atomic-delta",
        owner,
        publicationKind: "transcript",
        publicationForm: "delta",
        publicationCause: "steady-state",
        regionRevision: 2,
        deliverySequence: 2,
        payload: {
          page: {
            pageKey: `${owner.ownerKey}\ntail:80`,
            startCursor: 0,
            limit: 80,
            totalVisibleItemCount: 2,
            previousCursor: null,
            nextCursor: null,
            sourceEventSeq: 2,
          },
          baseTranscriptRevision: 0,
          transcriptRevision: 1,
          mutations: [
            {
              op: "upsert_item",
              item: {
                ...page(owner.ownerKey).items[0],
                itemId: "message-2",
              },
            },
            { op: "append_text", itemId: "missing", text: "invalid" },
          ],
        },
      },
      owner.ownerKey,
    );

    assert.deepInclude(result, {
      accepted: false,
      reason: "gap",
    });
    assert.strictEqual(result.snapshot, adopted.snapshot);
    assert.deepEqual(
      Array.from(
        browserTranscript(adopted.snapshot).page.items,
        (item: any) => item.itemId,
      ),
      ["message-1"],
    );
  });

  it("requests rebase when a tail delete needs an unloaded head item", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    const owner = createAcpSkillsWorkspaceOwner("request");
    const receiver = api.createReceiver({ source: owner.source });
    const selectedPage = {
      ...page(owner.ownerKey),
      pageKey: `${owner.ownerKey}\ntail:2`,
      startCursor: 1,
      limit: 2,
      totalVisibleItemCount: 3,
      previousCursor: 0,
      items: [
        {
          ...page(owner.ownerKey).items[0],
          itemId: "message-2",
        },
        {
          ...page(owner.ownerKey).items[0],
          itemId: "message-3",
        },
      ],
    };
    const region = createReadyTranscriptRegion(owner, selectedPage, 0);
    const adopted = receiver.apply(
      browserSnapshot(region),
      {
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: "delete-snapshot",
        owner,
        publicationKind: "transcript",
        publicationForm: "snapshot",
        publicationCause: "initialization",
        regionRevision: 1,
        deliverySequence: 1,
        payload: region,
      },
      owner.ownerKey,
    );
    const result = receiver.apply(
      adopted.snapshot,
      {
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: "delete-delta",
        owner,
        publicationKind: "transcript",
        publicationForm: "delta",
        publicationCause: "steady-state",
        regionRevision: 2,
        deliverySequence: 2,
        payload: {
          page: {
            pageKey: `${owner.ownerKey}\ntail:2`,
            startCursor: 0,
            limit: 2,
            totalVisibleItemCount: 2,
            previousCursor: null,
            nextCursor: null,
            sourceEventSeq: 2,
          },
          baseTranscriptRevision: 0,
          transcriptRevision: 1,
          mutations: [{ op: "delete_item", itemId: "message-3" }],
        },
      },
      owner.ownerKey,
    );

    assert.deepInclude(result, {
      accepted: false,
      reason: "gap",
    });
    assert.strictEqual(result.snapshot, adopted.snapshot);
  });

  it("applies owner, revision, and gap rules through one browser receiver", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const receiver = api.createReceiver({ source: owner.source });
      const region = createReadyTranscriptRegion(
        owner,
        page(owner.ownerKey),
        0,
      );
      const invalidOwner =
        owner.source === "acp-chat"
          ? createAcpChatWorkspaceOwner("backend", "other-conversation")
          : createAcpSkillsWorkspaceOwner("other-request");
      const invalid = receiver.apply(
        browserSnapshot(region),
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-invalid-snapshot`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "initialization",
          regionRevision: 1,
          deliverySequence: 1,
          payload: createReadyTranscriptRegion(
            invalidOwner,
            page(invalidOwner.ownerKey),
            0,
          ),
        },
        owner.ownerKey,
      );
      assert.deepInclude(invalid, { accepted: false, reason: "invalid" });
      const snapshot = browserSnapshot(region);
      const adopted = receiver.apply(
        snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-snapshot`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "initialization",
          regionRevision: 1,
          deliverySequence: 1,
          payload: region,
        },
        owner.ownerKey,
      );
      assert.isTrue(adopted.accepted);
      const applied = receiver.apply(
        adopted.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-delta`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 2,
          deliverySequence: 2,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 0,
              limit: 80,
              totalVisibleItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              sourceEventSeq: 2,
            },
            baseTranscriptRevision: 0,
            transcriptRevision: 1,
            mutations: [
              { op: "append_text", itemId: "message-1", text: " world" },
              {
                op: "patch_item",
                itemId: "message-1",
                patch: { status: "complete" },
              },
            ],
          },
        },
        owner.ownerKey,
      );
      assert.isTrue(applied.accepted);
      const duplicate = receiver.apply(
        applied.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-delta`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 2,
          deliverySequence: 2,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 0,
              limit: 80,
              totalVisibleItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              sourceEventSeq: 2,
            },
            baseTranscriptRevision: 0,
            transcriptRevision: 1,
            mutations: [
              { op: "append_text", itemId: "message-1", text: " world" },
            ],
          },
        },
        owner.ownerKey,
      );
      assert.isTrue(duplicate.accepted);
      assert.isTrue(duplicate.duplicate);
      assert.strictEqual(duplicate.snapshot, applied.snapshot);
      assert.deepEqual(JSON.parse(JSON.stringify(applied.effect)), {
        kind: "mutations",
        onSelectedPage: true,
        mutations: [
          { op: "append_text", itemId: "message-1", text: " world" },
          {
            op: "patch_item",
            itemId: "message-1",
            patch: { status: "complete" },
          },
        ],
        affectedItems: [
          {
            itemId: "message-1",
            itemKind: "message",
            role: "assistant",
            text: "hello world",
            status: "complete",
          },
        ],
        pageItems: [
          {
            itemId: "message-1",
            itemKind: "message",
            role: "assistant",
            text: "hello world",
            status: "complete",
          },
        ],
        evictedItemIds: [],
      });
      assert.equal(
        browserTranscript(applied.snapshot).page.items[0].text,
        "hello world",
      );
      const gap = receiver.apply(
        applied.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-gap`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 3,
          deliverySequence: 3,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 0,
              limit: 80,
              totalVisibleItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              sourceEventSeq: 3,
            },
            baseTranscriptRevision: 99,
            transcriptRevision: 100,
            mutations: [],
          },
        },
        owner.ownerKey,
      );
      assert.deepInclude(gap, { accepted: false, reason: "gap" });
      assert.strictEqual(gap.snapshot, applied.snapshot);

      const historyReceiver = api.createReceiver({ source: owner.source });
      const historyRegion = {
        ...region,
        page: {
          ...region.page,
          pageKey: `${owner.ownerKey}\ncursor:0:80`,
          startCursor: 0,
        },
      };
      const historySnapshot = historyReceiver.apply(
        browserSnapshot(historyRegion),
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-history-snapshot`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "page-request",
          regionRevision: 1,
          deliverySequence: 1,
          payload: historyRegion,
        },
        owner.ownerKey,
      );
      const offPage = historyReceiver.apply(
        historySnapshot.snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `${owner.source}-off-page`,
          owner,
          publicationKind: "transcript",
          publicationForm: "delta",
          publicationCause: "steady-state",
          regionRevision: 2,
          deliverySequence: 2,
          payload: {
            page: {
              pageKey: `${owner.ownerKey}\ntail:80`,
              startCursor: 80,
              limit: 80,
              totalVisibleItemCount: 2,
              previousCursor: 0,
              nextCursor: null,
              sourceEventSeq: 4,
            },
            baseTranscriptRevision: 0,
            transcriptRevision: 1,
            mutations: [
              {
                op: "upsert_item",
                item: {
                  ...region.page.items[0],
                  itemId: "message-2",
                  text: "tail only",
                },
              },
            ],
          },
        },
        owner.ownerKey,
      );
      assert.isTrue(offPage.accepted);
      assert.equal(
        browserTranscript(offPage.snapshot).page.pageKey,
        `${owner.ownerKey}\ncursor:0:80`,
      );
      assert.equal(browserTranscript(offPage.snapshot).page.items.length, 1);
      assert.equal(
        browserTranscript(offPage.snapshot).page.totalVisibleItemCount,
        2,
      );
    }
  });

  it("drops prior owner revision state when the selected owner changes", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    const first = createAcpChatWorkspaceOwner("backend", "first");
    const second = createAcpChatWorkspaceOwner("backend", "second");
    const receiver = api.createReceiver({ source: "acp-chat" });
    let snapshot: any = {};
    let sequence = 0;

    const applyOwner = (owner: typeof first, regionRevision: number) => {
      sequence += 1;
      const result = receiver.apply(
        snapshot,
        {
          schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
          publicationId: `owner-switch-${sequence}`,
          owner,
          publicationKind: "transcript",
          publicationForm: "snapshot",
          publicationCause: "owner-switch",
          regionRevision,
          deliverySequence: sequence,
          payload: createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
        },
        owner.ownerKey,
      );
      if (result.accepted) snapshot = result.snapshot;
      return result;
    };

    assert.isTrue(applyOwner(first, 3).accepted);
    assert.isTrue(applyOwner(second, 1).accepted);
    assert.isTrue(applyOwner(first, 1).accepted);
  });

  it("reports render failure through the shared child client for both surfaces", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      let snapshot: any = {
        regions: {
          transcript: createReadyTranscriptRegion(
            owner,
            page(owner.ownerKey),
            0,
          ),
        },
      };
      const acknowledgements: any[] = [];
      const client = api.createClient({
        source: owner.source,
        getSnapshot: () => snapshot,
        setSnapshot: (next: unknown) => {
          snapshot = next;
        },
        getOwnerKey: () => owner.ownerKey,
        ack: (
          publication: any,
          stage: string,
          outcome: string,
          reason: string | null,
        ) =>
          acknowledgements.push({
            publicationId: publication.publicationId,
            stage,
            outcome,
            reason,
          }),
        render: () => {
          throw new Error("render failed");
        },
      });
      client.apply({
        schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
        publicationId: `${owner.source}-render-failure`,
        owner,
        publicationKind: "transcript",
        publicationForm: "delta",
        publicationCause: "steady-state",
        regionRevision: 1,
        deliverySequence: 1,
        payload: {
          page: {
            pageKey: `${owner.ownerKey}\ntail:80`,
            startCursor: 0,
            limit: 80,
            totalVisibleItemCount: 1,
            previousCursor: null,
            nextCursor: null,
            sourceEventSeq: 2,
          },
          baseTranscriptRevision: 0,
          transcriptRevision: 1,
          mutations: [{ op: "append_text", itemId: "message-1", text: "!" }],
        },
      });
      assert.deepEqual(acknowledgements.at(-1), {
        publicationId: `${owner.source}-render-failure`,
        stage: "render-complete",
        outcome: "rejected",
        reason: "render-failed",
      });
      assert.equal(browserTranscript(snapshot).page.items[0].text, "hello");
    }
  });

  it("does not commit transcript continuity until rendering succeeds", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;
    const owner = createAcpChatWorkspaceOwner("backend", "conversation");
    let snapshot: any = browserSnapshot(
      createReadyTranscriptRegion(owner, page(owner.ownerKey), 0),
    );
    let renderAttempt = 0;
    const client = api.createClient({
      source: owner.source,
      getSnapshot: () => snapshot,
      setSnapshot: (next: unknown) => {
        snapshot = next;
      },
      getOwnerKey: () => owner.ownerKey,
      ack: () => undefined,
      render: () => {
        renderAttempt += 1;
        return renderAttempt > 1;
      },
    });
    const publication = (publicationId: string, deliverySequence: number) => ({
      schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
      publicationId,
      owner,
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      regionRevision: deliverySequence,
      deliverySequence,
      payload: {
        page: {
          ...page(owner.ownerKey),
          sourceEventSeq: deliverySequence + 1,
        },
        baseTranscriptRevision: 0,
        transcriptRevision: 1,
        mutations: [{ op: "append_text", itemId: "message-1", text: " world" }],
      },
    });

    client.apply(publication("render-fails", 1));
    assert.equal(browserTranscript(snapshot).transcriptRevision, 0);
    assert.equal(browserTranscript(snapshot).page.items[0].text, "hello");

    client.apply(publication("render-succeeds", 2));
    assert.equal(browserTranscript(snapshot).transcriptRevision, 1);
    assert.equal(browserTranscript(snapshot).page.items[0].text, "hello world");
  });

  it("never turns a failed steady structural effect into a snapshot render", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantWorkspaceAcpSurface;

    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      const region = createReadyTranscriptRegion(
        owner,
        page(owner.ownerKey),
        1,
      );
      let snapshotRenders = 0;
      const rendered = api.renderResult(
        {
          publicationKind: "transcript",
          snapshot: browserSnapshot(region),
          effect: {
            kind: "mutations",
            onSelectedPage: true,
            mutations: [
              {
                op: "upsert_item",
                item: {
                  ...page(owner.ownerKey).items[0],
                  itemId: "message-2",
                },
              },
            ],
            affectedItems: [],
            pageItems: page(owner.ownerKey).items,
            evictedItemIds: [],
          },
        },
        {
          source: owner.source,
          getOwnerKey: () => owner.ownerKey,
          transcriptRenderer: {
            applyAssistantTranscriptEffects: () => false,
          },
          transcriptContainer: {},
          rowNodesByKey: new Map(),
          renderSnapshot: () => {
            snapshotRenders += 1;
            return true;
          },
        },
      );

      assert.isFalse(rendered);
      assert.equal(snapshotRenders, 0);
    }
  });

  it("contains no old transcript field vocabulary in Workspace production paths", async function () {
    for (const relativePath of productionVocabularyFiles) {
      const source = await readFile(relativePath, "utf8");
      for (const forbidden of [
        "selectedTranscript",
        "selectedTranscriptPage",
        "transcriptState",
        "totalItemCount",
        "baseUiRevision",
        "uiRevision",
        "AssistantTranscriptPublication",
        "assistant-transcript-publication",
      ]) {
        assert.notInclude(source, forbidden, `${relativePath}: ${forbidden}`);
      }
    }
  });

  it("keeps steady adapters free of full panel and frontend materialization", async function () {
    const chatSurface = await readFile(
      "src/modules/acpChatWorkspaceSurface.ts",
      "utf8",
    );
    const skillsSurface = await readFile(
      "src/modules/acpSkillsWorkspaceSurface.ts",
      "utf8",
    );
    for (const surface of [chatSurface, skillsSurface]) {
      assert.notInclude(surface, "prepareAcpChatPanelSnapshot(");
      assert.notInclude(surface, "getAcpFrontendSnapshot(");
      assert.notInclude(surface, "prepareAcpSkillRunPanelSnapshot(");
    }

    assert.notInclude(chatSurface, "prepareAcpChatPanelPublicationDto");
    assert.include(chatSurface, "readAcpChatWorkspacePublication");
    assert.include(chatSurface, "getAcpConversationUiSnapshot(");

    const coordinator = await readFile(
      "src/modules/assistantWorkspacePublicationCoordinator.ts",
      "utf8",
    );
    assert.notInclude(coordinator, "diffTranscriptPages");
    assert.notInclude(coordinator, "publishTranscriptPage(");

    const host = await readFile(
      "src/modules/assistantWorkspaceSidebar.ts",
      "utf8",
    );
    const replayPorts = await readFile(
      "src/modules/acpRuntimeReplayProductionPorts.ts",
      "utf8",
    );
    assert.notInclude(host, "getAcpFrontendSnapshot");
    assert.notInclude(replayPorts, "getAcpFrontendSnapshot");
    assert.include(host, "getActiveAcpChatOwner()");
    assert.include(replayPorts, "getActiveAcpChatOwner()");
    const chatSchedule = host.slice(
      host.indexOf("function scheduleAcpChatPublications"),
      host.indexOf("function getActiveAcpChatOwnerKey"),
    );
    const skillsSchedule = host.slice(
      host.indexOf("function scheduleAcpSkillRunPublications"),
      host.indexOf("function queueWorkspacePublications"),
    );
    for (const schedule of [chatSchedule, skillsSchedule]) {
      assert.include(schedule, "scheduleAssistantWorkspaceAcpSurfaceChange({");
      assert.notInclude(schedule, "schedulePostSnapshot(");
      assert.notInclude(schedule, "publishDomainChange({");
    }
    assert.include(host, "ACP_CHAT_WORKSPACE_SURFACE_ADAPTER");
    assert.include(host, "ACP_SKILLS_WORKSPACE_SURFACE_ADAPTER");
  });

  it("keeps one publication FIFO and canonical child state", async function () {
    const shared = await readFile(
      "addon/content/shared/assistant/assistant-workspace-acp-surface.js",
      "utf8",
    );
    assert.include(shared, "function createController(options)");
    assert.include(
      shared,
      "function createPanelPresentation(snapshot, options)",
    );
    assert.include(shared, "createController,");
    assert.include(shared, "createPanelPresentation,");
    assert.include(shared, "pendingPublications.shift()");
    assert.notInclude(shared, "queueSnapshot");
    assert.notInclude(shared, "prepareSnapshot");
    assert.notInclude(shared, "acceptSnapshot");
    assert.notInclude(shared, "function applyRegionPayload");

    for (const relativePath of [
      "addon/content/sidebar/acp-chat.js",
      "addon/content/sidebar/acp-skill-run.js",
    ]) {
      const source = await readFile(relativePath, "utf8");
      for (const duplicateState of [
        "pendingRenderSnapshots",
        "pendingPublications",
        "renderScheduled",
        "publicationClient",
      ]) {
        assert.notInclude(
          source,
          duplicateState,
          `${relativePath}: ${duplicateState}`,
        );
      }
      assert.include(source, "shared.createController({");
      assert.include(source, "shared.createPanelPresentation(snapshot || {},");
      assert.include(source, "function workspacePanelPresentation(snapshot)");
      assert.notInclude(source, "function createAcpChatPanelPresentation");
      assert.notInclude(source, "function createAcpSkillsPanelPresentation");
      assert.notInclude(source, "bindAcpChatPublicationSnapshot");
      assert.notInclude(source, "bindAcpSkillsPublicationSnapshot");
      assert.notInclude(source, "prepareAcpChatSurfaceSnapshot");
      assert.notInclude(source, "prepareAcpSkillsSurfaceSnapshot");
    }
  });

  it("uses one localized surface bootstrap and one shared panel presentation builder", async function () {
    const host = await readFile(
      "src/modules/assistantWorkspaceSidebar.ts",
      "utf8",
    );
    const labels = await readFile(
      "src/modules/assistantWorkspaceAcpSurfaceLabels.ts",
      "utf8",
    );
    const chatReadModel = await readFile(
      "src/modules/acpSidebarModel.ts",
      "utf8",
    );
    const skillsStore = await readFile(
      "src/modules/acpSkillRunStore.ts",
      "utf8",
    );
    const shell = await readFile(
      "addon/content/sidebar/assistant-workspace.js",
      "utf8",
    );
    assert.include(host, "surfaceLabels:");
    assert.include(host, 'buildAssistantWorkspaceAcpSurfaceLabels("acp-chat")');
    assert.include(
      host,
      'buildAssistantWorkspaceAcpSurfaceLabels("acp-skills")',
    );
    assert.include(shell, '"assistant-workspace:surface-bootstrap"');
    assert.include(shell, "labels: state.surfaceLabels[tab] || {}");
    assert.include(labels, "buildAssistantPanelLabels()");
    assert.include(
      chatReadModel,
      'buildAssistantWorkspaceAcpSurfaceLabels("acp-chat")',
    );
    assert.include(
      skillsStore,
      'buildAssistantWorkspaceAcpSurfaceLabels("acp-skills")',
    );
  });
});

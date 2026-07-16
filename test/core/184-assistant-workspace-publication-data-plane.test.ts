import { assert } from "chai";
import { readFile } from "fs/promises";
import {
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  assertAssistantWorkspacePublication,
  createAssistantWorkspaceUnownedScope,
  createAcpChatWorkspaceOwner,
  createAcpSkillsWorkspaceOwner,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
  createReadyTranscriptRegion,
  type AssistantWorkspacePublication,
} from "../../src/modules/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
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
  "addon/content/shared/assistant/assistant-transcript-publication.js",
  "addon/content/sidebar/acp-chat.js",
  "addon/content/sidebar/acp-skill-run.js",
];

function page(ownerKey: string): AssistantWorkspaceTranscriptPage {
  return {
    pageKey: `${ownerKey}\ntail:80`,
    startCursor: 0,
    limit: 80,
    totalItemCount: 1,
    previousCursor: null,
    nextCursor: null,
    eventSeq: 1,
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

describe("Assistant Workspace publication data plane v3", function () {
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
        uiRevision: 7,
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
        payload: { status: "running", busy: true, message: null },
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
    assert.throws(() =>
      assertAssistantWorkspacePublication({
        ...valid,
        owner: createAssistantWorkspaceUnownedScope("acp-skills"),
      }),
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

  it("rebases the owner lane after a child render failure", function () {
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
    assert.equal(posts.length, 2);
    assert.equal(posts[1].publicationForm, "resync-required");
    assert.equal(posts[1].publicationCause, "rebase");
    assert.equal((posts[1].payload as any).reason, "render-failed");
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
      eventSeq: 2,
      totalItemCount: 1,
      visibility: "live",
      events: [
        {
          boundary: "text-continuation",
          mutation: { op: "append_text", itemId: "message-1", text: "!" },
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
    assert.equal((posts[1].payload as any).baseUiRevision, 0);
    assert.equal((posts[1].payload as any).uiRevision, 1);
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
      eventSeq: 2,
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
      eventSeq: 1,
      totalItemCount: 1,
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
        eventSeq: 2,
        totalItemCount: 1,
        visibility: "live",
        events: [
          {
            boundary: "text-continuation",
            mutation: {
              op: "append_text",
              itemId: "message-1",
              text: " world",
            },
          },
          {
            boundary: "hard-boundary",
            mutation: {
              op: "patch_item",
              itemId: "message-1",
              patch: { role: "assistant", status: "complete" },
            },
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

  it("applies owner, revision, and gap rules through one browser receiver", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-transcript-publication.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantTranscriptPublication;
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
        { transcriptRegion: region },
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
      const snapshot = { transcriptRegion: region };
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
              totalItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              eventSeq: 2,
            },
            baseUiRevision: 0,
            uiRevision: 1,
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
              totalItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              eventSeq: 2,
            },
            baseUiRevision: 0,
            uiRevision: 1,
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
      });
      assert.equal(
        applied.snapshot.transcriptRegion.page.items[0].text,
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
              totalItemCount: 1,
              previousCursor: null,
              nextCursor: null,
              eventSeq: 3,
            },
            baseUiRevision: 99,
            uiRevision: 100,
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
        { transcriptRegion: historyRegion },
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
              totalItemCount: 2,
              previousCursor: 0,
              nextCursor: null,
              eventSeq: 4,
            },
            baseUiRevision: 0,
            uiRevision: 1,
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
        offPage.snapshot.transcriptRegion.page.pageKey,
        `${owner.ownerKey}\ncursor:0:80`,
      );
      assert.equal(offPage.snapshot.transcriptRegion.page.items.length, 1);
      assert.equal(offPage.snapshot.transcriptRegion.page.totalItemCount, 2);
    }
  });

  it("reports render failure through the shared child client for both surfaces", async function () {
    const vm = await import("vm");
    const code = await readFile(
      "addon/content/shared/assistant/assistant-transcript-publication.js",
      "utf8",
    );
    const context = { window: {} as Record<string, unknown> };
    vm.runInNewContext(code, context);
    const api = (context.window as any).AssistantTranscriptPublication;
    for (const owner of [
      createAcpChatWorkspaceOwner("backend", "conversation"),
      createAcpSkillsWorkspaceOwner("request"),
    ]) {
      let snapshot: any = {
        transcriptRegion: createReadyTranscriptRegion(
          owner,
          page(owner.ownerKey),
          0,
        ),
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
            totalItemCount: 1,
            previousCursor: null,
            nextCursor: null,
            eventSeq: 2,
          },
          baseUiRevision: 0,
          uiRevision: 1,
          mutations: [{ op: "append_text", itemId: "message-1", text: "!" }],
        },
      });
      assert.deepEqual(acknowledgements.at(-1), {
        publicationId: `${owner.source}-render-failure`,
        stage: "render-complete",
        outcome: "rejected",
        reason: "render-failed",
      });
    }
  });

  it("contains no old transcript field vocabulary in Workspace production paths", async function () {
    for (const relativePath of productionVocabularyFiles) {
      const source = await readFile(relativePath, "utf8");
      for (const forbidden of [
        "selectedTranscript",
        "selectedTranscriptPage",
        "transcriptState",
      ]) {
        assert.notInclude(source, forbidden, `${relativePath}: ${forbidden}`);
      }
    }
  });

  it("keeps steady adapters free of full panel and frontend materialization", async function () {
    const chat = await readFile("src/modules/acpChatPanelReadModel.ts", "utf8");
    const chatAdapter = chat.slice(
      chat.indexOf("export async function prepareAcpChatPanelPublicationDto"),
      chat.indexOf("function normalizedAcpChatPanelChangeKinds"),
    );
    assert.notInclude(chatAdapter, "prepareAcpChatPanelSnapshot(");
    assert.notInclude(chatAdapter, "getAcpFrontendSnapshot(");

    const skills = await readFile(
      "src/modules/acpSkillRunPanelReadModel.ts",
      "utf8",
    );
    assert.notInclude(skills, "prepareAcpSkillRunPanelSnapshot(");

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
    const chatSchedule = host.slice(
      host.indexOf("function scheduleAcpChatPublications"),
      host.indexOf("async function postAcpChatPanelSnapshot"),
    );
    const skillsSchedule = host.slice(
      host.indexOf("function scheduleAcpSkillRunPublications"),
      host.indexOf("function queueWorkspacePublications"),
    );
    for (const schedule of [chatSchedule, skillsSchedule]) {
      assert.notInclude(schedule, "change.transcriptEvents?.length &&");
      assert.include(schedule, 'kind !== "transcript"');
    }
  });
});

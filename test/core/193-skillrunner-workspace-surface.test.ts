import { assert } from "chai";
import {
  attachSkillRunnerSidebarHost,
  detachSkillRunnerSidebarHost,
  dispatchRunWorkspaceAction,
  getSkillRunnerWorkspaceReadModel,
  getSkillRunnerWorkspaceSelectedOwner,
  projectSkillRunnerConversationEntriesToTranscriptItems,
  readSkillRunnerTranscriptRegion,
  refreshSkillRunnerSidebarHostSnapshot,
  subscribeSkillRunnerWorkspaceChanges,
  type SkillRunnerConversationEntry,
} from "../../src/modules/skillRunnerRunDialog";
import {
  mapSkillRunnerChangeToPublicationKinds,
  SKILLRUNNER_WORKSPACE_ADAPTER,
  SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING,
} from "../../src/modules/skillRunnerWorkspaceSurface";
import {
  assertAssistantWorkspacePublication,
  createSkillRunnerWorkspaceOwner,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationKind,
} from "../../src/modules/assistantWorkspacePublication";
import { AssistantWorkspacePublicationCoordinator } from "../../src/modules/assistantWorkspacePublicationCoordinator";
import { AssistantWorkspacePublicationRuntime } from "../../src/modules/assistantWorkspacePublicationRuntime";
import { setAssistantExecutionDisplayMode } from "../../src/modules/assistantExecutionDisplayPolicy";
import {
  attachSkillRunnerRequestId,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import { workflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import { clearPref } from "../../src/utils/prefs";
import {
  startSkillRunnerWorkspaceSnapshotHarness,
  type SkillRunnerWorkspaceSnapshotHarness,
} from "../helpers/skillRunnerWorkspaceSnapshotHarness";

type SkillRunnerOwner = Extract<
  AssistantWorkspaceOwner,
  { source: "skillrunner" }
>;

const OWNER_REGION_KINDS = [
  "owner-control",
  "message-counts",
  "permission",
  "composer",
  "owner-presentation",
  "owner-details",
] as const satisfies readonly Exclude<
  AssistantWorkspacePublicationKind,
  "owner-navigation" | "service-status" | "transcript"
>[];

function conversationEntry(
  partial: Partial<SkillRunnerConversationEntry> &
    Pick<SkillRunnerConversationEntry, "seq" | "role" | "kind" | "text">,
): SkillRunnerConversationEntry {
  return { raw: {}, ...partial };
}

function selectedOwner(): SkillRunnerOwner | null {
  const selected = getSkillRunnerWorkspaceSelectedOwner();
  return selected
    ? createSkillRunnerWorkspaceOwner({
        requestId: selected.requestId || undefined,
        runKey: selected.runKey,
      })
    : null;
}

function createPublicationCapture() {
  const publications: AssistantWorkspacePublication[] = [];
  const coordinator = new AssistantWorkspacePublicationCoordinator({
    scopeKey: "test-193-skillrunner",
    getActiveOwner(source) {
      if (source !== "skillrunner") return null;
      return selectedOwner();
    },
    post(publication) {
      assertAssistantWorkspacePublication(publication);
      publications.push(structuredClone(publication));
      // The child is not wired in Stage 2; acknowledge immediately so the
      // coordinator transcript lane keeps pumping like it would behind a
      // rendering child.
      queueMicrotask(() => {
        coordinator.acknowledge({
          publicationId: publication.publicationId,
          stage: "render-complete",
          outcome: "accepted",
          reason: null,
          failure: null,
        });
      });
      return true;
    },
  });
  const runtime = new AssistantWorkspacePublicationRuntime({
    coordinator,
    activity: () => "matching-target",
  });
  const unsubscribe = subscribeSkillRunnerWorkspaceChanges((change) => {
    runtime.schedule({
      adapter: SKILLRUNNER_WORKSPACE_ADAPTER,
      change,
      context: undefined,
    });
  });
  return { publications, coordinator, runtime, unsubscribe };
}

async function waitForCondition(
  predicate: () => boolean | Promise<boolean>,
  description: string,
  timeoutMs = 8000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function transcriptPublications(publications: AssistantWorkspacePublication[]) {
  return publications.filter(
    (publication) => publication.publicationKind === "transcript",
  );
}

describe("SkillRunner workspace surface (read model + adapter)", function () {
  this.timeout(20000);

  let harness: SkillRunnerWorkspaceSnapshotHarness;
  let hostWindow: Window;

  beforeEach(async function () {
    workflowSubmissionQueue.resetForTests();
    harness = await startSkillRunnerWorkspaceSnapshotHarness();
    hostWindow = {
      addEventListener() {},
      removeEventListener() {},
    } as unknown as Window;
  });

  afterEach(async function () {
    detachSkillRunnerSidebarHost({ hostWindow });
    clearPref("assistantExecutionDisplayMode");
    workflowSubmissionQueue.resetForTests();
    await harness.reset();
  });

  // Attaches the run-level host with a no-op snapshot publisher so the
  // production refresh pipeline runs; assertions never touch the legacy
  // snapshot channel (Stage 2 lands dark next to it).
  async function attachReadModelHost(selectRunKey?: string) {
    attachSkillRunnerSidebarHost({
      hostWindow,
      frameWindow: null,
      isHostAlive: () => true,
      publishSnapshot: () => {},
    });
    await refreshSkillRunnerSidebarHostSnapshot({
      forceInit: true,
      runKey: selectRunKey,
    });
  }

  it("excludes plan and service-status from the supported kinds and maps change kinds", function () {
    assert.notInclude(SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds, "plan");
    assert.notInclude(
      SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds,
      "service-status",
    );
    assert.includeMembers(SKILLRUNNER_WORKSPACE_ADAPTER.supportedKinds, [
      "owner-navigation",
      "owner-control",
      "message-counts",
      "transcript",
      "permission",
      "composer",
      "owner-presentation",
      "owner-details",
    ] as const);
    assert.deepEqual(mapSkillRunnerChangeToPublicationKinds(["transcript"]), [
      "transcript",
    ]);
    assert.includeMembers(mapSkillRunnerChangeToPublicationKinds(["run"]), [
      "owner-control",
      "owner-presentation",
      "permission",
      "composer",
    ]);
    assert.deepEqual(
      SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING.selection,
      ["owner-navigation"],
    );
    assert.deepEqual(SKILLRUNNER_WORKSPACE_CHANGE_PUBLICATION_MAPPING.global, [
      "owner-navigation",
    ]);
  });

  it("projects conversation entries to canonical transcript items", function () {
    const entries: SkillRunnerConversationEntry[] = [
      conversationEntry({
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "calling search tool",
        processType: "tool_call",
        raw: { correlation: { tool_call_id: "tool-1" } },
      }),
      conversationEntry({
        seq: 2,
        role: "assistant",
        kind: "assistant_process",
        text: "thinking about the corpus",
        processType: "reasoning",
      }),
      conversationEntry({
        seq: 3,
        role: "assistant",
        kind: "assistant_process",
        text: "running digest command",
        raw: { correlation: { process_type: "command_execution" } },
      }),
      conversationEntry({
        seq: 4,
        role: "assistant",
        kind: "assistant_message",
        text: "intermediate draft",
        messageId: "msg-1",
        attempt: 1,
      }),
      conversationEntry({
        seq: 5,
        role: "assistant",
        kind: "assistant_final",
        text: "final answer",
        messageId: "msg-1",
        attempt: 1,
      }),
      conversationEntry({
        seq: 6,
        role: "user",
        kind: "interaction_reply",
        text: "user reply text",
      }),
      conversationEntry({
        seq: 7,
        role: "assistant",
        kind: "assistant_revision",
        text: "rejected draft",
        messageId: "msg-2",
        attempt: 2,
      }),
      conversationEntry({
        seq: 8,
        role: "assistant",
        kind: "assistant_final",
        text: "repaired answer",
        messageId: "msg-2",
        attempt: 2,
      }),
    ];
    const items = projectSkillRunnerConversationEntriesToTranscriptItems(
      entries,
      {
        pendingPermission: {
          requestId: "perm-1",
          toolTitle: "Write items",
          summary: "Allow writing 2 items?",
          options: [{ optionId: "allow", name: "Allow" }],
        },
      },
    );
    const kinds = items.map((item) => item.itemKind);
    // The same-chain intermediate (seq 4) is replaced by the final (seq 5).
    assert.deepEqual(kinds, [
      "tool-call",
      "thought",
      "tool-call",
      "message",
      "message",
      "message",
      "permission",
    ]);
    const toolCall = items[0];
    assert.equal(toolCall.itemKind, "tool-call");
    if (toolCall.itemKind === "tool-call") {
      assert.equal(toolCall.toolCallId, "tool-1");
    }
    assert.equal(items[1].itemKind, "thought");
    const finalMessage = items[3];
    assert.equal(finalMessage.itemKind, "message");
    if (finalMessage.itemKind === "message") {
      assert.equal(finalMessage.role, "assistant");
      assert.equal(finalMessage.text, "final answer");
      assert.isNull(finalMessage.revision);
    }
    const userMessage = items[4];
    if (userMessage.itemKind === "message") {
      assert.equal(userMessage.role, "user");
    }
    const repairedFinal = items[5];
    assert.equal(repairedFinal.itemKind, "message");
    if (repairedFinal.itemKind === "message") {
      assert.equal(repairedFinal.text, "repaired answer");
      assert.deepEqual(repairedFinal.revision, {
        count: 1,
        status: "replaced",
        repairRound: 2,
      });
    }
    const permission = items[6];
    assert.equal(permission.itemKind, "permission");
    if (permission.itemKind === "permission") {
      assert.equal(permission.permissionRequestId, "perm-1");
      assert.equal(permission.status, "pending");
    }
  });

  it("publishes owner navigation with backend groups, task cards, and queued entries", async function () {
    const running = harness.seedTask({
      requestId: "req-nav-running",
      status: "waiting_user",
      taskName: "Running Task",
    });
    harness.seedTask({
      requestId: "req-nav-completed",
      status: "succeeded",
      taskName: "Completed Task",
    });
    const local = harness.seedTask({ taskName: "Local Task" });
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    workflowSubmissionQueue.enqueueSubmission({
      backend: {
        backendType: "skillrunner",
        backendId: harness.backendId,
      },
      workflow: {
        workflowId: "literature-digest",
        workflowLabel: "Literature Digest",
      },
      units: ["u1", "u2"].map((unitId, order) => ({
        unit: unitId,
        display: {
          unitId,
          order,
          taskName: `Queued Task ${unitId}`,
          inputUnitIdentity: `test:${unitId}`,
        },
      })),
      maxConcurrency: 1,
      executeUnit: async (unitId) => {
        if (unitId === "u1") await firstGate;
        return { status: "succeeded" };
      },
    });
    try {
      await attachReadModelHost(running.runKey);
      const navigation =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerNavigation();
      assert.equal(
        navigation.selectedOwner?.ownerKey,
        "req-nav-running",
        "request-scoped owner key uses the assigned request id",
      );
      const labels = navigation.entries.map((entry) => entry.label);
      assert.includeMembers(labels, [
        "Running Task",
        "Completed Task",
        "Local Task",
      ]);
      const runningEntry = navigation.entries.find(
        (entry) => entry.label === "Running Task",
      );
      assert.equal(runningEntry?.status, "waiting_user");
      assert.equal(runningEntry?.attention, "waiting_user");
      const completedEntry = navigation.entries.find(
        (entry) => entry.label === "Completed Task",
      );
      assert.equal(completedEntry?.status, "succeeded");
      const localEntry = navigation.entries.find(
        (entry) => entry.label === "Local Task",
      );
      assert.equal(
        localEntry?.owner.ownerKey,
        local.runKey,
        "unassigned local runs keep the run key as owner key",
      );
      assert.isNull(localEntry?.owner.requestId);
      const groupIds = navigation.groups.map((group) => group.groupId);
      assert.include(groupIds, harness.backendId);
      assert.lengthOf(navigation.queuedEntries, 1);
      assert.equal(navigation.queuedEntries[0]?.label, "Queued Task u2");
      assert.isTrue(navigation.queuedEntries[0]?.canCancel);
      assert.isFalse(navigation.canCreateOwner);
    } finally {
      releaseFirst();
    }
  });

  it("projects pending interaction and auth through the shared DTO into owner-control", async function () {
    const interaction = harness.seedTask({
      requestId: "req-interaction",
      status: "waiting_user",
      pending: {
        interaction_id: 7,
        kind: "choose_one",
        prompt: "Pick a digest mode",
        options: [
          { label: "Short", value: "short" },
          { label: "Full", value: "full" },
        ],
      },
    });
    await attachReadModelHost(interaction.runKey);
    await waitForCondition(() => {
      const model = getSkillRunnerWorkspaceReadModel();
      return model?.status === "waiting_user" && !!model.pendingInteraction;
    }, "pending interaction read model");
    const owner = selectedOwner();
    assert.ok(owner);
    const regions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
      owner: owner!,
      kinds: [...OWNER_REGION_KINDS],
      context: undefined,
    });
    const control = regions["owner-control"];
    assert.ok(control);
    assert.equal(control?.status, "waiting_user");
    assert.equal(control?.hint.kind, "waiting_user");
    assert.equal(control?.interaction?.inputKind, "choose_one");
    assert.deepEqual(
      control?.interaction?.options.map((option) => option.label),
      ["Short", "Full"],
    );
    assert.isTrue(control?.execution.canCancel);
    assert.isFalse(control?.authentication.required);
    assert.equal(regions.composer?.reply.status, "enabled");
    assert.isNotNull(regions["message-counts"]?.counts);
    assert.equal(regions["owner-presentation"]?.title, "Harness Task 1");
    assert.equal(regions["owner-details"]?.status, "ready");
    assert.isNull(regions.permission?.request);

    const auth = harness.seedTask({
      requestId: "req-auth",
      status: "waiting_auth",
      pendingAuth: {
        phase: "challenge_active",
        auth_session_id: "sess-auth-1",
        provider_id: "provider-x",
        challenge_kind: "auth_code_or_url",
        accepts_chat_input: true,
        input_kind: "auth_code",
        auth_url: "https://example.com/auth",
        user_code: "UC-123",
      },
    });
    await dispatchRunWorkspaceAction({
      type: "skillrunner-sidebar:action",
      action: "select-task",
      payload: { taskKey: auth.runKey },
    });
    await waitForCondition(() => {
      const model = getSkillRunnerWorkspaceReadModel();
      return (
        model?.runKey === auth.runKey &&
        model.authRequired &&
        !!model.pendingInteraction
      );
    }, "waiting-auth read model with projected auth interaction");
    const authModel = getSkillRunnerWorkspaceReadModel();
    assert.equal(authModel?.status, "waiting_auth");
    assert.ok(
      authModel?.pendingInteraction,
      "auth chat input projects through the shared interaction DTO",
    );
    assert.equal(authModel?.pendingInteraction?.inputKind, "open_text");
    const authRegions = await SKILLRUNNER_WORKSPACE_ADAPTER.readOwnerRegions({
      owner: selectedOwner()!,
      kinds: ["owner-control", "composer"],
      context: undefined,
    });
    assert.equal(authRegions["owner-control"]?.hint.kind, "auth");
    assert.isTrue(authRegions["owner-control"]?.authentication.required);
    assert.equal(authRegions.composer?.reply.status, "enabled");
  });

  it("serves transcript pages from in-memory messages and publishes snapshots only", async function () {
    const seeded = harness.seedTask({
      requestId: "req-transcript",
      status: "waiting_user",
      chatEvents: [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_process",
          text: "calling search tool",
          correlation: { process_type: "tool_call", tool_call_id: "tool-9" },
        },
        {
          seq: 2,
          role: "assistant",
          kind: "assistant_message",
          text: "draft in progress",
          correlation: { message_id: "msg-9" },
        },
      ],
    });
    const capture = createPublicationCapture();
    try {
      await attachReadModelHost(seeded.runKey);
      await capture.runtime.flush();
      const owner = selectedOwner();
      assert.ok(owner);
      // Page-first: the region is ready immediately from the in-memory
      // mirror; the backend history items arrive through the publication
      // clock without the read ever blocking on hydration.
      const firstRead = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: owner!,
        context: undefined,
      });
      assert.equal(firstRead.status, "ready");
      let region = firstRead;
      await waitForCondition(async () => {
        region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: owner!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) => item.itemKind === "tool-call",
        );
      }, "backend history items in transcript page");
      assert.ok(region.page);
      assert.match(region.page?.pageKey || "", /\ntail:\d+$/);
      const pageTexts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" || item.itemKind === "thought"
          ? item.text
          : "",
      );
      // Local submit notices stay in the transcript ahead of backend
      // history, matching the legacy pipeline.
      assert.include(pageTexts, "Task submitted locally.");
      assert.include(pageTexts, "draft in progress");
      const toolCall = region.page?.items.find(
        (item) => item.itemKind === "tool-call",
      );
      assert.ok(toolCall);
      assert.isAbove(region.transcriptRevision, 0);

      // Cursor page reads page the same in-memory mirror.
      const firstPage = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: owner!,
        context: undefined,
        request: { cursor: 0, limit: 1 },
      });
      assert.equal(firstPage.status, "ready");
      assert.lengthOf(firstPage.page?.items || [], 1);
      assert.equal(
        firstPage.page?.totalVisibleItemCount,
        region.page?.totalVisibleItemCount,
      );
      assert.isNotNull(firstPage.page?.nextCursor);

      // Live updates land as steady-state transcript *snapshots*, never
      // incremental mutations (design Decision 2).
      const baselineRevision = region.transcriptRevision;
      const baselinePublications = capture.publications.length;
      harness.appendChatEvents("req-transcript", [
        {
          seq: 3,
          role: "assistant",
          kind: "assistant_final",
          text: "completed digest",
          correlation: { message_id: "msg-9" },
        },
      ]);
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.transcriptRevision > baselineRevision,
          ),
        "steady-state transcript snapshot",
      );
      const appended = transcriptPublications(
        capture.publications.slice(baselinePublications),
      );
      assert.isNotEmpty(appended);
      for (const publication of appended) {
        assert.equal(
          publication.publicationForm,
          "snapshot",
          "SkillRunner transcript publishes snapshots only",
        );
      }
      const latest = appended[appended.length - 1];
      assert.equal(latest.publicationForm, "snapshot");
      if (latest.publicationForm === "snapshot") {
        const messages = (latest.payload.page?.items || []).filter(
          (item) => item.itemKind === "message",
        );
        const texts = messages.map((item) =>
          item.itemKind === "message" ? item.text : "",
        );
        // The final replaces the same-chain intermediate message.
        assert.include(texts, "completed digest");
        assert.notInclude(texts, "draft in progress");
        assert.ok(
          (latest.payload.page?.items || []).some(
            (item) => item.itemKind === "tool-call",
          ),
        );
      }
    } finally {
      capture.unsubscribe();
    }
  });

  it("publishes the owner-first loading sequence on owner switch", async function () {
    const first = harness.seedTask({
      requestId: "req-switch-a",
      status: "waiting_user",
      taskName: "Switch A",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "alpha" },
      ],
    });
    const second = harness.seedTask({
      requestId: "req-switch-b",
      status: "waiting_user",
      taskName: "Switch B",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "beta" },
      ],
    });
    const capture = createPublicationCapture();
    try {
      await attachReadModelHost(first.runKey);
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "initial transcript snapshot",
      );
      capture.publications.length = 0;
      await dispatchRunWorkspaceAction({
        type: "skillrunner-sidebar:action",
        action: "select-task",
        payload: { taskKey: second.runKey },
      });
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready" &&
              publication.owner.ownerKey === "req-switch-b",
          ),
        "switched transcript snapshot",
      );
      const transcripts = transcriptPublications(capture.publications);
      const loadingIndex = transcripts.findIndex(
        (publication) =>
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "loading" &&
          publication.payload.owner?.ownerKey === "req-switch-b",
      );
      const readyIndex = transcripts.findIndex(
        (publication) =>
          publication.publicationForm === "snapshot" &&
          publication.payload.status === "ready" &&
          publication.owner.ownerKey === "req-switch-b",
      );
      assert.isAbove(loadingIndex, -1, "owner switch publishes loading first");
      assert.isAbove(readyIndex, loadingIndex);
    } finally {
      capture.unsubscribe();
    }
  });

  it("holds live transcript updates in boundary mode and republishes once at the boundary", async function () {
    setAssistantExecutionDisplayMode("boundary");
    const seeded = harness.seedTask({
      requestId: "req-boundary",
      status: "running",
      chatEvents: [],
    });
    const capture = createPublicationCapture();
    try {
      await attachReadModelHost(seeded.runKey);
      await capture.runtime.flush();
      await waitForCondition(() => {
        const model = getSkillRunnerWorkspaceReadModel();
        return model?.runKey === seeded.runKey && !model.loading;
      }, "selected run read model settled");
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "initial transcript snapshot",
      );
      // Let the observer's initial critical refresh settle so the baseline is
      // not racing it.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await capture.runtime.flush();
      const baseline = transcriptPublications(capture.publications).length;
      // A tool process event is not a live-publish boundary; in boundary mode
      // the SSE live frame alone must not produce a transcript publication.
      harness.appendChatEvents("req-boundary", [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_process",
          text: "calling search tool",
          correlation: { process_type: "tool_call", tool_call_id: "tool-b" },
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await capture.runtime.flush();
      assert.equal(
        transcriptPublications(capture.publications).length,
        baseline,
        "boundary mode holds back live tool process updates",
      );
      // A message-classified event is a disabled-live boundary: the held tool
      // event rides along in the single republished snapshot (the pending
      // boundary is delivered once, not dropped).
      harness.appendChatEvents("req-boundary", [
        {
          seq: 2,
          role: "assistant",
          kind: "assistant_message",
          text: "boundary draft",
        },
      ]);
      await waitForCondition(
        () => transcriptPublications(capture.publications).length > baseline,
        "boundary transcript republication",
      );
      const boundarySnapshots = transcriptPublications(
        capture.publications,
      ).slice(baseline);
      const latest = boundarySnapshots[boundarySnapshots.length - 1];
      assert.equal(latest.publicationForm, "snapshot");
      if (latest.publicationForm === "snapshot") {
        const items = latest.payload.page?.items || [];
        const texts = items.map((item) =>
          item.itemKind === "message" ? item.text : "",
        );
        assert.include(texts, "boundary draft");
        assert.ok(
          items.some((item) => item.itemKind === "tool-call"),
          "the boundary snapshot carries the held live entries",
        );
        assert.notInclude(
          texts.slice(-1),
          "calling search tool",
          "held tool process stays a tool-call item, not a message",
        );
      }
    } finally {
      capture.unsubscribe();
    }
  });

  it("keeps the transcript publication clock across host detach/reattach", async function () {
    const seeded = harness.seedTask({
      requestId: "req-detach",
      status: "waiting_user",
      chatEvents: [
        { seq: 1, role: "assistant", kind: "assistant_final", text: "stable" },
      ],
    });
    const capture = createPublicationCapture();
    try {
      await attachReadModelHost(seeded.runKey);
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready" &&
              (publication.payload.page?.items || []).some(
                (item) => item.itemKind === "message" && item.text === "stable",
              ),
          ),
        "initial transcript snapshot with backend history",
      );
      const revisionBeforeDetach =
        getSkillRunnerWorkspaceReadModel()?.transcriptRevision || 0;
      assert.isAbove(revisionBeforeDetach, 0);

      detachSkillRunnerSidebarHost({ hostWindow });
      // Reattach the same host window: only host wiring is re-established;
      // the module-level transcript publication clock must survive.
      attachSkillRunnerSidebarHost({
        hostWindow,
        frameWindow: null,
        isHostAlive: () => true,
        publishSnapshot: () => {},
      });
      await refreshSkillRunnerSidebarHostSnapshot({ forceInit: true });
      await capture.runtime.flush();

      const revisionAfterReattach =
        getSkillRunnerWorkspaceReadModel()?.transcriptRevision || 0;
      assert.isAtLeast(
        revisionAfterReattach,
        revisionBeforeDetach,
        "host detach/reattach must not regress the transcript revision",
      );
      const region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      assert.isAtLeast(region.transcriptRevision, revisionBeforeDetach);
      const texts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" ? item.text : "",
      );
      assert.include(texts, "stable");
    } finally {
      capture.unsubscribe();
    }
  });

  it("graduates a local-only run to backend history with an owner switch", async function () {
    const local = harness.seedTask({ taskName: "Local Graduate" });
    const capture = createPublicationCapture();
    try {
      await attachReadModelHost(local.runKey);
      await capture.runtime.flush();
      await waitForCondition(
        () => getSkillRunnerWorkspaceReadModel()?.runKey === local.runKey,
        "local run read model",
      );
      const localOwner = selectedOwner();
      assert.equal(localOwner?.ownerKey, local.runKey);
      const localRegion =
        await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: localOwner!,
          context: undefined,
        });
      assert.equal(localRegion.status, "ready");

      // Late request-id assignment: the owner key flips from run key to
      // request id and the transcript qualifies against backend history
      // instead of the local placeholder (design Decisions 1 and 8).
      harness.registerRunChannel("req-graduate", {
        status: "waiting_user",
        chatEvents: [
          {
            seq: 1,
            role: "assistant",
            kind: "assistant_final",
            text: "backend history body",
          },
        ],
      });
      attachSkillRunnerRequestId({
        runKey: local.runKey,
        requestId: "req-graduate",
        updatedAt: "2026-07-18T00:01:40.000Z",
      });
      updateSkillRunnerRunStateByRunKey({
        runKey: local.runKey,
        state: "request_ready",
        updatedAt: "2026-07-18T00:01:41.000Z",
      });
      updateSkillRunnerRunStateByRunKey({
        runKey: local.runKey,
        state: "waiting_user",
        backendStatus: "waiting_user",
        updatedAt: "2026-07-18T00:01:42.000Z",
      });
      await waitForCondition(
        () => getSkillRunnerWorkspaceReadModel()?.requestId === "req-graduate",
        "request id assignment in read model",
      );
      await waitForCondition(
        () => selectedOwner()?.ownerKey === "req-graduate",
        "owner switch to request-scoped key",
      );
      await capture.runtime.flush();
      await waitForCondition(
        () =>
          transcriptPublications(capture.publications).some(
            (publication) =>
              publication.owner.ownerKey === "req-graduate" &&
              publication.publicationForm === "snapshot" &&
              publication.payload.status === "ready",
          ),
        "graduated transcript snapshot",
      );
      let region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
        owner: selectedOwner()!,
        context: undefined,
      });
      await waitForCondition(async () => {
        region = await SKILLRUNNER_WORKSPACE_ADAPTER.readTranscriptPage({
          owner: selectedOwner()!,
          context: undefined,
        });
        return (region.page?.items || []).some(
          (item) =>
            item.itemKind === "message" && item.text === "backend history body",
        );
      }, "backend history replacing the local placeholder transcript");
      const texts = (region.page?.items || []).map((item) =>
        item.itemKind === "message" ? item.text : "",
      );
      assert.include(texts, "backend history body");
    } finally {
      capture.unsubscribe();
    }
  });
});

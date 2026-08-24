// 本文件是 SkillRunner tab 的端到端行为契约测试，锁定 v1 publication 边界
// （phase 3 Stage 3 之后 SkillRunner tab 由共享 child page 经 publication
// plane 服务）。驱动路径与生产完全一致：
//   seed 真实 run stores + mock 管理端 → attachSkillRunnerSidebarHost（no-op
//   legacy publisher）→ subscribeSkillRunnerWorkspaceChanges →
//   AssistantWorkspacePublicationRuntime.schedule(SKILLRUNNER_WORKSPACE_ADAPTER)
//   → coordinator → 捕获的 publication。
// 每个 publication 在捕获前经过 assertAssistantWorkspacePublication 线契约
// 断言，因此本文件同时锁定 payload 形状与行为语义。
//
// 旧版（legacy snapshot 边界）各层的处置：
//   - 旧 A 层（snapshot 生产契约）：transcript 毕业、detach/reattach 时钟、
//     A→B→A 历史只发一次、reply 后交互替换/live 续流、断线补历史、终态语义、
//     apply 状态轴等端到端语义迁移到本文件的 publication 断言。
//   - boundary 模式滞留/补发、waiting_user/waiting_auth DTO 投影、owner-first
//     loading 序列、本地 run 晚分配 requestId 的毕业：由 193（read model +
//     adapter 层）锁定，本文件不重复。
//   - 旧 B 层（assistantPanelModel.js legacy 分支消费契约 + 字段消耗追踪）：
//     legacy model 分支由 65 锁定，字段消耗清单随 push plane 在 Stage 4 一并
//     删除，不再迁移。
//   - 旧 C 层（run-dialog.html 静态 mount 联动）：run-dialog 页面已不再服
//     务，文件本体在 Stage 4 删除，不再迁移。
//   - reply-run / resolve-permission / cancel-run 等动作的 host 侧路由：现
//     由 assistantWorkspaceSidebar 的 typed registry 处理，registry 条目由
//     184 锁定；本文件锁定 dispatcher 核心路径（select-task / archive-run /
//     交互回复）。
import { assert } from "chai";
import {
  dispatchSkillRunnerWorkspaceAction,
  getSkillRunnerWorkspaceReadModel,
} from "../../src/modules/skillRunnerRunDialog";
import {
  applySkillRunnerRunEvent,
  getSkillRunnerRunRecord,
} from "../../src/modules/skillRunnerRunStore";
import { clearPref, setPref } from "../../src/utils/prefs";
import type { AssistantWorkspacePublication } from "../../src/modules/assistantWorkspacePublication";
import {
  startSkillRunnerWorkspaceSnapshotHarness,
  type SkillRunnerWorkspacePublicationCapture,
  type SkillRunnerWorkspaceSnapshotHarness,
} from "../helpers/skillRunnerWorkspaceSnapshotHarness";

const WAITING_USER_PENDING = {
  interaction_id: 77,
  kind: "choose_one",
  prompt: "Choose the next step",
  options: [
    { label: "Continue analysis", value: "continue_value" },
    { label: "Stop task", value: "stop_value" },
  ],
  ask_user: {
    kind: "choose_one",
    prompt: "Choose the next step",
    options: [
      { label: "Continue analysis", value: "continue_value" },
      { label: "Stop task", value: "stop_value" },
    ],
  },
};

function isTranscriptSnapshot(
  publication: AssistantWorkspacePublication,
  ownerKey?: string,
) {
  return (
    publication.publicationKind === "transcript" &&
    publication.publicationForm === "snapshot" &&
    publication.payload.status === "ready" &&
    (!ownerKey || publication.owner.ownerKey === ownerKey)
  );
}

function transcriptTexts(publication: AssistantWorkspacePublication) {
  if (
    publication.publicationKind !== "transcript" ||
    publication.publicationForm !== "snapshot"
  ) {
    return [];
  }
  return (publication.payload.page?.items || []).map((item) =>
    item.itemKind === "message" || item.itemKind === "thought" ? item.text : "",
  );
}

function transcriptItems(publication: AssistantWorkspacePublication) {
  if (
    publication.publicationKind !== "transcript" ||
    publication.publicationForm !== "snapshot"
  ) {
    return [];
  }
  return publication.payload.page?.items || [];
}

function transcriptRevisionOf(publication: AssistantWorkspacePublication) {
  return publication.publicationKind === "transcript" &&
    publication.publicationForm === "snapshot"
    ? publication.payload.transcriptRevision
    : 0;
}

function countOccurrences(values: string[], target: string) {
  return values.filter((value) => value === target).length;
}

async function waitForCondition(
  predicate: () => boolean,
  description: string,
  timeoutMs = 8000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe("skillrunner workspace publication behavior contract", function () {
  this.timeout(20_000);

  let harness: SkillRunnerWorkspaceSnapshotHarness;
  let capture: SkillRunnerWorkspacePublicationCapture;

  beforeEach(async function () {
    harness = await startSkillRunnerWorkspaceSnapshotHarness();
  });

  afterEach(async function () {
    await harness.reset();
    clearPref("assistantExecutionDisplayMode");
  });

  it("graduates a queued selected run from the local placeholder to live backend history", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const seeded = harness.seedTask({
      taskName: "Live History Catch-up",
      requestId: "req-live-history-catch-up",
      status: "queued",
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    const localOnly = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptItems(publication).length > 0,
      "local placeholder transcript snapshot",
    );
    const localRevision = transcriptRevisionOf(localOnly);
    assert.isAbove(localRevision, 0);
    assert.isFalse(
      transcriptItems(localOnly).some((item) => item.itemKind === "tool-call"),
      "the local placeholder transcript carries no backend tool entries",
    );

    // Backend goes live: the SSE event must graduate the transcript past the
    // local placeholder without any task reselection, and the message counts
    // must advance together with the transcript (a critical refresh must not
    // swallow the live update).
    harness.setBackendStatus(seeded.requestId, "running");
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 1,
        ts: "2026-07-18T00:01:00.000Z",
        role: "assistant",
        kind: "assistant_process",
        text: "reading backend workspace",
        correlation: {
          process_type: "tool_call",
          tool_call_id: "tool-live-history",
        },
      },
    ]);

    const graduated = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptRevisionOf(publication) > localRevision &&
        transcriptItems(publication).some(
          (item) => item.itemKind === "tool-call",
        ),
      "transcript snapshot carrying the backend history",
    );
    assert.isAbove(transcriptRevisionOf(graduated), localRevision);
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "message-counts" &&
        publication.owner.ownerKey === seeded.requestId &&
        publication.payload.counts?.cumulative.tool === 1,
      "message counts advancing with the backend transcript",
    );
    await waitForCondition(
      () => harness.getChatStreamState(seeded.requestId).requestCount >= 1,
      "the selected queued owner attaching its own chat stream",
    );
  });

  it("preserves the publication clock across detach/reattach and catches up history", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const seeded = harness.seedTask({
      taskName: "Same Owner Reactivation",
      requestId: "req-same-owner-reactivation",
      status: "running",
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "before detach",
      },
    ]);
    const beforeDetach = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptTexts(publication).includes("before detach"),
      "transcript snapshot before detach",
    );
    const beforeRevision = transcriptRevisionOf(beforeDetach);

    capture.detachHost();
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "while detached",
        display_text: "while detached",
      },
    ]);
    await capture.reattachHost();

    const reactivated = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptTexts(publication).includes("while detached"),
      "transcript snapshot after reattach",
    );
    assert.isAbove(
      transcriptRevisionOf(reactivated),
      beforeRevision,
      "new history must continue the retained publication clock",
    );
    const texts = transcriptTexts(reactivated);
    assert.equal(countOccurrences(texts, "before detach"), 1);
    assert.equal(countOccurrences(texts, "while detached"), 1);
  });

  it("publishes owner-first selection and replays A's history once on the A to B to A return", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const taskA = harness.seedTask({
      taskName: "Warm Task A",
      requestId: "req-warm-task-a",
      status: "running",
      chatEvents: [
        {
          seq: 1,
          role: "assistant",
          kind: "assistant_process",
          text: "A before switch",
        },
      ],
    });
    const taskB = harness.seedTask({
      taskName: "Warm Task B",
      requestId: "req-warm-task-b",
      status: "running",
    });
    capture = await harness.attachPublications({
      selectRunKey: taskA.runKey,
    });
    const firstA = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, taskA.requestId) &&
        transcriptTexts(publication).includes("A before switch"),
      "initial transcript snapshot for A",
    );
    const firstARevision = transcriptRevisionOf(firstA);
    const baselineIndex = capture.publications.length;

    // Optimistic selection: the owner-navigation selection must flip to B
    // before B's transcript is ready (owner-first, never gated on history).
    await dispatchSkillRunnerWorkspaceAction({
      action: "select-task",
      payload: { taskKey: taskB.runKey },
    });
    await capture.waitFor(
      (publication) => isTranscriptSnapshot(publication, taskB.requestId),
      "ready transcript snapshot for B",
    );
    const later = capture.publications.slice(baselineIndex);
    const navigationIndex = later.findIndex(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.selectedOwner?.ownerKey === taskB.requestId,
    );
    const transcriptIndex = later.findIndex((publication) =>
      isTranscriptSnapshot(publication, taskB.requestId),
    );
    assert.isAbove(navigationIndex, -1, "selection publishes optimistically");
    assert.isAbove(transcriptIndex, -1);
    assert.isBelow(
      navigationIndex,
      transcriptIndex,
      "the selection publication must land before the transcript is ready",
    );

    await waitForCondition(
      () => harness.getChatStreamState(taskA.requestId).openCount === 1,
      "warm A observer",
    );
    harness.appendChatEvents(taskA.requestId, [
      {
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "A while B selected",
        display_text: "A while B selected",
      },
    ]);

    await dispatchSkillRunnerWorkspaceAction({
      action: "select-task",
      payload: { taskKey: taskA.runKey },
    });
    const returnedA = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, taskA.requestId) &&
        transcriptTexts(publication).includes("A while B selected"),
      "transcript snapshot for the returned A",
    );
    const texts = transcriptTexts(returnedA);
    assert.equal(
      countOccurrences(texts, "A before switch"),
      1,
      "A's earlier history must be published exactly once",
    );
    assert.equal(countOccurrences(texts, "A while B selected"), 1);
    assert.isAbove(transcriptRevisionOf(returnedA), firstARevision);
    assert.equal(
      harness.getChatStreamState(taskA.requestId).requestCount,
      1,
      "the warm A observer must continue rather than restart its cursor",
    );
  });

  it("publishes terminal owner-control and composer semantics for a finished run", async function () {
    const seeded = harness.seedTask({
      taskName: "Finished Task",
      requestId: "req-terminal-1",
      status: "succeeded",
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    const control = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.owner.ownerKey === seeded.requestId &&
        publication.payload.status === "succeeded",
      "terminal owner-control publication",
    );
    if (control.publicationKind !== "owner-control") {
      assert.fail("expected an owner-control publication");
    }
    assert.equal(control.payload.hint.kind, "completed");
    assert.isFalse(control.payload.execution.canCancel);
    assert.isFalse(control.payload.authentication.required);

    const composer = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "composer" &&
        publication.owner.ownerKey === seeded.requestId,
      "terminal composer publication",
    );
    if (composer.publicationKind !== "composer") {
      assert.fail("expected a composer publication");
    }
    assert.equal(composer.payload.reply.status, "disabled");
  });

  it("replaces the replied interaction when the backend publishes the next one", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const seeded = harness.seedTask({
      taskName: "Next Waiting Interaction",
      requestId: "req-next-waiting-interaction",
      status: "waiting_user",
      pending: WAITING_USER_PENDING,
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.payload.interaction?.inputKind === "choose_one",
      "waiting_user owner-control publication",
    );

    // The typed registry action the shared child sends for an option click.
    await dispatchSkillRunnerWorkspaceAction({
      action: "select-interaction-option",
      payload: {
        responseValue: "continue_value",
        responseLabel: "Continue analysis",
      },
    });
    await waitForCondition(
      () => harness.getChatStreamState(seeded.requestId).openCount === 1,
      "rearmed live stream",
    );
    harness.setPendingInteraction(seeded.requestId, {
      interaction_id: 78,
      kind: "open_text",
      prompt: "Provide another value",
    });
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 1,
        type: "interaction.pending.created",
        role: "system",
        kind: "unknown",
        text: "next interaction",
      },
    ]);

    const nextWaiting = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.payload.interaction?.inputKind === "open_text" &&
        publication.payload.interaction.options.length === 0,
      "owner-control publication with the next interaction",
    );
    if (nextWaiting.publicationKind !== "owner-control") {
      assert.fail("expected an owner-control publication");
    }
    assert.equal(nextWaiting.payload.status, "waiting_user");
    assert.equal(nextWaiting.payload.hint.kind, "waiting_user");
  });

  it("keeps publishing live transcript updates after an interaction reply", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const seeded = harness.seedTask({
      taskName: "Waiting Reply Rearm",
      requestId: "req-waiting-reply-rearm",
      status: "waiting_user",
      pending: WAITING_USER_PENDING,
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    const waiting = await capture.waitFor(
      (publication) => isTranscriptSnapshot(publication, seeded.requestId),
      "waiting transcript snapshot",
    );
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.payload.interaction?.inputKind === "choose_one",
      "waiting_user owner-control publication",
    );
    const beforeRevision = transcriptRevisionOf(waiting);

    await dispatchSkillRunnerWorkspaceAction({
      action: "select-interaction-option",
      payload: {
        responseValue: "continue_value",
        responseLabel: "Continue analysis",
      },
    });
    // The management endpoint still reports the answered waiting interaction
    // while the backend goes live again.
    harness.setBackendStatus(seeded.requestId, "running");
    await waitForCondition(
      () => harness.getChatStreamState(seeded.requestId).openCount === 1,
      "rearmed live stream",
    );
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 1,
        ts: "2026-07-18T00:04:00.000Z",
        role: "assistant",
        kind: "assistant_final",
        text: "continued after reply",
        display_text: "continued after reply",
      },
    ]);

    const continued = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptTexts(publication).includes("continued after reply"),
      "transcript snapshot after the reply",
    );
    assert.isAbove(transcriptRevisionOf(continued), beforeRevision);
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.owner.ownerKey === seeded.requestId &&
        publication.payload.status !== "waiting_user",
      "owner-control leaving waiting_user",
    );
  });

  it("catches up the disconnect window without duplicating history", async function () {
    setPref("assistantExecutionDisplayMode", "live");
    const seeded = harness.seedTask({
      taskName: "Reconnect Catch-up",
      requestId: "req-reconnect-catch-up",
      status: "running",
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    await waitForCondition(
      () => harness.getChatStreamState(seeded.requestId).openCount === 1,
      "live stream attached",
    );
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 1,
        role: "assistant",
        kind: "assistant_process",
        text: "before disconnect",
      },
    ]);
    await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptTexts(publication).includes("before disconnect"),
      "transcript snapshot before disconnect",
    );

    harness.closeChatStreams(seeded.requestId);
    harness.appendChatEvents(seeded.requestId, [
      {
        seq: 2,
        role: "assistant",
        kind: "assistant_final",
        text: "during disconnect",
        display_text: "during disconnect",
      },
    ]);
    const converged = await capture.waitFor(
      (publication) =>
        isTranscriptSnapshot(publication, seeded.requestId) &&
        transcriptTexts(publication).includes("during disconnect"),
      "transcript snapshot after reconnect",
    );
    const texts = transcriptTexts(converged);
    assert.equal(countOccurrences(texts, "before disconnect"), 1);
    assert.equal(countOccurrences(texts, "during disconnect"), 1);
  });

  it("preserves persisted status axes in owner-navigation across selection changes", async function () {
    const applied = harness.seedTask({
      taskName: "Applied Task",
      requestId: "req-card-applied",
      status: "succeeded",
    });
    const skipped = harness.seedTask({
      taskName: "Skipped Task",
      requestId: "req-card-skipped",
      status: "succeeded",
    });
    const applyFailed = harness.seedTask({
      taskName: "Apply Failed Task",
      requestId: "req-card-apply-failed",
      status: "succeeded",
    });
    const notRequired = harness.seedTask({
      taskName: "Not Required Task",
      requestId: "req-card-not-required",
      status: "succeeded",
    });
    applySkillRunnerRunEvent({
      type: "apply.succeeded",
      backendId: harness.backendId,
      requestId: applied.requestId,
      attempt: 1,
      updatedAt: "2026-07-18T00:01:01.000Z",
    });
    applySkillRunnerRunEvent({
      type: "apply.skipped",
      backendId: harness.backendId,
      requestId: skipped.requestId,
      attempt: 1,
      updatedAt: "2026-07-18T00:01:02.000Z",
    });
    applySkillRunnerRunEvent({
      type: "apply.failed",
      backendId: harness.backendId,
      requestId: applyFailed.requestId,
      attempt: 2,
      nextRetryAt: "2026-07-18T00:03:03.000Z",
      error: "apply write failed",
      updatedAt: "2026-07-18T00:01:03.000Z",
    });

    capture = await harness.attachPublications({
      selectRunKey: applied.runKey,
    });
    const entryByRunKey = (
      publication: AssistantWorkspacePublication,
      runKey: string,
    ) =>
      publication.publicationKind === "owner-navigation"
        ? publication.payload.entries.find(
            (entry) => entry.owner.runKey === runKey,
          )
        : undefined;
    const assertStatusAxes = (publication: AssistantWorkspacePublication) => {
      assert.deepInclude(entryByRunKey(publication, applied.runKey), {
        status: "succeeded",
        backendStatus: "succeeded",
        applyState: "succeeded",
      });
      assert.deepInclude(entryByRunKey(publication, skipped.runKey), {
        status: "succeeded",
        backendStatus: "succeeded",
        applyState: "skipped",
      });
      assert.deepInclude(entryByRunKey(publication, applyFailed.runKey), {
        status: "failed",
        backendStatus: "succeeded",
        applyState: "failed",
        description: "apply write failed",
      });
      assert.deepInclude(entryByRunKey(publication, notRequired.runKey), {
        status: "succeeded",
        backendStatus: "succeeded",
        applyState: "idle",
      });
    };

    const initial = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.selectedOwner?.runKey === applied.runKey &&
        publication.payload.entries.length === 4,
      "owner-navigation publication with all task cards",
    );
    assertStatusAxes(initial);
    assert.isNull(
      initial.publicationKind === "owner-navigation"
        ? initial.payload.notice
        : null,
      "no truncation notice while the panel history fits the limit",
    );

    await dispatchSkillRunnerWorkspaceAction({
      action: "select-task",
      payload: { taskKey: skipped.runKey },
    });
    const reselected = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.selectedOwner?.runKey === skipped.runKey &&
        publication.payload.entries.length === 4,
      "owner-navigation publication after reselection",
    );
    assertStatusAxes(reselected);
  });

  it("caps owner-navigation at the panel history limit and publishes the truncation notice", async function () {
    const seeds = Array.from({ length: 105 }, (_, index) =>
      harness.seedTask({
        taskName: `History Task ${index + 1}`,
        status: "succeeded",
      }),
    );
    capture = await harness.attachPublications({
      selectRunKey: seeds[seeds.length - 1].runKey,
    });
    const navigation = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.entries.length >= 100,
      "owner-navigation publication at the history limit",
    );
    if (navigation.publicationKind !== "owner-navigation") {
      assert.fail("expected an owner-navigation publication");
    }
    assert.isAtMost(
      navigation.payload.entries.length,
      101,
      "the panel history limit caps the published task cards (plus the selected exact row)",
    );
    assert.isOk(
      navigation.payload.notice,
      "a truncated panel history must publish the truncation notice",
    );
  });

  it("archives a run through the typed dispatcher and republishes navigation", async function () {
    const first = harness.seedTask({
      taskName: "Action Task A",
      requestId: "req-action-a",
      status: "succeeded",
    });
    const second = harness.seedTask({
      taskName: "Action Task B",
      requestId: "req-action-b",
      status: "succeeded",
    });
    capture = await harness.attachPublications({
      selectRunKey: first.runKey,
    });
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.entries.length === 2,
      "owner-navigation publication with both tasks",
    );

    await dispatchSkillRunnerWorkspaceAction({
      action: "archive-run",
      payload: { runKey: second.runKey },
    });
    assert.isOk(
      getSkillRunnerRunRecord(second.runKey)?.archivedAt,
      "archive-run must mark the run record archived",
    );
    await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-navigation" &&
        publication.payload.entries.every(
          (entry) => entry.owner.runKey !== second.runKey,
        ) &&
        publication.payload.entries.length === 1,
      "owner-navigation publication without the archived task",
    );
  });

  it("publishes the waiting_auth challenge through owner-control", async function () {
    const seeded = harness.seedTask({
      taskName: "Auth Task",
      requestId: "req-auth-1",
      status: "waiting_auth",
      pendingAuth: {
        phase: "challenge_active",
        auth_session_id: "sess-auth-1",
        engine: "opencode",
        provider_id: "openai",
        prompt: "Provide the authorization code",
        challenge_kind: "auth_code_or_url",
        accepts_chat_input: true,
        input_kind: "auth_code_or_url",
        auth_url: "https://auth.example/device",
        user_code: "ABCDE",
      },
      authSession: {
        request_id: "req-auth-1",
        auth_session_id: "sess-auth-1",
        status: "waiting_auth",
        phase: "challenge_active",
        challenge_kind: "auth_code_or_url",
      },
    });
    capture = await harness.attachPublications({
      selectRunKey: seeded.runKey,
    });
    const control = await capture.waitFor(
      (publication) =>
        publication.publicationKind === "owner-control" &&
        publication.owner.ownerKey === seeded.requestId &&
        publication.payload.status === "waiting_auth" &&
        publication.payload.interaction?.auth?.phase === "challenge_active",
      "waiting_auth owner-control publication",
    );
    if (control.publicationKind !== "owner-control") {
      assert.fail("expected an owner-control publication");
    }
    assert.equal(control.payload.hint.kind, "auth");
    assert.isTrue(control.payload.authentication.required);
    const auth = control.payload.interaction?.auth;
    assert.isOk(auth, "waiting_auth carries the auth suite on the shared DTO");
    assert.equal(auth?.phase, "challenge_active");
    assert.equal(auth?.authUrl, "https://auth.example/device");
    assert.equal(auth?.userCode, "ABCDE");
    assert.isTrue(auth?.acceptsChatInput);
    assert.equal(getSkillRunnerWorkspaceReadModel()?.status, "waiting_auth");
  });
});

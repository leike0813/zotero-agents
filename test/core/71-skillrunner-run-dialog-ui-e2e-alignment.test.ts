// 本文件采用行为级契约测试（不再是源码文本正则匹配），分三层：
//   A 层（snapshot 生产契约）：走真实生产路径 attachSkillRunnerSidebarHost →
//     refreshSkillRunnerSidebarHostSnapshot → pushSnapshot，捕获注入的
//     publishSnapshot 拿到的生产真快照，断言其语义字段。
//   B 层（JS 消费契约）：进程内 import 真实 assistantPanelModel.js（迁移到
//     src/sidebar/ 的 ES module），用 A 层
//     真快照驱动 projectSkillRunnerPanelSnapshot；并用递归 Proxy 记录投影的
//     全部属性读取路径，双向断言“幻影读取”与“关键字段必达”。
//   C 层（静态资源联动）：run-dialog.html 的 mount id 与 runDialog.js 实际
//     getElementById 查找键联动断言，并保留共享资源引用存在性断言。
//
// 旧版文本断言的处置（删除理由）：
//   - 旧 it1（host 侧 getRun 轮询收敛、abortCurrentChatStream 文本）：可行为化
//     核心已由 65（pending/状态归一化）、83（waiting_auth observer 决策）、
//     84-skillrunner-run-state-projection（状态投影语义）覆盖；A 层改用真实
//     管理响应走同一 syncRunMeta/syncPendingState 路径验证快照语义。
//   - 旧 it2（六区 scaffold HTML/JS 文本）→ C 层 mount id 联动 + 资源引用断言。
//   - 旧 it3（model/renderer 函数名文本）→ B 层真实投影行为 + 字段消费清单。
//   - 旧 it4（sendAction 文本）→ A 层 action 分发闭环（真实 dispatch）。
//   - 旧 it5（auth import 文件处理文本）：页面本地文件读取的可行为核心
//     （必填文件校验）已由 83 的 validateRunDialogAuthImportFiles 覆盖。
//   - 旧 it6（transcript renderer/thinking core 文本）：display_text 优先语义
//     已由 65（toRunDialogConversationEntry）与 84-skillrunner-chat-thinking-core
//     （真实加载 chatThinkingCore.js 的行为测试）覆盖；tool/revision 投影由
//     B 层投影产物结构断言覆盖。
//   - 旧 it7（纯 CSS 文本断言）：删除；CSS 选择器行为化收益低，共享 CSS 引用
//     存在性保留在 C 层。
//   - 旧 it8（host 侧 sync 语义文本）：同旧 it1，由 65/83/84 与 A 层行为覆盖。
import { assert } from "chai";
import * as AssistantPanelModel from "../../src/sidebar/assistantPanelModel.js";
import { adaptLegacyTranscriptItem } from "../../src/sidebar/assistantTranscriptRenderer.js";
import {
  getSkillRunnerRunRecord,
  updateSkillRunnerRunApplyState,
} from "../../src/modules/skillRunnerRunStore";
import { clearPref, setPref } from "../../src/utils/prefs";
import {
  SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS,
  SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS,
} from "../../src/shared/skillRunnerSnapshotContract";
import {
  captureSkillRunnerWorkspaceEnvelope,
  startSkillRunnerWorkspaceSnapshotHarness,
} from "../helpers/skillRunnerWorkspaceSnapshotHarness";
import {
  getProjectRoot,
  joinPath,
  readUtf8,
} from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

async function loadPanelModel() {
  return AssistantPanelModel;
}

type SnapshotConsumption = {
  proxied: unknown;
  consumedPaths: Set<string>;
  phantomPaths: Set<string>;
  producedPaths: Set<string>;
};

/**
 * Wrap a real production snapshot in a recursive Proxy that records every
 * property get path during the panel projection. `phantomPaths` are gets for
 * keys that do not exist on the real snapshot (defensive alias sniffing);
 * `producedPaths` is the full recursive key inventory of the real snapshot.
 */
function trackSnapshotConsumption(snapshot: unknown): SnapshotConsumption {
  const consumedPaths = new Set<string>();
  const phantomPaths = new Set<string>();
  const producedPaths = new Set<string>();
  enumerateProduced(snapshot, "");
  const proxied = wrap(snapshot, "");
  return { proxied, consumedPaths, phantomPaths, producedPaths };

  function childPath(base: string, key: string, parentIsArray: boolean) {
    if (parentIsArray) {
      return `${base}[]`;
    }
    return base ? `${base}.${key}` : key;
  }

  function enumerateProduced(value: unknown, path: string) {
    if (!value || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        enumerateProduced(entry, `${path}[]`);
      }
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      producedPaths.add(nextPath);
      enumerateProduced(entry, nextPath);
    }
  }

  function wrap(value: unknown, path: string): unknown {
    if (!value || typeof value !== "object") {
      return value;
    }
    const target = value as Record<string | symbol, unknown>;
    return new Proxy(target, {
      get(obj, key) {
        if (typeof key !== "string") {
          return Reflect.get(obj, key);
        }
        const nextPath = childPath(path, key, Array.isArray(obj));
        consumedPaths.add(nextPath);
        if (!Reflect.has(obj, key)) {
          phantomPaths.add(nextPath);
        }
        return wrap(Reflect.get(obj, key), nextPath);
      },
    });
  }
}

function unionPaths(...sets: Array<Set<string>>) {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const path of set) {
      merged.add(path);
    }
  }
  return merged;
}

function sortedPaths(paths: Set<string>) {
  return [...paths].sort();
}

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

const WAITING_AUTH_PENDING = {
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
  available_methods: ["auth_code_or_url", "api_key"],
  ask_user: {
    kind: "open_text",
    prompt: "Provide the authorization code",
    hint: "Paste the code from your browser",
  },
};

describe("skillrunner run dialog ui behavior contract", function () {
  this.timeout(20_000);

  describe("layer A: snapshot production contract", function () {
    it("attaches a queued selected run and publishes its first live SSE event without task reselection", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Live History Catch-up",
          requestId: "req-live-history-catch-up",
          status: "queued",
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const localOnly = await capture.waitFor(
          (snapshot) =>
            snapshot.session?.loading === false &&
            snapshot.session.messages.length > 0 &&
            snapshot.session.messages.every((message) => message.seq < 0),
        );
        const localRevision = localOnly.transcriptRevision;
        const afterIndex = capture.snapshots.length - 1;

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

        const affected = await capture.waitForAfter(
          afterIndex,
          (snapshot) => snapshot.messageCounts?.cumulative.tool === 1,
        );
        assert.isTrue(
          affected.snapshot.session?.messages.some(
            (message) => message.seq === 1,
          ),
          "the first snapshot with backend counts must carry the backend transcript",
        );
        assert.isAbove(
          affected.snapshot.transcriptRevision,
          localRevision,
          "the backend transcript must advance the receiver revision",
        );
        assert.isAtLeast(
          harness.getChatStreamState(seeded.requestId).requestCount,
          1,
          "the selected queued owner must attach its own chat stream",
        );
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("preserves transcript revision and catches up history on the first same-owner reattach", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Same Owner Reactivation",
          requestId: "req-same-owner-reactivation",
          status: "running",
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        await capture.waitFor(
          () => harness.getChatStreamState(seeded.requestId).openCount === 1,
        );
        harness.appendChatEvents(seeded.requestId, [
          {
            seq: 1,
            role: "assistant",
            kind: "assistant_process",
            text: "before detach",
          },
        ]);
        const beforeDetach = await capture.waitFor(
          (snapshot) =>
            snapshot.session?.messages.some((message) => message.seq === 1) ===
            true,
        );
        const beforeRevision = beforeDetach.transcriptRevision;
        const afterIndex = capture.snapshots.length - 1;

        capture.detach();
        harness.appendChatEvents(seeded.requestId, [
          {
            seq: 2,
            role: "assistant",
            kind: "assistant_final",
            text: "while detached",
            display_text: "while detached",
          },
        ]);
        await capture.reattach();

        const reactivated = await capture.waitForAfter(
          afterIndex,
          (snapshot) =>
            snapshot.session?.messages.some((message) => message.seq === 2) ===
            true,
        );
        assert.isAbove(
          reactivated.snapshot.transcriptRevision,
          beforeRevision,
          "new history must continue the retained publication clock",
        );
        assert.deepEqual(
          reactivated.snapshot.session?.messages
            .filter((message) => message.seq > 0)
            .map((message) => message.seq),
          [1, 2],
        );
        assert.equal(
          harness.getChatStreamState(seeded.requestId).requestCount,
          1,
          "temporary host detach must retain the foreground history cursor",
        );
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("publishes A history once on the first A to B to A return", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
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
        const capture = await harness.attach({ selectRunKey: taskA.runKey });
        const firstA = await capture.waitFor(
          (snapshot) =>
            snapshot.workspace.selectedTaskKey === taskA.runKey &&
            snapshot.session?.messages.some((message) => message.seq === 1) ===
              true,
        );
        const firstARevision = firstA.transcriptRevision;

        await harness.dispatch("select-task", { taskKey: taskB.runKey });
        await capture.waitFor(
          (snapshot) => snapshot.workspace.selectedTaskKey === taskB.runKey,
        );
        await capture.waitFor(
          () => harness.getChatStreamState(taskA.requestId).openCount === 1,
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
        const afterIndex = capture.snapshots.length - 1;

        await harness.dispatch("select-task", { taskKey: taskA.runKey });
        const returnedA = await capture.waitForAfter(
          afterIndex,
          (snapshot) =>
            snapshot.workspace.selectedTaskKey === taskA.runKey &&
            snapshot.session?.messages.some((message) => message.seq === 2) ===
              true,
        );
        const visibleSequences = returnedA.snapshot.session?.messages
          .filter((message) => message.seq > 0)
          .map((message) => message.seq);
        assert.deepEqual(visibleSequences, [1, 2]);
        assert.equal(new Set(visibleSequences).size, visibleSequences?.length);
        assert.isAbove(returnedA.snapshot.transcriptRevision, firstARevision);
        assert.equal(
          harness.getChatStreamState(taskA.requestId).requestCount,
          1,
          "the warm A observer must continue rather than restart its cursor",
        );
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("holds tool-only history in boundary mode and releases it with the next semantic boundary", async function () {
      setPref("assistantExecutionDisplayMode", "boundary");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Boundary History Catch-up",
          requestId: "req-boundary-history-catch-up",
          status: "running",
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const localOnly = await capture.waitFor(
          (snapshot) =>
            snapshot.session?.loading === false &&
            snapshot.session.messages.length > 0 &&
            snapshot.session.messages.every((message) => message.seq < 0),
        );
        const localRevision = localOnly.transcriptRevision;
        await capture.waitFor(
          () => harness.getChatStreamState(seeded.requestId).openCount === 1,
        );

        harness.appendChatEvents(seeded.requestId, [
          {
            seq: 1,
            ts: "2026-07-18T00:02:00.000Z",
            role: "assistant",
            kind: "assistant_process",
            text: "read papers/a.md",
            correlation: {
              process_type: "tool_call",
              tool_call_id: "tool-boundary-history",
            },
          },
        ]);
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(capture.latest()?.transcriptRevision, localRevision);
        assert.isFalse(
          capture
            .latest()
            ?.session?.messages.some((message) => message.seq === 1),
          "tool-only history remains unpublished until a semantic boundary",
        );

        harness.appendChatEvents(seeded.requestId, [
          {
            seq: 2,
            ts: "2026-07-18T00:02:01.000Z",
            role: "assistant",
            kind: "assistant_final",
            text: "backend result",
            display_text: "backend result",
          },
        ]);
        const afterIndex = capture.snapshots.length - 1;
        const released = await capture.waitForAfter(
          afterIndex,
          (snapshot) => snapshot.messageCounts?.cumulative.assistant === 1,
        );
        assert.includeMembers(
          released.snapshot.session?.messages.map((message) => message.seq) ||
            [],
          [1, 2],
        );
        assert.isAbove(released.snapshot.transcriptRevision, localRevision);
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("rearms the selected live stream after an interaction reply despite a stale waiting response", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Waiting Reply Rearm",
          requestId: "req-waiting-reply-rearm",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const waiting = await capture.waitFor(
          (snapshot) =>
            snapshot.session?.status === "waiting_user" &&
            snapshot.session.pendingInteractionId === 77,
        );
        const interactionId = waiting.session!.pendingInteractionId!;
        const beforeRevision = waiting.transcriptRevision;
        const afterIndex = capture.snapshots.length - 1;

        await harness.dispatch("reply-run", {
          mode: "interaction",
          interactionId,
          responseValue: "continue_value",
        });
        // submitReply returns running while the management endpoint still
        // reports the answered waiting interaction during refreshDisplay.
        harness.setBackendStatus(seeded.requestId, "running");
        await capture.waitFor(
          () => harness.getChatStreamState(seeded.requestId).openCount === 1,
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

        const continued = await capture.waitForAfter(
          afterIndex,
          (snapshot) =>
            snapshot.session?.messages.some((message) => message.seq === 1) ===
            true,
        );
        assert.isAbove(continued.snapshot.transcriptRevision, beforeRevision);
        assert.notEqual(continued.snapshot.session?.status, "waiting_user");
        assert.isAtLeast(
          harness.getChatStreamState(seeded.requestId).requestCount,
          1,
        );
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("catches up the disconnect window and reconnects from the last unique sequence", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Reconnect Catch-up",
          requestId: "req-reconnect-catch-up",
          status: "running",
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        await capture.waitFor(
          () => harness.getChatStreamState(seeded.requestId).openCount === 1,
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
          (snapshot) =>
            snapshot.session?.messages.some((message) => message.seq === 1) ===
            true,
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
          (snapshot) =>
            snapshot.session?.messages.some((message) => message.seq === 2) ===
            true,
        );
        assert.deepEqual(
          converged.session?.messages
            .filter((message) => message.seq > 0)
            .map((message) => message.seq),
          [1, 2],
        );
        await capture.waitFor(
          () =>
            harness.getChatStreamState(seeded.requestId).requestCount >= 2 &&
            harness.getChatStreamState(seeded.requestId).openCount === 1,
        );
        const streamState = harness.getChatStreamState(seeded.requestId);
        assert.isAtLeast(streamState.requestCount, 2);
        assert.equal(streamState.cursors.at(-1), 2);
        assert.equal(streamState.openCount, 1);
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("replaces the reply handoff guard when the backend publishes a different interaction", async function () {
      setPref("assistantExecutionDisplayMode", "live");
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Next Waiting Interaction",
          requestId: "req-next-waiting-interaction",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        await capture.waitFor(
          (snapshot) => snapshot.session?.pendingInteractionId === 77,
        );

        await harness.dispatch("reply-run", {
          mode: "interaction",
          interactionId: 77,
          responseValue: "continue_value",
        });
        await capture.waitFor(
          () => harness.getChatStreamState(seeded.requestId).openCount === 1,
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
          (snapshot) => snapshot.session?.pendingInteractionId === 78,
        );
        assert.equal(nextWaiting.session?.status, "waiting_user");
        assert.notProperty(
          nextWaiting.session?.pendingInteraction || {},
          "interactionToken",
        );
      } finally {
        await harness.reset();
        clearPref("assistantExecutionDisplayMode");
      }
    });

    it("publishes waiting_user semantics for a selected run", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Waiting Task",
          requestId: "req-waiting-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const snapshot = await capture.waitFor(
          (entry) =>
            !!entry.session &&
            entry.session.loading === false &&
            entry.session.pendingInteractionId === 77,
        );

        assert.isOk(snapshot.session, "expected a selected session snapshot");
        assert.equal(
          snapshot.workspace.selectedTaskKey,
          seeded.runKey,
          "selectedTaskKey must match the seeded run",
        );
        assert.equal(snapshot.session?.status, "waiting_user");
        assert.equal(snapshot.session?.statusSemantics.waiting, true);
        assert.equal(snapshot.session?.statusSemantics.terminal, false);
        assert.equal(snapshot.session?.canReply, true);
        assert.isOk(
          String(snapshot.labels.title || "").trim(),
          "labels.title must be produced",
        );
        assert.isOk(
          String(snapshot.labels.emptyTasks || "").trim(),
          "labels.emptyTasks must be produced",
        );
      } finally {
        await harness.reset();
      }
    });

    it("publishes terminal semantics for a finished run", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Finished Task",
          requestId: "req-terminal-1",
          status: "succeeded",
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const snapshot = await capture.waitFor(
          (entry) =>
            !!entry.session &&
            entry.session.loading === false &&
            entry.session.historyLoading === false,
        );

        assert.isOk(snapshot.session, "expected a selected session snapshot");
        assert.equal(snapshot.workspace.selectedTaskKey, seeded.runKey);
        assert.equal(snapshot.session?.status, "succeeded");
        assert.equal(snapshot.session?.statusSemantics.terminal, true);
        assert.equal(snapshot.session?.statusSemantics.waiting, false);
        assert.equal(snapshot.session?.canCancelBackendRun, false);
      } finally {
        await harness.reset();
      }
    });

    it("preserves persisted status axes for selected and unselected task cards", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
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
        updateSkillRunnerRunApplyState({
          backendId: harness.backendId,
          requestId: applied.requestId,
          state: "succeeded",
          attempt: 1,
          updatedAt: "2026-07-18T00:01:01.000Z",
        });
        updateSkillRunnerRunApplyState({
          backendId: harness.backendId,
          requestId: skipped.requestId,
          state: "skipped",
          attempt: 1,
          updatedAt: "2026-07-18T00:01:02.000Z",
        });
        updateSkillRunnerRunApplyState({
          backendId: harness.backendId,
          requestId: applyFailed.requestId,
          state: "failed",
          attempt: 2,
          nextRetryAt: "2026-07-18T00:03:03.000Z",
          error: "apply write failed",
          updatedAt: "2026-07-18T00:01:03.000Z",
        });

        const capture = await harness.attach({
          selectRunKey: applied.runKey,
        });
        const taskByKey = (snapshot: any, runKey: string) =>
          snapshot.workspace.groups
            .flatMap((group: any) => [
              ...group.activeTasks,
              ...group.finishedTasks,
            ])
            .find((task: any) => task.key === runKey);
        const assertStatusAxes = (snapshot: any) => {
          assert.deepInclude(taskByKey(snapshot, applied.runKey), {
            status: "succeeded",
            backendStatus: "succeeded",
            applyState: "succeeded",
          });
          assert.deepInclude(taskByKey(snapshot, skipped.runKey), {
            status: "succeeded",
            backendStatus: "succeeded",
            applyState: "skipped",
          });
          assert.deepInclude(taskByKey(snapshot, applyFailed.runKey), {
            status: "failed",
            backendStatus: "succeeded",
            applyState: "failed",
            applyError: "apply write failed",
            applyNextRetryAt: "2026-07-18T00:03:03.000Z",
          });
          assert.deepInclude(taskByKey(snapshot, notRequired.runKey), {
            status: "succeeded",
            backendStatus: "succeeded",
            applyState: "idle",
          });
        };

        let snapshot = await capture.waitFor(
          (entry) =>
            entry.workspace.selectedTaskKey === applied.runKey &&
            entry.workspace.groups.reduce(
              (count, group) =>
                count + group.activeTasks.length + group.finishedTasks.length,
              0,
            ) === 4,
        );
        assertStatusAxes(snapshot);

        for (const runKey of [skipped.runKey, applyFailed.runKey]) {
          const afterIndex = capture.snapshots.length - 1;
          await harness.dispatch("select-task", { taskKey: runKey });
          snapshot = (
            await capture.waitForAfter(
              afterIndex,
              (entry) => entry.workspace.selectedTaskKey === runKey,
            )
          ).snapshot;
          assertStatusAxes(snapshot);
        }
      } finally {
        await harness.reset();
      }
    });

    it("passes pending interaction fields through to the session snapshot", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Interaction Task",
          requestId: "req-interaction-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const snapshot = await capture.waitFor(
          (entry) =>
            !!entry.session &&
            entry.session.loading === false &&
            entry.session.pendingInteractionId === 77,
        );

        assert.equal(snapshot.session?.pendingInteractionId, 77);
        assert.equal(snapshot.session?.pendingKind, "choose_one");
        assert.equal(snapshot.session?.pendingPrompt, "Choose the next step");
        assert.deepEqual(snapshot.session?.pendingOptions, [
          { label: "Continue analysis", value: "continue_value" },
          { label: "Stop task", value: "stop_value" },
        ]);
        assert.deepEqual(snapshot.session?.pendingAskUser, {
          kind: "choose_one",
          prompt: "Choose the next step",
          options: [
            { label: "Continue analysis", value: "continue_value" },
            { label: "Stop task", value: "stop_value" },
          ],
        });
      } finally {
        await harness.reset();
      }
    });

    it("passes pending auth fields through to the session snapshot", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Auth Task",
          requestId: "req-auth-1",
          status: "waiting_auth",
          pendingAuth: WAITING_AUTH_PENDING,
          authSession: {
            request_id: "req-auth-1",
            auth_session_id: "sess-auth-1",
            status: "waiting_auth",
            phase: "challenge_active",
            challenge_kind: "auth_code_or_url",
          },
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const snapshot = await capture.waitFor(
          (entry) =>
            !!entry.session &&
            entry.session.loading === false &&
            entry.session.authPhase === "challenge_active",
        );

        assert.equal(snapshot.session?.status, "waiting_auth");
        assert.equal(snapshot.session?.authPhase, "challenge_active");
        assert.equal(snapshot.session?.authSessionId, "sess-auth-1");
        assert.equal(snapshot.session?.authEngine, "opencode");
        assert.equal(snapshot.session?.authProviderId, "openai");
        assert.equal(snapshot.session?.authInputKind, "auth_code_or_url");
        assert.equal(snapshot.session?.authUrl, "https://auth.example/device");
        assert.equal(snapshot.session?.authUserCode, "ABCDE");
        assert.equal(snapshot.session?.authAcceptsChatInput, true);
        assert.deepEqual(snapshot.session?.authAvailableMethods, [
          "auth_code_or_url",
          "api_key",
        ]);
      } finally {
        await harness.reset();
      }
    });

    it("closes the action dispatch loop for workspace and host actions", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
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
        const hostActions: Array<{
          action: string;
          payload: Record<string, unknown>;
        }> = [];
        const capture = await harness.attach({
          selectRunKey: first.runKey,
          handleHostAction: (envelope) => {
            hostActions.push(envelope);
            return true;
          },
        });
        await capture.waitFor(
          (entry) =>
            entry.workspace.selectedTaskKey === first.runKey && !!entry.session,
        );

        // select-task is handled by the workspace core: observable via the
        // published snapshot, not via handleHostAction.
        await harness.dispatch("select-task", { taskKey: second.runKey });
        const reselected = await capture.waitFor(
          (entry) => entry.workspace.selectedTaskKey === second.runKey,
        );
        assert.equal(reselected.workspace.selectedTaskKey, second.runKey);

        // reply/permission/cancel/drawer actions are routed to the injected
        // host action handler before any entry-level fallback.
        await harness.dispatch("reply-run", {
          mode: "interaction",
          replyText: "continue",
        });
        await harness.dispatch("resolve-permission", {
          permissionRequestId: "perm-1",
          outcome: "selected",
          optionId: "allow",
        });
        await harness.dispatch("cancel-run", {});
        await harness.dispatch("toggle-drawer", {});
        assert.deepEqual(
          hostActions.map((entry) => entry.action),
          ["reply-run", "resolve-permission", "cancel-run", "toggle-drawer"],
        );
        assert.deepEqual(hostActions[0].payload, {
          mode: "interaction",
          replyText: "continue",
        });
        assert.deepEqual(hostActions[1].payload, {
          permissionRequestId: "perm-1",
          outcome: "selected",
          optionId: "allow",
        });

        // archive-run is handled by the workspace core against the run store.
        await harness.dispatch("archive-run", { runKey: second.runKey });
        assert.isOk(
          getSkillRunnerRunRecord(second.runKey)?.archivedAt,
          "archive-run must mark the run record archived",
        );
        const afterArchive = await capture.waitFor(
          (entry) =>
            !entry.workspace.groups.some((group) =>
              [...group.activeTasks, ...group.finishedTasks].some(
                (task) => task.key === second.runKey,
              ),
            ),
        );
        assert.isOk(afterArchive);
      } finally {
        await harness.reset();
      }
    });
  });

  describe("layer B: panel model consumption contract", function () {
    it("projects a real waiting_user snapshot into panel semantics", async function () {
      const snapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Projection Task",
            requestId: "req-projection-1",
            status: "waiting_user",
            pending: WAITING_USER_PENDING,
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.pendingInteractionId === 77,
      });
      const model = await loadPanelModel();
      const panel = model.projectSkillRunnerPanelSnapshot(snapshot);

      assert.equal(panel.kind, "skillrunner");
      assert.equal(panel.context.status, "waiting-user");
      assert.equal(panel.reply.enabled, true);
      assert.equal(panel.interaction.kind, "waiting_user");
      assert.equal(panel.context.title, "Projection Task");
    });

    it("maps projected conversation items through the receiver transcript adapter", async function () {
      // Regression: the run-dialog receiver renders transcript rows via
      // conversation.items.map(adaptLegacyTranscriptItem).filter(Boolean).
      // A missing/broken adapter blanks the transcript while the rest of the
      // panel keeps rendering.
      const snapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Transcript Adapter Task",
            requestId: "req-transcript-adapter-1",
            status: "waiting_user",
            pending: WAITING_USER_PENDING,
            chatEvents: [
              {
                seq: 1,
                ts: "2026-07-19T00:00:10.000Z",
                role: "assistant",
                kind: "assistant_process",
                text: "Reading papers/a.md",
                correlation: { process_type: "tool_call" },
              },
              {
                seq: 2,
                ts: "2026-07-19T00:00:11.000Z",
                role: "assistant",
                kind: "assistant_final",
                text: "Final answer.",
              },
            ],
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.messages.length >= 1,
      });
      const model = await loadPanelModel();
      const panel = model.projectSkillRunnerPanelSnapshot(snapshot);

      const items = (panel.conversation as { items?: unknown[] } | undefined)
        ?.items;
      assert.isArray(items, "projection must expose conversation.items");
      const adapted = (items || [])
        .map(adaptLegacyTranscriptItem)
        .filter(Boolean);
      assert.isAbove(
        adapted.length,
        0,
        "adaptLegacyTranscriptItem must produce transcript items from a real snapshot",
      );
    });

    it("projects a real empty snapshot as unavailable chrome with produced labels", async function () {
      const snapshot = await captureSkillRunnerWorkspaceEnvelope();
      assert.isNull(snapshot.session);
      const model = await loadPanelModel();
      const panel = model.projectSkillRunnerPanelSnapshot(snapshot);

      assert.equal(panel.context.status, "unavailable");
      assert.equal(panel.reply.enabled, false);
      assert.equal(
        panel.labels.emptyTasks,
        snapshot.labels.emptyTasks,
        "empty transcript text must come from the produced labels.emptyTasks",
      );
      assert.isOk(
        String(panel.labels.emptyTasks || "").trim(),
        "labels.emptyTasks must reach the panel snapshot",
      );
    });

    it("tracks the exact field consumption of the panel projection", async function () {
      const waitingSnapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Field Probe Task",
            requestId: "req-fields-1",
            status: "waiting_user",
            pending: WAITING_USER_PENDING,
            chatEvents: [
              {
                seq: 1,
                ts: "2026-07-18T00:00:10.000Z",
                role: "assistant",
                kind: "assistant_process",
                text: "Reading papers/a.md",
                correlation: {
                  process_type: "tool_call",
                  tool_name: "read_file",
                  details: { path: "papers/a.md" },
                },
              },
              {
                seq: 2,
                ts: "2026-07-18T00:00:11.000Z",
                role: "assistant",
                kind: "assistant_final",
                text: "Final answer.",
                display_text: "Final answer.",
              },
            ],
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.pendingInteractionId === 77 &&
          entry.session.messages.some((message) => message.seq === 2),
      });
      const authSnapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Auth Field Task",
            requestId: "req-fields-2",
            status: "waiting_auth",
            pendingAuth: WAITING_AUTH_PENDING,
            authSession: {
              request_id: "req-fields-2",
              auth_session_id: "sess-auth-1",
              status: "waiting_auth",
              phase: "challenge_active",
              challenge_kind: "auth_code_or_url",
            },
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.authPhase === "challenge_active",
      });
      const model = await loadPanelModel();

      const waiting = trackSnapshotConsumption(waitingSnapshot);
      const auth = trackSnapshotConsumption(authSnapshot);
      model.projectSkillRunnerPanelSnapshot(waiting.proxied);
      model.projectSkillRunnerPanelSnapshot(auth.proxied);

      const consumedPaths = unionPaths(
        waiting.consumedPaths,
        auth.consumedPaths,
      );
      const phantomPaths = unionPaths(waiting.phantomPaths, auth.phantomPaths);
      const producedPaths = unionPaths(
        waiting.producedPaths,
        auth.producedPaths,
      );

      // 幻影读取（JS 侧读取了生产快照上不存在的键）必须精确等于策展清单。
      // 清单 SSOT 已上移到 src/shared/skillRunnerSnapshotContract.ts
      // （SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS，含分组注释）：共享
      // assistantPanelModel.js 同时服务 ACP Chat/Skills 等不同快照形状，对
      // 字段做系统性防御性回退（snake_case 别名、可选协议字段、多源任务辅助
      // 函数），这些读取是既有架构行为；任何一侧漂移（JS 读了新字段 / 生产
      // 开始提供某字段 / JS 不再读某条）都会让本断言变红，替代旧文本断言的
      // 漂移检测职责。
      const knownCompatAliasPaths = new Set<string>(
        SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS,
      );
      assert.deepEqual(
        sortedPaths(phantomPaths),
        sortedPaths(knownCompatAliasPaths),
        "projection must not read fields the production snapshot does not produce",
      );

      // 关键字段必达：投影必须真实消费这些生产字段（否则 TS 侧改名字段时
      // 无任何测试变红——正是旧文本断言抓不住的漂移）。清单 SSOT 同样在
      // src/shared/skillRunnerSnapshotContract.ts
      // （SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS）。注意
      // envelope.title 与 session.messages[].text 是有意的 fallback 读取
      // （session.title / displayText 优先，生产快照里它们始终非空），不在
      // 此清单中。
      const requiredConsumedPaths =
        SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS;
      const missingConsumed = requiredConsumedPaths.filter(
        (path) => !consumedPaths.has(path),
      );
      assert.deepEqual(
        missingConsumed,
        [],
        "projection must consume every curated contract field",
      );

      // 生产了但未被投影消费的字段：不算失败，列在此处供审查（多为有意
      // 透传或由 runDialog.js / renderer 下游消费的字段，例如
      // transcriptRevision、drawer.open、badges、selectionTasks、
      // contextHint、navigation、hostMode 等）。
      const unconsumed = sortedPaths(producedPaths).filter(
        (path) => path && !consumedPaths.has(path),
      );
      console.info(
        `[skillrunner-consumption] produced-but-unconsumed paths: ${JSON.stringify(unconsumed)}`,
      );
    });
  });

  describe("layer C: static resource linkage", function () {
    it("resolves every mount id the page script looks up", async function () {
      const [html, js] = await Promise.all([
        readProjectFile("addon/content/sidebar/run-dialog.html"),
        // runDialog.js 有加载期 DOM 副作用，只能读文本，不得 import。
        readProjectFile("src/sidebar/runDialog.js"),
      ]);
      const htmlIds = new Set(
        [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]),
      );
      const lookedUpIds = new Set(
        [...js.matchAll(/getElementById\(\s*"([^"]+)"/g)].map(
          (match) => match[1],
        ),
      );
      for (const id of lookedUpIds) {
        assert.isTrue(
          htmlIds.has(id),
          `runDialog.js looks up #${id} but run-dialog.html does not mount it`,
        );
      }
      // 反向：managed 六区 + transcript + 视图切换 mount 点必须都被脚本接管。
      const managedMountIds = [
        "run-root",
        "skillrunner-toolbar",
        "skillrunner-banner",
        "skillrunner-message-counter",
        "skillrunner-conversation-window",
        "chat-panel",
        "chat-mode-plain",
        "chat-mode-bubble",
        "skillrunner-plan",
        "skillrunner-hint",
        "reply-form",
        "skillrunner-drawer",
        "skillrunner-details",
      ];
      for (const id of managedMountIds) {
        assert.isTrue(htmlIds.has(id), `run-dialog.html must mount #${id}`);
        assert.isTrue(
          lookedUpIds.has(id),
          `runDialog.js must take over the #${id} mount`,
        );
      }
    });

    it("references the shared assistant panel resources", async function () {
      const html = await readProjectFile(
        "addon/content/sidebar/run-dialog.html",
      );
      const sharedReferences = [
        "../shared/assistant/assistant-panel-shared.css",
        "vendor/markdown-it/markdown-it.min.js",
        "vendor/katex/katex.min.css",
        "vendor/katex/katex.min.js",
        "vendor/markdown-it-texmath/texmath.min.js",
        'href="./run-dialog.css"',
        'src="./run-dialog.bundle.js"',
      ];
      for (const reference of sharedReferences) {
        assert.include(
          html,
          reference,
          `run-dialog.html must reference ${reference}`,
        );
      }
    });
  });
});

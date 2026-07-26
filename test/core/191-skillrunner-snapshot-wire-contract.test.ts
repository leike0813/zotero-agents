// SkillRunner 快照边界 v1 契约测试：
//   - 生产真快照（harness 走 attachSkillRunnerSidebarHost → pushSnapshot 真实
//     路径捕获）四种形态全部通过共享校验器（assert 不抛 + valid 为 true）；
//   - 变异用例（缺 schema / 错 schema / 缺 own session 键 / 缺
//     workspace.selectedTaskKey / messages 项缺 seq / canReply 非 boolean /
//     hostMode 非法值 / 顶层未知键 / session 未知键）逐条被拒，且 assert 抛
//     出的 Error 带字段路径；
//   - 生产端 debug 自检（pushSnapshot 发送前调
//     assertSkillRunnerWorkspaceSnapshot）：开 + debug 开时真快照通过；损坏
//     的快照被拒；override 关或 debug 关时跳过校验（损坏快照照常投递）。
import { assert } from "chai";
import {
  SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS,
  SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS,
  SKILLRUNNER_SNAPSHOT_SCHEMA,
  assertSkillRunnerWorkspaceSnapshot,
  validSkillRunnerSnapshotEnvelope,
} from "../../src/shared/skillRunnerSnapshotContract";
import {
  setDebugModeOverrideForTests,
  setSkillRunnerSnapshotWireAssertOverrideForTests,
} from "../../src/modules/debugMode";
import {
  attachSkillRunnerSidebarHost,
  refreshSkillRunnerSidebarHostSnapshot,
  refreshSkillRunnerWorkspacePresentation,
  type RunWorkspaceSnapshot,
} from "../../src/modules/skillRunnerRunDialog";
import {
  captureSkillRunnerWorkspaceEnvelope,
  startSkillRunnerWorkspaceSnapshotHarness,
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
};

const SAMPLE_CHAT_EVENTS = [
  {
    seq: 1,
    ts: "2026-07-18T00:00:10.000Z",
    role: "assistant",
    kind: "assistant_process",
    text: "Reading papers/a.md",
    correlation: { process_type: "tool_call", tool_name: "read_file" },
  },
  {
    seq: 2,
    ts: "2026-07-18T00:00:11.000Z",
    role: "assistant",
    kind: "assistant_final",
    text: "Final answer.",
  },
];

function createHostWindowStub() {
  return {
    addEventListener() {},
    removeEventListener() {},
  } as unknown as Window;
}

function expectValidSnapshot(snapshot: unknown) {
  assert.doesNotThrow(() => assertSkillRunnerWorkspaceSnapshot(snapshot));
  assert.isTrue(validSkillRunnerSnapshotEnvelope(snapshot));
}

function expectRejectedSnapshot(snapshot: unknown, expectedPath: string) {
  assert.isFalse(
    validSkillRunnerSnapshotEnvelope(snapshot),
    `expected the envelope gate to reject ${expectedPath}`,
  );
  assert.throws(
    () => assertSkillRunnerWorkspaceSnapshot(snapshot),
    new RegExp(`skillrunner-workspace-snapshot-invalid: .*${expectedPath}`),
  );
}

describe("skillrunner snapshot wire contract (v1)", function () {
  this.timeout(20_000);

  afterEach(function () {
    setSkillRunnerSnapshotWireAssertOverrideForTests();
    setDebugModeOverrideForTests();
  });

  describe("production snapshots pass the validator", function () {
    it("accepts a waiting_user snapshot (with transcript messages)", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Waiting Task",
          requestId: "req-wire-waiting-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
          chatEvents: SAMPLE_CHAT_EVENTS,
        });
        const capture = await harness.attach({ selectRunKey: seeded.runKey });
        const snapshot = await capture.waitFor(
          (entry) =>
            !!entry.session &&
            entry.session.loading === false &&
            entry.session.pendingInteractionId === 77 &&
            entry.session.messages.length >= 2,
        );

        assert.equal(snapshot.schema, SKILLRUNNER_SNAPSHOT_SCHEMA);
        expectValidSnapshot(snapshot);
      } finally {
        await harness.reset();
      }
    });

    it("accepts a waiting_auth snapshot", async function () {
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Auth Task",
          requestId: "req-wire-auth-1",
          status: "waiting_auth",
          pendingAuth: WAITING_AUTH_PENDING,
          authSession: {
            request_id: "req-wire-auth-1",
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

        expectValidSnapshot(snapshot);
      } finally {
        await harness.reset();
      }
    });

    it("accepts a terminal snapshot", async function () {
      const snapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Finished Task",
            requestId: "req-wire-terminal-1",
            status: "succeeded",
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.historyLoading === false,
      });

      assert.equal(snapshot.session?.status, "succeeded");
      expectValidSnapshot(snapshot);
    });

    it("accepts an empty snapshot (session = null)", async function () {
      const snapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [],
      });

      assert.isNull(snapshot.session);
      expectValidSnapshot(snapshot);
    });

    it("accepts the sidebar-decorated snapshot shape", async function () {
      // 装饰字段（hostMode/badges/sidebar/renderHints）由
      // buildDecoratedSkillRunnerSnapshot + decorateAssistantSidebarChildSnapshot
      // 叠加在裸快照上；此处手工叠加等价装饰层，验证接收端闸门对装饰形状放行。
      const base = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Decorated Task",
            requestId: "req-wire-decorated-1",
            status: "waiting_user",
            pending: WAITING_USER_PENDING,
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.pendingInteractionId === 77,
      });
      const decorated = {
        ...base,
        hostMode: "sidebar",
        badges: { waitingCount: 1 },
        sidebar: {
          scopeKey: "assistant-sidebar-test",
          activeTab: "skillrunner",
          attention: { waitingCount: 1 },
          panes: {
            "acp-chat": { active: false, full: false, revision: 0 },
            "acp-skills": { active: false, full: false, revision: 0 },
            skillrunner: { active: true, full: true, revision: 3 },
          },
          transcript: { active: true, stripped: false },
          renderHints: {
            streamingMode: "plain-incremental",
            finalRender: true,
            streamFlushMs: 160,
          },
        },
        renderHints: {
          streamingMode: "plain-incremental",
          finalRender: true,
          streamFlushMs: 160,
        },
      };

      expectValidSnapshot(decorated);
    });
  });

  describe("mutated snapshots are rejected", function () {
    let validSnapshot: RunWorkspaceSnapshot;

    before(async function () {
      const snapshot = await captureSkillRunnerWorkspaceEnvelope({
        tasks: [
          {
            taskName: "Mutation Source Task",
            requestId: "req-wire-mutation-1",
            status: "waiting_user",
            pending: WAITING_USER_PENDING,
            chatEvents: SAMPLE_CHAT_EVENTS,
          },
        ],
        waitFor: (entry) =>
          !!entry.session &&
          entry.session.loading === false &&
          entry.session.pendingInteractionId === 77 &&
          entry.session.messages.length >= 2,
      });
      validSnapshot = snapshot;
      expectValidSnapshot(validSnapshot);
    });

    function mutatedSnapshot(
      mutate: (snapshot: Record<string, unknown>) => void,
    ) {
      const clone = structuredClone(validSnapshot) as Record<string, unknown>;
      mutate(clone);
      return clone;
    }

    it("rejects a missing schema", function () {
      const snapshot = mutatedSnapshot((draft) => {
        delete draft.schema;
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.schema");
    });

    it("rejects a wrong schema value", function () {
      const snapshot = mutatedSnapshot((draft) => {
        draft.schema = "zotero-agents.skillrunner-workspace-snapshot.v0";
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.schema");
    });

    it("rejects a missing own session key", function () {
      const snapshot = mutatedSnapshot((draft) => {
        delete draft.session;
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.session");
    });

    it("rejects a missing workspace.selectedTaskKey", function () {
      const snapshot = mutatedSnapshot((draft) => {
        delete (draft.workspace as Record<string, unknown>).selectedTaskKey;
      });
      expectRejectedSnapshot(
        snapshot,
        "snapshot\\.workspace\\.selectedTaskKey",
      );
    });

    it("rejects a message item without seq", function () {
      const snapshot = mutatedSnapshot((draft) => {
        const session = draft.session as Record<string, unknown>;
        const messages = session.messages as Array<Record<string, unknown>>;
        delete messages[0].seq;
      });
      expectRejectedSnapshot(
        snapshot,
        "snapshot\\.session\\.messages\\[0\\]\\.seq",
      );
    });

    it("rejects a non-boolean canReply", function () {
      const snapshot = mutatedSnapshot((draft) => {
        (draft.session as Record<string, unknown>).canReply = "yes";
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.session\\.canReply");
    });

    it("rejects a non-boolean drawer section collapsible flag", function () {
      const snapshot = mutatedSnapshot((draft) => {
        const drawer = draft.drawer as Record<string, unknown>;
        const sections = drawer.sections as Array<Record<string, unknown>>;
        sections[0].collapsible = "yes";
      });
      expectRejectedSnapshot(
        snapshot,
        "snapshot\\.drawer\\.sections\\[0\\]\\.collapsible",
      );
    });

    it("rejects an invalid hostMode", function () {
      const snapshot = mutatedSnapshot((draft) => {
        draft.hostMode = "overlay";
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.hostMode");
    });

    it("rejects an unknown top-level key", function () {
      const snapshot = mutatedSnapshot((draft) => {
        draft.surpriseField = 1;
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.surpriseField");
    });

    it("rejects an unknown session key", function () {
      const snapshot = mutatedSnapshot((draft) => {
        (draft.session as Record<string, unknown>).surpriseField = 1;
      });
      expectRejectedSnapshot(snapshot, "snapshot\\.session\\.surpriseField");
    });

    it("rejects an unknown pending interaction key", function () {
      const snapshot = mutatedSnapshot((draft) => {
        const session = draft.session as Record<string, unknown>;
        (session.pendingInteraction as Record<string, unknown>).surpriseField =
          1;
      });
      expectRejectedSnapshot(
        snapshot,
        "snapshot\\.session\\.pendingInteraction",
      );
    });

    it("rejects a broken statusSemantics", function () {
      const snapshot = mutatedSnapshot((draft) => {
        const session = draft.session as Record<string, unknown>;
        (session.statusSemantics as Record<string, unknown>).terminal = "no";
      });
      expectRejectedSnapshot(
        snapshot,
        "snapshot\\.session\\.statusSemantics\\.terminal",
      );
    });
  });

  describe("producer-side debug self-check", function () {
    it("passes the real snapshot when the assert is enabled", async function () {
      setDebugModeOverrideForTests(true);
      setSkillRunnerSnapshotWireAssertOverrideForTests(true);
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        const seeded = harness.seedTask({
          taskName: "Self Check Task",
          requestId: "req-wire-selfcheck-1",
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
        assert.equal(snapshot.schema, SKILLRUNNER_SNAPSHOT_SCHEMA);
        // refresh 路径（refreshWorkspaceSnapshot → pushSnapshot）在自检开启
        // 时对真快照不抛。
        await refreshSkillRunnerSidebarHostSnapshot({});
      } finally {
        await harness.reset();
      }
    });

    it("rejects a corrupted snapshot when the assert is enabled", async function () {
      setDebugModeOverrideForTests(true);
      setSkillRunnerSnapshotWireAssertOverrideForTests(true);
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        harness.seedTask({
          taskName: "Corrupted Task",
          requestId: "req-wire-corrupted-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        attachSkillRunnerSidebarHost({
          hostWindow: createHostWindowStub(),
          frameWindow: null,
          isHostAlive: () => true,
          publishSnapshot: () => {},
          decorateSnapshot: (snapshot) =>
            ({
              ...snapshot,
              surpriseField: 1,
            }) as unknown as RunWorkspaceSnapshot,
        });
        // refreshSkillRunnerWorkspacePresentation 同步走 pushSnapshot，避免
        // refreshChain 缓存拒绝态污染同进程其它测试。
        assert.throws(
          () => refreshSkillRunnerWorkspacePresentation(),
          /skillrunner-workspace-snapshot-invalid: snapshot\.surpriseField/,
        );
      } finally {
        await harness.reset();
      }
    });

    it("skips validation when the override disables it", async function () {
      setDebugModeOverrideForTests(true);
      setSkillRunnerSnapshotWireAssertOverrideForTests(false);
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        harness.seedTask({
          taskName: "Unchecked Task",
          requestId: "req-wire-unchecked-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const delivered: RunWorkspaceSnapshot[] = [];
        attachSkillRunnerSidebarHost({
          hostWindow: createHostWindowStub(),
          frameWindow: null,
          isHostAlive: () => true,
          publishSnapshot: (_phase, snapshot) => {
            delivered.push(structuredClone(snapshot));
          },
          decorateSnapshot: (snapshot) =>
            ({
              ...snapshot,
              surpriseField: 1,
            }) as unknown as RunWorkspaceSnapshot,
        });
        assert.doesNotThrow(() => refreshSkillRunnerWorkspacePresentation());
        assert.isNotEmpty(delivered);
        assert.property(
          delivered[delivered.length - 1] as unknown as Record<string, unknown>,
          "surpriseField",
        );
      } finally {
        await harness.reset();
      }
    });

    it("skips validation when debug mode is off", async function () {
      setDebugModeOverrideForTests(false);
      setSkillRunnerSnapshotWireAssertOverrideForTests(true);
      const harness = await startSkillRunnerWorkspaceSnapshotHarness();
      try {
        harness.seedTask({
          taskName: "Debug Off Task",
          requestId: "req-wire-debugoff-1",
          status: "waiting_user",
          pending: WAITING_USER_PENDING,
        });
        const delivered: RunWorkspaceSnapshot[] = [];
        attachSkillRunnerSidebarHost({
          hostWindow: createHostWindowStub(),
          frameWindow: null,
          isHostAlive: () => true,
          publishSnapshot: (_phase, snapshot) => {
            delivered.push(structuredClone(snapshot));
          },
          decorateSnapshot: (snapshot) =>
            ({
              ...snapshot,
              surpriseField: 1,
            }) as unknown as RunWorkspaceSnapshot,
        });
        assert.doesNotThrow(() => refreshSkillRunnerWorkspacePresentation());
        assert.isNotEmpty(delivered);
      } finally {
        await harness.reset();
      }
    });
  });

  describe("curated consumption lists", function () {
    it("keeps the migrated lists anchored to their known entries", function () {
      assert.equal(
        SKILLRUNNER_SNAPSHOT_SCHEMA,
        "zotero-agents.skillrunner-workspace-snapshot.v1",
      );
      assert.include(
        SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS,
        "session.backendId",
      );
      assert.include(
        SKILLRUNNER_SNAPSHOT_COMPAT_ALIAS_PATHS,
        "labels.assistantPanel.authAwaiting",
      );
      assert.include(
        SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS,
        "session.statusSemantics.terminal",
      );
      assert.include(
        SKILLRUNNER_SNAPSHOT_REQUIRED_CONSUMED_PATHS,
        "session.authControlError",
      );
    });
  });
});

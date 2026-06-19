import { assert } from "chai";
import {
  buildSkillRunnerSidebarSections,
  isSkillRunnerTaskRelatedToContext,
  pickSkillRunnerSidebarFocusedTaskKey,
} from "../../../src/modules/skillRunnerSidebarModel";
import {
  ASSISTANT_SIDEBAR_STREAM_FLUSH_MS,
  decorateAssistantSidebarChildSnapshot,
} from "../../../src/modules/assistantSidebarViewModel";

describe("skillrunner sidebar model", function () {
  it("decorates active sidebar panes with render hints and strips inactive transcript payloads", function () {
    const active = decorateAssistantSidebarChildSnapshot({
      scopeKey: "scope-1",
      activeTab: "acp-chat",
      tab: "acp-chat",
      revision: 2,
      waitingCount: 3,
      full: true,
      snapshot: {
        title: "Chat",
        items: [{ id: "msg-1", kind: "message", text: "hello" }],
      },
    });
    assert.deepEqual(active.items, [
      { id: "msg-1", kind: "message", text: "hello" },
    ]);
    assert.equal(active.sidebar.scopeKey, "scope-1");
    assert.equal(active.sidebar.activeTab, "acp-chat");
    assert.equal(active.sidebar.attention.waitingCount, 3);
    assert.equal(active.renderHints.streamingMode, "plain-incremental");
    assert.equal(
      active.renderHints.streamFlushMs,
      ASSISTANT_SIDEBAR_STREAM_FLUSH_MS,
    );

    const inactive = decorateAssistantSidebarChildSnapshot({
      scopeKey: "scope-1",
      activeTab: "acp-chat",
      tab: "acp-skills",
      revision: 3,
      full: false,
      snapshot: {
        selectedRun: {
          requestId: "run-1",
          transcriptItems: [{ id: "chunk-1", text: "stream" }],
        },
        runs: [
          {
            requestId: "run-1",
            transcriptItems: [{ id: "chunk-1", text: "stream" }],
          },
        ],
      },
    });
    assert.deepEqual(
      (inactive.selectedRun as { transcriptItems: unknown[] }).transcriptItems,
      [],
    );
    assert.deepEqual(
      (inactive.runs as Array<{ transcriptItems: unknown[] }>)[0]
        .transcriptItems,
      [],
    );
    assert.isTrue(inactive.sidebar.transcript.stripped);
  });

  it("matches tasks only against related parent item ids", function () {
    const context = {
      primaryParentItemId: 101,
      relatedParentItemIds: [101, 303],
      itemLabel: "Paper A",
    };
    assert.isTrue(
      isSkillRunnerTaskRelatedToContext({
        targetParentID: 101,
        context,
      }),
    );
    assert.isTrue(
      isSkillRunnerTaskRelatedToContext({
        targetParentID: 303,
        context,
      }),
    );
    assert.isFalse(
      isSkillRunnerTaskRelatedToContext({
        targetParentID: 202,
        context,
      }),
    );
  });

  it("builds running/completed drawer sections and hides invalid or terminal runs outside succeeded", function () {
    const sections = buildSkillRunnerSidebarSections({
      groups: [
        {
          backendId: "alpha",
          backendDisplayName: "Alpha",
          disabled: false,
          collapsed: false,
          finishedCollapsed: true,
          latestUpdatedAt: "2026-04-17T10:00:00.000Z",
          activeTasks: [
            {
              key: "alpha:req-1",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              requestId: "req-1",
              workflowLabel: "Flow A",
              status: "waiting_user",
              stateLabel: "Waiting User",
              updatedAt: "2026-04-17T10:00:00.000Z",
              title: "Paper A",
              selectable: true,
              terminal: false,
              targetParentID: 101,
            },
            {
              key: "alpha:req-2",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              requestId: "req-2",
              workflowLabel: "Flow B",
              status: "running",
              stateLabel: "Running",
              updatedAt: "2026-04-17T09:59:00.000Z",
              title: "Paper B",
              selectable: true,
              terminal: false,
              targetParentID: 303,
            },
            {
              key: "alpha:pending-placeholder",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              workflowLabel: "Flow Pending",
              status: "running",
              stateLabel: "Running",
              updatedAt: "2026-04-17T09:58:30.000Z",
              title: "Pending Placeholder",
              selectable: false,
              terminal: false,
              targetParentID: 101,
            },
          ],
          finishedTasks: [
            {
              key: "alpha:req-3",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              requestId: "req-3",
              workflowLabel: "Flow C",
              status: "succeeded",
              stateLabel: "Succeeded",
              updatedAt: "2026-04-17T09:58:00.000Z",
              title: "Paper C",
              selectable: true,
              terminal: true,
              targetParentID: 101,
            },
            {
              key: "alpha:req-4",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              requestId: "req-4",
              workflowLabel: "Flow Failed",
              status: "failed",
              stateLabel: "Failed",
              updatedAt: "2026-04-17T09:57:00.000Z",
              title: "Paper Failed",
              selectable: true,
              terminal: true,
              targetParentID: 101,
            },
            {
              key: "alpha:req-5",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              requestId: "req-5",
              workflowLabel: "Flow Canceled",
              status: "canceled",
              stateLabel: "Canceled",
              updatedAt: "2026-04-17T09:56:00.000Z",
              title: "Paper Canceled",
              selectable: true,
              terminal: true,
              targetParentID: 101,
            },
          ],
        },
        {
          backendId: "beta",
          backendDisplayName: "Beta",
          disabled: true,
          disabledReason: "Backend unavailable",
          collapsed: true,
          finishedCollapsed: true,
          latestUpdatedAt: "2026-04-17T10:01:00.000Z",
          activeTasks: [
            {
              key: "beta:req-6",
              backendId: "beta",
              backendDisplayName: "Beta",
              requestId: "req-6",
              workflowLabel: "Flow Disabled",
              status: "running",
              stateLabel: "Running",
              updatedAt: "2026-04-17T10:01:00.000Z",
              title: "Disabled Run",
              selectable: true,
              terminal: false,
              targetParentID: 101,
            },
          ],
          finishedTasks: [],
        },
      ],
      context: {
        primaryParentItemId: 101,
        relatedParentItemIds: [101, 303],
        itemLabel: "Paper A",
      },
      selectedTaskKey: "alpha:req-1",
      completedCollapsed: true,
    });

    assert.deepEqual(
      sections.map((section) => section.id),
      ["running", "completed"],
    );
    assert.isFalse(sections[0].collapsed);
    assert.isTrue(sections[1].collapsed);
    assert.lengthOf(sections[0].groups, 1);
    assert.lengthOf(sections[0].groups[0].activeTasks, 2);
    assert.equal(sections[0].groups[0].activeTasks[0].requestId, "req-1");
    assert.equal(sections[0].groups[0].activeTasks[0].relationState, "focused");
    assert.equal(sections[0].groups[0].activeTasks[1].requestId, "req-2");
    assert.equal(sections[0].groups[0].activeTasks[1].relationState, "related");
    assert.lengthOf(sections[0].groups[0].finishedTasks, 0);
    assert.lengthOf(sections[1].groups, 1);
    assert.lengthOf(sections[1].groups[0].activeTasks, 0);
    assert.lengthOf(sections[1].groups[0].finishedTasks, 1);
    assert.equal(sections[1].groups[0].finishedTasks[0].requestId, "req-3");
  });

  it("keeps pre-ready selectable tasks visible without a backend request id", function () {
    const sections = buildSkillRunnerSidebarSections({
      groups: [
        {
          backendId: "alpha",
          backendDisplayName: "Alpha",
          disabled: false,
          collapsed: false,
          finishedCollapsed: true,
          latestUpdatedAt: "2026-04-17T10:00:00.000Z",
          activeTasks: [
            {
              key: "alpha::task:local-run-1",
              backendId: "alpha",
              backendDisplayName: "Alpha",
              workflowLabel: "Flow Pending",
              status: "request_creating",
              stateLabel: "Submitting",
              updatedAt: "2026-04-17T10:00:00.000Z",
              title: "Pending Placeholder",
              selectable: true,
              requestAssigned: false,
              backendInteractive: false,
              canOpenStream: false,
              canCancelBackendRun: false,
              canReply: false,
              skillRunnerLifecycleState: "request_creating",
              terminal: false,
              targetParentID: 101,
            },
          ],
          finishedTasks: [],
        },
      ],
      context: {
        primaryParentItemId: 101,
        relatedParentItemIds: [101],
      },
      selectedTaskKey: "alpha::task:local-run-1",
      completedCollapsed: true,
    });

    assert.lengthOf(sections[0].groups, 1);
    assert.lengthOf(sections[0].groups[0].activeTasks, 1);
    const task = sections[0].groups[0].activeTasks[0];
    assert.equal(task.key, "alpha::task:local-run-1");
    assert.isUndefined(task.requestId);
    assert.equal(task.relationState, "focused");
    assert.isFalse(task.requestAssigned);
    assert.isFalse(task.backendInteractive);
    assert.isFalse(task.canOpenStream);
    assert.isFalse(task.canCancelBackendRun);
    assert.isFalse(task.canReply);
  });

  it("keeps current focus when still related, otherwise falls back to the first primary related running task", function () {
    const groups = [
      {
        backendId: "alpha",
        backendDisplayName: "Alpha",
        disabled: false,
        collapsed: false,
        finishedCollapsed: true,
        latestUpdatedAt: "2026-04-17T10:00:00.000Z",
        activeTasks: [
          {
            key: "alpha:req-1",
            backendId: "alpha",
            backendDisplayName: "Alpha",
            requestId: "req-1",
            workflowLabel: "Flow A",
            status: "running",
            stateLabel: "Running",
            updatedAt: "2026-04-17T10:00:00.000Z",
            title: "Paper A",
            selectable: true,
            terminal: false,
            targetParentID: 101,
          },
          {
            key: "alpha:req-2",
            backendId: "alpha",
            backendDisplayName: "Alpha",
            requestId: "req-2",
            workflowLabel: "Flow B",
            status: "waiting_user",
            stateLabel: "Waiting User",
            updatedAt: "2026-04-17T09:59:00.000Z",
            title: "Paper B",
            selectable: true,
            terminal: false,
            targetParentID: 202,
          },
        ],
        finishedTasks: [
          {
            key: "alpha:req-3",
            backendId: "alpha",
            backendDisplayName: "Alpha",
            requestId: "req-3",
            workflowLabel: "Flow C",
            status: "succeeded",
            stateLabel: "Succeeded",
            updatedAt: "2026-04-17T09:58:00.000Z",
            title: "Paper C",
            selectable: true,
            terminal: true,
            targetParentID: 101,
          },
        ],
      },
    ];

    assert.equal(
      pickSkillRunnerSidebarFocusedTaskKey({
        groups,
        currentTaskKey: "alpha:req-2",
        context: {
          primaryParentItemId: 202,
          relatedParentItemIds: [202, 101],
        },
      }),
      "alpha:req-2",
    );
    assert.equal(
      pickSkillRunnerSidebarFocusedTaskKey({
        groups,
        currentTaskKey: "alpha:req-3",
        context: {
          primaryParentItemId: 101,
          relatedParentItemIds: [101],
        },
      }),
      "alpha:req-1",
    );
    assert.equal(
      pickSkillRunnerSidebarFocusedTaskKey({
        groups,
        currentTaskKey: "alpha:req-2",
        context: {
          primaryParentItemId: 999,
          relatedParentItemIds: [999],
        },
      }),
      "alpha:req-2",
    );
  });

  it("keeps task order stable when focus context changes", function () {
    const groups = [
      {
        backendId: "alpha",
        backendDisplayName: "Alpha",
        disabled: false,
        collapsed: false,
        finishedCollapsed: true,
        latestUpdatedAt: "2026-04-17T10:00:00.000Z",
        activeTasks: [
          {
            key: "alpha:req-1",
            backendId: "alpha",
            backendDisplayName: "Alpha",
            requestId: "req-1",
            workflowLabel: "Flow A",
            status: "running",
            stateLabel: "Running",
            updatedAt: "2026-04-17T09:00:00.000Z",
            title: "Paper A",
            selectable: true,
            terminal: false,
            targetParentID: 101,
          },
          {
            key: "alpha:req-2",
            backendId: "alpha",
            backendDisplayName: "Alpha",
            requestId: "req-2",
            workflowLabel: "Flow B",
            status: "waiting_user",
            stateLabel: "Waiting User",
            updatedAt: "2026-04-17T10:00:00.000Z",
            title: "Paper B",
            selectable: true,
            terminal: false,
            targetParentID: 202,
          },
        ],
        finishedTasks: [],
      },
    ];
    const first = buildSkillRunnerSidebarSections({
      groups,
      context: { primaryParentItemId: 101, relatedParentItemIds: [101, 202] },
      selectedTaskKey: "alpha:req-1",
      completedCollapsed: true,
    });
    const second = buildSkillRunnerSidebarSections({
      groups,
      context: { primaryParentItemId: 202, relatedParentItemIds: [202, 101] },
      selectedTaskKey: "alpha:req-2",
      completedCollapsed: true,
    });
    assert.deepEqual(
      first[0].groups[0].activeTasks.map((task) => task.requestId),
      ["req-1", "req-2"],
    );
    assert.deepEqual(
      second[0].groups[0].activeTasks.map((task) => task.requestId),
      ["req-1", "req-2"],
    );
    assert.equal(second[0].groups[0].activeTasks[0].relationState, "related");
    assert.equal(second[0].groups[0].activeTasks[1].relationState, "focused");
  });
});

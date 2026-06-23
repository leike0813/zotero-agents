import { assert } from "chai";
import {
  getProjectRoot,
  joinPath,
  readUtf8,
} from "../zotero/workflow-test-utils";

async function readProjectFile(relativePath: string) {
  const targetPath = joinPath(getProjectRoot(), relativePath);
  return readUtf8(targetPath);
}

describe("skillrunner run workspace singleton", function () {
  it("routes openSkillRunnerRunDialog to one global workspace window", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(ts, "isRunWorkspaceHostAlive()");
    assert.include(ts, "runWorkspaceState.focusHost?.()");
    assert.include(ts, 'runWorkspaceState.hostMode === "dialog"');
    assert.notInclude(ts, "latestOpenTarget");
    assert.include(ts, "refreshWorkspaceSnapshot({");
  });

  it("builds workspace groups with active/finished buckets and title fallback", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(
      ts,
      "activeTasks: disabled ? [] : sorted.filter((task) => !task.terminal)",
    );
    assert.include(
      ts,
      "finishedTasks: disabled ? [] : sorted.filter((task) => task.terminal)",
    );
    assert.include(ts, "disabled = !isSkillRunnerBackendAvailable");
    assert.include(ts, "resolveRunWorkspaceTaskTitle");
    assert.include(ts, "task-dashboard-run-waiting-request-id");
    assert.include(ts, "selectable: true");
    assert.include(ts, "backendInteractive:");
    assert.include(ts, "canOpenStream:");
  });

  it("extends host snapshot with workspace plus selected session", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(ts, "buildRunWorkspaceSnapshot");
    assert.include(ts, "workspace: {");
    assert.include(ts, "selectedTaskKey: runWorkspaceState.selectedTaskKey");
    assert.include(ts, "session,");
  });

  it("does not synthesize temporary SkillRunner task rows or auto-pick fallback tasks", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.notInclude(ts, "latestOpenTarget");
    assert.notInclude(ts, "rows.unshift(task)");
    assert.notInclude(ts, "target.requestId");
    assert.notInclude(ts, "for (const task of group.activeTasks)");
    assert.include(ts, 'return "";');
  });

  it("focuses SkillRunner workspace tasks by runKey only", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(ts, "runKey: args?.runKey");
    assert.include(ts, "selectionIntentFromRunKey(runKey, \"user\")");
    assert.notInclude(ts, "taskRecord.runKey");
    assert.notInclude(ts, "taskId: taskId || localRunId");
    assert.notInclude(ts, "taskId: localRunId || taskId");
  });

  it("keeps pending SkillRunner focus requests until the drawer task exists", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(ts, "selectionIntent: RunWorkspaceSelectionIntent | null");
    assert.include(ts, "canonicalizeRunWorkspaceSelectionIntent({");
    assert.include(
      ts,
      "const resolvedIntentKey = resolveRunWorkspaceSelectionKey({",
    );
    assert.include(ts, "runWorkspaceState.selectionIntent =");
    assert.notInclude(ts, "runWorkspaceState.requestedSelection");
    assert.notInclude(ts, "runWorkspaceState.requestedTaskKey");
    const focusStart = ts.indexOf(
      "export async function focusSkillRunnerWorkspace",
    );
    const focusEnd = ts.indexOf(
      "export async function openSkillRunnerRunDialog",
      focusStart,
    );
    const focusBody = ts.slice(focusStart, focusEnd);
    assert.include(focusBody, "runWorkspaceState.selectionIntent = selection;");
    assert.include(focusBody, "selection: runWorkspaceState.selectionIntent");
    assert.include(focusBody, "runWorkspaceState.taskIndex.has(runKey)");
    assert.include(focusBody, "await selectWorkspaceTask(runKey)");
    assert.notInclude(focusBody, "resolvedExisting");
  });

  it("keeps selection through the canonical runKey without alias indexes", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    const pickerStart = ts.indexOf("function pickRunWorkspaceSelectedTaskKey");
    const pickerEnd = ts.indexOf(
      "function pickRunWorkspaceSelectedTaskKeyForSidebar",
      pickerStart,
    );
    const pickerBody = ts.slice(pickerStart, pickerEnd);
    assert.include(pickerBody, "selectionIntentFromRunKey(current)");
    assert.include(pickerBody, "resolveRunWorkspaceSelectionKey({");
    assert.notInclude(pickerBody, "identityIndex");
    assert.include(pickerBody, "return row.item.key || resolvedCurrent");
  });

  it("commits SkillRunner workspace refreshes against the latest selection intent", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    const refreshStart = ts.indexOf("async function refreshWorkspaceSnapshot");
    const refreshEnd = ts.indexOf(
      "async function handleRunWorkspaceAction",
      refreshStart,
    );
    const refreshBody = ts.slice(refreshStart, refreshEnd);
    assert.include(refreshBody, "const buildSelectionIntent =");
    assert.include(refreshBody, "selection: buildSelectionIntent");
    assert.include(refreshBody, "const latestSelectionIntent =");
    assert.include(refreshBody, "selection: latestSelectionIntent");
    assert.include(refreshBody, "intent: latestSelectionIntent");
    assert.include(refreshBody, "!resolvedIntentKey");
    assert.include(refreshBody, "const unresolvedProgrammaticIntent =");
    assert.include(
      refreshBody,
      'latestSelectionIntent?.source === "programmatic"',
    );
    assert.include(refreshBody, "? latestSelectionIntent");
  });

  it("focuses continuation-created steps only from user-originated RunDialog continuation", async function () {
    const dialog = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    const continuation = await readProjectFile(
      "src/modules/skillRunnerForegroundContinuation.ts",
    );
    const reconciler = await readProjectFile(
      "src/modules/skillRunnerTaskReconciler.ts",
    );

    assert.include(dialog, 'uiFocusPolicy: "focus-started-step"');
    assert.include(dialog, "onSequenceStepFocus: ({ runKey }) =>");
    assert.notInclude(dialog, "buildWorkflowTaskRecordFromJob");
    assert.include(dialog, "void focusSkillRunnerWorkspace({");
    assert.include(
      continuation,
      "onSequenceStepFocus?: ContinuationSequenceStepFocusHandler",
    );
    assert.include(continuation, "shouldFocusContinuationStep");
    assert.include(continuation, 'eventType === "request-created"');
    assert.notInclude(continuation, 'eventType === "sequence-step-started"');
    assert.include(reconciler, 'uiFocusPolicy: "none"');
    assert.notInclude(reconciler, "onSequenceStepFocus");
  });

  it("keeps a bounded warm SSE stream pool while switching tasks in the singleton workspace", async function () {
    const ts = await readProjectFile("src/modules/skillRunnerRunDialog.ts");
    assert.include(ts, "MAX_RUN_DIALOG_STREAMS_PER_BACKEND = 2");
    assert.include(ts, "streamLastFocusedAt");
    assert.include(ts, "enforceRunDialogStreamPoolForBackend");
    assert.include(ts, "markRunDialogEntryFocused(entry)");
    assert.include(
      ts,
      "let chatStreamAbortController: AbortController | null = null;",
    );
    assert.include(ts, "chatStreamAbortController?.abort();");
    assert.include(ts, "signal: chatStreamAbortController?.signal");
    assert.include(ts, "lastFocusedAt: entry.streamLastFocusedAt");
    assert.include(ts, "isAbortErrorLike(error)");
    assert.include(ts, "if (args.entry.stopObserver)");
    assert.include(ts, "await args.entry.refreshDisplay?.();");
    assert.notInclude(
      ts,
      "await stopRunDialogEntryObserver(runWorkspaceState.currentEntry);\n\n  const requestId",
    );
    assert.notInclude(
      ts,
      "await Promise.allSettled([\n        runLoopTask ?? Promise.resolve(),\n        refreshChain.catch(() => {}),\n      ]);",
    );
  });
});

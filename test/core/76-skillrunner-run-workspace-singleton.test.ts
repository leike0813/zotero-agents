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
    assert.include(ts, "disabled = isSkillRunnerBackendReconcileFlagged");
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
    assert.include(ts, "void entry.refreshDisplay?.().catch(() => {});");
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

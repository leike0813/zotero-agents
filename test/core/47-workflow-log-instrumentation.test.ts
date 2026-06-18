import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
  resetRuntimeLogAllowedLevels,
  setRuntimeLogAllowedLevels,
} from "../../src/modules/runtimeLogManager";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { joinPath, mkTempDir, writeUtf8 } from "./workflow-test-utils";

async function createWorkflowRoot(args: {
  id: string;
  applyResultBody: string;
}) {
  const root = await mkTempDir(`zotero-skills-log-instrumentation-${args.id}`);
  const workflowRoot = joinPath(root, args.id);
  await writeUtf8(
    joinPath(workflowRoot, "workflow.json"),
    JSON.stringify(
      {
        id: args.id,
        label: `Log Instrumentation ${args.id}`,
        provider: "pass-through",
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
      null,
      2,
    ),
  );
  await writeUtf8(
    joinPath(workflowRoot, "hooks", "applyResult.js"),
    args.applyResultBody,
  );
  return root;
}

describe("workflow runtime log instrumentation", function () {
  beforeEach(function () {
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
    setRuntimeLogAllowedLevels(["debug", "info", "warn", "error"]);
  });

  afterEach(function () {
    clearRuntimeLogs();
    resetRuntimeLogAllowedLevels();
  });

  it("records trigger and job boundary logs on success", async function () {
    const root = await createWorkflowRoot({
      id: "log-instrument-success",
      applyResultBody: [
        "export async function applyResult() {",
        "  return { ok: true };",
        "}",
        "",
      ].join("\n"),
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "log-instrument-success",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Log Instrument Success Parent" },
    });
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    await executeWorkflowFromCurrentSelection({
      win,
      workflow: workflow!,
    });

    const stages = new Set(
      listRuntimeLogs({
        workflowId: workflow!.manifest.id,
      }).map((entry) => entry.stage),
    );
    assert.isTrue(stages.has("trigger-start"));
    assert.isTrue(stages.has("build-requests-start"));
    assert.isTrue(stages.has("build-requests-finished"));
    assert.isTrue(stages.has("job-enqueued"));
    assert.isTrue(stages.has("queue-queued"));
    assert.isTrue(stages.has("dispatch-start"));
    assert.isTrue(stages.has("dispatch-succeeded"));
    assert.isTrue(stages.has("provider-finished"));
    assert.isTrue(stages.has("apply-start"));
    assert.isTrue(stages.has("apply-succeeded"));
    assert.isTrue(stages.has("trigger-finished"));

    const providerEntries = listRuntimeLogs({
      scopes: ["provider"],
    });
    const providerStages = new Set(providerEntries.map((entry) => entry.stage));
    assert.isTrue(providerStages.has("provider-dispatch-start"));
    assert.isTrue(providerStages.has("provider-dispatch-succeeded"));
    assert.isTrue(providerStages.has("provider-execute-start"));
    assert.isTrue(providerStages.has("provider-execute-succeeded"));
    assert.isTrue(
      providerEntries.every(
        (entry) => String(entry.providerId || "").trim().length > 0,
      ),
    );
  });

  it("records normalized apply failure logs", async function () {
    const root = await createWorkflowRoot({
      id: "log-instrument-failed",
      applyResultBody: [
        "export async function applyResult() {",
        "  throw new Error('apply exploded');",
        "}",
        "",
      ].join("\n"),
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "log-instrument-failed",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Log Instrument Failed Parent" },
    });
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    await executeWorkflowFromCurrentSelection({
      win,
      workflow: workflow!,
    });

    const entries = listRuntimeLogs({
      workflowId: workflow!.manifest.id,
    });
    const applyFailed = entries.find((entry) => entry.stage === "apply-failed");
    assert.isOk(applyFailed);
    assert.equal(applyFailed!.level, "error");
    assert.include(String(applyFailed!.error?.message || ""), "apply exploded");
  });
});

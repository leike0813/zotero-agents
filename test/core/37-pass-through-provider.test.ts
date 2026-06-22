import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { joinPath, mkTempDir, writeUtf8 } from "./workflow-test-utils";

async function createPassThroughWorkflowRoot() {
  const root = await mkTempDir("zotero-skills-pass-through");
  const workflowRoot = joinPath(root, "pass-through-local-test");
  await writeUtf8(
    joinPath(workflowRoot, "workflow.json"),
    JSON.stringify(
      {
        id: "pass-through-local-test",
        label: "Pass Through Local Test",
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
    [
      "export async function applyResult({ parent, runResult, runtime }) {",
      "  const target = runtime.helpers.resolveItemRef(parent);",
      "  const selection = runResult?.resultJson?.selectionContext;",
      "  await runtime.handlers.parent.addNote(target, {",
      "    content: `<p data-zs-pass-through='ok'>${String(selection?.selectionType || '')}</p>`,",
      "  });",
      "  return { ok: true };",
      "}",
      "",
    ].join("\n"),
  );
  return root;
}

describe("pass-through provider", function () {
  it("rejects legacy filterInputs hook declarations at manifest load time", async function () {
    const root = await mkTempDir("zotero-skills-filterinputs-rejected");
    const workflowRoot = joinPath(root, "legacy-filterinputs");
    await writeUtf8(
      joinPath(workflowRoot, "workflow.json"),
      JSON.stringify(
        {
          id: "legacy-filterinputs",
          label: "Legacy Filter Inputs",
          provider: "pass-through",
          hooks: {
            filterInputs: "hooks/filterInputs.js",
            applyResult: "hooks/applyResult.js",
          },
        },
        null,
        2,
      ),
    );
    await writeUtf8(
      joinPath(workflowRoot, "hooks", "applyResult.js"),
      "export async function applyResult(){ return { ok: true }; }",
    );

    const loaded = await loadWorkflowManifests(root);

    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      (loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "manifest_validation_error" &&
          String(entry.reason || "").includes("filterInputs"),
      ),
      `diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
  });

  it("rejects unknown validateSelection policies at manifest load time", async function () {
    const root = await mkTempDir("zotero-skills-selection-policy-rejected");
    const workflowRoot = joinPath(root, "unknown-selection-policy");
    await writeUtf8(
      joinPath(workflowRoot, "workflow.json"),
      JSON.stringify(
        {
          id: "unknown-selection-policy",
          label: "Unknown Selection Policy",
          provider: "pass-through",
          validateSelection: {
            select: {
              policy: "arbitrary-js-expression",
            },
          },
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
      "export async function applyResult(){ return { ok: true }; }",
    );

    const loaded = await loadWorkflowManifests(root);

    assert.lengthOf(loaded.workflows, 0);
    assert.isTrue(
      (loaded.diagnostics || []).some(
        (entry) =>
          entry.category === "manifest_validation_error" &&
          String(entry.reason || "").includes("validateSelection"),
      ),
      `diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
  });

  it("builds pass-through request without buildRequest/request declarations", async function () {
    const root = await createPassThroughWorkflowRoot();
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "pass-through-local-test",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through Build Request Parent" },
    });
    const selectionContext = await buildSelectionContext([parent]);
    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext,
      executionOptions: {
        workflowParams: {
          alpha: 1,
        },
      },
    })) as Array<{
      kind: string;
      selectionContext?: unknown;
      parameter?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "pass-through.run.v1");
    assert.isObject(requests[0].selectionContext);
    assert.deepEqual(requests[0].parameter, { alpha: 1 });
  });

  it("executes pass-through workflow end-to-end and reaches applyResult", async function () {
    const root = await createPassThroughWorkflowRoot();
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "pass-through-local-test",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through E2E Parent" },
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

    const parentItem = Zotero.Items.get(parent.id)!;
    const notes = parentItem.getNotes();
    assert.isAtLeast(notes.length, 1);
    const newest = Zotero.Items.get(notes[notes.length - 1])!;
    assert.match(newest.getNote(), /data-zs-pass-through='ok'/);
    assert.match(newest.getNote(), /parent|mixed|child|attachment|note/);
  });

  it("emits trigger-start and completion toast notifications during execution", async function () {
    const root = await createPassThroughWorkflowRoot();
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "pass-through-local-test",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through Toast Parent" },
    });
    const toasts: string[] = [];
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      changeLine() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
    };

    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow: workflow!,
      });
    } finally {
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.isAtLeast(toasts.length, 2);
    assert.isFalse(
      toasts.some((entry) => /Example Shortcuts/i.test(entry)),
      `unexpected template reminder toast: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some((entry) => /Workflow .*started\. jobs=\d+/i.test(entry)),
      `missing start toast in: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some(
        (entry) =>
          /job 1\/1 succeeded/i.test(entry) ||
          /succeeded=1, failed=0/i.test(entry),
      ),
      `missing completion toast in: ${JSON.stringify(toasts)}`,
    );
  });

  it("falls back to addon.data.ztoolkit when globalThis.ztoolkit is unavailable", async function () {
    const root = await createPassThroughWorkflowRoot();
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "pass-through-local-test",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Pass Through Toast Fallback Parent" },
    });
    const toasts: string[] = [];

    const runtime = globalThis as {
      ztoolkit?: Record<string, unknown>;
      addon?: {
        data?: {
          config?: { addonName?: string };
          ztoolkit?: Record<string, unknown>;
        };
      };
    };
    const previousGlobalToolkit = runtime.ztoolkit;
    const previousAddon = runtime.addon;
    const previousAddonToolkit = runtime.addon?.data?.ztoolkit;

    delete runtime.ztoolkit;
    runtime.addon = runtime.addon || { data: {} };
    runtime.addon.data = runtime.addon.data || {};
    runtime.addon.data.config = runtime.addon.data.config || {};
    if (!runtime.addon.data.config.addonName) {
      runtime.addon.data.config.addonName = "Zotero Agents";
    }
    runtime.addon.data.ztoolkit = runtime.addon.data.ztoolkit || {};
    const originalProgressWindow = runtime.addon.data.ztoolkit.ProgressWindow;
    runtime.addon.data.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      changeLine() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
    };

    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow: workflow!,
      });
    } finally {
      if (typeof originalProgressWindow === "undefined") {
        delete runtime.addon!.data!.ztoolkit!.ProgressWindow;
      } else {
        runtime.addon!.data!.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
      if (typeof previousGlobalToolkit === "undefined") {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit = previousGlobalToolkit;
      }
      if (previousAddon === runtime.addon) {
        runtime.addon!.data!.ztoolkit = previousAddonToolkit;
      } else {
        runtime.addon = previousAddon;
      }
    }

    assert.isTrue(
      toasts.some(
        (entry) =>
          /Workflow .*started\. jobs=\d+/i.test(entry) ||
          /Workflow .*已开始执行，任务数=\d+/.test(entry) ||
          /workflow-execute-toast-start/i.test(entry),
      ),
      `missing start toast in fallback mode: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some(
        (entry) =>
          /job 1\/1 succeeded/i.test(entry) ||
          /任务 1\/1 成功/.test(entry) ||
          /workflow-execute-toast-job-success/i.test(entry) ||
          /succeeded=1, failed=0/i.test(entry) ||
          /成功=1，失败=0/.test(entry) ||
          /workflow-execute-summary/i.test(entry),
      ),
      `missing completion toast in fallback mode: ${JSON.stringify(toasts)}`,
    );
  });
});

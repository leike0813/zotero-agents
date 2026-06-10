import { assert } from "chai";
import { config } from "../../package.json";
import { handlers } from "../../src/handlers";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { isFullTestMode } from "./testMode";
import {
  fixturePath,
  joinPath,
  mkTempDir,
  writeUtf8,
} from "./workflow-test-utils";

const MOCK_BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.ZOTERO_TEST_SKILLRUNNER_ENDPOINT) ||
  "http://127.0.0.1:8030";

async function isMockReachable(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetch(`${baseUrl}/v1/jobs`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function createGenericWorkflowRoot() {
  const workflowsDir = await mkTempDir("zotero-skills-generic-http");
  const root = joinPath(workflowsDir, "generic-http-echo");

  await writeUtf8(
    joinPath(root, "workflow.json"),
    JSON.stringify(
      {
        id: "generic-http-echo",
        label: "Generic HTTP Echo",
        provider: "generic-http",
        inputs: {
          unit: "attachment",
          accepts: {
            mime: ["text/markdown", "text/x-markdown", "text/plain"],
          },
          per_parent: {
            min: 1,
            max: 1,
          },
        },
        request: {
          kind: "generic-http.request.v1",
          http: {
            method: "POST",
            path: "/v1/generic-http/echo",
            json: {
              source: "workflow-generic-http-e2e",
            },
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
    joinPath(root, "hooks", "applyResult.js"),
    `
export async function applyResult({ parent, runResult, runtime }) {
  const payload = runResult?.resultJson || {};
  const note = await runtime.handlers.parent.addNote(parent, {
    content: "<h1>Generic HTTP Echo</h1><pre>" + JSON.stringify(payload, null, 2) + "</pre>",
  });
  return { note };
}
`.trim(),
  );

  return workflowsDir;
}

const describeGenericHttpE2ESuite = isFullTestMode() ? describe : describe.skip;

describeGenericHttpE2ESuite("generic-http provider: e2e", function () {
  this.timeout(30000);
  const backendsConfigPrefKey = `${config.prefsPrefix}.backendsConfigJson`;
  let prevBackendsConfigPref: unknown;

  beforeEach(function () {
    prevBackendsConfigPref = Zotero.Prefs.get(backendsConfigPrefKey, true);
    Zotero.Prefs.set(
      backendsConfigPrefKey,
      JSON.stringify({
        backends: [
          {
            id: "skillrunner-local",
            type: "skillrunner",
            baseUrl: MOCK_BASE_URL,
            auth: { kind: "none" },
            defaults: {
              headers: {},
              timeout_ms: 600000,
            },
          },
          {
            id: "generic-http-local",
            type: "generic-http",
            baseUrl: MOCK_BASE_URL,
            auth: { kind: "none" },
            defaults: {
              headers: {},
              timeout_ms: 600000,
            },
          },
        ],
      }),
      true,
    );
  });

  afterEach(function () {
    if (typeof prevBackendsConfigPref === "undefined") {
      Zotero.Prefs.clear(backendsConfigPrefKey, true);
    } else {
      Zotero.Prefs.set(backendsConfigPrefKey, prevBackendsConfigPref, true);
    }
  });

  it("runs workflow end-to-end and applies result note using generic-http provider", async function () {
    if (!(await isMockReachable(MOCK_BASE_URL))) {
      this.skip();
    }

    const workflowsDir = await createGenericWorkflowRoot();
    const loaded = await loadWorkflowManifests(workflowsDir);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "generic-http-echo",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Generic HTTP Provider Parent" },
    });
    const mdFile = fixturePath("literature-digest", "example.md");
    const attachment = await handlers.attachment.createFromPath({
      parent,
      path: mdFile,
      title: "generic-http-e2e.md",
      mimeType: "text/markdown",
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
      startCloseTimer() {
        return this;
      }
      close() {
        return this;
      }
    };
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [attachment],
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

    assert.isTrue(
      toasts.some(
        (entry) =>
          /Workflow Generic HTTP Echo finished\./.test(entry) &&
          /succeeded=1, failed=0/.test(entry),
      ),
      `missing summary toast: ${JSON.stringify(toasts)}`,
    );

    const noteIDs = parent.getNotes();
    assert.lengthOf(noteIDs, 1);
    const note = Zotero.Items.get(noteIDs[0])!;
    assert.match(note.getNote(), /<h1>Generic HTTP Echo<\/h1>/);
    assert.match(note.getNote(), /"provider":\s*"generic-http"/);
    assert.match(note.getNote(), /"source":\s*"workflow-generic-http-e2e"/);
  });
});

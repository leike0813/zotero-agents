import {
  builtinPiBackendInstance,
  createBackendsPrefsDocument,
  loadBackendsRegistry,
} from "../../src/backends/registry";
import { BUILTIN_PI_BACKEND_ID } from "../../src/config/defaults";
import { getPiSkillRunCoordinator } from "../../src/modules/piSkillRun";
import {
  ensureRuntimeDirectoryStrict,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflow/ui/workflowExecute";
import { joinNativePath } from "../../src/platform/path";
import { getPref, setPref } from "../../src/utils/prefs";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { readDiagnosticsEnv } from "../zotero/testDiagnosticsOutput";

/** Deterministic Auto fixture identity, shared with the C20 PI family. */
export const PI_CAPACITY_AUTO_WORKFLOW_ID = "pi-capacity-auto";
export const PI_CAPACITY_SKILL_ID = "pi-capacity-auto";

/** Controlled fixture directory holding the installed local Auto workflow. */
export const PI_CAPACITY_WORKFLOW_DIR_ENV = "ZOTERO_PI_CAPACITY_WORKFLOW_DIR";
/** Workflow id inside that fixture directory. */
export const PI_CAPACITY_AUTO_WORKFLOW_ENV = "ZOTERO_PI_CAPACITY_AUTO_WORKFLOW";

export type PiCapacityAutoDriver = {
  /** Admits one Auto run and resolves only on verified terminal success. */
  runOnce(): Promise<string>;
  dispose(): void;
};

const TERMINAL = new Set(["succeeded", "failed", "canceled"]);
const POLL_INTERVAL_MS = 500;
const ADMISSION_ATTEMPTS = 120;
const TERMINAL_ATTEMPTS = 2_400;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Writes the run-owned Auto fixture: one controlled skill package whose prompt
 * carries the shared mock's `submit_skill_result` marker, plus the declarative
 * workflow that admits it. No user or externally installed skill is involved.
 */
export async function createPiCapacityFixture(args: { root: string }) {
  const skillsRoot = joinNativePath(args.root, "skills");
  const skillRoot = joinNativePath(skillsRoot, PI_CAPACITY_SKILL_ID);
  await ensureRuntimeDirectoryStrict(joinNativePath(skillRoot, "assets"));
  const skillFiles: Record<string, string> = {
    "SKILL.md":
      "---\nname: pi-capacity-auto\ndescription: Deterministic capacity probe.\n---\n\n# Pi Capacity Auto\n\n[system-e2e:capacity] [system-e2e:tool:submit_skill_result]\n",
    "assets/runner.json": JSON.stringify(
      {
        id: PI_CAPACITY_SKILL_ID,
        name: "Pi Capacity Auto",
        description: "Deterministic capacity probe.",
        version: "0.1.0",
        execution_modes: ["auto", "interactive"],
        schemas: {
          input: "assets/input.schema.json",
          parameter: "assets/parameter.schema.json",
          output: "assets/output.schema.json",
        },
        entrypoint: {
          prompts: {
            common:
              "Capacity probe. [system-e2e:capacity] [system-e2e:tool:submit_skill_result]",
          },
        },
      },
      null,
      2,
    ),
    "assets/input.schema.json": JSON.stringify({
      type: "object",
      additionalProperties: true,
    }),
    "assets/parameter.schema.json": JSON.stringify({
      type: "object",
      additionalProperties: true,
    }),
    "assets/output.schema.json": JSON.stringify({
      type: "object",
      properties: { ok: { type: "boolean" } },
      required: ["ok"],
      additionalProperties: true,
    }),
  };
  for (const [relative, content] of Object.entries(skillFiles))
    await writeRuntimeTextFile(
      joinNativePath(skillRoot, ...relative.split("/")),
      content,
    );
  const workflowDir = joinNativePath(args.root, "workflows");
  const workflowRoot = joinNativePath(
    workflowDir,
    PI_CAPACITY_AUTO_WORKFLOW_ID,
  );
  await ensureRuntimeDirectoryStrict(workflowRoot);
  await ensureRuntimeDirectoryStrict(joinNativePath(workflowRoot, "hooks"));
  await writeRuntimeTextFile(
    joinNativePath(workflowRoot, "hooks", "applyResult.js"),
    "export async function applyResult() {\n  return { ok: true };\n}\n",
  );
  await writeRuntimeTextFile(
    joinNativePath(workflowRoot, "workflow.json"),
    JSON.stringify(
      {
        schemaVersion: 2,
        id: PI_CAPACITY_AUTO_WORKFLOW_ID,
        label: "Pi Capacity Auto",
        description: "Capacity mixed-load Auto probe.",
        executionModes: ["auto"],
        version: "0.1.0",
        provider: "skillrunner",
        trigger: { requiresSelection: false },
        inputs: { member: { kind: "selection" }, grouping: { mode: "all" } },
        validateSelection: { select: { policy: "selection" }, filters: [] },
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: PI_CAPACITY_SKILL_ID,
            mode: "auto",
            skill_source: "installed",
          },
        },
        execution: { feedback: { showNotifications: false } },
        result: { fetch: { type: "result" } },
        hooks: { applyResult: "hooks/applyResult.js" },
      },
      null,
      2,
    ),
  );
  return {
    skillsRoot,
    workflowDir,
    workflowId: PI_CAPACITY_AUTO_WORKFLOW_ID,
  };
}

/**
 * Perf-owned Auto driver shared with the C20 PI family (PI-03/PI-04). It uses
 * only the public admission path: register the canonical Built-in Pi backend
 * when the registry does not already supply it, run a controlled Auto workflow
 * through `executeWorkflowFromCurrentSelection`, then observe the owner with
 * `readModel`. Success requires a succeeded status, a succeeded outcome, a
 * succeeded apply receipt and a terminal ack; missing, failed or canceled runs
 * raise instead of passing.
 */
export function createPiCapacityAutoDriver(args: {
  win: _ZoteroTypes.MainWindow;
  /** Controlled fixture directory; defaults to the env-provided one. */
  workflowDir?: string;
  /** Workflow id inside that directory; defaults to the env-provided one. */
  workflowId?: string;
  retainOwner?: boolean;
}): PiCapacityAutoDriver {
  const workflowDir =
    args.workflowDir || readDiagnosticsEnv(PI_CAPACITY_WORKFLOW_DIR_ENV);
  const workflowId =
    args.workflowId || readDiagnosticsEnv(PI_CAPACITY_AUTO_WORKFLOW_ENV);
  let restorePref: (() => void) | undefined;
  // Concurrent runs would race the owner-list diff, so one admission is
  // tracked at a time; caller concurrency is preserved elsewhere.
  let tail: Promise<unknown> = Promise.resolve();

  async function resolveAutoWorkflow() {
    if (!workflowDir || !workflowId)
      throw new Error("pi_capacity_auto_workflow_unavailable");
    const loaded = await loadWorkflowManifests(workflowDir);
    const workflow = loaded.workflows.find(
      (entry) =>
        entry.manifest.id === workflowId &&
        entry.manifest.request?.kind === "skillrunner.job.v1",
    );
    if (!workflow) throw new Error("pi_capacity_auto_workflow_unavailable");
    return workflow;
  }

  async function ensureBuiltinPiBackend() {
    if (restorePref) return;
    const configured = await loadBackendsRegistry();
    const supplied = configured.fatalError
      ? false
      : configured.backends.some((entry) => entry.id === BUILTIN_PI_BACKEND_ID);
    if (supplied) return;
    const previous = String(getPref("backendsConfigJson") || "");
    setPref(
      "backendsConfigJson",
      JSON.stringify(createBackendsPrefsDocument([builtinPiBackendInstance()])),
    );
    restorePref = () => setPref("backendsConfigJson", previous);
  }

  async function admitOnce() {
    const workflow = await resolveAutoWorkflow();
    await ensureBuiltinPiBackend();
    const coordinator = getPiSkillRunCoordinator();
    const before = new Set(
      (await coordinator.list()).map((run) => run.requestId),
    );
    const execution = executeWorkflowFromCurrentSelection({
      win: args.win,
      workflow,
      executionOptionsOverride: { backendId: BUILTIN_PI_BACKEND_ID },
    });
    // UI execution awaits completion. Keep it running while locating this
    // admission, then unlock so the workload can admit another Auto owner.
    void execution.catch(() => undefined);
    let requestId: string | undefined;
    for (let attempt = 0; attempt < ADMISSION_ATTEMPTS; attempt += 1) {
      requestId = (await coordinator.list()).find(
        (run) => !before.has(run.requestId),
      )?.requestId;
      if (requestId) break;
      await sleep(POLL_INTERVAL_MS);
    }
    if (!requestId) throw new Error("pi_capacity_auto_run_missing");
    return { requestId, execution };
  }

  async function observeTerminal(requestId: string, execution: Promise<void>) {
    const coordinator = getPiSkillRunCoordinator();
    for (let attempt = 0; attempt < TERMINAL_ATTEMPTS; attempt += 1) {
      const model = await coordinator.readModel(requestId);
      if (!TERMINAL.has(model.status)) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      if (model.status !== "succeeded" || model.outcome?.status !== "succeeded")
        throw new Error("pi_capacity_auto_run_not_settled");
      await execution;
      const applied = await coordinator.readModel(requestId);
      if (applied.applyReceipt?.status !== "succeeded" || !applied.terminalAck)
        throw new Error("pi_capacity_auto_run_not_settled");
      if (!args.retainOwner) {
        await coordinator.archive(requestId);
        const cleanup = await coordinator.deleteRun(requestId);
        if (cleanup.status !== "deleted")
          throw new Error("pi_capacity_auto_cleanup_pending");
      }
      return;
    }
    throw new Error("pi_capacity_auto_run_timeout");
  }

  return {
    async runOnce() {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      let admitted: Awaited<ReturnType<typeof admitOnce>>;
      try {
        admitted = await admitOnce();
      } finally {
        release();
      }
      await observeTerminal(admitted.requestId, admitted.execution);
      return admitted.requestId;
    },
    dispose() {
      restorePref?.();
      restorePref = undefined;
    },
  };
}

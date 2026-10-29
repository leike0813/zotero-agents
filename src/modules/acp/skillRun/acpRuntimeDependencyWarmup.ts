import type { BackendInstance } from "../../../backends/types";
import { listBackendInstances } from "../../../backends/registry";
import { compatibleBackendTypesForManifest } from "../../../workflows/manifestContract";
import type { LoadedWorkflow } from "../../../workflows/types";
import { appendRuntimeLog } from "../../runtimeLogManager";
import {
  ensureRuntimeDirectory,
  getRuntimePersistencePaths,
  readRuntimeTextFile,
} from "../../runtimePersistence";
import { getCachedRuntimeCommand } from "../../../platform/command";
import { joinPath } from "../../../utils/path";
import { createCancellationController } from "../../../utils/wait";
import { getPrefName } from "../../../utils/prefs";
import {
  defaultAcpRuntimeDependencyProbe,
  resolveSkillRuntimeDependencies,
} from "./acpRuntimeDependencyWrapper";
import { ACP_DEPENDENCY_PREPARATION_TIMEOUT_MS } from "./acpRuntimeDependencyPreparation";
import {
  collectWorkflowSkillDependencies,
  getWorkflowDependencyCatalog,
  subscribeWorkflowRegistryChanges,
  type WorkflowDependencyCatalog,
} from "../../workflow/catalog/workflowRuntime";

export type { WorkflowDependencyCatalog } from "../../workflow/catalog/workflowRuntime";

type WarmupProbe = (args: {
  dependencies: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  background: true;
  noProject: true;
  signal: ReturnType<typeof createCancellationController>["signal"];
}) => Promise<{ ok: boolean; summary?: string }>;

export type AcpRuntimeDependencyWarmupRuntime = {
  getCatalog: () => WorkflowDependencyCatalog | null;
  subscribeCatalogChanges: (
    listener: (catalog: WorkflowDependencyCatalog) => void,
  ) => () => void;
  subscribeBackendChanges: (listener: () => void) => () => void;
  listBackendInstances: () => Promise<BackendInstance[]>;
  hasUv: () => boolean;
  getManagedWorkdir: () => string;
  ensureWorkdir: (path: string) => Promise<unknown> | unknown;
  readRunnerJson: (path: string) => Promise<unknown>;
  compatibleBackendTypes: typeof compatibleBackendTypesForManifest;
  collectWorkflowSkillDependencies: (entry: LoadedWorkflow) => string[];
  resolveDependencies: typeof resolveSkillRuntimeDependencies;
  prepare: WarmupProbe;
  log: (entry: {
    level: "info" | "warn";
    message: string;
    details?: unknown;
  }) => void;
};

type WarmupJob = {
  backendId: string;
  workflowId: string;
  dependencies: string[];
  env: Record<string, string>;
  cwd: string;
};

const STOP_DRAIN_TIMEOUT_MS = 2_000;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function boundedText(value: unknown) {
  const text = normalizeString(value);
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

function normalizeEnvironment(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeDependencies(value: unknown) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : []).map(normalizeString).filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function jobKey(job: WarmupJob) {
  return JSON.stringify([job.dependencies, job.env, job.cwd]);
}

function subscribeBackendPreferenceChanges(listener: () => void) {
  const prefs = Zotero.Prefs;
  if (
    typeof prefs?.registerObserver !== "function" ||
    typeof prefs?.unregisterObserver !== "function"
  ) {
    return () => undefined;
  }
  const token = prefs.registerObserver(
    getPrefName("backendsConfigJson"),
    listener,
    true,
  );
  return () => prefs.unregisterObserver(token);
}

function createProductionRuntime(): AcpRuntimeDependencyWarmupRuntime {
  return {
    getCatalog: getWorkflowDependencyCatalog,
    subscribeCatalogChanges: subscribeWorkflowRegistryChanges,
    subscribeBackendChanges: subscribeBackendPreferenceChanges,
    listBackendInstances,
    hasUv: () => {
      const uv = getCachedRuntimeCommand("uv");
      return !!uv?.available && !!uv.resolvedPath;
    },
    getManagedWorkdir: () =>
      joinPath(
        getRuntimePersistencePaths().runtimeRoot,
        "cache",
        "acp-dependencies",
      ),
    ensureWorkdir: ensureRuntimeDirectory,
    readRunnerJson: async (path) => {
      const text = await readRuntimeTextFile(path);
      if (!text.trim()) return null;
      return JSON.parse(text);
    },
    compatibleBackendTypes: compatibleBackendTypesForManifest,
    collectWorkflowSkillDependencies,
    resolveDependencies: resolveSkillRuntimeDependencies,
    prepare: defaultAcpRuntimeDependencyProbe,
    log: ({ level, message, details }) =>
      appendRuntimeLog({
        scope: "system",
        level,
        component: "acp-runtime-dependency-warmup",
        stage: "background-warmup",
        message,
        details,
      }),
  };
}

export function createAcpRuntimeDependencyWarmupOwner(
  runtime: AcpRuntimeDependencyWarmupRuntime,
) {
  let started = false;
  let stopped = false;
  let dirty = false;
  let generation = 0;
  let drainPromise: Promise<void> | undefined;
  let unsubscribeCatalog: (() => void) | undefined;
  let unsubscribeBackend: (() => void) | undefined;
  const controllers = new Set<
    ReturnType<typeof createCancellationController>
  >();

  function invalidate() {
    if (!started || stopped) return;
    generation += 1;
    dirty = true;
    for (const controller of controllers) {
      try {
        controller.abort();
      } catch {
        // Keep canceling independent background waiters if one listener throws.
      }
    }
    controllers.clear();
    scheduleDrain();
  }

  function scheduleDrain() {
    if (drainPromise || stopped) return;
    const pending = drain()
      .catch((error) => {
        safeLog({
          level: "warn",
          message: "ACP runtime dependency warmup reconciliation failed.",
          details: {
            reason: boundedText(
              error instanceof Error ? error.message : String(error),
            ),
          },
        });
      })
      .finally(() => {
        if (drainPromise === pending) drainPromise = undefined;
        if (dirty && !stopped) scheduleDrain();
      });
    drainPromise = pending;
  }

  function safeLog(entry: Parameters<typeof runtime.log>[0]) {
    try {
      runtime.log(entry);
    } catch {
      // Diagnostics must not own warmup progress or shutdown.
    }
  }

  function safeSubscribe(
    subscribe: (listener: () => void) => () => void,
    source: string,
  ) {
    try {
      const unsubscribe = subscribe(() => invalidate());
      return typeof unsubscribe === "function" ? unsubscribe : undefined;
    } catch (error) {
      safeLog({
        level: "warn",
        message: `Could not subscribe to ACP runtime dependency ${source} changes.`,
        details: {
          reason: boundedText(
            error instanceof Error ? error.message : String(error),
          ),
        },
      });
      return undefined;
    }
  }

  function safeUnsubscribe(unsubscribe: (() => void) | undefined) {
    try {
      unsubscribe?.();
    } catch {
      // A failing observer cleanup must not block remaining shutdown work.
    }
  }

  function abortControllers() {
    for (const controller of controllers) {
      try {
        controller.abort();
      } catch {
        // Continue canceling the remaining waiters.
      }
    }
    controllers.clear();
  }

  async function waitForDrainBounded() {
    const pending = drainPromise;
    if (!pending) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, STOP_DRAIN_TIMEOUT_MS);
      void pending.then(finish, finish);
    });
  }

  function isCurrent(candidate: number) {
    return started && !stopped && generation === candidate;
  }

  async function makeJobs(
    catalog: WorkflowDependencyCatalog,
    backends: BackendInstance[],
    candidate: number,
  ) {
    const enabledAcp = backends.filter(
      (backend) => backend.type === "acp" && backend.enabled !== false,
    );
    if (!enabledAcp.length || !runtime.hasUv()) return [] as WarmupJob[];

    const cwd = runtime.getManagedWorkdir();
    await runtime.ensureWorkdir(cwd);
    if (!isCurrent(candidate)) return [] as WarmupJob[];

    const workflowsByBackend = catalog.workflows.filter((workflow) =>
      runtime.compatibleBackendTypes(workflow.manifest).includes("acp"),
    );
    const runnerJsonByPath = new Map<string, Promise<unknown>>();
    const jobs: WarmupJob[] = [];
    const seenJobs = new Set<string>();

    for (const workflow of workflowsByBackend) {
      if (!isCurrent(candidate)) break;
      const skillIds = runtime.collectWorkflowSkillDependencies(workflow);
      for (const rawSkillId of skillIds) {
        const skillId = normalizeString(rawSkillId);
        const skill = catalog.skills.entriesById[skillId];
        const runnerJsonPath = normalizeString(skill?.runnerJsonPath);
        if (!skill || !runnerJsonPath) continue;
        let runnerJson = runnerJsonByPath.get(runnerJsonPath);
        if (!runnerJson) {
          try {
            runnerJson = Promise.resolve(
              runtime.readRunnerJson(runnerJsonPath),
            );
          } catch (error) {
            runnerJson = Promise.reject(error);
          }
          runnerJsonByPath.set(runnerJsonPath, runnerJson);
        }
        let dependencies: string[];
        try {
          dependencies = normalizeDependencies(
            runtime.resolveDependencies(await runnerJson),
          );
        } catch (error) {
          if (isCurrent(candidate)) {
            safeLog({
              level: "warn",
              message:
                "Could not read an ACP workflow Skill dependency declaration.",
              details: {
                workflowId: workflow.manifest.id,
                skillId,
                reason: boundedText(
                  error instanceof Error ? error.message : String(error),
                ),
              },
            });
          }
          continue;
        }
        if (!dependencies.length || !isCurrent(candidate)) continue;

        for (const backend of enabledAcp) {
          const job: WarmupJob = {
            backendId: backend.id,
            workflowId: workflow.manifest.id,
            dependencies,
            env: normalizeEnvironment(backend.env),
            cwd,
          };
          const key = jobKey(job);
          if (seenJobs.has(key)) continue;
          seenJobs.add(key);
          jobs.push(job);
        }
      }
    }
    return jobs;
  }

  async function reconcile(candidate: number) {
    let catalog: WorkflowDependencyCatalog | null;
    let backends: BackendInstance[];
    try {
      [catalog, backends] = await Promise.all([
        Promise.resolve(runtime.getCatalog()),
        runtime.listBackendInstances(),
      ]);
    } catch (error) {
      if (isCurrent(candidate)) {
        safeLog({
          level: "warn",
          message: "Could not load ACP runtime dependency warmup inputs.",
          details: {
            reason: boundedText(
              error instanceof Error ? error.message : String(error),
            ),
          },
        });
      }
      return;
    }
    if (!catalog || !isCurrent(candidate)) return;

    let jobs: WarmupJob[];
    try {
      jobs = await makeJobs(catalog, backends, candidate);
    } catch (error) {
      if (isCurrent(candidate)) {
        safeLog({
          level: "warn",
          message: "Could not prepare ACP runtime dependency warmup inputs.",
          details: {
            reason: boundedText(
              error instanceof Error ? error.message : String(error),
            ),
          },
        });
      }
      return;
    }

    for (const job of jobs) {
      if (!isCurrent(candidate)) return;
      const controller = createCancellationController();
      controllers.add(controller);
      try {
        const result = await runtime.prepare({
          dependencies: job.dependencies,
          cwd: job.cwd,
          env: job.env,
          timeoutMs: ACP_DEPENDENCY_PREPARATION_TIMEOUT_MS,
          background: true,
          noProject: true,
          signal: controller.signal,
        });
        if (!isCurrent(candidate)) return;
        if (!result.ok) {
          safeLog({
            level: "warn",
            message:
              "ACP runtime dependency warmup failed; later Skills will still be attempted.",
            details: {
              backendId: job.backendId,
              workflowId: job.workflowId,
              dependencies: job.dependencies,
              summary: boundedText(result.summary),
            },
          });
        }
      } catch (error) {
        if (isCurrent(candidate)) {
          safeLog({
            level: "warn",
            message:
              "ACP runtime dependency warmup failed; later Skills will still be attempted.",
            details: {
              backendId: job.backendId,
              workflowId: job.workflowId,
              dependencies: job.dependencies,
              reason: boundedText(
                error instanceof Error ? error.message : String(error),
              ),
            },
          });
        }
      } finally {
        controllers.delete(controller);
      }
    }
  }

  async function drain() {
    while (dirty && !stopped) {
      dirty = false;
      const candidate = generation;
      await reconcile(candidate);
    }
  }

  function start() {
    if (started || stopped) return;
    started = true;
    unsubscribeCatalog = safeSubscribe(
      runtime.subscribeCatalogChanges,
      "workflow catalog",
    );
    unsubscribeBackend = safeSubscribe(
      runtime.subscribeBackendChanges,
      "backend configuration",
    );
    invalidate();
  }

  async function stop() {
    if (stopped) {
      await waitForDrainBounded();
      return;
    }
    stopped = true;
    generation += 1;
    dirty = false;
    safeUnsubscribe(unsubscribeCatalog);
    safeUnsubscribe(unsubscribeBackend);
    unsubscribeCatalog = undefined;
    unsubscribeBackend = undefined;
    abortControllers();
    await waitForDrainBounded();
  }

  return { start, stop };
}

let productionOwner:
  | ReturnType<typeof createAcpRuntimeDependencyWarmupOwner>
  | undefined;

export function startAcpRuntimeDependencyWarmup() {
  if (productionOwner) return;
  productionOwner = createAcpRuntimeDependencyWarmupOwner(
    createProductionRuntime(),
  );
  productionOwner.start();
}

export async function stopAcpRuntimeDependencyWarmup() {
  const owner = productionOwner;
  productionOwner = undefined;
  await owner?.stop();
}

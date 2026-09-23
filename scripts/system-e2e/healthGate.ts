import { config } from "../../package.json";
import {
  rebuildSynthesisProductionDiscovery,
  rebuildSynthesisSidecarLaunchConfig,
} from "../../packages/synthesis-contracts/src";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarRuntimePaths,
  listRuntimeChildDirectories,
  readRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { listMutationOperations } from "../../src/modules/zoteroHostMutationAuthority";
import { detectRuntimePlatform } from "../../src/platform/runtimePlatform";
import { executeOneShotSubprocess } from "../../src/platform/subprocess";
import { joinPath } from "../../src/utils/path";

type SidecarDiscovery = ReturnType<typeof rebuildSynthesisProductionDiscovery>;

export type SystemE2ESidecarOperationLister = () => Promise<{
  rows: Array<{ operationId: string; status: string }>;
}>;

const SIDECAR_TERMINAL_OPERATION_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "canceled",
  "timed_out",
]);

export async function waitUntil<Value>(
  read: () => Value | null | undefined | Promise<Value | null | undefined>,
  timeoutMs = 120_000,
  label = "",
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await Zotero.Promise.delay(50);
  }
  throw new Error(
    label
      ? `system_e2e_condition_not_reached:${label}`
      : "system_e2e_condition_not_reached",
  );
}

export async function assertRemainsStable(
  check: () => boolean | Promise<boolean>,
  description: string,
  windowMs = 2_000,
) {
  const deadline = Date.now() + windowMs;
  do {
    if (!(await check())) {
      throw new Error(`system_e2e_stability_violated:${description}`);
    }
    await Zotero.Promise.delay(50);
  } while (Date.now() < deadline);
}

export async function processIsAlive(pid: number) {
  if (detectRuntimePlatform() === "win32") {
    const result = await executeOneShotSubprocess({
      command: "tasklist.exe",
      args: ["/FI", `PID eq ${pid}`, "/NH"],
      timeoutMs: 10_000,
    });
    return (
      result.outcome === "exited" &&
      result.exitCode === 0 &&
      new RegExp(`\\b${pid}\\b`).test(result.stdout)
    );
  }
  const result = await executeOneShotSubprocess({
    command: "/bin/kill",
    args: ["-0", String(pid)],
    timeoutMs: 10_000,
  });
  return result.outcome === "exited" && result.exitCode === 0;
}

export async function terminateProcess(pid: number) {
  const result =
    detectRuntimePlatform() === "win32"
      ? await executeOneShotSubprocess({
          command: "taskkill.exe",
          args: ["/PID", String(pid), "/F"],
          timeoutMs: 10_000,
        })
      : await executeOneShotSubprocess({
          command: "/bin/kill",
          args: ["-KILL", String(pid)],
          timeoutMs: 10_000,
        });
  if (result.outcome === "exited" && result.exitCode === 0) {
    // A kill tool reports success once it has delivered the request, so the
    // generation is only evidence-backed terminated once it is observably gone.
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (!(await processIsAlive(pid))) {
        return;
      }
      await Zotero.Promise.delay(50);
    }
    throw new Error(`system_e2e_terminate_survived:${pid}`);
  }
  // A generation that already exited is terminated too: both kill tools report
  // that case as a non-zero "no such process", and the checkpoint-driven
  // crashes can win the race against the explicit termination.
  if (!(await processIsAlive(pid))) {
    return;
  }
  throw new Error(
    `system_e2e_terminate_failed:${pid}:${result.outcome}:${String(result.exitCode)}:${result.stderr.trim()}`,
  );
}

export type SidecarDiscoveryEntry = {
  discovery: SidecarDiscovery;
  path: string;
};

export async function listSidecarDiscoveries() {
  const runtime = getSynthesisSidecarRuntimePaths(
    getRuntimePersistencePaths().runtimeRoot,
  );
  const found: SidecarDiscoveryEntry[] = [];
  for (const profileRoot of await listRuntimeChildDirectories(
    runtime.profilesDir,
  )) {
    for (const sessionRoot of await listRuntimeChildDirectories(
      joinPath(profileRoot, "sessions"),
    )) {
      const path = joinPath(sessionRoot, "discovery.json");
      try {
        const source = await readRuntimeTextFile(path);
        if (source) {
          found.push({
            discovery: rebuildSynthesisProductionDiscovery(JSON.parse(source)),
            path,
          });
        }
      } catch {
        // Session cleanup may win between listing and reading.
      }
    }
  }
  return found;
}

function parentPath(path: string) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

async function listSidecarOperationsViaEphemeralClient(found: {
  discovery: SidecarDiscovery;
  path: string;
}) {
  const sessionRoot = parentPath(found.path);
  const source = await readRuntimeTextFile(
    joinPath(sessionRoot, "config.json"),
  );
  const launch = rebuildSynthesisSidecarLaunchConfig(JSON.parse(source));
  const composition = createNativeSynthesisClientComposition({
    getReadyConnection: () => ({
      discovery: {
        host: found.discovery.host,
        port: found.discovery.port,
        profileId: found.discovery.profileId,
        serviceInstanceId: found.discovery.serviceInstanceId,
      },
      clientToken: launch.clientToken,
    }),
  });
  try {
    return await composition.client.debug.listOperations({ limit: 100 });
  } finally {
    await composition.dispose();
  }
}

export async function observeSystemE2EHealth(args?: {
  residualOwnedState?: string[];
  exemptSidecarOperationIds?: string[];
  exemptMutationOperationIds?: string[];
  listSidecarOperations?: SystemE2ESidecarOperationLister;
}) {
  const plugin = (Zotero as any)[config.addonInstance];
  const runtime = getSynthesisSidecarRuntimePaths(
    getRuntimePersistencePaths().runtimeRoot,
  );
  const manifest = JSON.parse(
    await IOUtils.readUTF8(PathUtils.join(runtime.currentDir, "manifest.json")),
  );
  const found = await listSidecarDiscoveries();
  const sidecarReady =
    found.length === 1 &&
    found[0].discovery.lifecycleState === "ready" &&
    found[0].discovery.bundleId === manifest.bundleId;

  let aliveDiscoveries = 0;
  for (const entry of found) {
    if (await processIsAlive(entry.discovery.pid)) {
      aliveDiscoveries += 1;
    }
  }

  let status: "passed" | "indeterminate" = "passed";
  let pendingSidecar = 0;
  if (sidecarReady) {
    const exemptSidecar = new Set(args?.exemptSidecarOperationIds || []);
    const operations = args?.listSidecarOperations
      ? await args.listSidecarOperations()
      : await listSidecarOperationsViaEphemeralClient(found[0]);
    pendingSidecar = operations.rows.filter(
      (operation) =>
        !SIDECAR_TERMINAL_OPERATION_STATUSES.has(operation.status) &&
        !exemptSidecar.has(operation.operationId),
    ).length;
  } else {
    status = "indeterminate";
  }
  const exemptMutation = new Set(args?.exemptMutationOperationIds || []);
  const pendingMutations = (
    await listMutationOperations({ scope: { ownerId: "host-bridge" } })
  ).filter(
    (entry) =>
      entry.state === "started" && !exemptMutation.has(entry.operationId),
  ).length;
  const undeclaredOperations = pendingSidecar + pendingMutations;

  return {
    status,
    hostResponsive: Boolean(
      Zotero.getMainWindow() && !Zotero.getMainWindow().closed,
    ),
    pluginResponsive: Boolean(plugin?.data?.initialized),
    sidecarReady,
    undeclaredOperations,
    managedProcesses: Math.max(0, aliveDiscoveries - (sidecarReady ? 1 : 0)),
    residualOwnedState: args?.residualOwnedState || [],
  };
}

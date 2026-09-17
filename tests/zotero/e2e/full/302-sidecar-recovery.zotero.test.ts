import { assert } from "chai";
import { config } from "../../../../package.json";
import {
  rebuildSynthesisProductionDiscovery,
  rebuildSynthesisSidecarLaunchConfig,
  type SynthesisPublicMaintenanceOperation,
} from "../../../../packages/synthesis-contracts/src";
import { runFamilyLifecycle } from "../../../../scripts/system-e2e/familyLifecycle";
import {
  getRuntimePersistencePaths,
  getSynthesisSidecarRuntimePaths,
  listRuntimeChildDirectories,
  readRuntimeTextFile,
  runtimePathExists,
} from "../../../../src/modules/runtimePersistence";
import { detectRuntimePlatform } from "../../../../src/platform/runtimePlatform";
import { executeOneShotSubprocess } from "../../../../src/platform/subprocess";
import { joinPath } from "../../../../src/utils/path";
import { createNativeSynthesisClientComposition } from "../../../../src/modules/synthesisClient/nativeComposition";
import { emitZoteroTestDebug } from "../../diagnosticBridge";

type Discovery = ReturnType<typeof rebuildSynthesisProductionDiscovery>;

async function waitUntil<Value>(
  read: () => Value | null | undefined | Promise<Value | null | undefined>,
  timeoutMs = 120_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await Zotero.Promise.delay(50);
  }
  throw new Error("system_e2e_condition_not_reached");
}

async function discoveries() {
  const runtime = getSynthesisSidecarRuntimePaths(
    getRuntimePersistencePaths().runtimeRoot,
  );
  const found: Array<{ discovery: Discovery; path: string }> = [];
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

async function readyDiscovery(excludedServiceInstanceId?: string) {
  return (await discoveries()).find(
    ({ discovery }) =>
      discovery.lifecycleState === "ready" &&
      discovery.serviceInstanceId !== excludedServiceInstanceId,
  );
}

function parentPath(path: string) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

async function clientFor(found: { discovery: Discovery; path: string }) {
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
  return { ...composition, sessionRoot };
}

async function checkpointPath(
  sessionRoot: string,
  name: string,
  state: "armed" | "held" | "release",
) {
  const root = joinPath(sessionRoot, "test-checkpoints");
  await IOUtils.makeDirectory(root, { createAncestors: true });
  return joinPath(root, `${name}.${state}`);
}

async function armCheckpoint(sessionRoot: string, name: string) {
  const path = await checkpointPath(sessionRoot, name, "armed");
  await IOUtils.writeUTF8(path, "");
}

async function releaseCheckpoint(sessionRoot: string, name: string) {
  const path = await checkpointPath(sessionRoot, name, "release");
  await IOUtils.writeUTF8(path, "");
}

async function waitForCheckpoint(sessionRoot: string, name: string) {
  const path = await checkpointPath(sessionRoot, name, "held");
  await waitUntil(async () => ((await IOUtils.exists(path)) ? path : null));
}

async function removeCheckpointFiles(sessionRoot: string, name: string) {
  for (const state of ["armed", "held", "release"] as const) {
    await IOUtils.remove(await checkpointPath(sessionRoot, name, state), {
      ignoreAbsent: true,
    });
  }
}

async function waitForTerminal(
  client: Awaited<ReturnType<typeof clientFor>>["client"],
  accepted: SynthesisPublicMaintenanceOperation,
) {
  return waitUntil(async () => {
    const operation = await client.maintenance.getOperation({
      operation_id: accepted.operation_id,
    });
    return operation.status === "pending" || operation.status === "running"
      ? null
      : operation;
  });
}

function diagnosticCodes(operation: SynthesisPublicMaintenanceOperation) {
  const receipt = operation.receipt;
  return receipt &&
    "diagnostics" in receipt &&
    Array.isArray(receipt.diagnostics)
    ? receipt.diagnostics.map((entry) => entry.code)
    : [];
}

async function createSyntheticReferences(prefix: string) {
  const items: Zotero.Item[] = [];
  for (let index = 0; index < 101; index += 1) {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", `${prefix} ${index}`);
    item.setField("date", "2026");
    await item.saveTx();
    items.push(item);
  }
  return items;
}

async function eraseItems(items: Zotero.Item[]) {
  await (Zotero.Items as any).erase(
    items.map((item) => item.id).filter(Boolean),
  );
  items.length = 0;
}

async function processIsAlive(pid: number) {
  const result = await executeOneShotSubprocess({
    command: "/bin/kill",
    args: ["-0", String(pid)],
    timeoutMs: 10_000,
  });
  return result.outcome === "exited" && result.exitCode === 0;
}

async function observeHealth(residualOwnedState: string[] = []) {
  const plugin = (Zotero as any)[config.addonInstance];
  const ready = await discoveries();
  return {
    status: "passed" as const,
    hostResponsive: Boolean(
      Zotero.getMainWindow() && !Zotero.getMainWindow().closed,
    ),
    pluginResponsive: Boolean(plugin?.data?.initialized),
    sidecarReady:
      ready.length === 1 && ready[0].discovery.lifecycleState === "ready",
    undeclaredOperations: 0,
    managedProcesses: 0,
    residualOwnedState,
  };
}

async function emitCase(args: {
  caseId: string;
  result: Awaited<ReturnType<typeof runFamilyLifecycle>>;
  publicOutcome?: string;
  evidence?: Array<Record<string, unknown>>;
}) {
  await emitZoteroTestDebug({
    kind: "system-e2e-family-result",
    family: {
      familyId: "synthesis-sidecar-recovery",
      caseId: args.caseId,
      result: args.result.result,
      publicOutcome: args.publicOutcome,
      failureCode: args.result.abortCode,
      typedEvidence: args.evidence || [],
      lifecycle: args.result.transitions.map((checkpoint) => ({
        checkpoint,
        outcome: "completed",
      })),
      cleanup: args.result.cleanup,
      health: args.result.health,
      artifacts: [],
    },
  });
}

describe("System E2E sidecar recovery", function () {
  this.timeout(240_000);

  it("SL-03 replaces an externally terminated ready generation", async function () {
    if (detectRuntimePlatform() !== "linux") this.skip();
    const initial = await waitUntil(() => readyDiscovery());
    let replacement: Awaited<ReturnType<typeof readyDiscovery>>;

    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "synthesis-sidecar-recovery",
        owner: "synthesis-production-owner",
        namespace: ["system-e2e:synthesis-sidecar-recovery:"],
        ownedState: ["ready-sidecar-generation"],
        carryOver: ["ready-sidecar-generation"],
      },
      execute: async () => {
        const killed = await executeOneShotSubprocess({
          command: "/bin/kill",
          args: ["-KILL", String(initial.discovery.pid)],
          timeoutMs: 10_000,
        });
        assert.equal(killed.outcome, "exited");
        assert.equal(killed.exitCode, 0);
        replacement = await waitUntil(() =>
          readyDiscovery(initial.discovery.serviceInstanceId),
        );
        assert.notEqual(
          replacement.discovery.supervisorInstanceId,
          initial.discovery.supervisorInstanceId,
        );
        assert.isFalse(await runtimePathExists(initial.path));
        assert.isFalse(await processIsAlive(initial.discovery.pid));
      },
      cleanup: async () => {
        if (!replacement || (await processIsAlive(initial.discovery.pid))) {
          return "indeterminate";
        }
        return "passed";
      },
      healthGate: () => observeHealth(),
    });

    await emitCase({
      caseId: "SL-03",
      result,
      publicOutcome: result.abort ? undefined : "replacement_ready",
      evidence: result.abort
        ? []
        : [
            {
              kind: "sidecar-generation",
              schemaVersion: "synthesis-sidecar-discovery.v2",
              terminalStatus: "ready",
            },
          ],
    });
    assert.isFalse(result.abort);
    assert.equal(result.result, "passed");
  });

  it("RH-02 rejects a mixed-basis paged refresh and retries fresh", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const checkpoint = "reference-after-first-page";
    const ownedItems: Zotero.Item[] = [];
    let failedOperationId: string | undefined;
    let retryOperationId: string | undefined;
    let caseError = "";
    let caseStage = "baseline";

    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "synthesis-reference-basis",
        owner: "reference-application",
        namespace: ["system-e2e:reference-basis:"],
        ownedState: ["synthetic-reference-items", "reference-checkpoint"],
      },
      execute: async () => {
        try {
          const baseline =
            await composition.client.references.getSidecarIndex();
          caseStage = "create-fixture";
          ownedItems.push(
            ...(await createSyntheticReferences("System E2E reference")),
          );
          await armCheckpoint(composition.sessionRoot, checkpoint);
          caseStage = "submit-refresh";
          const submitted =
            composition.client.references.refreshReferenceSidecarNow();
          await waitForCheckpoint(composition.sessionRoot, checkpoint);
          ownedItems[0].setField("title", "System E2E reference mutated");
          await ownedItems[0].saveTx();
          await releaseCheckpoint(composition.sessionRoot, checkpoint);

          caseStage = "wait-failed-refresh";
          const failed = await waitForTerminal(
            composition.client,
            await submitted,
          );
          assert.equal(failed.status, "failed");
          assert.include(diagnosticCodes(failed), "basis_mismatch");
          assert.equal(
            (failed.receipt as { state_changed?: boolean } | undefined)
              ?.state_changed,
            false,
          );
          failedOperationId = failed.operation_id;

          caseStage = "submit-retry";
          const retried = await waitForTerminal(
            composition.client,
            await composition.client.references.retryReferenceSidecarRefresh(),
          );
          assert.equal(retried.status, "completed");
          retryOperationId = retried.operation_id;
          caseStage = "read-refreshed-index";
          const refreshed =
            await composition.client.references.getSidecarIndex();
          assert.isAbove(refreshed.total, baseline.total);
          assert.notEqual(
            refreshed.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );
        } catch (error) {
          caseError = `${caseStage}: ${error instanceof Error ? error.message : String(error)}`;
          throw error;
        }
      },
      cleanup: async () => {
        await removeCheckpointFiles(composition.sessionRoot, checkpoint);
        await eraseItems(ownedItems);
        await composition.dispose();
        return "passed";
      },
      healthGate: () => observeHealth(),
    });

    await emitCase({
      caseId: "RH-02",
      result,
      publicOutcome: result.abort
        ? undefined
        : "basis_mismatch_then_fresh_basis_retry_completed",
      evidence: result.abort
        ? []
        : [
            {
              kind: "reference-refresh",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "failed",
              operationId: failedOperationId,
            },
            {
              kind: "reference-refresh-retry",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "completed",
              operationId: retryOperationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("PM-03 reconciles a killed running operation without replay", async function () {
    if (detectRuntimePlatform() !== "linux") this.skip();
    const initial = await waitUntil(() => readyDiscovery());
    const initialComposition = await clientFor(initial);
    const maintenanceCheckpoint = "maintenance-after-admission";
    const referenceCheckpoint = "reference-after-first-page";
    const ownedItems: Zotero.Item[] = [];
    let replacementComposition:
      | Awaited<ReturnType<typeof clientFor>>
      | undefined;
    let failedOperationId: string | undefined;
    let retryOperationId: string | undefined;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "synthesis-maintenance-recovery",
        owner: "runtime-public-maintenance-operation",
        namespace: ["system-e2e:maintenance-recovery:"],
        ownedState: [
          "synthetic-reference-items",
          "maintenance-checkpoint",
          "reference-checkpoint",
        ],
      },
      execute: async () => {
        try {
          const baseline =
            await initialComposition.client.references.getSidecarIndex();
          ownedItems.push(
            ...(await createSyntheticReferences(
              "System E2E maintenance reference",
            )),
          );
          await armCheckpoint(
            initialComposition.sessionRoot,
            maintenanceCheckpoint,
          );
          await armCheckpoint(
            initialComposition.sessionRoot,
            referenceCheckpoint,
          );

          const submitted =
            initialComposition.client.references.refreshReferenceSidecarNow();
          await waitForCheckpoint(
            initialComposition.sessionRoot,
            maintenanceCheckpoint,
          );
          await releaseCheckpoint(
            initialComposition.sessionRoot,
            maintenanceCheckpoint,
          );
          const accepted = await submitted;
          await waitForCheckpoint(
            initialComposition.sessionRoot,
            referenceCheckpoint,
          );
          const running =
            await initialComposition.client.maintenance.getOperation({
              operation_id: accepted.operation_id,
            });
          assert.equal(running.status, "running");

          const killed = await executeOneShotSubprocess({
            command: "/bin/kill",
            args: ["-KILL", String(initial.discovery.pid)],
            timeoutMs: 10_000,
          });
          assert.equal(killed.outcome, "exited");
          assert.equal(killed.exitCode, 0);
          const replacement = await waitUntil(() =>
            readyDiscovery(initial.discovery.serviceInstanceId),
          );
          replacementComposition = await clientFor(replacement);

          const failed = await waitForTerminal(
            replacementComposition.client,
            accepted,
          );
          assert.equal(failed.status, "failed");
          assert.equal(failed.phase, "restart_reconciliation_failed");
          assert.include(
            diagnosticCodes(failed),
            "restart_external_effect_unknown",
          );
          failedOperationId = failed.operation_id;
          await Zotero.Promise.delay(100);
          const unreplayed =
            await replacementComposition.client.maintenance.getOperation({
              operation_id: accepted.operation_id,
            });
          assert.equal(unreplayed.status, "failed");
          const unchanged =
            await replacementComposition.client.references.getSidecarIndex();
          assert.equal(
            unchanged.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );

          await armCheckpoint(
            replacementComposition.sessionRoot,
            referenceCheckpoint,
          );
          const retryRequest = {
            action: "retry" as const,
            operation_id: accepted.operation_id,
            retry_key: "pm-03-retry-1",
          };
          const [firstRetry, duplicateRetry] = await Promise.all([
            replacementComposition.client.maintenance.controlOperation(
              retryRequest,
            ),
            replacementComposition.client.maintenance.controlOperation(
              retryRequest,
            ),
          ]);
          assert.notEqual(firstRetry.operation_id, accepted.operation_id);
          assert.equal(duplicateRetry.operation_id, firstRetry.operation_id);
          await waitForCheckpoint(
            replacementComposition.sessionRoot,
            referenceCheckpoint,
          );
          await releaseCheckpoint(
            replacementComposition.sessionRoot,
            referenceCheckpoint,
          );
          const retried = await waitForTerminal(
            replacementComposition.client,
            firstRetry,
          );
          assert.equal(retried.status, "completed");
          retryOperationId = retried.operation_id;
          const refreshed =
            await replacementComposition.client.references.getSidecarIndex();
          assert.notEqual(
            refreshed.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        await removeCheckpointFiles(
          initialComposition.sessionRoot,
          maintenanceCheckpoint,
        );
        await removeCheckpointFiles(
          initialComposition.sessionRoot,
          referenceCheckpoint,
        );
        if (replacementComposition) {
          await removeCheckpointFiles(
            replacementComposition.sessionRoot,
            referenceCheckpoint,
          );
        }
        await eraseItems(ownedItems);
        await initialComposition.dispose();
        await replacementComposition?.dispose();
        return "passed";
      },
      healthGate: () => observeHealth(),
    });

    await emitCase({
      caseId: "PM-03",
      result,
      publicOutcome: result.abort
        ? undefined
        : "restart_external_effect_unknown_then_retry_successor_completed_once",
      evidence: result.abort
        ? []
        : [
            {
              kind: "maintenance-restart-reconciliation",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "failed",
              operationId: failedOperationId,
            },
            {
              kind: "maintenance-retry-successor",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "completed",
              operationId: retryOperationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

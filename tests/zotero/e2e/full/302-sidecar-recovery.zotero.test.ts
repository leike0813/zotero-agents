import { assert } from "chai";
import { config } from "../../../../package.json";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
  rebuildSynthesisReferenceCapabilityResult,
  rebuildSynthesisSidecarLaunchConfig,
  SynthesisClientError,
  type SynthesisPublicMaintenanceOperation,
  type SynthesisTopicApplyRequest,
} from "../../../../packages/synthesis-contracts/src";
import { createSyntheticSynthesisProductionRouteDataset } from "../../../fixtures/synthesisSyntheticDatasets";
import {
  PHASE1_FAMILY_DECLARATIONS,
  resolvePhase1FamilySelection,
  runFamilyLifecycle,
  type Phase1FamilyId,
} from "../../../../scripts/system-e2e/familyLifecycle";
import {
  assertRemainsStable,
  listSidecarDiscoveries,
  observeSystemE2EHealth,
  processIsAlive,
  terminateProcess,
  waitUntil,
  type SidecarDiscoveryEntry,
} from "../../../../scripts/system-e2e/healthGate";
import {
  getRuntimePersistencePaths,
  getRuntimeFilePermissions,
  moveRuntimePath,
  readRuntimeTextFile,
  removeRuntimePath,
  runtimePathExists,
  setRuntimeFilePermissions,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { detectRuntimePlatform } from "../../../../src/platform/runtimePlatform";
import { executeOneShotSubprocess } from "../../../../src/platform/subprocess";
import { joinPath } from "../../../../src/utils/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { resolveHostBridgeCliBinary } from "../../../../src/modules/hostBridge/cli/hostBridgeCliResolver";
import { ensureHostBridgeServer } from "../../../../src/modules/hostBridge/server/hostBridgeServer";
import { createNativeSynthesisClientComposition } from "../../../../src/modules/synthesisClient/nativeComposition";
import {
  createDefaultSynthesisUiState,
  type SynthesisUiState,
} from "../../../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../../../src/modules/synthesisClient/workbenchUiAdapter";
import {
  createSynthesisProductionSidecarControlClient,
  type SynthesisProductionSidecarControlConnection,
} from "../../../../src/modules/synthesis/sidecar/synthesisSidecarControlClient";
import { renderPayloadBlock } from "../../../../src/modules/zoteroHost/notePayloadCodec";
import { emitZoteroTestDebug } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

type WorkbenchFrame = HTMLIFrameElement & {
  contentWindow: Window & {
    __zoteroSkillsSynthesisWorkbenchBridge?: {
      postMessage(action: string, payload?: unknown): Promise<void> | void;
    };
  };
};

type Phase1StructuralFacts = {
  historicalTopic: {
    topicId: string;
    pathId: string;
    provenance: "historical";
    readOnly: true;
  };
  citationGraph: {
    nodes: string[];
    edges: [string, string][];
  };
  unicodeNote: {
    html: string;
  };
};

type HostBridgeCliEnvelope = {
  ok: boolean;
  data?: {
    capability?: string;
    data?: Record<string, unknown>;
  };
  error?: { code?: string; message?: string };
};

async function readyDiscovery(
  excludedServiceInstanceId?: string,
): Promise<SidecarDiscoveryEntry | undefined> {
  return (await listSidecarDiscoveries()).find(
    ({ discovery }) =>
      discovery.lifecycleState === "ready" &&
      discovery.serviceInstanceId !== excludedServiceInstanceId,
  );
}

function parentPath(path: string) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

async function clientFor(found: SidecarDiscoveryEntry) {
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
  return {
    ...composition,
    // The sidecar is told where the seam keeps its checkpoints; the session root
    // itself is too deep to hold them on Windows.
    checkpointRoot:
      launch.testCheckpointRoot || joinPath(sessionRoot, "test-checkpoints"),
    controlConnection: {
      discovery: found.discovery,
      clientToken: launch.clientToken,
      lifecycleToken: launch.lifecycleToken,
    } satisfies SynthesisProductionSidecarControlConnection,
  };
}

async function replayableReferenceRefresh(
  connection: Awaited<ReturnType<typeof clientFor>>["controlConnection"],
  requestId: string,
) {
  const fetchOwner = Zotero.getMainWindow() as unknown as {
    fetch: typeof globalThis.fetch;
  };
  const response = await fetchOwner.fetch(
    `http://${connection.discovery.host}:${connection.discovery.port}${SYNTHESIS_SIDECAR_CALL_PATH}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${connection.clientToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        requestId,
        profileId: connection.discovery.profileId,
        capability: "client.refreshReferenceSidecarNow",
        payload: { args: [] },
      }),
    },
  );
  const body = JSON.parse(await response.text()) as {
    ok?: boolean;
    requestId?: string;
    serviceInstanceId?: string;
    data?: unknown;
    error?: { code?: string };
  };
  if (
    !response.ok ||
    body.ok !== true ||
    body.requestId !== requestId ||
    body.serviceInstanceId !== connection.discovery.serviceInstanceId
  ) {
    throw new Error(
      `system_e2e_maintenance_rpc_failed:${body.error?.code || response.status}`,
    );
  }
  return rebuildSynthesisReferenceCapabilityResult(
    "client.refreshReferenceSidecarNow",
    body.data,
  );
}

async function checkpointPath(
  checkpointRoot: string,
  name: string,
  state: "armed" | "held" | "release",
) {
  await IOUtils.makeDirectory(checkpointRoot, { createAncestors: true });
  return joinPath(checkpointRoot, `${name}.${state}`);
}

async function armCheckpoint(checkpointRoot: string, name: string) {
  const path = await checkpointPath(checkpointRoot, name, "armed");
  await IOUtils.writeUTF8(path, "");
}

async function releaseCheckpoint(checkpointRoot: string, name: string) {
  const path = await checkpointPath(checkpointRoot, name, "release");
  await IOUtils.writeUTF8(path, "");
}

async function waitForCheckpoint(checkpointRoot: string, name: string) {
  const path = await checkpointPath(checkpointRoot, name, "held");
  await waitUntil(
    async () => ((await IOUtils.exists(path)) ? path : null),
    120_000,
    `checkpoint-${name}`,
  );
}

async function removeCheckpointFiles(checkpointRoot: string, name: string) {
  for (const state of ["armed", "held", "release"] as const) {
    await IOUtils.remove(await checkpointPath(checkpointRoot, name, state), {
      ignoreAbsent: true,
    });
  }
}

async function waitForTerminal(
  client: Awaited<ReturnType<typeof clientFor>>["client"],
  accepted: SynthesisPublicMaintenanceOperation,
) {
  return waitUntil(
    async () => {
      const operation = await client.maintenance.getOperation({
        operation_id: accepted.operation_id,
      });
      return operation.status === "pending" || operation.status === "running"
        ? null
        : operation;
    },
    120_000,
    `terminal-${accepted.operation_id}`,
  );
}

function diagnosticCodes(operation: SynthesisPublicMaintenanceOperation) {
  const receipt = operation.receipt;
  return receipt &&
    "diagnostics" in receipt &&
    Array.isArray(receipt.diagnostics)
    ? receipt.diagnostics.map((entry) => entry.code)
    : [];
}

// The sidecar re-reads Host facts asynchronously after a mutation; give it a fixed settle window before submitting a refresh.
const HOST_FACTS_SETTLE_MS = 250;

async function refreshReferencesAfterMutation(
  client: Awaited<ReturnType<typeof clientFor>>["client"],
) {
  await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
  let restored = await waitForTerminal(
    client,
    await client.references.refreshReferenceSidecarNow(),
  );
  if (
    restored.status === "failed" &&
    diagnosticCodes(restored).includes("basis_mismatch")
  ) {
    await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
    restored = await waitForTerminal(
      client,
      await client.references.retryReferenceSidecarRefresh(),
    );
  }
  return restored;
}

async function createSyntheticReferences(prefix: string, count = 101) {
  const items: Zotero.Item[] = [];
  for (let index = 0; index < count; index += 1) {
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

async function cleanupOwnedReferences(
  ownedItems: Zotero.Item[],
  client: Awaited<ReturnType<typeof clientFor>>["client"],
) {
  await eraseItems(ownedItems);
  return refreshReferencesAfterMutation(client).catch(() => undefined);
}

function paperRef(item: Zotero.Item) {
  return `${item.libraryID}:${item.key}`;
}

async function readPhase1StructuralFacts() {
  const seed = JSON.parse(
    await IOUtils.readUTF8(
      PathUtils.join(Zotero.DataDirectory.dir, "system-e2e", "seed.json"),
    ),
  ) as { structuralFacts: Phase1StructuralFacts };
  return seed.structuralFacts;
}

function historicalTopicApplyRequest(topicId: string) {
  const fixture = createSyntheticSynthesisProductionRouteDataset("2k");
  const sourceTopicId = fixture.topicApplyRequest.bundle.topic_definition.id;
  const request = JSON.parse(
    JSON.stringify(fixture.topicApplyRequest).replaceAll(
      sourceTopicId,
      topicId,
    ),
  ) as SynthesisTopicApplyRequest;
  const topic = request.assets.find(
    (asset) => asset.id === "asset/section/topic",
  );
  if (!topic) throw new Error("system_e2e_historical_topic_fixture_invalid");
  const value = JSON.parse(topic.text) as Record<string, unknown>;
  value.title = "Synthetic Historical Topic";
  value.scope = "historical";
  topic.text = JSON.stringify(value);
  request.bundle.topic_definition.title = "Synthetic Historical Topic";
  return request;
}

function referencesArtifact(
  sourceReferenceId = "source-reference-system-e2e-valid",
  raw = "Synthetic valid neighbor",
) {
  return {
    schema: "source_reference_artifact.v1",
    references: [
      {
        sourceReferenceId,
        extraction: { raw, confidence: 1 },
        bibliography: {
          title: raw,
          authors: [],
          year: null,
        },
        matching: {},
      },
    ],
  };
}

async function addPayloadNote(
  parent: Zotero.Item,
  sourceReferenceId?: string,
  raw?: string,
) {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setNote(
    renderPayloadBlock({
      payloadType: "references-json",
      payload: referencesArtifact(sourceReferenceId, raw),
      payloadFormat: "json",
    }),
  );
  await note.saveTx();
  return note;
}

async function productionLockAvailable() {
  const lockPath = joinPath(
    parentPath(getRuntimePersistencePaths().synthesisDbPath),
    "synthesis.lock",
  );
  const result = await executeOneShotSubprocess({
    command: "/usr/bin/flock",
    args: ["-n", lockPath, "/bin/true"],
    timeoutMs: 10_000,
  });
  return result.outcome === "exited" && result.exitCode === 0;
}

async function runHostBridgeCli(args: string[]) {
  const cli = await resolveHostBridgeCliBinary();
  if (!cli.available) throw new Error(cli.code);
  const result = await executeOneShotSubprocess({
    command: cli.binaryPath,
    args,
    timeoutMs: 120_000,
  });
  let output: HostBridgeCliEnvelope;
  try {
    output = JSON.parse(result.stdout) as HostBridgeCliEnvelope;
  } catch {
    throw new Error(
      `system_e2e_host_bridge_cli_invalid_output:${result.stderr || result.stdout}`,
    );
  }
  return { ...result, output };
}

type HostBridgeRestartState = {
  operationId: string;
  processId: number;
  parent: { libraryId: number; key: string };
  previousApprovalSetting: boolean;
};

function hostBridgeRestartStatePath() {
  return PathUtils.join(
    Zotero.DataDirectory.dir,
    "system-e2e",
    "hb-03-restart.json",
  );
}

function hostBridgeAdmissionCheckpointPath(
  state: "armed.json" | "held" | "release",
) {
  return PathUtils.join(
    Zotero.DataDirectory.dir,
    "system-e2e",
    `canonical-mutation-admission.${state}`,
  );
}

async function removeHostBridgeAdmissionCheckpoint() {
  for (const state of ["armed.json", "held", "release"] as const) {
    await IOUtils.remove(hostBridgeAdmissionCheckpointPath(state), {
      ignoreAbsent: true,
    });
  }
}

async function readHostBridgeRestartState() {
  return JSON.parse(
    await IOUtils.readUTF8(hostBridgeRestartStatePath()),
  ) as HostBridgeRestartState;
}

async function openSynthesisWorkbench() {
  const mainWindow = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
  const plugin = (Zotero as any)[config.addonInstance];
  await plugin.hooks.onPrefsEvent("openSynthesisWorkbench", {
    window: mainWindow,
  });
  const workspaceFrame = (await waitUntil(() =>
    mainWindow.document.querySelector<WorkbenchFrame>(
      '[data-zs-role="workspace-frame"]',
    ),
  )) as WorkbenchFrame;
  return (await waitUntil(() =>
    workspaceFrame.contentDocument?.querySelector<WorkbenchFrame>(
      '[data-zs-role="synthesis-workbench-frame"]',
    ),
  )) as WorkbenchFrame;
}

async function recoverReadySidecar(previous: SidecarDiscoveryEntry) {
  await waitUntil(
    async () => ((await runtimePathExists(previous.path)) ? null : true),
    120_000,
    "recover-previous-discovery-removed",
  );
  const frame = await openSynthesisWorkbench();
  await frame.contentWindow.__zoteroSkillsSynthesisWorkbenchBridge?.postMessage(
    "retrySynthesisSidecar",
    {},
  );
  return waitUntil(
    () => readyDiscovery(previous.discovery.serviceInstanceId),
    120_000,
    "recover-replacement-ready",
  );
}

async function emitCase(args: {
  familyId: Phase1FamilyId;
  caseId: string;
  result: Awaited<ReturnType<typeof runFamilyLifecycle>>;
  publicOutcome?: string;
  evidence?: Array<Record<string, unknown>>;
}) {
  await emitZoteroTestDebug({
    kind: "system-e2e-family-result",
    family: {
      familyId: args.familyId,
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

const selectedPhase1Families = new Set(
  resolvePhase1FamilySelection(
    readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_FAMILIES"),
  ),
);

function phase1FamilyTest(familyId: Phase1FamilyId) {
  return (
    title: string,
    callback: (this: Mocha.Context) => void | Promise<void>,
  ) =>
    it(title, function () {
      if (!selectedPhase1Families.has(familyId)) this.skip();
      return callback.call(this);
    });
}

const sl = phase1FamilyTest("SL");
const rh = phase1FamilyTest("RH");
const pa = phase1FamilyTest("PA");
const pm = phase1FamilyTest("PM");
const cg = phase1FamilyTest("CG");
const hb = phase1FamilyTest("HB");

describe("System E2E sidecar recovery", function () {
  this.timeout(readDiagnosticsEnv("ZOTERO_E2E_GOLD_ID") ? 900_000 : 240_000);

  before(function () {
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "HB-03") {
      this.skip();
    }
  });

  // prettier-ignore
  sl("SL-01 stops through public system.shutdown and restores a healthy owner", async function () {
    const initial = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(initial);
    let shutdownAccepted = false;
    let restored: SidecarDiscoveryEntry;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.SL,
      execute: async () => {
        try {
          const fetchOwner = Zotero.getMainWindow() as unknown as {
            fetch: typeof globalThis.fetch;
          };
          await createSynthesisProductionSidecarControlClient({
            fetch: fetchOwner.fetch.bind(fetchOwner),
            timeoutMs: 10_000,
          }).shutdown(composition.controlConnection);
          shutdownAccepted = true;
          restored = await waitUntil(
            async () =>
              (await readyDiscovery(initial.discovery.serviceInstanceId)) ||
              null,
          );
          await waitUntil(async () =>
            !(await runtimePathExists(initial.path)) &&
            !(await processIsAlive(initial.discovery.pid))
              ? true
              : null,
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        await composition.dispose();
        restored ||= await waitUntil(
          async () =>
            (await readyDiscovery(initial.discovery.serviceInstanceId)) || null,
        ).catch(() => undefined);
        return restored ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "SL",
      caseId: "SL-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "shutdown_response_flushed_and_owner_restored",
      evidence:
        result.abort || !shutdownAccepted
          ? []
          : [
              {
                kind: "sidecar-lifecycle",
                schemaVersion: "synthesis-sidecar-discovery.v2",
                terminalStatus: "stopped",
              },
            ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  sl("SL-02 rolls back owners when launch input fails before ready", async function () {
    const initial = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(initial);
    const frame = await openSynthesisWorkbench();
    const repositoryPath = getRuntimePersistencePaths().synthesisDbPath;
    const backupPath = `${repositoryPath}.system-e2e-sl02-backup`;
    let launchFailureCode = "";
    let repositoryMoved = false;

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.SL,
      execute: async () => {
        await IOUtils.remove(backupPath, {
          recursive: true,
          ignoreAbsent: true,
        });
        await IOUtils.move(repositoryPath, backupPath);
        repositoryMoved = true;
        // A read-only, non-database file at the database path is a durable
        // pre-ready failure: the sidecar cannot open it and neither the sidecar
        // nor the plugin can replace it, while the case can still clear the
        // attribute and remove it afterwards, which a directory at that path
        // never allowed on Windows. A plain file there only made the failure
        // race the plugin's own repository recovery.
        await writeRuntimeTextFile(
          repositoryPath,
          "system-e2e-sl02-poisoned-repository\n",
        );
        await setRuntimeFilePermissions(repositoryPath, 0o444);
        const fetchOwner = Zotero.getMainWindow() as unknown as {
          fetch: typeof globalThis.fetch;
        };
        await createSynthesisProductionSidecarControlClient({
          fetch: fetchOwner.fetch.bind(fetchOwner),
          timeoutMs: 10_000,
        }).shutdown(composition.controlConnection);
        launchFailureCode = await waitUntil(() => {
          const indicator = frame.contentDocument?.querySelector<HTMLElement>(
            ".sidecar-runtime-indicator.is-error",
          );
          const reason = Array.from(
            indicator?.querySelectorAll<HTMLElement>(
              ".sidecar-runtime-row > span:last-child",
            ) || [],
          )
            .map((element) => element.textContent?.trim() || "")
            .find((value) => /^(repository_|invalid_config)/u.test(value));
          return reason || null;
        });
        assert.match(launchFailureCode, /^repository_|^invalid_config/);
        assert.isEmpty(await listSidecarDiscoveries());
        await waitUntil(async () => {
          if (await processIsAlive(initial.discovery.pid)) return null;
          // Windows has no flock; discovery removal above and process exit are the release evidence there.
          return detectRuntimePlatform() === "win32" ||
            (await productionLockAvailable())
            ? true
            : null;
        });
      },
      cleanup: async () => {
        await composition.dispose();
        // The plugin's own recovery replaces the poisoned launch input with a
        // working repository, and on Windows that owner holds the path. The
        // poison is therefore released best-effort and never by stopping the
        // generation that owns it: a path that stays held belongs to a recovery
        // generation that is already usable, the pre-case database is derived
        // state rather than owned state, and the case's verdict rests on the
        // ready generation below instead of on file ownership.
        if (await runtimePathExists(repositoryPath)) {
          await setRuntimeFilePermissions(repositoryPath, 0o644).catch(
            () => undefined,
          );
          await removeRuntimePath(repositoryPath).catch((error) => {
            console.error(
              `[system-e2e] sl-02 poisoned path stayed held: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          });
        }
        if (repositoryMoved) {
          await removeRuntimePath(backupPath).catch(() => undefined);
          repositoryMoved = false;
        }
        // The page that started the case can be gone by now: the failed launch
        // and its recovery replace the workbench frames, so the retry is sent
        // through a freshly opened one.
        const recoveryFrame = await openSynthesisWorkbench();
        await recoveryFrame.contentWindow?.__zoteroSkillsSynthesisWorkbenchBridge?.postMessage(
          "retrySynthesisSidecar",
          {},
        );
        return (await waitUntil(
          () => readyDiscovery(),
          120_000,
          "sl-02-recovered-ready",
        ))
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "SL",
      caseId: "SL-02",
      result,
      publicOutcome: result.abort
        ? undefined
        : "pre_ready_launch_failure_rolled_back",
      evidence: result.abort
        ? []
        : [
            {
              kind: "sidecar-startup-failure",
              schemaVersion: "synthesis-sidecar-runtime.v2",
              terminalStatus: launchFailureCode,
            },
          ],
    });
    assert.isFalse(result.abort, launchFailureCode);
    assert.equal(result.result, "passed", launchFailureCode);
  });

  // prettier-ignore
  sl("SL-03 replaces an externally terminated ready generation", async function () {
    const initial = await waitUntil(() => readyDiscovery());
    let replacement: SidecarDiscoveryEntry;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.SL,
      execute: async () => {
        try {
          await terminateProcess(initial.discovery.pid);
          replacement = await waitUntil(
            () => readyDiscovery(initial.discovery.serviceInstanceId),
            120_000,
            "sl-03-replacement-ready",
          );
          assert.notEqual(
            replacement.discovery.supervisorInstanceId,
            initial.discovery.supervisorInstanceId,
          );
          assert.isFalse(
            await runtimePathExists(initial.path),
            "terminated generation kept its discovery",
          );
          assert.isFalse(
            await processIsAlive(initial.discovery.pid),
            "terminated generation process stayed alive",
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        if (!replacement || (await processIsAlive(initial.discovery.pid))) {
          return "indeterminate";
        }
        return "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "SL",
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
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  rh("RH-01 refreshes every reference page on one coherent basis", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const ownedItems: Zotero.Item[] = [];
    let operationId: string | undefined;
    let referenceBasisHash = "";
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.RH,
      execute: async () => {
        try {
          const baseline = await composition.client.references.getSidecarIndex({
            limit: 100,
          });
          ownedItems.push(
            ...(await createSyntheticReferences(
              "System E2E coherent reference",
            )),
          );
          await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
          const expectedRefs = new Set(ownedItems.map(paperRef));
          const completed = await waitForTerminal(
            composition.client,
            await composition.client.references.refreshReferenceSidecarNow(),
          );
          assert.equal(completed.status, "completed");
          assert.equal(completed.phase, "completed");
          operationId = completed.operation_id;

          const pages = [
            await composition.client.references.getSidecarIndex({ limit: 100 }),
          ];
          while (pages.at(-1)!.has_more) {
            const cursor = pages.at(-1)!.next_cursor;
            if (!cursor) throw new Error("reference_page_cursor_missing");
            pages.push(
              await composition.client.references.getSidecarIndex({
                cursor,
                limit: 100,
              }),
            );
          }
          const first = pages[0];
          assert.isTrue(first.has_more);
          assert.isAbove(first.total, baseline.total + 100);
          referenceBasisHash = first.diagnostics.repository_basis_hash;
          for (const page of pages) {
            assert.equal(
              page.diagnostics.repository_basis_hash,
              referenceBasisHash,
            );
            assert.isTrue(page.diagnostics.cache_found);
          }
          const returnedRefs = new Set(
            pages.flatMap((page) => page.rows.map((row) => row.paper_ref)),
          );
          assert.isTrue(
            [...expectedRefs].every((value) => returnedRefs.has(value)),
          );
          const stable = await composition.client.maintenance.getOperation({
            operation_id: completed.operation_id,
          });
          assert.equal(stable.status, "completed");
          assert.deepEqual(stable.receipt, completed.receipt);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        const restored = await cleanupOwnedReferences(
          ownedItems,
          composition.client,
        );
        await composition.dispose();
        if (restored?.status !== "completed") {
          caseError = `cleanup-refresh:${restored?.status || "unavailable"}:${
            restored ? diagnosticCodes(restored).join(",") : ""
          }`;
        }
        return restored?.status === "completed" ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "RH",
      caseId: "RH-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "multi_page_refresh_committed_one_coherent_basis",
      evidence: result.abort
        ? []
        : [
            {
              kind: "reference-refresh",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "completed",
              operationId,
              referenceBasisHash,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  rh("RH-02 rejects a mixed-basis paged refresh and retries fresh", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const checkpoint = "reference-after-first-page";
    const ownedItems: Zotero.Item[] = [];
    let failedOperationId: string | undefined;
    let retryOperationId: string | undefined;
    let caseError = "";
    let caseStage = "baseline";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.RH,
      execute: async () => {
        try {
          const baseline =
            await composition.client.references.getSidecarIndex();
          caseStage = "create-fixture";
          ownedItems.push(
            ...(await createSyntheticReferences("System E2E reference")),
          );
          await armCheckpoint(composition.checkpointRoot, checkpoint);
          caseStage = "submit-refresh";
          const submitted =
            composition.client.references.refreshReferenceSidecarNow();
          await waitForCheckpoint(composition.checkpointRoot, checkpoint);
          ownedItems[0].setField("title", "System E2E reference mutated");
          await ownedItems[0].saveTx();
          await releaseCheckpoint(composition.checkpointRoot, checkpoint);

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
          await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
          const retried = await waitForTerminal(
            composition.client,
            await composition.client.references.retryReferenceSidecarRefresh(),
          );
          assert.equal(
            retried.status,
            "completed",
            diagnosticCodes(retried).join(","),
          );
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
        await removeCheckpointFiles(composition.checkpointRoot, checkpoint);
        await eraseItems(ownedItems);
        await composition.dispose();
        return "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "RH",
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

  // prettier-ignore
  pa("PA-01 reads a historical Topic without rewriting its read-only metadata", async function () {
    const facts = (await readPhase1StructuralFacts()).historicalTopic;
    const ready = await waitUntil(() => readyDiscovery());
    let composition = await clientFor(ready);
    const canonicalRoot = getRuntimePersistencePaths().synthesisDataRoot;
    let canonicalTopicRoot = "";
    let historicalTopicRoot = "";
    let metadataPath = "";
    let manifestPath = "";
    let metadataMode: number | null = null;
    let manifestMode: number | null = null;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.PA,
      execute: async () => {
        try {
          const applied =
            await composition.client.workflowApply.applyTopicSynthesisResult(
              historicalTopicApplyRequest(facts.topicId),
            );
          assert.equal(applied.status, "persisted");
          const initial = await composition.client.workbench.readTopicDetail({
            topicId: facts.topicId,
          });
          assert.equal(initial.status, "ready");
          assert.isString(initial.pathId);

          canonicalTopicRoot = joinPath(
            canonicalRoot,
            "topics",
            initial.pathId!,
          );
          historicalTopicRoot = parentPath(
            joinPath(canonicalRoot, facts.pathId),
          );
          metadataPath = joinPath(
            canonicalTopicRoot,
            "current",
            "metadata.json",
          );
          manifestPath = joinPath(
            canonicalTopicRoot,
            "current",
            "manifest.json",
          );
          const metadata = JSON.parse(await readRuntimeTextFile(metadataPath));
          const manifest = JSON.parse(await readRuntimeTextFile(manifestPath));
          const legacyMetadataHash = hashSynthesisContractCanonicalJson(
            metadata.data,
          );
          metadata.data.metadata_hash = legacyMetadataHash;
          manifest.metadata_hash = legacyMetadataHash;
          await writeRuntimeTextFile(
            metadataPath,
            `${JSON.stringify(metadata, null, 2)}\n`,
          );
          await writeRuntimeTextFile(
            manifestPath,
            `${canonicalizeSynthesisContractJson(manifest)}\n`,
          );
          await moveRuntimePath({
            sourcePath: canonicalTopicRoot,
            targetPath: historicalTopicRoot,
          });
          metadataPath = joinPath(
            historicalTopicRoot,
            "current",
            "metadata.json",
          );
          manifestPath = joinPath(
            historicalTopicRoot,
            "current",
            "manifest.json",
          );
          const metadataBefore = await readRuntimeTextFile(metadataPath);
          metadataMode = await getRuntimeFilePermissions(metadataPath);
          manifestMode = await getRuntimeFilePermissions(manifestPath);
          assert.isTrue(await setRuntimeFilePermissions(metadataPath, 0o444));
          assert.isTrue(await setRuntimeFilePermissions(manifestPath, 0o444));

          const fetchOwner = Zotero.getMainWindow() as unknown as {
            fetch: typeof globalThis.fetch;
          };
          await createSynthesisProductionSidecarControlClient({
            fetch: fetchOwner.fetch.bind(fetchOwner),
            timeoutMs: 10_000,
          }).shutdown(composition.controlConnection);
          const replacement = await waitUntil(
            async () =>
              (await readyDiscovery(ready.discovery.serviceInstanceId)) || null,
          );
          await composition.dispose();
          composition = await clientFor(replacement);

          const detail = await composition.client.workbench.readTopicDetail({
            topicId: facts.topicId,
          });
          assert.equal(detail.status, "ready");
          assert.equal(detail.title, "Synthetic Historical Topic");
          assert.equal(detail.topic?.scope, facts.provenance);
          assert.equal(detail.pathId, initial.pathId);
          assert.equal(await readRuntimeTextFile(metadataPath), metadataBefore);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        if (metadataPath && metadataMode !== null) {
          await setRuntimeFilePermissions(metadataPath, metadataMode);
        }
        if (manifestPath && manifestMode !== null) {
          await setRuntimeFilePermissions(manifestPath, manifestMode);
        }
        if (
          historicalTopicRoot &&
          (await runtimePathExists(historicalTopicRoot))
        ) {
          await removeRuntimePath(historicalTopicRoot);
        }
        await composition.client.topics
          .deleteTopicArtifact({ topicId: facts.topicId })
          .catch(() => undefined);
        await composition.client.topics
          .purgeDeletedTopicArtifacts()
          .catch(() => undefined);
        const cleaned = await composition.client.topics
          .list({ cursor: "", limit: 100 })
          .then(
            (page) =>
              !page.topics.some((topic) => topic.topic_id === facts.topicId),
          )
          .catch(() => false);
        await composition.dispose();
        return cleaned ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PA",
      caseId: "PA-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "historical_topic_remained_readable_without_rewrite",
      evidence: result.abort
        ? []
        : [
            {
              kind: "workbench-topic-detail",
              schemaVersion: "synthesis-topic-workbench.v1",
              terminalStatus: "ready",
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  pa("PA-02 keeps valid Index neighbors when one artifact is oversized", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const ownedItems: Zotero.Item[] = [];
    let operationId: string | undefined;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.PA,
      execute: async () => {
        try {
          const paper = new Zotero.Item("journalArticle");
          paper.setField("title", "Synthetic Artifact Neighbors");
          paper.setField("date", "2026");
          await paper.saveTx();
          ownedItems.push(paper, await addPayloadNote(paper));
          const oversized = new Zotero.Item("note");
          oversized.libraryID = paper.libraryID;
          oversized.parentItemID = paper.id;
          oversized.setNote(`<p>${"文".repeat(360_000)}</p>`);
          await oversized.saveTx();
          ownedItems.push(oversized);

          const completed = await waitForTerminal(
            composition.client,
            await composition.client.references.refreshReferenceSidecarNow(),
          );
          assert.equal(completed.status, "completed");
          operationId = completed.operation_id;

          const state = createDefaultSynthesisUiState() as SynthesisUiState;
          state.registry.expandedSourceRefs = [paperRef(paper)];
          const index = await composition.client.workbench.readSurface({
            surface: "index",
            state: toSynthesisWorkbenchReadState(state),
          });
          assert.isNotEmpty(index.registry.rows);

          const artifacts =
            await composition.client.artifacts.readPaperArtifacts({
              paper_refs: [paperRef(paper)],
              artifact_types: ["references", "citation_analysis"],
            });
          const references = artifacts.artifacts.find(
            (artifact) => artifact.artifact_type === "references",
          );
          const malformed = artifacts.artifacts.find(
            (artifact) => artifact.artifact_type === "citation_analysis",
          );
          assert.equal(references?.status, "available");
          assert.oneOf(malformed?.status, ["invalid", "unavailable"]);
          assert.lengthOf(malformed?.diagnostics || [], 1);
          assert.include(malformed?.diagnostics[0], "resource_limited");
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        const restored = await cleanupOwnedReferences(
          ownedItems,
          composition.client,
        );
        await composition.dispose();
        return restored?.status === "completed" ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PA",
      caseId: "PA-02",
      result,
      publicOutcome: result.abort
        ? undefined
        : "valid_artifact_neighbor_preserved_with_bounded_diagnostic",
      evidence: result.abort
        ? []
        : [
            {
              kind: "workbench-index-artifact-diagnostic",
              schemaVersion: "synthesis-topic-workbench.v1",
              terminalStatus: "bounded",
              operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  pm("PM-01 exactly replays one admitted maintenance operation", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const checkpoint = "maintenance-after-admission";
    const ownedItems: Zotero.Item[] = [];
    let operationId: string | undefined;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.PM,
      execute: async () => {
        try {
          const baseline =
            await composition.client.references.getSidecarIndex();
          ownedItems.push(
            ...(await createSyntheticReferences(
              "System E2E maintenance replay",
              1,
            )),
          );
          await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
          await armCheckpoint(composition.checkpointRoot, checkpoint);
          const requestId = "system-e2e-pm-01-exact-replay";
          const firstPromise = replayableReferenceRefresh(
            composition.controlConnection,
            requestId,
          );
          await waitForCheckpoint(composition.checkpointRoot, checkpoint);
          const replay = await replayableReferenceRefresh(
            composition.controlConnection,
            requestId,
          );
          await releaseCheckpoint(composition.checkpointRoot, checkpoint);
          const first = await firstPromise;
          assert.equal(replay.operation_id, first.operation_id);
          operationId = first.operation_id;

          const terminal = await waitForTerminal(composition.client, first);
          assert.equal(terminal.status, "completed");
          const terminalReplay = await replayableReferenceRefresh(
            composition.controlConnection,
            requestId,
          );
          assert.equal(terminalReplay.operation_id, terminal.operation_id);
          assert.deepEqual(terminalReplay.receipt, terminal.receipt);
          const refreshed =
            await composition.client.references.getSidecarIndex();
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
        await removeCheckpointFiles(composition.checkpointRoot, checkpoint);
        const restored = await cleanupOwnedReferences(
          ownedItems,
          composition.client,
        );
        await composition.dispose();
        return restored?.status === "completed" ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PM",
      caseId: "PM-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "exact_replay_preserved_one_operation_and_terminal_receipt",
      evidence: result.abort
        ? []
        : [
            {
              kind: "maintenance-exact-replay",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "completed",
              operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  pm("PM-02 requires explicit continuation after admitted restart", async function () {
    const initial = await waitUntil(() => readyDiscovery());
    const initialComposition = await clientFor(initial);
    const checkpoint = "maintenance-after-admission";
    const ownedItems: Zotero.Item[] = [];
    let replacementComposition:
      | Awaited<ReturnType<typeof clientFor>>
      | undefined;
    let operationId: string | undefined;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.PM,
      execute: async () => {
        try {
          const baseline =
            await initialComposition.client.references.getSidecarIndex();
          const existingOperations =
            await initialComposition.client.debug.listOperations({
              limit: 100,
            });
          const existingIds = new Set(
            existingOperations.rows.map((operation) => operation.operationId),
          );
          ownedItems.push(
            ...(await createSyntheticReferences(
              "System E2E maintenance continuation",
              1,
            )),
          );
          await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
          await armCheckpoint(initialComposition.checkpointRoot, checkpoint);
          let submitFailure = "";
          const submitted = replayableReferenceRefresh(
            initialComposition.controlConnection,
            "system-e2e-pm-02-admitted-restart",
          ).catch((error) => {
            submitFailure =
              error instanceof Error ? error.message : String(error);
            return undefined;
          });
          await waitForCheckpoint(initialComposition.checkpointRoot, checkpoint);
          const operations =
            await initialComposition.client.debug.listOperations({
              limit: 100,
            });
          const newOperations = operations.rows.filter(
            (operation) =>
              !existingIds.has(operation.operationId) &&
              operation.operationType === "client.refreshReferenceSidecarNow",
          );
          const [accepted] = newOperations;
          assert.isOk(accepted);
          assert.equal(accepted.status, "pending");
          operationId = accepted.operationId;

          await terminateProcess(initial.discovery.pid);
          const submittedResult = (await submitted) as
            | { operation_id?: string }
            | undefined;
          assert.isUndefined(
            submittedResult,
            JSON.stringify({
              submitFailure,
              acceptedOperationId: accepted.operationId,
              resolvedOperationId: submittedResult?.operation_id,
              newOperations: newOperations.map(
                (operation) =>
                  `${operation.operationId}:${operation.status}:${operation.phase}`,
              ),
              armed: await IOUtils.exists(
                await checkpointPath(
                  initialComposition.checkpointRoot,
                  checkpoint,
                  "armed",
                ),
              ),
              held: await IOUtils.exists(
                await checkpointPath(
                  initialComposition.checkpointRoot,
                  checkpoint,
                  "held",
                ),
              ),
              release: await IOUtils.exists(
                await checkpointPath(
                  initialComposition.checkpointRoot,
                  checkpoint,
                  "release",
                ),
              ),
            }),
          );
          assert.isNotEmpty(submitFailure);
          const replacement = await recoverReadySidecar(initial);
          replacementComposition = await clientFor(replacement);

          const continuation = await waitUntil(
            async () => {
              const operation =
                await replacementComposition!.client.maintenance.getOperation({
                  operation_id: operationId!,
                });
              return operation.phase === "continuation_required"
                ? operation
                : null;
            },
            120_000,
            "pm-02-continuation-required",
          );
          assert.equal(continuation.status, "pending");
          await assertRemainsStable(
            async () =>
              (
                await replacementComposition!.client.maintenance.getOperation({
                  operation_id: operationId!,
                })
              ).phase === "continuation_required",
            "pm-02-continuation-not-replayed",
          );
          const unchanged =
            await replacementComposition.client.references.getSidecarIndex();
          assert.equal(
            unchanged.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );

          const continueRequest = {
            action: "continue" as const,
            operation_id: operationId!,
          };
          const [firstContinue, duplicateContinue] = await Promise.all([
            replacementComposition.client.maintenance.controlOperation(
              continueRequest,
            ),
            replacementComposition.client.maintenance.controlOperation(
              continueRequest,
            ),
          ]);
          assert.equal(firstContinue.operation_id, operationId);
          assert.equal(duplicateContinue.operation_id, operationId);
          const terminal = await waitForTerminal(
            replacementComposition.client,
            firstContinue,
          );
          assert.equal(terminal.status, "completed");
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
        await removeCheckpointFiles(initialComposition.checkpointRoot, checkpoint);
        let restored: SynthesisPublicMaintenanceOperation | undefined;
        if (!replacementComposition) {
          const replacement = await waitUntil(
            () => readyDiscovery(initial.discovery.serviceInstanceId),
            120_000,
            "pm-03-replacement-ready",
          ).catch(() => undefined);
          if (replacement) {
            replacementComposition = await clientFor(replacement);
          }
        }
        if (replacementComposition) {
          restored = await cleanupOwnedReferences(
            ownedItems,
            replacementComposition.client,
          );
        } else {
          await eraseItems(ownedItems);
        }
        await initialComposition.dispose();
        await replacementComposition?.dispose();
        return restored?.status === "completed" ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PM",
      caseId: "PM-02",
      result,
      publicOutcome: result.abort
        ? undefined
        : "pending_restart_required_one_continue_winner_on_same_identity",
      evidence: result.abort
        ? []
        : [
            {
              kind: "maintenance-continuation",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "completed",
              operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  pm("PM-03 reconciles a killed running operation without replay", async function () {
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
      declaration: PHASE1_FAMILY_DECLARATIONS.PM,
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
            initialComposition.checkpointRoot,
            maintenanceCheckpoint,
          );
          await armCheckpoint(
            initialComposition.checkpointRoot,
            referenceCheckpoint,
          );

          const submitted =
            initialComposition.client.references.refreshReferenceSidecarNow();
          await waitForCheckpoint(
            initialComposition.checkpointRoot,
            maintenanceCheckpoint,
          );
          await releaseCheckpoint(
            initialComposition.checkpointRoot,
            maintenanceCheckpoint,
          );
          const accepted = await submitted;
          await waitForCheckpoint(
            initialComposition.checkpointRoot,
            referenceCheckpoint,
          );
          const running =
            await initialComposition.client.maintenance.getOperation({
              operation_id: accepted.operation_id,
            });
          assert.equal(running.status, "running");

          await terminateProcess(initial.discovery.pid);
          const replacement = await recoverReadySidecar(initial);
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
          await assertRemainsStable(
            async () =>
              (
                await replacementComposition!.client.maintenance.getOperation({
                  operation_id: accepted.operation_id,
                })
              ).status === "failed",
            "pm-03-failed-not-replayed",
          );
          const unchanged =
            await replacementComposition.client.references.getSidecarIndex();
          assert.equal(
            unchanged.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );

          await armCheckpoint(
            replacementComposition.checkpointRoot,
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
            replacementComposition.checkpointRoot,
            referenceCheckpoint,
          );
          await releaseCheckpoint(
            replacementComposition.checkpointRoot,
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
          initialComposition.checkpointRoot,
          maintenanceCheckpoint,
        );
        await removeCheckpointFiles(
          initialComposition.checkpointRoot,
          referenceCheckpoint,
        );
        if (replacementComposition) {
          await removeCheckpointFiles(
            replacementComposition.checkpointRoot,
            referenceCheckpoint,
          );
        }
        await eraseItems(ownedItems);
        await initialComposition.dispose();
        await replacementComposition?.dispose();
        return "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PM",
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

  // prettier-ignore
  pm("PM-04 cancels a running operation only at promotion", async function () {
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const checkpoint = "reference-after-first-page";
    const ownedItems: Zotero.Item[] = [];
    let operationId: string | undefined;
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.PM,
      execute: async () => {
        try {
          const baseline =
            await composition.client.references.getSidecarIndex();
          ownedItems.push(
            ...(await createSyntheticReferences(
              "System E2E maintenance cancellation",
            )),
          );
          await Zotero.Promise.delay(HOST_FACTS_SETTLE_MS);
          await armCheckpoint(composition.checkpointRoot, checkpoint);
          const accepted =
            await composition.client.references.refreshReferenceSidecarNow();
          operationId = accepted.operation_id;
          await waitForCheckpoint(composition.checkpointRoot, checkpoint);
          const running = await waitUntil(async () => {
            const operation = await composition.client.maintenance.getOperation(
              {
                operation_id: accepted.operation_id,
              },
            );
            return operation.status === "running" ? operation : null;
          });
          assert.equal(running.phase, "running");
          const cancelRequested =
            await composition.client.maintenance.controlOperation({
              action: "cancel",
              operation_id: accepted.operation_id,
            });
          assert.equal(cancelRequested.status, "running");
          assert.equal(cancelRequested.phase, "cancel_requested");
          await assertRemainsStable(
            async () => {
              const operation =
                await composition.client.maintenance.getOperation({
                  operation_id: accepted.operation_id,
                });
              return (
                operation.status === "running" &&
                operation.phase === "cancel_requested"
              );
            },
            "pm-04-cancel-requested-stable",
          );

          await releaseCheckpoint(composition.checkpointRoot, checkpoint);
          const terminal = await waitForTerminal(composition.client, accepted);
          assert.equal(
            terminal.status,
            "canceled",
            diagnosticCodes(terminal).join(","),
          );
          assert.equal(terminal.phase, "canceled");
          assert.include(diagnosticCodes(terminal), "operation_canceled");
          const unchanged =
            await composition.client.references.getSidecarIndex();
          assert.equal(
            unchanged.diagnostics.repository_basis_hash,
            baseline.diagnostics.repository_basis_hash,
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        await releaseCheckpoint(composition.checkpointRoot, checkpoint).catch(
          () => undefined,
        );
        await removeCheckpointFiles(composition.checkpointRoot, checkpoint);
        const restored = await cleanupOwnedReferences(
          ownedItems,
          composition.client,
        );
        await composition.dispose();
        return restored?.status === "completed" ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "PM",
      caseId: "PM-04",
      result,
      publicOutcome: result.abort
        ? undefined
        : "cancel_requested_terminalized_at_promotion_without_commit",
      evidence: result.abort
        ? []
        : [
            {
              kind: "maintenance-cancellation",
              schemaVersion: "synthesis.maintenance_operation.v1",
              terminalStatus: "canceled",
              operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  cg("CG-01 rejects a stale graph view after public rebuild", async function () {
    const facts = (await readPhase1StructuralFacts()).citationGraph;
    const ready = await waitUntil(() => readyDiscovery());
    const composition = await clientFor(ready);
    const ownedItems: Zotero.Item[] = [];
    let oldGraphHash = "";
    let newGraphHash = "";
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.CG,
      execute: async () => {
        try {
          const baselineRebuild = await waitForTerminal(
            composition.client,
            await composition.client.graph.rebuildCitationGraphCacheNow(),
          );
          assert.equal(
            baselineRebuild.status,
            "completed",
            `baseline-rebuild:${diagnosticCodes(baselineRebuild).join(",")}`,
          );
          const oldView = await composition.client.graph.getOverview();
          oldGraphHash = oldView.graph_hash;

          const source = new Zotero.Item("journalArticle");
          source.setField("title", facts.nodes[0]);
          source.setField("date", "2026");
          await source.saveTx();
          const target = new Zotero.Item("journalArticle");
          target.setField("title", facts.nodes[1]);
          target.setField("date", "2026");
          await target.saveTx();
          ownedItems.push(
            source,
            target,
            await addPayloadNote(source, facts.nodes[0], facts.nodes[1]),
          );
          const referenceRefresh = await refreshReferencesAfterMutation(
            composition.client,
          );
          assert.equal(
            referenceRefresh.status,
            "completed",
            `reference-refresh:${diagnosticCodes(referenceRefresh).join(",")}`,
          );
          const rebuilt = await waitForTerminal(
            composition.client,
            await composition.client.graph.rebuildCitationGraphCacheNow(),
          );
          assert.equal(
            rebuilt.status,
            "completed",
            `graph-rebuild:${diagnosticCodes(rebuilt).join(",")}`,
          );
          const freshView = await composition.client.graph.getOverview();
          newGraphHash = freshView.graph_hash;
          assert.notEqual(newGraphHash, oldGraphHash);

          let staleFailure: unknown;
          try {
            await composition.client.graph.getOverview({
              basis: { expectedGraphHash: oldGraphHash },
            });
          } catch (error) {
            staleFailure = error;
          }
          assert.instanceOf(staleFailure, SynthesisClientError);
          assert.equal((staleFailure as SynthesisClientError).code, "conflict");
          assert.equal(
            (staleFailure as SynthesisClientError).details?.sidecarCode,
            "basis_mismatch",
          );
          const unchanged = await composition.client.graph.getOverview({
            basis: { expectedGraphHash: newGraphHash },
          });
          assert.equal(unchanged.graph_hash, newGraphHash);
          const slice = await composition.client.graph.getSlice({
            paperRef: paperRef(source),
            direction: "outgoing",
            depth: 1,
            expectedGraphHash: newGraphHash,
          });
          assert.equal(slice.graph_hash, newGraphHash);
          const sourceNode = slice.nodes.find(
            (node) => node.node_id === paperRef(source),
          );
          assert.equal(sourceNode?.kind, "library_paper");
          const edge = slice.edges.find(
            (entry) => entry.source === paperRef(source),
          );
          assert.isOk(edge, "rebuilt graph contains the synthetic citation edge");
          assert.isOk(
            slice.nodes.some(
              (node) =>
                node.node_id === edge!.target &&
                (node.node_id === paperRef(target) ||
                  node.title === facts.nodes[1]),
            ),
            "citation edge resolves to the synthetic target",
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        const referenceRefresh = await cleanupOwnedReferences(
          ownedItems,
          composition.client,
        );
        const graphRebuild = await waitForTerminal(
          composition.client,
          await composition.client.graph.rebuildCitationGraphCacheNow(),
        ).catch(() => undefined);
        const restored = await composition.client.graph
          .getOverview()
          .catch(() => undefined);
        await composition.dispose();
        return referenceRefresh?.status === "completed" &&
          graphRebuild?.status === "completed" &&
          (!oldGraphHash || restored?.graph_hash === oldGraphHash)
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "CG",
      caseId: "CG-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "stale_graph_view_rejected_without_mutation_and_fresh_view_readable",
      evidence: result.abort
        ? []
        : [
            {
              kind: "citation-graph-basis",
              schemaVersion: "synthesis.unified_citation_graph@1.0.0",
              terminalStatus: "basis_mismatch",
              oldGraphHash,
              newGraphHash,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  hb("HB-01 exactly replays one public Unicode note mutation", async function () {
    const facts = (await readPhase1StructuralFacts()).unicodeNote;
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Synthetic Host Bridge Replay Parent");
    parent.setField("date", "2026");
    await parent.saveTx();
    const operationId = "system-e2e:hb:01";
    const previousApprovalSetting = getPref("hostBridgeDisableWriteApproval");
    let caseError = "";
    let noteKey = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.HB,
      execute: async () => {
        try {
          setPref("hostBridgeDisableWriteApproval", true);
          const bridge = await ensureHostBridgeServer();
          assert.equal(bridge.status, "running");
          const command = [
            "mutation",
            "note",
            "create",
            "--item",
            `${parent.libraryID}:${parent.key}`,
            "--input",
            JSON.stringify({ content: facts.html }),
            "--operation-id",
            operationId,
          ];
          const first = await runHostBridgeCli(command);
          const replay = await runHostBridgeCli(command);
          assert.equal(first.exitCode, 0, first.output.error?.message);
          assert.isTrue(first.output.ok);
          assert.deepEqual(replay.output, first.output);

          const observed = await runHostBridgeCli([
            "mutation",
            "get-operation",
            operationId,
          ]);
          assert.equal(observed.exitCode, 0, observed.output.error?.message);
          assert.equal(observed.output.data?.data?.state, "settled");
          assert.deepEqual(
            observed.output.data?.data?.result,
            first.output.data?.data,
          );

          const listed = await runHostBridgeCli([
            "library",
            "item",
            "notes",
            "--key",
            parent.key,
            "--library-id",
            String(parent.libraryID),
            "--limit",
            "10",
          ]);
          const notes = listed.output.data?.data?.notes as
            | Array<{ ref?: { key?: string } }>
            | undefined;
          assert.equal(listed.output.data?.data?.total, 1);
          assert.lengthOf(notes || [], 1);
          noteKey = notes?.[0]?.ref?.key || "";
          assert.isNotEmpty(noteKey);

          const detail = await runHostBridgeCli([
            "library",
            "note",
            "get",
            "--key",
            noteKey,
            "--library-id",
            String(parent.libraryID),
            "--format",
            "html",
          ]);
          assert.equal(detail.output.data?.data?.content, facts.html);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setPref(
          "hostBridgeDisableWriteApproval",
          previousApprovalSetting === true,
        );
        await eraseItems([parent]);
        return Zotero.Items.getByLibraryAndKey(parent.libraryID, parent.key)
          ? "failed"
          : "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "HB",
      caseId: "HB-01",
      result,
      publicOutcome: result.abort
        ? undefined
        : "one_settled_canonical_operation_and_one_unicode_note",
      evidence: result.abort
        ? []
        : [
            {
              kind: "canonical-mutation",
              schemaVersion: "zotero-agents.mutation-receipt.v1",
              terminalStatus: "settled",
              operationId,
              noteKey,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  // prettier-ignore
  hb("HB-02 rejects a changed semantic digest without changing evidence", async function () {
    const facts = (await readPhase1StructuralFacts()).unicodeNote;
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Synthetic Host Bridge Conflict Parent");
    parent.setField("date", "2026");
    await parent.saveTx();
    const operationId = "system-e2e:hb:02";
    const previousApprovalSetting = getPref("hostBridgeDisableWriteApproval");
    let caseError = "";

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.HB,
      execute: async () => {
        try {
          setPref("hostBridgeDisableWriteApproval", true);
          const bridge = await ensureHostBridgeServer();
          assert.equal(bridge.status, "running");
          const create = (content: string) =>
            runHostBridgeCli([
              "mutation",
              "note",
              "create",
              "--item",
              `${parent.libraryID}:${parent.key}`,
              "--input",
              JSON.stringify({ content }),
              "--operation-id",
              operationId,
            ]);
          const first = await create(facts.html);
          assert.equal(first.exitCode, 0, first.output.error?.message);
          const evidenceBefore = await runHostBridgeCli([
            "mutation",
            "get-operation",
            operationId,
          ]);

          const conflict = await create(`${facts.html}<p>changed</p>`);
          assert.notEqual(conflict.exitCode, 0);
          assert.equal(conflict.output.error?.code, "idempotency_conflict");
          const evidenceAfter = await runHostBridgeCli([
            "mutation",
            "get-operation",
            operationId,
          ]);
          assert.deepEqual(evidenceAfter.output, evidenceBefore.output);

          const listed = await runHostBridgeCli([
            "library",
            "item",
            "notes",
            "--key",
            parent.key,
            "--library-id",
            String(parent.libraryID),
            "--limit",
            "10",
          ]);
          const notes = listed.output.data?.data?.notes as
            | Array<{ ref?: { key?: string } }>
            | undefined;
          assert.equal(listed.output.data?.data?.total, 1);
          assert.lengthOf(notes || [], 1);
          const noteKey = notes?.[0]?.ref?.key || "";
          const detail = await runHostBridgeCli([
            "library",
            "note",
            "get",
            "--key",
            noteKey,
            "--library-id",
            String(parent.libraryID),
            "--format",
            "html",
          ]);
          assert.equal(detail.output.data?.data?.content, facts.html);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setPref(
          "hostBridgeDisableWriteApproval",
          previousApprovalSetting === true,
        );
        await eraseItems([parent]);
        return Zotero.Items.getByLibraryAndKey(parent.libraryID, parent.key)
          ? "failed"
          : "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });

    await emitCase({
      familyId: "HB",
      caseId: "HB-02",
      result,
      publicOutcome: result.abort
        ? undefined
        : "semantic_digest_conflict_preserved_original_note_and_evidence",
      evidence: result.abort
        ? []
        : [
            {
              kind: "canonical-mutation-conflict",
              schemaVersion: "host-bridge.v2",
              terminalStatus: "idempotency_conflict",
              operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

describe("System E2E Host Bridge owner restart", function () {
  this.timeout(240_000);

  // prettier-ignore
  hb("HB-03 reconciles admitted canonical mutation evidence without replay", async function () {
    const resume =
      readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "HB-03";
    const facts = (await readPhase1StructuralFacts()).unicodeNote;

    if (!resume) {
      const parent = new Zotero.Item("journalArticle");
      parent.setField("title", "Synthetic Host Bridge Interrupted Parent");
      parent.setField("date", "2026");
      await parent.saveTx();
      const operationId = "system-e2e:hb:03";
      const processId = Number(
        (Zotero.Utilities.Internal as any).getProcessID?.() || 0,
      );
      const previousApprovalSetting =
        getPref("hostBridgeDisableWriteApproval") === true;
      assert.isAbove(processId, 0);
      await IOUtils.writeUTF8(
        hostBridgeRestartStatePath(),
        JSON.stringify({
          operationId,
          processId,
          parent: { libraryId: parent.libraryID, key: parent.key },
          previousApprovalSetting,
        } satisfies HostBridgeRestartState),
      );
      setPref("hostBridgeDisableWriteApproval", true);
      await IOUtils.writeUTF8(
        hostBridgeAdmissionCheckpointPath("armed.json"),
        JSON.stringify({ operationId }),
      );
      const bridge = await ensureHostBridgeServer();
      assert.equal(bridge.status, "running");
      await emitZoteroTestDebug({
        kind: "system-e2e-owner-restart-request",
        caseId: "HB-03",
        operationId,
        processId,
      });

      const unexpected = await runHostBridgeCli([
        "mutation",
        "note",
        "create",
        "--item",
        `${parent.libraryID}:${parent.key}`,
        "--input",
        JSON.stringify({ content: facts.html }),
        "--operation-id",
        operationId,
      ]);
      setPref("hostBridgeDisableWriteApproval", previousApprovalSetting);
      await removeHostBridgeAdmissionCheckpoint();
      await eraseItems([parent]);
      await IOUtils.remove(hostBridgeRestartStatePath(), {
        ignoreAbsent: true,
      });
      throw new Error(
        `system_e2e_owner_restart_not_performed:${unexpected.exitCode}`,
      );
    }

    const state = await readHostBridgeRestartState();
    const parent = Zotero.Items.getByLibraryAndKey(
      state.parent.libraryId,
      state.parent.key,
    );
    assert.isOk(parent);
    let caseError = "";
    let processGone = false;

    const result = await runFamilyLifecycle({
      declaration: PHASE1_FAMILY_DECLARATIONS.HB,
      execute: async () => {
        try {
          setPref("hostBridgeDisableWriteApproval", true);
          const bridge = await ensureHostBridgeServer();
          assert.equal(bridge.status, "running");
          processGone = !(await processIsAlive(state.processId));
          assert.isTrue(processGone, "interrupted Zotero owner must be gone");

          const observed = await runHostBridgeCli([
            "mutation",
            "get-operation",
            state.operationId,
          ]);
          assert.equal(observed.exitCode, 0, observed.output.error?.message);
          assert.equal(observed.output.data?.data?.state, "settled");
          assert.equal(
            (observed.output.data?.data?.result as { outcome?: string })
              ?.outcome,
            "unknown",
          );

          const generic = await runHostBridgeCli([
            "operation",
            "get",
            state.operationId,
          ]);
          assert.notEqual(generic.exitCode, 0);
          assert.isFalse(generic.output.ok);
          assert.isUndefined(generic.output.data);

          const listNotes = () =>
            runHostBridgeCli([
              "library",
              "item",
              "notes",
              "--key",
              state.parent.key,
              "--library-id",
              String(state.parent.libraryId),
              "--limit",
              "10",
            ]);
          const beforeReplay = await listNotes();
          assert.equal(beforeReplay.output.data?.data?.total, 0);

          const replay = await runHostBridgeCli([
            "mutation",
            "note",
            "create",
            "--item",
            `${state.parent.libraryId}:${state.parent.key}`,
            "--input",
            JSON.stringify({ content: facts.html }),
            "--operation-id",
            state.operationId,
          ]);
          assert.equal(replay.exitCode, 0, replay.output.error?.message);
          assert.equal(
            (replay.output.data?.data as { outcome?: string })?.outcome,
            "unknown",
          );
          assert.equal((await listNotes()).output.data?.data?.total, 0);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setPref(
          "hostBridgeDisableWriteApproval",
          state.previousApprovalSetting,
        );
        if (parent) await eraseItems([parent]);
        await IOUtils.remove(hostBridgeRestartStatePath(), {
          ignoreAbsent: true,
        });
        await removeHostBridgeAdmissionCheckpoint();
        return parent &&
          Zotero.Items.getByLibraryAndKey(
            state.parent.libraryId,
            state.parent.key,
          )
          ? "failed"
          : "passed";
      },
      healthGate: () =>
        observeSystemE2EHealth({
          residualOwnedState: processGone ? [] : ["interrupted-host-process"],
          exemptMutationOperationIds: [state.operationId],
        }),
    });

    await emitCase({
      familyId: "HB",
      caseId: "HB-03",
      result,
      publicOutcome: result.abort
        ? undefined
        : "interrupted_canonical_mutation_reconciled_unknown_without_replay",
      evidence: result.abort
        ? []
        : [
            {
              kind: "canonical-mutation-restart",
              schemaVersion: "zotero-agents.mutation-attempt.v1",
              terminalStatus: "unknown",
              operationId: state.operationId,
            },
          ],
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

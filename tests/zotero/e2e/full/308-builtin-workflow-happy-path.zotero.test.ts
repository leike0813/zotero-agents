import { assert } from "chai";
import { config } from "../../../../package.json";
import type { PrivateWorkflowSource } from "../../../../scripts/system-e2e/workflowSource";
import {
  listSidecarDiscoveries,
  observeSystemE2EHealth,
  readSystemE2ESidecarConnection,
  waitUntil,
} from "../../../../scripts/system-e2e/healthGate";
import { createBackendsPrefsDocument } from "../../../../src/backends/registry";
import type { BackendInstance } from "../../../../src/backends/types";
import { createAcpBackendFromPresetOptions } from "../../../../src/modules/acp/chat/acpBackendPresets";
import { probeAcpBackendRuntimeOptions } from "../../../../src/modules/acp/transport/acpBackendProbe";
import {
  listAcpSkillRuns,
  deleteAcpSkillRunRecords,
} from "../../../../src/modules/acp/skillRun/acpSkillRunStore";
import {
  runFamilyLifecycle,
  WF_FAMILY_DECLARATION,
} from "../../../../scripts/system-e2e/familyLifecycle";
import { createWorkflowHostApi } from "../../../../src/workflows/hostApi";
import {
  listWorkflowProducts,
  resolveManagedWorkflowProductAsset,
} from "../../../../src/modules/workflow/catalog/workflowProductStore";
import {
  validateLiteratureProductManifest,
  verifyLiteratureProductFiles,
} from "../../../../workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs";
import { resolveAcpSkillRunPermissionRequest } from "../../../../src/modules/acp/skillRun/acpSkillRunPermissionQueue";
import { getHostBridgePermissionProjection } from "../../../../src/modules/hostBridge/permissions/hostBridgePermissionManager";
import {
  cancelAcpSkillRun,
  endAcpSkillRunSession,
  replyAcpSkillRun,
} from "../../../../src/modules/acp/skillRun/acpSkillRunActions";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import { listRuntimeLogs } from "../../../../src/modules/runtimeLogManager";
import { listWorkflowTasks } from "../../../../src/modules/taskRuntime";
import { getPref, setPref } from "../../../../src/utils/prefs";
import {
  getPreferredWindowsShellCommandsFromRegistry,
  preflightRuntimeCommandsOnStartup,
} from "../../../../src/platform/command";
import { preflightRuntimeEnvironmentOnStartup } from "../../../../src/platform/env";
import { preflightRuntimeProcessControlOnStartup } from "../../../../src/platform/processControl";
import { executeWorkflowFromCurrentSelection } from "../../../../src/modules/workflow/ui/workflowExecute";
import { submitHostBridgeWorkflow } from "../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowControl";
import {
  registerHostBridgeUploadedFile,
  resolveHostBridgeFileDownload,
} from "../../../../src/modules/runtimeFileRegistry";
import type { WorkflowResourceBindings } from "../../../../src/workflows/types";
import {
  getLoadedWorkflowEntries,
  getDefaultWorkflowDir,
  rescanWorkflowRegistry,
} from "../../../../src/modules/workflow/catalog/workflowRuntime";
import {
  getConfiguredContentFeedUrls,
  installContentPackageFromFeed,
} from "../../../../src/modules/workflow/catalog/contentPackageSubscription";
import { createWorkflowSynthesisHostApi } from "../../../../src/modules/synthesisClient/workflowHostClient";
import { createNativeSynthesisClientComposition } from "../../../../src/modules/synthesisClient/nativeComposition";
import { createSynthesisSidecarRpcClient } from "../../../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import { SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS } from "../../../../src/modules/synthesis/production/synthesisProductionRpcPolicy";
import type { TagAuditRunResultDto } from "../../../../packages/synthesis-contracts/src/tags";
import {
  getDefaultSynthesisClient,
  resetDefaultSynthesisClientForTests,
  setDefaultSynthesisClientCompositionFactoryForTests,
} from "../../../../src/modules/synthesisClient/defaultClient";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
import { emitZoteroTestDebug } from "../../diagnosticBridge";
import { systemE2ECase } from "../../systemE2ECases";

const MODEL = "minimax-cn-coding-plan/MiniMax-M3.1-Flash";
type CaptureResourceInputs = Record<
  string,
  Array<{ path: string; contentType: string }>
>;

async function importPrivateSource(
  onProgress: (count: number) => Promise<void>,
) {
  const root = PathUtils.join(Zotero.DataDirectory.dir, "workflow-e2e");
  const source = JSON.parse(
    await IOUtils.readUTF8(PathUtils.join(root, "source.json")),
  ) as PrivateWorkflowSource;
  assert.equal(source.schemaVersion, "workflow-e2e-private-source.v1");
  const collections = new Map<string, Zotero.Collection>();
  for (const record of source.collections) {
    const collection = new Zotero.Collection();
    collection.name = record.name;
    await collection.saveTx();
    collections.set(record.sourceKey, collection);
  }
  for (const record of source.collections) {
    if (!record.parentKey) continue;
    const collection = collections.get(record.sourceKey)!;
    collection.parentID = collections.get(record.parentKey)!.id;
    await collection.saveTx();
  }
  const imported: Array<{ sourceKey: string; id: number; pdfIds: number[] }> =
    [];
  for (const record of source.items) {
    const parent = new Zotero.Item(record.itemType);
    for (const [field, value] of Object.entries(record.fields))
      parent.setField(field, value);
    parent.setCreators(record.creators);
    parent.setTags(record.tags);
    parent.setCollections(
      record.collectionKeys.map((key) => collections.get(key)!.id),
    );
    await parent.saveTx();
    const pdfIds: number[] = [];
    for (const pdf of record.pdfs) {
      const attachment = await Zotero.Attachments.importFromFile({
        file: PathUtils.join(root, ...pdf.path.split("/")),
        parentItemID: parent.id,
        title: pdf.title,
        contentType: pdf.contentType,
      });
      assert.equal(attachment.parentItemID, parent.id);
      assert.isTrue(await attachment.fileExists());
      pdfIds.push(attachment.id);
    }
    imported.push({ sourceKey: record.sourceKey, id: parent.id, pdfIds });
    if (imported.length % 10 === 0) await onProgress(imported.length);
  }
  assert.lengthOf(imported, source.facts.items);
  assert.equal(
    imported.reduce((n, entry) => n + entry.pdfIds.length, 0),
    source.facts.pdfs,
  );
  return {
    imported,
    collections: [...collections.values()].map((entry) => entry.id),
    facts: source.facts,
  };
}

{
  const live = readDiagnosticsEnv("ZOTERO_WORKFLOW_E2E_MODE") === "live";
  describe("Builtin Workflow happy paths", function () {
    this.timeout(0);

    systemE2ECase(
      "WF-01",
      "WF",
      "WF-01 verifies production workflow happy paths",
      async function () {
        const evidenceRoot = live
          ? readDiagnosticsEnv("ZOTERO_WORKFLOW_E2E_PRIVATE_DIR")
          : PathUtils.join(Zotero.DataDirectory.dir, "system-e2e", "wf-01");
        assert.isNotEmpty(evidenceRoot);
        await IOUtils.makeDirectory(evidenceRoot, { createAncestors: true });
        let stage = "source-import";
        let succeeded = false;
        const privateWrite = (name: string, value: unknown) =>
          IOUtils.writeUTF8(
            PathUtils.join(evidenceRoot, name),
            JSON.stringify(value, null, 2),
          );
        const runtime = globalThis as any;
        const original = {
          addon: runtime.addon,
          toolkit: runtime.ztoolkit,
          backends: getPref("backendsConfigJson"),
          channel: getPref("contentFeedChannel"),
          mirror: getPref("contentDevFeedMirrorUrl"),
          workflowDir: getPref("workflowDir"),
        };
        const priorRuns = new Set(
          listAcpSkillRuns().map((run) => run.requestId),
        );
        let caseError: unknown;
        const lifecycle = await runFamilyLifecycle({
          declaration: WF_FAMILY_DECLARATION,
          execute: async () => {
            try {
              runtime.addon = (Zotero as any)[config.addonInstance];
              runtime.ztoolkit = runtime.addon?.data?.ztoolkit;
              assert.isFunction(
                runtime.ztoolkit?.Dialog,
                "workflow_capture_dialog_host_missing",
              );
              // Scaffold test bundles own separate runtime caches from the plugin.
              stage = "runtime-preflight";
              const shellCommands = await preflightRuntimeCommandsOnStartup({
                commands: ["pwsh", "powershell"],
              });
              await preflightRuntimeEnvironmentOnStartup({
                powershellCommands:
                  getPreferredWindowsShellCommandsFromRegistry(shellCommands),
              });
              const commands = await preflightRuntimeCommandsOnStartup();
              await preflightRuntimeProcessControlOnStartup();
              await privateWrite("runtime-commands.json", commands);
              assert.isTrue(
                commands.commands.uv?.available ||
                  Boolean(commands.primaryPython?.available),
                "workflow_capture_dependency_strategy_missing",
              );
              stage = "synthesis-connect";
              const discovery = await waitUntil(
                async () => {
                  const found = (await listSidecarDiscoveries()).filter(
                    (entry) => entry.discovery.lifecycleState === "ready",
                  );
                  return found.length === 1 ? found[0] : null;
                },
                60_000,
                "workflow_capture_sidecar_ready",
              );
              const connection =
                await readSystemE2ESidecarConnection(discovery);
              const auditOutcomes: unknown[] = [];
              const rpc = createSynthesisSidecarRpcClient({
                transportErrors: SYNTHESIS_PRODUCTION_RPC_TRANSPORT_ERRORS,
              });
              setDefaultSynthesisClientCompositionFactoryForTests(() =>
                createNativeSynthesisClientComposition({
                  getReadyConnection: () => connection,
                  rpcClient: {
                    async call(args) {
                      const result = await rpc.call(args);
                      if (args.capability === "client.promoteTagAuditRun")
                        auditOutcomes.push(result);
                      return result;
                    },
                  },
                }),
              );
              await createWorkflowSynthesisHostApi().tags.loadVocabulary();
              stage = "source-import";
              const continuationPath = PathUtils.join(
                Zotero.DataDirectory.dir,
                "workflow-e2e",
                "continuation.json",
              );
              const continuation = (await IOUtils.exists(continuationPath))
                ? (JSON.parse(await IOUtils.readUTF8(continuationPath)) as {
                    priorEvidenceRoot: string;
                    imported: Awaited<ReturnType<typeof importPrivateSource>>;
                    completed: string[];
                  })
                : undefined;
              const imported =
                continuation?.imported ||
                (await importPrivateSource((count) =>
                  privateWrite("source-import-progress.json", {
                    importedItems: count,
                  }),
                ));
              if (!live) {
                const identity = JSON.parse(
                  await IOUtils.readUTF8(
                    PathUtils.join(
                      Zotero.DataDirectory.dir,
                      "workflow-e2e",
                      "fixture.json",
                    ),
                  ),
                );
                await privateWrite("fixture.json", identity);
              }
              if (continuation) {
                for (const entry of imported.imported) {
                  const parent = await Zotero.Items.getAsync(entry.id);
                  assert.isTrue(parent.isRegularItem());
                  for (const id of entry.pdfIds) {
                    const pdf = await Zotero.Items.getAsync(id);
                    assert.equal(pdf.parentItemID, parent.id);
                    assert.isTrue(await pdf.fileExists());
                  }
                }
                await privateWrite("continuation.json", {
                  priorEvidenceRoot: continuation.priorEvidenceRoot,
                  completed: continuation.completed,
                });
              }
              await privateWrite("import.json", imported);
              stage = "content-install";
              setDebugModeOverrideForTests(true);
              let contentVersion = "local-source";
              if (live) {
                setPref("contentFeedChannel", "dev");
                setPref(
                  "contentDevFeedMirrorUrl",
                  getConfiguredContentFeedUrls("dev").find(
                    (source) => source.kind === "primary",
                  )!.url,
                );
                const installed = await installContentPackageFromFeed({
                  channel: "dev",
                });
                if (!installed.ok)
                  throw new Error(
                    `content_install:${installed.code}:${installed.message}`,
                  );
                contentVersion = installed.installed.package.version;
                assert.equal(
                  contentVersion,
                  readDiagnosticsEnv("ZOTERO_TEST_CONTENT_VERSION"),
                );
              }
              setPref(
                "workflowDir",
                live
                  ? getDefaultWorkflowDir()
                  : readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
              );
              await rescanWorkflowRegistry();
              const workflows = getLoadedWorkflowEntries();
              const devContentRoot = readDiagnosticsEnv(
                "ZOTERO_AGENTS_CONTENT_DEV_ROOT",
              );
              const expectedSource = !live
                ? "user"
                : devContentRoot
                  ? "dev-local"
                  : "official";
              assert.isTrue(
                workflows.every(
                  (entry) => entry.workflowSourceKind === expectedSource,
                ),
                "workflow_capture_content_source_mismatch",
              );
              const workflow = workflows.find(
                (entry) => entry.manifest.id === "tag-bootstrapper",
              );
              assert.isOk(workflow);
              await privateWrite(
                "catalog.json",
                workflows.map((entry) => ({
                  id: entry.manifest.id,
                  source: entry.workflowSourceKind,
                  rootDir: entry.rootDir,
                  contentDigest: entry.contentDigest,
                })),
              );
              stage = "backend-probe";
              const token = live
                ? readDiagnosticsEnv("MINERU_TOKEN")
                : "synthetic";
              assert.isNotEmpty(token, "mineru_token_missing");
              const mineru: BackendInstance = {
                id: "workflow-e2e-mineru",
                type: "generic-http",
                baseUrl: live
                  ? "https://mineru.net"
                  : readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT"),
                auth: { kind: "bearer", token },
                defaults: { timeout_ms: 600_000 },
              };
              const backend = createAcpBackendFromPresetOptions("opencode-v2", {
                useNpx: false,
                isolated: true,
              });
              backend.command =
                readDiagnosticsEnv("ZOTERO_WORKFLOW_E2E_OPENCODE") ||
                "opencode2";
              if (!live) {
                backend.command = readDiagnosticsEnv(
                  "ZOTERO_SYSTEM_E2E_NODE_PATH",
                );
                backend.args = [
                  PathUtils.join(
                    PathUtils.parent(
                      readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
                    ),
                    "tests",
                    "fixtures",
                    "workflow-happy-path",
                    "acp-agent.mjs",
                  ),
                ];
                backend.env = {
                  ZOTERO_WORKFLOW_FIXTURE_PAPER_REFS: JSON.stringify(
                    await Promise.all(
                      imported.imported.map(async (entry) => {
                        const item = await Zotero.Items.getAsync(entry.id);
                        return `${item.libraryID}:${item.key}`;
                      }),
                    ),
                  ),
                };
              }
              const probe = await probeAcpBackendRuntimeOptions({ backend });
              if (!probe.ok) throw new Error(`acp_probe_failed:${probe.error}`);
              assert.include(
                probe.backend.acp?.runtimeOptionsCache?.rawModels?.map(
                  (model) => model.id,
                ) || [],
                MODEL,
              );
              setPref(
                "backendsConfigJson",
                JSON.stringify(
                  createBackendsPrefsDocument([probe.backend, mineru]),
                ),
              );
              await privateWrite("environment.json", {
                zoteroVersion: Zotero.version,
                contentVersion,
                workflowSource: expectedSource,
                devContentRoot,
                model: MODEL,
                backendId: backend.id,
              });
              let approvalIndex = 0;
              let permissionIndex = 0;
              let dialogIndex = 0;
              let observedDialog: Window | undefined;
              const completed: string[] = [...(continuation?.completed || [])];
              const invoke = async (
                workflowId: string,
                selectedIds: number[],
                workflowParams: Record<string, unknown>,
                resourceInputs?: CaptureResourceInputs,
              ) => {
                const outputs: Record<string, string> = {};
                stage = workflowId;
                const selectedWorkflow = workflows.find(
                  (entry) => entry.manifest.id === workflowId,
                );
                assert.isOk(
                  selectedWorkflow,
                  "workflow_capture_workflow_missing",
                );
                const win = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
                await win.ZoteroPane.collectionsView.selectLibrary(1);
                if (selectedIds.length)
                  await win.ZoteroPane.selectItems(selectedIds);
                else win.ZoteroPane.itemsView.selection.clearSelection();
                const before = new Set(
                  listAcpSkillRuns().map((run) => run.requestId),
                );
                const previousTasks = new Set(
                  listWorkflowTasks().map((task) => task.id),
                );
                const previousAudits = auditOutcomes.length;
                let finished = false;
                let executionError: unknown;
                const outputSlots =
                  selectedWorkflow!.manifest.resourceRequirements?.filter(
                    (slot) => slot.direction === "output",
                  ) || [];
                const execution = (async () => {
                  if (resourceInputs !== undefined || outputSlots.length) {
                    const bindings: WorkflowResourceBindings = {
                      schema: "zotero-bridge.workflow-resources.v1",
                      inputs: {},
                      outputs: Object.fromEntries(
                        outputSlots.map((slot) => [
                          slot.id,
                          { delivery: "bridge-download" as const },
                        ]),
                      ),
                    };
                    for (const [slot, files] of Object.entries(
                      resourceInputs || {},
                    )) {
                      const fileIds: string[] = [];
                      for (const file of files) {
                        const segments = file.path.split("/");
                        assert.isTrue(
                          segments.every(
                            (part) =>
                              part &&
                              part !== "." &&
                              part !== ".." &&
                              !/[\\:]/.test(part),
                          ),
                          "workflow_capture_resource_path_invalid",
                        );
                        const uploaded = await registerHostBridgeUploadedFile({
                          bytes: await IOUtils.read(
                            PathUtils.join(evidenceRoot, ...segments),
                          ),
                          displayName: segments.at(-1)!,
                          contentType: file.contentType,
                        });
                        fileIds.push(uploaded.fileId);
                      }
                      bindings.inputs[slot] = { fileIds };
                    }
                    const items = await Promise.all(
                      selectedIds.map(async (id) => {
                        const item = await Zotero.Items.getAsync(id);
                        return { libraryId: item.libraryID, key: item.key };
                      }),
                    );
                    const approval = getPref("hostBridgeDisableWriteApproval");
                    try {
                      // The user authorized these isolated import/export operations.
                      setPref("hostBridgeDisableWriteApproval", true);
                      const submitted = await submitHostBridgeWorkflow({
                        payload: {
                          workflowId,
                          selection: items.length
                            ? { kind: "items", items }
                            : { kind: "none" },
                          workflowOptions: workflowParams,
                          resourceBindings: bindings,
                        },
                      });
                      await privateWrite(
                        `step-${completed.length + 1}-submission.json`,
                        submitted,
                      );
                      assert.equal(submitted.admission, "direct");
                      for (const output of submitted.resourceOutputs) {
                        const resolved = await resolveHostBridgeFileDownload(
                          output.fileId,
                        );
                        const name = `step-${completed.length + 1}-${output.slotId}-${output.displayName}`;
                        assert.equal(
                          PathUtils.filename(
                            PathUtils.join(evidenceRoot, name),
                          ),
                          name,
                        );
                        await IOUtils.copy(
                          resolved.source.path,
                          PathUtils.join(evidenceRoot, name),
                        );
                        outputs[output.slotId] = name;
                      }
                    } finally {
                      setPref("hostBridgeDisableWriteApproval", approval);
                    }
                    return;
                  }
                  await executeWorkflowFromCurrentSelection({
                    win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
                    workflow: selectedWorkflow!,
                    executionOptionsOverride: {
                      backendId:
                        selectedWorkflow!.manifest.provider === "generic-http"
                          ? mineru.id
                          : selectedWorkflow!.manifest.provider ===
                              "skillrunner"
                            ? backend.id
                            : undefined,
                      workflowParams,
                      providerOptions:
                        selectedWorkflow!.manifest.provider === "skillrunner"
                          ? {
                              acpModelId: MODEL,
                              autoApproveAcpPermissions: true,
                            }
                          : {},
                      hostOptions: { queue: { maxConcurrency: 1 } },
                    },
                  });
                })()
                  .catch((error) => {
                    executionError = error;
                  })
                  .finally(() => {
                    finished = true;
                  });
                let interaction = "";
                const resolvedPermissions = new Set<string>();
                let deadline = Date.now() + 90 * 60_000;
                let previousObservationAt = Date.now();
                while (!finished) {
                  const runs = listAcpSkillRuns().filter(
                    (run) => !before.has(run.requestId),
                  );
                  const tasks = listWorkflowTasks().filter(
                    (task) => !previousTasks.has(task.id),
                  );
                  await privateWrite("current.json", { stage, runs, tasks });
                  const dialogWindow = runtime.addon?.data?.dialog?.window as
                    | Window
                    | undefined;
                  const editorRoot =
                    dialogWindow && !dialogWindow.closed
                      ? dialogWindow.document.getElementById(
                          "zs-workflow-editor-root",
                        )
                      : null;
                  if (editorRoot && dialogWindow !== observedDialog) {
                    observedDialog = dialogWindow;
                    dialogIndex += 1;
                    await privateWrite(`dialog-${dialogIndex}-open.json`, {
                      stage,
                      title: dialogWindow!.document.title,
                      text: editorRoot.textContent?.slice(0, 32_000),
                    });
                  } else if (observedDialog && !editorRoot) {
                    await privateWrite(`dialog-${dialogIndex}-close.json`, {
                      stage,
                    });
                    observedDialog = undefined;
                  }
                  if (
                    tasks.some(
                      (task) =>
                        task.state === "failed" || task.applyState === "failed",
                    )
                  )
                    throw new Error("workflow_capture_task_failed");
                  const failed = runs.find(
                    (run) =>
                      /^(?:failed|cancell?ed)/.test(run.status) ||
                      run.applyResultState === "failed",
                  );
                  if (failed)
                    throw new Error(
                      `workflow_capture_failed:${failed.requestId}:${failed.status}:${failed.error || failed.validationErrors?.join(";") || "terminal_failure"}`,
                    );
                  const waiting = runs.find((run) => run.pendingInteraction);
                  const permissionOwner = runs.find(
                    (run) => run.pendingPermission,
                  );
                  const observedAt = Date.now();
                  if (waiting || permissionOwner || editorRoot)
                    deadline += observedAt - previousObservationAt;
                  previousObservationAt = observedAt;
                  if (
                    permissionOwner &&
                    !resolvedPermissions.has(
                      permissionOwner.pendingPermission!.requestId,
                    )
                  ) {
                    const permission = permissionOwner.pendingPermission!;
                    assert.equal(permission.approvalKind, "zotero-write");
                    assert.equal(permission.source, "host-bridge-cli");
                    const approve = permission.options.find(
                      (option) => option.optionId === "approve_once",
                    );
                    assert.isOk(
                      approve,
                      "workflow_capture_permission_option_missing",
                    );
                    permissionIndex += 1;
                    await privateWrite(`permission-${permissionIndex}.json`, {
                      requestId: permissionOwner.requestId,
                      permission,
                      decision: approve!.optionId,
                      authority: "user-delegated isolated workflow capture",
                    });
                    assert.equal(
                      getHostBridgePermissionProjection(permission.requestId)
                        ?.state,
                      "pending",
                      "workflow_capture_permission_owner_mismatch",
                    );
                    // Workflow, Host server, and permission queue share this bundle.
                    resolveAcpSkillRunPermissionRequest({
                      runRequestId: permissionOwner.requestId,
                      permissionRequestId: permission.requestId,
                      outcome: "selected",
                      optionId: approve!.optionId,
                    });
                    await waitUntil(
                      async () =>
                        getHostBridgePermissionProjection(permission.requestId)
                          ?.state === "approved",
                      1000,
                      "workflow_capture_permission_not_consumed",
                    );
                    assert.notEqual(
                      listAcpSkillRuns().find(
                        (run) => run.requestId === permissionOwner.requestId,
                      )?.pendingPermission?.requestId,
                      permission.requestId,
                      "workflow_capture_permission_still_pending",
                    );
                    await privateWrite(
                      `permission-${permissionIndex}-resolved.json`,
                      {
                        requestId: permissionOwner.requestId,
                        permission: getHostBridgePermissionProjection(
                          permission.requestId,
                        ),
                      },
                    );
                    resolvedPermissions.add(permission.requestId);
                  }
                  if (waiting) {
                    const identity = `${waiting.requestId}\n${waiting.pendingInteraction!.message}`;
                    if (identity !== interaction) {
                      interaction = identity;
                      approvalIndex += 1;
                      await privateWrite("approval.json", {
                        index: approvalIndex,
                        requestId: waiting.requestId,
                        interaction: waiting.pendingInteraction,
                      });
                    }
                    if (!live) {
                      assert.equal(workflowId, "literature-explainer");
                      const options =
                        waiting.pendingInteraction!.uiHints?.options || [];
                      const option = options.find((entry) =>
                        ["generate_note", "confirm_note"].includes(entry.value),
                      );
                      assert.isOk(
                        option,
                        "workflow_fixture_interaction_unreviewed",
                      );
                      await replyAcpSkillRun({
                        requestId: waiting.requestId,
                        message: option!.value,
                      });
                      continue;
                    }
                    const replyPath = PathUtils.join(
                      evidenceRoot,
                      `reply-${approvalIndex}.json`,
                    );
                    if (await IOUtils.exists(replyPath)) {
                      const reply = JSON.parse(
                        await IOUtils.readUTF8(replyPath),
                      );
                      assert.equal(reply.requestId, waiting.requestId);
                      assert.isNotEmpty(reply.message);
                      await replyAcpSkillRun({
                        requestId: waiting.requestId,
                        message: reply.message,
                      });
                      await IOUtils.move(replyPath, `${replyPath}.consumed`);
                    }
                  } else if (Date.now() > deadline)
                    throw new Error("workflow_capture_execution_timeout");
                  await Zotero.Promise.delay(1000);
                }
                await execution;
                if (executionError) throw executionError;
                if (observedDialog?.closed) {
                  await privateWrite(`dialog-${dialogIndex}-close.json`, {
                    stage,
                  });
                  observedDialog = undefined;
                }
                const runs = listAcpSkillRuns().filter(
                  (run) => !before.has(run.requestId),
                );
                const tasks = listWorkflowTasks().filter(
                  (task) => !previousTasks.has(task.id),
                );
                await privateWrite(`step-${completed.length + 1}-result.json`, {
                  workflowId,
                  runs,
                  tasks,
                  auditOutcomes: auditOutcomes.slice(previousAudits),
                });
                for (const task of tasks)
                  assert.equal(
                    task.state,
                    "succeeded",
                    "workflow_capture_task_not_successful",
                  );
                for (const run of runs) {
                  if (run.status !== "succeeded")
                    throw new Error(
                      `workflow_capture_failed:${run.requestId}:${run.status}:${run.error || run.validationErrors?.join(";") || "terminal_failure"}`,
                    );
                  assert.equal(
                    run.status,
                    "succeeded",
                    "workflow_capture_run_not_successful",
                  );
                  assert.equal(
                    run.applyResultState,
                    "succeeded",
                    "workflow_capture_apply_not_successful",
                  );
                  assert.equal(run.acpRawModelId || run.acpModelId, MODEL);
                  assert.equal(run.validationStatus, "valid");
                }
                assert.isAbove(
                  tasks.length + runs.length,
                  0,
                  "workflow_capture_no_execution",
                );
                completed.push(workflowId);
                await privateWrite(
                  "inventory.json",
                  await Promise.all(
                    imported.imported.map(async (entry) => {
                      const parent = await Zotero.Items.getAsync(entry.id);
                      return {
                        ...entry,
                        key: parent.key,
                        title: parent.getField("title"),
                        attachments: await Promise.all(
                          parent.getAttachments().map(async (id: number) => {
                            const item = await Zotero.Items.getAsync(id);
                            return {
                              id,
                              title: item.getField("title"),
                              contentType: item.attachmentContentType,
                              path: await item.getFilePathAsync(),
                            };
                          }),
                        ),
                        notes: await Promise.all(
                          parent.getNotes().map(async (id: number) => {
                            const item = await Zotero.Items.getAsync(id);
                            return { id, title: item.getNoteTitle() };
                          }),
                        ),
                      };
                    }),
                  ),
                );
                await privateWrite("checkpoint.json", {
                  stage,
                  status: "awaiting_business_flow_review",
                  completed,
                  nextStep: completed.length + 1,
                });
                return outputs;
              };
              if (!continuation)
                await invoke("tag-bootstrapper", [], {
                  tag_note_language: "zh-CN",
                });
              const vocabulary =
                await createWorkflowSynthesisHostApi().tags.loadVocabulary();
              await privateWrite(
                "tag-bootstrapper-vocabulary.json",
                vocabulary,
              );
              assert.isAbove(vocabulary.entries.length, 0);
              if (continuation)
                await privateWrite("checkpoint.json", {
                  stage: "continued",
                  status: "awaiting_business_flow_review",
                  completed,
                  nextStep: completed.length + 1,
                });
              if (!live) {
                const verifyImages = async (attachment: Zotero.Item) => {
                  const file = await attachment.getFilePathAsync();
                  assert.isString(file);
                  const markdown = await IOUtils.readUTF8(file as string);
                  const images = [
                    ...markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g),
                  ];
                  assert.isAbove(images.length, 0);
                  for (const [, locator] of images) {
                    const relative = decodeURIComponent(
                      locator.split(/[?#]/)[0],
                    );
                    assert.isFalse(/^[a-z]+:/i.test(relative));
                    const image = PathUtils.join(
                      PathUtils.parent(file as string),
                      ...relative.split("/"),
                    );
                    assert.isAbove((await IOUtils.read(image)).length, 0);
                  }
                };
                const verifyAnalysis = async (id: number) => {
                  const parent = await Zotero.Items.getAsync(id);
                  const paperRef = `${parent.libraryID}:${parent.key}`;
                  const result =
                    await createWorkflowSynthesisHostApi().artifacts.readPaperArtifacts(
                      {
                        paper_refs: [paperRef],
                      },
                    );
                  for (const type of [
                    "digest",
                    "references",
                    "citation_analysis",
                    "literature_score",
                  ]) {
                    const row = result.artifacts.find(
                      (entry) => entry.artifact_type === type,
                    );
                    assert.isOk(row);
                    assert.equal(row!.status, "available");
                    const note = await Zotero.Items.getByLibraryAndKeyAsync(
                      parent.libraryID,
                      row!.note_key!,
                    );
                    assert.equal(note.parentItemID, parent.id);
                    assert.isNotEmpty(note.getNote());
                  }
                  assert.lengthOf(parent.getNotes(), 4);
                };
                for (const item of imported.imported) {
                  await invoke("mineru", item.pdfIds, {});
                  const parent = await Zotero.Items.getAsync(item.id);
                  const attachments = await Zotero.Items.getAsync(
                    parent.getAttachments(),
                  );
                  const markdown = attachments.filter(
                    (entry) => entry.attachmentContentType === "text/markdown",
                  );
                  assert.lengthOf(markdown, 1);
                  assert.equal(markdown[0].parentItemID, parent.id);
                  await verifyImages(markdown[0]);
                }
                for (const item of imported.imported.slice(0, 5)) {
                  await invoke("literature-analysis", [item.id], {});
                  await verifyAnalysis(item.id);
                }
                await invoke("tag-regulator", [imported.imported[0].id], {});
                await invoke(
                  "literature-deep-reading",
                  [imported.imported[0].id],
                  {
                    target_language: "zh-CN",
                    mode: "fast",
                  },
                );
                await invoke(
                  "literature-translator",
                  [imported.imported[2].id],
                  {
                    target_language: "zh-CN",
                    mode: "fast",
                  },
                );
                await invoke(
                  "literature-explainer",
                  [imported.imported[1].id],
                  {},
                );
                const explained = await Zotero.Items.getAsync(
                  imported.imported[1].id,
                );
                assert.lengthOf(explained.getNotes(), 5);
                for (const note of await Zotero.Items.getAsync(
                  explained.getNotes(),
                )) {
                  assert.equal(note.parentItemID, explained.id);
                  assert.isNotEmpty(note.getNote());
                }
                for (const index of [0, 2]) {
                  const parent = await Zotero.Items.getAsync(
                    imported.imported[index].id,
                  );
                  const attachments = await Zotero.Items.getAsync(
                    parent.getAttachments(),
                  );
                  const markdown = attachments.filter(
                    (entry) => entry.attachmentContentType === "text/markdown",
                  );
                  assert.lengthOf(markdown, 2);
                  for (const item of markdown) {
                    assert.equal(item.parentItemID, parent.id);
                    await verifyImages(item);
                  }
                  let translated = 0;
                  for (const item of markdown) {
                    const entryPath = (await item.getFilePathAsync()) as string;
                    const directory = PathUtils.parent(entryPath);
                    for (const file of await IOUtils.getChildren(directory)) {
                      if (file !== entryPath.replace(/\.md$/i, ".json"))
                        continue;
                      const alignment = JSON.parse(
                        await IOUtils.readUTF8(file),
                      );
                      if (alignment.format !== "v1") continue;
                      assert.equal(alignment.source_language, "en-US");
                      assert.equal(alignment.target_language, "zh-CN");
                      assert.isAbove(alignment.blocks.length, 0);
                      translated += 1;
                    }
                  }
                  assert.equal(translated, 1);
                  if (index === 0) {
                    const html = attachments.filter(
                      (entry) => entry.attachmentContentType === "text/html",
                    );
                    assert.lengthOf(html, 1);
                    assert.equal(html[0].parentItemID, parent.id);
                    const text = await IOUtils.readUTF8(
                      (await html[0].getFilePathAsync()) as string,
                    );
                    assert.include(text, "data:image/");
                    assert.notMatch(
                      text,
                      /(?:src|href)=["'](?:https?:|file:)/i,
                    );
                  }
                }
                await invoke("create-topic-synthesis", [], {
                  usePlannedTopic: false,
                  topicSeed:
                    "合成文献的离线查询路由评测，包括五篇已分析及两篇待分析来源。",
                  language: "zh-CN",
                });
                const client = await getDefaultSynthesisClient();
                const seedTopicId = "system-e2e:wf:seed-topic";
                const seedContext = await client.topics.getContext({
                  topicId: seedTopicId,
                  view: "full",
                });
                assert.equal(seedContext.audit?.freshness.freshness, "fresh");
                assert.lengthOf(
                  seedContext.audit!.resolved_paper_set.papers,
                  7,
                );
                await invoke("topic-planner", [], { language: "zh-CN" });
                const plannedId = "system-e2e:wf:planned-topic";
                const planned = await client.topics.getContext({
                  topicId: plannedId,
                  view: "semantic",
                });
                assert.equal(planned.semantic?.lifecycle, "planned");
                await invoke("create-topic-synthesis", [], {
                  usePlannedTopic: true,
                  plannedTopicId: plannedId,
                  language: "zh-CN",
                });
                const materialized = await client.topics.getContext({
                  topicId: plannedId,
                  view: "full",
                });
                assert.equal(materialized.semantic?.topic_id, plannedId);
                assert.equal(materialized.semantic?.lifecycle, "materialized");
                assert.equal(
                  materialized.semantic?.topic_resolver.combine,
                  planned.semantic?.topic_resolver.combine,
                );
                assert.sameMembers(
                  materialized.semantic?.topic_resolver.paper_refs || [],
                  planned.semantic?.topic_resolver.paper_refs || [],
                );
                assert.sameMembers(
                  materialized.semantic?.topic_resolver.collection_key || [],
                  planned.semantic?.topic_resolver.collection_key || [],
                );
                assert.deepEqual(
                  materialized.semantic?.topic_resolver.tag || {},
                  planned.semantic?.topic_resolver.tag || {},
                );
                assert.equal(materialized.audit?.freshness.freshness, "fresh");
                for (const item of imported.imported.slice(5, 7)) {
                  await invoke("literature-analysis", [item.id], {});
                  await verifyAnalysis(item.id);
                }
                const stale = await client.topics.getContext({
                  topicId: seedTopicId,
                  view: "audit",
                });
                assert.equal(stale.audit?.freshness.freshness, "stale");
                await invoke("update-topic-synthesis", [], {
                  topicId: seedTopicId,
                });
                const updated = await client.topics.getContext({
                  topicId: seedTopicId,
                  view: "full",
                });
                assert.equal(updated.semantic?.topic_id, seedTopicId);
                assert.equal(updated.audit?.freshness.freshness, "fresh");
                assert.notEqual(
                  updated.audit?.current_hashes.manifest,
                  stale.audit?.current_hashes.manifest,
                );
                await invoke("tag-auditor", [], {});
                const audit = auditOutcomes.at(-1) as TagAuditRunResultDto;
                assert.equal(audit?.outcome, "published");
                if (audit.outcome === "published") {
                  const items = await Zotero.Items.getAll(1, true, false);
                  assert.equal(
                    audit.snapshot.auditedItems,
                    items.filter((item) => item.isRegularItem()).length,
                  );
                  assert.isAtLeast(audit.snapshot.needsRegulation, 0);
                  assert.isAtMost(
                    audit.snapshot.needsRegulation,
                    audit.snapshot.auditedItems,
                  );
                }
                const collection = await Zotero.Collections.getAsync(
                  imported.collections[3],
                );
                const originalMembers = [...collection.getChildItems(true)];
                await invoke("collection-collector", [], {
                  collection: `${collection.libraryID}:${collection.key}`,
                  collectionScope: "Synthetic retrieval and graph literature",
                });
                const curationRoot = PathUtils.join(
                  PathUtils.parent(
                    readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
                  ),
                  "tests",
                  "fixtures",
                  "workflow-happy-path",
                  "curation",
                );
                const bindings = JSON.parse(
                  await IOUtils.readUTF8(
                    PathUtils.join(curationRoot, "bindings.json"),
                  ),
                );
                const members = collection.getChildItems(true);
                const expectedMembers = new Set(originalMembers);
                for (const binding of bindings.paperRefs[
                  "collection-collector.json"
                ]) {
                  const item = imported.imported.find(
                    (entry) => entry.sourceKey === binding.sourceKey,
                  );
                  assert.isOk(item);
                  expectedMembers.add(item!.id);
                }
                assert.sameMembers(members, [...expectedMembers]);
                const metadataTarget = imported.imported.find(
                  (entry) =>
                    entry.sourceKey ===
                    bindings.parentSelection["literature-metadata-search.json"]
                      .sourceKey,
                )!;
                const parentBefore = await Zotero.Items.getAsync(
                  metadataTarget.id,
                );
                const parentKey = parentBefore.key;
                await invoke(
                  "literature-metadata-curator",
                  [metadataTarget.id],
                  {
                    skip_identifier_fast_path: true,
                  },
                );
                const parentAfter = await Zotero.Items.getAsync(
                  metadataTarget.id,
                );
                const metadata = JSON.parse(
                  await IOUtils.readUTF8(
                    PathUtils.join(
                      curationRoot,
                      "literature-metadata-search.json",
                    ),
                  ),
                ).metadata;
                assert.equal(parentAfter.key, parentKey);
                for (const [field, value] of Object.entries(metadata.fields))
                  assert.equal(parentAfter.getField(field), value);
                assert.isNotEmpty(parentAfter.getCreators());
                const host = createWorkflowHostApi();
                const verifyProduct = async (workflowId: string) => {
                  const products = listWorkflowProducts().filter(
                    (product) => product.workflowId === workflowId,
                  );
                  assert.lengthOf(products, 1);
                  assert.isNotEmpty(products[0].assets);
                  for (const asset of products[0].assets) {
                    assert.equal(asset.availability, "available");
                    const resolved = await resolveManagedWorkflowProductAsset(
                      products[0].productId,
                      asset.assetId,
                    );
                    assert.isOk(resolved);
                    assert.isAbove(
                      (await IOUtils.read(resolved!.localPath)).length,
                      0,
                    );
                  }
                };
                const inventoryBeforeIngest = await host.library.listItems({
                  libraryId: 1,
                  limit: 100,
                });
                await invoke("literature-search-ingest", [], {
                  query: "Synthetic offline ingestion",
                  searchMode: "targeted_ingest",
                  targetCollection: `${collection.libraryID}:${collection.key}`,
                });
                const inventoryAfterIngest = await host.library.listItems({
                  libraryId: 1,
                  limit: 100,
                });
                const ingested = inventoryAfterIngest.items.filter(
                  (item) =>
                    !inventoryBeforeIngest.items.some(
                      (prior) => prior.ref.key === item.ref.key,
                    ),
                );
                assert.lengthOf(ingested, 1);
                assert.includeMembers(ingested[0].tags, [
                  "status:need-analysis",
                  "status:need-markdown",
                ]);
                assert.isTrue(
                  ingested[0].collectionRefs.some(
                    (ref) => ref.key === collection.key,
                  ),
                );
                await invoke("export-research-bundle", [], {
                  paperTitle: "Synthetic query routing study",
                  researchContent: "Synthetic retrieval and graph evidence",
                  maxTopics: 1,
                  maxCorePapers: 5,
                  maxRelatedPapers: 7,
                });
                await verifyProduct("export-research-bundle");
                await invoke("manuscript-literature-framing", [], {
                  paperTitle: "Synthetic query routing study",
                  language: "zh-CN",
                  articleType: "original research",
                  stylePreference: "Synthetic study plan",
                });
                await verifyProduct("manuscript-literature-framing");
                const bundle = await invoke(
                  "export-literature-bundle",
                  [imported.imported[0].id, imported.imported[2].id],
                  { mode: "selection", sourceOnly: false },
                );
                await host.archive.withExtractedZip(
                  { sourcePath: PathUtils.join(evidenceRoot, bundle.bundle) },
                  {},
                  async (archive) => {
                    const exportedManifest = validateLiteratureProductManifest(
                      JSON.parse(await archive.readText("manifest.json")),
                      archive.entries,
                    );
                    await verifyLiteratureProductFiles(
                      exportedManifest,
                      archive,
                    );
                    assert.equal(exportedManifest.status, "completed");
                    assert.lengthOf(exportedManifest.papers, 2);
                  },
                );
                const beforeImport = await Zotero.Items.getAll(1, true, false);
                await invoke(
                  "import-literature-bundle",
                  [],
                  { targetLibraryId: 1 },
                  {
                    bundle: [
                      { path: bundle.bundle, contentType: "application/zip" },
                    ],
                  },
                );
                const clones = (
                  await Zotero.Items.getAll(1, true, false)
                ).filter(
                  (item) =>
                    item.isRegularItem() &&
                    !beforeImport.some((prior) => prior.id === item.id),
                );
                assert.lengthOf(clones, 2);
                const originals = await Zotero.Items.getAsync([
                  imported.imported[0].id,
                  imported.imported[2].id,
                ]);
                assert.sameMembers(
                  clones.map((item) => item.getField("title")),
                  originals.map((item) => item.getField("title")),
                );
                for (const clone of clones) {
                  const original = originals.find(
                    (item) =>
                      item.getField("title") === clone.getField("title"),
                  )!;
                  assert.deepEqual(clone.getCreators(), original.getCreators());
                  assert.lengthOf(clone.getNotes(), 4);
                  assert.lengthOf(
                    clone.getAttachments(),
                    original.getAttachments().length,
                  );
                  await verifyAnalysis(clone.id);
                  for (const note of await Zotero.Items.getAsync(
                    clone.getNotes(),
                  )) {
                    assert.equal(note.parentItemID, clone.id);
                    assert.isNotEmpty(note.getNote());
                  }
                  const attachments = await Zotero.Items.getAsync(
                    clone.getAttachments(),
                  );
                  assert.isNotEmpty(attachments);
                  for (const attachment of attachments) {
                    assert.equal(attachment.parentItemID, clone.id);
                    assert.isTrue(await attachment.fileExists());
                    if (attachment.attachmentContentType === "text/markdown")
                      await verifyImages(attachment);
                  }
                }
                const notesExport = await invoke(
                  "export-notes",
                  [imported.imported[2].id],
                  {},
                );
                const noteInputs: CaptureResourceInputs = {};
                const noteSlots: Record<string, string> = {
                  "digest.md": "digest",
                  "references.json": "references",
                  "citation_analysis.json": "citation-analysis",
                  "literature_score.json": "literature-score",
                };
                await host.archive.withExtractedZip(
                  {
                    sourcePath: PathUtils.join(evidenceRoot, notesExport.notes),
                  },
                  {},
                  async (archive) => {
                    for (const name of archive.entries) {
                      const file = name.split("/").at(-1)!;
                      if (!noteSlots[file]) continue;
                      const bytes = await archive.readBytes(name);
                      assert.isAbove(bytes.length, 0);
                      const relative = `note-input-${file}`;
                      await IOUtils.write(
                        PathUtils.join(evidenceRoot, relative),
                        bytes,
                      );
                      noteInputs[noteSlots[file]] = [
                        {
                          path: relative,
                          contentType: file.endsWith(".md")
                            ? "text/markdown"
                            : "application/json",
                        },
                      ];
                    }
                  },
                );
                assert.lengthOf(Object.keys(noteInputs), 4);
                // A fresh parent requires real restoration and cannot pass via existing notes.
                const noteTarget = new Zotero.Item("journalArticle");
                noteTarget.setField("title", "Synthetic note roundtrip target");
                await noteTarget.saveTx();
                assert.lengthOf(noteTarget.getNotes(), 0);
                await invoke(
                  "import-notes",
                  [noteTarget.id],
                  { conflictPolicy: "error" },
                  noteInputs,
                );
                await verifyAnalysis(noteTarget.id);
                await verifyAnalysis(imported.imported[2].id);
                const businessContract = {
                  schemaVersion: "workflow-happy-path.v1",
                  workflows: [...new Set(completed)].sort(),
                  mineruParents: imported.imported.length,
                  analyzedParents: 7,
                  importedParents: clones.length,
                  restoredNoteKinds: Object.keys(noteInputs).sort(),
                  topicFreshness: ["fresh", "stale", "fresh"],
                };
                const expectedContract = JSON.parse(
                  await IOUtils.readUTF8(
                    PathUtils.join(
                      PathUtils.parent(curationRoot),
                      "contract.json",
                    ),
                  ),
                );
                assert.deepEqual(businessContract, expectedContract);
                await privateWrite("business-contract.json", businessContract);
                succeeded = true;
              }
              while (!succeeded) {
                const commandPath = PathUtils.join(
                  evidenceRoot,
                  `step-${completed.length + 1}.json`,
                );
                if (!(await IOUtils.exists(commandPath))) {
                  await Zotero.Promise.delay(1000);
                  continue;
                }
                const command = JSON.parse(await IOUtils.readUTF8(commandPath));
                await IOUtils.move(commandPath, `${commandPath}.consumed`);
                if (command.finish === true) {
                  const required = workflows
                    .filter((entry) => entry.manifest.debug_only !== true)
                    .map((entry) => entry.manifest.id);
                  assert.includeMembers(
                    completed,
                    required,
                    "workflow_capture_coverage_incomplete",
                  );
                  succeeded = true;
                } else {
                  await invoke(
                    command.workflowId,
                    command.selectedIds || [],
                    command.workflowParams || {},
                    command.resourceInputs,
                  );
                }
              }
            } catch (error) {
              caseError = error;
              await privateWrite("failure.json", {
                stage,
                message: error instanceof Error ? error.message : String(error),
                logs: listRuntimeLogs({ limit: 100 }),
              });
              for (const run of listAcpSkillRuns().filter(
                (run) => !priorRuns.has(run.requestId),
              )) {
                if (run.activePrompt) await cancelAcpSkillRun(run.requestId);
                await endAcpSkillRunSession(run.requestId);
              }
              await emitZoteroTestDebug({
                kind: "system-e2e-abort",
                failurePhase: "workflow-capture",
                abortCode: "workflow_capture_stopped",
              });
              throw new Error(`workflow_capture_stopped:${stage}`);
            } finally {
              setPref("backendsConfigJson", original.backends);
              setPref("contentFeedChannel", original.channel);
              setPref("contentDevFeedMirrorUrl", original.mirror);
              setPref("workflowDir", original.workflowDir);
              await resetDefaultSynthesisClientForTests();
              setDefaultSynthesisClientCompositionFactoryForTests(null);
              setDebugModeOverrideForTests();
              runtime.addon = original.addon;
              runtime.ztoolkit = original.toolkit;
              if (!succeeded)
                await privateWrite("capture-state.json", {
                  stage,
                  status: "stopped",
                  fixtureAdmitted: false,
                });
            }
          },
          cleanup: async () => {
            for (const run of listAcpSkillRuns().filter(
              (run) => !priorRuns.has(run.requestId),
            )) {
              if (run.activePrompt) await cancelAcpSkillRun(run.requestId);
              await endAcpSkillRunSession(run.requestId);
              if (!live) await deleteAcpSkillRunRecords([run.requestId]);
            }
            return "passed" as const;
          },
          healthGate: () => observeSystemE2EHealth(),
        });
        await emitZoteroTestDebug({
          kind: "system-e2e-family-result",
          family: {
            familyId: "WF",
            caseId: "WF-01",
            result: lifecycle.result,
            publicOutcome:
              lifecycle.result === "passed"
                ? "builtin_workflows_completed"
                : undefined,
            failureCode: lifecycle.abortCode,
            typedEvidence: succeeded
              ? [
                  {
                    kind: "builtin-workflow-business-contract",
                    schemaVersion: "workflow-happy-path.v1",
                    terminalStatus: "completed",
                  },
                ]
              : [],
            lifecycle: lifecycle.transitions.map((checkpoint) => ({
              checkpoint,
              outcome: "completed",
            })),
            cleanup: lifecycle.cleanup,
            health: lifecycle.health,
            artifacts: [],
          },
        });
        if (caseError) throw caseError;
        assert.equal(lifecycle.result, "passed");
        assert.isFalse(lifecycle.abort);
      },
    );
  });
}

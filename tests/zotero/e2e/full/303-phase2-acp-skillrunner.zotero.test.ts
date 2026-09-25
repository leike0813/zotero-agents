import { assert } from "chai";
import {
  createBackendsPrefsDocument,
  loadBackendsRegistry,
} from "../../../../src/backends/registry";
import type { BackendInstance } from "../../../../src/backends/types";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { executeWorkflowFromCurrentSelection } from "../../../../src/modules/workflow/ui/workflowExecute";
import {
  deleteAcpSkillRunRecords,
  listAcpSkillRuns,
} from "../../../../src/modules/acp/skillRun/acpSkillRunStore";
import {
  cancelAcpSkillRun,
  endAcpSkillRunSession,
  interruptAcpSkillRunCurrentTurn,
} from "../../../../src/modules/acp/skillRun/acpSkillRunActions";
import { executeAcpSkillRunnerJob } from "../../../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../../../src/config/defaults";
import { readAcpSkillRunTranscriptItems } from "../../../../src/modules/acp/skillRun/acpSkillRunTranscriptStore";
import {
  listSkillRunnerRunRecords,
  listSkillRunnerRunEvents,
  getSkillRunnerRunProjection,
} from "../../../../src/modules/skillRunner/run/skillRunnerRunStore";
import { deletePluginRunStoreEntry } from "../../../../src/modules/pluginStateStore";
import { probeAcpBackendRuntimeOptions } from "../../../../src/modules/acp/transport/acpBackendProbe";
import { createWorkflowHostApi } from "../../../../src/workflows/hostApi";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { setDebugModeOverrideForTests } from "../../../../src/modules/debugMode";
import { listRuntimeLogs } from "../../../../src/modules/runtimeLogManager";
import { removeRuntimePath } from "../../../../src/modules/runtimePersistence";
import {
  connectAcpConversation,
  deleteActiveAcpConversation,
  disconnectAcpConversation,
  setActiveAcpBackend,
  setActiveAcpConversation,
  startNewAcpConversation,
  resolveAcpConversationPermission,
  sendAcpConversationPrompt,
} from "../../../../src/modules/acp/chat/acpSessionManager";
import {
  getAcpConversationSnapshot,
  getAcpChatWorkspaceOwnerNavigation,
  readAcpConversationTranscriptPage,
} from "../../../../src/modules/acp/chat/acpChatWorkspaceDataPlane";
import {
  openAssistantWorkspaceSidebar,
  closeAssistantWorkspaceSidebar,
  inspectAssistantWorkspaceDiagnosticsPublication,
  forceAssistantWorkspaceDiagnosticsPublication,
} from "../../../../src/modules/assistant/workspace/assistantWorkspaceSidebar";
import { materializeHostBridgePluginSkillBundle } from "../../../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle";
import {
  listActiveWorkflowTasks,
  listWorkflowTasks,
} from "../../../../src/modules/taskRuntime";
import { workflowSubmissionQueue } from "../../../../src/jobQueue/workflowSubmissionQueue";
import {
  reconcileSkillRunnerBackendTaskLedgerOnce,
  reconcileSkillRunnerMissingContextOnce,
} from "../../../../src/modules/skillRunner/run/skillRunnerTaskReconciler";
import { resolveRuntimeHostCapabilities } from "../../../../src/utils/runtimeBridge";
import { defaultSkillRunnerConnectionGovernor } from "../../../../src/modules/skillRunner/connection/skillRunnerConnectionGovernor";
import { SkillRunnerManagementClient } from "../../../../src/providers/skillrunner/managementClient";
import {
  getSkillRunnerWorkspaceReadModel,
  listSkillRunnerWorkspaceTaskGroups,
  refreshSkillRunnerSidebarHostSnapshot,
  focusSkillRunnerWorkspace,
} from "../../../../src/modules/skillRunner/surface/skillRunnerRunDialog";
import { runFamilyLifecycle } from "../../../../scripts/system-e2e/familyLifecycle";
import { observeSystemE2EHealth } from "../../../../scripts/system-e2e/healthGate";
import { emitZoteroTestDebug, isSystemE2ERun } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

function startAcpDiagnosticRun(
  backend: BackendInstance,
  runKey: string,
  onRequestCreated: (requestId: string) => void,
) {
  return executeAcpSkillRunnerJob({
    requestKind: ACP_SKILL_RUN_REQUEST_KIND,
    backend,
    request: {
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "debug-apply-result-probe",
      mode: "auto",
      fetch_type: "result",
      input: {},
      parameter: {
        workflow_id: "debug-apply-single-result",
        step_id: "result",
        run_key: runKey,
        apply_mode: "result",
      },
      runtime_options: {
        execution_mode: "auto",
        zotero_host_access: { required: false },
      },
    },
    onProgress: (event) => {
      if (event.type === "request-created") onRequestCreated(event.requestId);
    },
  });
}

function phase2Evidence(
  kind: string,
  terminalStatus: string,
  operationId = "",
) {
  return [
    {
      kind,
      schemaVersion: "system-e2e-phase2.v1",
      terminalStatus,
      operationId,
    },
  ];
}

async function waitForAssistantTranscriptRow(
  tab: "acp-chat" | "acp-skills" | "skillrunner",
  text: string,
  expectedOwnerKey?: string,
) {
  const win = Zotero.getMainWindow() as _ZoteroTypes.MainWindow;
  let last = "";
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const shell = win.document.querySelector(
      '[data-zs-assistant-shell="true"][data-zs-assistant-active-target="library"]',
    ) as (Element & { contentDocument?: Document }) | null;
    const child = shell?.contentDocument?.querySelector(
      `#assistant-frame-${tab}`,
    ) as HTMLIFrameElement | null;
    const rows = Array.from(
      child?.contentDocument?.querySelectorAll<HTMLElement>(
        '[data-role="transcript"] .assistant-transcript-row',
      ) || [],
    );
    const row = rows.find((entry) => entry.textContent?.includes(text));
    const ownerKey = child?.contentDocument
      ?.querySelector('[data-role="transcript"]')
      ?.getAttribute("data-assistant-transcript-owner-key");
    if (row && (!expectedOwnerKey || ownerKey === expectedOwnerKey))
      return { document: child!.contentDocument!, row };
    last = JSON.stringify({
      shell: !!shell,
      shellDocument: !!shell?.contentDocument,
      child: !!child,
      childDocument: !!child?.contentDocument,
      rows: rows.length,
      rowText: rows.map((entry) => entry.textContent?.slice(0, 120)),
      transcriptHtml: child?.contentDocument
        ?.querySelector('[data-role="transcript"]')
        ?.innerHTML.slice(0, 800),
      transcriptRowsAnywhere: child?.contentDocument?.querySelectorAll(
        ".assistant-transcript-row",
      ).length,
      ownerKey: child?.contentDocument
        ?.querySelector('[data-role="transcript"]')
        ?.getAttribute("data-assistant-transcript-owner-key"),
      buttons: Array.from(
        child?.contentDocument?.querySelectorAll("button") || [],
      )
        .filter((entry) =>
          entry.textContent?.includes("system-e2e:transcript-interleave"),
        )
        .map((entry) => entry.outerHTML.slice(0, 400)),
      childBody: child?.contentDocument?.body?.textContent?.slice(0, 500),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const logs = listRuntimeLogs({ limit: 300 })
    .filter((entry) =>
      /assistant|transcript/.test(`${entry.component} ${entry.stage}`),
    )
    .slice(-25)
    .map((entry) => ({
      component: entry.component,
      stage: entry.stage,
      message: entry.message,
      error: entry.error?.message,
      details: entry.details,
    }));
  const publication = inspectAssistantWorkspaceDiagnosticsPublication({ tab });
  const skillRunnerDiagnostic =
    tab === "skillrunner"
      ? JSON.stringify({
          model: getSkillRunnerWorkspaceReadModel(),
          groups: listSkillRunnerWorkspaceTaskGroups(),
          runs: listSkillRunnerRunRecords()
            .filter((run) => run.backendId === "system-e2e-aw-01")
            .map((run) => ({
              status: run.status,
              error: run.error,
              backendStatus: run.backendStatus,
              apply: run.apply,
            })),
        }).slice(0, 5000)
      : "";
  throw new Error(
    `Assistant chrome did not render ${tab} transcript row: ${last}; publication=${JSON.stringify({ detail: publication.detail, publications: publication.publications }).slice(0, 3000)}; skillrunner=${skillRunnerDiagnostic}; logs=${JSON.stringify(logs).slice(0, 5000)}`,
  );
}

async function refreshLiveSkillRunnerChrome() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const publication = inspectAssistantWorkspaceDiagnosticsPublication({
      tab: "skillrunner",
      target: "library",
    });
    if (!publication.detail) {
      await forceAssistantWorkspaceDiagnosticsPublication({
        tab: "skillrunner",
        target: "library",
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("SkillRunner chrome frame did not become ready");
}

describe("System E2E Phase 2 ACP and SkillRunner", function () {
  this.timeout(240_000);

  before(function () {
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE")) this.skip();
    assert.isTrue(isSystemE2ERun());
  });

  it("AC-01 applies a normal ACP Skills run through the workflow", async function () {
    const familyId = "AC";
    const caseId = "AC-01";
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRequestIds = new Set(
      listAcpSkillRuns().map((run) => run.requestId),
    );
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
    const fixturePath = PathUtils.join(
      PathUtils.parent(workflowDir),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-01-peer.ndjson",
    );
    let runId = "";
    let runWorkspaceDir = "";
    let parent: Zotero.Item | undefined;
    let operationId = "";
    let caseError = "";
    let startedExecution = false;
    const result = await runFamilyLifecycle({
      declaration: {
        familyId,
        owner: "acp-transport-and-run-lifecycle",
        namespace: ["system-e2e:ac:01", "debug-apply:"],
        ownedState: [
          "acp-run",
          "acp-child",
          "synthetic-parent",
          "peer-evidence",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(workflowDir)
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow, "built-in debug workflow must load");
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: "system-e2e-ac-01",
            displayName: "System E2E ACP",
            type: "acp",
            baseUrl: "local://system-e2e-ac-01",
            command: nodePath,
            args: [fixturePath],
            env: {
              ZOTERO_ACP_COMPOSER_E2E_MODE: "normal",
              ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
            },
            auth: { kind: "none" },
          };
          const probe = await probeAcpBackendRuntimeOptions({ backend });
          assert.isTrue(probe.ok, probe.error);
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([
                ...configured.backends,
                probe.backend,
              ]),
            ),
          );
          assert.isTrue(
            (await loadBackendsRegistry()).backends.some(
              (entry) => entry.id === backend.id,
            ),
            "ACP E2E backend must load",
          );
          startedExecution = true;
          await executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          });
          const runs = listAcpSkillRuns().filter(
            (run) => !previousRequestIds.has(run.requestId),
          );
          assert.lengthOf(
            runs,
            1,
            listRuntimeLogs({ workflowId: workflow!.manifest.id, limit: 20 })
              .map((entry) => `${entry.stage}:${entry.message}`)
              .join(" | "),
          );
          const run = runs[0];
          runId = run.requestId;
          runWorkspaceDir = run.workspaceDir || "";
          assert.isNotEmpty(run.inputManifestPath);
          const inputManifest = JSON.parse(
            await IOUtils.readUTF8(run.inputManifestPath!),
          ) as {
            targetParentRef?: { libraryId: number; key: string };
            parameter?: { run_key?: string };
          };
          const parentRef = inputManifest.targetParentRef;
          if (parentRef) {
            parent = Zotero.Items.getByLibraryAndKey(
              parentRef.libraryId,
              parentRef.key,
            );
          }
          assert.equal(run.backendId, backend.id);
          assert.equal(run.workflowId, workflow!.manifest.id);
          assert.equal(
            run.status,
            "succeeded",
            JSON.stringify({
              error: run.error,
              validationErrors: run.validationErrors,
              stages: run.events.map((event) => event.stage),
            }),
          );
          assert.equal(run.applyResultState, "succeeded");
          const stages = run.events.map((event) => event.stage);
          assert.include(stages, "workspace-created");
          assert.include(stages, "input-manifest-written");
          const runKey = String(inputManifest.parameter?.run_key || "");
          assert.isNotEmpty(runKey);
          assert.isOk(parentRef);
          assert.isOk(parent);
          assert.equal(
            parent!
              .getTags()
              .filter((tag) => tag.tag === `debug-result:${runKey}`).length,
            1,
          );
          operationId = `debug-apply:tags:${runKey}:result`;
          const receipt = await createWorkflowHostApi({
            ownerId: `interactive-workflow:${workflow!.manifest.id}:applyResult`,
          }).mutations.getOperation({ operationId });
          assert.equal(receipt.state, "settled");
          if (receipt.state === "settled") {
            assert.equal(receipt.result.outcome, "committed");
          }
          assert.isTrue(await IOUtils.exists(evidencePath));
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        if (runId) {
          await endAcpSkillRunSession(runId);
          await deleteAcpSkillRunRecords([runId]);
        }
        if (runWorkspaceDir) await removeRuntimePath(runWorkspaceDir);
        if (parent) await parent.eraseTx();
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        return !startedExecution || (runId && parent)
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId,
        caseId,
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "acp_workflow_apply_succeeded"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? [
                {
                  kind: "canonical-mutation-receipt",
                  schemaVersion: "zotero-agents.mutation-attempt.v1",
                  terminalStatus: "committed",
                  operationId,
                },
              ]
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AC-02 cancels a stalled ACP startup and admits a follow-up", async function () {
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-02-peer.ndjson",
    );
    const modePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-02-workflow-mode.txt",
    );
    const ownedRuns: Array<{ requestId: string; workspaceDir: string }> = [];
    const ownedParents: Zotero.Item[] = [];
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AC",
        owner: "acp-transport-and-run-lifecycle",
        namespace: ["system-e2e:ac:02"],
        ownedState: [
          "acp-run",
          "acp-child",
          "peer-evidence",
          "workflow-task",
          "synthetic-parent",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          setDebugModeOverrideForTests(true);
          const backend: BackendInstance = {
            id: "system-e2e-ac-02",
            displayName: "System E2E ACP stall",
            type: "acp",
            baseUrl: "local://system-e2e-ac-02",
            command: nodePath,
            args: [fixturePath],
            env: {
              ZOTERO_ACP_COMPOSER_E2E_MODE: "startup-stall",
              ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
            },
            auth: { kind: "none" },
          };
          let requestId = "";
          const pending = startAcpDiagnosticRun(backend, "ac-02", (id) => {
            requestId = id;
          });
          let sawInitialize = false;
          for (let attempt = 0; attempt < 150; attempt += 1) {
            if (await IOUtils.exists(evidencePath)) {
              sawInitialize = (await IOUtils.readUTF8(evidencePath)).includes(
                '"method":"initialize"',
              );
              if (sawInitialize) break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.isTrue(sawInitialize, "startup stall must reach initialize");
          assert.isNotEmpty(requestId);
          await cancelAcpSkillRun(requestId);
          await pending.catch(() => undefined);
          const canceled = listAcpSkillRuns().find(
            (entry) => entry.requestId === requestId,
          );
          assert.isOk(canceled);
          ownedRuns.push({
            requestId,
            workspaceDir: canceled!.workspaceDir || "",
          });
          assert.equal(canceled!.status, "canceled");
          const stages = canceled!.events.map((event) => event.stage);
          assert.notInclude(stages, "acp-initialized");
          assert.notInclude(stages, "acp-session-created");
          const stallEvidence = (await IOUtils.readUTF8(evidencePath))
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                JSON.parse(line) as {
                  method: string;
                  mode: string;
                  answered?: boolean;
                  pid?: number;
                },
            );
          assert.isTrue(
            stallEvidence.some(
              (entry) =>
                entry.method === "initialize" &&
                entry.mode === "startup-stall" &&
                entry.answered === false,
            ),
          );
          const stalledPid = stallEvidence.find(
            (entry) => entry.method === "initialize",
          )?.pid;
          assert.isAbove(stalledPid || 0, 0);
          if (!Zotero.isWin) {
            for (let attempt = 0; attempt < 50; attempt += 1) {
              if (!(await IOUtils.exists(`/proc/${stalledPid}`))) break;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            assert.isFalse(
              await IOUtils.exists(`/proc/${stalledPid}`),
              "stalled ACP child must exit",
            );
          }
          const nextBackend: BackendInstance = {
            ...backend,
            env: {
              ...backend.env,
              ZOTERO_ACP_COMPOSER_E2E_MODE: "normal",
            },
          };
          let nextRequestId = "";
          const followUp = await startAcpDiagnosticRun(
            nextBackend,
            "ac-02-follow-up",
            (id) => {
              nextRequestId = id;
            },
          );
          const nextRun = listAcpSkillRuns().find(
            (entry) => entry.requestId === nextRequestId,
          );
          assert.isOk(nextRun);
          ownedRuns.push({
            requestId: nextRequestId,
            workspaceDir: nextRun!.workspaceDir || "",
          });
          assert.equal(followUp.status, "succeeded");
          assert.equal(nextRun!.status, "running");

          const workflow = (
            await loadWorkflowManifests(
              readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
            )
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          await IOUtils.writeUTF8(modePath, "normal");
          const workflowBackend: BackendInstance = {
            ...nextBackend,
            id: "system-e2e-ac-02-workflow",
            env: {
              ZOTERO_ACP_COMPOSER_E2E_MODE_FILE: modePath,
              ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
            },
          };
          const probe = await probeAcpBackendRuntimeOptions({
            backend: workflowBackend,
          });
          assert.isTrue(probe.ok, probe.error);
          const configured = await loadBackendsRegistry();
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([
                ...configured.backends,
                probe.backend,
              ]),
            ),
          );
          await IOUtils.writeUTF8(modePath, "startup-stall");
          const previousIds = new Set(
            listAcpSkillRuns().map((run) => run.requestId),
          );
          let executionError = "";
          const queued = executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: workflowBackend.id },
          }).catch((error) => {
            executionError =
              error instanceof Error ? error.message : String(error);
          });
          let workflowRun = listAcpSkillRuns().find(
            (run) =>
              run.backendId === workflowBackend.id &&
              !previousIds.has(run.requestId),
          );
          for (let attempt = 0; attempt < 200; attempt += 1) {
            if (
              workflowRun?.inputManifestPath &&
              listWorkflowTasks().some(
                (task) => task.requestId === workflowRun!.requestId,
              )
            ) {
              const peer = await IOUtils.readUTF8(evidencePath);
              const stalls = peer
                .split("\n")
                .filter(
                  (line) =>
                    line.includes('"mode":"startup-stall"') &&
                    line.includes('"method":"initialize"'),
                );
              if (stalls.length >= 2) break;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
            workflowRun = listAcpSkillRuns().find(
              (run) =>
                run.backendId === workflowBackend.id &&
                !previousIds.has(run.requestId),
            );
          }
          assert.isOk(workflowRun, executionError);
          assert.isNotEmpty(workflowRun!.inputManifestPath);
          ownedRuns.push({
            requestId: workflowRun!.requestId,
            workspaceDir: workflowRun!.workspaceDir || "",
          });
          const workflowInput = JSON.parse(
            await IOUtils.readUTF8(workflowRun!.inputManifestPath!),
          ) as {
            targetParentRef?: { libraryId: number; key: string };
          };
          if (workflowInput.targetParentRef) {
            const parent = Zotero.Items.getByLibraryAndKey(
              workflowInput.targetParentRef.libraryId,
              workflowInput.targetParentRef.key,
            );
            if (parent) ownedParents.push(parent);
          }
          const workflowTask = listWorkflowTasks().find(
            (task) => task.requestId === workflowRun!.requestId,
          );
          assert.isOk(workflowTask);
          assert.isNotEmpty(workflowTask!.submissionUnitId);
          assert.isNotEmpty(workflowTask!.inputUnitIdentity);
          assert.isOk(
            workflowSubmissionQueue.getSlotSnapshot(
              workflowTask!.submissionUnitId!,
            ),
          );
          assert.isAtLeast(
            workflowTask!.submissionId
              ? workflowSubmissionQueue.getActiveSubmission(
                  workflowTask!.submissionId as any,
                )?.admitted || 0
              : 0,
            1,
          );
          await cancelAcpSkillRun(workflowRun!.requestId);
          await queued;
          const canceledWorkflowRun = listAcpSkillRuns().find(
            (run) => run.requestId === workflowRun!.requestId,
          );
          assert.equal(canceledWorkflowRun?.status, "canceled");
          assert.notInclude(
            canceledWorkflowRun!.events.map((event) => event.stage),
            "acp-initialized",
          );
          assert.notInclude(
            canceledWorkflowRun!.events.map((event) => event.stage),
            "acp-session-created",
          );
          assert.isNull(
            workflowSubmissionQueue.getSlotSnapshot(
              workflowTask!.submissionUnitId!,
            ),
          );
          for (let attempt = 0; attempt < 50; attempt += 1) {
            if (
              !listActiveWorkflowTasks().some(
                (task) => task.requestId === workflowRun!.requestId,
              )
            )
              break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.isFalse(
            listActiveWorkflowTasks().some(
              (task) => task.requestId === workflowRun!.requestId,
            ),
            JSON.stringify(
              listActiveWorkflowTasks().filter(
                (task) => task.requestId === workflowRun!.requestId,
              ),
            ).slice(0, 2000),
          );
          await IOUtils.writeUTF8(modePath, "normal");
          await executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: workflowBackend.id },
          });
          const admitted = listAcpSkillRuns().find(
            (run) =>
              run.backendId === workflowBackend.id &&
              run.requestId !== workflowRun!.requestId &&
              !previousIds.has(run.requestId),
          );
          assert.isOk(admitted);
          assert.equal(admitted!.status, "succeeded", admitted!.error);
          ownedRuns.push({
            requestId: admitted!.requestId,
            workspaceDir: admitted!.workspaceDir || "",
          });
          if (admitted!.inputManifestPath) {
            const input = JSON.parse(
              await IOUtils.readUTF8(admitted!.inputManifestPath),
            ) as {
              targetParentRef?: { libraryId: number; key: string };
            };
            if (input.targetParentRef) {
              const parent = Zotero.Items.getByLibraryAndKey(
                input.targetParentRef.libraryId,
                input.targetParentRef.key,
              );
              if (parent) ownedParents.push(parent);
            }
          }
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        for (const run of ownedRuns) {
          await endAcpSkillRunSession(run.requestId);
          await deleteAcpSkillRunRecords([run.requestId]);
          if (run.workspaceDir) await removeRuntimePath(run.workspaceDir);
        }
        for (const parent of ownedParents) await parent.eraseTx();
        setPref("backendsConfigJson", previousBackendConfig);
        await IOUtils.remove(modePath, { ignoreAbsent: true });
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        return ownedRuns.length === 4 && ownedParents.length === 2
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AC",
        caseId: "AC-02",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "acp_stalled_startup_canceled"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "acp-skill-run",
                "canceled-and-follow-up-admitted",
                ownedRuns[0].requestId,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AC-03 records an unexpected ACP child exit during a turn", async function () {
    const caseId = "AC-03";
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-03-peer.ndjson",
    );
    let requestId = "";
    let workspaceDir = "";
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AC",
        owner: "acp-transport-and-run-lifecycle",
        namespace: ["system-e2e:ac:03"],
        ownedState: ["acp-run", "acp-child", "peer-evidence"],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          setDebugModeOverrideForTests(true);
          await loadWorkflowManifests(
            readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
          );
          const backend: BackendInstance = {
            id: "system-e2e-ac-03",
            displayName: "System E2E ACP exit",
            type: "acp",
            baseUrl: "local://system-e2e-ac-03",
            command: nodePath,
            args: [fixturePath],
            env: {
              ZOTERO_ACP_COMPOSER_E2E_MODE: "exit-during-turn",
              ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
            },
            auth: { kind: "none" },
          };
          let executionError = "";
          try {
            await startAcpDiagnosticRun(backend, "ac-03", (id) => {
              requestId = id;
            });
          } catch (error) {
            executionError =
              error instanceof Error ? error.message : String(error);
          }
          assert.include(executionError, "ACP connection closed");
          assert.isNotEmpty(requestId);
          const run = listAcpSkillRuns().find(
            (entry) => entry.requestId === requestId,
          );
          assert.isOk(run);
          workspaceDir = run!.workspaceDir || "";
          assert.oneOf(run!.status, ["failed", "failed_retriable"]);
          assert.include(
            run!.events.map((event) => event.stage),
            "transport-spawned",
          );
          assert.include(
            run!.events.map((event) => event.stage),
            "acp-connection-closed",
          );
          const exited = listRuntimeLogs({ requestId, limit: 100 }).find(
            (entry) => entry.stage === "exited",
          );
          assert.isOk(exited);
          const snapshot = JSON.parse(
            String(exited!.details?.detail || "{}"),
          ) as {
            exitCode?: number;
            transportLifecycle?: {
              exitSource?: string;
              closeTimedOut?: boolean;
              closedAt?: string;
              childPid?: number;
              stdoutChars?: number;
              stderrChars?: number;
            };
          };
          assert.equal(snapshot.exitCode, 17);
          assert.equal(snapshot.transportLifecycle?.exitSource, "natural-exit");
          assert.notEqual(snapshot.transportLifecycle?.closeTimedOut, true);
          assert.isNotEmpty(snapshot.transportLifecycle?.closedAt);
          assert.isAtLeast(snapshot.transportLifecycle?.stdoutChars || 0, 0);
          assert.isAtLeast(snapshot.transportLifecycle?.stderrChars || 0, 0);
          if (!Zotero.isWin && snapshot.transportLifecycle?.childPid) {
            assert.isFalse(
              await IOUtils.exists(
                `/proc/${snapshot.transportLifecycle.childPid}`,
              ),
            );
          }
          const peer = (await IOUtils.readUTF8(evidencePath))
            .split("\n")
            .filter(Boolean)
            .map(
              (line) => JSON.parse(line) as { method: string; mode: string },
            );
          assert.equal(
            peer.filter((entry) => entry.method === "session/prompt").length,
            1,
          );
          assert.isTrue(
            peer.every((entry) => entry.mode === "exit-during-turn"),
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        if (requestId) {
          await endAcpSkillRunSession(requestId);
          await deleteAcpSkillRunRecords([requestId]);
        }
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        return requestId ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AC",
        caseId,
        result: result.result,
        publicOutcome:
          result.result === "passed" ? "acp_child_exit_recorded" : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "acp-skill-run",
                "failed-unexpected-exit",
                requestId,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AC-04 retains a non-cancelled result after an interrupt race", async function () {
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-04-peer.ndjson",
    );
    let requestId = "";
    let workspaceDir = "";
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AC",
        owner: "acp-transport-and-run-lifecycle",
        namespace: ["system-e2e:ac:04"],
        ownedState: ["acp-run", "acp-child", "peer-evidence"],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          setDebugModeOverrideForTests(true);
          const backend: BackendInstance = {
            id: "system-e2e-ac-04",
            displayName: "System E2E ACP race",
            type: "acp",
            baseUrl: "local://system-e2e-ac-04",
            command: nodePath,
            args: [fixturePath],
            env: {
              ZOTERO_ACP_COMPOSER_E2E_MODE: "cancel-result-race",
              ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
            },
            auth: { kind: "none" },
          };
          const pending = startAcpDiagnosticRun(backend, "ac-04", (id) => {
            requestId = id;
          });
          let promptActive = false;
          for (let attempt = 0; attempt < 150; attempt += 1) {
            const run = listAcpSkillRuns().find(
              (entry) => entry.requestId === requestId,
            );
            promptActive = run?.activePrompt === true;
            if (promptActive) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.isTrue(promptActive);
          await interruptAcpSkillRunCurrentTurn(requestId);
          await pending;
          const run = listAcpSkillRuns().find(
            (entry) => entry.requestId === requestId,
          );
          assert.isOk(run);
          workspaceDir = run!.workspaceDir || "";
          assert.notEqual(run!.status, "canceled");
          assert.equal(run!.promptInterruptState, "unconfirmed");
          assert.notInclude(
            run!.events.map((event) => event.stage),
            "interrupt-forced",
          );
          const transcript = await readAcpSkillRunTranscriptItems({
            runtimeDir: run!.runtimeDir,
          });
          assert.isTrue(
            transcript.items.some(
              (item) =>
                item.kind === "message" &&
                item.role === "assistant" &&
                item.text.includes("ac-04"),
            ),
            JSON.stringify(transcript.items).slice(0, 2000),
          );
          const peer = (await IOUtils.readUTF8(evidencePath))
            .split("\n")
            .filter(Boolean)
            .map(
              (line) => JSON.parse(line) as { method: string; mode: string },
            );
          assert.isTrue(
            peer.some((entry) => entry.method === "session/cancel"),
          );
          assert.isTrue(
            peer.every((entry) => entry.mode === "cancel-result-race"),
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        if (requestId) {
          await endAcpSkillRunSession(requestId);
          await deleteAcpSkillRunRecords([requestId]);
        }
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        return requestId ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AC",
        caseId: "AC-04",
        result: result.result,
        publicOutcome:
          result.result === "passed" ? "acp_interrupt_unconfirmed" : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence("acp-prompt-interrupt", "unconfirmed", requestId)
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AO-01 keeps two Host Bridge write approvals conversation-owned", async function () {
    const backendId = "system-e2e-ao-01";
    const operationIds = [
      "system-e2e:ao:01:approved",
      "system-e2e:ao:01:denied",
    ];
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ao-01-peer.ndjson",
    );
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    const conversations: Array<{ id: string; workspaceDir: string }> = [];
    const parents: Zotero.Item[] = [];
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AO",
        owner: "acp-conversation-host-bridge-approval",
        namespace: ["system-e2e:ao:01"],
        ownedState: [
          "acp-chat-conversation",
          "acp-child",
          "synthetic-parent",
          "host-bridge-operation",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          await IOUtils.makeDirectory(PathUtils.parent(evidencePath), {
            ignoreExisting: true,
          });
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: backendId,
            displayName: "System E2E approvals",
            type: "acp",
            baseUrl: "local://system-e2e-ao-01",
            command: nodePath,
            args: [fixturePath],
            env: { ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath },
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await setActiveAcpBackend({ backendId });
          for (let index = 0; index < 2; index += 1) {
            const parent = new Zotero.Item("journalArticle");
            parent.setField("title", `System E2E approval ${index}`);
            await parent.saveTx();
            parents.push(parent);
            await startNewAcpConversation({ backendId });
            await connectAcpConversation({ backendId });
            const snapshot = getAcpConversationSnapshot();
            assert.isNotEmpty(snapshot.conversationId);
            conversations.push({
              id: snapshot.conversationId,
              workspaceDir: snapshot.agentWorkspaceDir || "",
            });
          }
          const profiles = await Promise.all(
            conversations.map(
              async (entry) =>
                JSON.parse(
                  await IOUtils.readUTF8(
                    PathUtils.join(
                      entry.workspaceDir,
                      ".zotero-bridge",
                      "profile.json",
                    ),
                  ),
                ) as { endpoint: string },
            ),
          );
          assert.equal(profiles[0].endpoint, profiles[1].endpoint);
          const tags = ["system-e2e:ao:approved", "system-e2e:ao:denied"];
          const prompts = conversations.map((entry, index) =>
            sendAcpConversationPrompt({
              backendId,
              conversationId: entry.id,
              message: `system-e2e:approval-write ${JSON.stringify({
                operationId: operationIds[index],
                itemRef: {
                  libraryId: parents[index].libraryID,
                  key: parents[index].key,
                },
                tag: tags[index],
              })}`,
            }),
          );
          const pending = [];
          for (let attempt = 0; attempt < 150; attempt += 1) {
            pending[0] = getAcpConversationSnapshot(
              backendId,
              conversations[0].id,
            ).pendingPermissionRequest;
            pending[1] = getAcpConversationSnapshot(
              backendId,
              conversations[1].id,
            ).pendingPermissionRequest;
            if (pending[0] && pending[1]) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.isOk(
            pending[0],
            JSON.stringify(
              await Promise.all(
                conversations.map(async (entry) => ({
                  status: getAcpConversationSnapshot(backendId, entry.id)
                    .status,
                  transcript: (
                    await readAcpConversationTranscriptPage({
                      backendId,
                      conversationId: entry.id,
                    })
                  ).items
                    .filter(
                      (item) =>
                        item.kind === "message" && item.role === "assistant",
                    )
                    .map((item) => item.text),
                })),
              ),
            ),
          );
          assert.isOk(pending[1]);
          assert.notEqual(pending[0]!.requestId, pending[1]!.requestId);
          assert.isFalse(
            await resolveAcpConversationPermission({
              backendId,
              conversationId: conversations[0].id,
              permissionRequestId: pending[1]!.requestId,
              outcome: "cancelled",
            }),
          );
          assert.equal(
            getAcpConversationSnapshot(backendId, conversations[0].id)
              .pendingPermissionRequest?.requestId,
            pending[0]!.requestId,
          );
          const allow =
            pending[0]!.options.find(
              (option) => option.kind === "allow_once",
            ) || pending[0]!.options[0];
          assert.isOk(allow);
          assert.isTrue(
            await resolveAcpConversationPermission({
              backendId,
              conversationId: conversations[0].id,
              permissionRequestId: pending[0]!.requestId,
              outcome: "selected",
              optionId: allow.optionId,
            }),
          );
          assert.isTrue(
            await resolveAcpConversationPermission({
              backendId,
              conversationId: conversations[1].id,
              permissionRequestId: pending[1]!.requestId,
              outcome: "cancelled",
            }),
          );
          await Promise.all(prompts);
          const peerEvidence = (await IOUtils.readUTF8(evidencePath))
            .split("\n")
            .filter(Boolean)
            .map(
              (line) =>
                JSON.parse(line) as {
                  bridgeScopeRequestId: string;
                  method: string;
                },
            );
          const scopeOwners = new Set(
            peerEvidence
              .filter((entry) => entry.method === "session/prompt")
              .map((entry) => entry.bridgeScopeRequestId),
          );
          assert.lengthOf(Array.from(scopeOwners), 2);
          assert.includeMembers(
            Array.from(scopeOwners),
            conversations.map((entry) => entry.id),
          );
          assert.lengthOf(
            parents[0].getTags().filter((entry) => entry.tag === tags[0]),
            1,
          );
          assert.lengthOf(
            parents[1].getTags().filter((entry) => entry.tag === tags[1]),
            0,
          );
          for (let index = 0; index < 2; index += 1) {
            const page = await readAcpConversationTranscriptPage({
              backendId,
              conversationId: conversations[index].id,
            });
            const replies = page.items.filter(
              (item) => item.kind === "message" && item.role === "assistant",
            );
            assert.lengthOf(replies, 1);
            assert.include(replies[0].text, operationIds[index]);
            assert.notInclude(replies[0].text, operationIds[1 - index]);
            const write = JSON.parse(replies[0].text) as {
              operationId: string;
              code: number;
              output: string;
            };
            const cli = JSON.parse(write.output.trim()) as {
              ok: boolean;
              data?: unknown;
              error?: { code: string };
            };
            assert.equal(write.operationId, operationIds[index]);
            assert.equal(cli.ok, index === 0);
            if (index === 0) assert.isOk(cli.data);
            else assert.isNotEmpty(cli.error?.code);
            assert.isNull(
              getAcpConversationSnapshot(backendId, conversations[index].id)
                .pendingPermissionRequest,
            );
          }
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        for (const entry of conversations) {
          await disconnectAcpConversation({
            backendId,
            conversationId: entry.id,
          });
          await deleteActiveAcpConversation({
            backendId,
            conversationId: entry.id,
          });
          if (entry.workspaceDir) await removeRuntimePath(entry.workspaceDir);
        }
        for (const parent of parents) await parent.eraseTx();
        setPref("backendsConfigJson", previousBackendConfig);
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        return conversations.length === 2 && parents.length === 2
          ? "passed"
          : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AO",
        caseId: "AO-01",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "conversation_write_approval_isolated"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? [
                ...phase2Evidence(
                  "host-bridge-mutation",
                  "committed",
                  operationIds[0],
                ),
                ...phase2Evidence(
                  "host-bridge-mutation",
                  "denied",
                  operationIds[1],
                ),
              ]
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AT-01 keeps ACP Chat and Skills text continuous through side channels in chrome", async function () {
    const backendId = "system-e2e-at-01";
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    let conversationId = "";
    let chatWorkspaceDir = "";
    let requestId = "";
    let skillWorkspaceDir = "";
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AT",
        owner: "acp-transcript-projection",
        namespace: ["system-e2e:at:01"],
        ownedState: [
          "acp-chat-conversation",
          "acp-skill-run",
          "acp-child",
          "assistant-sidebar",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          setDebugModeOverrideForTests(true);
          const backend: BackendInstance = {
            id: backendId,
            displayName: "System E2E transcript",
            type: "acp",
            baseUrl: "local://system-e2e-at-01",
            command: nodePath,
            args: [fixturePath],
            auth: { kind: "none" },
          };
          const configured = await loadBackendsRegistry();
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await setActiveAcpBackend({ backendId });
          await connectAcpConversation({ backendId });
          const connected = getAcpConversationSnapshot();
          conversationId = connected.conversationId;
          chatWorkspaceDir = connected.agentWorkspaceDir || "";
          assert.isNotEmpty(conversationId);
          await setActiveAcpConversation({ backendId, conversationId });
          assert.equal(
            getAcpChatWorkspaceOwnerNavigation().selectedOwner?.ownerKey,
            `${backendId}\n${conversationId}`,
          );
          await sendAcpConversationPrompt({
            backendId,
            conversationId,
            message: "system-e2e:transcript-interleave",
          });
          const chatPage = await readAcpConversationTranscriptPage({
            backendId,
            conversationId,
          });
          const chatAssistant = chatPage.items.filter(
            (item) => item.kind === "message" && item.role === "assistant",
          );
          assert.lengthOf(
            chatAssistant,
            1,
            JSON.stringify(chatPage.items).slice(0, 2000),
          );
          assert.equal(chatAssistant[0].text, "first text second text");
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab: "acp-chat",
              target: "library",
            }),
          );
          let selectedInChrome = false;
          for (let attempt = 0; attempt < 100; attempt += 1) {
            const shell = (
              Zotero.getMainWindow() as _ZoteroTypes.MainWindow
            ).document.querySelector(
              '[data-zs-assistant-shell="true"][data-zs-assistant-active-target="library"]',
            ) as (Element & { contentDocument?: Document }) | null;
            const child = shell?.contentDocument?.querySelector(
              "#assistant-frame-acp-chat",
            ) as HTMLIFrameElement | null;
            const button = Array.from(
              child?.contentDocument?.querySelectorAll<HTMLButtonElement>(
                ".assistant-workspace-drawer-task-main",
              ) || [],
            ).find((entry) =>
              entry.textContent?.includes("system-e2e:transcript-interleave"),
            );
            if (button) {
              button.click();
              selectedInChrome = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.isTrue(
            selectedInChrome,
            "conversation must be selectable in chrome",
          );
          await forceAssistantWorkspaceDiagnosticsPublication({
            tab: "acp-chat",
            expectedChatOwner: { backendId, conversationId },
          });
          const chatChrome = await waitForAssistantTranscriptRow(
            "acp-chat",
            "first text second text",
          );
          assert.isTrue(chatChrome.row.isConnected);

          const skillBackend: BackendInstance = {
            ...backend,
            id: "system-e2e-at-01-skill",
          };
          const skillResult = await startAcpDiagnosticRun(
            skillBackend,
            "system-e2e:transcript-interleave",
            (id) => {
              requestId = id;
            },
          );
          assert.equal(skillResult.status, "succeeded");
          const run = listAcpSkillRuns().find(
            (entry) => entry.requestId === requestId,
          );
          assert.isOk(run);
          skillWorkspaceDir = run!.workspaceDir || "";
          const skillTranscript = await readAcpSkillRunTranscriptItems({
            runtimeDir: run!.runtimeDir,
          });
          const skillAssistant = skillTranscript.items.filter(
            (item) => item.kind === "message" && item.role === "assistant",
          );
          assert.lengthOf(
            skillAssistant,
            1,
            JSON.stringify(skillTranscript.items).slice(0, 2000),
          );
          assert.include(
            skillAssistant[0].text,
            "system-e2e:transcript-interleave",
          );
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab: "acp-skills",
              requestId,
              target: "library",
            }),
          );
          await forceAssistantWorkspaceDiagnosticsPublication({
            tab: "acp-skills",
            expectedSkillRequestId: requestId,
          });
          const skillChrome = await waitForAssistantTranscriptRow(
            "acp-skills",
            "system-e2e:transcript-interleave",
          );
          assert.isTrue(skillChrome.row.isConnected);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        closeAssistantWorkspaceSidebar();
        setDebugModeOverrideForTests();
        if (requestId) {
          await endAcpSkillRunSession(requestId);
          await deleteAcpSkillRunRecords([requestId]);
        }
        if (skillWorkspaceDir) await removeRuntimePath(skillWorkspaceDir);
        if (conversationId) {
          await disconnectAcpConversation({ backendId, conversationId });
          await deleteActiveAcpConversation({ backendId, conversationId });
        }
        if (chatWorkspaceDir) await removeRuntimePath(chatWorkspaceDir);
        setPref("backendsConfigJson", previousBackendConfig);
        return conversationId && requestId ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AT",
        caseId: "AT-01",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "assistant_text_segment_continuous"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "acp-transcript-projection",
                "continuous",
                requestId,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("SR-01 submits through SkillRunner and applies one broker mutation", async function () {
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRunKeys = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
    const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
    let runKey = "";
    let operationId = "";
    let parent: Zotero.Item | undefined;
    let workspaceDir = "";
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "SR",
        owner: "skillrunner-runtime-and-apply",
        namespace: ["system-e2e:sr:01", "debug-apply:"],
        ownedState: ["skillrunner-run", "synthetic-parent", "backend-request"],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(endpoint, "runner endpoint");
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(workflowDir)
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: "system-e2e-sr-01",
            displayName: "System E2E SkillRunner",
            type: "skillrunner",
            baseUrl: endpoint,
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          });
          const runs = listSkillRunnerRunRecords().filter(
            (run) => !previousRunKeys.has(run.runKey),
          );
          assert.lengthOf(
            runs,
            1,
            listRuntimeLogs({ workflowId: workflow!.manifest.id, limit: 20 })
              .map((entry) => `${entry.stage}:${entry.message}`)
              .join(" | "),
          );
          const run = runs[0];
          runKey = run.runKey;
          workspaceDir = run.result?.workspaceDir || "";
          const request = run.requestPayload as {
            targetParentRef?: { libraryId: number; key: string };
            parameter?: { run_key?: string };
          };
          const parentRef = request?.targetParentRef;
          if (parentRef) {
            parent = Zotero.Items.getByLibraryAndKey(
              parentRef.libraryId,
              parentRef.key,
            );
          }
          assert.equal(run.backendId, backend.id);
          assert.isNotEmpty(
            run.requestId,
            JSON.stringify({
              status: run.status,
              submitPhase: run.submitPhase,
              error: run.error,
              logs: listRuntimeLogs({
                workflowId: workflow!.manifest.id,
                limit: 20,
              }).map((entry) => ({
                stage: entry.stage,
                message: entry.message,
                stack: entry.error?.stack?.slice(0, 1800),
              })),
            }),
          );
          assert.equal(
            run.submitPhase,
            "request_ready",
            JSON.stringify({
              status: run.status,
              error: run.error,
              logs: listRuntimeLogs({
                workflowId: workflow!.manifest.id,
                limit: 20,
              }).map((entry) => ({
                stage: entry.stage,
                message: entry.message,
                stack: entry.error?.stack?.slice(0, 500),
              })),
            }),
          );
          assert.equal(run.backendStatus, "succeeded");
          assert.equal(run.status, "succeeded", run.error);
          assert.equal(run.apply.state, "succeeded", run.apply.error);
          const events = listSkillRunnerRunEvents(run.runKey);
          assert.isAtLeast(events.length, 1);
          const debugRunKey = String(request?.parameter?.run_key || "");
          assert.isNotEmpty(debugRunKey, "debug run key");
          assert.isOk(parent);
          assert.equal(
            parent!
              .getTags()
              .filter((tag) => tag.tag === `debug-result:${debugRunKey}`)
              .length,
            1,
          );
          operationId = `debug-apply:tags:${debugRunKey}:result`;
          const receipt = await createWorkflowHostApi({
            ownerId: `interactive-workflow:${workflow!.manifest.id}:applyResult`,
          }).mutations.getOperation({ operationId });
          assert.equal(receipt.state, "settled");
          if (receipt.state === "settled") {
            assert.equal(receipt.result.outcome, "committed");
          }
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        if (runKey) deletePluginRunStoreEntry("skillrunner", runKey);
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        if (parent) await parent.eraseTx();
        return runKey && parent ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "SR",
        caseId: "SR-01",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_workflow_apply_succeeded"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? [
                {
                  kind: "canonical-mutation-receipt",
                  schemaVersion: "zotero-agents.mutation-attempt.v1",
                  terminalStatus: "committed",
                  operationId,
                },
              ]
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("SR-03 reconciles a request lost by a same-port peer restart", async function () {
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRunKeys = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
    const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
    const ownedRunKeys: string[] = [];
    const ownedParents: Zotero.Item[] = [];
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "SR",
        owner: "skillrunner-runtime-and-apply",
        namespace: ["system-e2e:sr:03", "debug-apply:"],
        ownedState: [
          "skillrunner-run",
          "synthetic-parent",
          "backend-request",
          "peer-restart",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(workflowDir)
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: "system-e2e-sr-03",
            displayName: "System E2E SkillRunner restart",
            type: "skillrunner",
            baseUrl: endpoint,
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          const held = await resolveRuntimeHostCapabilities().fetch(
            `${endpoint}/__test/hold-jobs`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ enabled: true }),
            },
          );
          assert.equal(held.status, 200);
          const firstTableResponse =
            await resolveRuntimeHostCapabilities().fetch(
              `${endpoint}/__test/jobs`,
              { method: "POST" },
            );
          const firstTable = (await firstTableResponse.json()) as {
            instanceId: string;
          };
          let executionError = "";
          const pending = executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          }).catch((error) => {
            executionError =
              error instanceof Error ? error.message : String(error);
          });
          let first = listSkillRunnerRunRecords().find(
            (run) =>
              run.backendId === backend.id && !previousRunKeys.has(run.runKey),
          );
          for (let attempt = 0; attempt < 200; attempt += 1) {
            if (first?.requestId && first.submitPhase === "request_ready")
              break;
            await new Promise((resolve) => setTimeout(resolve, 20));
            first = listSkillRunnerRunRecords().find(
              (run) =>
                run.backendId === backend.id &&
                !previousRunKeys.has(run.runKey),
            );
          }
          assert.isOk(first, executionError);
          assert.isNotEmpty(first!.requestId, first!.error);
          assert.equal(first!.submitPhase, "request_ready");
          assert.notEqual(
            first!.status,
            "succeeded",
            "restart must precede terminal completion",
          );
          ownedRunKeys.push(first!.runKey);
          const parentRef = (
            first!.requestPayload as {
              targetParentRef?: { libraryId: number; key: string };
            }
          )?.targetParentRef;
          assert.isOk(parentRef);
          const parent = Zotero.Items.getByLibraryAndKey(
            parentRef!.libraryId,
            parentRef!.key,
          );
          assert.isOk(parent);
          ownedParents.push(parent!);
          await emitZoteroTestDebug({
            kind: "system-e2e-peer-restart-request",
            caseId: "SR-03",
          });
          const tableResponse = await resolveRuntimeHostCapabilities().fetch(
            `${endpoint}/__test/jobs`,
            { method: "POST" },
          );
          const table = (await tableResponse.json()) as {
            instanceId: string;
            requestIds?: string[];
          };
          assert.notEqual(
            table.instanceId,
            firstTable.instanceId,
            "runner must replace the serving peer",
          );
          assert.notInclude(
            table.requestIds || [],
            first!.requestId!,
            "restarted peer must lose the old request",
          );
          const freshState = await resolveRuntimeHostCapabilities().fetch(
            `${endpoint}/v1/jobs/${first!.requestId}`,
            { cache: "no-store" },
          );
          assert.equal(freshState.status, 404, JSON.stringify(table));
          const reconciled = await reconcileSkillRunnerBackendTaskLedgerOnce({
            backend,
            source: "local-runtime-up",
          });
          assert.include(
            reconciled.missingRequestIds,
            first!.requestId!,
            JSON.stringify({
              reconciled,
              allRuns: listSkillRunnerRunRecords().map((run) => ({
                runKey: run.runKey,
                backendId: run.backendId,
                requestId: run.requestId,
                status: run.status,
              })),
              filteredRuns: listSkillRunnerRunRecords({
                backendId: backend.id,
              }).map((run) => ({
                runKey: run.runKey,
                requestId: run.requestId,
                status: run.status,
              })),
              tasks: listWorkflowTasks().filter(
                (task) => task.backendId === backend.id,
              ),
            }),
          );
          await pending;
          const terminal = listSkillRunnerRunRecords().find(
            (run) => run.runKey === first!.runKey,
          );
          assert.isOk(terminal);
          assert.equal(terminal!.status, "failed");
          assert.notEqual(terminal!.apply.state, "succeeded");
          assert.isFalse(
            listActiveWorkflowTasks().some(
              (task) => task.requestId === first!.requestId,
            ),
          );
          assert.equal(parent!.getTags().length, 0);
          const terminalEvents = listSkillRunnerRunEvents(first!.runKey).filter(
            (event) => event.type === "run.terminal_client_error",
          );
          assert.lengthOf(terminalEvents, 1);
          assert.include(
            String(terminalEvents[0].payload?.reason || ""),
            "404",
          );

          await executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          });
          const followUp = listSkillRunnerRunRecords().find(
            (run) =>
              run.backendId === backend.id &&
              run.runKey !== first!.runKey &&
              !previousRunKeys.has(run.runKey),
          );
          assert.isOk(followUp);
          ownedRunKeys.push(followUp!.runKey);
          const nextParentRef = (
            followUp!.requestPayload as {
              targetParentRef?: { libraryId: number; key: string };
            }
          )?.targetParentRef;
          if (nextParentRef) {
            const nextParent = Zotero.Items.getByLibraryAndKey(
              nextParentRef.libraryId,
              nextParentRef.key,
            );
            if (nextParent) ownedParents.push(nextParent);
          }
          assert.equal(followUp!.status, "succeeded", followUp!.error);
          assert.equal(followUp!.apply.state, "succeeded");
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        for (const runKey of ownedRunKeys)
          deletePluginRunStoreEntry("skillrunner", runKey);
        for (const parent of ownedParents) await parent.eraseTx();
        return ownedRunKeys.length === 2 ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "SR",
        caseId: "SR-03",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_missing_request_reconciled"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "skillrunner-run",
                "failed-missing-request",
                ownedRunKeys[0],
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("SR-04 keeps execution preflight on the submit lane during a busy handshake", async function () {
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRunKeys = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
    const backendId = "system-e2e-sr-04";
    let runKey = "";
    let parent: Zotero.Item | undefined;
    let workspaceDir = "";
    let caseError = "";
    const setDelay = async (delayMs: number) => {
      const response = await resolveRuntimeHostCapabilities().fetch(
        `${endpoint}/__test/handshake-delay`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ delayMs }),
        },
      );
      assert.equal(response.status, 200);
    };
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "SR",
        owner: "skillrunner-runtime-and-apply",
        namespace: ["system-e2e:sr:04", "debug-apply:"],
        ownedState: [
          "skillrunner-run",
          "synthetic-parent",
          "handshake-throttle",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(
              readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
            )
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: backendId,
            displayName: "System E2E busy SkillRunner",
            type: "skillrunner",
            baseUrl: endpoint,
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await setDelay(1800);
          const health = new SkillRunnerManagementClient({
            baseUrl: endpoint,
            backendId,
          }).handshake({ lane: "health" });
          for (let attempt = 0; attempt < 50; attempt += 1) {
            if (
              defaultSkillRunnerConnectionGovernor
                .getCoreSnapshot()
                .active.some(
                  (entry) =>
                    entry.backendId === backendId && entry.lane === "health",
                )
            )
              break;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.isTrue(
            defaultSkillRunnerConnectionGovernor
              .getCoreSnapshot()
              .active.some(
                (entry) =>
                  entry.backendId === backendId && entry.lane === "health",
              ),
          );
          const pending = executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId },
          });
          let sawSubmitHandshake = false;
          for (let attempt = 0; attempt < 250; attempt += 1) {
            sawSubmitHandshake = defaultSkillRunnerConnectionGovernor
              .getCoreSnapshot()
              .active.some(
                (entry) =>
                  entry.backendId === backendId &&
                  entry.lane === "submit" &&
                  entry.operation === "POST /v1/system/handshake",
              );
            if (sawSubmitHandshake) break;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          assert.isTrue(
            sawSubmitHandshake,
            "execution preflight must use the submit lane",
          );
          await health;
          await pending;
          const runs = listSkillRunnerRunRecords().filter(
            (run) =>
              run.backendId === backendId && !previousRunKeys.has(run.runKey),
          );
          assert.lengthOf(runs, 1);
          const run = runs[0];
          runKey = run.runKey;
          workspaceDir = run.result?.workspaceDir || "";
          assert.equal(run.status, "succeeded", run.error);
          assert.equal(run.apply.state, "succeeded", run.apply.error);
          assert.equal(run.submitPhase, "request_ready");
          const parentRef = (
            run.requestPayload as {
              targetParentRef?: { libraryId: number; key: string };
            }
          )?.targetParentRef;
          if (parentRef)
            parent = Zotero.Items.getByLibraryAndKey(
              parentRef.libraryId,
              parentRef.key,
            );
          assert.isOk(parent);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        await setDelay(0);
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        if (runKey) deletePluginRunStoreEntry("skillrunner", runKey);
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        if (parent) await parent.eraseTx();
        return runKey && parent ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "SR",
        caseId: "SR-04",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_submit_handshake_completed"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "skillrunner-run",
                "succeeded-after-submit-handshake",
                runKey,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AW-01 preserves SkillRunner publication identity across live detach and reattach", async function () {
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRunKeys = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
    const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
    const fetchRuntime = resolveRuntimeHostCapabilities().fetch;
    let pending: Promise<unknown> | null = null;
    let runKey = "";
    let workspaceDir = "";
    let parent: Zotero.Item | undefined;
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AW",
        owner: "assistant-workspace-publication",
        namespace: ["system-e2e:aw:01", "debug-apply:"],
        ownedState: [
          "skillrunner-run",
          "synthetic-parent",
          "assistant-sidebar",
          "backend-request",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(endpoint);
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(workflowDir)
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: "system-e2e-aw-01",
            displayName: "System E2E Workspace live",
            type: "skillrunner",
            baseUrl: endpoint,
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          assert.equal(
            (
              await fetchRuntime(`${endpoint}/__test/hold-jobs`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ enabled: true }),
              })
            ).status,
            200,
          );
          let executionError = "";
          pending = executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          }).catch((error) => {
            executionError =
              error instanceof Error ? error.message : String(error);
          });
          let run = listSkillRunnerRunRecords().find(
            (entry) =>
              entry.backendId === backend.id &&
              !previousRunKeys.has(entry.runKey),
          );
          for (let attempt = 0; attempt < 200; attempt += 1) {
            if (run?.requestId && run.submitPhase === "request_ready") break;
            await new Promise((resolve) => setTimeout(resolve, 20));
            run = listSkillRunnerRunRecords().find(
              (entry) =>
                entry.backendId === backend.id &&
                !previousRunKeys.has(entry.runKey),
            );
          }
          assert.isOk(run, executionError);
          assert.isNotEmpty(run!.requestId);
          assert.equal(run!.submitPhase, "request_ready");
          assert.notEqual(run!.status, "succeeded");
          runKey = run!.runKey;
          const projection = getSkillRunnerRunProjection(runKey);
          assert.isOk(
            projection,
            JSON.stringify({
              runKey,
              status: run!.status,
              tasks: listWorkflowTasks().filter(
                (task) => task.runKey === runKey,
              ),
            }),
          );
          assert.equal(projection!.backendType, "skillrunner");
          const parentRef = (
            run!.requestPayload as {
              targetParentRef?: { libraryId: number; key: string };
            }
          )?.targetParentRef;
          if (parentRef)
            parent = Zotero.Items.getByLibraryAndKey(
              parentRef.libraryId,
              parentRef.key,
            );
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab: "skillrunner",
              runKey,
              target: "library",
            }),
          );
          await refreshSkillRunnerSidebarHostSnapshot({
            forceInit: true,
            runKey,
            selectionChanged: true,
          });
          for (
            let attempt = 0;
            attempt < 100 &&
            getSkillRunnerWorkspaceReadModel()?.runKey !== runKey;
            attempt += 1
          ) {
            if (attempt % 10 === 0)
              await focusSkillRunnerWorkspace({
                runKey,
                selectionChanged: true,
              });
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.equal(
            getSkillRunnerWorkspaceReadModel()?.runKey,
            runKey,
            JSON.stringify({
              groups: listSkillRunnerWorkspaceTaskGroups(),
              configured: (await loadBackendsRegistry()).backends.map(
                (entry) => ({ id: entry.id, type: entry.type }),
              ),
              projection,
            }).slice(0, 3000),
          );
          const liveGroups = listSkillRunnerWorkspaceTaskGroups();
          assert.isTrue(
            liveGroups.groups.some(
              (group) =>
                !group.disabled &&
                [...group.activeTasks, ...group.finishedTasks].some(
                  (task) => task.key === runKey && task.selectable,
                ),
            ),
            JSON.stringify(liveGroups).slice(0, 3000),
          );
          await refreshLiveSkillRunnerChrome();
          const first = await waitForAssistantTranscriptRow(
            "skillrunner",
            "System E2E SkillRunner running transcript",
          );
          assert.isTrue(first.row.isConnected);
          const firstModel = getSkillRunnerWorkspaceReadModel();
          assert.equal(firstModel?.runKey, runKey);
          const firstRevision = firstModel?.transcriptRevision || 0;
          assert.isAbove(firstRevision, 0);
          assert.isTrue(closeAssistantWorkspaceSidebar());
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab: "skillrunner",
              runKey,
              target: "library",
            }),
          );
          await refreshSkillRunnerSidebarHostSnapshot({
            forceInit: true,
            runKey,
            selectionChanged: true,
          });
          await refreshLiveSkillRunnerChrome();
          const reopened = await waitForAssistantTranscriptRow(
            "skillrunner",
            "System E2E SkillRunner running transcript",
          );
          const reopenedModel = getSkillRunnerWorkspaceReadModel();
          assert.equal(reopenedModel?.runKey, runKey);
          assert.equal(reopenedModel?.requestId, run!.requestId);
          assert.equal(reopenedModel?.canReply, firstModel?.canReply);
          assert.deepEqual(
            reopenedModel?.pendingInteraction,
            firstModel?.pendingInteraction,
          );
          assert.isAtLeast(
            reopenedModel?.transcriptRevision || 0,
            firstRevision,
          );
          const toolbar = reopened.document.querySelector(
            '[data-role="toolbar"]',
          )?.firstElementChild;
          assert.isOk(toolbar);
          assert.equal(
            (
              await fetchRuntime(`${endpoint}/__test/hold-jobs`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ enabled: false }),
              })
            ).status,
            200,
          );
          await pending;
          assert.isEmpty(executionError);
          run = listSkillRunnerRunRecords().find(
            (entry) => entry.runKey === runKey,
          );
          assert.isOk(run);
          assert.equal(run!.status, "succeeded", run!.error);
          workspaceDir = run!.result?.workspaceDir || "";
          const terminal = await waitForAssistantTranscriptRow(
            "skillrunner",
            "System E2E SkillRunner completed transcript",
          );
          assert.strictEqual(
            terminal.document.querySelector('[data-role="toolbar"]')
              ?.firstElementChild,
            toolbar,
          );
          assert.isAbove(
            getSkillRunnerWorkspaceReadModel()?.transcriptRevision || 0,
            firstRevision,
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        closeAssistantWorkspaceSidebar();
        await fetchRuntime(`${endpoint}/__test/hold-jobs`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled: false }),
        });
        if (pending) await pending;
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        if (runKey) deletePluginRunStoreEntry("skillrunner", runKey);
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        if (parent) await parent.eraseTx();
        return runKey && parent ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AW",
        caseId: "AW-01",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_publication_identity_preserved"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "skillrunner-workspace-publication",
                "identity-preserved",
                runKey,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AW-02 renders a completed SkillRunner transcript in the Linux chrome iframe", async function () {
    if (!Zotero.isLinux) this.skip();
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const previousRunKeys = new Set(
      listSkillRunnerRunRecords().map((run) => run.runKey),
    );
    const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
    const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
    let runKey = "";
    let workspaceDir = "";
    let parent: Zotero.Item | undefined;
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AW",
        owner: "assistant-workspace-publication",
        namespace: ["system-e2e:aw:02", "debug-apply:"],
        ownedState: [
          "skillrunner-run",
          "synthetic-parent",
          "assistant-sidebar",
        ],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(endpoint);
          setDebugModeOverrideForTests(true);
          const workflow = (
            await loadWorkflowManifests(workflowDir)
          ).workflows.find(
            (entry) => entry.manifest.id === "debug-apply-single-result",
          );
          assert.isOk(workflow);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: "system-e2e-aw-02",
            displayName: "System E2E Workspace",
            type: "skillrunner",
            baseUrl: endpoint,
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await executeWorkflowFromCurrentSelection({
            win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
            workflow: workflow!,
            executionOptionsOverride: { backendId: backend.id },
          });
          const runs = listSkillRunnerRunRecords().filter(
            (run) => !previousRunKeys.has(run.runKey),
          );
          assert.lengthOf(runs, 1);
          const run = runs[0];
          runKey = run.runKey;
          workspaceDir = run.result?.workspaceDir || "";
          const parentRef = (
            run.requestPayload as {
              targetParentRef?: { libraryId: number; key: string };
            }
          )?.targetParentRef;
          if (parentRef)
            parent = Zotero.Items.getByLibraryAndKey(
              parentRef.libraryId,
              parentRef.key,
            );
          assert.equal(run.status, "succeeded", run.error);
          assert.isNotEmpty(run.requestId);
          assert.isTrue(
            await openAssistantWorkspaceSidebar({
              tab: "skillrunner",
              runKey,
              target: "library",
            }),
          );
          for (
            let attempt = 0;
            attempt < 100 &&
            getSkillRunnerWorkspaceReadModel()?.runKey !== runKey;
            attempt += 1
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          assert.equal(getSkillRunnerWorkspaceReadModel()?.runKey, runKey);
          const rendered = await waitForAssistantTranscriptRow(
            "skillrunner",
            "System E2E SkillRunner completed transcript",
            run.requestId,
          );
          assert.isTrue(rendered.row.isConnected);
          const model = getSkillRunnerWorkspaceReadModel();
          assert.equal(model?.runKey, runKey);
          assert.equal(model?.requestId, run.requestId);
          assert.isAbove(model?.transcriptRevision || 0, 0);
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        closeAssistantWorkspaceSidebar();
        setDebugModeOverrideForTests();
        setPref("backendsConfigJson", previousBackendConfig);
        if (runKey) deletePluginRunStoreEntry("skillrunner", runKey);
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        if (parent) await parent.eraseTx();
        return runKey && parent ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AW",
        caseId: "AW-02",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_chrome_transcript_rendered"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "skillrunner-chrome-transcript",
                "rendered",
                runKey,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });

  it("AP-01 materializes ACP Chat Skills before readiness", async function () {
    const backendId = "system-e2e-ap-01";
    const previousBackendConfig = String(getPref("backendsConfigJson") || "");
    const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
    const fixturePath = PathUtils.join(
      PathUtils.parent(readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR")),
      "tests",
      "fixtures",
      "acp",
      "acp-composer-reply-agent.mjs",
    );
    let conversationId = "";
    let workspaceDir = "";
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AP",
        owner: "acp-chat-skill-materialization",
        namespace: ["system-e2e:ap:01"],
        ownedState: ["acp-chat-conversation", "acp-child", "injected-skills"],
        carryOver: [],
      },
      execute: async () => {
        try {
          assert.isNotEmpty(nodePath);
          assert.isTrue(await IOUtils.exists(fixturePath));
          const bundle = await materializeHostBridgePluginSkillBundle();
          assert.isTrue(bundle.ok, bundle.ok ? undefined : bundle.error);
          const configured = await loadBackendsRegistry();
          const backend: BackendInstance = {
            id: backendId,
            displayName: "System E2E ACP materialization",
            type: "acp",
            baseUrl: "local://system-e2e-ap-01",
            command: nodePath,
            args: [fixturePath],
            auth: { kind: "none" },
          };
          setPref(
            "backendsConfigJson",
            JSON.stringify(
              createBackendsPrefsDocument([...configured.backends, backend]),
            ),
          );
          await setActiveAcpBackend({ backendId });
          await connectAcpConversation({ backendId });
          const snapshot = getAcpConversationSnapshot();
          conversationId = snapshot.conversationId;
          workspaceDir = snapshot.agentWorkspaceDir || "";
          assert.isNotEmpty(conversationId);
          assert.isNotEmpty(workspaceDir);
          assert.isNotEmpty(snapshot.sessionId);
          const ready = snapshot.diagnostics.find(
            (entry) => entry.kind === "acp_chat_injected_skills_ready",
          ) as
            | {
                raw?: {
                  skillRoots?: string[];
                  targetDirsBySkill?: Record<string, string[]>;
                  expectedTargetCount?: number;
                  materializedTargetCount?: number;
                  failedTargets?: unknown[];
                };
              }
            | undefined;
          assert.isOk(
            ready,
            JSON.stringify(
              snapshot.diagnostics
                .filter((entry) =>
                  entry.kind.startsWith("acp_chat_injected_skill"),
                )
                .map((entry) => ({
                  kind: entry.kind,
                  detail: entry.detail,
                  raw: entry.raw,
                })),
            ),
          );
          assert.isAbove(ready!.raw?.expectedTargetCount || 0, 0);
          assert.equal(
            ready!.raw?.materializedTargetCount,
            ready!.raw?.expectedTargetCount,
          );
          assert.isEmpty(ready!.raw?.failedTargets || []);
          const roots = ready!.raw?.skillRoots || [];
          assert.isNotEmpty(roots);
          for (const root of roots) {
            assert.isTrue(
              await IOUtils.exists(root),
              `Skill root must exist: ${root}`,
            );
            if (Zotero.isWin) {
              assert.match(root, /^[A-Za-z]:\\/);
              assert.notInclude(root, "/");
            }
          }
          const targets = Object.values(
            ready!.raw?.targetDirsBySkill || {},
          ).flat();
          assert.lengthOf(targets, ready!.raw!.expectedTargetCount!);
          for (const target of targets) {
            assert.isTrue(
              await IOUtils.exists(PathUtils.join(target, "SKILL.md")),
            );
          }
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        if (conversationId) {
          await disconnectAcpConversation({ backendId, conversationId });
          await deleteActiveAcpConversation({ backendId, conversationId });
        }
        if (workspaceDir) await removeRuntimePath(workspaceDir);
        setPref("backendsConfigJson", previousBackendConfig);
        return conversationId ? "passed" : "indeterminate";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AP",
        caseId: "AP-01",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "acp_chat_skills_materialized"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence("acp-skill-materialization", "ready")
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

describe("System E2E Phase 2 ACP owner restart", function () {
  this.timeout(240_000);

  it("AC-05 reconciles an interrupted active ACP run once", async function () {
    if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "SR-02")
      this.skip();
    const operationId = "system-e2e:ac:05";
    const statePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-05-state.json",
    );
    const evidencePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-05-peer.ndjson",
    );
    const modePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "ac-05-mode.txt",
    );
    const resume =
      readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "AC-05";
    if (!resume) {
      assert.isTrue(isSystemE2ERun());
      const previousBackendConfig = String(getPref("backendsConfigJson") || "");
      const nodePath = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_NODE_PATH");
      const workflowDir = readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR");
      const fixturePath = PathUtils.join(
        PathUtils.parent(workflowDir),
        "tests",
        "fixtures",
        "acp",
        "acp-composer-reply-agent.mjs",
      );
      setDebugModeOverrideForTests(true);
      const workflow = (
        await loadWorkflowManifests(workflowDir)
      ).workflows.find(
        (entry) => entry.manifest.id === "debug-apply-single-result",
      );
      assert.isOk(workflow);
      const configured = await loadBackendsRegistry();
      await IOUtils.writeUTF8(modePath, "normal");
      const backend: BackendInstance = {
        id: "system-e2e-ac-05",
        displayName: "System E2E ACP restart",
        type: "acp",
        baseUrl: "local://system-e2e-ac-05",
        command: nodePath,
        args: [fixturePath],
        env: {
          ZOTERO_ACP_COMPOSER_E2E_MODE_FILE: modePath,
          ZOTERO_ACP_COMPOSER_E2E_EVIDENCE: evidencePath,
        },
        auth: { kind: "none" },
      };
      const probe = await probeAcpBackendRuntimeOptions({ backend });
      assert.isTrue(probe.ok, probe.error);
      await IOUtils.writeUTF8(modePath, "startup-stall");
      setPref(
        "backendsConfigJson",
        JSON.stringify(
          createBackendsPrefsDocument([...configured.backends, probe.backend]),
        ),
      );
      assert.isTrue(
        (await loadBackendsRegistry()).backends.some(
          (entry) => entry.id === backend.id,
        ),
        "AC-05 backend must load",
      );
      let executionError = "";
      void executeWorkflowFromCurrentSelection({
        win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
        workflow: workflow!,
        executionOptionsOverride: { backendId: backend.id },
      }).catch((error) => {
        executionError = error instanceof Error ? error.message : String(error);
      });
      let active = listAcpSkillRuns().find(
        (run) => run.backendId === backend.id,
      );
      for (let attempt = 0; attempt < 150; attempt += 1) {
        if (active?.inputManifestPath && (await IOUtils.exists(evidencePath))) {
          const peer = await IOUtils.readUTF8(evidencePath);
          if (peer.includes('"method":"initialize"')) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        active = listAcpSkillRuns().find((run) => run.backendId === backend.id);
      }
      assert.isOk(
        active,
        JSON.stringify({
          executionError,
          runs: listAcpSkillRuns().map((run) => ({
            backendId: run.backendId,
            status: run.status,
          })),
          logs: listRuntimeLogs({
            workflowId: workflow!.manifest.id,
            limit: 20,
          }).map((entry) => ({
            stage: entry.stage,
            message: entry.message,
            details: entry.details,
            error: entry.error?.message,
          })),
        }),
      );
      assert.isNotEmpty(active!.inputManifestPath);
      assert.isTrue(await IOUtils.exists(evidencePath));
      assert.equal(active!.status, "running");
      assert.isTrue(
        listWorkflowTasks().some(
          (task) => task.requestId === active!.requestId,
        ),
      );
      const input = JSON.parse(
        await IOUtils.readUTF8(active!.inputManifestPath!),
      ) as {
        targetParentRef?: { libraryId: number; key: string };
      };
      assert.isOk(
        input.targetParentRef,
        "workflow request must retain its synthetic parent",
      );
      const processId = Number(
        (Zotero.Utilities.Internal as any).getProcessID?.() || 0,
      );
      assert.isAbove(processId, 0);
      await IOUtils.writeUTF8(
        statePath,
        JSON.stringify({
          operationId,
          requestId: active!.requestId,
          workspaceDir: active!.workspaceDir,
          parentRef: input.targetParentRef,
          previousBackendConfig,
          processId,
        }),
      );
      await emitZoteroTestDebug({
        kind: "system-e2e-owner-restart-request",
        caseId: "AC-05",
        operationId,
        processId,
      });
      throw new Error("system_e2e_owner_restart_not_performed");
    }

    const state = JSON.parse(await IOUtils.readUTF8(statePath)) as {
      requestId: string;
      workspaceDir: string;
      parentRef: { libraryId: number; key: string };
      previousBackendConfig: string;
      processId: number;
    };
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "AC",
        owner: "acp-transport-and-run-lifecycle",
        namespace: ["system-e2e:ac:05", "debug-apply:"],
        ownedState: [
          "acp-run",
          "workflow-task",
          "synthetic-parent",
          "peer-evidence",
        ],
        carryOver: [
          "acp-run",
          "workflow-task",
          "synthetic-parent",
          "peer-evidence",
        ],
      },
      execute: async () => {
        try {
          assert.isFalse(await IOUtils.exists(`/proc/${state.processId}`));
          const run = listAcpSkillRuns().find(
            (entry) => entry.requestId === state.requestId,
          );
          assert.isOk(run);
          assert.equal(
            run!.status,
            "failed",
            JSON.stringify({
              conversationState: run!.conversationState,
              conversationRecoveryState: run!.conversationRecoveryState,
              events: run!.events.map((event) => event.stage),
              tasks: listWorkflowTasks().filter(
                (task) => task.requestId === state.requestId,
              ),
            }),
          );
          assert.equal(
            run!.events.find(
              (event) => event.stage === "startup-recovery-unavailable",
            )?.details?.reason,
            "startup_reconcile",
          );
          assert.equal(run!.conversationRecoveryState, "unavailable");
          assert.isFalse(run!.activePrompt);
          assert.equal(
            run!.events.filter(
              (event) => event.stage === "startup-recovery-unavailable",
            ).length,
            1,
          );
          assert.isFalse(
            listWorkflowTasks().some(
              (task) => task.requestId === state.requestId,
            ),
          );
          assert.isTrue(await IOUtils.exists(evidencePath));
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        await deleteAcpSkillRunRecords([state.requestId]);
        if (state.workspaceDir) await removeRuntimePath(state.workspaceDir);
        const parent = Zotero.Items.getByLibraryAndKey(
          state.parentRef.libraryId,
          state.parentRef.key,
        );
        if (parent) await parent.eraseTx();
        setPref("backendsConfigJson", state.previousBackendConfig);
        setDebugModeOverrideForTests();
        await IOUtils.remove(evidencePath, { ignoreAbsent: true });
        await IOUtils.remove(modePath, { ignoreAbsent: true });
        await IOUtils.remove(statePath, { ignoreAbsent: true });
        return "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "AC",
        caseId: "AC-05",
        result: result.result,
        publicOutcome:
          result.result === "passed" ? "acp_startup_reconciled" : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "acp-skill-run",
                "failed-startup-reconcile",
                state.requestId,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

describe("System E2E Phase 2 SkillRunner apply restart", function () {
  this.timeout(240_000);

  it("SR-02 classifies a killed in-progress apply without replay", async function () {
    const operationId = "system-e2e:sr:02";
    const statePath = PathUtils.join(
      Zotero.DataDirectory.dir,
      "system-e2e",
      "sr-02-state.json",
    );
    const resume =
      readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "SR-02";
    if (!resume) {
      assert.isTrue(isSystemE2ERun());
      const previousBackendConfig = String(getPref("backendsConfigJson") || "");
      const previousRunKeys = new Set(
        listSkillRunnerRunRecords().map((run) => run.runKey),
      );
      const endpoint = readDiagnosticsEnv("ZOTERO_TEST_SKILLRUNNER_ENDPOINT");
      setDebugModeOverrideForTests(true);
      const workflow = (
        await loadWorkflowManifests(
          readDiagnosticsEnv("ZOTERO_TEST_WORKFLOW_DIR"),
        )
      ).workflows.find(
        (entry) => entry.manifest.id === "debug-apply-single-result",
      );
      assert.isOk(workflow);
      const backend: BackendInstance = {
        id: "system-e2e-sr-02",
        displayName: "System E2E SkillRunner apply restart",
        type: "skillrunner",
        baseUrl: endpoint,
        auth: { kind: "none" },
      };
      const configured = await loadBackendsRegistry();
      setPref(
        "backendsConfigJson",
        JSON.stringify(
          createBackendsPrefsDocument([...configured.backends, backend]),
        ),
      );
      const pending = executeWorkflowFromCurrentSelection({
        win: Zotero.getMainWindow() as _ZoteroTypes.MainWindow,
        workflow: workflow!,
        executionOptionsOverride: { backendId: backend.id },
      });
      const findRun = () =>
        listSkillRunnerRunRecords().find(
          (run) =>
            run.backendId === backend.id && !previousRunKeys.has(run.runKey),
        );
      let run = findRun();
      for (let attempt = 0; attempt < 20_000; attempt += 1) {
        run = findRun();
        if (
          run?.requestId &&
          listSkillRunnerRunEvents(run.runKey).some(
            (event) => event.type === "apply.started",
          )
        )
          break;
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
      assert.isOk(run);
      assert.isNotEmpty(run!.requestId);
      const events = listSkillRunnerRunEvents(run!.runKey);
      const started = events.some((event) => event.type === "apply.started");
      const settled = events.some(
        (event) =>
          event.type === "apply.succeeded" || event.type === "apply.failed",
      );
      const parentRef = (
        run!.requestPayload as {
          targetParentRef?: { libraryId: number; key: string };
        }
      )?.targetParentRef;
      assert.isOk(parentRef);
      const processId = Number(
        (Zotero.Utilities.Internal as any).getProcessID?.() || 0,
      );
      assert.isAbove(processId, 0);
      if (!started || settled) {
        await pending;
        deletePluginRunStoreEntry("skillrunner", run!.runKey);
        const parent = Zotero.Items.getByLibraryAndKey(
          parentRef!.libraryId,
          parentRef!.key,
        );
        if (parent) await parent.eraseTx();
        setPref("backendsConfigJson", previousBackendConfig);
        setDebugModeOverrideForTests();
        throw new Error("system_e2e_apply_started_external_boundary_not_hit");
      }
      await IOUtils.writeUTF8(
        statePath,
        JSON.stringify({
          operationId,
          processId,
          backendId: backend.id,
          runKey: run!.runKey,
          requestId: run!.requestId,
          parentRef,
          previousBackendConfig,
          checkpointUsed: false,
        }),
      );
      await emitZoteroTestDebug({
        kind: "system-e2e-owner-restart-request",
        caseId: "SR-02",
        operationId,
        processId,
      });
      throw new Error("system_e2e_owner_restart_not_performed");
    }

    const state = JSON.parse(await IOUtils.readUTF8(statePath)) as {
      backendId: string;
      runKey: string;
      requestId: string;
      parentRef: { libraryId: number; key: string };
      previousBackendConfig: string;
      processId: number;
      checkpointUsed: boolean;
    };
    let caseError = "";
    const result = await runFamilyLifecycle({
      declaration: {
        familyId: "SR",
        owner: "skillrunner-runtime-and-apply",
        namespace: ["system-e2e:sr:02", "debug-apply:"],
        ownedState: ["skillrunner-run", "synthetic-parent", "durable-apply"],
        carryOver: ["skillrunner-run", "synthetic-parent", "durable-apply"],
      },
      execute: async () => {
        try {
          assert.isFalse(await IOUtils.exists(`/proc/${state.processId}`));
          const run = listSkillRunnerRunRecords().find(
            (entry) => entry.runKey === state.runKey,
          );
          assert.isOk(run);
          await reconcileSkillRunnerMissingContextOnce({
            backendId: state.backendId,
            source: "startup",
          });
          const recovered = listSkillRunnerRunRecords().find(
            (entry) => entry.runKey === state.runKey,
          );
          assert.isOk(recovered);
          assert.equal(recovered!.status, "failed", recovered!.error);
          assert.include(recovered!.error || "", "unrecoverable-apply-running");
          assert.notEqual(recovered!.apply.state, "succeeded");
          const terminalEvents = listSkillRunnerRunEvents(state.runKey).filter(
            (event) => event.type === "run.terminal_client_error",
          );
          assert.lengthOf(terminalEvents, 1);
          assert.include(
            String(terminalEvents[0].payload?.reason || ""),
            "unrecoverable-apply-running",
          );
          assert.isFalse(
            listRuntimeLogs({ requestId: state.requestId, limit: 100 }).some(
              (entry) =>
                entry.stage === "provider-http-get-state-response" ||
                entry.stage === "provider-http-poll-response",
            ),
          );
          const parent = Zotero.Items.getByLibraryAndKey(
            state.parentRef.libraryId,
            state.parentRef.key,
          );
          assert.isOk(parent);
          assert.isAtMost(parent!.getTags().length, 1);
          assert.isFalse(
            listActiveWorkflowTasks().some(
              (task) => task.requestId === state.requestId,
            ),
          );
        } catch (error) {
          caseError = error instanceof Error ? error.message : String(error);
          throw error;
        }
      },
      cleanup: async () => {
        deletePluginRunStoreEntry("skillrunner", state.runKey);
        const parent = Zotero.Items.getByLibraryAndKey(
          state.parentRef.libraryId,
          state.parentRef.key,
        );
        if (parent) await parent.eraseTx();
        setPref("backendsConfigJson", state.previousBackendConfig);
        setDebugModeOverrideForTests();
        await IOUtils.remove(statePath, { ignoreAbsent: true });
        return "passed";
      },
      healthGate: () => observeSystemE2EHealth(),
    });
    await emitZoteroTestDebug({
      kind: "system-e2e-family-result",
      family: {
        familyId: "SR",
        caseId: "SR-02",
        result: result.result,
        publicOutcome:
          result.result === "passed"
            ? "skillrunner_apply_recovery_unrecoverable"
            : undefined,
        failureCode: result.abortCode,
        typedEvidence:
          result.result === "passed"
            ? phase2Evidence(
                "skillrunner-apply",
                "failed-unrecoverable",
                state.runKey,
              )
            : [],
        lifecycle: result.transitions.map((checkpoint) => ({
          checkpoint,
          outcome: "completed",
        })),
        cleanup: result.cleanup,
        health: result.health,
        artifacts: [],
      },
    });
    assert.isFalse(result.abort, caseError);
    assert.equal(result.result, "passed", caseError);
  });
});

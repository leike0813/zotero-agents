import { assert } from "chai";
import { configurePiLocalProviderProfile } from "../../../helpers/piRuntimeOwnerDriver";
import { createPiCapacityAutoDriver, createPiCapacityFixture, } from "../../../helpers/piCapacityWorkflowDriver";
import { getPiConversationCoordinator } from "../../../../src/modules/piConversation";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import { getPiSkillRunCoordinator } from "../../../../src/modules/piSkillRun";
import { ensureRuntimeDirectoryStrict, getRuntimePersistencePaths, writeRuntimeTextFile, } from "../../../../src/modules/runtimePersistence";
import { executeWorkflowFromCurrentSelection } from "../../../../src/modules/workflow/ui/workflowExecute";
import { BUILTIN_PI_BACKEND_ID } from "../../../../src/config/defaults";
import { loadWorkflowManifests } from "../../../../src/workflows/loader";
import { builtinPiBackendInstance, createBackendsPrefsDocument, loadBackendsRegistry, } from "../../../../src/backends/registry";
import { joinNativePath } from "../../../../src/platform/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { runFamilyLifecycle } from "../../../../scripts/system-e2e/familyLifecycle";
import { observeSystemE2EHealth } from "../../../../scripts/system-e2e/healthGate";
import { emitZoteroTestDebug, isSystemE2ERun } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";
/**
 * C20 PI family. Cases drive the plugin's production owners: the conversation
 * coordinator, the workflow admission path (reused from the perf-owned Auto
 * driver) and the real provider transport against the deterministic local
 * OpenAI-compatible endpoint.
 *
 * Scope limit: these run the test bundle's module graph, which is a distinct
 * instance from an installed XPI. The packaged installed-plugin chain must be
 * driven separately through the real shell/public plugin bridge; importing
 * these modules is not that path.
 *
 * PI-04 drives the interactive Skill Run through the production workflow
 * admission and the user-interaction contract: it waits for the `ask_user`
 * batch, submits one confirm answer, and requires the run to resume to a
 * sealed success. PI-05 kills the host once the gateway has persisted a real
 * `tool_call_started` fact, then checks on resume that the hold survived and
 * the interrupted dispatch was not replayed.
 */
function piEndpoint() {
    return String(readDiagnosticsEnv("ZOTERO_TEST_PI_ENDPOINT") || "").trim();
}
function piRoot(prefix) {
    return joinNativePath(getRuntimePersistencePaths().tmpDir, `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
}
const PI_DECLARATION = {
    familyId: "PI",
    owner: "builtin-pi-runtime",
    namespace: ["system-e2e:pi:"],
    ownedState: ["pi-conversation-owner"],
    carryOver: [],
};
async function createConversationAfterConfiguration(args) {
    // A fresh profile has no Pi provider configuration, so the owner cannot be
    // created before the production settings exist.
    await configurePiLocalProviderProfile({
        overlayPath: joinNativePath(args.root, "models.yml"),
        endpoint: args.endpoint,
    });
    const created = await args.coordinator.create();
    const conversationId = "conversationId" in created && created.conversationId
        ? created.conversationId
        : args.coordinator.selectedId;
    assert.isOk(conversationId, "conversation must be created");
    return conversationId;
}
async function removeConversation(coordinator, conversationId) {
    // Production lifecycle requires archived before delete.
    await coordinator.archive(conversationId);
    await coordinator.delete(conversationId);
    const remaining = await coordinator.list({ archived: true });
    return remaining.some((conversation) => conversation.conversationId === conversationId)
        ? "failed"
        : "passed";
}
async function emitPiCase(args) {
    await emitZoteroTestDebug({
        kind: "system-e2e-family-result",
        family: {
            familyId: "PI",
            caseId: args.caseId,
            result: args.result.result,
            publicOutcome: args.result.abort ? undefined : args.publicOutcome,
            failureCode: args.result.abortCode,
            typedEvidence: args.result.abort
                ? []
                : [
                    {
                        kind: args.kind,
                        schemaVersion: "system-e2e-pi.v1",
                        terminalStatus: args.terminalStatus,
                        ...(args.durableTurns !== undefined
                            ? { durableTurns: args.durableTurns }
                            : {}),
                        ...(args.operationId ? { operationId: args.operationId } : {}),
                    },
                ],
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
describe("System E2E Phase 3 builtin Pi runtime", function () {
    this.timeout(240_000);
    before(function () {
        assert.isTrue(isSystemE2ERun(), "runner event sink must be visible");
    });
    it("PI-01 streams durable conversation turns through the coordinator", async function () {
        const endpoint = piEndpoint();
        assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
        const root = piRoot("pi-conversation");
        const coordinator = getPiConversationCoordinator();
        let conversationId = "";
        let terminalStatus = "";
        let durableTurns = 0;
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                conversationId = await createConversationAfterConfiguration({
                    coordinator,
                    root,
                    endpoint,
                });
                const first = await coordinator.send(conversationId, "PI-01 first turn", async () => true);
                const settledFirst = await first.result;
                const second = await coordinator.send(conversationId, "PI-01 second turn", async () => true);
                const settledSecond = await second.result;
                terminalStatus = String(settledSecond.status);
                const owner = await inspectPiOwner({
                    kind: "conversation",
                    ownerId: conversationId,
                });
                durableTurns = owner.entries.filter((entry) => String(entry.kind) === "turn_started").length;
                assert.equal(String(settledFirst.status), "completed");
                assert.equal(terminalStatus, "completed", JSON.stringify(settledSecond));
                assert.isAtLeast(durableTurns, 2, "the second turn must be durable");
            },
            cleanup: () => removeConversation(coordinator, conversationId),
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId: "PI-01",
            result,
            publicOutcome: "pi_conversation_turns_durable",
            kind: "pi-conversation",
            terminalStatus,
            operationId: conversationId,
            durableTurns,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
    it("PI-02 rejects late content after an interrupt", async function () {
        const endpoint = piEndpoint();
        assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
        const root = piRoot("pi-interrupt");
        const coordinator = getPiConversationCoordinator();
        let conversationId = "";
        let terminalStatus = "";
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                conversationId = await createConversationAfterConfiguration({
                    coordinator,
                    root,
                    endpoint,
                });
                const started = await coordinator.send(conversationId, "PI-02 [system-e2e:slow] interrupt before settlement", async () => true);
                coordinator.cancel(conversationId);
                const settled = await started.result;
                terminalStatus = String(settled.status);
                assert.notEqual(terminalStatus, "completed", "an interrupted turn must not settle as completed");
                const owner = await inspectPiOwner({
                    kind: "conversation",
                    ownerId: conversationId,
                });
                assert.equal(owner.status, "valid");
            },
            cleanup: () => removeConversation(coordinator, conversationId),
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId: "PI-02",
            result,
            publicOutcome: "pi_interrupt_rejected_stale",
            kind: "pi-interruption",
            terminalStatus,
            operationId: conversationId,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
    it("PI-03 seals an Auto Skill Run through the workflow admission path", async function () {
        const endpoint = piEndpoint();
        assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
        const root = piRoot("pi-auto");
        const coordinator = getPiSkillRunCoordinator();
        let driver;
        let restoreSkillDir;
        let retainedRequestId = "";
        let terminalStatus = "";
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                await configurePiLocalProviderProfile({
                    overlayPath: joinNativePath(root, "models.yml"),
                    endpoint,
                });
                // Reuses the perf-owned run-owned fixture and public admission driver
                // (workflow -> Built-in Pi backend -> seal/apply/ack). No user skill or
                // env-provided path is involved.
                const fixture = await createPiCapacityFixture({ root });
                const previousSkillDir = String(getPref("skillDir") || "");
                setPref("skillDir", fixture.skillsRoot);
                restoreSkillDir = () => setPref("skillDir", previousSkillDir);
                driver = createPiCapacityAutoDriver({
                    win: Zotero.getMainWindow(),
                    workflowDir: fixture.workflowDir,
                    workflowId: fixture.workflowId,
                    // The owner is verified below, so the driver must leave it in place.
                    retainOwner: true,
                });
                await driver.runOnce();
                // The production workflow owns admission; this only observes the
                // retained owner and never overrides the execution path.
                const runs = await coordinator.list();
                const run = runs[runs.length - 1];
                assert.isOk(run, "the Auto run owner must be retained");
                retainedRequestId = run.requestId;
                const model = await coordinator.readModel(retainedRequestId);
                terminalStatus = String(model.status);
                assert.equal(terminalStatus, "succeeded");
                assert.equal(String(model.outcome?.status), "succeeded");
                assert.equal(String(model.applyReceipt?.status), "succeeded");
                assert.isOk(model.terminalAck);
            },
            cleanup: async () => {
                driver?.dispose();
                restoreSkillDir?.();
                if (!retainedRequestId)
                    return "passed";
                await coordinator.archive(retainedRequestId);
                const cleanup = await coordinator.deleteRun(retainedRequestId);
                return cleanup.status === "deleted" ? "passed" : "failed";
            },
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId: "PI-03",
            result,
            publicOutcome: "pi_auto_skill_run_sealed_applied",
            kind: "pi-auto-skill-run",
            terminalStatus,
            operationId: retainedRequestId,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
    it("PI-05 preserves an unknown-effect hold across a real restart without replay", async function () {
        const caseId = "PI-05";
        if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "PI-05-safe") {
            this.skip();
        }
        const resume = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === caseId;
        const checkpointDir = PathUtils.join(Zotero.DataDirectory.dir, "system-e2e");
        const statePath = PathUtils.join(checkpointDir, "pi-05-state.json");
        if (!resume) {
            const endpoint = piEndpoint();
            assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
            const root = piRoot("pi-restart");
            const coordinator = getPiConversationCoordinator();
            const conversationId = await createConversationAfterConfiguration({
                coordinator,
                root,
                endpoint,
            });
            void coordinator.send(conversationId, "PI-05 [system-e2e:slow] [system-e2e:tool:bash] restart mid-turn", async () => true);
            // A shell command needs the real owner approval before it runs. Approve
            // through the production permission path so the fixture `sleep 60`
            // effect actually starts blocking.
            let callId = "";
            for (let attempt = 0; attempt < 400 && !callId; attempt += 1) {
                const model = await coordinator.readModel(conversationId);
                if (model.status === "waiting_permission" && model.pending[0]) {
                    callId = model.pending[0].call.callId;
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 25));
            }
            assert.isNotEmpty(callId, "the shell call must wait for approval");
            await coordinator.permission(conversationId, callId, "approve");
            // Gate on the canonical production fact: the gateway persists
            // `tool_call_started` before the blocked effect settles, so the kill
            // lands on a real in-flight dispatch.
            let dispatched = false;
            for (let attempt = 0; attempt < 400 && !dispatched; attempt += 1) {
                const owner = await inspectPiOwner({
                    kind: "conversation",
                    ownerId: conversationId,
                });
                dispatched = owner.entries.some((entry) => String(entry.kind) === "tool_call_started");
                if (!dispatched) {
                    await new Promise((resolve) => setTimeout(resolve, 25));
                }
            }
            assert.isTrue(dispatched, "a production tool dispatch must be in flight");
            const processId = Number(Zotero.Utilities.Internal.getProcessID?.() || 0);
            assert.isAbove(processId, 0);
            await IOUtils.makeDirectory(checkpointDir, { ignoreExisting: true });
            await IOUtils.writeUTF8(statePath, JSON.stringify({ conversationId }));
            await emitZoteroTestDebug({
                kind: "system-e2e-owner-restart-request",
                caseId,
                operationId: "system-e2e:pi:05",
                processId,
            });
            throw new Error("system_e2e_owner_restart_not_performed");
        }
        const state = JSON.parse(await IOUtils.readUTF8(statePath));
        const owner = await inspectPiOwner({
            kind: "conversation",
            ownerId: state.conversationId,
        });
        const coordinator = getPiConversationCoordinator();
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                assert.equal(owner.status, "valid");
                // The interrupted turn must hold as an unknown effect, and that hold is
                // the canonical `turn_terminal` status, not the absence of a fact.
                const terminal = owner.entries.find((entry) => String(entry.kind) === "turn_terminal");
                assert.isOk(terminal, "the interrupted turn must be terminal");
                assert.equal(String(terminal.payload.status), "state_unknown", "the interrupted turn must hold as an unknown effect");
                // Exactly one production dispatch survives the restart: the hold was
                // reconciled without replaying the interrupted tool effect.
                assert.equal(owner.entries.filter((entry) => String(entry.kind) === "tool_call_started").length, 1, "the interrupted tool dispatch must not be replayed");
            },
            // This owner holds an unknown effect, so it must survive: deleting it
            // would discard the hold we are verifying. The health gate isolates the
            // retained hold instead of counting it as residual state.
            cleanup: async () => {
                const retained = await coordinator.list({ archived: true });
                return retained.some((candidate) => candidate.conversationId === state.conversationId)
                    ? "passed"
                    : "failed";
            },
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId,
            result,
            publicOutcome: "pi_restart_hold_no_replay",
            kind: "pi-restart-recovery",
            terminalStatus: "unknown",
            operationId: state.conversationId,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
    it("PI-04 waits for a user answer, then continues to a sealed result", async function () {
        const endpoint = piEndpoint();
        assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
        const root = piRoot("pi-interactive");
        const skillsRoot = joinNativePath(root, "skills");
        const skillRoot = joinNativePath(skillsRoot, "pi-interactive-skill");
        await ensureRuntimeDirectoryStrict(joinNativePath(skillRoot, "assets"));
        const skillFiles = {
            "SKILL.md": "# Pi Interactive\n",
            "assets/runner.json": JSON.stringify({
                id: "pi-interactive-skill",
                execution_modes: ["auto", "interactive"],
                schemas: { output: "assets/output.schema.json" },
                entrypoint: {
                    prompts: {
                        common: "Interactive probe. [system-e2e:tool:ask_user] [system-e2e:tool:submit_skill_result]",
                    },
                },
            }),
            "assets/output.schema.json": JSON.stringify({
                type: "object",
                properties: { ok: { type: "boolean" } },
                required: ["ok"],
                additionalProperties: true,
            }),
        };
        for (const [relative, content] of Object.entries(skillFiles)) {
            await writeRuntimeTextFile(joinNativePath(skillRoot, ...relative.split("/")), content);
        }
        const workflowDir = joinNativePath(root, "workflows");
        const workflowRoot = joinNativePath(workflowDir, "pi-interactive");
        await ensureRuntimeDirectoryStrict(workflowRoot);
        await ensureRuntimeDirectoryStrict(joinNativePath(workflowRoot, "hooks"));
        await writeRuntimeTextFile(joinNativePath(workflowRoot, "hooks", "applyResult.js"), "export async function applyResult() {\n  return { ok: true };\n}\n");
        await writeRuntimeTextFile(joinNativePath(workflowRoot, "workflow.json"), JSON.stringify({
            schemaVersion: 2,
            id: "pi-interactive",
            label: "Pi Interactive",
            executionModes: ["interactive"],
            version: "0.1.0",
            provider: "skillrunner",
            trigger: { requiresSelection: false },
            inputs: { member: { kind: "selection" }, grouping: { mode: "all" } },
            validateSelection: { select: { policy: "selection" }, filters: [] },
            request: {
                kind: "skillrunner.job.v1",
                create: {
                    skill_id: "pi-interactive-skill",
                    mode: "interactive",
                    skill_source: "installed",
                },
            },
            execution: { feedback: { showNotifications: false } },
            result: { fetch: { type: "result" } },
            hooks: { applyResult: "hooks/applyResult.js" },
        }));
        const previousSkillDir = String(getPref("skillDir") || "");
        setPref("skillDir", skillsRoot);
        const previousBackends = String(getPref("backendsConfigJson") || "");
        const configured = await loadBackendsRegistry();
        if (configured.fatalError ||
            !configured.backends.some((entry) => entry.id === BUILTIN_PI_BACKEND_ID)) {
            setPref("backendsConfigJson", JSON.stringify(createBackendsPrefsDocument([builtinPiBackendInstance()])));
        }
        await configurePiLocalProviderProfile({
            overlayPath: joinNativePath(root, "models.yml"),
            endpoint,
        });
        const coordinator = getPiSkillRunCoordinator();
        let interactiveRequestId = "";
        let waitingStatus = "";
        let terminalStatus = "";
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                const before = new Set((await coordinator.list()).map((run) => run.requestId));
                const loaded = await loadWorkflowManifests(workflowDir);
                const workflow = loaded.workflows.find((entry) => entry.manifest.id === "pi-interactive");
                assert.isOk(workflow, "interactive workflow must load");
                // Interactive admission does not resolve until the run is answered, so
                // it is started without awaiting and observed through the owner; the
                // completion is awaited only after the answer is submitted.
                const completion = executeWorkflowFromCurrentSelection({
                    win: Zotero.getMainWindow(),
                    workflow: workflow,
                    executionOptionsOverride: { backendId: BUILTIN_PI_BACKEND_ID },
                }).catch(() => undefined);
                let requestId = "";
                for (let attempt = 0; attempt < 240 && !requestId; attempt += 1) {
                    requestId =
                        (await coordinator.list()).find((run) => !before.has(run.requestId))
                            ?.requestId || "";
                    if (!requestId)
                        await new Promise((resolve) => setTimeout(resolve, 250));
                }
                assert.isNotEmpty(requestId, "interactive run must be admitted");
                interactiveRequestId = requestId;
                let batch;
                for (let attempt = 0; attempt < 480 && !batch; attempt += 1) {
                    const model = await coordinator.readModel(requestId);
                    if (model.interactionBatch?.status === "collecting") {
                        batch = model.interactionBatch;
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }
                assert.isOk(batch, "interactive run must wait for a user answer");
                waitingStatus = "waiting_user";
                const questionId = batch.questions[0].questionId;
                await coordinator.submitInteraction(requestId, {
                    batchId: batch.batchId,
                    baseRevision: batch.revision,
                    mutationId: "pi-04-submit",
                    answers: { [questionId]: { kind: "confirm", confirmed: true } },
                });
                for (let attempt = 0; attempt < 480; attempt += 1) {
                    const model = await coordinator.readModel(requestId);
                    if (["succeeded", "failed", "canceled"].includes(model.status)) {
                        terminalStatus = String(model.status);
                        break;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }
                assert.equal(terminalStatus, "succeeded");
                await completion;
            },
            cleanup: async () => {
                setPref("skillDir", previousSkillDir);
                setPref("backendsConfigJson", previousBackends);
                if (!interactiveRequestId)
                    return "passed";
                const runs = await coordinator.list();
                if (runs.some((run) => run.requestId === interactiveRequestId)) {
                    await coordinator.archive(interactiveRequestId);
                }
                const cleanup = await coordinator.deleteRun(interactiveRequestId);
                return cleanup.status === "deleted" ? "passed" : "failed";
            },
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId: "PI-04",
            result,
            publicOutcome: "pi_interactive_wait_answered",
            kind: "pi-interactive-skill-run",
            terminalStatus: terminalStatus || waitingStatus,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
    it("PI-05-safe continues a checkpointed Auto run after a real restart", async function () {
        const caseId = "PI-05-safe";
        if (readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === "PI-05") {
            this.skip();
        }
        const resume = readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_RESUME_CASE") === caseId;
        const checkpointDir = PathUtils.join(Zotero.DataDirectory.dir, "system-e2e");
        const statePath = PathUtils.join(checkpointDir, "pi-05-safe-state.json");
        const coordinator = getPiSkillRunCoordinator();
        if (!resume) {
            const endpoint = piEndpoint();
            assert.isNotEmpty(endpoint, "deterministic local provider endpoint");
            const root = piRoot("pi-safe");
            const fixture = await createPiCapacityFixture({ root });
            setPref("skillDir", fixture.skillsRoot);
            const previousBackends = String(getPref("backendsConfigJson") || "");
            const configured = await loadBackendsRegistry();
            if (configured.fatalError ||
                !configured.backends.some((entry) => entry.id === BUILTIN_PI_BACKEND_ID)) {
                setPref("backendsConfigJson", JSON.stringify(createBackendsPrefsDocument([builtinPiBackendInstance()])));
            }
            const previousSkillDir = fixture.skillsRoot;
            await configurePiLocalProviderProfile({
                overlayPath: joinNativePath(root, "models.yml"),
                endpoint,
            });
            const before = new Set((await coordinator.list()).map((run) => run.requestId));
            const loaded = await loadWorkflowManifests(fixture.workflowDir);
            const workflow = loaded.workflows.find((entry) => entry.manifest.id === fixture.workflowId);
            assert.isOk(workflow, "the Auto workflow must load");
            void executeWorkflowFromCurrentSelection({
                win: Zotero.getMainWindow(),
                workflow: workflow,
                executionOptionsOverride: { backendId: BUILTIN_PI_BACKEND_ID },
            }).catch(() => undefined);
            let requestId = "";
            for (let attempt = 0; attempt < 240 && !requestId; attempt += 1) {
                requestId =
                    (await coordinator.list()).find((run) => !before.has(run.requestId))
                        ?.requestId || "";
                if (!requestId)
                    await new Promise((resolve) => setTimeout(resolve, 250));
            }
            assert.isNotEmpty(requestId, "the Auto run must be admitted");
            // Wait for the production durable checkpoint that makes the run safely
            // resumable; no owner is fabricated here.
            let checkpointed = false;
            for (let attempt = 0; attempt < 480 && !checkpointed; attempt += 1) {
                const owner = await inspectPiOwner({
                    kind: "skill_run",
                    ownerId: requestId,
                });
                checkpointed = owner.entries.some((entry) => String(entry.kind) === "execution_checkpoint");
                if (!checkpointed)
                    await new Promise((resolve) => setTimeout(resolve, 250));
            }
            assert.isTrue(checkpointed, "the Auto run must reach a durable checkpoint before restart");
            const processId = Number(Zotero.Utilities.Internal.getProcessID?.() || 0);
            assert.isAbove(processId, 0);
            await IOUtils.makeDirectory(checkpointDir, { ignoreExisting: true });
            await IOUtils.writeUTF8(statePath, JSON.stringify({ requestId, previousSkillDir, previousBackends }));
            await emitZoteroTestDebug({
                kind: "system-e2e-owner-restart-request",
                caseId,
                operationId: "system-e2e:pi:05-safe",
                processId,
            });
            throw new Error("system_e2e_owner_restart_not_performed");
        }
        const state = JSON.parse(await IOUtils.readUTF8(statePath));
        let terminalStatus = "";
        for (let attempt = 0; attempt < 1200; attempt += 1) {
            const model = await coordinator.readModel(state.requestId);
            if (["succeeded", "failed", "canceled"].includes(model.status)) {
                terminalStatus = String(model.status);
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        const result = await runFamilyLifecycle({
            declaration: PI_DECLARATION,
            execute: async () => {
                assert.equal(terminalStatus, "succeeded", "a checkpointed Auto run must resume to success");
                const model = await coordinator.readModel(state.requestId);
                assert.equal(String(model.applyReceipt?.status), "succeeded");
                assert.isOk(model.terminalAck);
            },
            cleanup: async () => {
                setPref("skillDir", state.previousSkillDir);
                setPref("backendsConfigJson", state.previousBackends);
                const cleanup = await coordinator
                    .deleteRun(state.requestId)
                    .catch(() => ({ status: "cleanup_pending" }));
                return cleanup.status === "deleted" ? "passed" : "failed";
            },
            healthGate: () => observeSystemE2EHealth(),
        });
        await emitPiCase({
            caseId,
            result,
            publicOutcome: "pi_safe_skill_run_resumed",
            kind: "pi-restart-recovery",
            terminalStatus,
            operationId: state.requestId,
        });
        assert.isFalse(result.abort, result.abortCode);
        assert.equal(result.result, "passed");
    });
});

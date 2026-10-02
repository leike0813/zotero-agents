import { BUILTIN_PI_BACKEND_TYPE } from "../../config/defaults";
function summarizeDirectOutcomes(outcomes) {
    return Object.freeze({
        submissionId: "workflow-submission-direct",
        total: outcomes.length,
        succeeded: outcomes.filter((entry) => entry.status === "succeeded").length,
        failed: outcomes.filter((entry) => entry.status === "failed").length,
        skipped: outcomes.filter((entry) => entry.status === "skipped").length,
    });
}
export async function executePreparedWorkflowUnit(args, deps) {
    const buildResult = await deps.buildPreparedUnit({
        prepared: args.prepared,
        unit: args.unit,
    });
    if (buildResult.status === "skipped") {
        return {
            outcome: {
                status: "skipped",
                reasonCode: "workflow-unit-preflight-skipped",
            },
        };
    }
    const runState = deps.runPreparedUnit({
        prepared: buildResult.built,
        submissionLineage: args.submissionContext,
    });
    await runState.terminalPromise;
    if (args.submissionContext) {
        args.submissionContext.slot.cancelPendingResumption();
        const admitted = await args.submissionContext.slot.ensureSlot("host-apply");
        if (!admitted) {
            return {
                outcome: {
                    status: "skipped",
                    reasonCode: "workflow-unit-apply-admission-canceled",
                },
                runState,
                failureReason: "Host apply admission was canceled before execution.",
            };
        }
    }
    const applySummary = await deps.applyPreparedUnit({
        runState,
        messageFormatter: args.messageFormatter,
    });
    const outcome = applySummary.failed > 0
        ? {
            status: "failed",
            reasonCode: "workflow-unit-execution-or-apply-failed",
        }
        : applySummary.pending > 0
            ? {
                status: "failed",
                reasonCode: "workflow-unit-terminal-result-pending",
            }
            : { status: "succeeded" };
    return { outcome, runState, applySummary };
}
export async function submitPreparedWorkflowUnits(args, deps) {
    const executionResults = new Map();
    const executeUnit = async (unit, submissionContext) => {
        let result;
        try {
            result = await deps.executePreparedUnit({
                prepared: args.prepared,
                unit,
                messageFormatter: args.messageFormatter,
                submissionContext,
            });
        }
        catch (error) {
            result = {
                outcome: {
                    status: "failed",
                    reasonCode: "workflow-unit-build-or-execution-failed",
                },
                failureReason: error instanceof Error ? error.message : String(error || "unknown"),
            };
            deps.appendRuntimeLog({
                level: "error",
                scope: "workflow-trigger",
                workflowId: args.prepared.workflow.manifest.id,
                stage: "workflow-unit-execution-failed",
                message: "workflow execution unit failed",
                details: {
                    unitId: unit.unitId,
                    taskName: unit.taskName,
                    reason: result.failureReason,
                },
                error,
            });
        }
        executionResults.set(unit.unitId, result);
        return result.outcome;
    };
    const initialOutcomes = Array.from({ length: args.skippedByGuard }, () => ({
        status: "skipped",
        reasonCode: "workflow-unit-filtered-or-duplicate",
    }));
    const backendType = String(args.prepared.executionContext.backend.type || "").trim();
    if (backendType === BUILTIN_PI_BACKEND_TYPE &&
        deps.submissionQueue.isPiAdmissionBlocked) {
        throw new Error(`builtin-pi admission is blocked while durable reservations are restored`);
    }
    if (backendType === "acp" ||
        backendType === "skillrunner" ||
        backendType === BUILTIN_PI_BACKEND_TYPE) {
        const providerOptions = args.prepared.executionContext.providerOptions || {};
        const handle = deps.submissionQueue.enqueueSubmission({
            backend: {
                backendType,
                backendId: args.prepared.executionContext.backend.id,
            },
            workflow: {
                workflowId: args.prepared.workflow.manifest.id,
                workflowLabel: args.workflowLabel,
            },
            units: args.units.map((unit) => ({
                unit,
                display: {
                    unitId: unit.unitId,
                    order: unit.order,
                    taskName: unit.taskName,
                    inputUnitIdentity: unit.inputUnitIdentity,
                    memberIdentities: unit.memberIdentities,
                    memberCount: unit.memberCount,
                },
            })),
            maxConcurrency: args.prepared.executionOptions.hostOptions?.queue?.maxConcurrency,
            presentation: backendType === "acp"
                ? {
                    provider: String(providerOptions.acpModelProvider || "").trim(),
                    model: String(providerOptions.acpModelId || "").trim(),
                }
                : backendType === BUILTIN_PI_BACKEND_TYPE
                    ? {
                        provider: String(providerOptions.provider || BUILTIN_PI_BACKEND_TYPE).trim(),
                        model: String(providerOptions.model || "").trim(),
                    }
                    : {
                        provider: String(providerOptions.provider_id || providerOptions.engine || "").trim(),
                        model: String(providerOptions.model || "").trim(),
                    },
            initialOutcomes,
            onTerminal: args.onTerminal,
            executeUnit,
        });
        return Object.freeze({
            admission: "host-queue",
            submissionId: handle.submissionId,
            total: args.units.length + args.skippedByGuard,
            queued: args.units.length,
            skipped: args.skippedByGuard,
            executionResults,
            completion: handle.completion,
        });
    }
    const outcomes = [...initialOutcomes];
    if (backendType === "pass-through") {
        for (const unit of args.units) {
            outcomes.push(await executeUnit(unit));
        }
    }
    else {
        outcomes.push(...(await Promise.all(args.units.map((unit) => executeUnit(unit)))));
    }
    const summary = summarizeDirectOutcomes(outcomes);
    return Object.freeze({
        admission: "direct",
        total: summary.total,
        queued: 0,
        skipped: args.skippedByGuard,
        executionResults,
        completion: Promise.resolve(summary),
    });
}

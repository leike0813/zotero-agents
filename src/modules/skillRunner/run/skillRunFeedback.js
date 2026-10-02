import { getBaseName, joinPath } from "../../../utils/path";
import { getPref } from "../../../utils/prefs";
import { SKILL_RUN_FEEDBACK_ASSET_ID, WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK, createProductStorageApi, } from "../../workflow/catalog/workflowProductStore";
export const SKILL_RUN_FEEDBACK_RUNTIME_OPTION = "collect_skill_run_feedback";
export const SKILL_RUN_FEEDBACK_PREF_KEY = "collectSkillRunFeedbackEnabled";
export const SKILL_RUN_FEEDBACK_FILENAME = "_skill_run_feedback.md";
function normalizeString(value) {
    return String(value || "").trim();
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function normalizeEntryPath(value) {
    return normalizeString(value)
        .replace(/\\/g, "/")
        .replace(/^\/+/g, "")
        .split("/")
        .filter((part) => part && part !== "." && part !== "..")
        .join("/");
}
function getDirName(pathRaw) {
    const normalized = normalizeString(pathRaw).replace(/\\/g, "/");
    const index = normalized.lastIndexOf("/");
    return index > 0 ? normalized.slice(0, index) : "";
}
function getSiblingPath(pathRaw, filename) {
    const dir = getDirName(pathRaw);
    return dir ? joinPath(dir, filename) : "";
}
function getSiblingEntryPath(pathRaw, filename) {
    const normalized = normalizeEntryPath(pathRaw);
    const index = normalized.lastIndexOf("/");
    return index > 0 ? `${normalized.slice(0, index)}/${filename}` : "";
}
function entryPathFromResultMarker(pathRaw, filename) {
    const normalized = normalizeString(pathRaw).replace(/\\/g, "/");
    const lowered = normalized.toLowerCase();
    const marker = "/result/";
    const index = lowered.lastIndexOf(marker);
    if (index < 0) {
        return "";
    }
    const resultRelative = normalizeEntryPath(normalized.slice(index + 1));
    return getSiblingEntryPath(resultRelative, filename);
}
function addCandidate(candidates, seen, value) {
    const normalized = normalizeString(value);
    if (!normalized) {
        return;
    }
    const key = normalized.replace(/\\/g, "/").toLowerCase();
    if (seen.has(key)) {
        return;
    }
    seen.add(key);
    candidates.push(normalized);
}
function safeSkillNamespace(skillId) {
    return (skillId.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "skill");
}
function parseSequenceFinalStep(request) {
    if (!isRecord(request)) {
        return null;
    }
    if (normalizeString(request.kind) !== "skillrunner.sequence.v1") {
        return null;
    }
    const finalStepId = normalizeString(request.final_step_id);
    const steps = Array.isArray(request.steps) ? request.steps : [];
    const step = steps.find((entry) => isRecord(entry) && normalizeString(entry.id) === finalStepId);
    if (!isRecord(step)) {
        return null;
    }
    const skillId = normalizeString(step.skill_id);
    if (!skillId) {
        return null;
    }
    return {
        id: finalStepId,
        skillId,
    };
}
function stableHash(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}
function getNestedString(source, path) {
    let current = source;
    for (const part of path) {
        if (!isRecord(current)) {
            return "";
        }
        current = current[part];
    }
    return normalizeString(current);
}
function resolveRunResultString(runResult, camelKey, snakeKey) {
    return (normalizeString(runResult[camelKey]) ||
        normalizeString(runResult[snakeKey]) ||
        getNestedString(runResult.responseJson, [String(camelKey)]) ||
        getNestedString(runResult.responseJson, [String(snakeKey)]));
}
function resolveBackendType(runResult) {
    return (resolveRunResultString(runResult, "backendType", "backend_type") ||
        getNestedString(runResult.responseJson, ["provider"])).toLowerCase();
}
function resolveFetchType(runResult) {
    return resolveRunResultString(runResult, "fetchType", "fetch_type").toLowerCase();
}
function resolveSkillId(request, sequenceStep) {
    const requestRecord = isRecord(request) ? request : {};
    return (normalizeString(requestRecord.skill_id) ||
        normalizeString(parseSequenceFinalStep(request)?.skillId) ||
        normalizeString(sequenceStep?.skillId));
}
function resolveSequenceStepId(request, sequenceStep) {
    return (normalizeString(sequenceStep?.id) ||
        normalizeString(parseSequenceFinalStep(request)?.id));
}
export function isSkillRunFeedbackCollectionEnabled() {
    try {
        return getPref(SKILL_RUN_FEEDBACK_PREF_KEY) === true;
    }
    catch {
        return false;
    }
}
export function requestCollectsSkillRunFeedback(request) {
    const record = isRecord(request) ? request : {};
    return (isRecord(record.runtime_options) &&
        record.runtime_options[SKILL_RUN_FEEDBACK_RUNTIME_OPTION] === true);
}
function buildFeedbackCandidates(args) {
    const candidates = [];
    const seen = new Set();
    const resultJsonPath = normalizeString(args.resultContext.resultJsonPath) ||
        resolveRunResultString(args.runResult, "resultJsonPath", "result_json_path");
    const workspaceDir = normalizeString(args.resultContext.workspaceDir) ||
        resolveRunResultString(args.runResult, "workspaceDir", "workspace_dir");
    const resultJsonSource = args.resultContext.resultJsonSource || {};
    const resultEntry = isRecord(resultJsonSource)
        ? normalizeString(resultJsonSource.entryPath)
        : "";
    addCandidate(candidates, seen, getSiblingPath(resultJsonPath, SKILL_RUN_FEEDBACK_FILENAME));
    addCandidate(candidates, seen, entryPathFromResultMarker(resultJsonPath, SKILL_RUN_FEEDBACK_FILENAME));
    addCandidate(candidates, seen, getSiblingEntryPath(resultEntry, SKILL_RUN_FEEDBACK_FILENAME));
    if (workspaceDir && resultJsonPath) {
        const normalizedWorkspace = workspaceDir.replace(/\\/g, "/").toLowerCase();
        const normalizedResultJson = resultJsonPath.replace(/\\/g, "/");
        if (normalizedResultJson.toLowerCase().startsWith(normalizedWorkspace)) {
            addCandidate(candidates, seen, getSiblingEntryPath(normalizedResultJson.slice(workspaceDir.length), SKILL_RUN_FEEDBACK_FILENAME));
        }
    }
    if (args.skillId) {
        addCandidate(candidates, seen, `result/${safeSkillNamespace(args.skillId)}.1/${SKILL_RUN_FEEDBACK_FILENAME}`);
    }
    addCandidate(candidates, seen, `result/${SKILL_RUN_FEEDBACK_FILENAME}`);
    return candidates;
}
async function resolveFeedbackArtifact(args) {
    let lastError = "";
    for (const candidate of args.candidates) {
        try {
            const resolved = await args.resultContext.resolveArtifact({
                fieldName: SKILL_RUN_FEEDBACK_FILENAME,
                rawPath: candidate,
                fallbackPath: candidate,
            });
            if (!resolved.text.trim()) {
                return { kind: "empty", candidate, resolved };
            }
            return { kind: "found", candidate, resolved };
        }
        catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }
    }
    return { kind: "missing", lastError };
}
export async function collectSkillRunFeedbackSidecar(args) {
    if (!requestCollectsSkillRunFeedback(args.request)) {
        return { collected: false, reason: "disabled" };
    }
    const workflowId = normalizeString(args.workflow.manifest?.id);
    const requestId = resolveRunResultString(args.runResult, "requestId", "request_id") ||
        "request";
    const backendType = resolveBackendType(args.runResult);
    const fetchType = resolveFetchType(args.runResult);
    if (backendType === "skillrunner" && fetchType !== "bundle") {
        args.appendRuntimeLog?.({
            level: "debug",
            scope: "job",
            workflowId,
            requestId,
            jobId: args.jobId,
            stage: "skill-run-feedback-skillrunner-non-bundle",
            message: "skill run feedback collection skipped for SkillRunner non-bundle fetch",
            details: {
                fetchType: fetchType || "(empty)",
            },
        });
        return { collected: false, reason: "skillrunner-non-bundle" };
    }
    const skillId = resolveSkillId(args.request, args.sequenceStep);
    if (!skillId) {
        args.appendRuntimeLog?.({
            level: "warn",
            scope: "job",
            workflowId,
            requestId,
            jobId: args.jobId,
            stage: "skill-run-feedback-skill-missing",
            message: "skill run feedback collection skipped because skillId is unavailable",
        });
        return { collected: false, reason: "skill-missing" };
    }
    try {
        const candidates = buildFeedbackCandidates({
            resultContext: args.resultContext,
            runResult: args.runResult,
            skillId,
        });
        const resolved = await resolveFeedbackArtifact({
            resultContext: args.resultContext,
            candidates,
        });
        if (resolved.kind !== "found") {
            args.appendRuntimeLog?.({
                level: "debug",
                scope: "job",
                workflowId,
                requestId,
                jobId: args.jobId,
                stage: resolved.kind === "empty"
                    ? "skill-run-feedback-empty"
                    : "skill-run-feedback-missing",
                message: resolved.kind === "empty"
                    ? "skill run feedback sidecar is empty"
                    : "skill run feedback sidecar not found",
                details: {
                    skillId,
                    candidates,
                    error: resolved.kind === "missing" ? resolved.lastError : undefined,
                },
            });
            return {
                collected: false,
                reason: resolved.kind,
            };
        }
        const productStorage = createProductStorageApi({
            manifest: args.workflow.manifest,
            resultContext: args.resultContext,
            request: args.request,
            runResult: args.runResult,
        });
        const sourcePath = resolved.resolved.sourcePath ||
            resolved.resolved.entryPath ||
            resolved.candidate;
        const product = await productStorage.registerProduct({
            productKey: `skill-run-feedback:${requestId}:${skillId}`,
            kind: WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
            title: `Skill feedback: ${skillId}`,
            assets: [
                {
                    assetId: SKILL_RUN_FEEDBACK_ASSET_ID,
                    label: getBaseName(SKILL_RUN_FEEDBACK_FILENAME),
                    rawPath: sourcePath,
                    fallbackPath: resolved.resolved.entryPath,
                    productAssetPath: SKILL_RUN_FEEDBACK_FILENAME,
                    contentType: "text/markdown",
                },
            ],
            metadata: {
                workflowId,
                workflowLabel: normalizeString(args.workflow.manifest?.label),
                skillId,
                backendId: resolveRunResultString(args.runResult, "backendId", "backend_id"),
                backendType,
                requestId,
                runId: resolveRunResultString(args.runResult, "runId", "run_id"),
                jobId: normalizeString(args.jobId),
                sequenceStepId: resolveSequenceStepId(args.request, args.sequenceStep),
                sourcePath,
                collectedAt: new Date().toISOString(),
                contentHash: stableHash(resolved.resolved.text),
                applySucceeded: true,
            },
        });
        args.appendRuntimeLog?.({
            level: "info",
            scope: "job",
            workflowId,
            requestId,
            jobId: args.jobId,
            stage: "skill-run-feedback-collected",
            message: "skill run feedback sidecar collected",
            details: {
                productId: product.productId,
                skillId,
                sourcePath,
            },
        });
        return { collected: true, product };
    }
    catch (error) {
        args.appendRuntimeLog?.({
            level: "warn",
            scope: "job",
            workflowId,
            requestId,
            jobId: args.jobId,
            stage: "skill-run-feedback-collection-failed",
            message: "skill run feedback collection failed without failing apply",
            details: {
                skillId,
                error: error instanceof Error ? error.message : String(error),
            },
        });
        return { collected: false, reason: "error" };
    }
}

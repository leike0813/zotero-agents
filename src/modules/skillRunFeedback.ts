import { getBaseName, joinPath } from "../utils/path";
import { getPref } from "../utils/prefs";
import {
  SKILL_RUN_FEEDBACK_ASSET_ID,
  WORKFLOW_PRODUCT_KIND_SKILL_RUN_FEEDBACK,
  createProductStorageApi,
} from "./workflowProductStore";
import type { BundleReader } from "./workflowExecution/bundleIO";
import type { WorkflowResultContext } from "./workflowExecution/resultContext";
import type { appendRuntimeLog } from "./runtimeLogManager";

export const SKILL_RUN_FEEDBACK_RUNTIME_OPTION = "collect_skill_run_feedback";
export const SKILL_RUN_FEEDBACK_PREF_KEY = "collectSkillRunFeedbackEnabled";
export const SKILL_RUN_FEEDBACK_FILENAME = "_skill_run_feedback.md";

type RequestLike = {
  kind?: string;
  skill_id?: string;
  runtime_options?: Record<string, unknown>;
};

type RunResultLike = {
  requestId?: string;
  request_id?: string;
  backendId?: string;
  backend_id?: string;
  backendType?: string;
  backend_type?: string;
  runId?: string;
  run_id?: string;
  resultJsonPath?: string;
  result_json_path?: string;
  workspaceDir?: string;
  workspace_dir?: string;
  fetchType?: string;
  fetch_type?: string;
  responseJson?: unknown;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeEntryPath(value: unknown) {
  return normalizeString(value)
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function getDirName(pathRaw: unknown) {
  const normalized = normalizeString(pathRaw).replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : "";
}

function getSiblingPath(pathRaw: unknown, filename: string) {
  const dir = getDirName(pathRaw);
  return dir ? joinPath(dir, filename) : "";
}

function getSiblingEntryPath(pathRaw: unknown, filename: string) {
  const normalized = normalizeEntryPath(pathRaw);
  const index = normalized.lastIndexOf("/");
  return index > 0 ? `${normalized.slice(0, index)}/${filename}` : "";
}

function entryPathFromResultMarker(pathRaw: unknown, filename: string) {
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

function addCandidate(candidates: string[], seen: Set<string>, value: unknown) {
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

function safeSkillNamespace(skillId: string) {
  return (
    skillId.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "skill"
  );
}

function parseSequenceFinalStep(request: unknown) {
  if (!isRecord(request)) {
    return null;
  }
  if (normalizeString(request.kind) !== "skillrunner.sequence.v1") {
    return null;
  }
  const finalStepId = normalizeString(request.final_step_id);
  const steps = Array.isArray(request.steps) ? request.steps : [];
  const step = steps.find(
    (entry) => isRecord(entry) && normalizeString(entry.id) === finalStepId,
  );
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

function stableHash(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function getNestedString(source: unknown, path: string[]) {
  let current = source as any;
  for (const part of path) {
    if (!isRecord(current)) {
      return "";
    }
    current = current[part];
  }
  return normalizeString(current);
}

function resolveRunResultString(
  runResult: RunResultLike,
  camelKey: keyof RunResultLike,
  snakeKey: keyof RunResultLike,
) {
  return (
    normalizeString(runResult[camelKey]) ||
    normalizeString(runResult[snakeKey]) ||
    getNestedString(runResult.responseJson, [String(camelKey)]) ||
    getNestedString(runResult.responseJson, [String(snakeKey)])
  );
}

function resolveBackendType(runResult: RunResultLike) {
  return (
    resolveRunResultString(runResult, "backendType", "backend_type") ||
    getNestedString(runResult.responseJson, ["provider"])
  ).toLowerCase();
}

function resolveFetchType(runResult: RunResultLike) {
  return resolveRunResultString(
    runResult,
    "fetchType",
    "fetch_type",
  ).toLowerCase();
}

function resolveSkillId(request: unknown, sequenceStep?: { skillId?: string }) {
  const requestRecord = isRecord(request) ? request : {};
  return (
    normalizeString((requestRecord as RequestLike).skill_id) ||
    normalizeString(parseSequenceFinalStep(request)?.skillId) ||
    normalizeString(sequenceStep?.skillId)
  );
}

function resolveSequenceStepId(
  request: unknown,
  sequenceStep?: { id?: string },
) {
  return (
    normalizeString(sequenceStep?.id) ||
    normalizeString(parseSequenceFinalStep(request)?.id)
  );
}

export function isSkillRunFeedbackCollectionEnabled() {
  try {
    return getPref(SKILL_RUN_FEEDBACK_PREF_KEY as any) === true;
  } catch {
    return false;
  }
}

export function requestCollectsSkillRunFeedback(request: unknown) {
  const record = isRecord(request) ? (request as RequestLike) : {};
  return (
    isRecord(record.runtime_options) &&
    record.runtime_options[SKILL_RUN_FEEDBACK_RUNTIME_OPTION] === true
  );
}

function buildFeedbackCandidates(args: {
  resultContext: WorkflowResultContext;
  runResult: RunResultLike;
  skillId: string;
}) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const resultJsonPath =
    normalizeString(args.resultContext.resultJsonPath) ||
    resolveRunResultString(
      args.runResult,
      "resultJsonPath",
      "result_json_path",
    );
  const workspaceDir =
    normalizeString(args.resultContext.workspaceDir) ||
    resolveRunResultString(args.runResult, "workspaceDir", "workspace_dir");
  const resultJsonSource = args.resultContext.resultJsonSource || {};
  const resultEntry = isRecord(resultJsonSource)
    ? normalizeString(resultJsonSource.entryPath)
    : "";

  addCandidate(
    candidates,
    seen,
    getSiblingPath(resultJsonPath, SKILL_RUN_FEEDBACK_FILENAME),
  );
  addCandidate(
    candidates,
    seen,
    entryPathFromResultMarker(resultJsonPath, SKILL_RUN_FEEDBACK_FILENAME),
  );
  addCandidate(
    candidates,
    seen,
    getSiblingEntryPath(resultEntry, SKILL_RUN_FEEDBACK_FILENAME),
  );
  if (workspaceDir && resultJsonPath) {
    const normalizedWorkspace = workspaceDir.replace(/\\/g, "/").toLowerCase();
    const normalizedResultJson = resultJsonPath.replace(/\\/g, "/");
    if (normalizedResultJson.toLowerCase().startsWith(normalizedWorkspace)) {
      addCandidate(
        candidates,
        seen,
        getSiblingEntryPath(
          normalizedResultJson.slice(workspaceDir.length),
          SKILL_RUN_FEEDBACK_FILENAME,
        ),
      );
    }
  }
  if (args.skillId) {
    addCandidate(
      candidates,
      seen,
      `result/${safeSkillNamespace(args.skillId)}.1/${SKILL_RUN_FEEDBACK_FILENAME}`,
    );
  }
  addCandidate(candidates, seen, `result/${SKILL_RUN_FEEDBACK_FILENAME}`);
  return candidates;
}

async function resolveFeedbackArtifact(args: {
  resultContext: WorkflowResultContext;
  candidates: string[];
}) {
  let lastError = "";
  for (const candidate of args.candidates) {
    try {
      const resolved = await args.resultContext.resolveArtifact({
        fieldName: SKILL_RUN_FEEDBACK_FILENAME,
        rawPath: candidate,
        fallbackPath: candidate,
      });
      if (!resolved.text.trim()) {
        return { kind: "empty" as const, candidate, resolved };
      }
      return { kind: "found" as const, candidate, resolved };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { kind: "missing" as const, lastError };
}

export async function collectSkillRunFeedbackSidecar(args: {
  workflow: { manifest?: { id?: string; label?: string } };
  request: unknown;
  runResult: RunResultLike;
  resultContext: WorkflowResultContext;
  bundleReader: BundleReader;
  jobId?: string;
  sequenceStep?: { id?: string; index?: number; skillId?: string };
  appendRuntimeLog?: typeof appendRuntimeLog;
}) {
  if (!requestCollectsSkillRunFeedback(args.request)) {
    return { collected: false, reason: "disabled" as const };
  }
  const workflowId = normalizeString(args.workflow.manifest?.id);
  const requestId =
    resolveRunResultString(args.runResult, "requestId", "request_id") ||
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
      message:
        "skill run feedback collection skipped for SkillRunner non-bundle fetch",
      details: {
        fetchType: fetchType || "(empty)",
      },
    });
    return { collected: false, reason: "skillrunner-non-bundle" as const };
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
      message:
        "skill run feedback collection skipped because skillId is unavailable",
    });
    return { collected: false, reason: "skill-missing" as const };
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
        stage:
          resolved.kind === "empty"
            ? "skill-run-feedback-empty"
            : "skill-run-feedback-missing",
        message:
          resolved.kind === "empty"
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
    const sourcePath =
      resolved.resolved.sourcePath ||
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
        backendId: resolveRunResultString(
          args.runResult,
          "backendId",
          "backend_id",
        ),
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
  } catch (error) {
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
    return { collected: false, reason: "error" as const };
  }
}

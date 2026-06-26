import { joinPath, normalizeNativeLocalPath } from "../../utils/path";
import { readRuntimeTextFile, runtimePathExists } from "../runtimePersistence";
import type { BundleReader } from "./bundleIO";
import { canonicalizeWorkflowResultJson } from "./resultEnvelope";

type WorkflowResultManifestLike = {
  result?: {
    expects?: {
      result_json?: string;
    };
  };
};

export type WorkflowResultJsonSource = {
  kind: "run-result" | "local-path" | "bundle-entry" | "unavailable";
  path?: string;
  entryPath?: string;
};

export type WorkflowResultResolutionWarning = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type WorkflowResolvedArtifact = {
  text: string;
  entryPath: string;
  sourceKind: "local-path" | "bundle-entry";
  sourcePath?: string;
  candidates: string[];
};

export type WorkflowResultContext = {
  resultJson: unknown;
  resultJsonSource: WorkflowResultJsonSource;
  workspaceDir?: string;
  resultJsonPath?: string;
  bundleReader: BundleReader;
  warnings: WorkflowResultResolutionWarning[];
  errors: WorkflowResultResolutionWarning[];
  resolveArtifact: (args: {
    fieldName?: string;
    rawPath?: unknown;
    fallbackPath?: string;
  }) => Promise<WorkflowResolvedArtifact>;
  readArtifactText: (args: {
    fieldName?: string;
    rawPath?: unknown;
    fallbackPath?: string;
  }) => Promise<WorkflowResolvedArtifact>;
};

type RunResultLike = {
  resultJson?: unknown;
  responseJson?: unknown;
  resultJsonPath?: string;
  workspaceDir?: string;
  bundleDir?: string;
  requestId?: string;
  resultArtifactBasePath?: string;
};

type ArtifactCandidate =
  | {
      kind: "local-path";
      path: string;
      label: string;
    }
  | {
      kind: "bundle-entry";
      entryPath: string;
      label: string;
    };

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizePathText(value: unknown) {
  return normalizeString(value)
    .replace(/^file:\/\/+/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
}

function normalizeLocalPathText(value: unknown) {
  return normalizeString(value).replace(/^file:\/\/+/, "");
}

function isAbsolutePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/");
}

function normalizeEntryPath(value: string) {
  return normalizePathText(value)
    .replace(/^\/+/g, "")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

function getNestedString(source: unknown, path: string[]) {
  let current = source as any;
  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return "";
    }
    current = current[segment];
  }
  return normalizeString(current);
}

function resolveWorkspaceDir(runResult: RunResultLike | undefined) {
  return (
    normalizeString(runResult?.workspaceDir) ||
    getNestedString(runResult?.responseJson, ["workspaceDir"]) ||
    getNestedString(runResult?.responseJson, ["workspace_dir"])
  );
}

function resolveResultJsonPath(runResult: RunResultLike | undefined) {
  return (
    normalizeString(runResult?.resultJsonPath) ||
    getNestedString(runResult?.responseJson, ["resultJsonPath"]) ||
    getNestedString(runResult?.responseJson, ["result_json_path"])
  );
}

function parentEntryPath(value: string) {
  const normalized = normalizeEntryPath(value);
  if (!normalized) {
    return "";
  }
  const segments = normalized.split("/");
  segments.pop();
  return segments.join("/");
}

function resolveResultArtifactBasePath(runResult: RunResultLike | undefined) {
  return (
    normalizeEntryPath(normalizeString(runResult?.resultArtifactBasePath)) ||
    parentEntryPath(normalizeString(runResult?.resultJsonPath)) ||
    parentEntryPath(
      getNestedString(runResult?.responseJson, ["resultJsonPath"]),
    ) ||
    parentEntryPath(
      getNestedString(runResult?.responseJson, ["result_json_path"]),
    )
  );
}

function parseJsonText(text: string, sourceLabel: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid result JSON from ${sourceLabel}: ${message}`);
  }
}

function normalizeResultJson(value: unknown, sourceLabel: string) {
  let parsed = value;
  if (typeof value === "string") {
    parsed = parseJsonText(value, sourceLabel);
  }
  return canonicalizeWorkflowResultJson(parsed);
}

function addCandidate(
  candidates: ArtifactCandidate[],
  seen: Set<string>,
  candidate: ArtifactCandidate,
) {
  const key =
    candidate.kind === "local-path"
      ? `local:${normalizePathText(candidate.path).toLowerCase()}`
      : `bundle:${normalizeEntryPath(candidate.entryPath)}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  candidates.push(candidate);
}

function addPathCandidates(args: {
  candidates: ArtifactCandidate[];
  seen: Set<string>;
  workspaceDir: string;
  rawPath: unknown;
}) {
  const rawLocal = normalizeLocalPathText(args.rawPath);
  const raw = normalizePathText(args.rawPath);
  if (!rawLocal && !raw) {
    return;
  }
  if (isAbsolutePath(rawLocal)) {
    addCandidate(args.candidates, args.seen, {
      kind: "local-path",
      path: normalizeNativeLocalPath(rawLocal),
      label: normalizePathText(rawLocal),
    });
  } else {
    const entryPath = normalizeEntryPath(raw);
    if (entryPath) {
      if (args.workspaceDir) {
        addCandidate(args.candidates, args.seen, {
          kind: "local-path",
          path: joinPath(args.workspaceDir, entryPath),
          label: entryPath,
        });
      }
      addCandidate(args.candidates, args.seen, {
        kind: "bundle-entry",
        entryPath,
        label: entryPath,
      });
    }
  }

  const lowered = raw.toLowerCase();
  for (const marker of ["/uploads/", "/artifacts/", "/result/", "/bundle/"]) {
    const index = lowered.lastIndexOf(marker);
    if (index < 0) {
      continue;
    }
    const sliced = normalizeEntryPath(raw.slice(index + 1));
    if (!sliced) {
      continue;
    }
    if (args.workspaceDir) {
      addCandidate(args.candidates, args.seen, {
        kind: "local-path",
        path: joinPath(args.workspaceDir, sliced),
        label: sliced,
      });
    }
    addCandidate(args.candidates, args.seen, {
      kind: "bundle-entry",
      entryPath: sliced,
      label: sliced,
    });
  }
}

function addNamespacedPathCandidates(args: {
  candidates: ArtifactCandidate[];
  seen: Set<string>;
  workspaceDir: string;
  baseEntryPath: string;
  rawPath: unknown;
}) {
  const baseEntryPath = normalizeEntryPath(args.baseEntryPath);
  const raw = normalizeEntryPath(normalizePathText(args.rawPath));
  if (
    !baseEntryPath ||
    !raw ||
    isAbsolutePath(normalizeLocalPathText(args.rawPath))
  ) {
    return;
  }
  const relativeUnderBase = raw.startsWith("result/")
    ? raw.slice("result/".length)
    : raw;
  if (!relativeUnderBase || relativeUnderBase === "result.json") {
    return;
  }
  const namespacedEntry = normalizeEntryPath(
    `${baseEntryPath}/${relativeUnderBase}`,
  );
  if (!namespacedEntry) {
    return;
  }
  if (args.workspaceDir) {
    addCandidate(args.candidates, args.seen, {
      kind: "local-path",
      path: joinPath(args.workspaceDir, namespacedEntry),
      label: namespacedEntry,
    });
  }
  addCandidate(args.candidates, args.seen, {
    kind: "bundle-entry",
    entryPath: namespacedEntry,
    label: namespacedEntry,
  });
}

function buildArtifactCandidates(args: {
  rawPath?: unknown;
  fallbackPath?: string;
  workspaceDir: string;
  resultArtifactBasePath: string;
}) {
  const candidates: ArtifactCandidate[] = [];
  const seen = new Set<string>();
  addPathCandidates({
    candidates,
    seen,
    workspaceDir: args.workspaceDir,
    rawPath: args.rawPath,
  });
  addNamespacedPathCandidates({
    candidates,
    seen,
    workspaceDir: args.workspaceDir,
    baseEntryPath: args.resultArtifactBasePath,
    rawPath: args.rawPath,
  });
  addPathCandidates({
    candidates,
    seen,
    workspaceDir: args.workspaceDir,
    rawPath: args.fallbackPath,
  });
  addNamespacedPathCandidates({
    candidates,
    seen,
    workspaceDir: args.workspaceDir,
    baseEntryPath: args.resultArtifactBasePath,
    rawPath: args.fallbackPath,
  });
  return candidates;
}

async function readLocalArtifact(path: string) {
  if (!(await runtimePathExists(path))) {
    return null;
  }
  return readRuntimeTextFile(path);
}

async function tryReadResultJson(args: {
  runResult?: RunResultLike;
  bundleReader: BundleReader;
  manifest: WorkflowResultManifestLike;
  warnings: WorkflowResultResolutionWarning[];
}) {
  const runResultJson = args.runResult?.resultJson;
  if (typeof runResultJson !== "undefined") {
    return {
      resultJson: normalizeResultJson(runResultJson, "runResult.resultJson"),
      source: { kind: "run-result" as const },
    };
  }

  const resultJsonPath = resolveResultJsonPath(args.runResult);
  if (resultJsonPath && (await runtimePathExists(resultJsonPath))) {
    return {
      resultJson: normalizeResultJson(
        await readRuntimeTextFile(resultJsonPath),
        resultJsonPath,
      ),
      source: { kind: "local-path" as const, path: resultJsonPath },
    };
  }
  const resultJsonEntryPath = normalizeEntryPath(resultJsonPath);
  if (resultJsonEntryPath && !isAbsolutePath(resultJsonPath)) {
    try {
      return {
        resultJson: normalizeResultJson(
          await args.bundleReader.readText(resultJsonEntryPath),
          resultJsonEntryPath,
        ),
        source: {
          kind: "bundle-entry" as const,
          entryPath: resultJsonEntryPath,
        },
      };
    } catch {
      // Fall through to manifest/default bundle result path.
    }
  }

  const resultEntry =
    normalizeString(args.manifest.result?.expects?.result_json) ||
    "result/result.json";
  try {
    return {
      resultJson: normalizeResultJson(
        await args.bundleReader.readText(resultEntry),
        resultEntry,
      ),
      source: { kind: "bundle-entry" as const, entryPath: resultEntry },
    };
  } catch (error) {
    args.warnings.push({
      code: "result_json_unavailable",
      message: `result JSON is unavailable from runResult, local path, and bundle entry ${resultEntry}`,
      details: {
        resultJsonPath,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      resultJson: undefined,
      source: { kind: "unavailable" as const },
    };
  }
}

export async function createWorkflowResultContext(args: {
  runResult?: RunResultLike;
  bundleReader: BundleReader;
  manifest: WorkflowResultManifestLike;
}): Promise<WorkflowResultContext> {
  const warnings: WorkflowResultResolutionWarning[] = [];
  const errors: WorkflowResultResolutionWarning[] = [];
  const workspaceDir = resolveWorkspaceDir(args.runResult);
  const resultJsonPath = resolveResultJsonPath(args.runResult);
  const resultArtifactBasePath = resolveResultArtifactBasePath(args.runResult);
  const resolvedResultJson = await tryReadResultJson({
    runResult: args.runResult,
    bundleReader: args.bundleReader,
    manifest: args.manifest,
    warnings,
  });

  const resolveArtifact: WorkflowResultContext["resolveArtifact"] = async ({
    fieldName,
    rawPath,
    fallbackPath,
  }) => {
    const candidates = buildArtifactCandidates({
      rawPath,
      fallbackPath,
      workspaceDir,
      resultArtifactBasePath,
    });
    let lastError = "";
    for (const candidate of candidates) {
      if (candidate.kind === "local-path") {
        const text = await readLocalArtifact(candidate.path);
        if (text !== null) {
          return {
            text,
            entryPath: candidate.label,
            sourceKind: "local-path",
            sourcePath: candidate.path,
            candidates: candidates.map((entry) =>
              entry.kind === "local-path" ? entry.path : entry.entryPath,
            ),
          };
        }
        lastError = `local path not found: ${candidate.path}`;
        continue;
      }
      try {
        return {
          text: await args.bundleReader.readText(candidate.entryPath),
          entryPath: candidate.entryPath,
          sourceKind: "bundle-entry",
          candidates: candidates.map((entry) =>
            entry.kind === "local-path" ? entry.path : entry.entryPath,
          ),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    const candidateLabels = candidates.map((entry) =>
      entry.kind === "local-path" ? entry.path : entry.entryPath,
    );
    const message = `[${fieldName || "artifact"}] artifact not found; raw_path=${normalizePathText(rawPath) || "<empty>"}; candidates=${JSON.stringify(candidateLabels)}; fallback=${normalizePathText(fallbackPath) || "<empty>"}; last_error=${lastError || "no candidates"}`;
    errors.push({
      code: "artifact_not_found",
      message,
      details: {
        fieldName,
        rawPath: normalizePathText(rawPath),
        fallbackPath: normalizePathText(fallbackPath),
        candidates: candidateLabels,
      },
    });
    throw new Error(message);
  };

  return {
    resultJson: resolvedResultJson.resultJson,
    resultJsonSource: resolvedResultJson.source,
    workspaceDir: workspaceDir || undefined,
    resultJsonPath: resultJsonPath || undefined,
    bundleReader: args.bundleReader,
    warnings,
    errors,
    resolveArtifact,
    readArtifactText: resolveArtifact,
  };
}

export function getResultJsonStringField(source: unknown, key: string) {
  if (!isObjectRecord(source)) {
    return "";
  }
  return (
    normalizeString(source[key]) ||
    getNestedString(source, ["data", key]) ||
    getNestedString(source, ["result", key])
  );
}

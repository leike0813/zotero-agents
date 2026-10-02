import { joinPath, normalizeNativeLocalPath } from "../../utils/path";
import { readRuntimeBytes, readRuntimeTextFile, runtimePathExists, } from "../runtimePersistence";
import { unwrapSkillRunnerResultJson } from "./resultEnvelope";
function normalizeString(value) {
    return String(value || "").trim();
}
function isObjectRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function normalizePathText(value) {
    return normalizeString(value)
        .replace(/^file:\/\/+/, "")
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/");
}
function normalizeLocalPathText(value) {
    return normalizeString(value).replace(/^file:\/\/+/, "");
}
function isAbsolutePath(value) {
    return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/");
}
function normalizeEntryPath(value) {
    return normalizePathText(value)
        .replace(/^\/+/g, "")
        .split("/")
        .filter((segment) => segment && segment !== "." && segment !== "..")
        .join("/");
}
function getNestedString(source, path) {
    let current = source;
    for (const segment of path) {
        if (!current || typeof current !== "object" || Array.isArray(current)) {
            return "";
        }
        current = current[segment];
    }
    return normalizeString(current);
}
function resolveWorkspaceDir(runResult) {
    return (normalizeString(runResult?.workspaceDir) ||
        getNestedString(runResult?.responseJson, ["workspaceDir"]) ||
        getNestedString(runResult?.responseJson, ["workspace_dir"]));
}
function resolveResultJsonPath(runResult) {
    return (normalizeString(runResult?.resultJsonPath) ||
        getNestedString(runResult?.responseJson, ["resultJsonPath"]) ||
        getNestedString(runResult?.responseJson, ["result_json_path"]));
}
function parentEntryPath(value) {
    const normalized = normalizeEntryPath(value);
    if (!normalized) {
        return "";
    }
    const segments = normalized.split("/");
    segments.pop();
    return segments.join("/");
}
function resolveResultArtifactBasePath(runResult) {
    return (normalizeEntryPath(normalizeString(runResult?.resultArtifactBasePath)) ||
        parentEntryPath(normalizeString(runResult?.resultJsonPath)) ||
        parentEntryPath(getNestedString(runResult?.responseJson, ["resultJsonPath"])) ||
        parentEntryPath(getNestedString(runResult?.responseJson, ["result_json_path"])));
}
function parseJsonText(text, sourceLabel) {
    try {
        return JSON.parse(text);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid result JSON from ${sourceLabel}: ${message}`);
    }
}
function normalizeResultJson(value, sourceLabel) {
    let parsed = value;
    if (typeof value === "string") {
        parsed = parseJsonText(value, sourceLabel);
    }
    return unwrapSkillRunnerResultJson(parsed);
}
function addCandidate(candidates, seen, candidate) {
    const key = candidate.kind === "local-path"
        ? `local:${normalizePathText(candidate.path).toLowerCase()}`
        : `bundle:${normalizeEntryPath(candidate.entryPath)}`;
    if (seen.has(key)) {
        return;
    }
    seen.add(key);
    candidates.push(candidate);
}
function addPathCandidates(args) {
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
    }
    else {
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
function addNamespacedPathCandidates(args) {
    const baseEntryPath = normalizeEntryPath(args.baseEntryPath);
    const raw = normalizeEntryPath(normalizePathText(args.rawPath));
    if (!baseEntryPath ||
        !raw ||
        isAbsolutePath(normalizeLocalPathText(args.rawPath))) {
        return;
    }
    const relativeUnderBase = raw.startsWith("result/")
        ? raw.slice("result/".length)
        : raw;
    if (!relativeUnderBase || relativeUnderBase === "result.json") {
        return;
    }
    const namespacedEntry = normalizeEntryPath(`${baseEntryPath}/${relativeUnderBase}`);
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
function buildArtifactCandidates(args) {
    const candidates = [];
    const seen = new Set();
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
async function readLocalArtifact(path) {
    if (!(await runtimePathExists(path))) {
        return null;
    }
    return readRuntimeTextFile(path);
}
async function tryReadResultJson(args) {
    const runResultJson = args.runResult?.resultJson;
    if (typeof runResultJson !== "undefined") {
        return {
            resultJson: normalizeResultJson(runResultJson, "runResult.resultJson"),
            source: { kind: "run-result" },
        };
    }
    const resultJsonPath = resolveResultJsonPath(args.runResult);
    if (resultJsonPath && (await runtimePathExists(resultJsonPath))) {
        return {
            resultJson: normalizeResultJson(await readRuntimeTextFile(resultJsonPath), resultJsonPath),
            source: { kind: "local-path", path: resultJsonPath },
        };
    }
    const resultJsonEntryPath = normalizeEntryPath(resultJsonPath);
    if (resultJsonEntryPath && !isAbsolutePath(resultJsonPath)) {
        try {
            return {
                resultJson: normalizeResultJson(await args.bundleReader.readText(resultJsonEntryPath), resultJsonEntryPath),
                source: {
                    kind: "bundle-entry",
                    entryPath: resultJsonEntryPath,
                },
            };
        }
        catch {
            // Fall through to manifest/default bundle result path.
        }
    }
    const resultEntry = normalizeString(args.manifest.result?.expects?.result_json) ||
        "result/result.json";
    try {
        return {
            resultJson: normalizeResultJson(await args.bundleReader.readText(resultEntry), resultEntry),
            source: { kind: "bundle-entry", entryPath: resultEntry },
        };
    }
    catch (error) {
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
            source: { kind: "unavailable" },
        };
    }
}
export async function createWorkflowResultContext(args) {
    const warnings = [];
    const errors = [];
    const workspaceDir = resolveWorkspaceDir(args.runResult);
    const resultJsonPath = resolveResultJsonPath(args.runResult);
    const resultArtifactBasePath = resolveResultArtifactBasePath(args.runResult);
    const resolvedResultJson = await tryReadResultJson({
        runResult: args.runResult,
        bundleReader: args.bundleReader,
        manifest: args.manifest,
        warnings,
    });
    const resolveArtifact = async ({ fieldName, rawPath, fallbackPath, }) => {
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
                        candidates: candidates.map((entry) => entry.kind === "local-path" ? entry.path : entry.entryPath),
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
                    candidates: candidates.map((entry) => entry.kind === "local-path" ? entry.path : entry.entryPath),
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
            }
        }
        const candidateLabels = candidates.map((entry) => entry.kind === "local-path" ? entry.path : entry.entryPath);
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
    const resolveArtifactBytes = async ({ fieldName, rawPath, fallbackPath }) => {
        const candidates = buildArtifactCandidates({
            rawPath,
            fallbackPath,
            workspaceDir,
            resultArtifactBasePath,
        });
        for (const candidate of candidates) {
            if (candidate.kind === "local-path") {
                if (await runtimePathExists(candidate.path)) {
                    return {
                        bytes: await readRuntimeBytes(candidate.path),
                        entryPath: candidate.label,
                        sourceKind: "local-path",
                        sourcePath: candidate.path,
                        candidates: candidates.map((entry) => entry.kind === "local-path" ? entry.path : entry.entryPath),
                    };
                }
                continue;
            }
            try {
                const bytes = args.bundleReader.readBytes
                    ? await args.bundleReader.readBytes(candidate.entryPath)
                    : new TextEncoder().encode(await args.bundleReader.readText(candidate.entryPath));
                return {
                    bytes,
                    entryPath: candidate.entryPath,
                    sourceKind: "bundle-entry",
                    candidates: candidates.map((entry) => entry.kind === "local-path" ? entry.path : entry.entryPath),
                };
            }
            catch {
                // Try the next normalized candidate.
            }
        }
        throw new Error(`[${fieldName || "artifact"}] binary artifact not found`);
    };
    return {
        resultJson: resolvedResultJson.resultJson,
        resultJsonSource: resolvedResultJson.source,
        workspaceDir: workspaceDir || undefined,
        resultJsonPath: resultJsonPath || undefined,
        bundleReader: args.bundleReader,
        preflight: args.preflight,
        aggregate: args.aggregate,
        warnings,
        errors,
        resolveArtifact,
        readArtifactText: resolveArtifact,
        resolveArtifactBytes,
    };
}
export function getResultJsonStringField(source, key) {
    if (!isObjectRecord(source)) {
        return "";
    }
    return (normalizeString(source[key]) ||
        getNestedString(source, ["data", key]) ||
        getNestedString(source, ["result", key]));
}

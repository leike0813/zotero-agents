import { getBaseName, joinPath } from "../../../utils/path";
import { compileSkillJsonSchema, loadResolvedAcpSkillJson, resolveAcpSkillSchemaAsset, validateRunnerManifestShape, validateSkillSchemaAnnotations, } from "../../acp/skillRun/acpSkillSchemaAssets";
import { listRuntimeChildDirectories, readRuntimeTextFile, RUNTIME_TREE_POLICIES, runtimePathExists, scanRuntimeTree, statRuntimePath, } from "../../runtimePersistence";
import { isDebugModeEnabled } from "../../debugMode";
import { getOfficialSkillDir } from "./contentPackageSubscription";
import { getDevLocalSkillDir, getEffectiveSkillDir } from "./workflowRuntime";
import { createSha256Accumulator } from "../../../utils/sha256";
import { getLatestHostBridgePluginSkillBundleMaterialization, getReservedHostBridgePluginSkillIds, } from "../../hostBridge/cli/hostBridgePluginSkillBundle";
export const PLUGIN_SKILL_USER_ROOT = "skills";
export const PLUGIN_SKILL_BUILTIN_ROOT = "skills_builtin";
function normalizeString(value) {
    return String(value || "").trim();
}
function getRuntimeCwd() {
    const runtime = globalThis;
    if (typeof runtime.process?.cwd === "function") {
        return runtime.process.cwd();
    }
    return ".";
}
function getDefaultUserSkillRoot() {
    return getEffectiveSkillDir();
}
function getDefaultOfficialSkillRoot() {
    return getOfficialSkillDir();
}
export function resolvePluginSkillRoots(options = {}) {
    const cwd = normalizeString(options.cwd);
    const materialization = getLatestHostBridgePluginSkillBundleMaterialization();
    return {
        userRoot: normalizeString(options.userRoot) ||
            (cwd ? joinPath(cwd, PLUGIN_SKILL_USER_ROOT) : getDefaultUserSkillRoot()),
        builtinRoot: normalizeString(options.builtinRoot) ||
            (cwd
                ? joinPath(cwd, PLUGIN_SKILL_BUILTIN_ROOT)
                : getDefaultOfficialSkillRoot()),
        devLocalRoot: normalizeString(options.devLocalRoot),
        xpiBundledRoot: normalizeString(options.xpiBundledRoot) ||
            (materialization?.ok ? materialization.root : ""),
    };
}
function sourcePriority(sourceKind) {
    if (sourceKind === "xpi-bundled") {
        return 0;
    }
    if (sourceKind === "official") {
        return 1;
    }
    if (sourceKind === "dev-local") {
        return 2;
    }
    return 3;
}
async function pathExists(targetPath) {
    return runtimePathExists(targetPath);
}
async function isDirectory(targetPath) {
    return (await statRuntimePath(targetPath)).isDir;
}
async function listDirectories(root) {
    return listRuntimeChildDirectories(root);
}
async function readJsonFile(filePath) {
    const text = await readRuntimeTextFile(filePath);
    return JSON.parse(text);
}
async function readSkillFrontmatter(skillMdPath) {
    const content = await readRuntimeTextFile(skillMdPath);
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) {
        return {
            name: "",
            description: "",
        };
    }
    const body = match[1] || "";
    const nameMatch = body.match(/^name:\s*(.+?)\s*$/m);
    const descriptionMatch = body.match(/^description:\s*(.+?)\s*$/m);
    const stripQuotes = (value) => normalizeString(value).replace(/^["']|["']$/g, "");
    return {
        name: stripQuotes(nameMatch?.[1]),
        description: stripQuotes(descriptionMatch?.[1]),
    };
}
function makeInvalidRunnerDiagnostic(args) {
    return {
        level: "error",
        category: args.category || "skill_runner_json_invalid",
        message: args.message || "skill runner.json is invalid",
        sourceKind: args.candidate.sourceKind,
        path: args.path,
        skillId: args.skillId,
        reason: args.reason,
    };
}
async function validateSchemaAssetForRegistry(args) {
    const resolution = await resolveAcpSkillSchemaAsset({
        skillDir: args.candidate.sourceDir,
        runnerJson: args.runnerJson,
        schemaKey: args.schemaKey,
    });
    if (!resolution.path) {
        if (args.schemaKey === "output") {
            return [
                makeInvalidRunnerDiagnostic({
                    candidate: args.candidate,
                    path: args.candidate.sourceDir,
                    category: "skill_schema_invalid",
                    reason: "missing_output_schema",
                    message: "skill output schema is missing",
                }),
            ];
        }
        return [];
    }
    try {
        const schema = await loadResolvedAcpSkillJson(resolution);
        if (!schema) {
            return [
                makeInvalidRunnerDiagnostic({
                    candidate: args.candidate,
                    path: resolution.path,
                    category: "skill_schema_invalid",
                    reason: `${args.schemaKey}_schema_not_object`,
                    message: `skill ${args.schemaKey} schema must be a JSON object`,
                }),
            ];
        }
        const errors = [
            ...compileSkillJsonSchema({ schema, schemaKey: args.schemaKey }),
            ...validateSkillSchemaAnnotations({ schema, schemaKey: args.schemaKey }),
        ];
        return errors.map((reason) => makeInvalidRunnerDiagnostic({
            candidate: args.candidate,
            path: resolution.path || args.candidate.sourceDir,
            category: "skill_schema_invalid",
            reason,
            message: `skill ${args.schemaKey} schema is invalid`,
        }));
    }
    catch (error) {
        return [
            makeInvalidRunnerDiagnostic({
                candidate: args.candidate,
                path: resolution.path,
                category: "skill_schema_invalid",
                reason: error instanceof Error ? error.message : String(error),
                message: `skill ${args.schemaKey} schema could not be parsed`,
            }),
        ];
    }
}
async function computeDirectoryChecksum(root) {
    const runtimeTreeManifest = await scanRuntimeTree(root, RUNTIME_TREE_POLICIES.skill);
    if (runtimeTreeManifest.issues.length) {
        throw new Error("skill runtime tree scan was incomplete");
    }
    const files = runtimeTreeManifest.entries.filter((entry) => entry.kind === "file");
    const accumulator = await createSha256Accumulator();
    const encoder = new TextEncoder();
    let fallbackHash = 2166136261;
    const updateText = (text) => {
        if (!accumulator) {
            for (let index = 0; index < text.length; index += 1) {
                fallbackHash ^= text.charCodeAt(index);
                fallbackHash = Math.imul(fallbackHash, 16777619) >>> 0;
            }
            return;
        }
        for (let offset = 0; offset < text.length;) {
            let end = Math.min(text.length, offset + 16_384);
            if (end < text.length &&
                text.charCodeAt(end - 1) >= 0xd800 &&
                text.charCodeAt(end - 1) <= 0xdbff) {
                end -= 1;
            }
            accumulator.update(encoder.encode(text.slice(offset, end)));
            offset = end;
        }
    };
    for (const file of files) {
        updateText(file.relativePath);
        updateText("\0");
        updateText(await readRuntimeTextFile(file.absolutePath));
        updateText("\0");
    }
    if (accumulator) {
        return {
            checksum: `sha256:${accumulator.digestHex()}`,
            runtimeTreeManifest,
        };
    }
    return {
        checksum: `fnv1a32:${fallbackHash.toString(16).padStart(8, "0")}`,
        runtimeTreeManifest,
    };
}
async function inspectCandidate(candidate) {
    const skillMdPath = joinPath(candidate.sourceDir, "SKILL.md");
    const runnerJsonPath = joinPath(candidate.sourceDir, "assets", "runner.json");
    if (!(await pathExists(skillMdPath))) {
        return {
            level: "error",
            category: "skill_candidate_invalid",
            message: "skill candidate is missing SKILL.md",
            sourceKind: candidate.sourceKind,
            path: candidate.sourceDir,
            reason: "missing_skill_md",
        };
    }
    if (!(await pathExists(runnerJsonPath))) {
        return {
            level: "error",
            category: "skill_candidate_invalid",
            message: "skill candidate is missing assets/runner.json",
            sourceKind: candidate.sourceKind,
            path: candidate.sourceDir,
            reason: "missing_runner_json",
        };
    }
    let runnerJson;
    try {
        runnerJson = await readJsonFile(runnerJsonPath);
    }
    catch (error) {
        return {
            level: "error",
            category: "skill_runner_json_invalid",
            message: "skill runner.json could not be parsed",
            sourceKind: candidate.sourceKind,
            path: runnerJsonPath,
            reason: error instanceof Error ? error.message : "invalid_json",
        };
    }
    const skillId = normalizeString(runnerJson.id);
    if (!skillId) {
        return {
            level: "error",
            category: "skill_runner_json_invalid",
            message: "skill runner.json is missing id",
            sourceKind: candidate.sourceKind,
            path: runnerJsonPath,
            reason: "missing_id",
        };
    }
    const skillFrontmatter = await readSkillFrontmatter(skillMdPath);
    const runnerErrors = validateRunnerManifestShape({
        runnerJson,
        skillDirName: getBaseName(candidate.sourceDir),
        skillFrontmatterName: skillFrontmatter.name,
    });
    if (runnerErrors.length > 0) {
        return makeInvalidRunnerDiagnostic({
            candidate,
            path: runnerJsonPath,
            reason: runnerErrors.join("; "),
            category: runnerErrors.some((entry) => entry.startsWith("identity_mismatch"))
                ? "skill_identity_mismatch"
                : "skill_runner_json_invalid",
            message: runnerErrors.some((entry) => entry.startsWith("identity_mismatch"))
                ? "skill identity mismatch"
                : "skill runner.json is invalid",
            skillId,
        });
    }
    for (const schemaKey of ["input", "parameter", "output"]) {
        const schemaDiagnostics = await validateSchemaAssetForRegistry({
            candidate,
            runnerJson,
            schemaKey,
        });
        if (schemaDiagnostics.length > 0) {
            return schemaDiagnostics[0];
        }
    }
    const directoryChecksum = await computeDirectoryChecksum(candidate.sourceDir);
    return {
        skillId,
        skillName: normalizeString(runnerJson.name) || undefined,
        description: skillFrontmatter.description,
        ...(runnerJson.debug_only === true ? { debugOnly: true } : {}),
        sourceKind: candidate.sourceKind,
        sourceDir: candidate.sourceDir,
        skillMdPath,
        runnerJsonPath,
        checksum: directoryChecksum.checksum,
        runtimeTreeManifest: directoryChecksum.runtimeTreeManifest,
        diagnostics: [],
    };
}
async function collectCandidates(args) {
    const diagnostics = [];
    if (!(await isDirectory(args.root))) {
        diagnostics.push({
            level: "info",
            category: "skill_root_missing",
            message: `plugin skill root does not exist: ${args.root}`,
            sourceKind: args.sourceKind,
            path: args.root,
        });
        return { candidates: [], diagnostics };
    }
    try {
        const sourceDirs = await listDirectories(args.root);
        const candidates = [];
        for (const sourceDir of sourceDirs) {
            if ((await pathExists(joinPath(sourceDir, ".skillignore"))) ||
                (await pathExists(joinPath(sourceDir, "skill.ignore")))) {
                continue;
            }
            candidates.push({
                sourceKind: args.sourceKind,
                sourceDir,
            });
        }
        return {
            candidates,
            diagnostics,
        };
    }
    catch (error) {
        diagnostics.push({
            level: "error",
            category: "skill_scan_error",
            message: `failed to scan plugin skill root: ${args.root}`,
            sourceKind: args.sourceKind,
            path: args.root,
            reason: error instanceof Error ? error.message : "unknown error",
        });
        return { candidates: [], diagnostics };
    }
}
const registryScanInflight = new Map();
async function scanPluginSkillRegistryImpl(options = {}) {
    const roots = resolvePluginSkillRoots(options);
    const usesExplicitScanRoots = Boolean(normalizeString(options.cwd) ||
        normalizeString(options.builtinRoot) ||
        normalizeString(options.userRoot));
    const devLocalRoot = roots.devLocalRoot ||
        (usesExplicitScanRoots ? "" : await getDevLocalSkillDir());
    const diagnostics = [];
    const materialization = getLatestHostBridgePluginSkillBundleMaterialization();
    const reservedSkillIds = new Set(options.reservedSkillIds || getReservedHostBridgePluginSkillIds());
    const xpi = roots.xpiBundledRoot
        ? await collectCandidates({
            root: roots.xpiBundledRoot,
            sourceKind: "xpi-bundled",
        })
        : { candidates: [], diagnostics: [] };
    const builtin = await collectCandidates({
        root: roots.builtinRoot,
        sourceKind: "official",
    });
    const devLocal = devLocalRoot
        ? await collectCandidates({
            root: devLocalRoot,
            sourceKind: "dev-local",
        })
        : { candidates: [], diagnostics: [] };
    const user = await collectCandidates({
        root: roots.userRoot,
        sourceKind: "user",
    });
    diagnostics.push(...xpi.diagnostics, ...builtin.diagnostics, ...devLocal.diagnostics, ...user.diagnostics);
    const validEntries = [];
    for (const candidate of [
        ...xpi.candidates,
        ...builtin.candidates,
        ...devLocal.candidates,
        ...user.candidates,
    ]) {
        const inspected = await inspectCandidate(candidate);
        if ("category" in inspected) {
            diagnostics.push(inspected);
            continue;
        }
        if (reservedSkillIds.has(inspected.skillId)) {
            if (inspected.sourceKind !== "xpi-bundled") {
                diagnostics.push({
                    level: "warning",
                    category: "skill_reserved_source_rejected",
                    message: `${inspected.sourceKind} source cannot provide reserved Host Bridge Skill: ${inspected.skillId}`,
                    skillId: inspected.skillId,
                    sourceKind: inspected.sourceKind,
                    path: inspected.sourceDir,
                    reason: "reserved_for_xpi_bundle",
                });
                continue;
            }
        }
        else if (inspected.sourceKind === "xpi-bundled") {
            diagnostics.push({
                level: "error",
                category: "skill_candidate_invalid",
                message: `XPI Host Bridge bundle contains an unreserved Skill: ${inspected.skillId}`,
                skillId: inspected.skillId,
                sourceKind: inspected.sourceKind,
                path: inspected.sourceDir,
                reason: "xpi_bundle_skill_not_reserved",
            });
            continue;
        }
        if (inspected.debugOnly && !isDebugModeEnabled()) {
            continue;
        }
        validEntries.push(inspected);
    }
    const entriesById = {};
    for (const entry of validEntries.sort((left, right) => {
        const idCompare = left.skillId.localeCompare(right.skillId);
        if (idCompare !== 0) {
            return idCompare;
        }
        return sourcePriority(left.sourceKind) - sourcePriority(right.sourceKind);
    })) {
        const existing = entriesById[entry.skillId];
        if (!existing) {
            entriesById[entry.skillId] = entry;
            continue;
        }
        if (sourcePriority(entry.sourceKind) > sourcePriority(existing.sourceKind)) {
            diagnostics.push({
                level: "info",
                category: "skill_shadowed",
                message: `${entry.sourceKind} skill shadows ${existing.sourceKind} skill: ${entry.skillId}`,
                skillId: entry.skillId,
                sourceKind: existing.sourceKind,
                path: existing.sourceDir,
            });
            entriesById[entry.skillId] = entry;
            continue;
        }
        diagnostics.push({
            level: "info",
            category: "skill_shadowed",
            message: `${entry.sourceKind} skill ignored because an effective skill already exists: ${entry.skillId}`,
            skillId: entry.skillId,
            sourceKind: entry.sourceKind,
            path: entry.sourceDir,
        });
    }
    const entries = Object.values(entriesById).sort((left, right) => left.skillId.localeCompare(right.skillId));
    return {
        entries,
        entriesById,
        diagnostics,
        ...((options.hostBridgePluginSkillBundleIdentity ||
            (materialization?.ok ? materialization.identity : undefined)) &&
            roots.xpiBundledRoot
            ? {
                hostBridgePluginSkillBundle: {
                    identity: options.hostBridgePluginSkillBundleIdentity ||
                        (materialization?.ok ? materialization.identity : undefined),
                    reservedSkillIds: [...reservedSkillIds],
                },
            }
            : {}),
    };
}
export function scanPluginSkillRegistry(options = {}) {
    const key = JSON.stringify({
        builtinRoot: normalizeString(options.builtinRoot),
        userRoot: normalizeString(options.userRoot),
        devLocalRoot: normalizeString(options.devLocalRoot),
        xpiBundledRoot: normalizeString(options.xpiBundledRoot),
        reservedSkillIds: options.reservedSkillIds || [],
        hostBridgePluginSkillBundleIdentity: options.hostBridgePluginSkillBundleIdentity,
        cwd: normalizeString(options.cwd),
        debug: isDebugModeEnabled(),
    });
    const existing = registryScanInflight.get(key);
    if (existing)
        return existing;
    const promise = scanPluginSkillRegistryImpl(options).finally(() => {
        if (registryScanInflight.get(key) === promise) {
            registryScanInflight.delete(key);
        }
    });
    registryScanInflight.set(key, promise);
    return promise;
}

import { getBaseName, joinPath } from "../utils/path";
import {
  compileSkillJsonSchema,
  loadResolvedAcpSkillJson,
  resolveAcpSkillSchemaAsset,
  validateRunnerManifestShape,
  validateSkillSchemaAnnotations,
  type AcpSkillSchemaKey,
} from "./acpSkillSchemaAssets";
import {
  collectRuntimeFiles,
  listRuntimeChildDirectories,
  readRuntimeTextFile,
  runtimePathExists,
  runtimeRelativePath,
  statRuntimePath,
} from "./runtimePersistence";

export const PLUGIN_SKILL_USER_ROOT = "skills";
export const PLUGIN_SKILL_BUILTIN_ROOT = "skills_builtin";

export type PluginSkillSourceKind = "user" | "builtin";

export type PluginSkillRegistryDiagnostic = {
  level: "info" | "warning" | "error";
  category:
    | "skill_root_missing"
    | "skill_candidate_invalid"
    | "skill_identity_mismatch"
    | "skill_schema_invalid"
    | "skill_runner_json_invalid"
    | "skill_shadowed"
    | "skill_scan_error";
  message: string;
  sourceKind?: PluginSkillSourceKind;
  path?: string;
  skillId?: string;
  reason?: string;
};

export type PluginSkillRegistryEntry = {
  skillId: string;
  sourceKind: PluginSkillSourceKind;
  sourceDir: string;
  skillMdPath: string;
  runnerJsonPath: string;
  checksum: string;
  diagnostics: PluginSkillRegistryDiagnostic[];
};

export type PluginSkillRegistrySnapshot = {
  entries: PluginSkillRegistryEntry[];
  entriesById: Record<string, PluginSkillRegistryEntry>;
  diagnostics: PluginSkillRegistryDiagnostic[];
};

export type PluginSkillRegistryScanOptions = {
  userRoot?: string;
  builtinRoot?: string;
  cwd?: string;
};

type Candidate = {
  sourceKind: PluginSkillSourceKind;
  sourceDir: string;
};

let pluginRuntimeRootURI = "";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function setPluginSkillRegistryRuntimeRootURI(rootURI?: string) {
  pluginRuntimeRootURI = normalizeString(rootURI);
}

function getRuntimeCwd() {
  const runtime = globalThis as {
    process?: { cwd?: () => string };
  };
  if (typeof runtime.process?.cwd === "function") {
    return runtime.process.cwd();
  }
  return ".";
}

function getZoteroDataDirectory() {
  const runtime = globalThis as {
    Zotero?: {
      DataDirectory?: {
        dir?: unknown;
      };
    };
  };
  return normalizeString(runtime.Zotero?.DataDirectory?.dir);
}

function fileUriToPath(fileUri: string) {
  const normalized = normalizeString(fileUri);
  if (!normalized.toLowerCase().startsWith("file://")) {
    return "";
  }
  try {
    const parsed = new URL(normalized);
    let pathname = decodeURIComponent(parsed.pathname || "");
    const isWindowsDriveUri = /^\/[a-zA-Z]:\//.test(pathname);
    if (isWindowsDriveUri) {
      pathname = pathname.slice(1);
    }
    if (isWindowsDriveUri) {
      return pathname.replace(/\//g, "\\");
    }
    return pathname;
  } catch {
    return "";
  }
}

function getPackagedAddonRoot() {
  return fileUriToPath(pluginRuntimeRootURI).replace(/[\\\/]+$/, "");
}

function getDefaultUserSkillRoot() {
  const dataDir = getZoteroDataDirectory();
  if (dataDir) {
    return joinPath(dataDir, "zotero-skills", PLUGIN_SKILL_USER_ROOT);
  }
  return joinPath(getRuntimeCwd(), PLUGIN_SKILL_USER_ROOT);
}

function getDefaultBuiltinSkillRoot() {
  const packagedAddonRoot = getPackagedAddonRoot();
  if (packagedAddonRoot) {
    return joinPath(packagedAddonRoot, PLUGIN_SKILL_BUILTIN_ROOT);
  }
  const dataDir = getZoteroDataDirectory();
  if (dataDir) {
    return joinPath(dataDir, "zotero-skills", PLUGIN_SKILL_BUILTIN_ROOT);
  }
  return joinPath(getRuntimeCwd(), PLUGIN_SKILL_BUILTIN_ROOT);
}

export function resolvePluginSkillRoots(
  options: PluginSkillRegistryScanOptions = {},
) {
  const cwd = normalizeString(options.cwd);
  return {
    userRoot:
      normalizeString(options.userRoot) ||
      (cwd ? joinPath(cwd, PLUGIN_SKILL_USER_ROOT) : getDefaultUserSkillRoot()),
    builtinRoot:
      normalizeString(options.builtinRoot) ||
      (cwd
        ? joinPath(cwd, PLUGIN_SKILL_BUILTIN_ROOT)
        : getDefaultBuiltinSkillRoot()),
  };
}

async function pathExists(targetPath: string) {
  return runtimePathExists(targetPath);
}

async function isDirectory(targetPath: string) {
  return (await statRuntimePath(targetPath)).isDir;
}

async function listDirectories(root: string) {
  return listRuntimeChildDirectories(root);
}

async function readJsonFile(filePath: string) {
  const text = await readRuntimeTextFile(filePath);
  return JSON.parse(text) as Record<string, unknown>;
}

async function readSkillFrontmatterName(skillMdPath: string) {
  const content = await readRuntimeTextFile(skillMdPath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return "";
  }
  const body = match[1] || "";
  const nameMatch = body.match(/^name:\s*(.+?)\s*$/m);
  return normalizeString(nameMatch?.[1]).replace(/^["']|["']$/g, "");
}

function makeInvalidRunnerDiagnostic(args: {
  candidate: Candidate;
  path: string;
  reason: string;
  message?: string;
  category?: PluginSkillRegistryDiagnostic["category"];
  skillId?: string;
}): PluginSkillRegistryDiagnostic {
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

async function validateSchemaAssetForRegistry(args: {
  candidate: Candidate;
  runnerJson: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}) {
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
    return [] as PluginSkillRegistryDiagnostic[];
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
    return errors.map((reason) =>
      makeInvalidRunnerDiagnostic({
        candidate: args.candidate,
        path: resolution.path || args.candidate.sourceDir,
        category: "skill_schema_invalid",
        reason,
        message: `skill ${args.schemaKey} schema is invalid`,
      }),
    );
  } catch (error) {
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

async function collectFiles(root: string) {
  return (await collectRuntimeFiles(root)).sort((left, right) =>
    runtimeRelativePath(root, left).localeCompare(runtimeRelativePath(root, right)),
  );
}

async function computeDirectoryChecksum(root: string) {
  const files = await collectFiles(root);
  const payloadParts: string[] = [];
  for (const filePath of files) {
    const relativePath = runtimeRelativePath(root, filePath);
    payloadParts.push(relativePath, "\0", await readRuntimeTextFile(filePath), "\0");
  }
  const payload = payloadParts.join("");
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
      };
    };
    TextEncoder?: typeof TextEncoder;
    process?: unknown;
  };
  const Encoder = runtime.TextEncoder || TextEncoder;
  if (typeof runtime.crypto?.subtle?.digest === "function") {
    const digest = await runtime.crypto.subtle.digest(
      "SHA-256",
      new Encoder().encode(payload),
    );
    return `sha256:${Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  if (runtime.process) {
    try {
      const dynamicImport = new Function(
        "specifier",
        "return import(specifier)",
      ) as (specifier: string) => Promise<any>;
      const crypto = await dynamicImport("crypto");
      const hash = crypto.createHash("sha256");
      hash.update(payload);
      return `sha256:${hash.digest("hex")}`;
    } catch {
      // fall through to deterministic non-cryptographic fallback
    }
  }
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

async function inspectCandidate(
  candidate: Candidate,
): Promise<PluginSkillRegistryEntry | PluginSkillRegistryDiagnostic> {
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

  let runnerJson: Record<string, unknown>;
  try {
    runnerJson = await readJsonFile(runnerJsonPath);
  } catch (error) {
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
  const skillFrontmatterName = await readSkillFrontmatterName(skillMdPath);
  const runnerErrors = validateRunnerManifestShape({
    runnerJson,
    skillDirName: getBaseName(candidate.sourceDir),
    skillFrontmatterName,
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
  for (const schemaKey of ["input", "parameter", "output"] as const) {
    const schemaDiagnostics = await validateSchemaAssetForRegistry({
      candidate,
      runnerJson,
      schemaKey,
    });
    if (schemaDiagnostics.length > 0) {
      return schemaDiagnostics[0];
    }
  }

  return {
    skillId,
    sourceKind: candidate.sourceKind,
    sourceDir: candidate.sourceDir,
    skillMdPath,
    runnerJsonPath,
    checksum: await computeDirectoryChecksum(candidate.sourceDir),
    diagnostics: [],
  };
}

async function collectCandidates(args: {
  root: string;
  sourceKind: PluginSkillSourceKind;
}) {
  const diagnostics: PluginSkillRegistryDiagnostic[] = [];
  if (!(await isDirectory(args.root))) {
    diagnostics.push({
      level: "info",
      category: "skill_root_missing",
      message: `plugin skill root does not exist: ${args.root}`,
      sourceKind: args.sourceKind,
      path: args.root,
    });
    return { candidates: [] as Candidate[], diagnostics };
  }
  try {
    const sourceDirs = await listDirectories(args.root);
    const candidates: Candidate[] = [];
    for (const sourceDir of sourceDirs) {
      if (
        (await pathExists(joinPath(sourceDir, ".skillignore"))) ||
        (await pathExists(joinPath(sourceDir, "skill.ignore")))
      ) {
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
  } catch (error) {
    diagnostics.push({
      level: "error",
      category: "skill_scan_error",
      message: `failed to scan plugin skill root: ${args.root}`,
      sourceKind: args.sourceKind,
      path: args.root,
      reason: error instanceof Error ? error.message : "unknown error",
    });
    return { candidates: [] as Candidate[], diagnostics };
  }
}

export async function scanPluginSkillRegistry(
  options: PluginSkillRegistryScanOptions = {},
): Promise<PluginSkillRegistrySnapshot> {
  const roots = resolvePluginSkillRoots(options);
  const diagnostics: PluginSkillRegistryDiagnostic[] = [];
  const builtin = await collectCandidates({
    root: roots.builtinRoot,
    sourceKind: "builtin",
  });
  const user = await collectCandidates({
    root: roots.userRoot,
    sourceKind: "user",
  });
  diagnostics.push(...builtin.diagnostics, ...user.diagnostics);

  const validEntries: PluginSkillRegistryEntry[] = [];
  for (const candidate of [...builtin.candidates, ...user.candidates]) {
    const inspected = await inspectCandidate(candidate);
    if ("category" in inspected) {
      diagnostics.push(inspected);
      continue;
    }
    validEntries.push(inspected);
  }

  const entriesById: Record<string, PluginSkillRegistryEntry> = {};
  for (const entry of validEntries.sort((left, right) => {
    const idCompare = left.skillId.localeCompare(right.skillId);
    if (idCompare !== 0) {
      return idCompare;
    }
    return left.sourceKind.localeCompare(right.sourceKind);
  })) {
    const existing = entriesById[entry.skillId];
    if (!existing) {
      entriesById[entry.skillId] = entry;
      continue;
    }
    if (existing.sourceKind === "builtin" && entry.sourceKind === "user") {
      diagnostics.push({
        level: "info",
        category: "skill_shadowed",
        message: `user skill shadows built-in skill: ${entry.skillId}`,
        skillId: entry.skillId,
        sourceKind: "builtin",
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

  const entries = Object.values(entriesById).sort((left, right) =>
    left.skillId.localeCompare(right.skillId),
  );
  return {
    entries,
    entriesById,
    diagnostics,
  };
}

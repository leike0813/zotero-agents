import { joinPath } from "../utils/path";
import {
  collectExpiredRuntimeAssets,
  collectRuntimeFiles,
  getRuntimePersistencePaths,
  listRuntimeChildren,
  removeRuntimePath,
  runtimePathExists,
  runtimeRelativePath,
  statRuntimePath,
  validateManagedAbsolutePath,
  validateManagedRelativePath,
} from "./runtimePersistence";
import { listWorkflowProducts } from "./workflowProductStore";

export type PersistenceIntegrityIssueType =
  | "missing_file_for_db_row"
  | "orphan_file_without_db_row"
  | "expired_runtime_asset"
  | "forbidden_durable_asset_in_runtime"
  | "legacy_synthesis_root_present"
  | "legacy_note_mirror_present"
  | "legacy_zotero_skills_root_present"
  | "managed_path_invalid"
  | "managed_path_reserved_name"
  | "managed_path_segment_too_long"
  | "managed_relative_path_too_long"
  | "managed_path_case_collision"
  | "managed_absolute_path_long"
  | "legacy_long_canonical_filename";

export type PersistenceIntegrityIssue = {
  id: string;
  type: PersistenceIntegrityIssueType;
  severity: "info" | "warning" | "error";
  path?: string;
  relativePath?: string;
  owner?: string;
  eligibleForCleanup: boolean;
  reason: string;
  updatedAt?: string;
};

export type PersistenceIntegrityReport = {
  schema: "zotero-agents.persistence_integrity_report.v1";
  generatedAt: string;
  root: string;
  issueCount: number;
  issues: PersistenceIntegrityIssue[];
};

export type PersistenceCleanupResult = {
  ok: true;
  dryRun: boolean;
  removedPaths: string[];
  skippedIssueIds: string[];
  report: PersistenceIntegrityReport;
};

export type PersistenceIntegrityScanProgress = {
  stage: string;
  label: string;
  current: number;
  total: number;
  percent: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ORPHAN_PRODUCT_ASSET_TTL_MS = 7 * DAY_MS;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizePath(value: unknown) {
  return cleanString(value).replace(/\\/g, "/");
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function issueId(
  type: PersistenceIntegrityIssueType,
  path: string,
  owner = "",
) {
  return `${type}:${hashId(`${type}:${normalizePath(path)}:${owner}`)}`;
}

function isOlderThan(
  stat: { lastModified?: number },
  nowMs: number,
  ttlMs: number,
) {
  const lastModified = Number(stat.lastModified || 0);
  return Number.isFinite(lastModified) && lastModified > 0
    ? nowMs - lastModified >= ttlMs
    : false;
}

function isUnderPath(root: string, target: string) {
  const rootPath = normalizePath(root).replace(/\/+$/g, "");
  const targetPath = normalizePath(target);
  return targetPath === rootPath || targetPath.startsWith(`${rootPath}/`);
}

function managedIssueTypeForDiagnostic(
  code: string,
): PersistenceIntegrityIssueType {
  if (code === "managed_path_reserved_name") {
    return "managed_path_reserved_name";
  }
  if (code === "managed_path_segment_too_long") {
    return "managed_path_segment_too_long";
  }
  if (code === "managed_relative_path_too_long") {
    return "managed_relative_path_too_long";
  }
  if (code === "managed_absolute_path_long") {
    return "managed_absolute_path_long";
  }
  if (code === "managed_path_case_collision") {
    return "managed_path_case_collision";
  }
  return "managed_path_invalid";
}

function basenameOf(path: string) {
  return normalizePath(path).split("/").filter(Boolean).pop() || "";
}

function directoryOf(path: string) {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : "";
}

function isLegacyLongCanonicalFilename(relativePath: string) {
  const normalized = normalizePath(relativePath);
  const name = basenameOf(normalized);
  return (
    normalized.startsWith("citation-graph/") &&
    (name.length > 96 ||
      /^(work|reference|resolution|context|cleanup)[_-]/i.test(name))
  );
}

async function collectManagedPathPolicyIssues(args: {
  root: string;
  owner: string;
}) {
  const issues: PersistenceIntegrityIssue[] = [];
  const byDirectoryAndName = new Map<string, string>();
  for (const file of await collectRuntimeFiles(args.root)) {
    const relativePath = runtimeRelativePath(args.root, file);
    const validation = validateManagedRelativePath(relativePath);
    for (const diagnostic of validation.diagnostics) {
      issues.push({
        id: issueId(
          managedIssueTypeForDiagnostic(diagnostic.code),
          relativePath,
          args.owner,
        ),
        type: managedIssueTypeForDiagnostic(diagnostic.code),
        severity: diagnostic.severity,
        relativePath,
        owner: args.owner,
        eligibleForCleanup: false,
        reason: diagnostic.message,
      });
    }

    const absolute = validateManagedAbsolutePath(file);
    for (const diagnostic of absolute.diagnostics) {
      issues.push({
        id: issueId("managed_absolute_path_long", relativePath, args.owner),
        type: "managed_absolute_path_long",
        severity: "warning",
        relativePath,
        owner: args.owner,
        eligibleForCleanup: false,
        reason: diagnostic.message,
      });
    }

    const directory = directoryOf(relativePath).toLowerCase();
    const name = basenameOf(relativePath);
    const caseKey = `${directory}/${name.toLowerCase()}`;
    const existing = byDirectoryAndName.get(caseKey);
    if (existing && existing !== relativePath) {
      issues.push({
        id: issueId("managed_path_case_collision", relativePath, args.owner),
        type: "managed_path_case_collision",
        severity: "error",
        relativePath,
        owner: args.owner,
        eligibleForCleanup: false,
        reason: "managed file path collides on case-insensitive filesystems",
      });
    } else {
      byDirectoryAndName.set(caseKey, relativePath);
    }

    if (isLegacyLongCanonicalFilename(relativePath)) {
      issues.push({
        id: issueId("legacy_long_canonical_filename", relativePath, args.owner),
        type: "legacy_long_canonical_filename",
        severity: "warning",
        relativePath,
        owner: args.owner,
        eligibleForCleanup: false,
        reason:
          "legacy canonical filename should be replaced by short stable managed filenames",
      });
    }
  }
  return issues;
}

export async function scanPersistenceIntegrity(args?: {
  root?: string;
  nowMs?: number;
  onProgress?: (progress: PersistenceIntegrityScanProgress) => void;
}): Promise<PersistenceIntegrityReport> {
  const paths = getRuntimePersistencePaths(args?.root);
  const nowMs = Math.max(0, Math.floor(Number(args?.nowMs || Date.now())));
  const issues: PersistenceIntegrityIssue[] = [];
  const referencedFiles = new Set<string>();
  const totalSteps = 6;
  let completedSteps = 0;
  const reportProgress = (stage: string, label: string) => {
    completedSteps = Math.min(totalSteps, completedSteps + 1);
    args?.onProgress?.({
      stage,
      label,
      current: completedSteps,
      total: totalSteps,
      percent: Math.floor((completedSteps / totalSteps) * 100),
    });
  };

  for (const product of listWorkflowProducts()) {
    for (const asset of product.assets || []) {
      const localPath = cleanString(asset.localPath);
      if (!localPath) {
        continue;
      }
      referencedFiles.add(normalizePath(localPath));
      if (!(await runtimePathExists(localPath))) {
        issues.push({
          id: issueId("missing_file_for_db_row", localPath, product.productId),
          type: "missing_file_for_db_row",
          severity: "warning",
          path: localPath,
          relativePath: runtimeRelativePath(paths.root, localPath),
          owner: `workflow-product:${product.productId}`,
          eligibleForCleanup: false,
          reason:
            "workflow product metadata references a missing managed product asset",
        });
      }
    }
  }
  reportProgress("integrity:workflow-products-db", "Workflow product records");

  const workflowProductsRoot = joinPath(
    paths.runtimeRoot,
    "workflow-products",
    "assets",
  );
  for (const file of await collectRuntimeFiles(workflowProductsRoot)) {
    const normalized = normalizePath(file);
    if (referencedFiles.has(normalized)) {
      continue;
    }
    const stat = await statRuntimePath(file);
    const eligible = isOlderThan(stat, nowMs, ORPHAN_PRODUCT_ASSET_TTL_MS);
    issues.push({
      id: issueId("orphan_file_without_db_row", file, "workflow-products"),
      type: "orphan_file_without_db_row",
      severity: eligible ? "warning" : "info",
      path: file,
      relativePath: runtimeRelativePath(paths.root, file),
      owner: "workflow-products",
      eligibleForCleanup: eligible,
      reason: "managed workflow product asset has no owning SQLite row",
      updatedAt: stat.lastModified
        ? new Date(stat.lastModified).toISOString()
        : undefined,
    });
  }
  reportProgress(
    "integrity:workflow-products-assets",
    "Workflow product assets",
  );

  for (const asset of await collectExpiredRuntimeAssets({
    root: args?.root,
    nowMs,
  })) {
    issues.push({
      id: issueId("expired_runtime_asset", asset.path, asset.owner),
      type: "expired_runtime_asset",
      severity: "info",
      path: asset.path,
      relativePath: asset.relativePath,
      owner: asset.owner,
      eligibleForCleanup: true,
      reason: `${asset.owner} asset exceeded configured TTL`,
      updatedAt: asset.lastModified
        ? new Date(asset.lastModified).toISOString()
        : undefined,
    });
  }
  reportProgress("integrity:expired-assets", "Expired runtime assets");

  const runtimeSynthesis = joinPath(paths.runtimeRoot, "synthesis");
  if (await runtimePathExists(runtimeSynthesis)) {
    const allowedRuntimeSynthesisRoots = new Set([
      "git-sync",
      "git-sync-worktree",
      "webdav-sync",
    ]);
    for (const child of await listRuntimeChildren(runtimeSynthesis)) {
      const childName = basenameOf(child);
      if (allowedRuntimeSynthesisRoots.has(childName)) {
        continue;
      }
      issues.push({
        id: issueId("forbidden_durable_asset_in_runtime", child),
        type: "forbidden_durable_asset_in_runtime",
        severity: "error",
        path: child,
        relativePath: runtimeRelativePath(paths.root, child),
        owner: "synthesis",
        eligibleForCleanup: false,
        reason:
          "durable synthesis canonical store must not live in runtime outside sync workspaces",
      });
    }
  }
  reportProgress("integrity:runtime-synthesis", "Runtime synthesis workspace");

  const oldRuntimeSynthesis = joinPath(paths.root, "synthesis");
  if (
    oldRuntimeSynthesis !== paths.synthesisDataRoot &&
    (await runtimePathExists(oldRuntimeSynthesis))
  ) {
    issues.push({
      id: issueId("legacy_synthesis_root_present", oldRuntimeSynthesis),
      type: "legacy_synthesis_root_present",
      severity: "warning",
      path: oldRuntimeSynthesis,
      relativePath: runtimeRelativePath(paths.root, oldRuntimeSynthesis),
      owner: "legacy-synthesis",
      eligibleForCleanup: false,
      reason: "legacy synthesis root requires explicit migration",
    });
  }
  reportProgress("integrity:legacy-roots", "Legacy persistence roots");

  for (const issue of await collectManagedPathPolicyIssues({
    root: paths.synthesisDataRoot,
    owner: "synthesis-canonical",
  })) {
    issues.push(issue);
  }
  reportProgress("integrity:managed-paths", "Managed synthesis paths");

  const report: PersistenceIntegrityReport = {
    schema: "zotero-agents.persistence_integrity_report.v1",
    generatedAt: new Date(nowMs).toISOString(),
    root: paths.root,
    issueCount: issues.length,
    issues: issues.sort((left, right) => left.id.localeCompare(right.id)),
  };
  return report;
}

export async function cleanupPersistenceIssues(args?: {
  root?: string;
  issueIds?: string[];
  dryRun?: boolean;
  nowMs?: number;
}): Promise<PersistenceCleanupResult> {
  const paths = getRuntimePersistencePaths(args?.root);
  const report = await scanPersistenceIntegrity(args);
  const dryRun = args?.dryRun !== false;
  const selected = new Set(
    (args?.issueIds || []).map(cleanString).filter(Boolean),
  );
  const removedPaths: string[] = [];
  const skippedIssueIds: string[] = [];
  for (const issue of report.issues) {
    if (selected.size > 0 && !selected.has(issue.id)) {
      continue;
    }
    const path = cleanString(issue.path);
    const cleanable =
      issue.eligibleForCleanup &&
      path &&
      isUnderPath(paths.runtimeRoot, path) &&
      !isUnderPath(paths.dataDir, path) &&
      path !== paths.stateDbPath &&
      path !== paths.synthesisDbPath;
    if (!cleanable) {
      skippedIssueIds.push(issue.id);
      continue;
    }
    if (!dryRun && (await removeRuntimePath(path))) {
      removedPaths.push(path);
    }
  }
  return {
    ok: true,
    dryRun,
    removedPaths,
    skippedIssueIds,
    report,
  };
}

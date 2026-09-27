import { joinPath } from "../utils/path";
import { getTaskHistoryRetentionConfig } from "./taskRetentionPolicy";
import {
  clearAcpConversationTaskRecords,
  clearPluginRunStore,
  clearPluginTaskDomain,
  clearPluginTaskScope,
  countAcpConversationTaskRecords,
  countPluginRunStore,
  countPluginTaskDomain,
  countPluginTaskScope,
  estimateAcpConversationTaskRecordsBytes,
  estimatePluginRunStoreBytes,
  estimatePluginTaskDomainBytes,
  estimatePluginTaskScopeBytes,
} from "./pluginStateStore";
import { clearRuntimeLogs } from "./runtimeLogManager";
import {
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
import {
  deriveWorkflowProductAssetLocalPath,
  getWorkflowProductMigrationStatus,
  listWorkflowProducts,
} from "./workflow/catalog/workflowProductStore";

export type RuntimePersistenceCategory =
  | "logs"
  | "skillrunner-ledger"
  | "acp-conversations"
  | "acp-skill-runs"
  | "workflow-products"
  | "cache"
  | "tmp";

export type RuntimePersistenceCategoryUsage = {
  category: RuntimePersistenceCategory;
  label: string;
  path?: string;
  bytes: number;
  exists: boolean;
  cleanable: boolean;
  itemCount?: number;
  recordCount?: number;
};

export type RuntimePersistenceStateDatabaseUsage = {
  kind?: "runtime" | "synthesis";
  path: string;
  bytes: number;
  exists: boolean;
  itemCount?: number;
};

export type RuntimePersistenceUsageSnapshot = {
  root: string;
  scannedAt: string;
  totalBytes: number;
  categories: RuntimePersistenceCategoryUsage[];
  stateDatabase?: RuntimePersistenceStateDatabaseUsage;
  stateDatabases?: RuntimePersistenceStateDatabaseUsage[];
};

export type RuntimePersistenceGovernanceProgress = {
  stage: string;
  label: string;
  current: number;
  total: number;
  percent: number;
};

export type PersistenceIntegrityIssueType =
  | "missing_file_for_db_row"
  | "orphan_file_without_db_row"
  | "workflow_product_migration_incomplete"
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

const DAY_MS = 24 * 60 * 60 * 1000;
const ORPHAN_PRODUCT_ASSET_TTL_MS = 7 * DAY_MS;
type RuntimeExpiredAssetOwner = "tmp" | "cache" | "logs";

const RUNTIME_EXPIRED_ASSET_TTL_MS: Record<RuntimeExpiredAssetOwner, number> = {
  tmp: DAY_MS,
  cache: 30 * DAY_MS,
  logs: 30 * DAY_MS,
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizePath(value: unknown) {
  return cleanString(value).replace(/\\/g, "/");
}

async function getRuntimePathSize(pathRaw: string) {
  const path = cleanString(pathRaw);
  const stat = await statRuntimePath(path);
  if (!stat.exists) return { bytes: 0, itemCount: 0, exists: false };
  if (!stat.isDir) return { bytes: stat.size, itemCount: 1, exists: true };
  let bytes = 0;
  let itemCount = 0;
  const stack = [path];
  while (stack.length > 0) {
    const current = stack.pop() || "";
    for (const child of await listRuntimeChildren(current)) {
      const childStat = await statRuntimePath(child);
      if (!childStat.exists) continue;
      itemCount += 1;
      if (childStat.isDir) stack.push(child);
      else bytes += childStat.size;
    }
  }
  return { bytes, itemCount, exists: true };
}

async function collectExpiredRuntimeAssets(args?: {
  root?: string;
  nowMs?: number;
}) {
  const paths = getRuntimePersistencePaths(args?.root);
  const nowMs = Math.max(0, Number(args?.nowMs || 0) || 0) || Date.now();
  const roots = {
    tmp: paths.tmpDir,
    cache: paths.cacheDir,
    logs: paths.logsDir,
  } satisfies Record<RuntimeExpiredAssetOwner, string>;
  const assets: Array<{
    owner: RuntimeExpiredAssetOwner;
    root: string;
    path: string;
    relativePath: string;
    lastModified?: number;
  }> = [];
  for (const owner of Object.keys(roots) as RuntimeExpiredAssetOwner[]) {
    const root = roots[owner];
    const ttlMs = RUNTIME_EXPIRED_ASSET_TTL_MS[owner];
    for (const file of await collectRuntimeFiles(root)) {
      const stat = await statRuntimePath(file);
      const lastModified = Number(stat.lastModified || 0);
      if (
        !stat.exists ||
        !Number.isFinite(lastModified) ||
        lastModified <= 0 ||
        nowMs - lastModified < ttlMs
      ) {
        continue;
      }
      assets.push({
        owner,
        root,
        path: file,
        relativePath: runtimeRelativePath(paths.root, file),
        lastModified: stat.lastModified,
      });
    }
  }
  return assets.sort((left, right) => left.path.localeCompare(right.path));
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

async function scanPersistenceIntegrity(args?: {
  root?: string;
  nowMs?: number;
  onProgress?: (progress: RuntimePersistenceGovernanceProgress) => void;
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
      if (asset.availability !== "available") {
        continue;
      }
      const localPath = await deriveWorkflowProductAssetLocalPath(
        product,
        asset,
      );
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
  const productMigration = getWorkflowProductMigrationStatus();
  if (productMigration.state === "failed") {
    issues.push({
      id: issueId(
        "workflow_product_migration_incomplete",
        productMigration.failedProductIds.join("\n"),
        "workflow-products",
      ),
      type: "workflow_product_migration_incomplete",
      severity: "error",
      owner: "workflow-products",
      eligibleForCleanup: false,
      reason: "workflow Product storage migration is incomplete and retryable",
    });
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
    const allowedRuntimeSynthesisRoots = new Set(["webdav-sync"]);
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

async function cleanupPersistenceIssues(args?: {
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

async function scanRuntimePersistenceUsage(
  args: {
    onProgress?: (progress: RuntimePersistenceGovernanceProgress) => void;
  } = {},
): Promise<RuntimePersistenceUsageSnapshot> {
  const paths = getRuntimePersistencePaths();
  const definitions: Array<{
    category: RuntimePersistenceCategory;
    label: string;
    path?: string;
    recordCount?: () => number;
    recordBytes?: () => number;
    fileBacked?: boolean;
  }> = [
    {
      category: "logs",
      label: "Runtime logs",
      path: paths.logsDir,
      fileBacked: true,
    },
    {
      category: "skillrunner-ledger",
      label: "SkillRunner local ledger",
      path: paths.stateDbPath,
      recordCount: () =>
        countPluginRunStore("skillrunner") +
        countPluginTaskDomain("skillrunner"),
      recordBytes: () =>
        estimatePluginRunStoreBytes("skillrunner") +
        estimatePluginTaskDomainBytes("skillrunner"),
    },
    {
      category: "acp-conversations",
      label: "ACP conversations",
      path: paths.acpChatRoot,
      recordCount: countAcpConversationTaskRecords,
      recordBytes: estimateAcpConversationTaskRecordsBytes,
      fileBacked: true,
    },
    {
      category: "acp-skill-runs",
      label: "ACP skill runs",
      path: paths.acpSkillRunsDir,
      recordCount: () =>
        countPluginRunStore("acp") + countPluginTaskScope("acp", "skill-runs"),
      recordBytes: () =>
        estimatePluginRunStoreBytes("acp") +
        estimatePluginTaskScopeBytes("acp", "skill-runs"),
      fileBacked: true,
    },
    {
      category: "workflow-products",
      label: "Workflow products",
      path: paths.workflowProductsDir,
      recordCount: () => countPluginTaskScope("workflow-products", "products"),
      recordBytes: () =>
        estimatePluginTaskScopeBytes("workflow-products", "products"),
      fileBacked: true,
    },
    {
      category: "cache",
      label: "Cache",
      path: paths.cacheDir,
      fileBacked: true,
    },
    {
      category: "tmp",
      label: "Temporary files",
      path: paths.tmpDir,
      fileBacked: true,
    },
  ];
  const categories: RuntimePersistenceCategoryUsage[] = [];
  const totalSteps = definitions.length + 2;
  let completedSteps = 0;
  const reportProgress = (stage: string, label: string) => {
    completedSteps = Math.min(totalSteps, completedSteps + 1);
    args.onProgress?.({
      stage,
      label,
      current: completedSteps,
      total: totalSteps,
      percent: Math.floor((completedSteps / totalSteps) * 100),
    });
  };
  for (const definition of definitions) {
    const size =
      definition.path && definition.fileBacked
        ? await getRuntimePathSize(definition.path)
        : { bytes: 0, itemCount: 0, exists: false };
    const recordCount = definition.recordCount?.() || 0;
    const recordBytes = definition.recordBytes?.() || 0;
    categories.push({
      category: definition.category,
      label: definition.label,
      path: definition.path,
      bytes: size.bytes + recordBytes,
      exists: size.exists || recordCount > 0,
      cleanable: true,
      itemCount: size.itemCount,
      recordCount,
    });
    reportProgress(`usage:${definition.category}`, definition.label);
  }
  const stateDatabaseSize = await getRuntimePathSize(paths.stateDbPath);
  const synthesisDatabaseSize = await getRuntimePathSize(paths.synthesisDbPath);
  reportProgress("usage:state-db", "State database");
  reportProgress("usage:synthesis-db", "Synthesis database");
  const stateDatabases: RuntimePersistenceStateDatabaseUsage[] = [
    {
      kind: "runtime",
      path: paths.stateDbPath,
      bytes: stateDatabaseSize.bytes,
      exists: stateDatabaseSize.exists,
      itemCount: stateDatabaseSize.itemCount,
    },
    {
      kind: "synthesis",
      path: paths.synthesisDbPath,
      bytes: synthesisDatabaseSize.bytes,
      exists: synthesisDatabaseSize.exists,
      itemCount: synthesisDatabaseSize.itemCount,
    },
  ];
  return {
    root: paths.root,
    scannedAt: new Date().toISOString(),
    totalBytes: categories.reduce((sum, entry) => sum + entry.bytes, 0),
    categories,
    stateDatabase: stateDatabases[0],
    stateDatabases,
  };
}

export type RuntimePersistenceGovernanceSnapshot = {
  usage: RuntimePersistenceUsageSnapshot;
  integrity: PersistenceIntegrityReport;
};

export async function scanRuntimePersistenceGovernance(
  args: {
    nowMs?: number;
    onProgress?: (progress: RuntimePersistenceGovernanceProgress) => void;
  } = {},
): Promise<RuntimePersistenceGovernanceSnapshot> {
  if (!args.onProgress) {
    const [usage, integrity] = await Promise.all([
      scanRuntimePersistenceUsage(),
      scanPersistenceIntegrity({ nowMs: args.nowMs }),
    ]);
    return { usage, integrity };
  }
  let usageStepCount = 0;
  let integrityStepCount = 0;
  const usage = await scanRuntimePersistenceUsage({
    onProgress: (progress) => {
      usageStepCount = Math.max(usageStepCount, progress.total);
      args.onProgress?.({
        ...progress,
        percent: Math.floor(progress.percent / 2),
      });
    },
  });
  const integrity = await scanPersistenceIntegrity({
    nowMs: args.nowMs,
    onProgress: (progress) => {
      integrityStepCount = Math.max(integrityStepCount, progress.total);
      args.onProgress?.({
        ...progress,
        current: usageStepCount + progress.current,
        total: usageStepCount + progress.total,
        percent: 50 + Math.floor(progress.percent / 2),
      });
    },
  });
  args.onProgress({
    stage: "complete",
    label: "Persistence scan complete",
    current: usageStepCount + integrityStepCount,
    total: usageStepCount + integrityStepCount,
    percent: 100,
  });
  return { usage, integrity };
}

export type RuntimePersistenceCategoryCleanupResult = {
  ok: true;
  category: RuntimePersistenceCategory;
  removedPaths: string[];
  details: Record<string, unknown>;
  usage: RuntimePersistenceUsageSnapshot;
};

export async function cleanupRuntimePersistenceCategory(
  category: RuntimePersistenceCategory,
): Promise<RuntimePersistenceCategoryCleanupResult> {
  const paths = getRuntimePersistencePaths();
  const removedPaths: string[] = [];
  const details: Record<string, unknown> = {};
  const removeAndTrack = async (path: string) => {
    if (await removeRuntimePath(path)) removedPaths.push(path);
  };

  if (category === "logs") {
    await clearRuntimeLogs();
    await removeAndTrack(paths.logsDir);
  } else if (category === "skillrunner-ledger") {
    const runStoreRowsDeleted = clearPluginRunStore("skillrunner");
    const legacyRowsDeleted = clearPluginTaskDomain("skillrunner");
    details.rowsDeleted = runStoreRowsDeleted + legacyRowsDeleted;
    details.runStoreRowsDeleted = runStoreRowsDeleted;
    details.legacyRowsDeleted = legacyRowsDeleted;
  } else if (category === "acp-conversations") {
    details.rowsDeleted = clearAcpConversationTaskRecords();
    await removeAndTrack(paths.acpChatRoot);
  } else if (category === "acp-skill-runs") {
    const runStoreRowsDeleted = clearPluginRunStore("acp");
    const legacyRowsDeleted = clearPluginTaskScope("acp", "skill-runs");
    details.rowsDeleted = runStoreRowsDeleted + legacyRowsDeleted;
    details.runStoreRowsDeleted = runStoreRowsDeleted;
    details.legacyRowsDeleted = legacyRowsDeleted;
    const { clearAcpSkillRunsForRuntimePersistence } =
      await import("./acp/skillRun/acpSkillRunStore");
    clearAcpSkillRunsForRuntimePersistence();
    await removeAndTrack(paths.acpSkillRunsDir);
  } else if (category === "workflow-products") {
    details.rowsDeleted = clearPluginTaskScope("workflow-products", "products");
    await removeAndTrack(paths.workflowProductsDir);
  } else if (category === "cache") {
    await removeAndTrack(paths.cacheDir);
  } else if (category === "tmp") {
    await removeAndTrack(paths.tmpDir);
  }

  return {
    ok: true,
    category,
    removedPaths,
    details,
    usage: await scanRuntimePersistenceUsage(),
  };
}

export type RuntimePersistenceIssuesCleanupResult = {
  cleanup: PersistenceCleanupResult;
  usage: RuntimePersistenceUsageSnapshot;
  integrity: PersistenceIntegrityReport;
};

export async function cleanupRuntimePersistenceIssues(args?: {
  issueIds?: string[];
  dryRun?: boolean;
  nowMs?: number;
}): Promise<RuntimePersistenceIssuesCleanupResult> {
  const cleanup = await cleanupPersistenceIssues(args);
  const [usage, integrity] = await Promise.all([
    scanRuntimePersistenceUsage(),
    scanPersistenceIntegrity(),
  ]);
  return { cleanup, usage, integrity };
}

export type RuntimePersistenceRetentionCleanupResult = {
  ok: true;
  removedPaths: string[];
  details: Record<string, unknown>;
  usage: RuntimePersistenceUsageSnapshot;
};

export async function cleanupRuntimePersistenceRetention(args?: {
  nowMs?: number;
}): Promise<RuntimePersistenceRetentionCleanupResult> {
  const paths = getRuntimePersistencePaths();
  const nowMs = Math.max(0, Number(args?.nowMs || 0) || 0) || Date.now();
  const retention = getTaskHistoryRetentionConfig();
  const details: Record<string, unknown> = {
    retentionDays: retention.retentionDays,
    retentionMs: retention.retentionMs,
  };
  const removedPaths: string[] = [];
  const { cleanupExpiredAcpSkillRunsForRetention } =
    await import("./acp/skillRun/acpSkillRunPersistence");
  const cleanerResult = cleanupExpiredAcpSkillRunsForRetention({
    retentionMs: retention.retentionMs,
    nowMs,
  });
  details.acpSkillRunRowsDeleted = cleanerResult.rowsDeleted;
  details.acpSkillRunRequestIds = cleanerResult.requestIds;
  const runtimeDirs = Array.from(
    new Set([
      ...cleanerResult.workspaceDirs,
      ...(cleanerResult.runtimeDirs || []),
    ]),
  ).sort((left, right) => left.length - right.length);
  for (const runtimeDir of runtimeDirs) {
    if (!isUnderPath(paths.acpSkillRunsDir, runtimeDir)) continue;
    if (await removeRuntimePath(runtimeDir)) removedPaths.push(runtimeDir);
  }
  const expiredAssets = await collectExpiredRuntimeAssets({ nowMs });
  const expiredByOwner: Record<RuntimeExpiredAssetOwner, number> = {
    tmp: 0,
    cache: 0,
    logs: 0,
  };
  for (const asset of expiredAssets) {
    if (!isUnderPath(asset.root, asset.path)) continue;
    if (await removeRuntimePath(asset.path)) {
      removedPaths.push(asset.path);
      expiredByOwner[asset.owner] += 1;
    }
  }
  details.expiredRuntimeAssetCount = expiredAssets.length;
  details.expiredRuntimeAssetsDeleted = expiredByOwner;
  return {
    ok: true,
    removedPaths,
    details,
    usage: await scanRuntimePersistenceUsage(),
  };
}

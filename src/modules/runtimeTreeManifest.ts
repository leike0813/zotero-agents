export type RuntimeTreeEntry = {
  relativePath: string;
  absolutePath: string;
  kind: "file" | "directory";
  size: number;
  mtime?: number;
};

export type RuntimeTreeIssue = {
  code: "runtime_tree_list_failed" | "runtime_tree_stat_failed";
  relativePath: string;
  message: string;
};

export type RuntimeTreeWarning = {
  code:
    | "runtime_tree_depth_observed"
    | "runtime_tree_entries_observed"
    | "runtime_tree_bytes_observed";
  policy: RuntimeTreePolicyName;
  observed: number;
  budget: number;
};

export type RuntimeTreeManifest = {
  root: string;
  entries: RuntimeTreeEntry[];
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  maxDepth: number;
  issues: RuntimeTreeIssue[];
  warnings: RuntimeTreeWarning[];
};

export type RuntimeTreePolicyName =
  | "skill"
  | "workspace-result"
  | "agent-run-bundle"
  | "general";

export type RuntimeTreeScanPolicy = {
  name: RuntimeTreePolicyName;
  warningBudget: {
    depth: number;
    entries: number;
    bytes?: number;
  };
  excludedRootDirectories?: readonly string[];
};

export type RuntimeTreeIo = {
  stat: (path: string) => Promise<{
    exists: boolean;
    isDir: boolean;
    size: number;
    lastModified?: number;
  }>;
  list: (path: string) => Promise<string[]>;
};

const MIB = 1024 * 1024;

export const RUNTIME_TREE_POLICIES: Readonly<
  Record<RuntimeTreePolicyName, RuntimeTreeScanPolicy>
> = Object.freeze({
  skill: Object.freeze({
    name: "skill",
    warningBudget: Object.freeze({
      depth: 64,
      entries: 20_000,
      bytes: 512 * MIB,
    }),
  }),
  "workspace-result": Object.freeze({
    name: "workspace-result",
    warningBudget: Object.freeze({ depth: 64, entries: 20_000 }),
    excludedRootDirectories: Object.freeze([".acp", "result"]),
  }),
  "agent-run-bundle": Object.freeze({
    name: "agent-run-bundle",
    warningBudget: Object.freeze({
      depth: 64,
      entries: 10_000,
      bytes: 512 * MIB,
    }),
  }),
  general: Object.freeze({
    name: "general",
    warningBudget: Object.freeze({
      depth: 64,
      entries: 50_000,
      bytes: 1024 * MIB,
    }),
  }),
});

const BASE_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
]);

function normalizeSlashes(path: string) {
  return String(path || "").replace(/\\/g, "/");
}

function baseName(path: string) {
  return normalizeSlashes(path).split("/").filter(Boolean).pop() || "";
}

function joinRelative(parent: string, name: string) {
  return parent ? `${parent}/${name}` : name;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function isExcludedDirectory(
  name: string,
  relativePath: string,
  policy: RuntimeTreeScanPolicy,
) {
  return (
    BASE_EXCLUDED_DIRECTORIES.has(name) ||
    (!relativePath.includes("/") &&
      (policy.excludedRootDirectories || []).includes(name))
  );
}

function isExcludedFile(name: string) {
  return name.endsWith(".pyc") || name.endsWith(".pyo");
}

function buildWarnings(args: {
  policy: RuntimeTreeScanPolicy;
  maxDepth: number;
  entries: number;
  bytes: number;
}) {
  const warnings: RuntimeTreeWarning[] = [];
  const add = (
    code: RuntimeTreeWarning["code"],
    observed: number,
    budget: number | undefined,
  ) => {
    if (budget !== undefined && observed > budget) {
      warnings.push({ code, policy: args.policy.name, observed, budget });
    }
  };
  add(
    "runtime_tree_depth_observed",
    args.maxDepth,
    args.policy.warningBudget.depth,
  );
  add(
    "runtime_tree_entries_observed",
    args.entries,
    args.policy.warningBudget.entries,
  );
  add(
    "runtime_tree_bytes_observed",
    args.bytes,
    args.policy.warningBudget.bytes,
  );
  return warnings;
}

export async function scanRuntimeTreeWithIo(args: {
  root: string;
  policy: RuntimeTreeScanPolicy;
  io: RuntimeTreeIo;
}): Promise<RuntimeTreeManifest> {
  const root = String(args.root || "")
    .trim()
    .replace(/[\\/]+$/g, "");
  const entries: RuntimeTreeEntry[] = [];
  const issues: RuntimeTreeIssue[] = [];
  let rootStat;
  try {
    rootStat = await args.io.stat(root);
  } catch (error) {
    issues.push({
      code: "runtime_tree_stat_failed",
      relativePath: "",
      message: errorMessage(error),
    });
  }
  if (!rootStat?.exists || !rootStat.isDir) {
    if (!issues.length) {
      issues.push({
        code: "runtime_tree_stat_failed",
        relativePath: "",
        message: "runtime tree root is unavailable",
      });
    }
    return {
      root,
      entries,
      fileCount: 0,
      directoryCount: 0,
      totalBytes: 0,
      maxDepth: 0,
      issues,
      warnings: [],
    };
  }

  const pending: Array<{ absolutePath: string; relativePath: string }> = [
    { absolutePath: root, relativePath: "" },
  ];
  while (pending.length) {
    const current = pending.pop()!;
    let children: string[];
    try {
      children = await args.io.list(current.absolutePath);
    } catch (error) {
      issues.push({
        code: "runtime_tree_list_failed",
        relativePath: current.relativePath,
        message: errorMessage(error),
      });
      continue;
    }
    for (const absolutePath of [...children].sort((left, right) =>
      normalizeSlashes(left).localeCompare(normalizeSlashes(right)),
    )) {
      const name = baseName(absolutePath);
      const relativePath = joinRelative(current.relativePath, name);
      let stat;
      try {
        stat = await args.io.stat(absolutePath);
      } catch (error) {
        issues.push({
          code: "runtime_tree_stat_failed",
          relativePath,
          message: errorMessage(error),
        });
        continue;
      }
      if (!stat.exists) {
        issues.push({
          code: "runtime_tree_stat_failed",
          relativePath,
          message: "runtime tree entry is unavailable",
        });
        continue;
      }
      if (stat.isDir) {
        if (isExcludedDirectory(name, relativePath, args.policy)) continue;
        entries.push({
          relativePath,
          absolutePath,
          kind: "directory",
          size: 0,
          ...(stat.lastModified ? { mtime: stat.lastModified } : {}),
        });
        pending.push({ absolutePath, relativePath });
      } else if (!isExcludedFile(name)) {
        entries.push({
          relativePath,
          absolutePath,
          kind: "file",
          size: Math.max(0, Number(stat.size || 0) || 0),
          ...(stat.lastModified ? { mtime: stat.lastModified } : {}),
        });
      }
    }
  }

  entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
  const files = entries.filter((entry) => entry.kind === "file");
  const directories = entries.length - files.length;
  const totalBytes = files.reduce((total, entry) => total + entry.size, 0);
  const maxDepth = entries.reduce(
    (maximum, entry) =>
      Math.max(maximum, entry.relativePath.split("/").filter(Boolean).length),
    0,
  );
  return {
    root,
    entries,
    fileCount: files.length,
    directoryCount: directories,
    totalBytes,
    maxDepth,
    issues,
    warnings: buildWarnings({
      policy: args.policy,
      maxDepth,
      entries: entries.length,
      bytes: totalBytes,
    }),
  };
}

export function rebaseRuntimeTreeManifest(
  manifest: RuntimeTreeManifest,
  targetRoot: string,
): RuntimeTreeManifest {
  const root = String(targetRoot || "").replace(/[\\/]+$/g, "");
  return {
    ...manifest,
    root,
    entries: manifest.entries.map((entry) => ({
      ...entry,
      absolutePath: `${root}/${entry.relativePath}`.replace(/\\/g, "/"),
    })),
  };
}

import {
  getBaseName,
  getParentPath,
  normalizeNativeLocalPath,
} from "../platform/path";
import { joinPath } from "../utils/path";

export type WorkflowStoredAttachmentImportRequest = {
  path: string;
  targetFilename?: string | null;
  companionFiles?: Array<{
    sourcePath: string;
    relativePath: string;
  }>;
};

export type WorkflowStoredAttachmentStagerDependencies = {
  getStagingRoot: () => string;
  validateSource?: (
    path: string,
  ) => Promise<{ sizeBytes: number } | undefined | void>;
  ensureDirectory: (path: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
  removePath: (path: string) => Promise<unknown>;
};

type ValidatedCompanion = {
  sourcePath: string;
  segments: string[];
  normalizedTarget: string;
};

const STORED_ATTACHMENT_ENTRY_LIMIT = 10_000;
const STORED_ATTACHMENT_TOTAL_BYTE_LIMIT = 4 * 1024 * 1024 * 1024;

export class WorkflowStoredAttachmentInputError extends Error {
  constructor(
    message: string,
    readonly resource?: {
      resource: "entries" | "bytes";
      limit: number;
      observed: number;
    },
  ) {
    super(message);
    this.name = "WorkflowStoredAttachmentInputError";
  }
}

function normalizeCompanionPath(value: unknown) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new WorkflowStoredAttachmentInputError(
      `Unsafe companion file path: ${String(value || "")}`,
    );
  }
  return segments;
}

function requireNativePath(value: unknown, label: string) {
  const path = normalizeNativeLocalPath(String(value || ""));
  if (!path) throw new WorkflowStoredAttachmentInputError(`${label} is invalid`);
  return path;
}

function attachCleanupFailure(primaryError: unknown, cleanupError: unknown) {
  if (!(primaryError instanceof Error)) return;
  try {
    const errorWithCleanup = primaryError as Error & {
      cleanupErrors?: unknown[];
    };
    errorWithCleanup.cleanupErrors = [
      ...(errorWithCleanup.cleanupErrors || []),
      cleanupError,
    ];
  } catch {
    // Preserve the primary failure even when it cannot carry diagnostics.
  }
}

function createStagingDirectory(root: string) {
  const nonce = Math.random().toString(36).slice(2, 10) || "import";
  return joinPath(root, `${Date.now().toString(36)}-${nonce}`);
}

async function removeStagingDirectory(
  dependencies: Pick<WorkflowStoredAttachmentStagerDependencies, "removePath">,
  stagingDirectory: string,
) {
  const removed = await dependencies.removePath(stagingDirectory);
  if (removed === false) {
    throw new Error("Managed attachment staging cleanup did not complete");
  }
}

export type WorkflowStagedAttachmentSources = {
  stagingDirectory: string;
  mainFilename: string;
  stagedMainPath: string;
  entries: Array<{ relativePath: string; stagedPath: string }>;
  cleanup(): Promise<void>;
};

export function createWorkflowStoredAttachmentStager(
  dependencies: Pick<
    WorkflowStoredAttachmentStagerDependencies,
    | "getStagingRoot"
    | "validateSource"
    | "ensureDirectory"
    | "copyFile"
    | "removePath"
  >,
) {
  return async function stageStoredAttachmentSources(
    request: Pick<
      WorkflowStoredAttachmentImportRequest,
      "path" | "targetFilename" | "companionFiles"
    >,
  ): Promise<WorkflowStagedAttachmentSources> {
    const path = requireNativePath(request?.path, "Stored attachment path");
    const companions: ValidatedCompanion[] = (
      request?.companionFiles || []
    ).map((companion) => {
      const segments = normalizeCompanionPath(companion?.relativePath);
      return {
        sourcePath: requireNativePath(
          companion?.sourcePath,
          "Companion source path",
        ),
        segments,
        normalizedTarget: segments.join("/").toLowerCase(),
      };
    });
    const entryCount = companions.length + 1;
    if (entryCount > STORED_ATTACHMENT_ENTRY_LIMIT) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment entry limit exceeded",
        {
          resource: "entries",
          limit: STORED_ATTACHMENT_ENTRY_LIMIT,
          observed: entryCount,
        },
      );
    }
    const requestedFilename = String(request?.targetFilename || "").trim();
    if (
      requestedFilename.includes("\0") ||
      (requestedFilename && getBaseName(requestedFilename) !== requestedFilename)
    ) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment target filename is invalid",
      );
    }
    const mainFilename = requestedFilename || getBaseName(path);
    if (!mainFilename) {
      throw new WorkflowStoredAttachmentInputError(
        "Stored attachment filename is invalid",
      );
    }
    const targets = new Set([mainFilename.toLowerCase()]);
    for (const companion of companions) {
      if (targets.has(companion.normalizedTarget)) {
        throw new WorkflowStoredAttachmentInputError(
          `Stored attachment targets collide: ${companion.segments.join("/")}`,
        );
      }
      targets.add(companion.normalizedTarget);
    }
    let totalBytes = 0;
    for (const sourcePath of [path, ...companions.map((entry) => entry.sourcePath)]) {
      const validation = await dependencies.validateSource?.(sourcePath);
      totalBytes += Math.max(0, Number(validation?.sizeBytes || 0));
      if (totalBytes > STORED_ATTACHMENT_TOTAL_BYTE_LIMIT) {
        throw new WorkflowStoredAttachmentInputError(
          "Stored attachment byte limit exceeded",
          {
            resource: "bytes",
            limit: STORED_ATTACHMENT_TOTAL_BYTE_LIMIT,
            observed: totalBytes,
          },
        );
      }
    }
    const stagingDirectory = createStagingDirectory(
      dependencies.getStagingRoot(),
    );
    const stagedMainPath = joinPath(stagingDirectory, mainFilename);
    const entries = companions.map((companion) => ({
      relativePath: companion.segments.join("/"),
      stagedPath: joinPath(stagingDirectory, ...companion.segments),
      sourcePath: companion.sourcePath,
    }));
    try {
      await dependencies.ensureDirectory(getParentPath(stagedMainPath));
      await dependencies.copyFile(path, stagedMainPath);
      for (const entry of entries) {
        await dependencies.ensureDirectory(getParentPath(entry.stagedPath));
        await dependencies.copyFile(entry.sourcePath, entry.stagedPath);
      }
      return {
        stagingDirectory,
        mainFilename,
        stagedMainPath,
        entries: entries.map(({ relativePath, stagedPath }) => ({
          relativePath,
          stagedPath,
        })),
        cleanup: () => removeStagingDirectory(dependencies, stagingDirectory),
      };
    } catch (primaryError) {
      try {
        await removeStagingDirectory(dependencies, stagingDirectory);
      } catch (cleanupError) {
        attachCleanupFailure(primaryError, cleanupError);
      }
      throw primaryError;
    }
  };
}

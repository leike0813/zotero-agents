import { getParentPath, normalizeNativeLocalPath } from "../platform/path";
import { joinPath } from "../utils/path";

export type WorkflowStoredAttachmentImportRequest = {
  parent?: Zotero.Item | number | string | null;
  path: string;
  title?: string | null;
  mimeType?: string | null;
  charset?: string | null;
  url?: string | null;
  companionFiles?: Array<{
    sourcePath: string;
    relativePath: string;
  }>;
};

type StoredAttachmentImportArgs = Omit<
  WorkflowStoredAttachmentImportRequest,
  "companionFiles"
>;

export type WorkflowStoredAttachmentImportDependencies = {
  getStagingRoot: () => string;
  ensureDirectory: (path: string) => Promise<void>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<void>;
  removePath: (path: string) => Promise<unknown>;
  importStoredFromPath: (
    args: StoredAttachmentImportArgs,
  ) => Promise<Zotero.Item>;
  removeAttachment: (attachment: Zotero.Item) => Promise<void>;
};

type ValidatedCompanion = {
  sourcePath: string;
  segments: string[];
};

function normalizeCompanionPath(value: unknown) {
  const normalized = String(value || "").trim().replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe companion file path: ${String(value || "")}`);
  }
  return segments;
}

function requireNativePath(value: unknown, label: string) {
  const path = normalizeNativeLocalPath(String(value || ""));
  if (!path) throw new Error(`${label} is invalid`);
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
  dependencies: WorkflowStoredAttachmentImportDependencies,
  stagingDirectory: string,
) {
  const removed = await dependencies.removePath(stagingDirectory);
  if (removed === false) {
    throw new Error("Managed attachment staging cleanup did not complete");
  }
}

export function createWorkflowStoredAttachmentImport(
  dependencies: WorkflowStoredAttachmentImportDependencies,
) {
  return async function importStoredFile(
    request: WorkflowStoredAttachmentImportRequest,
  ) {
    const path = requireNativePath(request?.path, "Stored attachment path");
    const companions: ValidatedCompanion[] = (
      request?.companionFiles || []
    ).map((companion) => ({
      sourcePath: requireNativePath(
        companion?.sourcePath,
        "Companion source path",
      ),
      segments: normalizeCompanionPath(companion?.relativePath),
    }));
    const importArgs: StoredAttachmentImportArgs = {
      parent: request?.parent,
      path,
      title: request?.title,
      mimeType: request?.mimeType,
      charset: request?.charset,
      url: request?.url,
    };
    if (!companions.length) {
      return dependencies.importStoredFromPath(importArgs);
    }

    const stagingDirectory = createStagingDirectory(
      dependencies.getStagingRoot(),
    );
    const stagedCompanions = companions.map((companion, index) => ({
      ...companion,
      stagedPath: joinPath(
        stagingDirectory,
        String(index),
        ...companion.segments,
      ),
    }));
    let attachment: Zotero.Item | null = null;
    try {
      for (const companion of stagedCompanions) {
        await dependencies.ensureDirectory(getParentPath(companion.stagedPath));
        await dependencies.copyFile(
          companion.sourcePath,
          companion.stagedPath,
        );
      }

      attachment = await dependencies.importStoredFromPath(importArgs);
      const storedPath = String(
        (await attachment.getFilePathAsync?.()) || "",
      ).trim();
      const storageRoot = getParentPath(storedPath);
      if (!storageRoot) {
        throw new Error("Stored attachment storage directory is unavailable");
      }
      for (const companion of stagedCompanions) {
        const targetPath = joinPath(storageRoot, ...companion.segments);
        await dependencies.ensureDirectory(getParentPath(targetPath));
        await dependencies.copyFile(companion.stagedPath, targetPath);
      }
      await removeStagingDirectory(dependencies, stagingDirectory);
      return attachment;
    } catch (primaryError) {
      if (attachment) {
        try {
          await dependencies.removeAttachment(attachment);
        } catch (cleanupError) {
          attachCleanupFailure(primaryError, cleanupError);
        }
      }
      try {
        await removeStagingDirectory(dependencies, stagingDirectory);
      } catch (cleanupError) {
        attachCleanupFailure(primaryError, cleanupError);
      }
      throw primaryError;
    }
  };
}

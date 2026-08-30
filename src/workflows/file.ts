import {
  copyRuntimeFile,
  ensureRuntimeDirectoryStrict,
  listRuntimeChildrenStrict,
  moveRuntimePath,
  readRuntimeBytes,
  readRuntimeTextFileStrict,
  removeRuntimePath,
  resolveRuntimeTemporaryDirectory,
  runtimePathExists,
  statRuntimePathStrict,
  writeRuntimeBytes,
  writeRuntimeTextFileStrict,
} from "../modules/runtimePersistence";
import { openRuntimeFilePicker } from "../platform/filePicker";
import { getBaseName, getParentPath, normalizeNativeLocalPath } from "../platform/path";
import { joinPath } from "../utils/path";
import type {
  WorkflowFileListEntryDto,
  WorkflowFileListRequestDto,
  WorkflowFileListResultDto,
  WorkflowFileRemoveResultDto,
  WorkflowFileStatDto,
} from "./types";
import { materializeWorkflowInputFile } from "./workflowInputMaterialization";

const FILE_LIMITS = Object.freeze({
  readTextBytes: 64 * 1024 * 1024,
  readBytes: 256 * 1024 * 1024,
  transferBytes: 4 * 1024 * 1024 * 1024,
  entries: 100_000,
  depth: 64,
  pathCharacters: 4_096,
});

function requirePath(value: unknown) {
  const path = normalizeNativeLocalPath(String(value || ""));
  if (!path || path.length > FILE_LIMITS.pathCharacters) {
    throw new TypeError("Workflow file path is invalid");
  }
  return path;
}

function relativePath(root: string, path: string) {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedPath = path.replace(/\\/g, "/");
  if (!normalizedPath.startsWith(`${normalizedRoot}/`)) {
    throw new Error("Workflow file listing escaped its root");
  }
  return normalizedPath.slice(normalizedRoot.length + 1);
}

function statDto(path: string, stat: Awaited<ReturnType<typeof statRuntimePathStrict>>): WorkflowFileStatDto {
  return {
    path,
    kind: stat.isDir ? "directory" : "file",
    sizeBytes: stat.isDir ? null : stat.size,
    modifiedAt:
      typeof stat.lastModified === "number"
        ? new Date(stat.lastModified).toISOString()
        : null,
  };
}

async function assertFileSize(path: string, limit: number) {
  const stat = await statRuntimePathStrict(path);
  if (!stat.exists || stat.isDir) throw new Error("Workflow file is unavailable");
  if (stat.size > limit) throw new Error("Workflow file exceeds its fixed byte limit");
  return stat;
}

async function atomicWrite(
  targetPath: string,
  write: (temporaryPath: string) => Promise<void>,
) {
  const temporaryPath = joinPath(
    getParentPath(targetPath),
    `.${getBaseName(targetPath)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  let committed = false;
  try {
    await write(temporaryPath);
    await moveRuntimePath({
      sourcePath: temporaryPath,
      targetPath,
      overwrite: true,
    });
    committed = true;
  } finally {
    if (!committed) await removeRuntimePath(temporaryPath).catch(() => false);
  }
}

export function createWorkflowFileApi() {
  return {
    async readText(pathRaw: string) {
      const path = requirePath(pathRaw);
      try {
        await assertFileSize(path, FILE_LIMITS.readTextBytes);
      } catch (error) {
        if (!String(error).includes("Runtime path cannot be inspected")) {
          throw error;
        }
      }
      const text = await readRuntimeTextFileStrict(path);
      if (new TextEncoder().encode(text).length > FILE_LIMITS.readTextBytes) {
        throw new Error("Workflow file exceeds its fixed byte limit");
      }
      return text;
    },
    async writeText(pathRaw: string, content: string) {
      const path = requirePath(pathRaw);
      const text = String(content ?? "");
      if (new TextEncoder().encode(text).length > FILE_LIMITS.transferBytes) {
        throw new Error("Workflow file exceeds its fixed byte limit");
      }
      await atomicWrite(path, (temporaryPath) =>
        writeRuntimeTextFileStrict(temporaryPath, text),
      );
    },
    async readBytes(pathRaw: string) {
      const path = requirePath(pathRaw);
      await assertFileSize(path, FILE_LIMITS.readBytes);
      return readRuntimeBytes(path);
    },
    async writeBytes(pathRaw: string, bytes: Uint8Array | ArrayBuffer) {
      const path = requirePath(pathRaw);
      const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (view.byteLength > FILE_LIMITS.transferBytes) {
        throw new Error("Workflow file exceeds its fixed byte limit");
      }
      await atomicWrite(path, (temporaryPath) =>
        writeRuntimeBytes(temporaryPath, view, { overwrite: false }),
      );
    },
    async copy(sourcePathRaw: string, targetPathRaw: string, overwrite = false) {
      const sourcePath = requirePath(sourcePathRaw);
      const targetPath = requirePath(targetPathRaw);
      await assertFileSize(sourcePath, FILE_LIMITS.transferBytes);
      if (!overwrite && (await runtimePathExists(targetPath))) {
        throw new Error("Workflow file copy target already exists");
      }
      if (overwrite && (await runtimePathExists(targetPath))) {
        await removeRuntimePath(targetPath);
      }
      await copyRuntimeFile({ sourcePath, targetPath });
    },
    async exists(pathRaw: string) {
      try {
        return await runtimePathExists(requirePath(pathRaw));
      } catch {
        return false;
      }
    },
    makeDirectory(pathRaw: string) {
      return ensureRuntimeDirectoryStrict(requirePath(pathRaw));
    },
    async stat(pathRaw: string) {
      const path = requirePath(pathRaw);
      return statDto(path, await statRuntimePathStrict(path));
    },
    async list(args: WorkflowFileListRequestDto): Promise<WorkflowFileListResultDto> {
      const rootPath = requirePath(args?.path);
      const recursive = args?.recursive === true;
      const maxDepth = Math.min(
        FILE_LIMITS.depth,
        Math.max(0, Number(args?.maxDepth ?? FILE_LIMITS.depth) || 0),
      );
      const rootStat = await statRuntimePathStrict(rootPath);
      if (!rootStat.isDir) throw new Error("Workflow file list root is not a directory");
      const entries: WorkflowFileListEntryDto[] = [];
      const pending = [{ path: rootPath, depth: 0 }];
      let totalFileBytes = 0;
      while (pending.length) {
        const current = pending.shift()!;
        const children = (await listRuntimeChildrenStrict(current.path)).sort();
        for (const child of children) {
          const stat = await statRuntimePathStrict(child);
          const entry = statDto(child, stat);
          entries.push({
            relativePath: relativePath(rootPath, child),
            kind: entry.kind,
            sizeBytes: entry.sizeBytes,
            modifiedAt: entry.modifiedAt,
          });
          if (entries.length > FILE_LIMITS.entries) {
            throw new Error("Workflow file list exceeds its fixed entry limit");
          }
          if (entry.kind === "file") totalFileBytes += entry.sizeBytes || 0;
          if (recursive && entry.kind === "directory") {
            if (current.depth >= maxDepth) {
              throw new Error("Workflow file list exceeds its fixed depth limit");
            }
            pending.push({ path: child, depth: current.depth + 1 });
          }
        }
      }
      entries.sort((left, right) =>
        left.relativePath < right.relativePath
          ? -1
          : left.relativePath > right.relativePath
            ? 1
            : 0,
      );
      return {
        rootPath,
        entries,
        totalEntries: entries.length,
        totalFileBytes,
      };
    },
    move(args: { sourcePath: string; targetPath: string; overwrite?: boolean }) {
      return moveRuntimePath({
        sourcePath: requirePath(args?.sourcePath),
        targetPath: requirePath(args?.targetPath),
        overwrite: args?.overwrite === true,
      });
    },
    async remove(args: {
      path: string;
      recursive?: boolean;
      missing?: "error" | "ignore";
    }): Promise<WorkflowFileRemoveResultDto> {
      const path = requirePath(args?.path);
      if (!(await runtimePathExists(path))) {
        if (args?.missing === "ignore") return { removed: false };
        throw new Error("Workflow file remove target does not exist");
      }
      const stat = await statRuntimePathStrict(path);
      if (stat.isDir && args?.recursive !== true) {
        const children = await listRuntimeChildrenStrict(path);
        if (children.length) {
          throw new Error("Recursive workflow directory removal was not requested");
        }
      }
      return { removed: await removeRuntimePath(path) };
    },
    materializeWorkflowInputFile,
    getTempDirectoryPath: resolveRuntimeTemporaryDirectory,
    pickDirectory: (args?: { title?: string; directory?: string }) =>
      openRuntimeFilePicker({
        title: args?.title,
        mode: "folder",
        directory: args?.directory,
      }) as Promise<string | null>,
    pickFile: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
    }) =>
      openRuntimeFilePicker({
        title: args?.title,
        mode: "open",
        directory: args?.directory,
        filters: args?.filters,
      }) as Promise<string | null>,
    pickSaveFile: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
      suggestedName?: string;
    }) =>
      openRuntimeFilePicker({
        title: args?.title,
        mode: "save",
        directory: args?.directory,
        filters: args?.filters,
        suggestion: args?.suggestedName,
      }) as Promise<string | null>,
    pickFiles: (args?: {
      title?: string;
      directory?: string;
      filters?: [string, string][];
    }) =>
      openRuntimeFilePicker({
        title: args?.title,
        mode: "multiple",
        directory: args?.directory,
        filters: args?.filters,
      }) as Promise<string[] | null>,
  };
}

export const workflowFileLimits = FILE_LIMITS;

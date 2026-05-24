import { readRuntimeBytes } from "./runtimePersistence";

const DEFAULT_FILE_TTL_MS = 30 * 60 * 1000;
const WORKFLOW_ARTIFACT_TTL_MS = 2 * 60 * 60 * 1000;

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export type HostBridgeFileSourceKind =
  | "zotero-attachment"
  | "workflow-artifact"
  | "bridge-export";

export type HostBridgeFileOwner = {
  capability?: string;
  workflowId?: string;
  runId?: string;
  requestId?: string;
  itemKey?: string;
  libraryId?: number;
};

export type HostBridgeFileDescriptor = {
  fileId: string;
  sourceKind: HostBridgeFileSourceKind;
  displayName: string;
  contentType: string;
  size?: number;
  sha256?: string;
  createdAt: string;
  expiresAt: string;
  owner?: HostBridgeFileOwner;
};

type HostBridgeFileHandle = HostBridgeFileDescriptor & {
  localPath: string;
};

export type HostBridgeFileDownloadManifest = {
  supported: true;
  endpoint: "GET /bridge/v1/files/{fileId}";
  arbitraryPathAllowed: false;
  approvalRequired: false;
};

export type HostBridgeRegisteredFileArgs = {
  localPath: string;
  sourceKind: HostBridgeFileSourceKind;
  displayName?: string;
  contentType?: string;
  size?: number;
  sha256?: string;
  ttlMs?: number;
  owner?: HostBridgeFileOwner;
};

export type HostBridgeResolvedFileDownload = {
  descriptor: HostBridgeFileDescriptor;
  localPath: string;
  bytes: Uint8Array;
};

export class HostBridgeFileRegistryError extends Error {
  readonly code:
    | "invalid_file_id"
    | "file_not_found"
    | "file_handle_expired"
    | "file_unavailable";

  readonly details?: Record<string, unknown>;

  constructor(
    code: HostBridgeFileRegistryError["code"],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HostBridgeFileRegistryError";
    this.code = code;
    this.details = details;
  }
}

const handles = new Map<string, HostBridgeFileHandle>();
let sequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function randomFragment() {
  const runtime = globalThis as {
    crypto?: { getRandomValues?: (bytes: Uint8Array) => Uint8Array };
  };
  const bytes = new Uint8Array(12);
  if (typeof runtime.crypto?.getRandomValues === "function") {
    runtime.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createFileId() {
  sequence += 1;
  return `file-${Date.now().toString(36)}-${sequence.toString(36)}-${randomFragment()}`;
}

function sanitizeDisplayName(nameRaw: unknown) {
  const name = String(nameRaw || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[\u0000-\u001f]/g, "")
    .trim();
  return name || "download.bin";
}

function inferDisplayName(path: string) {
  return sanitizeDisplayName(path);
}

function inferContentType(contentType: unknown) {
  return String(contentType || "").trim() || "application/octet-stream";
}

function descriptorFromHandle(
  handle: HostBridgeFileHandle,
): HostBridgeFileDescriptor {
  const { localPath: _localPath, ...descriptor } = handle;
  return { ...descriptor };
}

function isExpired(handle: HostBridgeFileHandle, now = Date.now()) {
  return new Date(handle.expiresAt).getTime() <= now;
}

function cleanupExpiredHandles() {
  const now = Date.now();
  for (const [fileId, handle] of handles.entries()) {
    if (isExpired(handle, now)) {
      handles.delete(fileId);
    }
  }
}

function validateFileId(fileIdRaw: unknown) {
  const fileId = String(fileIdRaw || "").trim();
  if (!/^file-[A-Za-z0-9-]+$/.test(fileId)) {
    throw new HostBridgeFileRegistryError(
      "invalid_file_id",
      "File id must be an opaque Host Bridge file handle",
      { fileId },
    );
  }
  return fileId;
}

async function readBytes(path: string) {
  return readRuntimeBytes(path);
}

async function statSize(path: string) {
  const runtime = globalThis as unknown as {
    IOUtils?: { stat?: (path: string) => Promise<{ size?: number }> };
  };
  try {
    if (typeof runtime.IOUtils?.stat === "function") {
      const stat = await runtime.IOUtils.stat(path);
      return typeof stat?.size === "number" ? stat.size : undefined;
    }
    const fs = await dynamicImport("fs/promises");
    const stat = await fs.stat(path);
    return typeof stat?.size === "number" ? stat.size : undefined;
  } catch {
    return undefined;
  }
}

export function getHostBridgeFileDownloadManifest(): HostBridgeFileDownloadManifest {
  return {
    supported: true,
    endpoint: "GET /bridge/v1/files/{fileId}",
    arbitraryPathAllowed: false,
    approvalRequired: false,
  };
}

export async function registerHostBridgeFileHandle(
  args: HostBridgeRegisteredFileArgs,
): Promise<HostBridgeFileDescriptor> {
  cleanupExpiredHandles();
  const localPath = String(args.localPath || "").trim();
  if (!localPath) {
    throw new Error("localPath is required to register a Host Bridge file");
  }
  const createdAt = nowIso();
  const ttlMs =
    typeof args.ttlMs === "number" && Number.isFinite(args.ttlMs)
      ? Math.max(1, Math.floor(args.ttlMs))
      : args.sourceKind === "workflow-artifact"
        ? WORKFLOW_ARTIFACT_TTL_MS
        : DEFAULT_FILE_TTL_MS;
  const size =
    typeof args.size === "number" && Number.isFinite(args.size)
      ? Math.max(0, Math.floor(args.size))
      : await statSize(localPath);
  const handle: HostBridgeFileHandle = {
    fileId: createFileId(),
    sourceKind: args.sourceKind,
    displayName: sanitizeDisplayName(
      args.displayName || inferDisplayName(localPath),
    ),
    contentType: inferContentType(args.contentType),
    ...(typeof size === "number" ? { size } : {}),
    ...(args.sha256 ? { sha256: String(args.sha256) } : {}),
    createdAt,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    ...(args.owner ? { owner: { ...args.owner } } : {}),
    localPath,
  };
  handles.set(handle.fileId, handle);
  return descriptorFromHandle(handle);
}

export function registerHostBridgeWorkflowArtifactFile(
  args: Omit<HostBridgeRegisteredFileArgs, "sourceKind"> & {
    workflowId?: string;
    runId?: string;
    requestId?: string;
  },
) {
  return registerHostBridgeFileHandle({
    ...args,
    sourceKind: "workflow-artifact",
    owner: {
      ...(args.owner || {}),
      ...(args.workflowId ? { workflowId: args.workflowId } : {}),
      ...(args.runId ? { runId: args.runId } : {}),
      ...(args.requestId ? { requestId: args.requestId } : {}),
    },
  });
}

export function registerHostBridgeExportFile(
  args: Omit<HostBridgeRegisteredFileArgs, "sourceKind">,
) {
  return registerHostBridgeFileHandle({
    ...args,
    sourceKind: "bridge-export",
  });
}

export function getHostBridgeFileDescriptor(
  fileIdRaw: unknown,
): HostBridgeFileDescriptor {
  const fileId = validateFileId(fileIdRaw);
  const handle = handles.get(fileId);
  if (!handle) {
    throw new HostBridgeFileRegistryError(
      "file_not_found",
      "File handle was not found",
      { fileId },
    );
  }
  if (isExpired(handle)) {
    handles.delete(fileId);
    throw new HostBridgeFileRegistryError(
      "file_handle_expired",
      "File handle has expired",
      { fileId },
    );
  }
  return descriptorFromHandle(handle);
}

export async function resolveHostBridgeFileDownload(
  fileIdRaw: unknown,
): Promise<HostBridgeResolvedFileDownload> {
  const fileId = validateFileId(fileIdRaw);
  const handle = handles.get(fileId);
  if (!handle) {
    throw new HostBridgeFileRegistryError(
      "file_not_found",
      "File handle was not found",
      { fileId },
    );
  }
  if (isExpired(handle)) {
    handles.delete(fileId);
    throw new HostBridgeFileRegistryError(
      "file_handle_expired",
      "File handle has expired",
      { fileId },
    );
  }
  try {
    const bytes = await readBytes(handle.localPath);
    return {
      descriptor: descriptorFromHandle(handle),
      localPath: handle.localPath,
      bytes,
    };
  } catch (error) {
    throw new HostBridgeFileRegistryError(
      "file_unavailable",
      "Registered file is no longer available",
      {
        fileId,
        message: error instanceof Error ? error.message : String(error || ""),
      },
    );
  }
}

export function resetHostBridgeFileRegistryForTests() {
  handles.clear();
  sequence = 0;
}

export const hostBridgeFileRegistryInternalsForTests = {
  sanitizeDisplayName,
  validateFileId,
};

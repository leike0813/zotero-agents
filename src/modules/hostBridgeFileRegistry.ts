import { joinPath } from "../utils/path";
import { sha256PrefixedHex } from "../utils/sha256";
import {
  getRuntimePersistencePaths,
  writeRuntimeBytes,
} from "./runtimePersistence";
import {
  digestRuntimeFileSource,
  inspectRuntimeFileSource,
  RuntimeFileTransferError,
  verifyRuntimeFileSource,
  type RuntimeFileTransferSource,
} from "./runtimeFileTransfer";

const DEFAULT_FILE_TTL_MS = 30 * 60 * 1000;
const WORKFLOW_ARTIFACT_TTL_MS = 2 * 60 * 60 * 1000;

export type HostBridgeFileSourceKind =
  | "zotero-attachment"
  | "workflow-artifact"
  | "bridge-export"
  | "bridge-upload";

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

type HostBridgeUploadedFileLease = {
  leaseId: string;
  fileIds: string[];
};

export type HostBridgeFileDownloadManifest = {
  supported: true;
  endpoint: "GET /bridge/v2/files/{fileId}";
  urlTemplate: "{endpoint}/files/{fileId}";
  auth: "bearer";
  supportsRemoteClients: true;
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

export type HostBridgeUploadedFileArgs = {
  bytes: Uint8Array;
  displayName?: string;
  contentType?: string;
  ttlMs?: number;
  owner?: HostBridgeFileOwner;
};

export type HostBridgeResolvedFileDownload = {
  descriptor: HostBridgeFileDescriptor;
  source: RuntimeFileTransferSource;
};

export class HostBridgeFileRegistryError extends Error {
  readonly code:
    | "invalid_file_id"
    | "file_not_found"
    | "file_handle_expired"
    | "file_handle_leased"
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
const uploadedLeases = new Map<string, HostBridgeUploadedFileLease>();
const leaseByFileId = new Map<string, string>();
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
    ?.split("")
    .filter((char) => char.charCodeAt(0) > 0x1f)
    .join("")
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
    if (isExpired(handle, now) && !leaseByFileId.has(fileId)) {
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

export function getHostBridgeFileDownloadManifest(): HostBridgeFileDownloadManifest {
  return {
    supported: true,
    endpoint: "GET /bridge/v2/files/{fileId}",
    urlTemplate: "{endpoint}/files/{fileId}",
    auth: "bearer",
    supportsRemoteClients: true,
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
  const inspected = await inspectRuntimeFileSource(localPath);
  const size =
    typeof args.size === "number" && Number.isFinite(args.size)
      ? Math.max(0, Math.floor(args.size))
      : inspected.size;
  let sha256 = args.sha256 ? String(args.sha256) : undefined;
  if (!sha256) {
    const digest = await digestRuntimeFileSource(inspected);
    if (digest.bytesRead !== inspected.size) {
      throw new HostBridgeFileRegistryError(
        "file_unavailable",
        "Registered file changed while its descriptor was created",
        {
          bytesExpected: inspected.size,
          bytesActual: digest.bytesRead,
        },
      );
    }
    sha256 = digest.sha256;
  }
  const handle: HostBridgeFileHandle = {
    fileId: createFileId(),
    sourceKind: args.sourceKind,
    displayName: sanitizeDisplayName(
      args.displayName || inferDisplayName(localPath),
    ),
    contentType: inferContentType(args.contentType),
    ...(typeof size === "number" ? { size } : {}),
    ...(sha256 ? { sha256 } : {}),
    createdAt,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    ...(args.owner ? { owner: { ...args.owner } } : {}),
    localPath,
  };
  handles.set(handle.fileId, handle);
  return descriptorFromHandle(handle);
}

export async function registerHostBridgeFileHandlesInOrder(
  files: readonly HostBridgeRegisteredFileArgs[],
): Promise<HostBridgeFileDescriptor[]> {
  const descriptors: HostBridgeFileDescriptor[] = [];
  for (const file of files) {
    descriptors.push(await registerHostBridgeFileHandle(file));
  }
  return descriptors;
}

export async function registerHostBridgeUploadedFile(
  args: HostBridgeUploadedFileArgs,
): Promise<HostBridgeFileDescriptor> {
  cleanupExpiredHandles();
  const bytes = args.bytes;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0) {
    throw new HostBridgeFileRegistryError(
      "file_unavailable",
      "Uploaded file body is empty",
    );
  }
  const fileId = createFileId();
  const displayName = sanitizeDisplayName(args.displayName || "upload.bin");
  const uploadPath = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "host-bridge-uploads",
    `${fileId}-${displayName}`,
  );
  await writeRuntimeBytes(uploadPath, bytes, { overwrite: false });
  const createdAt = nowIso();
  const ttlMs =
    typeof args.ttlMs === "number" && Number.isFinite(args.ttlMs)
      ? Math.max(1, Math.floor(args.ttlMs))
      : DEFAULT_FILE_TTL_MS;
  const sha256 = await sha256PrefixedHex(bytes);
  const handle: HostBridgeFileHandle = {
    fileId,
    sourceKind: "bridge-upload",
    displayName,
    contentType: inferContentType(args.contentType),
    size: bytes.byteLength,
    ...(sha256 ? { sha256 } : {}),
    createdAt,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    ...(args.owner ? { owner: { ...args.owner } } : {}),
    localPath: uploadPath,
  };
  handles.set(fileId, handle);
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
  if (isExpired(handle) && !leaseByFileId.has(fileId)) {
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
  if (isExpired(handle) && !leaseByFileId.has(fileId)) {
    handles.delete(fileId);
    throw new HostBridgeFileRegistryError(
      "file_handle_expired",
      "File handle has expired",
      { fileId },
    );
  }
  try {
    const inspected = await inspectRuntimeFileSource(
      handle.localPath,
      handle.sha256,
    );
    const source: RuntimeFileTransferSource = {
      path: handle.localPath,
      size: typeof handle.size === "number" ? handle.size : inspected.size,
      ...(handle.sha256 ? { sha256: handle.sha256 } : {}),
    };
    await verifyRuntimeFileSource(source);
    return {
      descriptor: descriptorFromHandle(handle),
      source,
    };
  } catch (error) {
    if (error instanceof HostBridgeFileRegistryError) {
      throw error;
    }
    if (error instanceof RuntimeFileTransferError) {
      throw new HostBridgeFileRegistryError(
        "file_unavailable",
        "Registered file is no longer available",
        { fileId, ...error.details },
      );
    }
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

export async function resolveHostBridgeUploadedFile(
  fileIdRaw: unknown,
): Promise<HostBridgeResolvedFileDownload> {
  const resolved = await resolveHostBridgeFileDownload(fileIdRaw);
  if (resolved.descriptor.sourceKind !== "bridge-upload") {
    throw new HostBridgeFileRegistryError(
      "invalid_file_id",
      "File handle is not an uploaded Host Bridge file",
      { fileId: resolved.descriptor.fileId },
    );
  }
  return resolved;
}

export function markHostBridgeUploadedFileConsumed(fileIdRaw: unknown) {
  const fileId = validateFileId(fileIdRaw);
  const handle = handles.get(fileId);
  if (handle?.sourceKind === "bridge-upload" && !leaseByFileId.has(fileId)) {
    handles.delete(fileId);
  }
}

export async function acquireHostBridgeUploadedFileLease(
  fileIdsRaw: readonly string[],
) {
  const fileIds = [...new Set(fileIdsRaw.map(validateFileId))];
  if (fileIds.length === 0) {
    throw new HostBridgeFileRegistryError(
      "invalid_file_id",
      "At least one uploaded file handle is required for a lease",
    );
  }
  for (const fileId of fileIds) {
    const existingLease = leaseByFileId.get(fileId);
    if (existingLease) {
      throw new HostBridgeFileRegistryError(
        "file_handle_leased",
        "Uploaded file handle is already leased by another workflow submission",
        { fileId },
      );
    }
    const handle = handles.get(fileId);
    if (!handle) {
      throw new HostBridgeFileRegistryError(
        "file_not_found",
        "File handle was not found",
        { fileId },
      );
    }
    if (handle.sourceKind !== "bridge-upload") {
      throw new HostBridgeFileRegistryError(
        "invalid_file_id",
        "File handle is not an uploaded Host Bridge file",
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
  }
  const leaseId = `workflow-resource-lease-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
  for (const fileId of fileIds) leaseByFileId.set(fileId, leaseId);
  try {
    const resolved = [];
    for (const fileId of fileIds) {
      resolved.push(await resolveHostBridgeUploadedFile(fileId));
    }
    const lease = { leaseId, fileIds };
    uploadedLeases.set(leaseId, lease);
    return { leaseId, fileIds, resolved };
  } catch (error) {
    for (const fileId of fileIds) {
      if (leaseByFileId.get(fileId) === leaseId) {
        leaseByFileId.delete(fileId);
      }
    }
    throw error;
  }
}

export function releaseHostBridgeUploadedFileLease(
  leaseId: string,
  consume = true,
) {
  const lease = uploadedLeases.get(String(leaseId || ""));
  if (!lease) return;
  uploadedLeases.delete(lease.leaseId);
  for (const fileId of lease.fileIds) {
    leaseByFileId.delete(fileId);
    if (consume) handles.delete(fileId);
  }
}

export function hasHostBridgeUploadedFileLease(fileIdRaw: unknown) {
  const fileId = validateFileId(fileIdRaw);
  return leaseByFileId.has(fileId);
}

export function resetHostBridgeFileRegistryForTests() {
  handles.clear();
  uploadedLeases.clear();
  leaseByFileId.clear();
  sequence = 0;
}

export const hostBridgeFileRegistryInternalsForTests = {
  sanitizeDisplayName,
  validateFileId,
};

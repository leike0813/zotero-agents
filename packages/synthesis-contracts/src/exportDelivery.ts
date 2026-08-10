import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common";
import {
  rebuildSynthesisSidecarOutputTransferReference,
  type SynthesisSidecarOutputTransferReference,
} from "./sidecarTransfer";

export const SYNTHESIS_HOST_EXPORT_ENTRY_COUNT_MAX = 256 as const;
export const SYNTHESIS_HOST_EXPORT_ENTRY_BYTES_MAX = 5 * 1024 * 1024;
export const SYNTHESIS_HOST_EXPORT_TOTAL_BYTES_MAX = 50 * 1024 * 1024;
export const SYNTHESIS_HOST_EXPORT_DELIVERY_DIAGNOSTICS_MAX = 20 as const;

const DISPLAY_NAME_MAX = 255;
const ENTRY_PATH_MAX = 1024;
const DIAGNOSTIC_MAX = 512;

export const SYNTHESIS_HOST_EXPORT_DELIVERY_CAPABILITIES = [
  "topics.get_context",
  "paper_artifacts.export_filtered",
] as const;

export type SynthesisHostExportDeliveryCapability =
  (typeof SYNTHESIS_HOST_EXPORT_DELIVERY_CAPABILITIES)[number];

export type SynthesisHostExportDeliveryEntry = {
  path: string;
  text: string;
};

export type SynthesisHostExportDeliveryRequest = {
  capability: SynthesisHostExportDeliveryCapability;
  displayName: string;
  entries: SynthesisHostExportDeliveryEntry[];
};

export type SynthesisHostRunWorkspaceMaterializationRequest = {
  capability: "paper_artifacts.export_filtered";
  runRoot: string;
  entries: SynthesisHostExportDeliveryEntry[];
};

export type SynthesisHostExportDeliveryTransferRequest = {
  capability: SynthesisHostExportDeliveryCapability;
  displayName: string;
  contentTransfer: SynthesisSidecarOutputTransferReference;
};

export type SynthesisHostRunWorkspaceMaterializationTransferRequest = {
  capability: "paper_artifacts.export_filtered";
  runRoot: string;
  contentTransfer: SynthesisSidecarOutputTransferReference;
};

export type SynthesisHostRunWorkspaceMaterializationResult = {
  status: "materialized";
  capability: "paper_artifacts.export_filtered";
  entryCount: number;
};

export type SynthesisHostExportDeliveryDescriptor = {
  fileId: string;
  sourceKind: "bridge-export";
  displayName: string;
  contentType: "application/zip";
  size: number;
  sha256: string;
  createdAt: string;
  expiresAt: string;
  owner: {
    capability: SynthesisHostExportDeliveryCapability;
  };
};

export type SynthesisHostExportDeliveryProjection = {
  mode: "bridge-download";
  bundle: SynthesisHostExportDeliveryDescriptor;
  downloadCommand: string;
  unpackHint: string;
};

export type SynthesisHostExportDeliveryAvailableResult = {
  status: "available";
  capability: SynthesisHostExportDeliveryCapability;
  delivery: SynthesisHostExportDeliveryProjection;
  diagnostics: string[];
};

export type SynthesisHostExportDeliveryUnavailableResult = {
  status: "unavailable";
  capability: SynthesisHostExportDeliveryCapability;
  diagnostics: string[];
};

export type SynthesisHostExportDeliveryResult =
  | SynthesisHostExportDeliveryAvailableResult
  | SynthesisHostExportDeliveryUnavailableResult;

export interface SynthesisHostExportDeliveryPort {
  publishArchive(
    request: SynthesisHostExportDeliveryRequest,
  ): Promise<SynthesisHostExportDeliveryResult>;
}

export interface SynthesisHostRunWorkspaceMaterializationPort {
  materialize(
    request: SynthesisHostRunWorkspaceMaterializationRequest,
  ): Promise<SynthesisHostRunWorkspaceMaterializationResult>;
}

function invalidRequest(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

function hasControlCharacters(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function requiredTrimmedString(
  value: unknown,
  location: string,
  maxLength: number,
) {
  if (typeof value !== "string") {
    return invalidRequest(`${location} must be a string`);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized !== value ||
    normalized.length > maxLength ||
    hasControlCharacters(normalized)
  ) {
    return invalidRequest(`${location} is invalid`);
  }
  return normalized;
}

function rebuildCapability(
  value: unknown,
): SynthesisHostExportDeliveryCapability {
  if (
    value === "topics.get_context" ||
    value === "paper_artifacts.export_filtered"
  ) {
    return value;
  }
  return invalidRequest("Export delivery capability is invalid");
}

function rebuildDisplayName(value: unknown) {
  const displayName = requiredTrimmedString(
    value,
    "displayName",
    DISPLAY_NAME_MAX,
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/.test(displayName)) {
    return invalidRequest("Export delivery displayName is invalid");
  }
  return displayName;
}

function rebuildEntryPath(value: unknown, location: string) {
  const entryPath = requiredTrimmedString(value, location, ENTRY_PATH_MAX);
  const segments = entryPath.split("/");
  if (
    entryPath.startsWith("/") ||
    entryPath.includes("\\") ||
    /^[A-Za-z]:/.test(entryPath) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return invalidRequest(`${location} is invalid`);
  }
  return entryPath;
}

function rebuildEntries(
  value: unknown,
  location: string,
): SynthesisHostExportDeliveryEntry[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > SYNTHESIS_HOST_EXPORT_ENTRY_COUNT_MAX
  ) {
    return invalidRequest("Export delivery entries are invalid");
  }
  const paths = new Set<string>();
  let totalBytes = 0;
  return value.map((value, index) => {
    const entry = toSynthesisJsonObject(value, `${location}[${index}]`);
    const entryPath = rebuildEntryPath(entry.path, `entries[${index}].path`);
    if (paths.has(entryPath)) {
      return invalidRequest("Export delivery entry paths must be unique");
    }
    paths.add(entryPath);
    if (typeof entry.text !== "string") {
      return invalidRequest(`entries[${index}].text must be a string`);
    }
    const entryBytes = utf8ByteLength(entry.text);
    if (entryBytes > SYNTHESIS_HOST_EXPORT_ENTRY_BYTES_MAX) {
      return invalidRequest("Export delivery entry exceeds its byte limit");
    }
    totalBytes += entryBytes;
    if (totalBytes > SYNTHESIS_HOST_EXPORT_TOTAL_BYTES_MAX) {
      return invalidRequest("Export delivery request exceeds its byte limit");
    }
    return { path: entryPath, text: entry.text };
  });
}

function utf8ByteLength(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) {
      bytes += 1;
    } else if (code <= 0x7ff) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function rebuildDiagnostics(value: unknown, allowEmpty: boolean) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_HOST_EXPORT_DELIVERY_DIAGNOSTICS_MAX ||
    (!allowEmpty && value.length === 0)
  ) {
    return invalidRequest("Export delivery diagnostics are invalid");
  }
  return value.map((diagnostic, index) =>
    requiredTrimmedString(diagnostic, `diagnostics[${index}]`, DIAGNOSTIC_MAX),
  );
}

function rebuildPositiveInteger(value: unknown, location: string) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    return invalidRequest(`${location} must be a positive integer`);
  }
  return Number(value);
}

function rebuildIsoTimestamp(value: unknown, location: string) {
  const timestamp = requiredTrimmedString(value, location, 64);
  if (!Number.isFinite(Date.parse(timestamp))) {
    return invalidRequest(`${location} is invalid`);
  }
  return timestamp;
}

function rebuildDescriptor(
  value: unknown,
  capability: SynthesisHostExportDeliveryCapability,
): SynthesisHostExportDeliveryDescriptor {
  const descriptor = toSynthesisJsonObject(value, "exportDelivery.bundle");
  const fileId = requiredTrimmedString(descriptor.fileId, "fileId", 256);
  if (!/^file-[A-Za-z0-9-]+$/.test(fileId)) {
    return invalidRequest("Export delivery fileId is invalid");
  }
  if (
    descriptor.sourceKind !== "bridge-export" ||
    descriptor.contentType !== "application/zip"
  ) {
    return invalidRequest("Export delivery descriptor kind is invalid");
  }
  const displayName = rebuildDisplayName(descriptor.displayName);
  const size = rebuildPositiveInteger(descriptor.size, "size");
  const sha256 = requiredTrimmedString(descriptor.sha256, "sha256", 71);
  if (!/^sha256:[a-f0-9]{64}$/.test(sha256)) {
    return invalidRequest("Export delivery sha256 is invalid");
  }
  const createdAt = rebuildIsoTimestamp(descriptor.createdAt, "createdAt");
  const expiresAt = rebuildIsoTimestamp(descriptor.expiresAt, "expiresAt");
  if (Date.parse(expiresAt) <= Date.parse(createdAt)) {
    return invalidRequest("Export delivery expiry is invalid");
  }
  const owner = toSynthesisJsonObject(
    descriptor.owner,
    "exportDelivery.bundle.owner",
  );
  if (rebuildCapability(owner.capability) !== capability) {
    return invalidRequest("Export delivery owner capability is invalid");
  }
  return {
    fileId,
    sourceKind: "bridge-export",
    displayName,
    contentType: "application/zip",
    size,
    sha256,
    createdAt,
    expiresAt,
    owner: { capability },
  };
}

export function rebuildSynthesisHostExportDeliveryRequest(
  value: unknown,
): SynthesisHostExportDeliveryRequest {
  const json = toSynthesisJsonObject(value, "exportDeliveryRequest");
  const capability = rebuildCapability(json.capability);
  const displayName = rebuildDisplayName(json.displayName);
  const entries = rebuildEntries(json.entries, "exportDeliveryRequest.entries");
  return { capability, displayName, entries };
}

export function rebuildSynthesisHostExportDeliveryTransferRequest(
  value: unknown,
): SynthesisHostExportDeliveryTransferRequest {
  const json = toSynthesisJsonObject(value, "exportDeliveryTransferRequest");
  return {
    capability: rebuildCapability(json.capability),
    displayName: rebuildDisplayName(json.displayName),
    contentTransfer: rebuildSynthesisSidecarOutputTransferReference(
      json.contentTransfer,
    ),
  };
}

export function rebuildSynthesisHostRunWorkspaceMaterializationRequest(
  value: unknown,
): SynthesisHostRunWorkspaceMaterializationRequest {
  const json = toSynthesisJsonObject(
    value,
    "runWorkspaceMaterializationRequest",
  );
  if (json.capability !== "paper_artifacts.export_filtered") {
    return invalidRequest(
      "Run workspace materialization capability is invalid",
    );
  }
  const runRoot = requiredTrimmedString(json.runRoot, "runRoot", 4096);
  const entries = rebuildEntries(
    json.entries,
    "runWorkspaceMaterializationRequest.entries",
  );
  if (
    !entries.some(
      (entry) =>
        entry.path === "runtime/payloads/paper-artifacts-manifest.json",
    )
  ) {
    return invalidRequest("Run workspace materialization manifest is missing");
  }
  return {
    capability: "paper_artifacts.export_filtered",
    runRoot,
    entries,
  };
}

export function rebuildSynthesisHostRunWorkspaceMaterializationTransferRequest(
  value: unknown,
): SynthesisHostRunWorkspaceMaterializationTransferRequest {
  const json = toSynthesisJsonObject(
    value,
    "runWorkspaceMaterializationTransferRequest",
  );
  if (json.capability !== "paper_artifacts.export_filtered") {
    return invalidRequest(
      "Run workspace materialization capability is invalid",
    );
  }
  return {
    capability: "paper_artifacts.export_filtered",
    runRoot: requiredTrimmedString(json.runRoot, "runRoot", 4096),
    contentTransfer: rebuildSynthesisSidecarOutputTransferReference(
      json.contentTransfer,
    ),
  };
}

export function rebuildSynthesisHostRunWorkspaceMaterializationResult(
  value: unknown,
): SynthesisHostRunWorkspaceMaterializationResult {
  const json = toSynthesisJsonObject(
    value,
    "runWorkspaceMaterializationResult",
  );
  if (
    json.status !== "materialized" ||
    json.capability !== "paper_artifacts.export_filtered" ||
    !Number.isSafeInteger(json.entryCount) ||
    Number(json.entryCount) < 1 ||
    Number(json.entryCount) > SYNTHESIS_HOST_EXPORT_ENTRY_COUNT_MAX
  ) {
    return invalidRequest("Run workspace materialization result is invalid");
  }
  return {
    status: "materialized",
    capability: "paper_artifacts.export_filtered",
    entryCount: Number(json.entryCount),
  };
}

export function rebuildSynthesisHostExportDeliveryResult(
  value: unknown,
): SynthesisHostExportDeliveryResult {
  const json = toSynthesisJsonObject(value, "exportDeliveryResult");
  const capability = rebuildCapability(json.capability);
  if (json.status === "unavailable") {
    return {
      status: "unavailable",
      capability,
      diagnostics: rebuildDiagnostics(json.diagnostics, false),
    };
  }
  if (json.status !== "available") {
    return invalidRequest("Export delivery result status is invalid");
  }
  const delivery = toSynthesisJsonObject(
    json.delivery,
    "exportDeliveryResult.delivery",
  );
  if (delivery.mode !== "bridge-download") {
    return invalidRequest("Export delivery mode is invalid");
  }
  const bundle = rebuildDescriptor(delivery.bundle, capability);
  return {
    status: "available",
    capability,
    delivery: {
      mode: "bridge-download",
      bundle,
      downloadCommand: `zotero-bridge file download ${bundle.fileId} --output ${bundle.displayName}`,
      unpackHint: `unzip ${bundle.displayName} -d .`,
    },
    diagnostics: rebuildDiagnostics(json.diagnostics, true),
  };
}

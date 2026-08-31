import {
  SynthesisClientError,
  assertSynthesisExactFields,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common";

export const SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX =
  2 * 1024 * 1024;
export const SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_DIAGNOSTICS_MAX = 20 as const;

const ITEM_KEY_MAX = 128;
const PRESENTATION_TEXT_MAX = 4096;
const SOURCE_METADATA_MAX = 128;
const DIAGNOSTIC_MAX = 512;

export type SynthesisHostRepresentativeImageReadRequest = {
  libraryId: number;
  noteKey: string;
};

export type SynthesisHostRepresentativeImageAbsentResult = {
  status: "absent";
  diagnostics: [];
};

export type SynthesisHostRepresentativeImageUnavailableResult = {
  status: "unavailable";
  attachmentKey?: string;
  alt?: string;
  caption?: string;
  sourceKind?: string;
  strategy?: string;
  diagnostics: string[];
};

export type SynthesisHostRepresentativeImageAvailableResult = {
  status: "available";
  attachmentKey: string;
  mimeType: string;
  contentBase64: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  compressedBytes: number;
  sourceKind?: string;
  strategy?: string;
  diagnostics: string[];
};

export type SynthesisHostRepresentativeImageReadResult =
  | SynthesisHostRepresentativeImageAbsentResult
  | SynthesisHostRepresentativeImageUnavailableResult
  | SynthesisHostRepresentativeImageAvailableResult;

export interface SynthesisHostRepresentativeImageReadPort {
  read(
    request: SynthesisHostRepresentativeImageReadRequest,
  ): Promise<SynthesisHostRepresentativeImageReadResult>;
}

function invalidRequest(message: string): never {
  throw new SynthesisClientError("invalid_request", message);
}

function requiredString(value: unknown, location: string, maxLength: number) {
  if (typeof value !== "string") {
    return invalidRequest(`${location} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    return invalidRequest(`${location} is invalid`);
  }
  return normalized;
}

function optionalString(
  record: SynthesisJsonObject,
  field: string,
  maxLength: number,
) {
  if (record[field] === undefined) {
    return undefined;
  }
  return requiredString(record[field], field, maxLength);
}

function itemKey(value: unknown, location: string) {
  const normalized = requiredString(value, location, ITEM_KEY_MAX);
  if (!/^[A-Za-z0-9]+$/.test(normalized)) {
    return invalidRequest(`${location} is invalid`);
  }
  return normalized;
}

function optionalItemKey(record: SynthesisJsonObject, field: string) {
  return record[field] === undefined
    ? undefined
    : itemKey(record[field], field);
}

function optionalPositiveInteger(record: SynthesisJsonObject, field: string) {
  if (record[field] === undefined) {
    return undefined;
  }
  const value = record[field];
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    return invalidRequest(`${field} must be a positive integer`);
  }
  return Number(value);
}

function rebuildDiagnostics(value: unknown, options: { allowEmpty: boolean }) {
  if (
    !Array.isArray(value) ||
    value.length > SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_DIAGNOSTICS_MAX ||
    (!options.allowEmpty && value.length === 0)
  ) {
    return invalidRequest("Representative image diagnostics are invalid");
  }
  return value.map((diagnostic, index) =>
    requiredString(diagnostic, `diagnostics[${index}]`, DIAGNOSTIC_MAX),
  );
}

function decodedBase64Bytes(value: string) {
  if (
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    return invalidRequest("Representative image contentBase64 is invalid");
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function rebuildUnavailable(
  json: SynthesisJsonObject,
): SynthesisHostRepresentativeImageUnavailableResult {
  assertSynthesisExactFields(
    json,
    ["status", "diagnostics"],
    ["attachmentKey", "alt", "caption", "sourceKind", "strategy"],
    "representativeImageReadResult",
  );
  const attachmentKey = optionalItemKey(json, "attachmentKey");
  const alt = optionalString(json, "alt", PRESENTATION_TEXT_MAX);
  const caption = optionalString(json, "caption", PRESENTATION_TEXT_MAX);
  const sourceKind = optionalString(json, "sourceKind", SOURCE_METADATA_MAX);
  const strategy = optionalString(json, "strategy", SOURCE_METADATA_MAX);
  return {
    status: "unavailable",
    ...(attachmentKey ? { attachmentKey } : {}),
    ...(alt ? { alt } : {}),
    ...(caption ? { caption } : {}),
    ...(sourceKind ? { sourceKind } : {}),
    ...(strategy ? { strategy } : {}),
    diagnostics: rebuildDiagnostics(json.diagnostics, { allowEmpty: false }),
  };
}

function rebuildAvailable(
  json: SynthesisJsonObject,
): SynthesisHostRepresentativeImageAvailableResult {
  assertSynthesisExactFields(
    json,
    [
      "status",
      "attachmentKey",
      "mimeType",
      "contentBase64",
      "alt",
      "caption",
      "compressedBytes",
      "diagnostics",
    ],
    ["width", "height", "sourceKind", "strategy"],
    "representativeImageReadResult",
  );
  const attachmentKey = itemKey(json.attachmentKey, "attachmentKey");
  const mimeType = requiredString(json.mimeType, "mimeType", 256).toLowerCase();
  if (!/^image\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)) {
    return invalidRequest("Representative image mimeType is invalid");
  }
  const contentBase64 = requiredString(
    json.contentBase64,
    "contentBase64",
    Math.ceil(SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX / 3) * 4,
  );
  const decodedBytes = decodedBase64Bytes(contentBase64);
  const compressedBytes = optionalPositiveInteger(json, "compressedBytes");
  if (
    !compressedBytes ||
    decodedBytes > SYNTHESIS_HOST_REPRESENTATIVE_IMAGE_CONTENT_BYTES_MAX ||
    compressedBytes !== decodedBytes
  ) {
    return invalidRequest("Representative image byte metadata is invalid");
  }
  const width = optionalPositiveInteger(json, "width");
  const height = optionalPositiveInteger(json, "height");
  const sourceKind = optionalString(json, "sourceKind", SOURCE_METADATA_MAX);
  const strategy = optionalString(json, "strategy", SOURCE_METADATA_MAX);
  return {
    status: "available",
    attachmentKey,
    mimeType,
    contentBase64,
    alt: requiredString(json.alt, "alt", PRESENTATION_TEXT_MAX),
    caption: requiredString(json.caption, "caption", PRESENTATION_TEXT_MAX),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    compressedBytes,
    ...(sourceKind ? { sourceKind } : {}),
    ...(strategy ? { strategy } : {}),
    diagnostics: rebuildDiagnostics(json.diagnostics, { allowEmpty: true }),
  };
}

export function rebuildSynthesisHostRepresentativeImageReadRequest(
  value: unknown,
): SynthesisHostRepresentativeImageReadRequest {
  const json = toSynthesisJsonObject(value, "representativeImageReadRequest");
  assertSynthesisExactFields(
    json,
    ["libraryId", "noteKey"],
    [],
    "representativeImageReadRequest",
  );
  if (!Number.isSafeInteger(json.libraryId) || Number(json.libraryId) <= 0) {
    return invalidRequest("Representative image libraryId is invalid");
  }
  return {
    libraryId: Number(json.libraryId),
    noteKey: itemKey(json.noteKey, "noteKey"),
  };
}

export function rebuildSynthesisHostRepresentativeImageReadResult(
  value: unknown,
): SynthesisHostRepresentativeImageReadResult {
  const json = toSynthesisJsonObject(value, "representativeImageReadResult");
  if (json.status === "absent") {
    assertSynthesisExactFields(
      json,
      ["status", "diagnostics"],
      [],
      "representativeImageReadResult",
    );
    const diagnostics = rebuildDiagnostics(json.diagnostics, {
      allowEmpty: true,
    });
    if (diagnostics.length !== 0) {
      return invalidRequest(
        "Absent representative image cannot have diagnostics",
      );
    }
    return { status: "absent", diagnostics: [] };
  }
  if (json.status === "unavailable") {
    return rebuildUnavailable(json);
  }
  if (json.status === "available") {
    return rebuildAvailable(json);
  }
  return invalidRequest("Representative image result status is invalid");
}

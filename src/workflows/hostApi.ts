import { handlers } from "../handlers";
import {
  openWorkflowEditorSession,
  registerWorkflowEditorRenderer,
  unregisterWorkflowEditorRenderer,
} from "../modules/workflowEditorHost";
import { appendRuntimeLog } from "../modules/runtimeLogManager";
import {
  recordLeakProbeTempArtifactForTests,
  releaseLeakProbeTempArtifactForTests,
} from "../modules/testLeakProbeTempArtifacts";
import { recordTestPerformanceSpan } from "../modules/testPerformanceProbeBridge";
import { createZoteroHostCapabilityBrokerApis } from "../modules/zoteroHostCapabilityBroker";
import { showWorkflowToast } from "../modules/workflowExecution/feedbackSeam";
import {
  copyRuntimeFile,
  getRuntimePersistencePaths,
  writeRuntimeBytes,
  writeRuntimeTextFile,
} from "../modules/runtimePersistence";
import { createWorkflowSynthesisHostApi } from "../modules/synthesisClient/workflowHostClient";
import { getDefaultSynthesisClient } from "../modules/synthesisClient/defaultClient";
import {
  resolveRuntimeAddon,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import { joinPath } from "../utils/path";
import {
  getParentPath,
  normalizeNativeLocalPath,
} from "../platform/path";
import {
  openRuntimeFilePicker,
  resolveRuntimeFilePickerParentWindow,
} from "../platform/filePicker";
import type {
  WorkflowHostApi,
  WorkflowImagePreparationOptions,
  WorkflowPreparedNoteImage,
} from "./types";
import { createWorkflowArchiveApi } from "./archive";
import {
  getBuiltinStatusPolicy,
  getBuiltinStatusTag,
  isBuiltinStatusKey,
  type BuiltinStatusKey,
  type BuiltinStatusTag,
} from "../modules/synthesis/builtinTagPolicy";

import { exportZoteroItemsAsText } from "../modules/zoteroItemTextExporter";

export const WORKFLOW_HOST_API_VERSION = 10;

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

const DEFAULT_NOTE_IMAGE_OPTIONS = {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
  hardMaxBytes: 320 * 1024,
  initialQuality: 0.82,
  minQuality: 0.7,
  background: "#ffffff",
};

const RESERVED_FILE_SEGMENTS = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

function resolveHostAddonConfig() {
  const addonConfig = resolveRuntimeAddon()?.data?.config || null;
  return {
    addonName: String(addonConfig?.addonName || "Zotero Agents").trim(),
    addonRef: String(addonConfig?.addonRef || "").trim(),
    prefsPrefix: String(
      addonConfig?.prefsPrefix || "extensions.zotero.zotero-skills",
    ).trim(),
  };
}

function resolveHostZotero() {
  const runtimeZotero =
    resolveRuntimeZotero() ||
    (typeof Zotero !== "undefined" ? Zotero : undefined);
  if (!runtimeZotero) {
    throw new Error("Zotero runtime is unavailable in workflow host api");
  }
  return runtimeZotero;
}

function resolveHostItem(ref: Zotero.Item | number | string) {
  const zotero = resolveHostZotero();
  if (ref && typeof ref === "object") {
    return ref;
  }
  if (typeof ref === "number") {
    return zotero.Items.get(ref) || null;
  }
  const key = String(ref || "").trim();
  if (!key) {
    return null;
  }
  return (
    zotero.Items.getByLibraryAndKey(zotero.Libraries.userLibraryID, key) || null
  );
}

function assertHostItem(ref: Zotero.Item | number | string) {
  const item = resolveHostItem(ref);
  if (!item) {
    throw new Error(`Item not found: ${String(ref)}`);
  }
  return item;
}

function normalizeBuiltinStatusKeys(values: unknown): BuiltinStatusKey[] {
  const keys = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
  const unknown = keys.filter((key) => !isBuiltinStatusKey(key));
  if (unknown.length) {
    throw new Error(`Unknown builtin status key: ${unknown.join(", ")}`);
  }
  return keys as BuiltinStatusKey[];
}

async function transitionBuiltinStatusTags(args: {
  item: Zotero.Item | number | string;
  add?: BuiltinStatusKey[];
  remove?: BuiltinStatusKey[];
}) {
  const addKeys = normalizeBuiltinStatusKeys(args?.add);
  const removeKeys = normalizeBuiltinStatusKeys(args?.remove);
  const removeSet = new Set(removeKeys);
  const overlapping = addKeys.filter((key) => removeSet.has(key));
  if (overlapping.length) {
    throw new Error(
      `Builtin status keys cannot be added and removed together: ${overlapping.join(", ")}`,
    );
  }
  const synthesisClient = await getDefaultSynthesisClient();
  if (!(await synthesisClient.tags.isBuiltinTagPolicyInitialized())) {
    throw new Error("Builtin status tag policy is not initialized");
  }
  const item = assertHostItem(args.item);
  const current = new Set(await handlers.tag.list(item));
  const addTags = addKeys
    .map(getBuiltinStatusTag)
    .filter((tag) => !current.has(tag));
  const removeTags = removeKeys
    .map(getBuiltinStatusTag)
    .filter((tag) => current.has(tag));
  const added: BuiltinStatusTag[] = [];
  const removed: BuiltinStatusTag[] = [];
  const warnings: Array<{
    code: string;
    operation: "add" | "remove";
    tags: BuiltinStatusTag[];
    message: string;
  }> = [];
  if (addTags.length) {
    try {
      await handlers.tag.add(item, addTags);
      added.push(...addTags);
    } catch (error) {
      warnings.push({
        code: "builtin_status_add_failed",
        operation: "add",
        tags: addTags,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (removeTags.length) {
    try {
      await handlers.tag.remove(item, removeTags);
      removed.push(...removeTags);
    } catch (error) {
      warnings.push({
        code: "builtin_status_remove_failed",
        operation: "remove",
        tags: removeTags,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { added, removed, warnings };
}

function resolveIOUtils() {
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: {
      readUTF8?: (path: string) => Promise<string>;
      writeUTF8?: (path: string, content: string) => Promise<void>;
      exists?: (path: string) => Promise<boolean>;
      makeDirectory?: (
        path: string,
        options?: { createAncestors?: boolean },
      ) => Promise<void>;
    };
  };
  return runtime.IOUtils || null;
}

async function readText(path: string) {
  const nativePath = requireHostFilePath(path);
  const io = resolveIOUtils();
  if (typeof io?.readUTF8 === "function") {
    return io.readUTF8(nativePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(nativePath, "utf8");
}

async function writeText(path: string, content: string) {
  const nativePath = requireHostFilePath(path);
  const io = resolveIOUtils();
  if (typeof io?.writeUTF8 === "function") {
    await io.writeUTF8(nativePath, String(content || ""));
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(nativePath, String(content || ""), "utf8");
}

async function readBytes(path: string) {
  const nativePath = requireHostFilePath(path);
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: { read?: (path: string) => Promise<Uint8Array> };
  };
  if (typeof runtime.IOUtils?.read === "function") {
    return runtime.IOUtils.read(nativePath);
  }
  const fs = await dynamicImport("fs/promises");
  return new Uint8Array(await fs.readFile(nativePath));
}

async function writeBytes(path: string, bytes: Uint8Array | ArrayBuffer) {
  const nativePath = requireHostFilePath(path);
  const data = toUint8Array(bytes);
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: { write?: (path: string, data: Uint8Array) => Promise<void> };
  };
  if (typeof runtime.IOUtils?.write === "function") {
    await runtime.IOUtils.write(nativePath, data);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(nativePath, data);
}

async function copyFile(sourcePath: string, targetPath: string) {
  await copyRuntimeFile({
    sourcePath: requireHostFilePath(sourcePath),
    targetPath: requireHostFilePath(targetPath),
  });
}

async function pathExists(path: string) {
  try {
    const nativePath = normalizeNativeLocalPath(path);
    if (!nativePath) {
      return false;
    }
    const io = resolveIOUtils();
    if (typeof io?.exists === "function") {
      return Boolean(await io.exists(nativePath));
    }
    const fs = await dynamicImport("fs/promises");
    await fs.access(nativePath);
    return true;
  } catch {
    return false;
  }
}

async function makeDirectory(path: string) {
  const nativePath = requireHostFilePath(path);
  const io = resolveIOUtils();
  if (typeof io?.makeDirectory === "function") {
    await io.makeDirectory(nativePath, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(nativePath, { recursive: true });
}

function requireHostFilePath(path: string) {
  const nativePath = normalizeNativeLocalPath(path);
  if (!nativePath) {
    throw new TypeError("Host file path is invalid");
  }
  return nativePath;
}

function normalizeManagedPathSegment(value: unknown, fallback: string) {
  const fallbackText = String(fallback || "file").trim() || "file";
  const raw = String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-");
  let segment = raw
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[. ]+$/g, "")
    .slice(0, 96);
  if (!segment || segment === "." || segment === "..") {
    segment = fallbackText;
  }
  const lower = segment.toLowerCase();
  const reservedCandidate = lower.split(".")[0] || lower;
  if (RESERVED_FILE_SEGMENTS.has(reservedCandidate)) {
    segment = `${segment}-file`;
  }
  return segment;
}

function splitManagedFileName(fileName: unknown) {
  const segment = normalizeManagedPathSegment(fileName, "input.dat");
  const dotIndex = segment.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === segment.length - 1) {
    return { stem: segment, extension: "" };
  }
  return {
    stem: segment.slice(0, dotIndex) || "input",
    extension: segment.slice(dotIndex),
  };
}

function uniqueManagedFileName(fileName: unknown) {
  const { stem, extension } = splitManagedFileName(fileName);
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${stem}-${Date.now()}-${nonce}${extension}`;
}

function normalizeSafeCompanionPath(value: unknown) {
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

async function materializeWorkflowInputFile(args: {
  workflowId?: string;
  key?: string;
  fileName?: string;
  content?: string;
  bytes?: Uint8Array | ArrayBuffer;
}) {
  const hasContent = Object.prototype.hasOwnProperty.call(args || {}, "content");
  const hasBytes = Object.prototype.hasOwnProperty.call(args || {}, "bytes");
  if (hasContent === hasBytes) {
    throw new Error(
      "materializeWorkflowInputFile requires exactly one of content or bytes",
    );
  }
  const workflowSegment = normalizeManagedPathSegment(
    args?.workflowId,
    "workflow",
  );
  const keySegment = normalizeManagedPathSegment(args?.key, "input");
  const fileName = uniqueManagedFileName(args?.fileName || "input.dat");
  const targetPath = joinPath(
    getRuntimePersistencePaths().tmpDir,
    "workflow-inputs",
    workflowSegment,
    keySegment,
    fileName,
  );
  if (hasBytes) {
    await writeRuntimeBytes(targetPath, args.bytes as Uint8Array | ArrayBuffer);
  } else {
    await writeRuntimeTextFile(targetPath, String(args.content ?? ""));
  }
  return { path: targetPath };
}

function normalizeImageOptions(options?: WorkflowImagePreparationOptions) {
  const merged = {
    ...DEFAULT_NOTE_IMAGE_OPTIONS,
    ...(options || {}),
  };
  return {
    maxLongEdge: Math.max(1, Math.floor(Number(merged.maxLongEdge) || 720)),
    targetBytes: Math.max(1, Math.floor(Number(merged.targetBytes) || 1)),
    hardMaxBytes: Math.max(1, Math.floor(Number(merged.hardMaxBytes) || 1)),
    initialQuality: Math.min(
      1,
      Math.max(0.01, Number(merged.initialQuality) || 0.82),
    ),
    minQuality: Math.min(1, Math.max(0.01, Number(merged.minQuality) || 0.7)),
    background: String(merged.background || "#ffffff").trim() || "#ffffff",
  };
}

function inferImageMimeType(pathOrMime?: string) {
  const text = String(pathOrMime || "").toLowerCase();
  if (text.includes("image/")) {
    return text;
  }
  if (/\.(jpe?g)(?:[?#].*)?$/i.test(text)) {
    return "image/jpeg";
  }
  if (/\.png(?:[?#].*)?$/i.test(text)) {
    return "image/png";
  }
  if (/\.gif(?:[?#].*)?$/i.test(text)) {
    return "image/gif";
  }
  if (/\.webp(?:[?#].*)?$/i.test(text)) {
    return "image/webp";
  }
  if (/\.bmp(?:[?#].*)?$/i.test(text)) {
    return "image/bmp";
  }
  return "application/octet-stream";
}

function toUint8Array(bytes: Uint8Array | ArrayBuffer) {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function getBlobCtor() {
  const BlobCtor = (globalThis as typeof globalThis & { Blob?: typeof Blob })
    .Blob;
  if (typeof BlobCtor !== "function") {
    throw new Error("Blob is unavailable in workflow host api");
  }
  return BlobCtor;
}

async function readFileBlob(path: string, mimeType: string) {
  const zotero = resolveHostZotero() as typeof Zotero & {
    File?: typeof Zotero.File & {
      pathToFileURI?: (path: string) => string;
    };
  };
  const uri = zotero.File?.pathToFileURI?.(path);
  if (uri && typeof globalThis.fetch === "function") {
    try {
      const response = await globalThis.fetch(uri);
      if (response.ok || response.status === 0) {
        const blob = await response.blob();
        return blob.type ? blob : blob.slice(0, blob.size, mimeType);
      }
    } catch {
      // Fall back to direct byte readers below.
    }
  }

  const runtime = globalThis as typeof globalThis & {
    IOUtils?: { read?: (path: string) => Promise<Uint8Array> };
  };
  if (typeof runtime.IOUtils?.read === "function") {
    const bytes = await runtime.IOUtils.read(path);
    return new (getBlobCtor())([bytes], { type: mimeType });
  }

  const fs = await dynamicImport("fs/promises");
  const bytes = new Uint8Array(await fs.readFile(path));
  return new (getBlobCtor())([bytes], { type: mimeType });
}

async function normalizeImageSource(
  source:
    | string
    | {
        path?: string;
        blob?: Blob;
        bytes?: Uint8Array | ArrayBuffer;
        mimeType?: string;
      },
) {
  if (typeof source === "string") {
    const path = source.trim();
    const mimeType = inferImageMimeType(path);
    const blob = await readFileBlob(path, mimeType);
    return {
      blob,
      mimeType: blob.type || mimeType,
      originalBytes: blob.size,
      fileName: path.split(/[\\/]/).filter(Boolean).pop() || "image",
    };
  }
  if (source?.blob) {
    const mimeType = source.blob.type || inferImageMimeType(source.mimeType);
    return {
      blob: source.blob.type
        ? source.blob
        : source.blob.slice(0, source.blob.size, mimeType),
      mimeType,
      originalBytes: source.blob.size,
      fileName: source.path?.split(/[\\/]/).filter(Boolean).pop(),
    };
  }
  if (source?.bytes) {
    const mimeType = inferImageMimeType(source.mimeType || source.path);
    const bytes = toUint8Array(source.bytes);
    return {
      blob: new (getBlobCtor())([bytes], { type: mimeType }),
      mimeType,
      originalBytes: bytes.byteLength,
      fileName: source.path?.split(/[\\/]/).filter(Boolean).pop(),
    };
  }
  if (source?.path) {
    return normalizeImageSource(source.path);
  }
  throw new Error("Image source must provide a path, blob, or bytes");
}

function resolveCanvasDocument() {
  const runtime = globalThis as typeof globalThis & {
    document?: Document;
  };
  return (
    runtime.document ||
    resolveRuntimeZotero()?.getMainWindow?.()?.document ||
    null
  );
}

async function decodeImageBlob(blob: Blob) {
  const runtime = globalThis as typeof globalThis & {
    createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>;
    URL?: typeof URL;
  };
  if (typeof runtime.createImageBitmap === "function") {
    const bitmap = await runtime.createImageBitmap(blob);
    return {
      image: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close?.(),
    };
  }

  const doc = resolveCanvasDocument();
  const URLCtor = runtime.URL || globalThis.URL;
  if (!doc || typeof URLCtor?.createObjectURL !== "function") {
    throw new Error("Canvas image decoder is unavailable");
  }
  const image = doc.createElement("img");
  const url = URLCtor.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to decode image"));
      image.src = url;
    });
    return {
      image: image as CanvasImageSource,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      close: () => undefined,
    };
  } finally {
    URLCtor.revokeObjectURL(url);
  }
}

function createCanvas(width: number, height: number) {
  const runtime = globalThis as typeof globalThis & {
    OffscreenCanvas?: typeof OffscreenCanvas;
  };
  if (typeof runtime.OffscreenCanvas === "function") {
    return new runtime.OffscreenCanvas(width, height);
  }
  const doc = resolveCanvasDocument();
  if (!doc) {
    throw new Error("Canvas is unavailable");
  }
  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToJpegBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
) {
  const anyCanvas = canvas as HTMLCanvasElement & {
    convertToBlob?: (options: {
      type: string;
      quality: number;
    }) => Promise<Blob>;
  };
  if (typeof anyCanvas.convertToBlob === "function") {
    return anyCanvas.convertToBlob({ type: "image/jpeg", quality });
  }
  if (typeof anyCanvas.toBlob === "function") {
    return new Promise<Blob>((resolve, reject) => {
      anyCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas JPEG encoding failed"));
          }
        },
        "image/jpeg",
        quality,
      );
    });
  }
  throw new Error("Canvas JPEG encoder is unavailable");
}

function computeBoundedSize(
  width: number,
  height: number,
  maxLongEdge: number,
) {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const longEdge = Math.max(safeWidth, safeHeight);
  if (longEdge <= maxLongEdge) {
    return {
      width: safeWidth,
      height: safeHeight,
    };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

async function prepareForNoteEmbedding(
  source:
    | string
    | {
        path?: string;
        blob?: Blob;
        bytes?: Uint8Array | ArrayBuffer;
        mimeType?: string;
      },
  options?: WorkflowImagePreparationOptions,
): Promise<WorkflowPreparedNoteImage> {
  const normalizedOptions = normalizeImageOptions(options);
  if (normalizedOptions.minQuality > normalizedOptions.initialQuality) {
    normalizedOptions.minQuality = normalizedOptions.initialQuality;
  }
  const normalizedSource = await normalizeImageSource(source);
  const decoded = await decodeImageBlob(normalizedSource.blob);
  try {
    const target = computeBoundedSize(
      decoded.width,
      decoded.height,
      normalizedOptions.maxLongEdge,
    );
    const canvas = createCanvas(target.width, target.height);
    const context = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }
    context.fillStyle = normalizedOptions.background;
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(decoded.image, 0, 0, target.width, target.height);

    const qualities = Array.from(
      new Set(
        [
          normalizedOptions.initialQuality,
          0.78,
          0.74,
          normalizedOptions.minQuality,
        ]
          .map((quality) => Number(quality.toFixed(2)))
          .filter(
            (quality) =>
              quality <= normalizedOptions.initialQuality &&
              quality >= normalizedOptions.minQuality,
          ),
      ),
    ).sort((a, b) => b - a);

    let selectedBlob: Blob | null = null;
    let selectedQuality = qualities[qualities.length - 1];
    for (const quality of qualities) {
      const candidate = await canvasToJpegBlob(canvas, quality);
      selectedBlob = candidate;
      selectedQuality = quality;
      if (candidate.size <= normalizedOptions.targetBytes) {
        break;
      }
    }

    if (!selectedBlob) {
      throw new Error("JPEG encoding produced no image");
    }
    if (selectedBlob.size > normalizedOptions.hardMaxBytes) {
      throw new Error(
        `Prepared image exceeds hard cap: ${selectedBlob.size} > ${normalizedOptions.hardMaxBytes}`,
      );
    }

    return {
      blob: selectedBlob,
      mimeType: "image/jpeg",
      width: target.width,
      height: target.height,
      originalBytes: normalizedSource.originalBytes,
      compressedBytes: selectedBlob.size,
      fileName: normalizedSource.fileName,
      diagnostics: {
        quality: selectedQuality,
        sourceMimeType: normalizedSource.mimeType,
        maxLongEdge: normalizedOptions.maxLongEdge,
        targetBytes: normalizedOptions.targetBytes,
        hardMaxBytes: normalizedOptions.hardMaxBytes,
      },
    };
  } finally {
    decoded.close();
  }
}

function blobFromPreparedImage(image: WorkflowPreparedNoteImage) {
  const mimeType =
    String(image?.mimeType || "image/jpeg").trim() || "image/jpeg";
  if (image?.blob) {
    return image.blob.type
      ? image.blob
      : image.blob.slice(0, image.blob.size, mimeType);
  }
  if (image?.bytes) {
    return new (getBlobCtor())([toUint8Array(image.bytes)], { type: mimeType });
  }
  throw new Error("Prepared image must provide blob or bytes");
}

async function importEmbeddedImage(
  noteRef: Zotero.Item | number | string,
  image: WorkflowPreparedNoteImage,
) {
  const note = assertHostItem(noteRef);
  const blob = blobFromPreparedImage(image);
  const zotero = resolveHostZotero();
  if (typeof zotero.Attachments?.importEmbeddedImage !== "function") {
    throw new Error("Zotero embedded image import is unavailable");
  }
  const attachment = await zotero.Attachments.importEmbeddedImage({
    blob,
    parentItemID: note.id,
  });
  return {
    attachmentKey: String(attachment?.key || "").trim(),
    attachmentItem: attachment,
    mimeType: blob.type || image.mimeType,
    bytes: blob.size,
  };
}

async function openNativeMultiFilePicker(args: {
  title?: string;
  filters?: [string, string][];
  directory?: string;
}) {
  const runtime = globalThis as typeof globalThis & {
    ChromeUtils?: {
      importESModule?: (specifier: string) => {
        FilePicker?: new () => {
          init: (
            parentWindow: Window | undefined,
            title: string,
            mode: number,
          ) => void;
          appendFilter: (title: string, filter: string) => void;
          displayDirectory?: string;
          modeOpenMultiple: number;
          returnCancel: number;
          show: () => Promise<number>;
          files?: string[];
        };
      };
    };
  };
  if (typeof runtime.ChromeUtils?.importESModule !== "function") {
    return {
      supported: false,
      selected: null,
    };
  }
  try {
    const pickerModule = runtime.ChromeUtils.importESModule(
      "chrome://zotero/content/modules/filePicker.mjs",
    );
    const Picker = pickerModule?.FilePicker;
    if (typeof Picker !== "function") {
      return {
        supported: false,
        selected: null,
      };
    }
    const picker = new Picker();
    picker.init(
      resolveRuntimeFilePickerParentWindow(),
      String(args.title || "").trim(),
      picker.modeOpenMultiple,
    );
    if (String(args.directory || "").trim()) {
      picker.displayDirectory = String(args.directory || "").trim();
    }
    for (const filter of Array.isArray(args.filters) ? args.filters : []) {
      if (!Array.isArray(filter) || filter.length < 2) {
        continue;
      }
      picker.appendFilter(
        String(filter[0] || "").trim(),
        String(filter[1] || "").trim(),
      );
    }
    const result = await picker.show();
    if (result === picker.returnCancel) {
      return {
        supported: true,
        selected: null,
      };
    }
    const files = Array.isArray(picker.files)
      ? picker.files
          .map((entry: unknown) => String(entry || "").trim())
          .filter(Boolean)
      : [];
    return {
      supported: true,
      selected: files.length > 0 ? files : null,
    };
  } catch {
    return {
      supported: false,
      selected: null,
    };
  }
}

let cachedHostApi: WorkflowHostApi | null = null;

export function createWorkflowHostApi(): WorkflowHostApi {
  if (cachedHostApi) {
    return cachedHostApi;
  }
  const zoteroBroker = createZoteroHostCapabilityBrokerApis();
  cachedHostApi = {
    version: WORKFLOW_HOST_API_VERSION,
    addon: {
      getConfig: resolveHostAddonConfig,
    },
    items: {
      get(ref) {
        return resolveHostItem(ref);
      },
      resolve(ref) {
        const item = resolveHostItem(ref);
        if (!item) {
          throw new Error(`Item not found: ${String(ref)}`);
        }
        return item;
      },
      getByLibraryAndKey(libraryID, key) {
        return (
          resolveHostZotero().Items.getByLibraryAndKey(
            libraryID,
            String(key || "").trim(),
          ) || null
        );
      },
      async getAll() {
        const zotero = resolveHostZotero();
        if (typeof (zotero.Items as any).getAll !== "function") {
          throw new Error("Zotero.Items.getAll(libraryId) is not available");
        }
        const libraryId = Number(zotero.Libraries?.userLibraryID) || 1;
        const loaded = await (zotero.Items as any).getAll(libraryId);
        if (!Array.isArray(loaded)) {
          throw new Error(
            "Zotero.Items.getAll(libraryId) did not return an array",
          );
        }
        return loaded;
      },
      exportPortableJson(ref) {
        return handlers.item.exportPortableJson(ref);
      },
      exportText(args) {
        return exportZoteroItemsAsText(resolveHostZotero() as any, args);
      },
      createFromJson(args) {
        return handlers.item.createFromJson(args);
      },
      remove(ref) {
        return handlers.item.remove(ref);
      },
    },
    context: zoteroBroker.context,
    library: zoteroBroker.library,
    mutations: zoteroBroker.mutations,
    metadata: zoteroBroker.metadata,
    prefs: {
      get(key, global = true) {
        return resolveHostZotero().Prefs.get(
          String(key || "").trim(),
          Boolean(global),
        );
      },
      set(key, value, global = true) {
        resolveHostZotero().Prefs.set(
          String(key || "").trim(),
          value as any,
          Boolean(global),
        );
      },
      clear(key, global = true) {
        resolveHostZotero().Prefs.clear(
          String(key || "").trim(),
          Boolean(global),
        );
      },
    },
    parents: handlers.parent,
    notes: {
      ...handlers.note,
      importEmbeddedImage,
    },
    images: {
      prepareForNoteEmbedding,
    },
    attachments: {
      ...handlers.attachment,
      async importStoredFile(args) {
        const attachment = await handlers.attachment.importStoredFromPath(args);
        const storedPath = String(await attachment.getFilePathAsync?.() || "").trim();
        const storageRoot = getParentPath(storedPath);
        for (const companion of args.companionFiles || []) {
          const segments = normalizeSafeCompanionPath(companion.relativePath);
          const targetPath = joinPath(storageRoot, ...segments);
          await makeDirectory(getParentPath(targetPath));
          await copyFile(companion.sourcePath, targetPath);
        }
        return attachment;
      },
    },
    tags: handlers.tag,
    statusTags: {
      getPolicy: getBuiltinStatusPolicy,
      transition: transitionBuiltinStatusTags,
    },
    collections: handlers.collection,
    command: handlers.command,
    editor: {
      openSession: openWorkflowEditorSession,
      registerRenderer: registerWorkflowEditorRenderer,
      unregisterRenderer: unregisterWorkflowEditorRenderer,
    },
    notifications: {
      toast(args) {
        showWorkflowToast({
          text: String(args?.text || "").trim(),
          type: args?.type || "default",
          source: "host-api",
          owner: "workflow",
          scope: "workflow-host-api",
        });
      },
    },
    logging: {
      appendRuntimeLog,
      recordPerformanceSpanForTests: recordTestPerformanceSpan,
      recordLeakProbeTempArtifactForTests,
      releaseLeakProbeTempArtifactForTests,
    },
    file: {
      pathToFile(path: string) {
        return resolveHostZotero().File.pathToFile(requireHostFilePath(path));
      },
      readText,
      writeText,
      readBytes,
      writeBytes,
      copy: copyFile,
      exists: pathExists,
      makeDirectory,
      materializeWorkflowInputFile,
      getTempDirectoryPath() {
        const tempDir = resolveHostZotero().getTempDirectory?.();
        return String(tempDir?.path || "").trim();
      },
      async pickDirectory(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "folder",
          directory: args?.directory,
        }) as Promise<string | null>;
      },
      async pickFile(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "open",
          filters: args?.filters,
          directory: args?.directory,
        }) as Promise<string | null>;
      },
      async pickSaveFile(args) {
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "save",
          filters: args?.filters,
          directory: args?.directory,
          suggestion: args?.suggestedName,
        }) as Promise<string | null>;
      },
      async pickFiles(args) {
        const nativePickerResult = await openNativeMultiFilePicker({
          title: args?.title,
          filters: args?.filters,
          directory: args?.directory,
        });
        if (nativePickerResult.supported) {
          return nativePickerResult.selected;
        }
        return openRuntimeFilePicker({
          title: args?.title,
          mode: "multiple",
          filters: args?.filters,
          directory: args?.directory,
        }) as Promise<string[] | null>;
      },
    },
    archive: createWorkflowArchiveApi(),
    synthesis: createWorkflowSynthesisHostApi(),
  };
  return cachedHostApi;
}

export function summarizeWorkflowHostApiCapabilities(
  hostApi?: WorkflowHostApi | null,
) {
  return {
    items: !!hostApi?.items,
    prefs: !!hostApi?.prefs,
    parents: !!hostApi?.parents,
    notes: !!hostApi?.notes,
    attachments: !!hostApi?.attachments,
    tags: !!hostApi?.tags,
    statusTags: !!hostApi?.statusTags,
    collections: !!hostApi?.collections,
    editor: !!hostApi?.editor,
    notifications: !!hostApi?.notifications,
    logging: !!hostApi?.logging,
    file: !!hostApi?.file,
    saveFile: typeof hostApi?.file?.pickSaveFile === "function",
    archive: !!hostApi?.archive,
    images: !!hostApi?.images,
    addon: !!hostApi?.addon,
    context: !!hostApi?.context,
    library: !!hostApi?.library,
    mutations: !!hostApi?.mutations,
    metadata: !!hostApi?.metadata,
    synthesis: !!hostApi?.synthesis,
  };
}

export function resetWorkflowHostApiForTests() {
  cachedHostApi = null;
}

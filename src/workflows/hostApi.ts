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
import {
  createZoteroHostCapabilityBrokerApis,
  getAllRegularZoteroItems,
} from "../modules/zoteroHostCapabilityBroker";
import { showWorkflowToast } from "../modules/workflowExecution/feedbackSeam";
import { copyRuntimeFile } from "../modules/runtimePersistence";
import { getDefaultSynthesisService } from "../modules/synthesis/service";
import {
  resolveRuntimeAddon,
  resolveRuntimeToolkit,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import type {
  WorkflowHostApi,
  WorkflowImagePreparationOptions,
  WorkflowPreparedNoteImage,
} from "./types";

export const WORKFLOW_HOST_API_VERSION = 5;

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

function resolveHostAddonConfig() {
  const addonConfig = resolveRuntimeAddon()?.data?.config || null;
  return {
    addonName: String(addonConfig?.addonName || "Zotero Skills").trim(),
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
  const io = resolveIOUtils();
  if (typeof io?.readUTF8 === "function") {
    return io.readUTF8(path);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(path, "utf8");
}

async function writeText(path: string, content: string) {
  const io = resolveIOUtils();
  if (typeof io?.writeUTF8 === "function") {
    await io.writeUTF8(path, String(content || ""));
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(path, String(content || ""), "utf8");
}

async function readBytes(path: string) {
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: { read?: (path: string) => Promise<Uint8Array> };
  };
  if (typeof runtime.IOUtils?.read === "function") {
    return runtime.IOUtils.read(path);
  }
  const fs = await dynamicImport("fs/promises");
  return new Uint8Array(await fs.readFile(path));
}

async function writeBytes(path: string, bytes: Uint8Array | ArrayBuffer) {
  const data = toUint8Array(bytes);
  const runtime = globalThis as typeof globalThis & {
    IOUtils?: { write?: (path: string, data: Uint8Array) => Promise<void> };
  };
  if (typeof runtime.IOUtils?.write === "function") {
    await runtime.IOUtils.write(path, data);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.writeFile(path, data);
}

async function copyFile(sourcePath: string, targetPath: string) {
  await copyRuntimeFile({ sourcePath, targetPath });
}

async function pathExists(path: string) {
  const io = resolveIOUtils();
  if (typeof io?.exists === "function") {
    return io.exists(path);
  }
  const fs = await dynamicImport("fs/promises");
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function makeDirectory(path: string) {
  const io = resolveIOUtils();
  if (typeof io?.makeDirectory === "function") {
    await io.makeDirectory(path, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(path, { recursive: true });
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

type ToolkitFilePickerCtor = new (
  title: string,
  mode: string,
  filters: [string, string][],
  suggestion: string,
  window: Window | undefined,
  filterMask?: string,
  directory?: string,
) => {
  open: () => Promise<unknown> | unknown;
};

function resolveToolkitFilePicker() {
  const toolkit = resolveRuntimeToolkit() as
    | {
        FilePicker?: ToolkitFilePickerCtor;
      }
    | undefined;
  return typeof toolkit?.FilePicker === "function" ? toolkit.FilePicker : null;
}

function resolveFilePickerParentWindow() {
  const runtimeAddon = resolveRuntimeAddon() as
    | {
        data?: {
          dialog?: { window?: Window };
          prefs?: { window?: Window };
        };
      }
    | undefined;
  const runtimeZotero = resolveRuntimeZotero() as
    | {
        getMainWindow?: () => Window | null | undefined;
      }
    | undefined;
  return (
    runtimeAddon?.data?.dialog?.window ||
    runtimeAddon?.data?.prefs?.window ||
    runtimeZotero?.getMainWindow?.() ||
    undefined
  );
}

async function openToolkitFilePicker(args: {
  title?: string;
  mode: "folder" | "file" | "files";
  filters?: [string, string][];
  directory?: string;
}): Promise<string | string[] | null> {
  const FilePicker = resolveToolkitFilePicker();
  if (!FilePicker) {
    return null;
  }
  const selected = await new FilePicker(
    String(args.title || "").trim(),
    args.mode,
    Array.isArray(args.filters) ? args.filters : [],
    "",
    resolveFilePickerParentWindow(),
    undefined,
    String(args.directory || "").trim() || undefined,
  ).open();
  if (args.mode === "files") {
    if (Array.isArray(selected)) {
      const normalized = selected
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      return normalized.length > 0 ? normalized : null;
    }
    if (typeof selected === "string" && selected.trim()) {
      return [selected.trim()];
    }
    return null;
  }
  return typeof selected === "string" && selected.trim()
    ? selected.trim()
    : null;
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
      resolveFilePickerParentWindow(),
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
        if (typeof (zotero.Items as any).getAll === "function") {
          try {
            const loaded = await (zotero.Items as any).getAll();
            if (Array.isArray(loaded)) {
              return loaded;
            }
          } catch {
            // fall through to deterministic scan
          }
        }
        return getAllRegularZoteroItems();
      },
    },
    context: zoteroBroker.context,
    library: zoteroBroker.library,
    mutations: zoteroBroker.mutations,
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
    attachments: handlers.attachment,
    tags: handlers.tag,
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
        return resolveHostZotero().File.pathToFile(path);
      },
      readText,
      writeText,
      readBytes,
      writeBytes,
      copy: copyFile,
      exists: pathExists,
      makeDirectory,
      getTempDirectoryPath() {
        const tempDir = resolveHostZotero().getTempDirectory?.();
        return String(tempDir?.path || "").trim();
      },
      async pickDirectory(args) {
        return openToolkitFilePicker({
          title: args?.title,
          mode: "folder",
          directory: args?.directory,
        }) as Promise<string | null>;
      },
      async pickFile(args) {
        return openToolkitFilePicker({
          title: args?.title,
          mode: "file",
          filters: args?.filters,
          directory: args?.directory,
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
        return openToolkitFilePicker({
          title: args?.title,
          mode: "files",
          filters: args?.filters,
          directory: args?.directory,
        }) as Promise<string[] | null>;
      },
    },
    synthesis: getDefaultSynthesisService(),
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
    collections: !!hostApi?.collections,
    editor: !!hostApi?.editor,
    notifications: !!hostApi?.notifications,
    logging: !!hostApi?.logging,
    file: !!hostApi?.file,
    images: !!hostApi?.images,
    addon: !!hostApi?.addon,
    context: !!hostApi?.context,
    library: !!hostApi?.library,
    mutations: !!hostApi?.mutations,
    synthesis: !!hostApi?.synthesis,
  };
}

export function resetWorkflowHostApiForTests() {
  cachedHostApi = null;
}

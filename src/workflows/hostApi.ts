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
import { getDefaultSynthesisService } from "../modules/synthesis/service";
import {
  resolveRuntimeAddon,
  resolveRuntimeToolkit,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import type { WorkflowHostApi } from "./types";

export const WORKFLOW_HOST_API_VERSION = 3;

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

function resolveHostAddonConfig() {
  const addonConfig = resolveRuntimeAddon()?.data?.config || null;
  return {
    addonName: String(addonConfig?.addonName || "Zotero Skills").trim(),
    addonRef: String(addonConfig?.addonRef || "").trim(),
    prefsPrefix: String(addonConfig?.prefsPrefix || "extensions.zotero.zotero-skills")
      .trim(),
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
  return zotero.Items.getByLibraryAndKey(zotero.Libraries.userLibraryID, key) || null;
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
  return typeof selected === "string" && selected.trim() ? selected.trim() : null;
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
          init: (parentWindow: Window | undefined, title: string, mode: number) => void;
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
      picker.appendFilter(String(filter[0] || "").trim(), String(filter[1] || "").trim());
    }
    const result = await picker.show();
    if (result === picker.returnCancel) {
      return {
        supported: true,
        selected: null,
      };
    }
    const files = Array.isArray(picker.files)
      ? picker.files.map((entry: unknown) => String(entry || "").trim()).filter(Boolean)
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
        return resolveHostZotero().Prefs.get(String(key || "").trim(), Boolean(global));
      },
      set(key, value, global = true) {
        resolveHostZotero().Prefs.set(
          String(key || "").trim(),
          value as any,
          Boolean(global),
        );
      },
      clear(key, global = true) {
        resolveHostZotero().Prefs.clear(String(key || "").trim(), Boolean(global));
      },
    },
    parents: handlers.parent,
    notes: handlers.note,
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

export function summarizeWorkflowHostApiCapabilities(hostApi?: WorkflowHostApi | null) {
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

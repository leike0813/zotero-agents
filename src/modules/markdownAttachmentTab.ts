import { config } from "../../package.json";
import {
  getRuntimePersistencePaths,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import {
  closeAssistantWorkspaceSidebar,
  isAssistantWorkspaceSidebarOpen,
  openAssistantWorkspaceSidebar,
} from "./assistantWorkspaceSidebar";
import { getStringOrFallback } from "../utils/locale";
import { joinPath } from "../utils/path";
import { resolveAddonRef } from "../utils/runtimeBridge";

type ZoteroTabs = {
  add?: (options: Record<string, unknown>) => {
    id?: string;
    container?: Element;
  };
  select?: (id: string) => unknown;
  _getTab?: (id: string) => unknown;
  rename?: (id: string, title: string) => unknown;
  setTitle?: (id: string, title: string) => unknown;
  update?: (id: string, options: Record<string, unknown>) => unknown;
};

type MarkdownAttachmentTabArgs = {
  itemID: number | string;
  itemKey?: string;
  title?: string;
  filePath?: string;
  window?: _ZoteroTypes.MainWindow;
};

type MarkdownDocumentPayload = {
  itemID: number | string;
  itemKey: string;
  title: string;
  filePath: string;
  baseFileUri: string;
  markdown: string;
  locale: string;
  messages: MarkdownReaderMessages;
};

type MarkdownReaderMessages = Record<string, string>;

type MarkdownReaderBridge = {
  requestDocument: () => Promise<MarkdownDocumentPayload>;
  refresh: () => Promise<MarkdownDocumentPayload>;
  openSystem: () => Promise<void>;
  openFolder: () => Promise<void>;
  isSidebarOpen: () => boolean;
  openSidebar: () => Promise<boolean>;
  closeSidebar: () => boolean;
};

type MarkdownReaderBridgeTarget = Record<string, unknown> & {
  wrappedJSObject?: unknown;
  __zoteroSkillsMarkdownReaderBridge?: MarkdownReaderBridge;
};

type MarkdownAttachmentRuntime = {
  tabId: string;
  frame: Element;
  frameWindow: Window | null;
  args: MarkdownAttachmentTabArgs;
  window: _ZoteroTypes.MainWindow;
  handshakeTimer?: ReturnType<typeof setInterval>;
  handshakeAttemptCount: number;
  handshakeSuccessCount: number;
  handshakeComplete: boolean;
  fallbackOpened: boolean;
};

const MARKDOWN_READER_TAB_PREFIX = "zotero-skills-markdown-reader";
const MARKDOWN_READER_TAB_ICON = "zotero-skills-markdown-reader";
const MARKDOWN_READER_TAB_ICON_URI = `chrome://${config.addonRef}/content/icons/icon_file_markdown_32.png`;
const MARKDOWN_READER_HANDSHAKE_INTERVAL_MS = 250;
const MARKDOWN_READER_HANDSHAKE_MAX_ATTEMPTS = 40;
const MARKDOWN_READER_HANDSHAKE_REQUIRED_SUCCESSES = 2;

const MARKDOWN_READER_MESSAGE_FALLBACKS: MarkdownReaderMessages = {
  defaultTitle: "Markdown",
  searchPlaceholder: "Search",
  refresh: "Refresh",
  copyMarkdown: "Copy Markdown",
  openFolder: "Show in File Manager",
  copied: "Copied",
  copyFailed: "Copy failed",
  fontSmaller: "Decrease text size",
  fontLarger: "Increase text size",
  width: "Toggle reading width",
  widthNarrow: "Use comfortable reading width",
  widthWide: "Use wide reading width",
  searchPrevious: "Previous search result",
  searchNext: "Next search result",
  clearSearch: "Clear search",
  top: "Back to top",
  openDefault: "Open with system default",
  openSidebar: "Open Assistant Sidebar",
  closeSidebar: "Close Assistant Sidebar",
  initializing: "Initializing reader...",
  loadingDocument: "Loading document...",
  rendered: "Rendered",
  noOutline: "No outline",
  outlineTitle: "Contents",
  readerUnavailable: "Reader unavailable",
  loadFailed: "Failed to load Markdown.",
  bridgeMissing: "Markdown reader bridge is unavailable.",
  bridgeInvalid: "Markdown reader bridge does not support document loading.",
  bridgeTimeout:
    "Markdown reader bridge is unavailable. The host will try to open a standalone fallback.",
};

const MARKDOWN_READER_MESSAGE_LOCALE_IDS: Record<string, string> = {
  defaultTitle: "markdown-reader-default-title",
  searchPlaceholder: "markdown-reader-search-placeholder",
  refresh: "markdown-reader-refresh",
  copyMarkdown: "markdown-reader-copy-markdown",
  openFolder: "markdown-reader-open-folder",
  copied: "markdown-reader-copied",
  copyFailed: "markdown-reader-copy-failed",
  fontSmaller: "markdown-reader-font-smaller",
  fontLarger: "markdown-reader-font-larger",
  width: "markdown-reader-width",
  widthNarrow: "markdown-reader-width-narrow",
  widthWide: "markdown-reader-width-wide",
  searchPrevious: "markdown-reader-search-previous",
  searchNext: "markdown-reader-search-next",
  clearSearch: "markdown-reader-clear-search",
  top: "markdown-reader-top",
  openDefault: "markdown-reader-open-default",
  openSidebar: "markdown-reader-open-sidebar",
  closeSidebar: "markdown-reader-close-sidebar",
  initializing: "markdown-reader-initializing",
  loadingDocument: "markdown-reader-loading-document",
  rendered: "markdown-reader-rendered",
  noOutline: "markdown-reader-no-outline",
  outlineTitle: "markdown-reader-outline-title",
  readerUnavailable: "markdown-reader-unavailable",
  loadFailed: "markdown-reader-load-failed",
  bridgeMissing: "markdown-reader-bridge-missing",
  bridgeInvalid: "markdown-reader-bridge-invalid",
  bridgeTimeout: "markdown-reader-bridge-timeout",
};

const markdownReaderTabs = new Map<string, MarkdownAttachmentRuntime>();

function resolveHostWindow(win?: _ZoteroTypes.MainWindow) {
  return (
    win ||
    ((globalThis as any).Zotero?.getMainWindows?.()[0] as
      | _ZoteroTypes.MainWindow
      | undefined) ||
    ((globalThis as any).window as _ZoteroTypes.MainWindow | undefined)
  );
}

function resolveZoteroTabs(win: _ZoteroTypes.MainWindow | undefined) {
  return (
    (win as unknown as { Zotero_Tabs?: ZoteroTabs } | undefined)?.Zotero_Tabs ||
    ((globalThis as any).Zotero_Tabs as ZoteroTabs | undefined)
  );
}

function resolveRuntimeLocale() {
  const runtime = globalThis as {
    Zotero?: { locale?: unknown };
    navigator?: { language?: unknown };
  };
  return String(
    runtime.Zotero?.locale || runtime.navigator?.language || "en-US",
  )
    .trim()
    .replace("_", "-");
}

function buildMarkdownReaderMessages() {
  return Object.fromEntries(
    Object.entries(MARKDOWN_READER_MESSAGE_FALLBACKS).map(([key, fallback]) => [
      key,
      getStringOrFallback(
        MARKDOWN_READER_MESSAGE_LOCALE_IDS[key] || key,
        fallback,
      ),
    ]),
  ) as MarkdownReaderMessages;
}

function sanitizeTabPart(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function resolveMarkdownReaderTabId(args: MarkdownAttachmentTabArgs) {
  const rawKey = String(args.itemKey || args.itemID || "attachment").trim();
  return `${MARKDOWN_READER_TAB_PREFIX}-${sanitizeTabPart(rawKey) || "attachment"}`;
}

function resolveMarkdownReaderTitle(args: MarkdownAttachmentTabArgs) {
  return (
    String(args.title || "").trim() ||
    MARKDOWN_READER_MESSAGE_FALLBACKS.defaultTitle
  );
}

function writeTabRecordTitle(record: unknown, title: string) {
  if (!record || typeof record !== "object") {
    return;
  }
  const mutableRecord = record as {
    title?: string;
    tab?: { title?: string; label?: string; data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  };
  mutableRecord.title = title;
  if (mutableRecord.tab) {
    mutableRecord.tab.title = title;
    mutableRecord.tab.label = title;
    if (mutableRecord.tab.data) {
      mutableRecord.tab.data.title = title;
    }
  }
  if (mutableRecord.data) {
    mutableRecord.data.title = title;
  }
}

function applyMarkdownReaderTabTitle(runtime: MarkdownAttachmentRuntime) {
  const title = resolveMarkdownReaderTitle(runtime.args);
  const tabs = resolveZoteroTabs(runtime.window);
  if (!tabs) {
    return;
  }
  try {
    if (typeof tabs.rename === "function") {
      tabs.rename(runtime.tabId, title);
    }
  } catch {
    // Zotero versions differ; the tab record fallback below keeps tests and
    // older runtimes stable.
  }
  try {
    if (typeof tabs.setTitle === "function") {
      tabs.setTitle(runtime.tabId, title);
    }
  } catch {
    // See rename fallback note.
  }
  try {
    if (typeof tabs.update === "function") {
      tabs.update(runtime.tabId, { title });
    }
  } catch {
    // See rename fallback note.
  }
  try {
    writeTabRecordTitle(tabs._getTab?.(runtime.tabId), title);
  } catch {
    // Best-effort title persistence only.
  }
}

function resolveMarkdownReaderPageUrl(args: MarkdownAttachmentTabArgs) {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  if (!addonRef) {
    throw new Error("Cannot open Markdown reader: addonRef is unavailable.");
  }
  const params = new URLSearchParams();
  params.set("itemID", String(args.itemID || ""));
  if (args.itemKey) {
    params.set("itemKey", args.itemKey);
  }
  if (args.title) {
    params.set("title", args.title);
  }
  if (args.filePath) {
    params.set("filePath", args.filePath);
  }
  return `chrome://${addonRef}/content/markdown-reader/index.html?${params.toString()}`;
}

function createMarkdownBrowser(doc: Document) {
  const xulDocument = doc as Document & {
    createXULElement?: (tag: string) => Element;
  };
  const frame =
    typeof xulDocument.createXULElement === "function"
      ? xulDocument.createXULElement("browser")
      : doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "markdown-reader-frame");
  frame.setAttribute("disableglobalhistory", "true");
  frame.setAttribute("flex", "1");
  frame.setAttribute("maychangeremoteness", "true");
  frame.setAttribute("type", "content");
  frame.setAttribute("transparent", "true");
  (frame as HTMLElement).style.width = "100%";
  (frame as HTMLElement).style.height = "100%";
  (frame as HTMLElement).style.minHeight = "0";
  (frame as HTMLElement).style.border = "none";
  return frame;
}

function setFrameSource(frame: Element, pageUrl: string) {
  if (
    typeof HTMLIFrameElement !== "undefined" &&
    frame instanceof HTMLIFrameElement
  ) {
    frame.src = pageUrl;
    return;
  }
  frame.setAttribute("src", pageUrl);
}

async function dynamicImport(specifier: string) {
  const loader = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<any>;
  return loader(specifier);
}

async function readUtf8TextFile(filePath: string) {
  const runtime = globalThis as {
    IOUtils?: { readUTF8?: (path: string) => Promise<string> };
  };
  if (typeof runtime.IOUtils?.readUTF8 === "function") {
    return runtime.IOUtils.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

function filePathToFileUri(filePath: string) {
  const runtime = (globalThis as any).Zotero as
    | { File?: { pathToFileURI?: (path: string) => string } }
    | undefined;
  if (typeof runtime?.File?.pathToFileURI === "function") {
    return runtime.File.pathToFileURI(filePath);
  }
  const normalized = filePath.replace(/\\/g, "/");
  const prefixed = /^[A-Za-z]:\//.test(normalized)
    ? `/${normalized}`
    : normalized;
  return `file://${prefixed
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function resolveFrameWindow(frame: Element) {
  return (
    (frame as HTMLIFrameElement).contentWindow ||
    (frame as unknown as { contentWindow?: Window | null }).contentWindow ||
    (frame as unknown as { contentDocument?: Document | null }).contentDocument
      ?.defaultView ||
    null
  );
}

function isExpectedReaderFrameWindow(frameWindow: Window) {
  try {
    const href = String(frameWindow.location?.href || "");
    if (!href) {
      return true;
    }
    return (
      href.includes("/markdown-reader/index.html") ||
      href.includes("\\markdown-reader\\index.html")
    );
  } catch {
    return true;
  }
}

async function openSystemDefault(filePath: string) {
  if (!filePath) {
    throw new Error("Markdown file path is unavailable.");
  }
  const runtime = (globalThis as any).Zotero as
    | { launchFile?: (path: string) => unknown | Promise<unknown> }
    | undefined;
  if (typeof runtime?.launchFile === "function") {
    await runtime.launchFile(filePath);
    return;
  }
  throw new Error("Zotero.launchFile is unavailable.");
}

async function openFileLocation(filePath: string) {
  if (!filePath) {
    throw new Error("Markdown file path is unavailable.");
  }
  const runtime = (globalThis as any).Zotero as
    | {
        File?: {
          reveal?: (path: string) => unknown | Promise<unknown>;
          pathToFile?: (path: string) => {
            reveal?: () => unknown;
            parent?: unknown;
          };
        };
        launchFile?: (file: unknown) => unknown | Promise<unknown>;
      }
    | undefined;
  if (typeof runtime?.File?.reveal === "function") {
    await runtime.File.reveal(filePath);
    return;
  }
  const file =
    typeof runtime?.File?.pathToFile === "function"
      ? runtime.File.pathToFile(filePath)
      : null;
  if (file && typeof file.reveal === "function") {
    file.reveal();
    return;
  }
  if (file?.parent && typeof runtime?.launchFile === "function") {
    await runtime.launchFile(file.parent);
    return;
  }
  throw new Error("Zotero.File.reveal is unavailable.");
}

async function buildDocumentPayload(
  runtime: MarkdownAttachmentRuntime,
): Promise<MarkdownDocumentPayload> {
  applyMarkdownReaderTabTitle(runtime);
  const filePath = runtime.args.filePath || "";
  return {
    itemID: runtime.args.itemID,
    itemKey: runtime.args.itemKey || "",
    title: resolveMarkdownReaderTitle(runtime.args),
    filePath,
    baseFileUri: filePath ? filePathToFileUri(filePath) : "",
    markdown: filePath ? await readUtf8TextFile(filePath) : "",
    locale: resolveRuntimeLocale() || "en-US",
    messages: buildMarkdownReaderMessages(),
  };
}

function writeReaderBridgeTarget(
  target: MarkdownReaderBridgeTarget | null | undefined,
  runtime?: MarkdownAttachmentRuntime,
) {
  if (!target) {
    return;
  }
  if (!runtime) {
    delete target.__zoteroSkillsMarkdownReaderBridge;
    return;
  }
  const bridge: MarkdownReaderBridge = {
    requestDocument: () => buildDocumentPayload(runtime),
    refresh: () => buildDocumentPayload(runtime),
    openSystem: () => openSystemDefault(String(runtime.args.filePath || "")),
    openFolder: () => openFileLocation(String(runtime.args.filePath || "")),
    isSidebarOpen: () =>
      isAssistantWorkspaceSidebarOpen({ window: runtime.window }),
    openSidebar: () =>
      openAssistantWorkspaceSidebar({
        window: runtime.window,
      }),
    closeSidebar: () =>
      closeAssistantWorkspaceSidebar({
        window: runtime.window,
      }),
  };
  target.__zoteroSkillsMarkdownReaderBridge = bridge;
}

function installReaderBridge(runtime: MarkdownAttachmentRuntime) {
  const frameWindow = resolveFrameWindow(runtime.frame);
  if (!frameWindow || !isExpectedReaderFrameWindow(frameWindow)) {
    return false;
  }
  applyMarkdownReaderTabTitle(runtime);
  runtime.frameWindow = frameWindow;
  const directTarget = frameWindow as MarkdownReaderBridgeTarget;
  const wrappedTarget =
    typeof directTarget.wrappedJSObject === "object"
      ? (directTarget.wrappedJSObject as MarkdownReaderBridgeTarget)
      : null;
  writeReaderBridgeTarget(directTarget, runtime);
  writeReaderBridgeTarget(wrappedTarget, runtime);
  return true;
}

function clearReaderBridge(runtime: MarkdownAttachmentRuntime) {
  const frameWindow = runtime.frameWindow || resolveFrameWindow(runtime.frame);
  if (!frameWindow) {
    return;
  }
  const directTarget = frameWindow as MarkdownReaderBridgeTarget;
  const wrappedTarget =
    typeof directTarget.wrappedJSObject === "object"
      ? (directTarget.wrappedJSObject as MarkdownReaderBridgeTarget)
      : null;
  writeReaderBridgeTarget(directTarget);
  writeReaderBridgeTarget(wrappedTarget);
  runtime.frameWindow = null;
}

function clearReaderHandshake(runtime: MarkdownAttachmentRuntime) {
  if (!runtime.handshakeTimer) {
    return;
  }
  clearInterval(runtime.handshakeTimer);
  runtime.handshakeTimer = undefined;
}

function finalizeReaderHandshake(runtime: MarkdownAttachmentRuntime) {
  if (runtime.handshakeComplete) {
    return;
  }
  runtime.handshakeComplete = true;
  clearReaderHandshake(runtime);
}

function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeScriptJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildStandaloneFallbackHtml(payload: MarkdownDocumentPayload) {
  const documentJson = serializeScriptJson(payload);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtmlText(payload.title || "Markdown")}</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; background: Canvas; color: CanvasText; }
      header { position: sticky; top: 0; padding: 12px 18px; border-bottom: 1px solid color-mix(in srgb, CanvasText 16%, Canvas); background: Canvas; }
      strong, span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      span { margin-top: 3px; color: color-mix(in srgb, CanvasText 62%, Canvas); font-size: 12px; }
      main { width: min(920px, 100%); box-sizing: border-box; margin: 0 auto; padding: 28px 32px 64px; }
      pre { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; font: 14px/1.55 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; }
    </style>
  </head>
  <body>
    <header>
      <strong id="title"></strong>
      <span id="path"></span>
    </header>
    <main><pre id="markdown"></pre></main>
    <script>
      const payload = ${documentJson};
      document.getElementById("title").textContent = payload.title || "Markdown";
      document.getElementById("path").textContent = payload.filePath || "";
      document.getElementById("markdown").textContent = payload.markdown || "";
    </script>
  </body>
</html>`;
}

async function openStandaloneFallback(runtime: MarkdownAttachmentRuntime) {
  if (runtime.fallbackOpened) {
    return;
  }
  runtime.fallbackOpened = true;
  try {
    const payload = await buildDocumentPayload(runtime);
    const fallbackDir = joinPath(
      getRuntimePersistencePaths().tmpDir,
      "markdown-reader",
    );
    const fallbackPath = joinPath(
      fallbackDir,
      `${sanitizeTabPart(runtime.tabId) || "markdown-reader"}.html`,
    );
    await writeRuntimeTextFile(
      fallbackPath,
      buildStandaloneFallbackHtml(payload),
    );
    await openSystemDefault(fallbackPath);
  } catch (error) {
    const zotero = (globalThis as any).Zotero as
      | {
          logError?: (error: unknown) => void;
          warn?: (message: string) => void;
        }
      | undefined;
    if (typeof zotero?.logError === "function") {
      zotero.logError(error);
    } else if (typeof zotero?.warn === "function") {
      zotero.warn(error instanceof Error ? error.message : String(error || ""));
    }
  }
}

function scheduleReaderHandshake(runtime: MarkdownAttachmentRuntime) {
  if (runtime.handshakeComplete || runtime.handshakeTimer) {
    return;
  }
  const run = () => {
    runtime.handshakeAttemptCount += 1;
    if (installReaderBridge(runtime)) {
      runtime.handshakeSuccessCount += 1;
      if (
        runtime.handshakeSuccessCount >=
        MARKDOWN_READER_HANDSHAKE_REQUIRED_SUCCESSES
      ) {
        finalizeReaderHandshake(runtime);
        return;
      }
    }
    if (
      runtime.handshakeAttemptCount >= MARKDOWN_READER_HANDSHAKE_MAX_ATTEMPTS
    ) {
      if (runtime.handshakeSuccessCount > 0) {
        finalizeReaderHandshake(runtime);
        return;
      }
      clearReaderHandshake(runtime);
      void openStandaloneFallback(runtime);
    }
  };
  run();
  runtime.handshakeTimer = setInterval(
    run,
    MARKDOWN_READER_HANDSHAKE_INTERVAL_MS,
  );
}

function installReaderLoadBridge(runtime: MarkdownAttachmentRuntime) {
  runtime.frame.addEventListener("load", () => {
    runtime.frameWindow = resolveFrameWindow(runtime.frame);
    applyMarkdownReaderTabTitle(runtime);
    runtime.handshakeComplete = false;
    runtime.handshakeAttemptCount = 0;
    runtime.handshakeSuccessCount = 0;
    clearReaderHandshake(runtime);
    scheduleReaderHandshake(runtime);
  });
}

export async function openMarkdownAttachmentTab(
  args: MarkdownAttachmentTabArgs,
) {
  const hostWindow = resolveHostWindow(args.window);
  const tabs = resolveZoteroTabs(hostWindow);
  if (!hostWindow?.document || !tabs?.add || !tabs.select) {
    throw new Error("Cannot open Markdown reader: Zotero_Tabs is unavailable.");
  }

  const tabId = resolveMarkdownReaderTabId(args);
  const existing = markdownReaderTabs.get(tabId);
  if (existing) {
    tabs.select(tabId);
    applyMarkdownReaderTabTitle(existing);
    scheduleReaderHandshake(existing);
    return;
  }

  const result = tabs.add({
    id: tabId,
    type: "zotero-skills-markdown-reader",
    title: resolveMarkdownReaderTitle(args),
    data: {
      kind: "zotero-skills-markdown-reader",
      markdownItemID: args.itemID,
      markdownItemKey: args.itemKey,
      title: resolveMarkdownReaderTitle(args),
      icon: MARKDOWN_READER_TAB_ICON,
      iconURI: MARKDOWN_READER_TAB_ICON_URI,
    },
    select: true,
    onClose: () => {
      const runtime = markdownReaderTabs.get(tabId);
      if (runtime) {
        clearReaderHandshake(runtime);
        clearReaderBridge(runtime);
      }
      markdownReaderTabs.delete(tabId);
    },
  });
  const container = result?.container;
  if (!container) {
    throw new Error("Cannot open Markdown reader: tab container is missing.");
  }

  const frame = createMarkdownBrowser(hostWindow.document);
  container.appendChild(frame);
  const runtime: MarkdownAttachmentRuntime = {
    tabId,
    frame,
    frameWindow: resolveFrameWindow(frame),
    args,
    window: hostWindow,
    handshakeAttemptCount: 0,
    handshakeSuccessCount: 0,
    handshakeComplete: false,
    fallbackOpened: false,
  };
  installReaderLoadBridge(runtime);
  markdownReaderTabs.set(tabId, runtime);
  setFrameSource(frame, resolveMarkdownReaderPageUrl(args));
  applyMarkdownReaderTabTitle(runtime);
  scheduleReaderHandshake(runtime);
  tabs.select(tabId);
}

export function resetMarkdownAttachmentTabsForTests() {
  markdownReaderTabs.forEach((runtime) => {
    clearReaderHandshake(runtime);
    clearReaderBridge(runtime);
  });
  markdownReaderTabs.clear();
}

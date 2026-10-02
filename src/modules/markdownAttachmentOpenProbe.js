import { openMarkdownAttachmentTab } from "./markdownAttachmentTab";
import { getPref } from "../utils/prefs";
const MARKDOWN_CONTENT_TYPES = new Set(["text/markdown", "text/x-markdown"]);
const MARKDOWN_EXTENSION_PATTERN = /\.(md|markdown)$/i;
let installed;
function normalizeContentType(value) {
    return String(value || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
}
export function isMarkdownAttachmentCandidate(args) {
    const filePath = String(args.filePath || "").trim();
    const contentType = normalizeContentType(args.contentType);
    if (filePath && MARKDOWN_EXTENSION_PATTERN.test(filePath)) {
        return true;
    }
    return MARKDOWN_CONTENT_TYPES.has(contentType);
}
async function resolveFilePath(item) {
    if (typeof item.getFilePathAsync === "function") {
        return item.getFilePathAsync();
    }
    return item.getFilePath?.();
}
function resolveAttachmentTitle(item, filePath) {
    const title = String(item.getField?.("title") || "").trim();
    if (title) {
        return title;
    }
    const pathParts = filePath.split(/[\\/]+/);
    return pathParts[pathParts.length - 1] || "Markdown";
}
function canProbeItem(item) {
    if (typeof item.isAttachment === "function" && !item.isAttachment()) {
        return false;
    }
    if (typeof item.isFileAttachment === "function" && !item.isFileAttachment()) {
        return false;
    }
    return true;
}
export function installMarkdownAttachmentOpenProbe(options = {}) {
    if (installed) {
        return;
    }
    const runtime = options.runtime ||
        globalThis.Zotero;
    const originalOpen = runtime?.FileHandlers?.open;
    if (!runtime?.FileHandlers || typeof originalOpen !== "function") {
        runtime?.warn?.("[markdown-reader-probe] Zotero.FileHandlers.open is unavailable");
        return;
    }
    const openTab = options.openTab || openMarkdownAttachmentTab;
    const isReaderEnabled = options.isReaderEnabled ||
        (() => {
            try {
                return getPref("markdownReaderEnabled") !== false;
            }
            catch {
                return true;
            }
        });
    runtime.FileHandlers.open = async function markdownAttachmentOpenProbe(item, params) {
        try {
            if (isReaderEnabled() && canProbeItem(item)) {
                const filePath = (await resolveFilePath(item)) || "";
                if (isMarkdownAttachmentCandidate({
                    filePath,
                    contentType: item.attachmentContentType,
                })) {
                    runtime.debug?.(`[markdown-reader-probe] redirecting Markdown attachment ${String(item.libraryKey || item.key || item.id || "")}`);
                    await openTab({
                        itemID: item.id || "",
                        itemKey: item.key,
                        title: resolveAttachmentTitle(item, filePath),
                        filePath,
                    });
                    return true;
                }
            }
        }
        catch (error) {
            runtime.logError?.(error);
            runtime.warn?.("[markdown-reader-probe] failed to redirect Markdown attachment; falling back to Zotero default");
        }
        return originalOpen.call(this, item, params);
    };
    installed = {
        runtime,
        originalOpen,
    };
}
export function uninstallMarkdownAttachmentOpenProbe() {
    if (!installed) {
        return;
    }
    if (installed.runtime.FileHandlers) {
        installed.runtime.FileHandlers.open = installed.originalOpen;
    }
    installed = undefined;
}
export function resetMarkdownAttachmentOpenProbeForTests() {
    uninstallMarkdownAttachmentOpenProbe();
}

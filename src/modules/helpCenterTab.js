import { config } from "../../package.json";
import { getDocsUrl } from "../utils/docsUrl";
import { resolveAddonRef } from "../utils/runtimeBridge";
const HELP_CENTER_TAB_ID = "zotero-skills-help-center";
const HELP_CENTER_TAB_ICON = "zotero-skills-markdown-reader";
const HELP_CENTER_TAB_ICON_URI = "chrome://zotero-skills/content/icons/markdown-reader.svg";
const HELP_CENTER_BRIDGE_KEY = "__zoteroAgentsHelpCenterBridge";
const HELP_CENTER_BRIDGE_INTERVAL_MS = 100;
const HELP_CENTER_BRIDGE_MAX_ATTEMPTS = 30;
let helpCenterRuntime;
function resolveWindowZoteroTabs(win) {
    return win
        ?.Zotero_Tabs;
}
function resolveHostWindow(argsWindow) {
    const argsWindowTabs = resolveWindowZoteroTabs(argsWindow);
    if (argsWindow?.document && argsWindowTabs?.add && argsWindowTabs.select) {
        return argsWindow;
    }
    return globalThis.Zotero?.getMainWindow?.();
}
function resolveZoteroTabs(win) {
    return (resolveWindowZoteroTabs(win) ||
        globalThis.Zotero_Tabs);
}
function resolveHelpCenterPageUrl(args) {
    const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
    if (!addonRef) {
        throw new Error("Cannot open help center: addonRef is unavailable.");
    }
    const params = new URLSearchParams();
    const browserLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";
    const locale = args.locale ||
        String(globalThis.Zotero?.locale || browserLocale || "en-US");
    params.set("locale", locale);
    if (args.docId) {
        params.set("doc", args.docId);
    }
    return `chrome://${addonRef}/content/help-center/index.html?${params.toString()}`;
}
function createHelpCenterBrowser(doc) {
    const xulDocument = doc;
    const frame = typeof xulDocument.createXULElement === "function"
        ? xulDocument.createXULElement("browser")
        : doc.createElement("iframe");
    frame.setAttribute("data-zs-role", "help-center-frame");
    frame.setAttribute("disableglobalhistory", "true");
    frame.setAttribute("flex", "1");
    frame.setAttribute("maychangeremoteness", "true");
    frame.setAttribute("type", "content");
    frame.setAttribute("transparent", "true");
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.minHeight = "0";
    frame.style.border = "none";
    return frame;
}
function setFrameSource(frame, pageUrl) {
    if (typeof HTMLIFrameElement !== "undefined" &&
        frame instanceof HTMLIFrameElement) {
        frame.src = pageUrl;
        return;
    }
    frame.setAttribute("src", pageUrl);
}
function resolveFrameWindow(frame) {
    return (frame.contentWindow ||
        frame.contentWindow ||
        frame.contentDocument
            ?.defaultView ||
        null);
}
function openUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
        return;
    }
    const zotero = globalThis.Zotero;
    zotero?.launchURL?.(url);
}
function openOnlineDocs() {
    openUrl(getDocsUrl());
}
function writeHelpCenterBridgeTarget(target, runtime) {
    if (!target) {
        return;
    }
    if (!runtime) {
        delete target[HELP_CENTER_BRIDGE_KEY];
        return;
    }
    target[HELP_CENTER_BRIDGE_KEY] = {
        openOnlineDocs,
        openUrl,
    };
}
function installDirectHelpCenterBridge(runtime) {
    const frameWindow = resolveFrameWindow(runtime.frame);
    if (!frameWindow) {
        return false;
    }
    runtime.frameWindow = frameWindow;
    const wrappedTarget = typeof frameWindow.wrappedJSObject === "object"
        ? frameWindow.wrappedJSObject
        : null;
    writeHelpCenterBridgeTarget(frameWindow, runtime);
    writeHelpCenterBridgeTarget(wrappedTarget, runtime);
    return true;
}
function clearDirectHelpCenterBridge(runtime) {
    const frameWindow = (runtime.frameWindow ||
        resolveFrameWindow(runtime.frame));
    if (!frameWindow) {
        return;
    }
    const wrappedTarget = typeof frameWindow.wrappedJSObject === "object"
        ? frameWindow.wrappedJSObject
        : null;
    writeHelpCenterBridgeTarget(frameWindow);
    writeHelpCenterBridgeTarget(wrappedTarget);
}
function clearHelpCenterBridgeTimer(runtime) {
    if (runtime.bridgeTimer) {
        clearInterval(runtime.bridgeTimer);
        runtime.bridgeTimer = undefined;
    }
}
function scheduleHelpCenterBridge(runtime) {
    clearHelpCenterBridgeTimer(runtime);
    runtime.bridgeAttemptCount = 0;
    const run = () => {
        runtime.bridgeAttemptCount += 1;
        if (installDirectHelpCenterBridge(runtime) ||
            runtime.bridgeAttemptCount >= HELP_CENTER_BRIDGE_MAX_ATTEMPTS) {
            clearHelpCenterBridgeTimer(runtime);
        }
    };
    run();
    if (!runtime.bridgeTimer) {
        runtime.bridgeTimer = setInterval(run, HELP_CENTER_BRIDGE_INTERVAL_MS);
    }
}
function installHelpCenterBridge(runtime) {
    const listener = (event) => {
        if (runtime.frameWindow &&
            event.source &&
            event.source !== runtime.frameWindow) {
            return;
        }
        const message = event.data;
        if (message?.type !== "zotero-agents-help-center") {
            return;
        }
        if (message.action === "open-online-docs") {
            openOnlineDocs();
            return;
        }
        if (message.action === "open-url") {
            openUrl(String(message.payload?.url || ""));
        }
    };
    runtime.window.addEventListener("message", listener);
    runtime.removeMessageListener = () => {
        runtime.window.removeEventListener("message", listener);
    };
}
export async function openHelpCenterTab(args = {}) {
    const hostWindow = resolveHostWindow(args.window);
    const tabs = resolveZoteroTabs(hostWindow);
    if (!hostWindow?.document || !tabs?.add || !tabs.select) {
        throw new Error("Cannot open help center: Zotero_Tabs is unavailable.");
    }
    if (helpCenterRuntime) {
        tabs.select(HELP_CENTER_TAB_ID);
        setFrameSource(helpCenterRuntime.frame, resolveHelpCenterPageUrl(args));
        return;
    }
    const result = tabs.add({
        id: HELP_CENTER_TAB_ID,
        type: "zotero-skills-help-center",
        title: "Zotero Agents Help",
        data: {
            kind: "zotero-skills-help-center",
            title: "Zotero Agents Help",
            icon: HELP_CENTER_TAB_ICON,
            iconURI: HELP_CENTER_TAB_ICON_URI,
        },
        select: true,
        onClose: () => {
            if (helpCenterRuntime) {
                clearHelpCenterBridgeTimer(helpCenterRuntime);
                clearDirectHelpCenterBridge(helpCenterRuntime);
            }
            helpCenterRuntime?.removeMessageListener?.();
            helpCenterRuntime = undefined;
        },
    });
    const container = result?.container;
    if (!container) {
        throw new Error("Cannot open help center: tab container is missing.");
    }
    const frame = createHelpCenterBrowser(hostWindow.document);
    container.appendChild(frame);
    helpCenterRuntime = {
        tabId: HELP_CENTER_TAB_ID,
        window: hostWindow,
        frame,
        frameWindow: resolveFrameWindow(frame),
        bridgeAttemptCount: 0,
    };
    frame.addEventListener("load", () => {
        if (helpCenterRuntime) {
            helpCenterRuntime.frameWindow = resolveFrameWindow(frame);
            scheduleHelpCenterBridge(helpCenterRuntime);
        }
    });
    installHelpCenterBridge(helpCenterRuntime);
    setFrameSource(frame, resolveHelpCenterPageUrl(args));
    scheduleHelpCenterBridge(helpCenterRuntime);
    tabs.select(HELP_CENTER_TAB_ID);
}
export function resetHelpCenterTabForTests() {
    if (helpCenterRuntime) {
        clearHelpCenterBridgeTimer(helpCenterRuntime);
        clearDirectHelpCenterBridge(helpCenterRuntime);
    }
    helpCenterRuntime?.removeMessageListener?.();
    helpCenterRuntime = undefined;
}

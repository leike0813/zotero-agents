import { config } from "../../../package.json";
import { resolveBackendDisplayName } from "../../backends/displayName";
import { resolveAddonRef } from "../../utils/runtimeBridge";
import { buildSkillRunnerManagementUiUrl } from "../skillRunner/surface/skillRunnerManagementDialog";

export type DashboardManagementHost = {
  mount: (args: {
    backendId: string;
    title: string;
    url: string;
    onClose: () => void;
  }) => void;
  clear: () => void;
};

type ManagementBackend = {
  id: string;
  baseUrl: string;
  displayName?: string;
};

type DashboardFrameOwnerArgs = {
  managementHost?: DashboardManagementHost;
  selectedBackendId: () => string;
  selectedBackendSubview: (backendId: string) => "runs" | "management";
  findBackend: (backendId: string) => ManagementBackend | undefined;
  showRuns: (backendId: string) => void;
};

function pageUrl() {
  const addonRef = String(config.addonRef || "").trim() || resolveAddonRef("");
  return addonRef
    ? `chrome://${addonRef}/content/dashboard/index.html?ui=20260521-submit-v1`
    : "about:blank";
}

function managementUrl(baseUrl: string) {
  try {
    return buildSkillRunnerManagementUiUrl(baseUrl);
  } catch {
    return "";
  }
}

function createContentBrowser(doc: Document, url: string) {
  const createXul = (doc as { createXULElement?: (tag: string) => Element })
    .createXULElement;
  if (typeof createXul === "function") {
    const browser = createXul.call(doc, "browser");
    browser.setAttribute(
      "data-zs-role",
      "skillrunner-management-dashboard-frame",
    );
    browser.setAttribute("disableglobalhistory", "true");
    browser.setAttribute("maychangeremoteness", "true");
    browser.setAttribute("type", "content");
    browser.setAttribute("flex", "1");
    browser.setAttribute("src", url);
    const style = (browser as Element & { style?: CSSStyleDeclaration }).style;
    style?.setProperty("width", "100%");
    style?.setProperty("height", "100%");
    style?.setProperty("min-width", "0");
    style?.setProperty("min-height", "0");
    style?.setProperty("border", "0");
    style?.setProperty("flex", "1 1 auto");
    return browser;
  }
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "skillrunner-management-dashboard-frame");
  frame.setAttribute("title", "SkillRunner Management");
  frame.setAttribute("src", url);
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minWidth = "0";
  frame.style.minHeight = "0";
  frame.style.border = "0";
  frame.style.flex = "1 1 auto";
  return frame;
}

function createFrame(doc: Document) {
  const url = pageUrl();
  if (!/^chrome:\/\//i.test(url)) {
    const createXul = (doc as { createXULElement?: (tag: string) => Element })
      .createXULElement;
    if (typeof createXul === "function") {
      const browser = createXul.call(doc, "browser");
      browser.setAttribute("data-zs-role", "task-dashboard-frame");
      browser.setAttribute("disableglobalhistory", "true");
      browser.setAttribute("remote", "true");
      browser.setAttribute("maychangeremoteness", "true");
      browser.setAttribute("type", "content");
      browser.setAttribute("flex", "1");
      browser.setAttribute("src", url);
      const style = (browser as Element & { style?: CSSStyleDeclaration })
        .style;
      style?.setProperty("width", "100%");
      style?.setProperty("height", "100%");
      style?.setProperty("min-height", "0");
      style?.setProperty("flex", "1");
      return browser;
    }
  }
  const frame = doc.createElement("iframe");
  frame.setAttribute("data-zs-role", "task-dashboard-frame");
  frame.setAttribute("src", url);
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.minHeight = "0";
  frame.style.flex = "1";
  frame.style.border = "none";
  return frame;
}

export function createDashboardFrameOwner(args: DashboardFrameOwnerArgs) {
  let frame: Element | null = null;
  let frameWindow: Window | null = null;
  let removeMessageListener: (() => void) | undefined;
  let managementMount: Element | null = null;
  let managementKey = "";

  const clearManagement = () => {
    args.managementHost?.clear();
    managementMount?.remove();
    managementMount = null;
    managementKey = "";
  };

  return {
    window: () => frameWindow,
    mount(
      root: HTMLElement,
      hostWindow: Window,
      callbacks: {
        onLoad: (frameWindow: Window | null) => void;
        onAction: (event: MessageEvent) => void;
      },
    ) {
      root.innerHTML = "";
      frame = createFrame(root.ownerDocument || hostWindow.document);
      root.appendChild(frame);
      const resolveWindow = () =>
        (frame as Element & { contentWindow?: Window | null }).contentWindow ||
        null;
      frameWindow = resolveWindow();
      frame.addEventListener("load", () => {
        frameWindow = resolveWindow();
        callbacks.onLoad(frameWindow);
      });
      hostWindow.addEventListener("message", callbacks.onAction);
      removeMessageListener = () =>
        hostWindow.removeEventListener("message", callbacks.onAction);
    },
    mountManagement(payload: Record<string, unknown> | undefined) {
      const backendId = String(payload?.backendId || "").trim();
      const requestedUrl = String(payload?.managementUiUrl || "").trim();
      const backend = args.findBackend(backendId);
      if (
        !backend ||
        !requestedUrl ||
        !frameWindow?.document ||
        args.selectedBackendId() !== backendId ||
        args.selectedBackendSubview(backendId) !== "management" ||
        managementUrl(backend.baseUrl) !== requestedUrl
      ) {
        clearManagement();
        return;
      }
      const mount = Array.from(
        frameWindow.document.querySelectorAll(
          "[data-zs-role='skillrunner-management-dashboard-host']",
        ),
      ).find(
        (node) =>
          String((node as HTMLElement).dataset.backendId || "").trim() ===
          backendId,
      ) as HTMLElement | undefined;
      if (!mount) {
        clearManagement();
        return;
      }
      const key = `${backendId}\n${requestedUrl}`;
      if (args.managementHost) {
        if (managementKey === key) return;
        managementMount?.remove();
        managementMount = null;
        managementKey = key;
        args.managementHost.mount({
          backendId,
          title:
            resolveBackendDisplayName(backendId, backend.displayName) ||
            "SkillRunner Management",
          url: requestedUrl,
          onClose: () => args.showRuns(backendId),
        });
        return;
      }
      if (managementKey === key && managementMount?.parentElement === mount) {
        return;
      }
      clearManagement();
      mount.textContent = "";
      managementMount = createContentBrowser(
        frameWindow.document,
        requestedUrl,
      );
      managementKey = key;
      mount.appendChild(managementMount);
    },
    clearManagement,
    cleanup() {
      removeMessageListener?.();
      removeMessageListener = undefined;
      clearManagement();
      frameWindow = null;
      frame?.remove();
      frame = null;
    },
  };
}

declare const window: Window &
  typeof globalThis & {
    __zoteroSkillsWorkspaceBridge?: WorkspaceBridge;
  };
declare const document: Document;

type WorkspaceView = "dashboard" | "synthesis";

type WorkspaceBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
};

type WorkspaceSnapshot = {
  selectedView: WorkspaceView;
};

const state: {
  snapshot: WorkspaceSnapshot;
} = {
  snapshot: {
    selectedView: "dashboard",
  },
};

function sendAction(action: string, payload: Record<string, unknown> = {}) {
  const direct = window.__zoteroSkillsWorkspaceBridge;
  if (direct && typeof direct.postMessage === "function") {
    void Promise.resolve(direct.postMessage(action, payload));
    return;
  }
  const message = { type: "workspace:action", action, payload };
  for (const target of [window.parent, window.top, window.opener]) {
    try {
      target?.postMessage(message, "*");
    } catch {
      // ignore bridge target failures
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (typeof text === "string") {
    node.textContent = text;
  }
  return node;
}

function clear(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function button(
  label: string,
  action: string,
  payload: Record<string, unknown> = {},
  className = "",
) {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", () => sendAction(action, payload));
  return node;
}

function iconButton(
  label: string,
  action: string,
  payload: Record<string, unknown> = {},
  className = "",
  iconClassName = "toolbar-icon",
) {
  const node = button(label, action, payload, className);
  node.setAttribute("aria-label", label);
  node.setAttribute("title", label);
  node.textContent = "";
  const icon = el("span", iconClassName);
  icon.setAttribute("aria-hidden", "true");
  node.appendChild(icon);
  return node;
}

function renderHeader(root: HTMLElement, snapshot: WorkspaceSnapshot) {
  const header = el("header", "workspace-header");
  const brand = el("div", "brand");
  brand.appendChild(el("strong", "", "Zotero Skills"));
  brand.appendChild(el("span", "muted", "Dashboard and Synthesis workspace"));
  header.appendChild(brand);

  const segmented = el("nav", "segmented");
  segmented.setAttribute("aria-label", "Workspace views");
  [
    ["dashboard", "Dashboard"],
    ["synthesis", "Synthesis"],
  ].forEach(([view, label]) => {
    segmented.appendChild(
      button(
        label,
        "select-view",
        { view },
        snapshot.selectedView === view ? "active" : "",
      ),
    );
  });
  header.appendChild(segmented);

  const toolbar = el("div", "toolbar");
  toolbar.appendChild(
    iconButton(
      "Refresh",
      "refresh",
      {},
      "icon-button refresh-toggle",
      "toolbar-icon refresh-icon",
    ),
  );
  toolbar.appendChild(
    iconButton(
      "Toggle sidebar",
      "toggle-sidebar",
      {},
      "icon-button sidebar-toggle",
      "toolbar-icon sidebar-icon",
    ),
  );
  header.appendChild(toolbar);
  root.appendChild(header);
}

function renderWorkspacePanel(snapshot: WorkspaceSnapshot) {
  const selected = snapshot.selectedView;
  const panel = el(
    "section",
    selected === "dashboard"
      ? "workspace-panel is-dashboard"
      : "workspace-panel is-synthesis",
  );
  if (selected === "synthesis") {
    const mount = el("div", "synthesis-mount");
    mount.id = "synthesis-mount";
    panel.appendChild(mount);
    window.setTimeout(() => sendAction("synthesis-mount-ready"), 0);
    return panel;
  }
  const mount = el("div", "dashboard-mount");
  mount.id = "dashboard-mount";
  panel.appendChild(mount);
  window.setTimeout(() => sendAction("dashboard-mount-ready"), 0);
  return panel;
}

function render() {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root) {
    return;
  }
  clear(root);
  renderHeader(root, state.snapshot);
  const main = el("main", "workspace-main");
  main.appendChild(renderWorkspacePanel(state.snapshot));
  root.appendChild(main);
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as { type?: unknown; payload?: unknown };
  if (!data || typeof data !== "object") {
    return;
  }
  if (data.type === "workspace:init" || data.type === "workspace:snapshot") {
    const payload =
      data.payload && typeof data.payload === "object"
        ? (data.payload as Partial<WorkspaceSnapshot>)
        : {};
    const nextSnapshot = {
      selectedView: payload.selectedView === "synthesis" ? "synthesis" : "dashboard",
    } satisfies WorkspaceSnapshot;
    const viewChanged = state.snapshot.selectedView !== nextSnapshot.selectedView;
    state.snapshot = nextSnapshot;
    if (viewChanged) {
      render();
    }
  }
});

sendAction("ready");
render();

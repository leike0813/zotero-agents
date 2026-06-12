declare const window: Window &
  typeof globalThis & {
    __zoteroSkillsWorkspaceBridge?: WorkspaceBridge;
    ZoteroSkillsTheme?: {
      getTheme: () => WorkspaceTheme;
      setTheme: (theme: WorkspaceTheme) => WorkspaceTheme;
    };
  };
declare const document: Document;

type WorkspaceView = "dashboard" | "synthesis";
type WorkspaceTheme = "system" | "light" | "dark";

type WorkspaceBridge = {
  postMessage: (
    action: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown> | unknown;
};

type WorkspaceSnapshot = {
  selectedView: WorkspaceView;
  waitingCount: number;
};

const state: {
  snapshot: WorkspaceSnapshot;
  theme: WorkspaceTheme;
} = {
  snapshot: {
    selectedView: "dashboard",
    waitingCount: 0,
  },
  theme: "system",
};

function normalizeWaitingCount(value: unknown) {
  const count = Math.floor(Number(value) || 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function formatAttentionCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

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

function getThemeChoice(): WorkspaceTheme {
  const candidate = window.ZoteroSkillsTheme?.getTheme?.();
  return candidate === "light" || candidate === "dark" ? candidate : "system";
}

function setThemeChoice(theme: WorkspaceTheme) {
  state.theme = window.ZoteroSkillsTheme?.setTheme?.(theme) || theme;
  updateThemeSwitchState();
}

function renderThemeSwitch() {
  const group = el("div", "theme-switch");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Theme");
  [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ].forEach(([theme, label]) => {
    const node = el("button", state.theme === theme ? "active" : "", label);
    node.type = "button";
    node.dataset.theme = theme;
    node.setAttribute("aria-pressed", state.theme === theme ? "true" : "false");
    node.addEventListener("click", () =>
      setThemeChoice(theme as WorkspaceTheme),
    );
    group.appendChild(node);
  });
  return group;
}

function updateThemeSwitchState() {
  const group = document.querySelector<HTMLElement>(".theme-switch");
  if (!group) {
    return;
  }
  const buttons = Array.from(
    group.querySelectorAll("button"),
  ) as HTMLButtonElement[];
  buttons.forEach((node) => {
    const active = node.dataset.theme === state.theme;
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateWorkspaceSidebarAttention() {
  const button = document.querySelector<HTMLButtonElement>(".sidebar-toggle");
  if (!button) {
    return;
  }
  const count = normalizeWaitingCount(state.snapshot.waitingCount);
  const hasAttention = count > 0;
  button.setAttribute("data-attention", hasAttention ? "true" : "false");
  button.setAttribute(
    "data-attention-count",
    hasAttention ? formatAttentionCount(count) : "0",
  );
}

function renderHeader(root: HTMLElement, snapshot: WorkspaceSnapshot) {
  state.theme = getThemeChoice();
  const header = el("header", "workspace-header");
  const brand = el("div", "brand");
  brand.appendChild(el("strong", "", "Zotero Skills"));
  brand.appendChild(el("span", "muted", "Dashboard and Synthesis workspace"));
  header.appendChild(brand);

  const segmented = el(
    "nav",
    snapshot.selectedView === "synthesis"
      ? "segmented workspace-view-switch is-synthesis"
      : "segmented workspace-view-switch is-dashboard",
  );
  segmented.setAttribute("aria-label", "Workspace views");
  const thumb = el("span", "segmented-thumb");
  thumb.setAttribute("aria-hidden", "true");
  segmented.appendChild(thumb);
  [
    ["dashboard", "Dashboard"],
    ["synthesis", "Synthesis"],
  ].forEach(([view, label]) => {
    const node = button(
      label,
      "select-view",
      { view },
      snapshot.selectedView === view ? "active" : "",
    );
    node.dataset.view = view;
    node.setAttribute(
      "aria-pressed",
      snapshot.selectedView === view ? "true" : "false",
    );
    segmented.appendChild(node);
  });
  header.appendChild(segmented);

  const toolbar = el("div", "toolbar");
  toolbar.appendChild(renderThemeSwitch());
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
  updateWorkspaceSidebarAttention();
}

function renderWorkspacePanel(snapshot: WorkspaceSnapshot) {
  const selected = snapshot.selectedView;
  const panel = el(
    "section",
    selected === "dashboard"
      ? "workspace-panel is-dashboard"
      : "workspace-panel is-synthesis",
  );
  const dashboardMount = el(
    "div",
    selected === "dashboard"
      ? "workspace-view-mount dashboard-mount is-active"
      : "workspace-view-mount dashboard-mount",
  );
  dashboardMount.id = "dashboard-mount";
  dashboardMount.setAttribute(
    "aria-hidden",
    selected === "dashboard" ? "false" : "true",
  );
  panel.appendChild(dashboardMount);

  const synthesisMount = el(
    "div",
    selected === "synthesis"
      ? "workspace-view-mount synthesis-mount is-active"
      : "workspace-view-mount synthesis-mount",
  );
  synthesisMount.id = "synthesis-mount";
  synthesisMount.setAttribute(
    "aria-hidden",
    selected === "synthesis" ? "false" : "true",
  );
  panel.appendChild(synthesisMount);
  window.setTimeout(() => sendAction("dashboard-mount-ready"), 0);
  window.setTimeout(() => sendAction("synthesis-mount-ready"), 0);
  return panel;
}

function updateWorkspaceVisibility(snapshot: WorkspaceSnapshot) {
  const selected = snapshot.selectedView;
  const panel = document.querySelector<HTMLElement>(".workspace-panel");
  panel?.classList.toggle("is-dashboard", selected === "dashboard");
  panel?.classList.toggle("is-synthesis", selected === "synthesis");
  const dashboardMount = document.getElementById("dashboard-mount");
  const synthesisMount = document.getElementById("synthesis-mount");
  [
    [dashboardMount, "dashboard"],
    [synthesisMount, "synthesis"],
  ].forEach(([mount, view]) => {
    if (!(mount instanceof HTMLElement)) {
      return;
    }
    const active = selected === view;
    mount.classList.toggle("is-active", active);
    mount.setAttribute("aria-hidden", active ? "false" : "true");
  });
  const buttons = Array.from(
    document.querySelectorAll(".segmented button"),
  ) as HTMLButtonElement[];
  buttons.forEach((node) => {
    const active = node.dataset.view === selected;
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", active ? "true" : "false");
  });
  const switcher = document.querySelector<HTMLElement>(
    ".workspace-view-switch",
  );
  switcher?.classList.toggle("is-dashboard", selected === "dashboard");
  switcher?.classList.toggle("is-synthesis", selected === "synthesis");
  updateWorkspaceSidebarAttention();
}

function render() {
  const root = document.getElementById("app") as HTMLElement | null;
  if (!root) {
    return;
  }
  if (root.querySelector(".workspace-panel")) {
    updateWorkspaceVisibility(state.snapshot);
    updateThemeSwitchState();
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
      selectedView:
        payload.selectedView === "synthesis" ? "synthesis" : "dashboard",
      waitingCount: normalizeWaitingCount(payload.waitingCount),
    } satisfies WorkspaceSnapshot;
    const viewChanged =
      state.snapshot.selectedView !== nextSnapshot.selectedView;
    state.snapshot = nextSnapshot;
    if (viewChanged) {
      render();
    } else {
      updateWorkspaceSidebarAttention();
    }
    return;
  }
  if (data.type === "workspace:attention") {
    const payload =
      data.payload && typeof data.payload === "object"
        ? (data.payload as { waitingCount?: unknown })
        : {};
    state.snapshot = {
      ...state.snapshot,
      waitingCount: normalizeWaitingCount(payload.waitingCount),
    };
    updateWorkspaceSidebarAttention();
  }
});

window.addEventListener("zotero-skills-theme-change", () => {
  const next = getThemeChoice();
  if (state.theme !== next) {
    state.theme = next;
    updateThemeSwitchState();
  }
});

sendAction("ready");
render();

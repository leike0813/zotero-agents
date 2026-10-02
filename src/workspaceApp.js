"use strict";
const DEFAULT_WORKSPACE_LABELS = {
    tabTitle: "Zotero Agents",
    brandSubtitle: "Dashboard and Synthesis workspace",
    viewsAriaLabel: "Workspace views",
    dashboard: "Dashboard",
    synthesis: "Synthesis",
    themeAriaLabel: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    help: "Help",
    onlineDocs: "Online Docs",
    refresh: "Refresh",
    toggleSidebar: "Toggle sidebar",
    openSidebar: "Open sidebar",
    closeSidebar: "Close sidebar",
};
const state = {
    snapshot: {
        selectedView: "dashboard",
        waitingCount: 0,
        labels: DEFAULT_WORKSPACE_LABELS,
    },
    theme: "system",
};
function normalizeWaitingCount(value) {
    const count = Math.floor(Number(value) || 0);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
}
function formatAttentionCount(count) {
    return count > 99 ? "99+" : String(count);
}
function normalizeWorkspaceLabels(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_WORKSPACE_LABELS;
    }
    const source = value;
    const labels = { ...DEFAULT_WORKSPACE_LABELS };
    for (const key of Object.keys(DEFAULT_WORKSPACE_LABELS)) {
        const candidate = source[key];
        if (typeof candidate === "string" && candidate.trim()) {
            labels[key] = candidate;
        }
    }
    return labels;
}
function workspaceLabel(key) {
    return state.snapshot.labels[key] || DEFAULT_WORKSPACE_LABELS[key];
}
function sendAction(action, payload = {}) {
    const direct = window.__zoteroSkillsWorkspaceBridge;
    if (direct && typeof direct.postMessage === "function") {
        void Promise.resolve(direct.postMessage(action, payload));
        return;
    }
    const message = { type: "workspace:action", action, payload };
    for (const target of [window.parent, window.top, window.opener]) {
        try {
            target?.postMessage(message, "*");
        }
        catch {
            // ignore bridge target failures
        }
    }
}
function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (typeof text === "string") {
        node.textContent = text;
    }
    return node;
}
function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
function button(label, action, payload = {}, className = "") {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", () => sendAction(action, payload));
    return node;
}
function iconButton(label, action, payload = {}, className = "", iconClassName = "toolbar-icon") {
    const node = button(label, action, payload, className);
    node.setAttribute("aria-label", label);
    node.setAttribute("title", label);
    node.textContent = "";
    const icon = el("span", iconClassName);
    icon.setAttribute("aria-hidden", "true");
    node.appendChild(icon);
    return node;
}
function getThemeChoice() {
    const candidate = window.ZoteroSkillsTheme?.getTheme?.();
    return candidate === "light" || candidate === "dark" ? candidate : "system";
}
function setThemeChoice(theme) {
    state.theme = window.ZoteroSkillsTheme?.setTheme?.(theme) || theme;
    updateThemeSwitchState();
}
function renderThemeSwitch() {
    const group = el("div", "theme-switch");
    group.setAttribute("role", "group");
    group.dataset.workspaceAriaLabel = "themeAriaLabel";
    group.setAttribute("aria-label", workspaceLabel("themeAriaLabel"));
    [
        ["system", "themeSystem"],
        ["light", "themeLight"],
        ["dark", "themeDark"],
    ].forEach(([theme, label]) => {
        const node = el("button", state.theme === theme ? "active" : "", workspaceLabel(label));
        node.type = "button";
        node.dataset.theme = theme;
        node.dataset.workspaceLabel = label;
        node.setAttribute("aria-pressed", state.theme === theme ? "true" : "false");
        node.addEventListener("click", () => setThemeChoice(theme));
        group.appendChild(node);
    });
    return group;
}
function renderDocsButton(labelKey, action, iconClass) {
    const label = workspaceLabel(labelKey);
    const node = button(label, action, {}, "docs-link-button");
    node.setAttribute("aria-label", label);
    node.setAttribute("title", label);
    node.dataset.workspaceIconLabel = labelKey;
    node.textContent = "";
    const icon = el("span", `zs-icon ${iconClass} docs-link-icon`);
    icon.setAttribute("aria-hidden", "true");
    const text = el("span", "docs-link-label", label);
    text.dataset.workspaceLabel = labelKey;
    node.appendChild(icon);
    node.appendChild(text);
    return node;
}
function renderDocsButtons() {
    const group = el("div", "docs-link-group");
    group.appendChild(renderDocsButton("help", "open-help", "zs-icon-help"));
    group.appendChild(renderDocsButton("onlineDocs", "open-online-docs", "zs-icon-description"));
    return group;
}
function updateThemeSwitchState() {
    const group = document.querySelector(".theme-switch");
    if (!group) {
        return;
    }
    const buttons = Array.from(group.querySelectorAll("button"));
    buttons.forEach((node) => {
        const active = node.dataset.theme === state.theme;
        node.classList.toggle("active", active);
        node.setAttribute("aria-pressed", active ? "true" : "false");
    });
}
function updateWorkspaceLocalizedText() {
    document.title = workspaceLabel("tabTitle");
    document
        .querySelectorAll("[data-workspace-label]")
        .forEach((node) => {
        const key = node.dataset.workspaceLabel;
        if (key) {
            node.textContent = workspaceLabel(key);
        }
    });
    document
        .querySelectorAll("[data-workspace-aria-label]")
        .forEach((node) => {
        const key = node.dataset.workspaceAriaLabel;
        if (key) {
            node.setAttribute("aria-label", workspaceLabel(key));
        }
    });
    document
        .querySelectorAll("[data-workspace-icon-label]")
        .forEach((node) => {
        const key = node.dataset.workspaceIconLabel;
        if (key) {
            const label = workspaceLabel(key);
            node.setAttribute("aria-label", label);
            node.setAttribute("title", label);
        }
    });
}
function updateWorkspaceSidebarAttention() {
    const button = document.querySelector(".sidebar-toggle");
    if (!button) {
        return;
    }
    const count = normalizeWaitingCount(state.snapshot.waitingCount);
    const hasAttention = count > 0;
    button.setAttribute("data-attention", hasAttention ? "true" : "false");
    button.setAttribute("data-attention-count", hasAttention ? formatAttentionCount(count) : "0");
}
function updateWorkspaceSidebarToggleState() {
    const button = document.querySelector(".sidebar-toggle");
    const icon = button?.querySelector(".sidebar-icon");
    if (!button || !icon) {
        return;
    }
    const isOpen = state.snapshot.sidebarOpen === true;
    const label = workspaceLabel(isOpen ? "closeSidebar" : "openSidebar");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", isOpen ? "true" : "false");
    icon.classList.toggle("zs-icon-right-panel-open", !isOpen);
    icon.classList.toggle("zs-icon-right-panel-close", isOpen);
}
function renderHeader(root, snapshot) {
    state.theme = getThemeChoice();
    const header = el("header", "workspace-header");
    const brand = el("div", "brand");
    brand.appendChild(el("strong", "", "Zotero Agents"));
    const subtitle = el("span", "muted", workspaceLabel("brandSubtitle"));
    subtitle.dataset.workspaceLabel = "brandSubtitle";
    brand.appendChild(subtitle);
    header.appendChild(brand);
    const segmented = el("nav", snapshot.selectedView === "synthesis"
        ? "segmented workspace-view-switch is-synthesis"
        : "segmented workspace-view-switch is-dashboard");
    segmented.dataset.workspaceAriaLabel = "viewsAriaLabel";
    segmented.setAttribute("aria-label", workspaceLabel("viewsAriaLabel"));
    const thumb = el("span", "segmented-thumb");
    thumb.setAttribute("aria-hidden", "true");
    segmented.appendChild(thumb);
    [
        ["dashboard", "dashboard"],
        ["synthesis", "synthesis"],
    ].forEach(([view, label]) => {
        const node = button(workspaceLabel(label), "select-view", { view }, snapshot.selectedView === view ? "active" : "");
        node.dataset.view = view;
        node.dataset.workspaceLabel = label;
        node.setAttribute("aria-pressed", snapshot.selectedView === view ? "true" : "false");
        segmented.appendChild(node);
    });
    header.appendChild(segmented);
    const toolbar = el("div", "toolbar");
    toolbar.appendChild(renderDocsButtons());
    toolbar.appendChild(renderThemeSwitch());
    toolbar.appendChild(iconButton(workspaceLabel("refresh"), "refresh", {}, "icon-button refresh-toggle", "zs-icon toolbar-icon refresh-icon zs-icon-refresh"));
    toolbar.lastElementChild?.setAttribute("data-workspace-icon-label", "refresh");
    toolbar.appendChild(iconButton(workspaceLabel("toggleSidebar"), "toggle-sidebar", {}, "icon-button sidebar-toggle", "zs-icon toolbar-icon sidebar-icon zs-icon-right-panel-open"));
    toolbar.lastElementChild?.setAttribute("data-workspace-icon-label", "toggleSidebar");
    header.appendChild(toolbar);
    root.appendChild(header);
    updateWorkspaceLocalizedText();
    updateWorkspaceSidebarAttention();
    updateWorkspaceSidebarToggleState();
}
function renderWorkspacePanel(snapshot) {
    const selected = snapshot.selectedView;
    const panel = el("section", selected === "dashboard"
        ? "workspace-panel is-dashboard"
        : "workspace-panel is-synthesis");
    const dashboardMount = el("div", selected === "dashboard"
        ? "workspace-view-mount dashboard-mount is-active"
        : "workspace-view-mount dashboard-mount");
    dashboardMount.id = "dashboard-mount";
    dashboardMount.setAttribute("aria-hidden", selected === "dashboard" ? "false" : "true");
    panel.appendChild(dashboardMount);
    const synthesisMount = el("div", selected === "synthesis"
        ? "workspace-view-mount synthesis-mount is-active"
        : "workspace-view-mount synthesis-mount");
    synthesisMount.id = "synthesis-mount";
    synthesisMount.setAttribute("aria-hidden", selected === "synthesis" ? "false" : "true");
    panel.appendChild(synthesisMount);
    window.setTimeout(() => sendAction("dashboard-mount-ready"), 0);
    window.setTimeout(() => sendAction("synthesis-mount-ready"), 0);
    return panel;
}
function updateWorkspaceVisibility(snapshot) {
    const selected = snapshot.selectedView;
    const panel = document.querySelector(".workspace-panel");
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
    const buttons = Array.from(document.querySelectorAll(".segmented button"));
    buttons.forEach((node) => {
        const active = node.dataset.view === selected;
        node.classList.toggle("active", active);
        node.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const switcher = document.querySelector(".workspace-view-switch");
    switcher?.classList.toggle("is-dashboard", selected === "dashboard");
    switcher?.classList.toggle("is-synthesis", selected === "synthesis");
    updateWorkspaceSidebarAttention();
    updateWorkspaceSidebarToggleState();
}
function render() {
    const root = document.getElementById("app");
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
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") {
        return;
    }
    if (data.type === "workspace:init" || data.type === "workspace:snapshot") {
        const payload = data.payload && typeof data.payload === "object"
            ? data.payload
            : {};
        const nextSnapshot = {
            selectedView: payload.selectedView === "synthesis" ? "synthesis" : "dashboard",
            waitingCount: normalizeWaitingCount(payload.waitingCount),
            sidebarOpen: payload.sidebarOpen === true,
            labels: normalizeWorkspaceLabels(payload.labels),
        };
        const viewChanged = state.snapshot.selectedView !== nextSnapshot.selectedView;
        state.snapshot = nextSnapshot;
        if (viewChanged) {
            render();
        }
        else {
            updateWorkspaceLocalizedText();
            updateWorkspaceSidebarAttention();
            updateWorkspaceSidebarToggleState();
        }
        return;
    }
    if (data.type === "workspace:attention") {
        const payload = data.payload && typeof data.payload === "object"
            ? data.payload
            : {};
        state.snapshot = {
            ...state.snapshot,
            waitingCount: normalizeWaitingCount(payload.waitingCount),
        };
        updateWorkspaceSidebarAttention();
        updateWorkspaceSidebarToggleState();
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

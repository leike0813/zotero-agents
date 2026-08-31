import { statusTone } from "./assistantPanelModel.js";

// Live surface of the former imperative assistant panel renderer. All chrome
// regions render through the Preact seam (src/sidebar/components/*); only the
// region adoption/mount helpers below remain in production use by
// src/sidebar/assistantWorkspaceAcpChild.js.

function safeText(value) {
  return String(value == null ? "" : value).trim();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

function model() {
  return {
    statusTone,
  };
}

function tone(snapshot) {
  const helper = model();
  const status =
    (snapshot.context && snapshot.context.status) ||
    (snapshot.lifecycle && snapshot.lifecycle.executionState) ||
    "idle";
  if (helper && typeof helper.statusTone === "function") {
    return helper.statusTone(status);
  }
  return "muted";
}

function markRegion(node, className, name, options) {
  if (!node) return;
  node.classList.add("assistant-panel-region");
  if (className) node.classList.add(className);
  if (name) node.setAttribute("data-assistant-region", name);
  if (options && options.managed === false) {
    node.classList.remove("is-assistant-managed");
  }
}

function shouldManageRegion(options, name) {
  if (!options || options.managed !== true) return false;
  const managedRegions = options.managedRegions;
  if (!managedRegions || typeof managedRegions !== "object") return true;
  return managedRegions[name] === true;
}

function managedMount(container, name) {
  if (!container) return null;
  container.classList.add("is-assistant-managed");
  const key = "assistant-panel-managed-" + name;
  let mount = container.querySelector(":scope > ." + key);
  if (!mount) {
    mount = el("div", "assistant-panel-managed-view " + key);
    container.appendChild(mount);
  }
  if (name === "drawer" || name === "details") {
    mount.classList.add("asst-drawer-panel");
  }
  return mount;
}

function emitAssistantPanelAction(options, action, payload) {
  const handler = options && options.onAction;
  if (typeof handler === "function") {
    handler(action, payload || {});
  }
}

function emit(options, action, payload) {
  emitAssistantPanelAction(options, action, payload || {});
}

function installOverlayDismiss(container, action, options) {
  if (!container) return;
  container.onclick = function (event) {
    const panel = container.querySelector(":scope > .asst-drawer-panel");
    const target = event && event.target;
    if (panel && target && panel.contains(target)) {
      if (event && typeof event.stopPropagation === "function")
        event.stopPropagation();
      return;
    }
    emit(options || {}, action, {});
  };
}

function adoptPanelRegions(snapshot, options) {
  const root = options && options.root;
  const regions = (options && options.regions) || {};
  if (root) {
    root.classList.add("assistant-panel-root");
    root.setAttribute("data-assistant-panel-kind", safeText(snapshot.kind));
    root.setAttribute(
      "data-assistant-context-id",
      safeText(snapshot.context && snapshot.context.id),
    );
    root.setAttribute(
      "data-assistant-execution-state",
      safeText(snapshot.lifecycle && snapshot.lifecycle.executionState),
    );
    root.setAttribute(
      "data-assistant-connection-state",
      safeText(snapshot.lifecycle && snapshot.lifecycle.connectionState),
    );
    root.setAttribute("data-assistant-tone", tone(snapshot));
  }
  markRegion(regions.toolbar, "assistant-panel-toolbar", "toolbar");
  markRegion(regions.banner, "assistant-panel-banner", "banner");
  markRegion(
    regions.messageCounter,
    "assistant-panel-message-counter",
    "message-counter",
  );
  markRegion(
    regions.conversation,
    "assistant-panel-conversation",
    "conversation",
    {
      managed: false,
    },
  );
  markRegion(regions.plan, "assistant-panel-plan", "plan");
  markRegion(regions.hint, "assistant-panel-hint", "hint");
  markRegion(regions.reply, "assistant-panel-reply", "reply");
  markRegion(regions.drawer, "assistant-panel-context-drawer", "drawer");
}

export {
  adoptPanelRegions,
  managedMount,
  installOverlayDismiss,
  markRegion,
  shouldManageRegion,
};

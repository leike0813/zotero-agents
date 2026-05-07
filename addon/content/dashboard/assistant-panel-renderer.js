(function () {
  "use strict";

  function safeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function model() {
    return window.AssistantPanelModel && typeof window.AssistantPanelModel === "object"
      ? window.AssistantPanelModel
      : null;
  }

  function normalize(snapshot) {
    const helper = model();
    if (helper && typeof helper.normalizeAssistantPanelSnapshot === "function") {
      return withDefaultPanel(helper.normalizeAssistantPanelSnapshot(snapshot));
    }
    return withDefaultPanel(snapshot && typeof snapshot === "object" ? snapshot : {});
  }

  function withDefaultPanel(source) {
    const input = source && typeof source === "object" ? source : {};
    const context = input.context && typeof input.context === "object" ? input.context : {};
    const lifecycle = input.lifecycle && typeof input.lifecycle === "object" ? input.lifecycle : {};
    const conversation = input.conversation && typeof input.conversation === "object" ? input.conversation : {};
    const plan = input.plan && typeof input.plan === "object" ? input.plan : {};
    const interaction = input.interaction && typeof input.interaction === "object" ? input.interaction : {};
    const reply = input.reply && typeof input.reply === "object" ? input.reply : {};
    const drawers = input.drawers && typeof input.drawers === "object" ? input.drawers : {};
    const actions = input.actions && typeof input.actions === "object" ? input.actions : {};
    return Object.assign({}, input, {
      kind: safeText(input.kind) || "assistant",
      context: Object.assign(
        {
          id: "",
          title: "Assistant",
          subtitle: "",
          status: "idle",
          metadata: [],
          indicators: [],
          selectors: [],
          actions: [],
        },
        context,
      ),
      lifecycle: Object.assign(
        {
          connectionState: "idle",
          executionState: "idle",
          applyState: "",
          recoveryState: "",
          replyState: "",
          terminal: false,
        },
        lifecycle,
      ),
      conversation: Object.assign(
        {
          items: [],
          plan: { entries: [], activeEntries: [], active: false },
          interaction: { kind: "hidden" },
          usage: null,
        },
        conversation,
      ),
      plan: Object.assign({ entries: [], activeEntries: [], active: false }, plan),
      interaction: Object.assign({ kind: "hidden" }, interaction),
      usage: input.usage || conversation.usage || null,
      reply: Object.assign(
        {
          enabled: false,
          placeholder: "",
          hint: "",
          submitLabel: "Send",
          sending: false,
          action: "reply",
          controls: [],
          showUsageGauge: false,
        },
        reply,
      ),
      drawers: Object.assign(
        {
          contextTitle: "Contexts",
          detailsTitle: "Details",
          contexts: [],
          details: [],
        },
        drawers,
      ),
      actions: Object.assign({ toolbar: [], context: [], details: [] }, actions),
    });
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

  function optionValue(option) {
    if (option === null || option === undefined) return "";
    if (typeof option !== "object") return safeText(option);
    return safeText(option && (option.value || option.id || option.key));
  }

  function optionLabel(option) {
    if (option === null || option === undefined) return "";
    if (typeof option !== "object") return safeText(option);
    return safeText(option && (option.label || option.name || option.title || option.value || option.id));
  }

  function emit(options, action, payload) {
    emitAssistantPanelAction(options, action, payload || {});
  }

  function renderSelectControl(container, selector, options) {
    const label = el("label", "assistant-panel-selector");
    label.setAttribute("data-assistant-selector-id", safeText(selector.id));
    label.appendChild(el("span", "assistant-panel-selector-label", selector.label || selector.id));
    const select = el("select", "assistant-panel-select");
    select.disabled = selector.disabled === true;
    const entries = Array.isArray(selector.options) ? selector.options : [];
    if (entries.length === 0) {
      const empty = el("option", "", "-");
      empty.value = "";
      select.appendChild(empty);
    }
    entries.forEach(function (entry) {
      const option = el("option", "", optionLabel(entry) || "-");
      option.value = optionValue(entry);
      if (option.value === safeText(selector.value)) option.selected = true;
      if (entry && entry.sentinel) option.setAttribute("data-assistant-sentinel", safeText(entry.sentinel));
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      const selected = entries.find(function (entry) {
        return optionValue(entry) === select.value;
      });
      const payload = {
        selectorId: selector.id,
        value: select.value,
        option: selected || null,
      };
      const payloadKey = safeText(selector.payloadKey);
      if (payloadKey) payload[payloadKey] = select.value;
      emit(options, selector.action || "select-context", payload);
    });
    label.appendChild(select);
    container.appendChild(label);
  }

  function renderActionButton(container, action, options) {
    const button = el(
      "button",
      "asst-button-compact assistant-panel-action assistant-panel-action-" + safeText(action.action || "unknown"),
      action.label || action.action || "Action",
    );
    button.type = "button";
    button.disabled = action.enabled === false || action.disabled === true;
    if (action.tone) button.setAttribute("data-assistant-action-tone", safeText(action.tone));
    button.addEventListener("click", function () {
      emit(options, action.action, action.payload || {});
    });
    container.appendChild(button);
  }

  function renderDetailsEntry(container, entry) {
    const row = el("div", "assistant-panel-details-row");
    row.appendChild(el("div", "assistant-panel-details-label", safeText(entry.label || entry.key || "Detail")));
    const value = safeText(entry.value || entry.text || entry.message);
    if (entry.kind === "code") {
      const pre = el("pre", "asst-code-surface assistant-panel-details-value");
      pre.textContent = value || "-";
      row.appendChild(pre);
    } else {
      row.appendChild(el("div", "assistant-panel-details-value", value || "-"));
    }
    container.appendChild(row);
  }

  function indicatorLedClass(toneValue) {
    const tone = safeText(toneValue);
    if (tone === "success") return "is-success";
    if (tone === "warning") return "is-warning";
    if (tone === "error" || tone === "danger") return "is-error";
    if (tone === "accent" || tone === "running") return "is-running";
    return "is-muted";
  }

  function renderBannerIndicators(container, indicators) {
    const entries = Array.isArray(indicators) ? indicators : [];
    if (!container || entries.length === 0) return;
    const row = el("div", "assistant-panel-indicators");
    entries.forEach(function (entry) {
      const source = entry && typeof entry === "object" ? entry : {};
      const node = el("span", "assistant-panel-indicator");
      node.setAttribute("data-assistant-indicator-id", safeText(source.id));
      node.setAttribute("data-assistant-indicator-tone", safeText(source.tone || "muted"));
      const title = safeText(source.title || source.tooltip || source.value || source.label);
      if (title) {
        node.title = title;
        node.setAttribute("aria-label", title);
      }
      node.appendChild(el("span", "asst-led " + indicatorLedClass(source.tone)));
      node.appendChild(el("span", "assistant-panel-indicator-label", safeText(source.label || source.id)));
      node.appendChild(el("strong", "assistant-panel-indicator-value", safeText(source.value) || "-"));
      row.appendChild(node);
    });
    container.appendChild(row);
  }

  function adoptPanelRegions(snapshot, options) {
    const root = options && options.root;
    const regions = (options && options.regions) || {};
    if (root) {
      root.classList.add("assistant-panel-root");
      root.setAttribute("data-assistant-panel-kind", safeText(snapshot.kind));
      root.setAttribute("data-assistant-context-id", safeText(snapshot.context && snapshot.context.id));
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
    markRegion(regions.conversation, "assistant-panel-conversation", "conversation", {
      managed: false,
    });
    markRegion(regions.plan, "assistant-panel-plan", "plan");
    markRegion(regions.hint, "assistant-panel-hint", "hint");
    markRegion(regions.reply, "assistant-panel-reply", "reply");
    markRegion(regions.drawer, "assistant-panel-context-drawer", "drawer");
  }

  function renderContextSelectors(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    clear(container);
    const selectors =
      panel.context && Array.isArray(panel.context.selectors) ? panel.context.selectors : [];
    selectors.forEach(function (selector) {
      renderSelectControl(container, selector, options || {});
    });
  }

  function renderContextActions(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    clear(container);
    const actions = panel.context && Array.isArray(panel.context.actions) ? panel.context.actions : [];
    actions.forEach(function (action) {
      renderActionButton(container, action, options || {});
    });
  }

  function renderToolbar(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = managedMount(container, "toolbar") || container;
    clear(target);
    const actions = panel.actions && Array.isArray(panel.actions.toolbar) ? panel.actions.toolbar : [];
    actions.forEach(function (action) {
      renderActionButton(target, action, options || {});
    });
  }

  function renderAssistantBanner(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = managedMount(container, "banner") || container;
    clear(target);
    const header = el("div", "assistant-panel-banner-main");
    const title = el("div", "assistant-panel-banner-title", panel.context.title || "Assistant");
    const subtitle = el("div", "assistant-panel-banner-subtitle", panel.context.subtitle || "");
    header.appendChild(title);
    if (safeText(panel.context.subtitle)) header.appendChild(subtitle);
    target.appendChild(header);
    const meta = el("div", "assistant-panel-banner-meta");
    (Array.isArray(panel.context.metadata) ? panel.context.metadata : []).forEach(function (item) {
      const pill = el("span", "asst-meta-pill assistant-panel-meta-pill");
      pill.appendChild(el("strong", "", safeText(item.label) || safeText(item.key)));
      pill.appendChild(el("span", "", safeText(item.value) || "-"));
      meta.appendChild(pill);
    });
    target.appendChild(meta);
    renderBannerIndicators(target, panel.context && panel.context.indicators);
    if (panel.context && Array.isArray(panel.context.selectors) && panel.context.selectors.length > 0) {
      const selectors = el("div", "assistant-panel-context-selectors");
      renderContextSelectors(selectors, panel, options || {});
      target.appendChild(selectors);
    }
    if (panel.context && Array.isArray(panel.context.actions) && panel.context.actions.length > 0) {
      const actions = el("div", "assistant-panel-context-actions");
      renderContextActions(actions, panel, options || {});
      target.appendChild(actions);
    }
  }

  function renderAssistantPlan(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = options && options.adoptOnly ? container : managedMount(container, "plan") || container;
    const plan = panel.plan || {};
    const entries = Array.isArray(plan.entries) ? plan.entries : [];
    const active = Array.isArray(plan.activeEntries) ? plan.activeEntries : [];
    const visible = active.length > 0 || (plan.active === true && entries.length > 0);
    container.setAttribute("data-assistant-plan-active", visible ? "true" : "false");
    if (options && options.adoptOnly) return;
    container.classList.toggle("hidden", !visible);
    if (!visible) return;
    clear(target);
    const totalCount =
      Number(plan.totalCount || 0) || entries.length || active.length || 0;
    const completedCount =
      typeof plan.completedCount === "number"
        ? Math.max(0, Math.min(totalCount, Math.floor(plan.completedCount)))
        : Math.max(
            0,
            entries.filter(function (entry) {
              return entry && entry.terminal;
            }).length,
          );
    const header = el("div", "assistant-panel-plan-header");
    header.appendChild(el("strong", "", "Plan"));
    header.appendChild(
      el(
        "span",
        "assistant-panel-plan-summary",
        totalCount > 0 ? completedCount + "/" + totalCount : "0/0",
      ),
    );
    target.appendChild(header);
    const list = el("div", "assistant-panel-plan-list");
    (active.length > 0 ? active : entries).forEach(function (entry) {
      const toneClass = safeText(entry.toneClass) || "is-pending";
      const row = el("div", "assistant-panel-plan-entry " + toneClass);
      const icon = el("span", "assistant-panel-plan-icon " + toneClass);
      const iconText = safeText(entry.icon);
      if (toneClass === "is-running") {
        icon.appendChild(el("span", "asst-spinner assistant-panel-plan-spinner"));
      } else {
        icon.textContent = iconText || (toneClass === "is-completed" ? "✓" : "•");
      }
      row.appendChild(icon);
      row.appendChild(el("span", "", safeText(entry.title || entry.text || entry.label || entry.content) || "-"));
      list.appendChild(row);
    });
    target.appendChild(list);
  }

  function renderAssistantHint(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = options && options.adoptOnly ? container : managedMount(container, "hint") || container;
    const interaction = panel.interaction || { kind: "hidden" };
    const kind = safeText(interaction.kind || "hidden");
    container.setAttribute("data-assistant-interaction", kind);
    if (options && options.adoptOnly) return;
    container.classList.toggle("hidden", kind === "hidden");
    clear(target);
    if (kind === "hidden") return;
    const row = el("div", "assistant-panel-hint-row");
    const ledTone =
      kind === "running"
        ? "is-running"
        : kind === "permission" || kind === "auth" || kind === "waiting_user"
          ? "is-warning"
          : kind === "disconnected" || kind === "error"
            ? "is-error"
            : kind === "completed"
              ? "is-success"
              : "is-muted";
    row.appendChild(el("span", "asst-led " + ledTone));
    row.appendChild(
      el(
        "span",
        "",
        safeText(interaction.title || interaction.message || interaction.label) ||
          (kind === "running" ? "Agent is working..." : kind),
      ),
    );
    const pending = interaction.pendingInteraction || {};
    if (kind === "waiting_user") {
      const prompt = safeText(pending.uiHints && pending.uiHints.prompt) || "Agent is waiting for your reply.";
      row.lastChild.textContent = prompt;
    }
    target.appendChild(row);
    if (kind === "permission" || kind === "auth") {
      const permission = interaction.permission || {};
      const summary = safeText(interaction.message || permission.summary || permission.toolTitle);
      const detail = safeText(interaction.detail || permission.detail);
      const meta = [
        permission.source || interaction.source,
        permission.toolTitle,
        permission.toolCallId ? "toolCallId=" + permission.toolCallId : "",
      ]
        .map(safeText)
        .filter(Boolean)
        .join(" · ");
      if (summary || meta || detail) {
        const box = el("div", "assistant-panel-permission-summary");
        if (summary) {
          box.appendChild(el("div", "assistant-panel-permission-summary-text", summary));
        }
        if (meta) {
          box.appendChild(el("div", "assistant-panel-permission-meta", meta));
        }
        if (detail) {
          const details = el("details", "assistant-panel-permission-details");
          details.appendChild(el("summary", "", "View full request"));
          const pre = el("pre", "asst-code-surface assistant-panel-permission-detail-code");
          pre.textContent = detail;
          details.appendChild(pre);
          box.appendChild(details);
        }
        target.appendChild(box);
      }
    }
    const actionList = Array.isArray(interaction.actions) ? interaction.actions : [];
    if ((kind === "permission" || kind === "auth") && actionList.length > 0) {
      const actionBox = el("div", "assistant-panel-hint-options");
      actionList.forEach(function (action) {
        renderActionButton(actionBox, action, options || {});
      });
      target.appendChild(actionBox);
    }
    if (kind === "auth" && interaction.auth && Array.isArray(interaction.auth.importFiles)) {
      const importFiles = interaction.auth.importFiles;
      if (importFiles.length > 0) {
        const importBox = el("div", "assistant-panel-auth-import");
        importFiles.forEach(function (fileSpec, index) {
          const spec = fileSpec && typeof fileSpec === "object" ? fileSpec : {};
          const row = el("label", "assistant-panel-auth-import-file");
          row.appendChild(
            el(
              "span",
              "",
              safeText(spec.name || spec.label || spec.filename || "Auth file " + String(index + 1)),
            ),
          );
          const input = el("input", "");
          input.type = "file";
          input.setAttribute("data-assistant-auth-import-file", "true");
          input.setAttribute("data-assistant-auth-import-name", safeText(spec.name || spec.filename));
          input.required = spec.required === true;
          row.appendChild(input);
          importBox.appendChild(row);
        });
        const submit = el("button", "asst-button-compact assistant-panel-action", "Import and Continue");
        submit.type = "button";
        submit.addEventListener("click", function () {
          emit(options, "auth-import-run", {});
        });
        importBox.appendChild(submit);
        target.appendChild(importBox);
      }
    }
    const optionsList =
      pending.uiHints && Array.isArray(pending.uiHints.options) ? pending.uiHints.options : [];
    if (kind === "waiting_user" && optionsList.length > 0) {
      const optionBox = el("div", "assistant-panel-hint-options");
      optionsList.forEach(function (entry) {
        const value =
          typeof entry === "string"
            ? entry
            : safeText(entry && (entry.value || entry.label || entry.text));
        const label =
          typeof entry === "string"
            ? entry
            : safeText(entry && (entry.label || entry.value || entry.text));
        const button = el("button", "asst-button-compact assistant-panel-hint-option", label || value);
        button.type = "button";
        button.addEventListener("click", function () {
          emit(options, "reply", { message: value || label });
        });
        optionBox.appendChild(button);
      });
      target.appendChild(optionBox);
    }
  }

  function renderAssistantReply(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = options && options.adoptOnly ? container : managedMount(container, "reply") || container;
    container.setAttribute("data-assistant-reply-enabled", panel.reply.enabled ? "true" : "false");
    container.setAttribute("data-assistant-reply-state", safeText(panel.lifecycle.replyState));
    if (options && options.adoptOnly) return;
    const previous = target.querySelector(".assistant-panel-reply-input");
    const previousText = previous ? previous.value : "";
    clear(target);
    const input = el("textarea", "assistant-panel-reply-input");
    input.placeholder = panel.reply.placeholder || "";
    input.disabled = !panel.reply.enabled || panel.reply.sending === true;
    input.value = previousText;
    const footer = el("div", "assistant-panel-reply-footer");
    const primary = el("div", "assistant-panel-reply-primary");
    const controls = el("div", "assistant-panel-reply-controls");
    (Array.isArray(panel.reply.controls) ? panel.reply.controls : []).forEach(function (control) {
      renderSelectControl(controls, control, options);
    });
    const secondary = el("div", "assistant-panel-reply-secondary");
    secondary.appendChild(el("span", "assistant-panel-reply-hint", panel.reply.hint || ""));
    if (panel.reply.showUsageGauge === true) {
      renderUsageGauge(secondary, panel.usage);
    }
    const button = el("button", "asst-button assistant-panel-reply-submit", panel.reply.submitLabel || "Send");
    button.type = "button";
    const replyAction = safeText(panel.reply.action || "reply");
    const cancelAction = replyAction === "cancel" || replyAction === "cancel-run";
    button.disabled = !panel.reply.enabled || (panel.reply.sending === true && !cancelAction);
    button.addEventListener("click", function () {
      emit(options, replyAction || "reply", { message: safeText(input.value) });
      if (panel.reply.clearOnSend !== false) input.value = "";
    });
    input.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!button.disabled) button.click();
      }
    });
    primary.appendChild(button);
    target.appendChild(input);
    footer.appendChild(primary);
    if (controls.firstChild) footer.appendChild(controls);
    footer.appendChild(secondary);
    target.appendChild(footer);
  }

  function renderUsageGauge(container, usage) {
    if (!container) return;
    const source = usage && typeof usage === "object" ? usage : {};
    const total = Number(source.used || source.totalTokens || source.usedTokens || 0);
    const inputOutputTotal = Number(source.inputTokens || 0) + Number(source.outputTokens || 0);
    const used = total > 0 ? total : inputOutputTotal;
    const limit = Number(source.size || source.contextWindow || source.tokenLimit || source.limitTokens || 0);
    const percent = limit > 0 ? Math.max(0, Math.min(100, Math.round((used / limit) * 100))) : 0;
    const unavailable = used <= 0 && limit <= 0;
    const gauge = el("div", "assistant-panel-usage-gauge" + (unavailable ? " is-unavailable" : ""));
    const tokenLabel = formatUsageLabel(used, limit);
    const centerLabel = unavailable ? "N/A" : limit > 0 ? String(percent) + "%" : formatTokenCount(used);
    gauge.title = unavailable ? "No usage data" : tokenLabel + " tokens";
    gauge.setAttribute("aria-label", gauge.title);
    const ring = el("span", "assistant-panel-usage-ring");
    ring.style.setProperty("--assistant-usage-percent", `${percent}%`);
    ring.appendChild(el("span", "assistant-panel-usage-label", centerLabel));
    gauge.appendChild(ring);
    container.appendChild(gauge);
  }

  function formatUsageLabel(used, limit) {
    const usedValue = Number(used || 0);
    const limitValue = Number(limit || 0);
    if (usedValue <= 0 && limitValue <= 0) return "N/A";
    if (limitValue > 0) return formatTokenCount(usedValue) + "/" + formatTokenCount(limitValue);
    return formatTokenCount(usedValue);
  }

  function formatTokenCount(value) {
    const numeric = Number(value || 0);
    if (numeric <= 0) return "0k";
    const thousands = numeric / 1000;
    const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
    return String(rounded).replace(/\.0$/, "") + "k";
  }

  function renderReplyZone(container, snapshot, options) {
    renderAssistantReply(container, snapshot, options || {});
  }

  function renderAssistantWorkspaceTaskAction(action, options) {
    const item = action && typeof action === "object" ? action : {};
    const button = el(
      "button",
      "assistant-workspace-drawer-task-action" +
        (safeText(item.icon) === "archive" ? " is-archive" : "") +
        (safeText(item.tone) ? " is-" + safeText(item.tone) : ""),
      "",
    );
    button.type = "button";
    button.disabled = item.enabled === false;
    const label = safeText(item.label) || "Archive";
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      emit(options, item.action, item.payload || {});
    });
    return button;
  }

  function renderAssistantWorkspaceTask(task, selectedTaskKey, labels, options) {
    const item = task && typeof task === "object" ? task : {};
    const taskKey = safeText(item.key || item.taskKey || item.id);
    const selectable = item.selectable === true && taskKey;
    const relationState = safeText(item.relationState);
    const row = el(
      "div",
      "assistant-workspace-drawer-task skillrunner-workspace-task" +
        (taskKey && taskKey === selectedTaskKey ? " is-active" : "") +
        (relationState === "related" ? " is-related" : ""),
      "",
    );
    const button = el("button", "assistant-workspace-drawer-task-main", "");
    button.type = "button";
    button.disabled = !selectable;
    if (!selectable) {
      button.title = safeText(labels.waitingRequestId) || "Waiting for requestId";
      row.classList.add("is-disabled");
    }
    const title = el(
      "div",
      "assistant-workspace-drawer-task-title skillrunner-workspace-task-title",
      safeText(item.title || item.taskName || item.inputUnitLabel) ||
        safeText(labels.waitingRequestId) ||
        "Waiting for requestId",
    );
    const workflow = el(
      "div",
      "assistant-workspace-drawer-task-workflow skillrunner-workspace-task-workflow",
      safeText(item.workflowLabel) || "-",
    );
    const meta = el("div", "assistant-workspace-drawer-task-meta skillrunner-workspace-task-meta");
    meta.appendChild(el("span", "", safeText(item.stateLabel || item.status || item.state) || "-"));
    const updatedAt = safeText(item.updatedAt);
    if (updatedAt) meta.appendChild(el("span", "", updatedAt));
    const content = el("div", "assistant-workspace-drawer-task-content");
    content.appendChild(title);
    content.appendChild(workflow);
    content.appendChild(meta);
    button.appendChild(content);
    if (selectable) {
      button.addEventListener("click", function () {
        emit(options, item.action || "select-task", item.payload || { taskKey });
      });
    }
    row.appendChild(button);
    const actions = Array.isArray(item.itemActions) ? item.itemActions : [];
    if (actions.length > 0) {
      const actionBox = el("div", "assistant-workspace-drawer-task-actions");
      actions.forEach(function (action) {
        if (!action || typeof action !== "object" || !safeText(action.action)) return;
        actionBox.appendChild(renderAssistantWorkspaceTaskAction(action, options));
      });
      row.appendChild(actionBox);
    }
    return row;
  }

  function renderAssistantWorkspaceGroup(parent, group, selectedTaskKey, labels, options) {
    const item = group && typeof group === "object" ? group : {};
    const groupBox = el(
      "section",
      "assistant-workspace-drawer-group skillrunner-workspace-group" +
        (item.disabled === true ? " is-disabled" : ""),
    );
    const header = el(
      "div",
      "assistant-workspace-drawer-group-header skillrunner-workspace-group-header",
      safeText(item.backendDisplayName || item.backendId || item.title) || "-",
    );
    if (item.disabled === true) {
      const tag = el(
        "span",
        "assistant-workspace-drawer-group-disabled-tag skillrunner-workspace-group-disabled-tag",
        safeText(labels.backendUnavailable) || "Unavailable",
      );
      header.appendChild(tag);
    }
    groupBox.appendChild(header);
    const body = el("div", "assistant-workspace-drawer-group-body skillrunner-workspace-group-body");
    if (item.disabled === true) {
      body.appendChild(
        el(
          "div",
          "assistant-workspace-drawer-group-disabled-hint skillrunner-workspace-group-disabled-hint",
          safeText(item.disabledReason) ||
            safeText(labels.backendUnavailable) ||
            "Backend unavailable",
        ),
      );
    }
    const activeTasks = Array.isArray(item.activeTasks) ? item.activeTasks : [];
    const finishedTasks = Array.isArray(item.finishedTasks) ? item.finishedTasks : [];
    activeTasks.forEach(function (task) {
      body.appendChild(renderAssistantWorkspaceTask(task, selectedTaskKey, labels, options));
    });
    finishedTasks.forEach(function (task) {
      body.appendChild(renderAssistantWorkspaceTask(task, selectedTaskKey, labels, options));
    });
    groupBox.appendChild(body);
    parent.appendChild(groupBox);
  }

  function renderAssistantWorkspaceTaskDrawer(target, panel, options) {
    clear(target);
    const drawers = panel.drawers || {};
    const labels = drawers.labels && typeof drawers.labels === "object" ? drawers.labels : {};
    const header = el(
      "div",
      "assistant-panel-context-drawer-header assistant-workspace-drawer-header skillrunner-workspace-drawer-header",
    );
    header.appendChild(
      el(
        "strong",
        "",
        safeText(drawers.contextTitle || labels.tasksToggle || labels.sessionsTitle) || "Runs",
      ),
    );
    const close = el("button", "asst-button-compact", "Close");
    close.type = "button";
    close.addEventListener("click", function () {
      emit(options, "close-context-drawer", {});
    });
    header.appendChild(close);
    target.appendChild(header);

    const noticeText = safeText(drawers.notice);
    if (noticeText) {
      target.appendChild(
        el(
          "div",
          "assistant-workspace-drawer-context-note skillrunner-workspace-context-note",
          noticeText,
        ),
      );
    }

    const sections = Array.isArray(drawers.sections)
      ? drawers.sections
      : Array.isArray(drawers.skillrunnerSections)
        ? drawers.skillrunnerSections
        : [];
    const selectedTaskKey = safeText(drawers.selectedTaskKey);
    const body = el("div", "assistant-workspace-drawer-sections skillrunner-workspace-sections");
    let availableTaskCount = 0;
    sections.forEach(function (section) {
      if (!section || typeof section !== "object") return;
      const groups = Array.isArray(section.groups) ? section.groups : [];
      const sectionTaskCount = groups.reduce(function (count, group) {
        const active = Array.isArray(group && group.activeTasks) ? group.activeTasks.length : 0;
        const finished = Array.isArray(group && group.finishedTasks) ? group.finishedTasks.length : 0;
        return count + active + finished;
      }, 0);
      if (sectionTaskCount === 0) return;
      availableTaskCount += sectionTaskCount;
      const sectionId = safeText(section.id);
      const sectionTitle = safeText(section.title || sectionId || "Tasks");
      const sectionCollapsed = sectionId === "completed" && section.collapsed === true;
      const sectionBox = el(
        "section",
        "assistant-workspace-drawer-section skillrunner-workspace-section" +
          (sectionId === "completed" ? " is-completed" : " is-running") +
          (sectionCollapsed ? " is-collapsed" : " is-expanded"),
      );
      const sectionBody = el("div", "assistant-workspace-drawer-section-body skillrunner-workspace-section-body");
      if (sectionId === "completed") {
        const toggle = el(
          "button",
          "assistant-workspace-drawer-section-toggle skillrunner-workspace-section-toggle",
          sectionTitle || "Completed",
        );
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", sectionCollapsed ? "false" : "true");
        toggle.addEventListener("click", function () {
          emit(options, "toggle-drawer-section", { sectionId: "completed" });
        });
        sectionBox.appendChild(toggle);
      } else if (section.hideTitle !== true) {
        sectionBox.appendChild(
          el(
            "div",
            "assistant-workspace-drawer-section-title skillrunner-workspace-section-title",
            sectionTitle || "Running",
          ),
        );
      }
      if (!sectionCollapsed) {
        groups.forEach(function (group) {
          renderAssistantWorkspaceGroup(sectionBody, group, selectedTaskKey, labels, options);
        });
      }
      sectionBox.appendChild(sectionBody);
      body.appendChild(sectionBox);
    });
    if (availableTaskCount === 0) {
      body.appendChild(
        el(
          "div",
          "assistant-workspace-drawer-empty skillrunner-workspace-empty",
          safeText(labels.emptyTasks) || "No SkillRunner tasks.",
        ),
      );
    }
    target.appendChild(body);
  }

  function renderAssistantContextDrawer(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = options && options.adoptOnly ? container : managedMount(container, "drawer") || container;
    container.setAttribute("data-assistant-context-count", String((panel.drawers.contexts || []).length));
    if (options && options.adoptOnly) return;
    if (
      safeText(panel.drawers && panel.drawers.layout) === "skillrunner-workspace" ||
      safeText(panel.drawers && panel.drawers.layout) === "workspace-task-drawer"
    ) {
      renderAssistantWorkspaceTaskDrawer(target, panel, options || {});
      return;
    }
    clear(target);
    const header = el("div", "assistant-panel-context-drawer-header");
    header.appendChild(el("strong", "", panel.drawers.contextTitle || "Contexts"));
    const close = el("button", "asst-button-compact", "Close");
    close.type = "button";
    close.addEventListener("click", function () {
      emit(options, "close-context-drawer", {});
    });
    header.appendChild(close);
    target.appendChild(header);
    const list = el("div", "assistant-panel-context-list");
    function renderContextEntry(parent, entry, depth) {
      const children = Array.isArray(entry && entry.children) ? entry.children : [];
      const isGroup = (entry && entry.kind === "group") || children.length > 0;
      const row = el(
        "button",
        "assistant-panel-context-entry" +
          (isGroup ? " is-group" : "") +
          (entry && entry.active ? " is-active" : ""),
        "",
      );
      row.type = "button";
      row.disabled = isGroup || entry.disabled === true;
      const title = el(
        "span",
        "assistant-panel-context-entry-title",
        safeText(entry.title || entry.taskName || entry.sessionTitle || entry.backendDisplayName) || "-",
      );
      row.appendChild(title);
      const subtitle = [entry.subtitle, entry.status].map(safeText).filter(Boolean).join(" · ");
      if (subtitle) row.appendChild(el("span", "assistant-panel-context-entry-subtitle", subtitle));
      row.style.setProperty("--assistant-context-depth", String(Math.max(0, Number(depth || 0))));
      if (!isGroup && entry.disabled !== true) {
        row.addEventListener("click", function () {
          emit(options, entry.action || "select-context", entry.payload || entry);
        });
      }
      parent.appendChild(row);
      children.forEach(function (child) {
        renderContextEntry(parent, child, Number(depth || 0) + 1);
      });
    }
    (Array.isArray(panel.drawers.contexts) ? panel.drawers.contexts : []).forEach(function (entry) {
      renderContextEntry(list, entry, 0);
    });
    target.appendChild(list);
  }

  function renderDetailsDrawer(container, snapshot, options) {
    const panel = normalize(snapshot);
    if (!container) return;
    const target = managedMount(container, "details") || container;
    clear(target);
    const header = el("div", "assistant-panel-details-header");
    header.appendChild(el("strong", "", panel.drawers.detailsTitle || "Details"));
    const detailActions = Array.isArray(panel.actions && panel.actions.details)
      ? panel.actions.details
      : [];
    if (detailActions.length > 0) {
      const actionGroup = el("div", "assistant-panel-details-actions");
      detailActions.forEach(function (action) {
        renderActionButton(actionGroup, action, options || {});
      });
      header.appendChild(actionGroup);
    }
    const close = el("button", "asst-button-compact", "Close");
    close.type = "button";
    close.addEventListener("click", function () {
      emit(options || {}, "close-details-drawer", {});
    });
    header.appendChild(close);
    target.appendChild(header);
    const details = Array.isArray(panel.drawers.details) ? panel.drawers.details : [];
    const list = el("div", "assistant-panel-details-list");
    if (details.length === 0) {
      list.appendChild(el("div", "assistant-panel-details-empty", "No details."));
    }
    details.forEach(function (section) {
      if (typeof section === "string") {
        const row = el("pre", "asst-code-surface assistant-panel-details-entry");
        row.textContent = section;
        list.appendChild(row);
        return;
      }
      if (!section || typeof section !== "object") return;
      const sectionNode = el("section", "assistant-panel-details-section");
      sectionNode.appendChild(el("h2", "assistant-panel-details-section-title", section.title || "Details"));
      const entries = Array.isArray(section.entries) ? section.entries : [];
      if (entries.length === 0) {
        sectionNode.appendChild(el("div", "assistant-panel-details-empty", "No entries."));
      }
      entries.forEach(function (entry) {
        renderDetailsEntry(sectionNode, entry || {});
      });
      list.appendChild(sectionNode);
    });
    target.appendChild(list);
  }

  function emitAssistantPanelAction(options, action, payload) {
    const handler = options && options.onAction;
    if (typeof handler === "function") {
      handler(action, payload || {});
    }
  }

  function renderAssistantPanelSnapshot(snapshot, options) {
    const panel = normalize(snapshot);
    const opts = options || {};
    adoptPanelRegions(panel, opts);
    const managedSnapshot = Object.assign({}, panel, { onAction: opts.onAction });
    if (shouldManageRegion(opts, "toolbar")) {
      renderToolbar(opts.regions && opts.regions.toolbar, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "banner")) {
      renderAssistantBanner(opts.regions && opts.regions.banner, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "plan")) {
      renderAssistantPlan(opts.regions && opts.regions.plan, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "hint")) {
      renderAssistantHint(opts.regions && opts.regions.hint, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "reply")) {
      renderAssistantReply(opts.regions && opts.regions.reply, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "drawer")) {
      renderAssistantContextDrawer(opts.regions && opts.regions.drawer, managedSnapshot, opts);
    }
    if (shouldManageRegion(opts, "details")) {
      renderDetailsDrawer(opts.regions && opts.regions.details, managedSnapshot, opts);
    }
    if (opts.managed === true) {
      return panel;
    } else {
      renderAssistantPlan(opts.regions && opts.regions.plan, panel, { adoptOnly: true });
      renderAssistantHint(opts.regions && opts.regions.hint, panel, { adoptOnly: true });
      renderAssistantReply(opts.regions && opts.regions.reply, panel, { adoptOnly: true });
      renderAssistantContextDrawer(opts.regions && opts.regions.drawer, panel, { adoptOnly: true });
    }
    return panel;
  }

  window.AssistantPanelRenderer = {
    renderAssistantPanelSnapshot,
    renderToolbar,
    renderContextSelectors,
    renderContextActions,
    renderAssistantBanner,
    renderAssistantPlan,
    renderAssistantHint,
    renderAssistantReply,
    renderReplyZone,
    renderAssistantContextDrawer,
    renderAssistantWorkspaceTaskDrawer,
    renderDetailsDrawer,
    emitAssistantPanelAction,
  };
})();

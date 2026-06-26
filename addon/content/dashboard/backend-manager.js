(function () {
  "use strict";

  const PROVIDER_ORDER = ["acp", "skillrunner", "generic-http"];

  const state = {
    snapshot: null,
    rows: [],
    activeProviderType: "",
    pendingAcpRows: new Set(),
    pendingModelCacheRows: new Set(),
    skillRunnerReachableById: {},
    statusMessage: null,
    statusTimer: null,
    scrollByProvider: {},
    acpPresetDialog: null,
  };

  function post(action, payload) {
    window.parent.postMessage(
      {
        type: "backend-manager-dialog:action",
        action,
        payload: payload || {},
      },
      "*",
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function cleanRow(row) {
    return {
      internalId: String(row && row.internalId ? row.internalId : ""),
      displayName: String(row && row.displayName ? row.displayName : ""),
      type: String(row && row.type ? row.type : ""),
      enabled: row && row.enabled === false ? false : true,
      baseUrl: String(row && row.baseUrl ? row.baseUrl : ""),
      authKind:
        String(row && row.authKind ? row.authKind : "none") === "bearer"
          ? "bearer"
          : "none",
      authToken: String(row && row.authToken ? row.authToken : ""),
      timeoutMs: String(row && row.timeoutMs ? row.timeoutMs : ""),
      command: String(row && row.command ? row.command : ""),
      args: Array.isArray(row && row.args) ? row.args.map(String) : [],
      env: Array.isArray(row && row.env)
        ? row.env.map(function (item) {
            return {
              key: String(item && item.key ? item.key : ""),
              value: String(item && item.value ? item.value : ""),
            };
          })
        : [],
      acp: row && row.acp ? clone(row.acp) : undefined,
    };
  }

  function labels() {
    return (state.snapshot && state.snapshot.labels) || {};
  }

  function rowBackendId(row) {
    return String(row && row.internalId ? row.internalId : "").trim();
  }

  function isSkillRunnerReachable(row) {
    const backendId = rowBackendId(row);
    return (
      row &&
      row.enabled !== false &&
      !!backendId &&
      state.skillRunnerReachableById[backendId] === true
    );
  }

  function setSkillRunnerReachability(rowOrId, reachable) {
    const backendId =
      typeof rowOrId === "string"
        ? String(rowOrId).trim()
        : rowBackendId(rowOrId);
    if (!backendId) return;
    state.skillRunnerReachableById = Object.assign(
      {},
      state.skillRunnerReachableById,
      { [backendId]: reachable === true },
    );
  }

  function syncSkillRunnerReachabilityFromSnapshot() {
    const healthById =
      (state.snapshot && state.snapshot.skillRunnerHealth) || {};
    const next = {};
    state.rows.forEach(function (row) {
      const backendId = rowBackendId(row);
      if (row.type !== "skillrunner" || !backendId) return;
      const health = healthById[backendId] || {};
      next[backendId] =
        row.enabled !== false &&
        health.enabled !== false &&
        health.reachable === true;
    });
    state.skillRunnerReachableById = next;
  }

  function statusText(kind, backendId, error) {
    const l = labels();
    const messages = {
      modelRefreshed: l.statusModelCacheRefreshed || "Model cache refreshed",
      modelFailed:
        l.statusModelCacheRefreshFailed || "Model cache refresh failed",
      acpRefreshed:
        l.statusAcpRuntimeCacheRefreshed || "ACP config cache refreshed",
      acpFailed:
        l.statusAcpRuntimeCacheRefreshFailed ||
        "ACP config cache refresh failed",
    };
    const idPart = backendId ? backendId + ": " : "";
    const errorPart = error ? " - " + String(error) : "";
    return idPart + (messages[kind] || "") + errorPart;
  }

  function showStatusMessage(text, tone) {
    if (state.statusTimer) {
      clearTimeout(state.statusTimer);
    }
    state.statusMessage = {
      text: String(text || ""),
      tone: tone || "info",
    };
    renderWithScroll();
    state.statusTimer = setTimeout(function () {
      state.statusMessage = null;
      state.statusTimer = null;
      renderWithScroll();
    }, 5000);
  }

  function providerList() {
    const providers = (state.snapshot && state.snapshot.providers) || [];
    return providers.slice().sort(function (a, b) {
      const ai = PROVIDER_ORDER.indexOf(a.type);
      const bi = PROVIDER_ORDER.indexOf(b.type);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }

  function activeProvider() {
    const providers = providerList();
    const existing = providers.find(function (provider) {
      return provider.type === state.activeProviderType;
    });
    if (existing) return existing;
    const fallback = providers[0] || null;
    state.activeProviderType = fallback ? fallback.type : "";
    return fallback;
  }

  function setActiveProviderType(providerType) {
    const next = String(providerType || "").trim();
    if (
      !next ||
      !providerList().some(function (provider) {
        return provider.type === next;
      })
    ) {
      return false;
    }
    state.activeProviderType = next;
    return true;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function button(text, actionClass) {
    const node = el(
      "button",
      "backend-button" + (actionClass ? " " + actionClass : ""),
      text,
    );
    node.type = "button";
    return node;
  }

  function emitDraftChanged() {
    post("draft-changed", { rows: state.rows });
  }

  function updateRow(index, patch) {
    state.rows[index] = Object.assign({}, state.rows[index], patch);
    emitDraftChanged();
  }

  function rememberScroll() {
    const body = document.querySelector(
      "[data-zs-role='backend-manager-body']",
    );
    if (body && state.activeProviderType) {
      state.scrollByProvider[state.activeProviderType] = body.scrollTop || 0;
    }
  }

  function restoreScroll() {
    const body = document.querySelector(
      "[data-zs-role='backend-manager-body']",
    );
    if (!body || !state.activeProviderType) return;
    body.scrollTop = state.scrollByProvider[state.activeProviderType] || 0;
  }

  function renderWithScroll() {
    rememberScroll();
    render({ preserveScroll: true });
  }

  function inputField(args) {
    const field = el("div", "backend-field " + (args.className || ""));
    const label = el("label", "", args.label || "");
    const input = el("input", "backend-input");
    input.type = args.type || "text";
    input.value = args.value || "";
    input.placeholder = args.placeholder || "";
    input.addEventListener("input", function () {
      args.onInput(input.value);
    });
    field.append(label, input);
    return field;
  }

  function selectField(args) {
    const field = el("div", "backend-field " + (args.className || ""));
    const label = el("label", "", args.label || "");
    const select = el("select", "backend-select");
    args.options.forEach(function (option) {
      const node = el("option", "", option.label);
      node.value = option.value;
      select.appendChild(node);
    });
    select.value = args.value || "";
    select.addEventListener("change", function () {
      args.onChange(select.value);
    });
    field.append(label, select);
    return field;
  }

  function checkboxField(args) {
    const field = el("label", "backend-field backend-checkbox-field");
    const input = el("input", "");
    input.type = "checkbox";
    input.checked = args.checked !== false;
    input.disabled = !!args.disabled;
    input.addEventListener("change", function () {
      args.onChange(input.checked);
    });
    field.append(input, document.createTextNode(args.label || ""));
    return field;
  }

  function acpPresetList() {
    return (state.snapshot && state.snapshot.acpPresets) || [];
  }

  function findAcpPreset(presetId) {
    return acpPresetList().find(function (preset) {
      return preset.id === presetId;
    });
  }

  function isNpxUnavailable() {
    const runtimeCommands =
      (state.snapshot && state.snapshot.runtimeCommands) || {};
    const npx = runtimeCommands.npx || {};
    return npx.available === false;
  }

  function defaultAcpPresetDialogState(preset) {
    return {
      selectedPresetId: preset ? preset.id : "",
      useNpx: !!(
        preset &&
        preset.defaultUseNpx &&
        preset.supportsNpx &&
        !isNpxUnavailable()
      ),
      isolated: false,
    };
  }

  function openAcpPresetDialog() {
    const preset = acpPresetList()[0] || null;
    state.acpPresetDialog = defaultAcpPresetDialogState(preset);
    renderWithScroll();
  }

  function closeAcpPresetDialog() {
    state.acpPresetDialog = null;
    renderWithScroll();
  }

  function inferPathSeparator(pathValue) {
    return String(pathValue || "").indexOf("\\") >= 0 ? "\\" : "/";
  }

  function joinPreviewPath(root, child) {
    const base = String(root || "").replace(/[\\/]+$/g, "");
    if (!base) return String(child || "");
    return base + inferPathSeparator(base) + String(child || "");
  }

  function buildAcpPresetProfileId(preset, useNpx, isolated) {
    const suffixes = [];
    if (useNpx) suffixes.push("npx");
    if (isolated) suffixes.push("isolated");
    return (
      "acp-" + preset.id + (suffixes.length ? "-" + suffixes.join("-") : "")
    );
  }

  function buildAcpPresetPreview() {
    const dialog = state.acpPresetDialog || {};
    const preset = findAcpPreset(dialog.selectedPresetId) || acpPresetList()[0];
    if (!preset) return null;
    const useNpx = !!(
      dialog.useNpx &&
      preset.supportsNpx &&
      !isNpxUnavailable()
    );
    const isolated = !!(dialog.isolated && preset.isolation);
    const internalId = buildAcpPresetProfileId(preset, useNpx, isolated);
    const env = isolated
      ? [
          {
            key: preset.isolation.envKey,
            value: joinPreviewPath(
              state.snapshot && state.snapshot.acpPresetIsolationRoot,
              internalId,
            ),
          },
        ]
      : [];
    return {
      preset: preset,
      internalId: internalId,
      displayName: preset.label,
      command: useNpx ? "npx" : preset.bareCommand,
      args: useNpx
        ? [preset.npxPackage].concat(preset.npxArgs || []).filter(Boolean)
        : (preset.bareArgs || []).slice(),
      env: env,
      agentFamily: preset.agentFamily,
      useNpx: useNpx,
      isolated: isolated,
    };
  }

  function previewValue(label, value) {
    const row = el("div", "backend-preset-preview-row");
    row.append(
      el("span", "backend-preset-preview-label", label),
      el("code", "backend-preset-preview-value", value || "-"),
    );
    return row;
  }

  function renderAcpPresetPreview(preview) {
    const l = labels();
    const box = el("div", "backend-preset-preview");
    box.setAttribute("aria-readonly", "true");
    box.append(
      previewValue(l.profileId || "Profile ID", preview.internalId),
      previewValue(l.displayName || "Display Name", preview.displayName),
      previewValue(l.command || "Command", preview.command),
      previewValue(
        l.args || "Args",
        preview.args.length ? preview.args.join(" ") : "-",
      ),
      previewValue(
        l.env || "Env",
        preview.env.length
          ? preview.env
              .map(function (entry) {
                return entry.key + "=" + entry.value;
              })
              .join("\n")
          : "-",
      ),
      previewValue(l.agentFamily || "Agent Family", preview.agentFamily),
    );
    return box;
  }

  function renderAcpPresetDialog() {
    if (!state.acpPresetDialog) return document.createDocumentFragment();
    const l = labels();
    const preview = buildAcpPresetPreview();
    const overlay = el("div", "backend-preset-modal");
    const panel = el("section", "backend-preset-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute(
      "aria-label",
      l.acpPresetDialogTitle || "Add ACP Profile from Preset",
    );
    const header = el("header", "backend-preset-panel-header");
    header.appendChild(
      el(
        "h2",
        "backend-preset-panel-title",
        l.acpPresetDialogTitle || "Add ACP Profile from Preset",
      ),
    );
    const body = el("div", "backend-preset-panel-body");
    const selector = el("nav", "backend-preset-selector");
    acpPresetList().forEach(function (preset) {
      const item = button(preset.label, "backend-preset-selector-item");
      const selected =
        preview && preset.id === state.acpPresetDialog.selectedPresetId;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", selected ? "true" : "false");
      item.addEventListener("click", function () {
        state.acpPresetDialog = defaultAcpPresetDialogState(preset);
        renderWithScroll();
      });
      selector.appendChild(item);
    });
    const detail = el("div", "backend-preset-detail");
    if (preview) {
      const npxUnavailable = isNpxUnavailable();
      const options = el("div", "backend-preset-options");
      const npxField = checkboxField({
        label: l.acpPresetUseNpx || "Use npx",
        checked: preview.useNpx,
        disabled: !preview.preset.supportsNpx || npxUnavailable,
        onChange: function (checked) {
          state.acpPresetDialog.useNpx = checked;
          renderWithScroll();
        },
      });
      const isolationField = checkboxField({
        label: l.acpPresetIsolated || "Isolated environment",
        checked: preview.isolated,
        disabled: !preview.preset.isolation,
        onChange: function (checked) {
          state.acpPresetDialog.isolated = checked;
          renderWithScroll();
        },
      });
      options.append(npxField, isolationField);
      detail.appendChild(options);
      if (preview.useNpx || npxUnavailable) {
        const note = el(
          "p",
          "backend-preset-note",
          l.acpPresetNpxWarning || "Requires Node.js and npm.",
        );
        const link = el(
          "a",
          "backend-preset-note-link",
          l.acpPresetNodeLink || "Get Node.js",
        );
        link.href = "https://nodejs.org/";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          post("open-nodejs-download");
        });
        note.append(" ", link);
        detail.appendChild(note);
      }
      if (preview.isolated && preview.env[0]) {
        detail.appendChild(
          el(
            "p",
            "backend-preset-note warning",
            String(
              l.acpPresetIsolationWarning ||
                "Using an isolated environment requires configuring and authenticating the agent in { $path }. Do not enable this if you are unsure.",
            ).replace(/\{\s*\$path\s*\}/g, preview.env[0].value),
          ),
        );
      }
      detail.appendChild(renderAcpPresetPreview(preview));
    }
    body.append(selector, detail);
    const footer = el("footer", "backend-preset-panel-footer");
    const cancel = button(l.cancel || "Cancel");
    cancel.addEventListener("click", closeAcpPresetDialog);
    const confirm = button(l.confirm || "Confirm", "primary");
    confirm.disabled = !preview;
    confirm.addEventListener("click", function () {
      if (!preview) return;
      post("add-acp-preset", {
        presetId: preview.preset.id,
        useNpx: preview.useNpx,
        isolated: preview.isolated,
        rows: state.rows,
      });
    });
    footer.append(cancel, confirm);
    panel.append(header, body, footer);
    overlay.appendChild(panel);
    return overlay;
  }

  function tokenField(args) {
    const field = el("div", "backend-field backend-token-field");
    const label = el("label", "", args.label || "");
    const input = el("input", "backend-input backend-token-input");
    input.type = "password";
    input.autocomplete = "off";
    input.value = args.value || "";
    input.addEventListener("input", function () {
      args.onInput(input.value);
    });
    ["copy", "cut", "contextmenu"].forEach(function (eventName) {
      input.addEventListener(eventName, function (event) {
        event.preventDefault();
      });
    });
    field.append(label, input);
    return field;
  }

  function renderArgEditor(row, index) {
    const l = labels();
    const editor = el("div", "backend-list-editor");
    const header = el("div", "backend-list-header");
    header.appendChild(el("span", "backend-list-label", l.args || "Args"));
    const add = button(l.addArg || "Add Argument");
    add.addEventListener("click", function () {
      row.args = row.args.concat([""]);
      updateRow(index, { args: row.args });
      renderWithScroll();
    });
    header.appendChild(add);
    const items = el("div", "backend-list-items");
    row.args.forEach(function (value, argIndex) {
      const line = el("div", "backend-list-row");
      const input = el("input", "backend-input");
      input.value = value || "";
      input.placeholder = l.argPlaceholder || "Argument";
      input.addEventListener("input", function () {
        row.args[argIndex] = input.value;
        updateRow(index, { args: row.args });
      });
      const remove = button("x", "icon danger");
      remove.setAttribute("aria-label", l.remove || "Remove");
      remove.addEventListener("click", function () {
        row.args.splice(argIndex, 1);
        updateRow(index, { args: row.args });
        renderWithScroll();
      });
      line.append(input, remove);
      items.appendChild(line);
    });
    editor.append(header, items);
    return editor;
  }

  function renderEnvEditor(row, index) {
    const l = labels();
    const editor = el("div", "backend-list-editor backend-env-editor");
    const header = el("div", "backend-list-header");
    header.appendChild(el("span", "backend-list-label", l.env || "Env"));
    const add = button(l.addEnv || "Add Environment Variable");
    add.addEventListener("click", function () {
      row.env = row.env.concat([{ key: "", value: "" }]);
      updateRow(index, { env: row.env });
      renderWithScroll();
    });
    header.appendChild(add);
    const items = el("div", "backend-list-items");
    row.env.forEach(function (item, envIndex) {
      const line = el("div", "backend-list-row backend-env-row");
      const key = el("input", "backend-input");
      key.value = item.key || "";
      key.placeholder = l.envKeyPlaceholder || "Variable";
      key.addEventListener("input", function () {
        row.env[envIndex] = {
          key: key.value,
          value: row.env[envIndex].value || "",
        };
        updateRow(index, { env: row.env });
      });
      const value = el("input", "backend-input");
      value.value = item.value || "";
      value.placeholder = l.envValuePlaceholder || "Value";
      value.addEventListener("input", function () {
        row.env[envIndex] = {
          key: row.env[envIndex].key || "",
          value: value.value,
        };
        updateRow(index, { env: row.env });
      });
      const remove = button("x", "icon danger");
      remove.setAttribute("aria-label", l.remove || "Remove");
      remove.addEventListener("click", function () {
        row.env.splice(envIndex, 1);
        updateRow(index, { env: row.env });
        renderWithScroll();
      });
      line.append(key, value, remove);
      items.appendChild(line);
    });
    editor.append(header, items);
    return editor;
  }

  function acpStatus(row) {
    return row.acp && row.acp.connectionTest
      ? row.acp.connectionTest.status || "untested"
      : "untested";
  }

  function renderAcpActions(row, index) {
    const l = labels();
    const status = acpStatus(row);
    const actions = el("div", "backend-acp-actions");
    const chip = el("span", "backend-status-chip status-" + status, status);
    const refresh = button(
      status === "passed"
        ? l.refreshAcpRuntimeCache || "Refresh Config Cache"
        : l.testAcpConnection || "Test Connection",
    );
    refresh.disabled = state.pendingAcpRows.has(index);
    refresh.addEventListener("click", function () {
      state.pendingAcpRows.add(index);
      renderWithScroll();
      post("refresh-acp-runtime-options", {
        row: state.rows[index],
        rowIndex: index,
      });
    });
    const remove = button(l.remove || "Remove", "danger");
    remove.addEventListener("click", function () {
      state.rows.splice(index, 1);
      emitDraftChanged();
      renderWithScroll();
    });
    actions.append(chip, refresh, remove);
    return actions;
  }

  function renderHttpActions(row, index) {
    const l = labels();
    const actions = el("div", "backend-row-actions backend-http-actions");
    if (row.type === "skillrunner") {
      const enabled = row.enabled !== false;
      const reachable = isSkillRunnerReachable(row);
      const manage = button(
        !enabled
          ? l.disabled || "Disabled"
          : reachable
            ? l.openManagement || "Open Management"
            : l.unreachable || "Unreachable",
      );
      manage.disabled = !enabled || !reachable;
      manage.addEventListener("click", function () {
        post("open-management", { row: state.rows[index], rowIndex: index });
      });
      const refresh = button(l.refreshModelCache || "Refresh Model Cache");
      refresh.disabled = !enabled || state.pendingModelCacheRows.has(index);
      refresh.addEventListener("click", function () {
        state.pendingModelCacheRows.add(index);
        renderWithScroll();
        post("refresh-model-cache", {
          row: state.rows[index],
          rowIndex: index,
        });
      });
      actions.append(manage, refresh);
    }
    const remove = button(l.remove || "Remove", "danger");
    remove.addEventListener("click", function () {
      state.rows.splice(index, 1);
      emitDraftChanged();
      renderWithScroll();
    });
    actions.appendChild(remove);
    return actions;
  }

  function renderAcpRow(row, index) {
    const l = labels();
    const card = el("article", "backend-profile-card is-acp");
    const grid = el("div", "backend-acp-grid");
    const identity = el("div", "backend-acp-identity");
    identity.append(
      inputField({
        className: "backend-field-id",
        label: l.displayName || "ID",
        value: row.displayName,
        onInput: function (value) {
          updateRow(index, { displayName: value });
        },
      }),
      inputField({
        className: "backend-field-command",
        label: l.command || "Command",
        value: row.command,
        onInput: function (value) {
          updateRow(index, { command: value });
        },
      }),
    );
    const argsField = el("div", "backend-acp-column backend-acp-args");
    argsField.appendChild(renderArgEditor(row, index));
    const envField = el("div", "backend-acp-column backend-acp-env");
    envField.appendChild(renderEnvEditor(row, index));
    const actionField = el("div", "backend-acp-column backend-acp-action-cell");
    actionField.appendChild(renderAcpActions(row, index));
    grid.append(identity, argsField, envField, actionField);
    card.appendChild(grid);
    return card;
  }

  function renderHttpRow(row, index) {
    const l = labels();
    const card = el("article", "backend-profile-card is-http");
    if (row.type === "skillrunner") {
      card.classList.add("is-skillrunner");
    }
    const grid = el("div", "backend-http-grid");
    grid.append(
      inputField({
        className: "backend-field-id",
        label: l.displayName || "ID",
        value: row.displayName,
        onInput: function (value) {
          updateRow(index, { displayName: value });
        },
      }),
      inputField({
        className: "backend-field-url",
        label: l.baseUrl || "Base URL",
        value: row.baseUrl,
        onInput: function (value) {
          updateRow(index, { baseUrl: value });
        },
      }),
      row.type === "skillrunner"
        ? checkboxField({
            label: l.enabled || "Enabled",
            checked: row.enabled !== false,
            onChange: function (checked) {
              updateRow(index, { enabled: checked });
              setSkillRunnerReachability(row, false);
              renderWithScroll();
            },
          })
        : document.createDocumentFragment(),
      selectField({
        className: "backend-field-auth",
        label: l.auth || "Auth",
        value: row.authKind,
        options: [
          { value: "none", label: l.authNone || "None" },
          { value: "bearer", label: l.authBearer || "Bearer" },
        ],
        onChange: function (value) {
          updateRow(index, { authKind: value });
        },
      }),
      tokenField({
        row,
        index,
        label: l.token || "Token",
        value: row.authToken,
        onInput: function (value) {
          updateRow(index, { authToken: value });
        },
      }),
      inputField({
        className: "backend-field-timeout",
        label: l.timeoutMs || "Timeout(ms)",
        value: row.timeoutMs,
        onInput: function (value) {
          updateRow(index, { timeoutMs: value });
        },
      }),
      renderHttpActions(row, index),
    );
    card.appendChild(grid);
    return card;
  }

  function renderRow(row, index) {
    return row.type === "acp"
      ? renderAcpRow(row, index)
      : renderHttpRow(row, index);
  }

  function emptyRow(type) {
    return cleanRow({
      type,
      authKind: "none",
      args: [],
      env: [],
    });
  }

  function providerAddLabel(provider) {
    const l = labels();
    const raw = String(l.addProfile || "Add Profile");
    const name = provider.label || provider.type;
    const replaced = raw.replace(/\{\s*\$provider\s*\}/g, name);
    return /\{\s*\$provider\s*\}|\$provider/.test(replaced)
      ? "Add Profile"
      : replaced;
  }

  function renderTabs(providers) {
    const tabs = el("div", "backend-provider-tabs");
    providers.forEach(function (provider) {
      const tab = button(
        provider.label || provider.title || provider.type,
        "backend-provider-tab",
      );
      const selected = provider.type === state.activeProviderType;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-pressed", selected ? "true" : "false");
      tab.addEventListener("click", function () {
        rememberScroll();
        state.activeProviderType = provider.type;
        render({ preserveScroll: true });
      });
      tabs.appendChild(tab);
    });
    return tabs;
  }

  function renderProvider(provider) {
    const l = labels();
    const section = el("section", "backend-provider-section");
    const header = el("header", "backend-provider-header");
    header.appendChild(
      el(
        "h2",
        "backend-provider-title",
        provider.title || provider.label || provider.type,
      ),
    );
    const actions = el("div", "backend-provider-actions");
    if (provider.type === "acp") {
      const addPreset = button(labels().addAcpPreset || "Add ACP Preset");
      addPreset.addEventListener("click", function () {
        rememberScroll();
        openAcpPresetDialog();
      });
      actions.appendChild(addPreset);
    }
    const add = button(providerAddLabel(provider));
    add.addEventListener("click", function () {
      state.rows.push(emptyRow(provider.type));
      emitDraftChanged();
      renderWithScroll();
    });
    actions.appendChild(add);
    header.appendChild(actions);
    const rows = el("div", "backend-provider-rows");
    const providerRows = state.rows
      .map(function (row, index) {
        return { row, index };
      })
      .filter(function (entry) {
        return entry.row.type === provider.type;
      });
    if (!providerRows.length) {
      rows.appendChild(
        el("p", "backend-empty", l.noProfiles || "No profiles configured."),
      );
    } else {
      providerRows.forEach(function (entry) {
        rows.appendChild(renderRow(entry.row, entry.index));
      });
    }
    section.append(header, rows);
    return section;
  }

  function render(options) {
    const root = document.getElementById("backend-manager-root");
    if (!root) return;
    const preserveScroll = options && options.preserveScroll;
    root.innerHTML = "";
    if (!state.snapshot) {
      root.appendChild(el("div", "backend-manager-body", "Loading..."));
      return;
    }
    const providers = providerList();
    const provider = activeProvider();
    const header = el("header", "backend-manager-header");
    header.appendChild(
      el(
        "h1",
        "backend-manager-title",
        state.snapshot.title || "Backend Manager",
      ),
    );
    header.appendChild(
      el("p", "backend-manager-help", state.snapshot.help || ""),
    );
    header.appendChild(renderTabs(providers));
    const body = el("section", "backend-manager-body");
    body.setAttribute("data-zs-role", "backend-manager-body");
    body.addEventListener("scroll", rememberScroll);
    if (provider) {
      body.appendChild(renderProvider(provider));
    }
    const footer = el("footer", "backend-footer");
    const status = el("div", "backend-footer-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    if (state.statusMessage && state.statusMessage.text) {
      status.textContent = state.statusMessage.text;
      status.dataset.tone = state.statusMessage.tone || "info";
    }
    const footerActions = el("div", "backend-footer-actions");
    const cancel = button(labels().cancel || "Cancel");
    cancel.addEventListener("click", function () {
      post("cancel", { rows: state.rows });
    });
    const save = button(labels().save || "Save", "primary");
    save.addEventListener("click", function () {
      post("save", { rows: state.rows });
    });
    footerActions.append(cancel, save);
    footer.append(status, footerActions);
    root.append(header, body, footer, renderAcpPresetDialog());
    if (preserveScroll) {
      requestAnimationFrame(restoreScroll);
    }
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (
      data.type === "backend-manager-dialog:init" ||
      data.type === "backend-manager-dialog:snapshot"
    ) {
      state.snapshot = data.payload || {};
      state.rows = Array.isArray(state.snapshot.rows)
        ? state.snapshot.rows.map(cleanRow)
        : [];
      syncSkillRunnerReachabilityFromSnapshot();
      setActiveProviderType(state.snapshot.initialProviderType);
      activeProvider();
      render();
      emitDraftChanged();
      return;
    }
    if (data.type === "backend-manager-dialog:select-provider") {
      const payload = data.payload || {};
      if (setActiveProviderType(payload.providerType)) {
        render({ preserveScroll: true });
      }
      return;
    }
    if (data.type === "backend-manager-dialog:action-result") {
      const payload = data.payload || {};
      if (payload.action === "add-acp-preset" && payload.row) {
        state.rows.push(cleanRow(payload.row));
        state.acpPresetDialog = null;
        emitDraftChanged();
        renderWithScroll();
        return;
      }
      if (payload.action === "refresh-acp-runtime-options") {
        const rowIndex = Number(payload.rowIndex);
        state.pendingAcpRows.delete(rowIndex);
        const row = Number.isInteger(rowIndex) ? state.rows[rowIndex] : null;
        const backendId = String(
          payload.backendId || (row && row.internalId) || "",
        );
        if (Number.isInteger(rowIndex) && state.rows[rowIndex]) {
          state.rows[rowIndex].acp = payload.acp || state.rows[rowIndex].acp;
          emitDraftChanged();
        }
        showStatusMessage(
          statusText(
            payload.ok === false ? "acpFailed" : "acpRefreshed",
            backendId,
            payload.ok === false ? payload.error : "",
          ),
          payload.ok === false ? "error" : "success",
        );
        return;
      }
      if (payload.action === "refresh-model-cache") {
        const rowIndex = Number(payload.rowIndex);
        state.pendingModelCacheRows.delete(rowIndex);
        const row = Number.isInteger(rowIndex) ? state.rows[rowIndex] : null;
        const backendId = String(
          payload.backendId || (row && row.internalId) || "",
        );
        if (payload.ok === true) {
          setSkillRunnerReachability(backendId, true);
        } else if (backendId) {
          setSkillRunnerReachability(backendId, false);
        }
        showStatusMessage(
          statusText(
            payload.ok === true ? "modelRefreshed" : "modelFailed",
            backendId,
            payload.ok === true ? "" : payload.error,
          ),
          payload.ok === true ? "success" : "error",
        );
      }
    }
  });

  render();
  post("ready");
})();

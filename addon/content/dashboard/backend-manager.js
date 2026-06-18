(function () {
  "use strict";

  const PROVIDER_ORDER = ["acp", "skillrunner", "generic-http"];

  const state = {
    snapshot: null,
    rows: [],
    activeProviderType: "",
    pendingAcpRows: new Set(),
    scrollByProvider: {},
    acpSelectedPresetId: "",
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
      const manage = button(l.openManagement || "Open Management");
      manage.addEventListener("click", function () {
        post("open-management", { row: state.rows[index], rowIndex: index });
      });
      const refresh = button(l.refreshModelCache || "Refresh Model Cache");
      refresh.addEventListener("click", function () {
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

  function renderAcpPresetSelect() {
    const presets = (state.snapshot && state.snapshot.acpPresets) || [];
    const options = presets.map(function (preset) {
      return {
        value: preset.id,
        label: preset.label,
      };
    });
    const current = options.some(function (option) {
      return option.value === state.acpSelectedPresetId;
    })
      ? state.acpSelectedPresetId
      : options[0]
        ? options[0].value
        : "";
    state.acpSelectedPresetId = current;

    if (typeof window.createCustomSelect === "function") {
      const custom = window.createCustomSelect(
        options,
        current,
        function (value) {
          state.acpSelectedPresetId = String(value || "");
        },
      );
      custom.element.classList.add("backend-preset-select");
      return custom.element;
    }

    const select = el("select", "backend-select backend-preset-select");
    options.forEach(function (option) {
      const node = el("option", "", option.label);
      node.value = option.value;
      select.appendChild(node);
    });
    select.value = current;
    select.addEventListener("change", function () {
      state.acpSelectedPresetId = select.value;
    });
    return select;
  }

  function renderProvider(provider) {
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
      actions.appendChild(renderAcpPresetSelect());
      const addPreset = button(labels().addAcpPreset || "Add ACP Preset");
      addPreset.addEventListener("click", function () {
        rememberScroll();
        post("add-acp-preset", {
          presetId: state.acpSelectedPresetId,
          rows: state.rows,
        });
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
    const cancel = button(labels().cancel || "Cancel");
    cancel.addEventListener("click", function () {
      post("cancel", { rows: state.rows });
    });
    const save = button(labels().save || "Save", "primary");
    save.addEventListener("click", function () {
      post("save", { rows: state.rows });
    });
    footer.append(cancel, save);
    root.append(header, body, footer);
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
      activeProvider();
      render();
      emitDraftChanged();
      return;
    }
    if (data.type === "backend-manager-dialog:action-result") {
      const payload = data.payload || {};
      if (payload.action === "add-acp-preset" && payload.row) {
        state.rows.push(cleanRow(payload.row));
        emitDraftChanged();
        renderWithScroll();
        return;
      }
      if (payload.action === "refresh-acp-runtime-options") {
        const rowIndex = Number(payload.rowIndex);
        state.pendingAcpRows.delete(rowIndex);
        if (Number.isInteger(rowIndex) && state.rows[rowIndex]) {
          state.rows[rowIndex].acp = payload.acp || state.rows[rowIndex].acp;
          emitDraftChanged();
        }
        renderWithScroll();
      }
    }
  });

  render();
  post("ready");
})();

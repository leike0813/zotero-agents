(function () {
  const state = {
    snapshot: null,
    draft: {
      backendId: "",
      workflowParams: {},
      providerOptions: {},
    },
    fieldCollectors: [],
  };

  function sendAction(action, payload) {
    const msg = {
      type: "workflow-settings-dialog:action",
      action,
      payload: payload || {},
    };
    const targets = [window.parent, window.top, window.opener];
    const dedup = new Set();
    targets.forEach(function (target) {
      if (!target || dedup.has(target)) {
        return;
      }
      dedup.add(target);
      try {
        target.postMessage(msg, "*");
      } catch {
        // ignore postMessage errors
      }
    });
  }

  function cloneRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }
    return JSON.parse(JSON.stringify(raw));
  }

  function toText(value) {
    return String(value == null ? "" : value);
  }

  function normalizeTypeValue(type, value) {
    if (type === "boolean") {
      return value === true;
    }
    return toText(value);
  }

  function isPositiveIntegerField(entry) {
    const key = toText(entry && entry.key).trim().toLowerCase();
    if (!key) {
      return false;
    }
    if (key === "hard_timeout_seconds") {
      return true;
    }
    return key.includes("timeout");
  }

  function validateNumberFieldValue(args) {
    const raw = toText(args.rawValue).trim();
    if (!raw) {
      return { ok: true, remove: true };
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        message:
          args.labels.workflowSettingsNumberInvalid ||
          "Please enter a valid number.",
      };
    }
    if (isPositiveIntegerField(args.entry)) {
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return {
          ok: false,
          message:
            args.labels.workflowSettingsPositiveIntegerRequired ||
            "Please enter a positive integer.",
        };
      }
    }
    return { ok: true, value: parsed };
  }

  function updateDraft(patch, changeMeta) {
    const meta =
      changeMeta && typeof changeMeta === "object" ? changeMeta : {};
    state.draft = {
      backendId: toText(patch.backendId || "").trim(),
      workflowParams: cloneRecord(patch.workflowParams),
      providerOptions: cloneRecord(patch.providerOptions),
    };
    sendAction("update-draft", {
      executionOptions: state.draft,
      changedSection:
        typeof meta.changedSection === "string" ? meta.changedSection : "",
      changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
    });
  }

  function registerFieldCollector(collector) {
    if (typeof collector === "function") {
      state.fieldCollectors.push(collector);
    }
  }

  function flushDraftFromControls() {
    const collectors = Array.isArray(state.fieldCollectors)
      ? state.fieldCollectors
      : [];
    let hasError = false;
    collectors.forEach(function (collector) {
      try {
        if (collector() === false) {
          hasError = true;
        }
      } catch {
        hasError = true;
      }
    });
    return !hasError;
  }

  function createField(args) {
    const wrap = document.createElement("div");
    wrap.className = "field-row";
    const label = document.createElement("div");
    label.className = "field-label";
    label.textContent = args.entry.title || args.entry.key;
    wrap.appendChild(label);
    const controlWrap = document.createElement("div");
    controlWrap.className = "field-input-col";
    let control;
    const currentValue = Object.prototype.hasOwnProperty.call(args.values, args.entry.key)
      ? args.values[args.entry.key]
      : args.entry.defaultValue;
    if (args.entry.type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentValue === true;
      checkbox.disabled = args.entry.disabled === true;
      checkbox.addEventListener("change", function () {
        args.values[args.entry.key] = checkbox.checked;
        args.onChange({
          changedSection: args.section,
          changedKey: args.entry.key,
        });
      });
      checkbox.className = "field-checkbox-control";
      registerFieldCollector(function () {
        args.values[args.entry.key] = checkbox.checked;
        return true;
      });
      controlWrap.appendChild(checkbox);
      wrap.appendChild(controlWrap);
      return wrap;
    }
    const enumValues = Array.isArray(args.entry.enumValues)
      ? args.entry.enumValues
      : [];
    if (enumValues.length > 0 && args.entry.allowCustom !== true) {
      const options = enumValues.map(function(val) { return { value: val, label: val }; });
      let selectedValue = toText(currentValue || enumValues[0] || "");
      const customSelect = window.createCustomSelect(options, selectedValue, function(newValue) {
        selectedValue = toText(newValue);
        args.values[args.entry.key] = selectedValue;
        args.onChange({
          changedSection: args.section,
          changedKey: args.entry.key,
        });
      });
      if (args.entry.disabled === true) {
        customSelect.element.classList.add("disabled");
        customSelect.element.style.pointerEvents = "none";
        customSelect.element.style.opacity = "0.7";
      }
      registerFieldCollector(function () {
        args.values[args.entry.key] = selectedValue;
        return true;
      });
      controlWrap.appendChild(customSelect.element);
      wrap.appendChild(controlWrap);
      return wrap;
    } else {
      control = document.createElement("input");
      control.type = "text";
      if (args.entry.type === "number") {
        control.setAttribute(
          "inputmode",
          isPositiveIntegerField(args.entry) ? "numeric" : "decimal",
        );
      }
      control.value = toText(currentValue == null ? "" : currentValue);
      if (enumValues.length > 0) {
        const listId = `list-${args.section}-${args.entry.key}`;
        control.setAttribute("list", listId);
        const datalist = document.createElement("datalist");
        datalist.id = listId;
        enumValues.forEach(function (value) {
          const option = document.createElement("option");
          option.value = toText(value);
          datalist.appendChild(option);
        });
        controlWrap.appendChild(datalist);
      }
    }
    control.className = "field-control";
    control.disabled = args.entry.disabled === true;
    if (args.entry.type === "number") {
      control.classList.add("numeric");
    }
    const errorNode = document.createElement("div");
    errorNode.className = "field-error";
    let lastCommittedRaw = toText(control.value);
    const setFieldError = function (message) {
      if (message) {
        control.classList.add("invalid");
        errorNode.textContent = message;
        if (!errorNode.parentNode) {
          controlWrap.appendChild(errorNode);
        }
      } else {
        control.classList.remove("invalid");
        if (errorNode.parentNode) {
          errorNode.parentNode.removeChild(errorNode);
        }
      }
    };
    const commitControlValue = function (emitChange) {
      const rawValue = toText(control.value);
      let changed = false;
      if (args.entry.type === "number") {
        const validation = validateNumberFieldValue({
          entry: args.entry,
          rawValue,
          labels: args.labels || {},
        });
        if (!validation.ok) {
          setFieldError(validation.message);
          return false;
        }
        setFieldError("");
        if (validation.remove) {
          changed = Object.prototype.hasOwnProperty.call(args.values, args.entry.key);
          delete args.values[args.entry.key];
        } else {
          changed = args.values[args.entry.key] !== validation.value;
          args.values[args.entry.key] = validation.value;
        }
      } else {
        setFieldError("");
        const nextValue = normalizeTypeValue(args.entry.type, rawValue);
        if (typeof nextValue === "undefined") {
          changed = Object.prototype.hasOwnProperty.call(args.values, args.entry.key);
          delete args.values[args.entry.key];
        } else {
          changed = args.values[args.entry.key] !== nextValue;
          args.values[args.entry.key] = nextValue;
        }
      }
      if (emitChange && (changed || rawValue !== lastCommittedRaw)) {
        args.onChange({
          changedSection: args.section,
          changedKey: args.entry.key,
        });
      }
      lastCommittedRaw = rawValue;
      return true;
    };
    control.addEventListener("input", function () {
      if (args.entry.type === "number") {
        setFieldError("");
      }
      args.values[args.entry.key] = control.value;
    });
    control.addEventListener("change", function () {
      commitControlValue(true);
    });
    control.addEventListener("blur", function () {
      commitControlValue(true);
    });
    registerFieldCollector(function () {
      return commitControlValue(false);
    });
    controlWrap.appendChild(control);
    wrap.appendChild(controlWrap);
    return wrap;
  }

  function renderFormSection(args) {
    const card = document.createElement("section");
    card.className = "settings-card";
    const title = document.createElement("h3");
    title.className = "settings-card-title";
    title.textContent = args.title;
    card.appendChild(title);
    if (!Array.isArray(args.entries) || args.entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "settings-empty";
      empty.textContent = args.emptyText;
      card.appendChild(empty);
      return card;
    }
    args.entries.forEach(function (entry) {
      card.appendChild(
        createField({
          entry: entry,
          values: args.values,
          section: args.section,
          onChange: args.onChange,
          labels: args.labels,
        }),
      );
    });
    return card;
  }

  function render() {
    const root = document.getElementById("app");
    if (!root) {
      return;
    }
    root.innerHTML = "";
    const snapshot = state.snapshot;
    if (!snapshot) {
      return;
    }
    state.fieldCollectors = [];
    document.title = snapshot.title || "Workflow Settings";
    const shell = document.createElement("div");
    shell.className = "settings-shell";

    const meta = document.createElement("div");
    meta.className = "settings-meta";
    meta.innerHTML = [
      `${snapshot.labels.workflowLabel}: ${snapshot.workflow.label}`,
      `${snapshot.labels.providerLabel}: ${snapshot.workflow.providerId}`,
    ]
      .map(function (line) {
        return `<div>${line}</div>`;
      })
      .join("");

    const banner = document.createElement("div");
    banner.className = "settings-banner";

    const form = snapshot.form || {};
    if (form.requiresBackendProfile === true) {
      const profileWrap = document.createElement("div");
      profileWrap.className = "settings-banner-profile";
      const profileTitle = document.createElement("div");
      profileTitle.className = "settings-banner-profile-label";
      profileTitle.textContent = snapshot.labels.profileLabel;
      profileWrap.appendChild(profileTitle);
      if (form.profileEditable === true) {
        const options = (form.profiles || []).map(function(profile) {
          return { value: profile.id, label: profile.label };
        });
        const currentProfileId = toText(state.draft.backendId || form.selectedProfile || "").trim();
        const customSelect = createCustomSelect(options, currentProfileId, function(newValue) {
          state.draft.backendId = toText(newValue || "").trim();
          updateDraft(state.draft, {
            changedSection: "backend",
            changedKey: "backendId",
          });
        });
        customSelect.element.classList.add("settings-banner-profile-select");
        profileWrap.appendChild(customSelect.element);
      } else {
        const fixed = document.createElement("div");
        fixed.className = "settings-empty";
        const profileMatch = (form.profiles || []).find(function (entry) {
          return toText(entry.id).trim() === toText(form.selectedProfile).trim();
        });
        fixed.textContent = profileMatch
          ? profileMatch.label
          : snapshot.labels.noProfiles;
        profileWrap.appendChild(fixed);
      }
      banner.appendChild(profileWrap);
    }
    banner.appendChild(meta);
    shell.appendChild(banner);

    const grid = document.createElement("div");
    grid.className = "settings-grid";

    grid.appendChild(
      renderFormSection({
        title: snapshot.labels.workflowParamsTitle,
        emptyText: snapshot.labels.noWorkflowParams,
        entries: form.workflowSchemaEntries || [],
        values: state.draft.workflowParams,
        section: "workflowParams",
        labels: snapshot.labels || {},
        onChange: function (changeMeta) {
          updateDraft(state.draft, changeMeta);
        },
      }),
    );

    grid.appendChild(
      renderFormSection({
        title: snapshot.labels.providerOptionsTitle,
        emptyText: snapshot.labels.noProviderOptions,
        entries: form.providerSchemaEntries || [],
        values: state.draft.providerOptions,
        section: "providerOptions",
        labels: snapshot.labels || {},
        onChange: function (changeMeta) {
          updateDraft(state.draft, changeMeta);
        },
      }),
    );
    shell.appendChild(grid);

    if (form.profileMissing) {
      const error = document.createElement("div");
      error.className = "settings-error";
      error.textContent = snapshot.labels.blockedNoProfile;
      shell.appendChild(error);
    }

    const footer = document.createElement("footer");
    footer.className = "settings-footer";

    const persistLabel = document.createElement("label");
    persistLabel.className = "field-checkbox";
    const persistCheck = document.createElement("input");
    persistCheck.type = "checkbox";
    persistCheck.checked = snapshot.persistChecked !== false;
    persistCheck.addEventListener("change", function () {
      sendAction("toggle-persist", {
        checked: persistCheck.checked,
      });
    });
    persistLabel.appendChild(persistCheck);
    const persistText = document.createElement("span");
    persistText.textContent = snapshot.labels.persistLabel;
    persistLabel.appendChild(persistText);
    footer.appendChild(persistLabel);

    const actions = document.createElement("div");
    actions.className = "settings-actions";
    if (form.canRefreshAcpRuntimeCache === true) {
      const refreshBtn = document.createElement("button");
      refreshBtn.type = "button";
      refreshBtn.className = "settings-btn";
      refreshBtn.textContent =
        snapshot.labels.refreshAcpRuntimeCache || "Refresh ACP Config Cache";
      refreshBtn.addEventListener("click", function () {
        if (!flushDraftFromControls()) {
          return;
        }
        sendAction("refresh-acp-runtime-cache", {
          executionOptions: {
            backendId: toText(state.draft.backendId || "").trim(),
            workflowParams: cloneRecord(state.draft.workflowParams),
            providerOptions: cloneRecord(state.draft.providerOptions),
          },
        });
      });
      actions.appendChild(refreshBtn);
    }
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "settings-btn";
    cancelBtn.textContent = snapshot.labels.cancelLabel;
    cancelBtn.addEventListener("click", function () {
      sendAction("cancel");
    });
    actions.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "settings-btn primary";
    confirmBtn.textContent = snapshot.labels.confirmLabel;
    confirmBtn.disabled = form.profileMissing === true;
    confirmBtn.addEventListener("click", function () {
      if (!flushDraftFromControls()) {
        return;
      }
      sendAction("confirm", {
        executionOptions: {
          backendId: toText(state.draft.backendId || "").trim(),
          workflowParams: cloneRecord(state.draft.workflowParams),
          providerOptions: cloneRecord(state.draft.providerOptions),
        },
      });
    });
    actions.appendChild(confirmBtn);
    footer.appendChild(actions);
    shell.appendChild(footer);
    root.appendChild(shell);
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (
      data.type !== "workflow-settings-dialog:init" &&
      data.type !== "workflow-settings-dialog:snapshot"
    ) {
      return;
    }
    state.snapshot = data.payload || null;
    const form = state.snapshot && state.snapshot.form ? state.snapshot.form : {};
    state.draft = {
      backendId: toText(form.selectedProfile || "").trim(),
      workflowParams: cloneRecord(form.workflowParams),
      providerOptions: cloneRecord(form.providerOptions),
    };
    render();
  });

  sendAction("ready");
})();

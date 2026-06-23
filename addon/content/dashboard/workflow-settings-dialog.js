(function () {
  const state = {
    snapshot: null,
    draft: {
      backendId: "",
      workflowParams: {},
      providerOptions: {},
      runOptions: {},
    },
    fieldCollectors: [],
    refreshingAcpRuntimeCache: false,
    refreshingSkillRunnerModelCache: false,
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

  function measureDialogContentHeight() {
    const root = document.getElementById("app");
    const shell = root && root.querySelector(".settings-shell");
    const rootStyle = root ? window.getComputedStyle(root) : null;
    const paddingTop = Number.parseFloat(rootStyle?.paddingTop || "0") || 0;
    const paddingBottom =
      Number.parseFloat(rootStyle?.paddingBottom || "0") || 0;
    const shellHeight = Math.max(
      Number(shell && shell.scrollHeight) || 0,
      Number(shell && shell.getBoundingClientRect().height) || 0,
    );
    return Math.ceil(shellHeight + paddingTop + paddingBottom);
  }

  function sendDialogContentResizeRequest() {
    const contentHeight = measureDialogContentHeight();
    if (contentHeight > 0) {
      sendAction("resize-to-content", { contentHeight });
    }
  }

  function buildExecutionOptionsPayload() {
    return {
      backendId: toText(state.draft.backendId || "").trim(),
      workflowParams: cloneRecord(state.draft.workflowParams),
      providerOptions: cloneRecord(state.draft.providerOptions),
      runOptions: cloneRecord(state.draft.runOptions),
    };
  }

  function requestDialogContentResize() {
    window.requestAnimationFrame(function () {
      sendDialogContentResizeRequest();
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

  function fieldControlKey(section, key) {
    return toText(section).trim() + "." + toText(key).trim();
  }

  function coerceBoolean(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (!normalized) {
        return fallback === true;
      }
      return ["1", "true", "yes", "on"].indexOf(normalized) >= 0;
    }
    return fallback === true;
  }

  function isProviderConditionalFieldVisible(entry, draft) {
    const condition = entry && entry.visibleIfProviderOption;
    const key = toText(condition && condition.key).trim();
    if (!key) {
      return true;
    }
    const providerOptions =
      draft &&
      draft.providerOptions &&
      typeof draft.providerOptions === "object"
        ? draft.providerOptions
        : {};
    return (
      coerceBoolean(providerOptions[key], false) === (condition.equals === true)
    );
  }

  function applyConditionalFieldVisibility(root) {
    const container = root || document;
    const nodes = container.querySelectorAll
      ? container.querySelectorAll(
          "[data-workflow-settings-visible-provider-key]",
        )
      : [];
    Array.prototype.forEach.call(nodes, function (node) {
      const key = toText(
        node.getAttribute("data-workflow-settings-visible-provider-key"),
      ).trim();
      const expected =
        node.getAttribute("data-workflow-settings-visible-provider-equals") ===
        "true";
      const visible =
        coerceBoolean(state.draft.providerOptions[key], false) === expected;
      node.style.display = visible ? "" : "none";
      node.setAttribute("aria-hidden", visible ? "false" : "true");
    });
    requestDialogContentResize();
  }

  function getDraftSectionValues(section) {
    const key = toText(section).trim();
    if (key === "workflowParams") {
      return state.draft.workflowParams;
    }
    if (key === "providerOptions") {
      return state.draft.providerOptions;
    }
    if (key === "runOptions") {
      return state.draft.runOptions;
    }
    return {};
  }

  function setDraftFieldValue(args, value) {
    args.values[args.entry.key] = value;
    const sectionValues = getDraftSectionValues(args.section);
    if (sectionValues && typeof sectionValues === "object") {
      sectionValues[args.entry.key] = value;
    }
  }

  function deleteDraftFieldValue(args) {
    delete args.values[args.entry.key];
    const sectionValues = getDraftSectionValues(args.section);
    if (sectionValues && typeof sectionValues === "object") {
      delete sectionValues[args.entry.key];
    }
  }

  function appendRefreshActionButton(actions, options) {
    if (!actions || !options || options.visible !== true) {
      return;
    }
    const refreshBtn = document.createElement("button");
    const stateKey = toText(options.stateKey);
    const isRefreshing = state[stateKey] === true;
    refreshBtn.type = "button";
    refreshBtn.className = "settings-btn";
    refreshBtn.classList.toggle("is-busy", isRefreshing);
    refreshBtn.disabled = isRefreshing;
    refreshBtn.setAttribute("aria-busy", isRefreshing ? "true" : "false");
    refreshBtn.textContent = isRefreshing
      ? options.runningText || options.text
      : options.text;
    refreshBtn.addEventListener("click", function () {
      if (!flushDraftFromControls()) {
        return;
      }
      state[stateKey] = true;
      refreshBtn.disabled = true;
      refreshBtn.classList.add("is-busy");
      refreshBtn.setAttribute("aria-busy", "true");
      refreshBtn.textContent = options.runningText || options.text;
      sendAction(options.action, {
        executionOptions: buildExecutionOptionsPayload(),
      });
    });
    actions.appendChild(refreshBtn);
  }

  function isWarningProviderOptionKey(key) {
    return key === "autoApproveAcpPermissions";
  }

  function formStructureSignature(snapshot) {
    const form = snapshot && snapshot.form ? snapshot.form : {};
    const workflow = snapshot && snapshot.workflow ? snapshot.workflow : {};
    const summarizeEntries = function (entries) {
      return (Array.isArray(entries) ? entries : []).map(function (entry) {
        return {
          key: toText(entry && entry.key),
          type: toText(entry && entry.type),
          allowCustom: entry && entry.allowCustom === true,
          disabled: entry && entry.disabled === true,
          visibleIfProviderOption:
            entry && entry.visibleIfProviderOption
              ? {
                  key: toText(entry.visibleIfProviderOption.key),
                  equals: entry.visibleIfProviderOption.equals === true,
                }
              : null,
          enumValues: Array.isArray(entry && entry.enumValues)
            ? entry.enumValues
            : [],
          options: Array.isArray(entry && entry.options)
            ? entry.options.map(function (option) {
                return {
                  value: toText(option && option.value),
                  label: toText(option && option.label),
                };
              })
            : [],
        };
      });
    };
    return JSON.stringify({
      workflowId: toText(
        workflow.id || workflow.workflowId || workflow.key || workflow.label,
      ),
      providerId: toText(workflow.providerId),
      requiresBackendProfile: form.requiresBackendProfile === true,
      profileEditable: form.profileEditable === true,
      profiles: Array.isArray(form.profiles)
        ? form.profiles.map(function (profile) {
            return { id: toText(profile.id), label: toText(profile.label) };
          })
        : [],
      workflowSchemaEntries: summarizeEntries(form.workflowSchemaEntries),
      providerSchemaEntries: summarizeEntries(form.providerSchemaEntries),
      runSchemaEntries: summarizeEntries(form.runSchemaEntries),
    });
  }

  function shouldResetDraftForSnapshot(nextSnapshot) {
    const nextSignature = formStructureSignature(nextSnapshot);
    const previousSignature = formStructureSignature(state.snapshot);
    return !state.snapshot || nextSignature !== previousSignature;
  }

  function captureActiveFormState(root) {
    const result = {
      activeControlKey: "",
      value: "",
      checked: false,
      selectionStart: null,
      selectionEnd: null,
    };
    if (!root) return result;
    const active = document.activeElement;
    if (!active || !root.contains(active)) return result;
    const control =
      active.closest && active.closest("[data-workflow-settings-control-key]")
        ? active.closest("[data-workflow-settings-control-key]")
        : active;
    const key =
      control.getAttribute &&
      control.getAttribute("data-workflow-settings-control-key");
    if (!key) return result;
    result.activeControlKey = key;
    result.value = typeof control.value === "string" ? control.value : "";
    result.checked = control.checked === true;
    result.selectionStart =
      typeof control.selectionStart === "number"
        ? control.selectionStart
        : null;
    result.selectionEnd =
      typeof control.selectionEnd === "number" ? control.selectionEnd : null;
    return result;
  }

  function restoreActiveFormState(root, preservedState) {
    const key = preservedState && preservedState.activeControlKey;
    if (!key || !root) return;
    const control = root.querySelector(
      '[data-workflow-settings-control-key="' + key + '"]',
    );
    if (!control) return;
    if (typeof control.value === "string") {
      control.value = preservedState.value || "";
    }
    if (typeof control.checked === "boolean") {
      control.checked = preservedState.checked === true;
    }
    if (typeof control.focus === "function") {
      control.focus();
    }
    if (
      typeof control.setSelectionRange === "function" &&
      typeof preservedState.selectionStart === "number" &&
      typeof preservedState.selectionEnd === "number"
    ) {
      control.setSelectionRange(
        preservedState.selectionStart,
        preservedState.selectionEnd,
      );
    }
  }

  function isPositiveIntegerField(entry) {
    const key = toText(entry && entry.key)
      .trim()
      .toLowerCase();
    if (!key) {
      return false;
    }
    if (key === "hard_timeout_seconds") {
      return true;
    }
    return key.includes("timeout");
  }

  function isNonNegativeIntegerField(entry) {
    const key = toText(entry && entry.key)
      .trim()
      .toLowerCase();
    return key === "interactive_reply_timeout_sec";
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
        message: args.labels.workflowSettingsNumberInvalid,
      };
    }
    if (isNonNegativeIntegerField(args.entry)) {
      if (!Number.isInteger(parsed) || parsed < 0) {
        return {
          ok: false,
          message: args.labels.workflowSettingsPositiveIntegerRequired,
        };
      }
    } else if (isPositiveIntegerField(args.entry)) {
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return {
          ok: false,
          message: args.labels.workflowSettingsPositiveIntegerRequired,
        };
      }
    }
    return { ok: true, value: parsed };
  }

  function updateDraft(patch, changeMeta) {
    const meta = changeMeta && typeof changeMeta === "object" ? changeMeta : {};
    state.draft = {
      backendId: toText(patch.backendId || "").trim(),
      workflowParams: cloneRecord(patch.workflowParams),
      providerOptions: cloneRecord(patch.providerOptions),
      runOptions: cloneRecord(patch.runOptions),
    };
    sendAction("update-draft", {
      executionOptions: state.draft,
      changedSection:
        typeof meta.changedSection === "string" ? meta.changedSection : "",
      changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
    });
    applyConditionalFieldVisibility(document);
  }

  function registerFieldCollector(collector) {
    if (typeof collector === "function") {
      state.fieldCollectors.push(collector);
    }
  }

  function markCustomSelectDisabled(element) {
    if (!element) {
      return;
    }
    element.classList.add("disabled");
    element.setAttribute("aria-disabled", "true");
    const trigger = element.querySelector
      ? element.querySelector(".custom-select-trigger")
      : null;
    if (trigger) {
      trigger.setAttribute("aria-disabled", "true");
      trigger.setAttribute("tabindex", "-1");
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
    wrap.setAttribute("data-workflow-settings-field-section", args.section);
    wrap.setAttribute("data-workflow-settings-field-key", args.entry.key);
    if (args.entry.visibleIfProviderOption) {
      wrap.setAttribute(
        "data-workflow-settings-visible-provider-key",
        toText(args.entry.visibleIfProviderOption.key),
      );
      wrap.setAttribute(
        "data-workflow-settings-visible-provider-equals",
        args.entry.visibleIfProviderOption.equals === true ? "true" : "false",
      );
      if (!isProviderConditionalFieldVisible(args.entry, state.draft)) {
        wrap.style.display = "none";
        wrap.setAttribute("aria-hidden", "true");
      }
    }
    const label = document.createElement("div");
    label.className = "field-label";
    if (isWarningProviderOptionKey(args.entry.key)) {
      label.className += " field-label-warning";
    }
    label.textContent = args.entry.title || args.entry.key;
    wrap.appendChild(label);
    const controlWrap = document.createElement("div");
    controlWrap.className = "field-input-col";
    let control;
    let controlNode;
    const controlKey = fieldControlKey(args.section, args.entry.key);
    const currentValue = Object.prototype.hasOwnProperty.call(
      args.values,
      args.entry.key,
    )
      ? args.values[args.entry.key]
      : args.entry.defaultValue;
    if (args.entry.type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute("data-workflow-settings-control-key", controlKey);
      checkbox.checked = currentValue === true;
      checkbox.disabled = args.entry.disabled === true;
      checkbox.addEventListener("change", function () {
        setDraftFieldValue(args, checkbox.checked);
        args.onChange({
          changedSection: args.section,
          changedKey: args.entry.key,
        });
      });
      checkbox.className = "field-checkbox-control";
      registerFieldCollector(function () {
        setDraftFieldValue(args, checkbox.checked);
        return true;
      });
      controlWrap.appendChild(checkbox);
      wrap.appendChild(controlWrap);
      return wrap;
    }
    const enumValues = Array.isArray(args.entry.enumValues)
      ? args.entry.enumValues
      : [];
    const structuredOptions = Array.isArray(args.entry.options)
      ? args.entry.options
          .filter(function (entry) {
            return entry && typeof entry === "object";
          })
          .map(function (entry) {
            return {
              value: toText(entry.value),
              label: toText(entry.label || entry.value),
              description: toText(entry.description),
            };
          })
      : [];
    const optionEntries =
      structuredOptions.length > 0
        ? structuredOptions
        : enumValues.map(function (val) {
            return { value: toText(val), label: toText(val) };
          });
    if (optionEntries.length > 0 && args.entry.allowCustom !== true) {
      let selectedValue = toText(currentValue || optionEntries[0].value || "");
      const customSelect = window.createCustomSelect(
        optionEntries,
        selectedValue,
        function (newValue) {
          selectedValue = toText(newValue);
          setDraftFieldValue(args, selectedValue);
          args.onChange({
            changedSection: args.section,
            changedKey: args.entry.key,
          });
        },
      );
      customSelect.element.setAttribute(
        "data-workflow-settings-control-key",
        controlKey,
      );
      if (args.entry.disabled === true) {
        markCustomSelectDisabled(customSelect.element);
      }
      registerFieldCollector(function () {
        setDraftFieldValue(args, selectedValue);
        return true;
      });
      controlWrap.appendChild(customSelect.element);
      wrap.appendChild(controlWrap);
      return wrap;
    } else if (optionEntries.length > 0 && args.entry.allowCustom === true) {
      const combo = document.createElement("div");
      combo.style.display = "flex";
      combo.style.alignItems = "center";
      combo.style.gap = "8px";
      const currentText = toText(currentValue == null ? "" : currentValue);
      const customSelect = window.createCustomSelect(
        optionEntries,
        currentText,
        function (newValue) {
          control.value = toText(newValue);
          setDraftFieldValue(args, control.value);
          args.onChange({
            changedSection: args.section,
            changedKey: args.entry.key,
          });
        },
      );
      customSelect.element.setAttribute(
        "data-workflow-settings-control-key",
        controlKey + ".recommendation",
      );
      customSelect.element.style.flex = "1 1 55%";
      if (args.entry.disabled === true) {
        markCustomSelectDisabled(customSelect.element);
      }
      combo.appendChild(customSelect.element);
      control = document.createElement("input");
      control.type = "text";
      control.setAttribute("data-workflow-settings-control-key", controlKey);
      control.value = currentText;
      control.style.flex = "1 1 45%";
      combo.appendChild(control);
      controlNode = combo;
    } else {
      control = document.createElement("input");
      control.type = "text";
      control.setAttribute("data-workflow-settings-control-key", controlKey);
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
          changed = Object.prototype.hasOwnProperty.call(
            args.values,
            args.entry.key,
          );
          deleteDraftFieldValue(args);
        } else {
          changed = args.values[args.entry.key] !== validation.value;
          setDraftFieldValue(args, validation.value);
        }
      } else {
        setFieldError("");
        const nextValue = normalizeTypeValue(args.entry.type, rawValue);
        if (typeof nextValue === "undefined") {
          changed = Object.prototype.hasOwnProperty.call(
            args.values,
            args.entry.key,
          );
          deleteDraftFieldValue(args);
        } else {
          changed = args.values[args.entry.key] !== nextValue;
          setDraftFieldValue(args, nextValue);
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
      setDraftFieldValue(args, control.value);
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
    controlWrap.appendChild(controlNode || control);
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
    card.addEventListener("change", function () {
      applyConditionalFieldVisibility(card);
    });
    return card;
  }

  function render() {
    const root = document.getElementById("app");
    if (!root) {
      return;
    }
    const preservedState = captureActiveFormState(root);
    root.innerHTML = "";
    const snapshot = state.snapshot;
    if (!snapshot) {
      return;
    }
    state.fieldCollectors = [];
    document.title =
      snapshot.title ||
      String((snapshot.labels && snapshot.labels.title) || "").trim();
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
        const options = (form.profiles || []).map(function (profile) {
          return { value: profile.id, label: profile.label };
        });
        const currentProfileId = toText(
          state.draft.backendId || form.selectedProfile || "",
        ).trim();
        const customSelect = createCustomSelect(
          options,
          currentProfileId,
          function (newValue) {
            state.draft.backendId = toText(newValue || "").trim();
            updateDraft(state.draft, {
              changedSection: "backend",
              changedKey: "backendId",
            });
          },
        );
        customSelect.element.classList.add("settings-banner-profile-select");
        profileWrap.appendChild(customSelect.element);
      } else {
        const fixed = document.createElement("div");
        fixed.className = "settings-empty";
        const profileMatch = (form.profiles || []).find(function (entry) {
          return (
            toText(entry.id).trim() === toText(form.selectedProfile).trim()
          );
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

    const workflowColumn = document.createElement("div");
    workflowColumn.className = "settings-options-column";
    workflowColumn.appendChild(
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
    if (Array.isArray(form.runSchemaEntries) && form.runSchemaEntries.length) {
      workflowColumn.appendChild(
        renderFormSection({
          title: snapshot.labels.runOptionsTitle,
          emptyText: snapshot.labels.noRunOptions,
          entries: form.runSchemaEntries,
          values: state.draft.runOptions,
          section: "runOptions",
          labels: snapshot.labels || {},
          onChange: function (changeMeta) {
            updateDraft(state.draft, changeMeta);
          },
        }),
      );
    }
    grid.appendChild(workflowColumn);

    const providerCard = renderFormSection({
      title: snapshot.labels.providerOptionsTitle,
      emptyText: snapshot.labels.noProviderOptions,
      entries: form.providerSchemaEntries || [],
      values: state.draft.providerOptions,
      section: "providerOptions",
      labels: snapshot.labels || {},
      onChange: function (changeMeta) {
        updateDraft(state.draft, changeMeta);
      },
    });
    providerCard.classList.add("settings-card-fill");
    grid.appendChild(providerCard);
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
    appendRefreshActionButton(actions, {
      visible: form.canRefreshAcpRuntimeCache === true,
      stateKey: "refreshingAcpRuntimeCache",
      action: "refresh-acp-runtime-cache",
      text: snapshot.labels.refreshAcpRuntimeCache,
      runningText:
        snapshot.labels.refreshAcpRuntimeCacheRunning ||
        snapshot.labels.refreshAcpRuntimeCache,
    });
    appendRefreshActionButton(actions, {
      visible: form.canRefreshSkillRunnerModelCache === true,
      stateKey: "refreshingSkillRunnerModelCache",
      action: "refresh-skillrunner-model-cache",
      text: snapshot.labels.refreshSkillRunnerModelCache,
      runningText:
        snapshot.labels.refreshSkillRunnerModelCacheRunning ||
        snapshot.labels.refreshSkillRunnerModelCache,
    });
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
          runOptions: cloneRecord(state.draft.runOptions),
        },
      });
    });
    actions.appendChild(confirmBtn);
    footer.appendChild(actions);
    shell.appendChild(footer);
    root.appendChild(shell);
    restoreActiveFormState(root, preservedState);
    requestDialogContentResize();
  }

  window.addEventListener("message", function (event) {
    const data = event.data || {};
    if (
      data.type !== "workflow-settings-dialog:init" &&
      data.type !== "workflow-settings-dialog:snapshot"
    ) {
      return;
    }
    const nextSnapshot = data.payload || null;
    state.refreshingAcpRuntimeCache = false;
    state.refreshingSkillRunnerModelCache = false;
    const resetDraft = shouldResetDraftForSnapshot(nextSnapshot);
    state.snapshot = nextSnapshot;
    const form =
      state.snapshot && state.snapshot.form ? state.snapshot.form : {};
    if (resetDraft) {
      state.draft = {
        backendId: toText(form.selectedProfile || "").trim(),
        workflowParams: cloneRecord(form.workflowParams),
        providerOptions: cloneRecord(form.providerOptions),
        runOptions: cloneRecord(form.runOptions),
      };
    }
    render();
  });

  sendAction("ready");
})();

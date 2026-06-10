import { isWindowAlive } from "../utils/window";
import { refreshWorkflowMenus } from "./workflowMenu";
import {
  applyRunOnceWorkflowSettingsDraft,
  getWorkflowSettingsDialogInitialState,
  listProviderProfilesForWorkflow,
  savePersistentWorkflowSettingsDraft,
} from "./workflowSettings";
import { getString } from "../utils/locale";
import type { LoadedWorkflow } from "../workflows/types";
import {
  buildWorkflowSettingsDialogDraft,
  buildWorkflowSettingsDialogRenderModel,
  collectSchemaValues,
  resolveProviderSchemaEntries,
  type FormSchemaEntry,
} from "./workflowSettingsDialogModel";
import { resolveBackendDisplayName } from "../backends/displayName";
import { getVisibleLoadedWorkflowEntries } from "./workflowVisibility";

type FormSchemaType = "string" | "number" | "boolean";

const HTML_NS = "http://www.w3.org/1999/xhtml";

function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
) {
  return doc.createElementNS(HTML_NS, tag) as HTMLElementTagNameMap[K];
}

function applySelectVisualStyle(control: HTMLElement, width?: string) {
  if (width) {
    control.style.width = width;
  }
  control.style.boxSizing = "border-box";
  control.style.position = "relative";
  control.style.display = "inline-block";
}

function getChoiceTrigger(control: Element) {
  return control.querySelector(
    "[data-zs-choice-trigger='1']",
  ) as HTMLButtonElement | null;
}

function getChoiceList(control: Element) {
  return control.querySelector(
    "[data-zs-choice-list='1']",
  ) as HTMLDivElement | null;
}

function closeChoiceList(control: Element) {
  const list = getChoiceList(control);
  if (list) {
    list.hidden = true;
    list.style.display = "none";
  }
}

function closeAllChoiceLists(doc: Document) {
  const lists = Array.from(
    doc.querySelectorAll("[data-zs-choice-list='1']"),
  ) as HTMLDivElement[];
  for (const list of lists) {
    list.hidden = true;
    list.style.display = "none";
  }
}

function dispatchChoiceChange(control: Element) {
  const doc = control.ownerDocument;
  if (!doc) {
    return;
  }
  const ev = doc.createEvent("Event");
  ev.initEvent("change", true, true);
  control.dispatchEvent(ev);
}

function setChoiceSelection(args: {
  control: Element;
  value: string;
  label: string;
  dispatchChange?: boolean;
}) {
  const { control, value, label, dispatchChange } = args;
  control.setAttribute("data-zs-choice-value", value);
  (control as { value?: string }).value = value;
  const triggerLabel = control.querySelector(
    "[data-zs-choice-trigger-label='1']",
  ) as HTMLSpanElement | null;
  if (triggerLabel) {
    triggerLabel.textContent = label || getString("choice-empty" as any);
  }
  if (dispatchChange) {
    dispatchChoiceChange(control);
  }
}

function getElementValue(control: Element) {
  if (control.getAttribute("data-zs-choice-control") === "1") {
    return String(control.getAttribute("data-zs-choice-value") || "").trim();
  }
  return String(
    (control as HTMLInputElement | HTMLSelectElement).value || "",
  ).trim();
}

function createChoiceControl(args: {
  doc: Document;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  includeEmptyOption?: {
    value: string;
    label: string;
  };
}) {
  const { doc, options, selectedValue, includeEmptyOption } = args;
  const root = createHtmlElement(doc, "div");
  root.setAttribute("data-zs-choice-control", "1");
  applySelectVisualStyle(root);

  const trigger = createHtmlElement(doc, "button");
  trigger.type = "button";
  trigger.setAttribute("data-zs-choice-trigger", "1");
  trigger.style.width = "100%";
  trigger.style.boxSizing = "border-box";
  trigger.style.padding = "2px 24px 2px 6px";
  trigger.style.border = "1px solid #8f8f9d";
  trigger.style.borderRadius = "4px";
  trigger.style.backgroundColor = "#fff";
  trigger.style.color = "#111";
  trigger.style.textAlign = "left";
  trigger.style.cursor = "pointer";
  trigger.style.position = "relative";
  root.appendChild(trigger);

  const triggerLabel = createHtmlElement(doc, "span");
  triggerLabel.setAttribute("data-zs-choice-trigger-label", "1");
  trigger.appendChild(triggerLabel);

  const arrow = createHtmlElement(doc, "span");
  arrow.textContent = "▾";
  arrow.style.position = "absolute";
  arrow.style.right = "8px";
  arrow.style.top = "50%";
  arrow.style.transform = "translateY(-50%)";
  arrow.style.pointerEvents = "none";
  trigger.appendChild(arrow);

  const list = createHtmlElement(doc, "div");
  list.setAttribute("data-zs-choice-list", "1");
  list.style.display = "none";
  list.hidden = true;
  list.style.position = "absolute";
  list.style.left = "0";
  list.style.right = "0";
  list.style.top = "calc(100% + 2px)";
  list.style.zIndex = "99999";
  list.style.border = "1px solid #8f8f9d";
  list.style.borderRadius = "4px";
  list.style.backgroundColor = "#fff";
  list.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  list.style.maxHeight = "260px";
  list.style.overflowY = "auto";
  root.appendChild(list);

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const shouldOpen = list.style.display === "none";
    closeAllChoiceLists(doc);
    list.hidden = !shouldOpen;
    list.style.display = shouldOpen ? "block" : "none";
  });
  doc.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    if (!target || !root.contains(target)) {
      closeAllChoiceLists(doc);
    }
  });

  setChoiceControlOptions({
    control: root,
    options,
    selectedValue,
    includeEmptyOption,
  });
  return root;
}

function setChoiceControlOptions(args: {
  control: Element;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  includeEmptyOption?: {
    value: string;
    label: string;
  };
}) {
  const { control, options, selectedValue, includeEmptyOption } = args;
  const list = getChoiceList(control);
  if (!list) {
    return;
  }
  clearChildren(list);
  const allOptions = [
    ...(includeEmptyOption ? [includeEmptyOption] : []),
    ...options,
  ];
  for (const entry of allOptions) {
    const option = createHtmlElement(control.ownerDocument!, "button");
    option.type = "button";
    option.textContent = entry.label;
    option.style.width = "100%";
    option.style.textAlign = "left";
    option.style.padding = "4px 6px";
    option.style.border = "none";
    option.style.background = "transparent";
    option.style.cursor = "pointer";
    option.style.color = "#111";
    option.addEventListener("mouseenter", () => {
      option.style.backgroundColor = "#f1f3f5";
    });
    option.addEventListener("mouseleave", () => {
      option.style.backgroundColor = "transparent";
    });
    const pick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      setChoiceSelection({
        control,
        value: entry.value,
        label: entry.label,
        dispatchChange: true,
      });
      closeAllChoiceLists(control.ownerDocument!);
    };
    option.addEventListener("mousedown", pick);
    option.addEventListener("click", pick);
    option.addEventListener("command", pick as EventListener);
    list.appendChild(option);
  }
  const matched = allOptions.find((entry) => entry.value === selectedValue);
  const finalValue = matched ? matched.value : (allOptions[0]?.value ?? "");
  const finalLabel = matched
    ? matched.label
    : (allOptions[0]?.label ?? "(empty)");
  setChoiceSelection({
    control,
    value: finalValue,
    label: finalLabel,
  });
}

function getControlValue(control: Element) {
  return getElementValue(control);
}

function coerceBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    return ["1", "true", "yes", "on"].includes(normalized);
  }
  return fallback;
}

function isSchemaEntryVisible(
  entry: FormSchemaEntry,
  values: Record<string, unknown>,
) {
  const condition = entry.visibleIf;
  if (!condition?.parameter) {
    return true;
  }
  return coerceBoolean(values[condition.parameter], false) === condition.equals;
}

function coerceNumberText(value: unknown, fallback: unknown) {
  const raw = typeof value === "undefined" ? fallback : value;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return String(parsed);
    }
  }
  return "";
}

function coerceString(value: unknown, fallback: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof fallback === "string") {
    return fallback;
  }
  return "";
}

function isWarningProviderOptionKey(key: string) {
  return key === "autoApproveAcpPermissions";
}

function applyTailPreservingChoiceStyle(control: Element) {
  control.classList.add("tail-preserve-select");
  const triggerLabel = control.querySelector(
    "[data-zs-choice-trigger-label='1']",
  ) as HTMLElement | null;
  if (triggerLabel) {
    triggerLabel.style.display = "block";
    triggerLabel.style.flex = "1 1 auto";
    triggerLabel.style.minWidth = "0";
    triggerLabel.style.maxWidth = "100%";
    triggerLabel.style.overflow = "hidden";
    triggerLabel.style.textOverflow = "ellipsis";
    triggerLabel.style.whiteSpace = "nowrap";
    triggerLabel.style.direction = "rtl";
    triggerLabel.style.textAlign = "left";
    triggerLabel.style.unicodeBidi = "isolate";
  }
  const optionButtons = Array.from(
    control.querySelectorAll("[data-zs-choice-list='1'] button"),
  ) as HTMLElement[];
  optionButtons.forEach((option: HTMLElement) => {
    option.style.direction = "rtl";
    option.style.textAlign = "left";
    option.style.unicodeBidi = "isolate";
  });
}

function renderSchemaFields(args: {
  doc: Document;
  container: HTMLElement;
  entries: FormSchemaEntry[];
  values: Record<string, unknown>;
  idPrefix: string;
  emptyText: string;
}) {
  const { doc, container, entries, values, idPrefix, emptyText } = args;
  container.innerHTML = "";
  const visibleEntries = entries.filter((entry) =>
    isSchemaEntryVisible(entry, values),
  );
  if (visibleEntries.length === 0) {
    const empty = createHtmlElement(doc, "p");
    empty.textContent = emptyText;
    empty.style.margin = "4px 0";
    empty.style.color = "#666";
    container.appendChild(empty);
    return;
  }

  for (const entry of visibleEntries) {
    const row = createHtmlElement(doc, "div");
    row.style.marginBottom = "8px";

    const label = createHtmlElement(doc, "label");
    const labelText = entry.title || entry.key;
    label.textContent = labelText;
    const controlId = `${idPrefix}-${entry.key}`;
    label.setAttribute("for", controlId);
    label.style.display = "block";
    label.style.fontWeight = "600";
    if (isWarningProviderOptionKey(entry.key)) {
      label.style.color = "#b42318";
      label.style.fontWeight = "700";
    }
    row.appendChild(label);

    const rawValue = values[entry.key];
    const defaultValue = entry.defaultValue;

    if (entry.type === "boolean") {
      const checkboxWrap = createHtmlElement(doc, "label");
      checkboxWrap.style.display = "inline-flex";
      checkboxWrap.style.alignItems = "center";
      checkboxWrap.style.gap = "8px";

      const checkbox = createHtmlElement(doc, "input");
      checkbox.type = "checkbox";
      checkbox.id = controlId;
      checkbox.checked = coerceBoolean(rawValue, coerceBoolean(defaultValue));
      checkbox.disabled = entry.disabled === true;
      checkbox.setAttribute("data-zs-option-key", entry.key);
      checkbox.setAttribute("data-zs-option-type", entry.type);
      checkboxWrap.appendChild(checkbox);

      const checkboxText = createHtmlElement(doc, "span");
      checkboxText.textContent = getString("workflow-settings-enabled" as any);
      checkboxWrap.appendChild(checkboxText);

      row.appendChild(checkboxWrap);
    } else if (
      entry.type === "string" &&
      ((Array.isArray(entry.options) && entry.options.length > 0) ||
        (Array.isArray(entry.enumValues) && entry.enumValues.length > 0))
    ) {
      const options =
        Array.isArray(entry.options) && entry.options.length > 0
          ? entry.options.map((candidate) => ({
              value: String(candidate.value || ""),
              label: String(candidate.label || candidate.value || ""),
            }))
          : (entry.enumValues || []).map((candidate) => ({
              value: candidate,
              label: candidate,
            }));
      const selectedValue = coerceString(rawValue, defaultValue);
      const needsEmptyOption =
        !options.some((candidate) => candidate.value === "") &&
        (selectedValue.length === 0 ||
          (typeof defaultValue === "string" && defaultValue.length === 0));
      if (entry.allowCustom === true) {
        const combo = createHtmlElement(doc, "div");
        combo.style.display = "inline-flex";
        combo.style.alignItems = "center";
        combo.style.gap = "8px";

        const recommendationControl = createChoiceControl({
          doc,
          options,
          selectedValue,
          includeEmptyOption: needsEmptyOption
            ? {
                value: "",
                label: getString("workflow-settings-default-option" as any),
              }
            : undefined,
        });
        recommendationControl.setAttribute("id", `${controlId}-recommendation`);
        applySelectVisualStyle(recommendationControl, "180px");
        if (entry.key === "acpModelId") {
          applyTailPreservingChoiceStyle(recommendationControl);
        }
        combo.appendChild(recommendationControl);

        const customInput = createHtmlElement(doc, "input");
        customInput.id = controlId;
        customInput.type = "text";
        customInput.style.width = "320px";
        customInput.value = selectedValue;
        customInput.disabled = entry.disabled === true;
        customInput.setAttribute("data-zs-option-key", entry.key);
        customInput.setAttribute("data-zs-option-type", entry.type);
        recommendationControl.addEventListener("change", () => {
          customInput.value = getElementValue(recommendationControl);
        });
        combo.appendChild(customInput);

        row.appendChild(combo);
      } else {
        const control = createChoiceControl({
          doc,
          options,
          selectedValue,
          includeEmptyOption: needsEmptyOption
            ? {
                value: "",
                label: getString("workflow-settings-default-option" as any),
              }
            : undefined,
        });
        control.setAttribute("id", controlId);
        control.setAttribute("data-zs-option-key", entry.key);
        control.setAttribute("data-zs-option-type", entry.type);
        if (entry.disabled === true) {
          const disabledControl = control as HTMLElement;
          disabledControl.setAttribute("aria-disabled", "true");
          disabledControl.style.opacity = "0.7";
          disabledControl.style.pointerEvents = "none";
        }
        applySelectVisualStyle(control, "320px");
        if (entry.key === "acpModelId") {
          applyTailPreservingChoiceStyle(control);
        }
        row.appendChild(control);
      }
    } else {
      const input = createHtmlElement(doc, "input");
      input.id = controlId;
      input.style.width = "320px";
      input.setAttribute("data-zs-option-key", entry.key);
      input.setAttribute("data-zs-option-type", entry.type);
      if (entry.type === "number") {
        input.type = "number";
        input.step = "any";
        input.value = coerceNumberText(rawValue, defaultValue);
      } else {
        input.type = "text";
        input.value = coerceString(rawValue, defaultValue);
      }
      input.disabled = entry.disabled === true;
      row.appendChild(input);
    }

    if (entry.description) {
      const desc = createHtmlElement(doc, "p");
      desc.textContent = entry.description;
      desc.style.margin = "2px 0 0 0";
      desc.style.color = "#666";
      desc.style.fontSize = "12px";
      row.appendChild(desc);
    }

    container.appendChild(row);
  }
}

function getAlertWindow(window?: Window) {
  if (window && typeof window.alert === "function") {
    return window;
  }
  return ztoolkit.getGlobal("window") as Window | undefined;
}

function clearChildren(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function setProfileSelectOptions(args: {
  control: Element;
  profileItems: Array<{ id: string; label: string }>;
  selectedId: string;
  includePersistedFallback?: boolean;
}) {
  const { control, profileItems, selectedId, includePersistedFallback } = args;
  setChoiceControlOptions({
    control,
    options: profileItems.map((profile) => ({
      value: profile.id,
      label: profile.label,
    })),
    selectedValue: selectedId,
    includeEmptyOption: includePersistedFallback
      ? {
          value: "",
          label: getString("workflow-settings-use-persisted-profile" as any),
        }
      : undefined,
  });
}

function appendSectionTitle(doc: Document, root: HTMLElement, text: string) {
  const title = createHtmlElement(doc, "h4");
  title.textContent = text;
  title.style.margin = "10px 0 6px";
  root.appendChild(title);
}

function appendLabeledControlRow(args: {
  doc: Document;
  root: HTMLElement;
  label: string;
  control: Element;
}) {
  const row = createHtmlElement(args.doc, "div");
  row.style.marginBottom = "8px";

  const label = createHtmlElement(args.doc, "label");
  label.textContent = args.label;
  label.style.display = "inline-block";
  label.style.minWidth = "120px";
  row.appendChild(label);
  row.appendChild(args.control);

  args.root.appendChild(row);
}

async function pickWorkflowIdForSettings(args: {
  window?: Window;
  workflows: LoadedWorkflow[];
}) {
  const workflows = args.workflows;
  if (workflows.length === 0) {
    return "";
  }
  if (workflows.length === 1) {
    return workflows[0].manifest.id;
  }
  const dialogData: Record<string, unknown> = {
    selectedWorkflowId: workflows[0].manifest.id,
    loadCallback: () => {
      const doc = addon.data.dialog?.window?.document;
      if (!doc) {
        return;
      }
      const root = doc.getElementById("zs-workflow-settings-picker-root");
      if (!root) {
        return;
      }
      root.innerHTML = "";
      const panel = createHtmlElement(doc, "div");
      panel.style.minWidth = "420px";
      panel.style.padding = "8px";

      const workflowSelect = createChoiceControl({
        doc,
        options: workflows.map((workflow) => ({
          value: workflow.manifest.id,
          label: workflow.manifest.label,
        })),
        selectedValue: workflows[0].manifest.id,
      });
      workflowSelect.setAttribute("id", "zs-workflow-settings-picker-workflow");
      applySelectVisualStyle(workflowSelect, "360px");
      appendLabeledControlRow({
        doc,
        root: panel,
        label: getString("workflow-settings-workflow-label" as any),
        control: workflowSelect,
      });
      workflowSelect.addEventListener("change", () => {
        dialogData.selectedWorkflowId = getControlValue(workflowSelect);
      });

      root.appendChild(panel);
    },
    unloadCallback: () => {},
  };

  const pickerDialog = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-workflow-settings-picker-root",
      styles: { padding: "6px" },
    })
    .addButton(getString("workflow-settings-open" as any), "open")
    .addButton(getString("workflow-settings-cancel" as any), "cancel")
    .setDialogData(dialogData)
    .open(getString("workflow-settings-picker-title" as any));

  addon.data.dialog = pickerDialog;
  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  addon.data.dialog = undefined;

  if ((dialogData as { _lastButtonId?: string })._lastButtonId !== "open") {
    return "";
  }

  const selected = String(dialogData.selectedWorkflowId || "").trim();
  if (!selected) {
    return "";
  }
  if (!workflows.some((entry) => entry.manifest.id === selected)) {
    return "";
  }
  return selected;
}

export async function openWorkflowSettingsDialog(args?: {
  window?: Window;
  workflowId?: string;
}) {
  if (isWindowAlive(addon.data.dialog?.window)) {
    addon.data.dialog?.window?.focus();
    return;
  }
  const alertWindow = getAlertWindow(args?.window);
  const workflows = getVisibleLoadedWorkflowEntries();
  if (workflows.length === 0) {
    alertWindow?.alert?.(getString("workflow-settings-no-workflows" as any));
    return;
  }
  let workflowId = String(args?.workflowId || "").trim();
  if (!workflowId) {
    workflowId = await pickWorkflowIdForSettings({
      window: args?.window,
      workflows,
    });
    if (!workflowId) {
      return;
    }
  }
  const workflow = workflows.find((entry) => entry.manifest.id === workflowId);
  if (!workflow) {
    alertWindow?.alert?.(
      getString("workflow-settings-error-workflow-not-found" as any, {
        args: { workflowId },
      }),
    );
    return;
  }
  const profiles = await listProviderProfilesForWorkflow(workflow);
  const profileById = new Map(profiles.map((entry) => [entry.id, entry]));
  const profileItems = profiles.map((profile) => ({
    id: profile.id,
    label: `${resolveBackendDisplayName(profile.id, profile.displayName)} (${profile.baseUrl})`,
  }));
  // Domain layer resets pending run-once override so every open starts from persisted snapshot.
  const initialState = getWorkflowSettingsDialogInitialState(workflowId);
  const providerId = String(workflow.manifest.provider || "").trim();
  const isSkillRunnerCompatibleWorkflow =
    String(workflow.manifest.request?.kind || "").trim() ===
    "skillrunner.job.v1";
  const resolveProviderIdForBackend = (
    backend: (typeof profiles)[number] | undefined,
  ) => {
    if (isSkillRunnerCompatibleWorkflow && backend) {
      return String(backend.type || "").trim() || providerId;
    }
    return providerId;
  };
  const renderModel = buildWorkflowSettingsDialogRenderModel({
    providerId,
    profileItems,
    initialState,
    workflowParameters: workflow.manifest.parameters,
  });

  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const doc = addon.data.dialog?.window?.document;
      if (!doc) {
        return;
      }
      const root = doc.getElementById("zs-workflow-settings-root");
      if (!root) {
        return;
      }
      root.innerHTML = "";
      const panel = createHtmlElement(doc, "div");
      panel.style.minWidth = "900px";
      panel.style.padding = "8px";

      const providerInput = createHtmlElement(doc, "input");
      providerInput.id = "zs-workflow-settings-provider";
      providerInput.type = "text";
      providerInput.readOnly = true;
      providerInput.style.width = "360px";
      providerInput.value = providerId;
      appendLabeledControlRow({
        doc,
        root: panel,
        label: getString("workflow-settings-provider-label" as any),
        control: providerInput,
      });

      const explanation = createHtmlElement(doc, "p");
      explanation.textContent = getString(
        "workflow-settings-explanation" as any,
      );
      explanation.style.margin = "6px 0 10px";
      explanation.style.color = "#555";
      explanation.style.maxWidth = "900px";
      panel.appendChild(explanation);

      appendSectionTitle(
        doc,
        panel,
        getString("workflow-settings-persisted-provider-options-title" as any),
      );
      const profileSelect = createChoiceControl({
        doc,
        options: [],
        selectedValue: "",
      });
      profileSelect.setAttribute("id", "zs-workflow-settings-profile");
      applySelectVisualStyle(profileSelect, "420px");
      appendLabeledControlRow({
        doc,
        root: panel,
        label: getString("workflow-settings-profile-label" as any),
        control: profileSelect,
      });

      const persistedProviderFields = createHtmlElement(doc, "div");
      persistedProviderFields.id =
        "zs-workflow-settings-provider-options-fields";
      panel.appendChild(persistedProviderFields);

      appendSectionTitle(
        doc,
        panel,
        getString("workflow-settings-persisted-workflow-params-title" as any),
      );
      const persistedWorkflowFields = createHtmlElement(doc, "div");
      persistedWorkflowFields.id =
        "zs-workflow-settings-workflow-params-fields";
      panel.appendChild(persistedWorkflowFields);

      const divider = createHtmlElement(doc, "hr");
      panel.appendChild(divider);

      appendSectionTitle(
        doc,
        panel,
        getString("workflow-settings-run-once-provider-options-title" as any),
      );
      const onceProfileSelect = createChoiceControl({
        doc,
        options: [],
        selectedValue: renderModel.selectedProfile,
        includeEmptyOption: {
          value: "",
          label: getString("workflow-settings-use-persisted-profile" as any),
        },
      });
      onceProfileSelect.setAttribute("id", "zs-workflow-settings-once-profile");
      applySelectVisualStyle(onceProfileSelect, "420px");
      appendLabeledControlRow({
        doc,
        root: panel,
        label: getString("workflow-settings-profile-label" as any),
        control: onceProfileSelect,
      });

      const onceProviderFields = createHtmlElement(doc, "div");
      onceProviderFields.id =
        "zs-workflow-settings-once-provider-options-fields";
      panel.appendChild(onceProviderFields);

      appendSectionTitle(
        doc,
        panel,
        getString("workflow-settings-run-once-workflow-params-title" as any),
      );
      const onceWorkflowFields = createHtmlElement(doc, "div");
      onceWorkflowFields.id =
        "zs-workflow-settings-once-workflow-params-fields";
      panel.appendChild(onceWorkflowFields);

      root.appendChild(panel);

      if (
        !providerInput ||
        !profileSelect ||
        !onceProfileSelect ||
        !persistedWorkflowFields ||
        !persistedProviderFields ||
        !onceWorkflowFields ||
        !onceProviderFields
      ) {
        return;
      }
      setProfileSelectOptions({
        control: profileSelect,
        profileItems: renderModel.profileItems,
        selectedId: renderModel.selectedProfile,
      });
      setProfileSelectOptions({
        control: onceProfileSelect,
        profileItems: renderModel.profileItems,
        selectedId: renderModel.selectedProfile,
        includePersistedFallback: true,
      });
      renderSchemaFields({
        doc,
        container: persistedWorkflowFields,
        entries: renderModel.workflowSchemaEntries,
        values: renderModel.persistedWorkflowParams,
        idPrefix: "zs-workflow-persisted-workflow-param",
        emptyText: getString("workflow-settings-no-workflow-params" as any),
      });
      renderSchemaFields({
        doc,
        container: onceWorkflowFields,
        entries: renderModel.workflowSchemaEntries,
        values: renderModel.runOnceWorkflowParams,
        idPrefix: "zs-workflow-once-workflow-param",
        emptyText: getString("workflow-settings-no-workflow-params" as any),
      });

      const renderProviderOptionsFields = (args: {
        container: HTMLElement;
        idPrefix: string;
        values: Record<string, unknown>;
        resolveBackend: () => (typeof profiles)[number] | undefined;
      }) => {
        const mergedValues = {
          ...args.values,
          ...collectSchemaValues(args.container),
        };
        const backend = args.resolveBackend();
        const effectiveProviderId = resolveProviderIdForBackend(backend);
        const providerSchemaEntries = resolveProviderSchemaEntries({
          providerId: effectiveProviderId,
          currentValues: mergedValues,
          backend,
        });
        renderSchemaFields({
          doc,
          container: args.container,
          entries: providerSchemaEntries,
          values: mergedValues,
          idPrefix: args.idPrefix,
          emptyText: getString("workflow-settings-no-provider-options" as any),
        });
        const dynamicControls = ["engine", "provider_id", "model", "acpModelId"]
          .map(
            (key) =>
              args.container.querySelector(
                `[data-zs-option-key="${key}"]`,
              ) as Element | null,
          )
          .filter(Boolean) as Element[];
        for (const control of dynamicControls) {
          control.addEventListener("change", () => {
            const currentValues = {
              ...args.values,
              ...collectSchemaValues(args.container),
            };
            renderProviderOptionsFields({
              container: args.container,
              idPrefix: args.idPrefix,
              values: currentValues,
              resolveBackend: args.resolveBackend,
            });
          });
        }
      };
      const resolvePersistedBackend = () => {
        const selectedId = profileSelect ? getControlValue(profileSelect) : "";
        return profileById.get(selectedId);
      };
      const resolveRunOnceBackend = () => {
        const onceSelectedId = onceProfileSelect
          ? getControlValue(onceProfileSelect)
          : "";
        const fallbackId = profileSelect
          ? getControlValue(profileSelect)
          : renderModel.selectedProfile;
        return profileById.get(onceSelectedId || fallbackId);
      };
      renderProviderOptionsFields({
        container: persistedProviderFields,
        idPrefix: "zs-workflow-persisted-provider-option",
        values: renderModel.persistedProviderOptions,
        resolveBackend: resolvePersistedBackend,
      });
      renderProviderOptionsFields({
        container: onceProviderFields,
        idPrefix: "zs-workflow-once-provider-option",
        values: renderModel.runOnceProviderOptions,
        resolveBackend: resolveRunOnceBackend,
      });
      profileSelect.addEventListener("change", () => {
        renderProviderOptionsFields({
          container: persistedProviderFields,
          idPrefix: "zs-workflow-persisted-provider-option",
          values: {
            ...renderModel.persistedProviderOptions,
            ...collectSchemaValues(persistedProviderFields),
          },
          resolveBackend: resolvePersistedBackend,
        });
        renderProviderOptionsFields({
          container: onceProviderFields,
          idPrefix: "zs-workflow-once-provider-option",
          values: {
            ...renderModel.runOnceProviderOptions,
            ...collectSchemaValues(onceProviderFields),
          },
          resolveBackend: resolveRunOnceBackend,
        });
      });
      onceProfileSelect.addEventListener("change", () => {
        renderProviderOptionsFields({
          container: onceProviderFields,
          idPrefix: "zs-workflow-once-provider-option",
          values: {
            ...renderModel.runOnceProviderOptions,
            ...collectSchemaValues(onceProviderFields),
          },
          resolveBackend: resolveRunOnceBackend,
        });
      });
    },
    unloadCallback: () => {},
  };

  const dialogHelper = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-workflow-settings-root",
      styles: { padding: "6px" },
    })
    .addButton(getString("workflow-settings-save-persistent" as any), "save")
    .addButton(getString("workflow-settings-apply-run-once" as any), "run_once")
    .addButton(getString("workflow-settings-cancel" as any), "cancel")
    .setDialogData(dialogData)
    .open(
      `${getString("workflow-settings-title" as any)}: ${workflow.manifest.label}`,
    );

  addon.data.dialog = dialogHelper;
  await (dialogData as { unloadLock?: { promise?: Promise<void> } }).unloadLock
    ?.promise;
  addon.data.dialog = undefined;

  const clicked = (dialogData as { _lastButtonId?: string })._lastButtonId;
  if (clicked !== "save" && clicked !== "run_once") {
    return;
  }

  try {
    const doc = dialogHelper.window?.document;
    if (!doc) {
      throw new Error(
        getString("workflow-settings-error-window-unavailable" as any),
      );
    }
    const persistedProfileControl = doc.getElementById(
      "zs-workflow-settings-profile",
    ) as Element | null;
    const onceProfileControl = doc.getElementById(
      "zs-workflow-settings-once-profile",
    ) as Element | null;
    const persistedProfile = persistedProfileControl
      ? getControlValue(persistedProfileControl)
      : "";
    const onceProfile = onceProfileControl
      ? getControlValue(onceProfileControl)
      : "";

    const persistedWorkflowFields = doc.getElementById(
      "zs-workflow-settings-workflow-params-fields",
    ) as HTMLElement | null;
    const persistedProviderFields = doc.getElementById(
      "zs-workflow-settings-provider-options-fields",
    ) as HTMLElement | null;
    const onceWorkflowFields = doc.getElementById(
      "zs-workflow-settings-once-workflow-params-fields",
    ) as HTMLElement | null;
    const onceProviderFields = doc.getElementById(
      "zs-workflow-settings-once-provider-options-fields",
    ) as HTMLElement | null;
    if (
      !persistedWorkflowFields ||
      !persistedProviderFields ||
      !onceWorkflowFields ||
      !onceProviderFields
    ) {
      throw new Error(
        getString("workflow-settings-error-controls-unavailable" as any),
      );
    }

    const draft = buildWorkflowSettingsDialogDraft({
      persistedProfile,
      onceProfile,
      persistedWorkflowFields,
      persistedProviderFields,
      onceWorkflowFields,
      onceProviderFields,
    });

    if (clicked === "save") {
      savePersistentWorkflowSettingsDraft({
        workflowId,
        draft: draft.persistent,
      });
      refreshWorkflowMenus();
      alertWindow?.alert?.(getString("workflow-settings-saved" as any));
      return;
    }

    applyRunOnceWorkflowSettingsDraft({
      workflowId,
      draft: draft.runOnce,
    });
    refreshWorkflowMenus();
    alertWindow?.alert?.(getString("workflow-settings-run-once-saved" as any));
  } catch (error) {
    alertWindow?.alert?.(
      getString("workflow-settings-save-failed" as any, {
        args: { error: String(error) },
      }),
    );
  }
}

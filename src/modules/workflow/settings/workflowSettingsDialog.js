import { isWindowAlive } from "../../../utils/window";
import { refreshWorkflowMenus } from "../ui/workflowMenu";
import { applyRunOnceWorkflowSettingsDraft, getWorkflowSettingsDialogInitialState, listProviderProfilesForWorkflow, rebaseWorkflowProviderOptionsForBackendChange, savePersistentWorkflowSettingsDraft, } from "./workflowSettings";
import { getString } from "../../../utils/locale";
import { localizeWorkflowLabel, localizeWorkflowParameters, } from "../../../workflows/localization";
import { buildWorkflowSettingsDialogDraft, buildWorkflowSettingsDialogRenderModel, collectSchemaValues, resolveProviderSchemaEntries, } from "./workflowSettingsDialogModel";
import { normalizeAcpProviderModelOptionsForRuntime, projectAcpProviderModelOptionsForUi, } from "../../acp/chat/acpModelOptionFolding";
import { resolveBackendDisplayName } from "../../../backends/displayName";
import { getVisibleLoadedWorkflowEntries } from "../catalog/workflowVisibility";
const HTML_NS = "http://www.w3.org/1999/xhtml";
function createHtmlElement(doc, tag) {
    return doc.createElementNS(HTML_NS, tag);
}
function applySelectVisualStyle(control, width) {
    if (width) {
        control.style.width = width;
    }
    control.style.boxSizing = "border-box";
    control.style.position = "relative";
    control.style.display = "inline-block";
}
function getChoiceTrigger(control) {
    return control.querySelector("[data-zs-choice-trigger='1']");
}
function getChoiceList(control) {
    return control.querySelector("[data-zs-choice-list='1']");
}
function closeChoiceList(control) {
    const list = getChoiceList(control);
    if (list) {
        list.hidden = true;
        list.style.display = "none";
    }
}
function closeAllChoiceLists(doc) {
    const lists = Array.from(doc.querySelectorAll("[data-zs-choice-list='1']"));
    for (const list of lists) {
        list.hidden = true;
        list.style.display = "none";
    }
}
function dispatchChoiceChange(control) {
    const doc = control.ownerDocument;
    if (!doc) {
        return;
    }
    const ev = doc.createEvent("Event");
    ev.initEvent("change", true, true);
    control.dispatchEvent(ev);
}
function setChoiceSelection(args) {
    const { control, value, label, dispatchChange } = args;
    control.setAttribute("data-zs-choice-value", value);
    control.value = value;
    const triggerLabel = control.querySelector("[data-zs-choice-trigger-label='1']");
    if (triggerLabel) {
        triggerLabel.textContent = label || getString("choice-empty");
    }
    if (dispatchChange) {
        dispatchChoiceChange(control);
    }
}
function getElementValue(control) {
    if (control.getAttribute("data-zs-choice-control") === "1") {
        return String(control.getAttribute("data-zs-choice-value") || "").trim();
    }
    return String(control.value || "").trim();
}
function createChoiceControl(args) {
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
        const target = event.target;
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
function setChoiceControlOptions(args) {
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
        const option = createHtmlElement(control.ownerDocument, "button");
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
        const pick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            setChoiceSelection({
                control,
                value: entry.value,
                label: entry.label,
                dispatchChange: true,
            });
            closeAllChoiceLists(control.ownerDocument);
        };
        option.addEventListener("mousedown", pick);
        option.addEventListener("click", pick);
        option.addEventListener("command", pick);
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
function getControlValue(control) {
    return getElementValue(control);
}
function coerceBoolean(value, fallback = false) {
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
function isSchemaEntryVisible(entry, values) {
    const condition = entry.visibleIf;
    if (!condition?.parameter) {
        return true;
    }
    return coerceBoolean(values[condition.parameter], false) === condition.equals;
}
function coerceNumberText(value, fallback) {
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
function coerceString(value, fallback) {
    if (typeof value === "string") {
        return value;
    }
    if (typeof fallback === "string") {
        return fallback;
    }
    return "";
}
function coerceStringArrayText(value, fallback) {
    const raw = Array.isArray(value) ? value : fallback;
    return Array.isArray(raw)
        ? raw
            .filter((entry) => typeof entry === "string")
            .join(", ")
        : "";
}
function isWarningProviderOptionKey(key) {
    return key === "autoApproveAcpPermissions";
}
function renderSchemaFields(args) {
    const { doc, container, entries, values, idPrefix, emptyText } = args;
    container.innerHTML = "";
    const visibleEntries = entries.filter((entry) => isSchemaEntryVisible(entry, values));
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
        label.textContent = entry.required === true ? `${labelText} *` : labelText;
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
            if (entry.required === true) {
                checkbox.setAttribute("aria-required", "true");
            }
            checkbox.setAttribute("data-zs-option-key", entry.key);
            checkbox.setAttribute("data-zs-option-type", entry.type);
            checkboxWrap.appendChild(checkbox);
            const checkboxText = createHtmlElement(doc, "span");
            checkboxText.textContent = getString("workflow-settings-enabled");
            checkboxWrap.appendChild(checkboxText);
            row.appendChild(checkboxWrap);
        }
        else if (entry.type === "string" &&
            ((Array.isArray(entry.options) && entry.options.length > 0) ||
                (Array.isArray(entry.enumValues) && entry.enumValues.length > 0))) {
            const options = Array.isArray(entry.options) && entry.options.length > 0
                ? entry.options.map((candidate) => ({
                    value: String(candidate.value || ""),
                    label: String(candidate.label || candidate.value || ""),
                }))
                : (entry.enumValues || []).map((candidate) => ({
                    value: candidate,
                    label: candidate,
                }));
            const selectedValue = coerceString(rawValue, defaultValue);
            const needsEmptyOption = !options.some((candidate) => candidate.value === "") &&
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
                            label: getString("workflow-settings-default-option"),
                        }
                        : undefined,
                });
                recommendationControl.setAttribute("id", `${controlId}-recommendation`);
                applySelectVisualStyle(recommendationControl, "180px");
                combo.appendChild(recommendationControl);
                const customInput = createHtmlElement(doc, "input");
                customInput.id = controlId;
                customInput.type = "text";
                customInput.style.width = "320px";
                customInput.placeholder = String(entry.placeholder || "");
                customInput.value = selectedValue;
                customInput.disabled = entry.disabled === true;
                customInput.required = entry.required === true;
                customInput.setAttribute("data-zs-option-key", entry.key);
                customInput.setAttribute("data-zs-option-type", entry.type);
                recommendationControl.addEventListener("change", () => {
                    customInput.value = getElementValue(recommendationControl);
                });
                combo.appendChild(customInput);
                row.appendChild(combo);
            }
            else {
                const control = createChoiceControl({
                    doc,
                    options,
                    selectedValue,
                    includeEmptyOption: needsEmptyOption
                        ? {
                            value: "",
                            label: getString("workflow-settings-default-option"),
                        }
                        : undefined,
                });
                control.setAttribute("id", controlId);
                control.setAttribute("data-zs-option-key", entry.key);
                control.setAttribute("data-zs-option-type", entry.type);
                if (entry.required === true) {
                    control.setAttribute("aria-required", "true");
                }
                if (entry.disabled === true) {
                    const disabledControl = control;
                    disabledControl.setAttribute("aria-disabled", "true");
                    disabledControl.style.opacity = "0.7";
                    disabledControl.style.pointerEvents = "none";
                }
                applySelectVisualStyle(control, "320px");
                row.appendChild(control);
            }
        }
        else {
            const input = createHtmlElement(doc, "input");
            input.id = controlId;
            input.style.width = "320px";
            input.placeholder = String(entry.placeholder || "");
            input.setAttribute("data-zs-option-key", entry.key);
            input.setAttribute("data-zs-option-type", entry.type);
            if (entry.type === "number") {
                input.type = "number";
                input.step = "any";
                input.value = coerceNumberText(rawValue, defaultValue);
            }
            else if (entry.type === "array") {
                input.type = "text";
                input.value = coerceStringArrayText(rawValue, defaultValue);
            }
            else {
                input.type = "text";
                input.value = coerceString(rawValue, defaultValue);
            }
            input.disabled = entry.disabled === true;
            input.required = entry.required === true;
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
function getAlertWindow(window) {
    if (window && typeof window.alert === "function") {
        return window;
    }
    return ztoolkit.getGlobal("window");
}
function clearChildren(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
function setProfileSelectOptions(args) {
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
                label: getString("workflow-settings-use-persisted-profile"),
            }
            : undefined,
    });
}
function appendSectionTitle(doc, root, text) {
    const title = createHtmlElement(doc, "h4");
    title.textContent = text;
    title.style.margin = "10px 0 6px";
    root.appendChild(title);
}
function appendLabeledControlRow(args) {
    const row = createHtmlElement(args.doc, "div");
    row.style.marginBottom = "8px";
    const label = createHtmlElement(args.doc, "label");
    label.textContent = args.label;
    label.style.display = "inline-block";
    label.style.minWidth = "120px";
    row.appendChild(label);
    row.appendChild(args.control);
    args.root.appendChild(row);
    return row;
}
async function pickWorkflowIdForSettings(args) {
    const workflows = args.workflows;
    if (workflows.length === 0) {
        return "";
    }
    if (workflows.length === 1) {
        return workflows[0].manifest.id;
    }
    const dialogData = {
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
                    label: localizeWorkflowLabel(workflow),
                })),
                selectedValue: workflows[0].manifest.id,
            });
            workflowSelect.setAttribute("id", "zs-workflow-settings-picker-workflow");
            applySelectVisualStyle(workflowSelect, "360px");
            appendLabeledControlRow({
                doc,
                root: panel,
                label: getString("workflow-settings-workflow-label"),
                control: workflowSelect,
            });
            workflowSelect.addEventListener("change", () => {
                dialogData.selectedWorkflowId = getControlValue(workflowSelect);
            });
            root.appendChild(panel);
        },
        unloadCallback: () => { },
    };
    const pickerDialog = new ztoolkit.Dialog(1, 1)
        .addCell(0, 0, {
        tag: "div",
        namespace: "html",
        id: "zs-workflow-settings-picker-root",
        styles: { padding: "6px" },
    })
        .addButton(getString("workflow-settings-open"), "open")
        .addButton(getString("workflow-settings-cancel"), "cancel")
        .setDialogData(dialogData)
        .open(getString("workflow-settings-picker-title"));
    addon.data.dialog = pickerDialog;
    await dialogData.unloadLock
        ?.promise;
    addon.data.dialog = undefined;
    if (dialogData._lastButtonId !== "open") {
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
export async function openWorkflowSettingsDialog(args) {
    if (isWindowAlive(addon.data.dialog?.window)) {
        addon.data.dialog?.window?.focus();
        return;
    }
    const alertWindow = getAlertWindow(args?.window);
    const workflows = getVisibleLoadedWorkflowEntries();
    if (workflows.length === 0) {
        alertWindow?.alert?.(getString("workflow-settings-no-workflows"));
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
        alertWindow?.alert?.(getString("workflow-settings-error-workflow-not-found", {
            args: { workflowId },
        }));
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
    const isSkillRunnerCompatibleWorkflow = String(workflow.manifest.request?.kind || "").trim() ===
        "skillrunner.job.v1";
    const resolveProviderIdForBackend = (backend) => {
        if (isSkillRunnerCompatibleWorkflow && backend) {
            return String(backend.type || "").trim() || providerId;
        }
        return providerId;
    };
    const renderModel = buildWorkflowSettingsDialogRenderModel({
        providerId,
        profileItems,
        initialState,
        workflowParameters: localizeWorkflowParameters(workflow),
    });
    const workflowLabel = localizeWorkflowLabel(workflow);
    const dialogData = {
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
                label: getString("workflow-settings-provider-label"),
                control: providerInput,
            });
            const explanation = createHtmlElement(doc, "p");
            explanation.textContent = getString("workflow-settings-explanation");
            explanation.style.margin = "6px 0 10px";
            explanation.style.color = "#555";
            explanation.style.maxWidth = "900px";
            panel.appendChild(explanation);
            appendSectionTitle(doc, panel, getString("workflow-settings-persisted-provider-options-title"));
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
                label: getString("workflow-settings-profile-label"),
                control: profileSelect,
            });
            const persistedProviderFields = createHtmlElement(doc, "div");
            persistedProviderFields.id =
                "zs-workflow-settings-provider-options-fields";
            panel.appendChild(persistedProviderFields);
            appendSectionTitle(doc, panel, getString("workflow-settings-persisted-workflow-params-title"));
            const persistedWorkflowFields = createHtmlElement(doc, "div");
            persistedWorkflowFields.id =
                "zs-workflow-settings-workflow-params-fields";
            panel.appendChild(persistedWorkflowFields);
            const divider = createHtmlElement(doc, "hr");
            panel.appendChild(divider);
            appendSectionTitle(doc, panel, getString("workflow-settings-run-once-provider-options-title"));
            const onceProfileSelect = createChoiceControl({
                doc,
                options: [],
                selectedValue: renderModel.selectedProfile,
                includeEmptyOption: {
                    value: "",
                    label: getString("workflow-settings-use-persisted-profile"),
                },
            });
            onceProfileSelect.setAttribute("id", "zs-workflow-settings-once-profile");
            applySelectVisualStyle(onceProfileSelect, "420px");
            appendLabeledControlRow({
                doc,
                root: panel,
                label: getString("workflow-settings-profile-label"),
                control: onceProfileSelect,
            });
            const onceProviderFields = createHtmlElement(doc, "div");
            onceProviderFields.id =
                "zs-workflow-settings-once-provider-options-fields";
            panel.appendChild(onceProviderFields);
            appendSectionTitle(doc, panel, getString("workflow-settings-run-once-workflow-params-title"));
            const onceWorkflowFields = createHtmlElement(doc, "div");
            onceWorkflowFields.id =
                "zs-workflow-settings-once-workflow-params-fields";
            panel.appendChild(onceWorkflowFields);
            root.appendChild(panel);
            if (!providerInput ||
                !profileSelect ||
                !onceProfileSelect ||
                !persistedWorkflowFields ||
                !persistedProviderFields ||
                !onceWorkflowFields ||
                !onceProviderFields) {
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
                emptyText: getString("workflow-settings-no-workflow-params"),
            });
            renderSchemaFields({
                doc,
                container: onceWorkflowFields,
                entries: renderModel.workflowSchemaEntries,
                values: renderModel.runOnceWorkflowParams,
                idPrefix: "zs-workflow-once-workflow-param",
                emptyText: getString("workflow-settings-no-workflow-params"),
            });
            const renderProviderOptionsFields = (args) => {
                const rawMergedValues = {
                    ...args.values,
                    ...collectSchemaValues(args.container),
                };
                const backend = args.resolveBackend();
                const mergedValues = String(backend?.type || "").trim() === "acp"
                    ? projectAcpProviderModelOptionsForUi({
                        modelOptions: backend?.acp?.runtimeOptionsCache?.displayModels || [],
                        options: rawMergedValues,
                        currentDisplayModelId: backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
                    })
                    : rawMergedValues;
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
                    emptyText: getString("workflow-settings-no-provider-options"),
                });
                const dynamicControls = [
                    "engine",
                    "provider_id",
                    "model",
                    "acpModelProvider",
                    "acpModelId",
                ]
                    .map((key) => args.container.querySelector(`[data-zs-option-key="${key}"]`))
                    .filter(Boolean);
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
            let lastPersistedBackendId = String(resolvePersistedBackend()?.id || "").trim();
            let lastRunOnceBackendId = String(resolveRunOnceBackend()?.id || "").trim();
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
                const nextPersistedBackendId = String(resolvePersistedBackend()?.id || "").trim();
                const persistedValues = rebaseWorkflowProviderOptionsForBackendChange({
                    workflow,
                    previousBackendId: lastPersistedBackendId,
                    nextBackendId: nextPersistedBackendId,
                    options: {
                        ...renderModel.persistedProviderOptions,
                        ...collectSchemaValues(persistedProviderFields),
                    },
                    candidateBackends: profiles,
                });
                lastPersistedBackendId = nextPersistedBackendId;
                renderProviderOptionsFields({
                    container: persistedProviderFields,
                    idPrefix: "zs-workflow-persisted-provider-option",
                    values: persistedValues,
                    resolveBackend: resolvePersistedBackend,
                });
                const nextRunOnceBackendId = String(resolveRunOnceBackend()?.id || "").trim();
                const runOnceValues = rebaseWorkflowProviderOptionsForBackendChange({
                    workflow,
                    previousBackendId: lastRunOnceBackendId,
                    nextBackendId: nextRunOnceBackendId,
                    options: {
                        ...renderModel.runOnceProviderOptions,
                        ...collectSchemaValues(onceProviderFields),
                    },
                    candidateBackends: profiles,
                });
                lastRunOnceBackendId = nextRunOnceBackendId;
                renderProviderOptionsFields({
                    container: onceProviderFields,
                    idPrefix: "zs-workflow-once-provider-option",
                    values: runOnceValues,
                    resolveBackend: resolveRunOnceBackend,
                });
            });
            onceProfileSelect.addEventListener("change", () => {
                const nextRunOnceBackendId = String(resolveRunOnceBackend()?.id || "").trim();
                const runOnceValues = rebaseWorkflowProviderOptionsForBackendChange({
                    workflow,
                    previousBackendId: lastRunOnceBackendId,
                    nextBackendId: nextRunOnceBackendId,
                    options: {
                        ...renderModel.runOnceProviderOptions,
                        ...collectSchemaValues(onceProviderFields),
                    },
                    candidateBackends: profiles,
                });
                lastRunOnceBackendId = nextRunOnceBackendId;
                renderProviderOptionsFields({
                    container: onceProviderFields,
                    idPrefix: "zs-workflow-once-provider-option",
                    values: runOnceValues,
                    resolveBackend: resolveRunOnceBackend,
                });
            });
        },
        unloadCallback: () => { },
    };
    const dialogHelper = new ztoolkit.Dialog(1, 1)
        .addCell(0, 0, {
        tag: "div",
        namespace: "html",
        id: "zs-workflow-settings-root",
        styles: { padding: "6px" },
    })
        .addButton(getString("workflow-settings-save-persistent"), "save")
        .addButton(getString("workflow-settings-apply-run-once"), "run_once")
        .addButton(getString("workflow-settings-cancel"), "cancel")
        .setDialogData(dialogData)
        .open(`${getString("workflow-settings-title")}: ${workflowLabel}`);
    addon.data.dialog = dialogHelper;
    await dialogData.unloadLock
        ?.promise;
    addon.data.dialog = undefined;
    const clicked = dialogData._lastButtonId;
    if (clicked !== "save" && clicked !== "run_once") {
        return;
    }
    try {
        const doc = dialogHelper.window?.document;
        if (!doc) {
            throw new Error(getString("workflow-settings-error-window-unavailable"));
        }
        const persistedProfileControl = doc.getElementById("zs-workflow-settings-profile");
        const onceProfileControl = doc.getElementById("zs-workflow-settings-once-profile");
        const persistedProfile = persistedProfileControl
            ? getControlValue(persistedProfileControl)
            : "";
        const onceProfile = onceProfileControl
            ? getControlValue(onceProfileControl)
            : "";
        const persistedWorkflowFields = doc.getElementById("zs-workflow-settings-workflow-params-fields");
        const persistedProviderFields = doc.getElementById("zs-workflow-settings-provider-options-fields");
        const onceWorkflowFields = doc.getElementById("zs-workflow-settings-once-workflow-params-fields");
        const onceProviderFields = doc.getElementById("zs-workflow-settings-once-provider-options-fields");
        if (!persistedWorkflowFields ||
            !persistedProviderFields ||
            !onceWorkflowFields ||
            !onceProviderFields) {
            throw new Error(getString("workflow-settings-error-controls-unavailable"));
        }
        const draft = buildWorkflowSettingsDialogDraft({
            persistedProfile,
            onceProfile,
            persistedWorkflowFields,
            persistedProviderFields,
            onceWorkflowFields,
            onceProviderFields,
        });
        const normalizeAcpDraftProviderOptions = (providerOptions, profileId) => {
            const backend = profileId ? profileById.get(profileId) : undefined;
            if (String(backend?.type || "").trim() !== "acp") {
                return providerOptions || {};
            }
            return normalizeAcpProviderModelOptionsForRuntime({
                modelOptions: backend?.acp?.runtimeOptionsCache?.displayModels || [],
                options: providerOptions || {},
                currentDisplayModelId: backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
            });
        };
        draft.persistent.providerOptions = normalizeAcpDraftProviderOptions(draft.persistent.providerOptions, draft.persistent.backendId);
        draft.runOnce.providerOptions = normalizeAcpDraftProviderOptions(draft.runOnce.providerOptions, draft.runOnce.backendId || draft.persistent.backendId);
        if (clicked === "save") {
            savePersistentWorkflowSettingsDraft({
                workflowId,
                draft: draft.persistent,
            });
            refreshWorkflowMenus();
            alertWindow?.alert?.(getString("workflow-settings-saved"));
            return;
        }
        applyRunOnceWorkflowSettingsDraft({
            workflowId,
            draft: draft.runOnce,
        });
        refreshWorkflowMenus();
        alertWindow?.alert?.(getString("workflow-settings-run-once-saved"));
    }
    catch (error) {
        alertWindow?.alert?.(getString("workflow-settings-save-failed", {
            args: { error: String(error) },
        }));
    }
}

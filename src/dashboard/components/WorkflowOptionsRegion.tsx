/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import {
  equalBySignature,
  stableRegionSignature,
} from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
} from "../../shared/dashboardWireContract";

// Workflow options surface of the dashboard page: the inline workflow
// settings form engine. Ported from the legacy implementation
// (addon/content/dashboard/app.js renderWorkflowOptions /
// renderWorkflowSettingsSection / renderWorkflowField). Action names and
// payload shapes are frozen protocol:
//   select-workflow-settings-workflow  { workflowId }
//   workflow-settings-draft            { workflowId,
//                                        executionOptions: { backendId, workflowParams, providerOptions, hostOptions },
//                                        changedSection, changedKey, changedOrigin }
//
// The form draft is component-local state (useRef) rebuilt from the
// descriptor whenever the descriptor's draft-bearing content changes; field
// edits mutate the draft in place and emit workflow-settings-draft actions.
// Debounced persistence lives on the host (420 ms save timer in
// taskManagerDialog), which echoes applied drafts back through the
// descriptor — an echo with changed draft content resets local state and
// remounts the settings shell, matching the legacy full-form rebuild.
//
// All user-visible copy arrives pre-resolved in selection.texts. The panel
// model resolves them from host labels via labelText with these keys:
//   pageTitle                    tabWorkflowOptions
//   noConfigurableText           workflowSettingsNoConfigurable
//   workflowLabelText            workflowSettingsWorkflowLabel
//   providerLabelText            workflowSettingsProviderLabel
//   profileLabelText             workflowSettingsProfileLabel
//   blockedNoProfileText         workflowSettingsBlockedNoProfile
//   workflowParamsTitleText      workflowSettingsWorkflowParamsTitle
//   noWorkflowParamsText         workflowSettingsNoWorkflowParams
//   providerOptionsTitleText     workflowSettingsProviderOptionsTitle
//   noProviderOptionsText        workflowSettingsNoProviderOptions
//   parameterRequiredText        workflowSettingsParameterRequired (fallback "This field is required.")
//   numberInvalidText            workflowSettingsNumberInvalid
//   positiveIntegerRequiredText  workflowSettingsPositiveIntegerRequired
//   noSelectableOptionsText      workflowSettingsNoSelectableOptions (fallback "No selectable options are available.")
//
// The selection deliberately excludes view.saveState / view.saveError: the
// legacy surface never renders the save indicator, so those high-frequency
// fields must not enter this region's render key.

export type WorkflowSettingsFieldOption = {
  value: string;
  label: string;
  description?: string;
};

// Narrowed page-side projection of the wire's unknown
// workflowSettingsDescriptor host slot. Every field is optional because the
// page treats the host payload as untrusted, mirroring the legacy guards.
export type WorkflowSettingsSchemaEntry = {
  key: string;
  type?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  enumValues?: unknown[];
  options?: Array<{
    value?: unknown;
    label?: unknown;
    description?: unknown;
  } | null>;
  allowCustom?: boolean;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
  visibleIfProviderOption?: {
    key?: string;
    equals?: boolean;
  };
  diagnostics?: Array<{
    code?: string;
    message?: string;
  } | null>;
  min?: number;
  max?: number;
  integer?: boolean;
};

export type WorkflowSettingsProfileOption = {
  id?: string;
  label?: string;
};

export type WorkflowSettingsDescriptorView = {
  workflowId?: string;
  workflowLabel?: string;
  providerId?: string;
  requiresBackendProfile?: boolean;
  profiles?: WorkflowSettingsProfileOption[];
  profileEditable?: boolean;
  profileMissing?: boolean;
  selectedProfile?: string;
  workflowParams?: Record<string, unknown>;
  providerOptions?: Record<string, unknown>;
  hostOptions?: Record<string, unknown>;
  workflowSchemaEntries?: WorkflowSettingsSchemaEntry[];
  providerSchemaEntries?: WorkflowSettingsSchemaEntry[];
};

// Texts consumed by a single field row; the reusable surface for the A3
// workflow-settings-dialog, which renders the same fields outside the
// dashboard tab.
export type WorkflowFieldTexts = {
  parameterRequiredText: string;
  numberInvalidText: string;
  positiveIntegerRequiredText: string;
  noSelectableOptionsText: string;
};

export type DashboardWorkflowOptionsTexts = WorkflowFieldTexts & {
  pageTitle: string;
  noConfigurableText: string;
  workflowLabelText: string;
  providerLabelText: string;
  profileLabelText: string;
  blockedNoProfileText: string;
  workflowParamsTitleText: string;
  noWorkflowParamsText: string;
  providerOptionsTitleText: string;
  noProviderOptionsText: string;
};

export type DashboardWorkflowOptionsWorkflowTab = {
  workflowId: string;
  label: string;
  active: boolean;
};

export type DashboardWorkflowOptionsSelection = {
  texts: DashboardWorkflowOptionsTexts;
  workflows: DashboardWorkflowOptionsWorkflowTab[];
  selectedWorkflowId: string;
  descriptor: WorkflowSettingsDescriptorView | null;
};

export type WorkflowSettingsDraft = {
  backendId: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  hostOptions: Record<string, unknown>;
};

export type WorkflowFieldChangeMeta = {
  changedKey: string;
  changedOrigin?: string;
};

export type WorkflowSettingsDraftChangeMeta = {
  changedSection?: string;
  changedKey?: string;
  changedOrigin?: string;
};

export type DashboardWorkflowOptionsAction = Extract<
  DashboardHostActionName,
  "select-workflow-settings-workflow" | "workflow-settings-draft"
>;

// The selection is already the minimal user-visible content of this region,
// so the equality input is the selection itself (memo compares it with
// equalBySignature). The panel model must keep saveState/saveError and any
// other high-frequency snapshot fields out of the projection.
export function dashboardWorkflowOptionsEqualityInput(
  selection: DashboardWorkflowOptionsSelection | null,
): DashboardWorkflowOptionsSelection | null {
  return selection;
}

// ---------------------------------------------------------------------------
// Vendor globals (loaded by the page HTML; same contracts the legacy surface
// consumes)
// ---------------------------------------------------------------------------

type WorkflowNumberFieldValidationContract = {
  valid: boolean;
  remove?: boolean;
  value?: number;
  message?: string;
};

type WorkflowNumberFieldsVendor = {
  formatLabel(entry: WorkflowSettingsSchemaEntry & { title: string }): string;
  validate(args: {
    entry: WorkflowSettingsSchemaEntry;
    rawValue: string;
  }): WorkflowNumberFieldValidationContract;
};

type DashboardCustomSelectHandle = {
  element: HTMLElement;
  getValue(): string;
  setValue(value: string): void;
};

type DashboardCustomSelectFactory = (
  options: WorkflowSettingsFieldOption[],
  currentValue: string,
  onChange: (value: string) => void,
) => DashboardCustomSelectHandle;

type DashboardVendorGlobals = {
  zoteroAgentsWorkflowNumberFields?: WorkflowNumberFieldsVendor;
  createCustomSelect?: DashboardCustomSelectFactory;
};

function dashboardVendorGlobals(): DashboardVendorGlobals {
  if (typeof window === "undefined") {
    return {};
  }
  return window as unknown as DashboardVendorGlobals;
}

// ---------------------------------------------------------------------------
// Pure helpers (ported 1:1 from the legacy closures)
// ---------------------------------------------------------------------------

export function cloneWorkflowSettingsRecord(
  raw: unknown,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
}

export function coerceWorkflowBoolean(
  value: unknown,
  fallback?: boolean,
): boolean {
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

// Commit-time normalization by schema type: array fields store a deduped
// string array split on newlines/commas (the dialog semantics; the dashboard
// inline form shares it so both surfaces produce identical wire values).
export function normalizeWorkflowTypeValue(
  type: string | undefined,
  value: unknown,
): unknown {
  if (type === "boolean") {
    return value === true;
  }
  if (type === "array") {
    const seen = new Set<string>();
    const result: string[] = [];
    const raw = String(value == null ? "" : value);
    for (const piece of raw.split(/[\n,]/)) {
      const entry = piece.trim();
      if (!entry || seen.has(entry)) {
        continue;
      }
      seen.add(entry);
      result.push(entry);
    }
    return result;
  }
  return String(value == null ? "" : value);
}

// Provider-conditional visibility evaluates against the given value bag. The
// dashboard inline form passes the owning section's values; the settings
// dialog always passes draft.providerOptions (cross-section), matching each
// legacy surface.
export function isProviderConditionalWorkflowFieldVisible(
  entry: WorkflowSettingsSchemaEntry,
  values: Record<string, unknown>,
): boolean {
  const condition = entry && entry.visibleIfProviderOption;
  const key = String((condition && condition.key) || "").trim();
  if (!key) {
    return true;
  }
  const providerValues =
    values && typeof values === "object" && !Array.isArray(values)
      ? values
      : {};
  const expected = condition ? condition.equals === true : false;
  return coerceWorkflowBoolean(providerValues[key], false) === expected;
}

export function isPositiveIntegerWorkflowField(
  entry: WorkflowSettingsSchemaEntry,
): boolean {
  const key = String((entry && entry.key) || "")
    .trim()
    .toLowerCase();
  if (!key) {
    return false;
  }
  return key.includes("timeout");
}

export function isNonNegativeIntegerWorkflowField(
  entry: WorkflowSettingsSchemaEntry,
): boolean {
  const key = String((entry && entry.key) || "")
    .trim()
    .toLowerCase();
  return key === "interactive_reply_timeout_sec";
}

export function isWarningProviderOptionKey(key: string): boolean {
  return key === "autoApproveAcpPermissions";
}

export function resolveWorkflowFieldOptions(
  entry: WorkflowSettingsSchemaEntry,
): WorkflowSettingsFieldOption[] {
  const structured = Array.isArray(entry.options)
    ? entry.options
        .filter((option) => option && typeof option === "object")
        .map((option) => ({
          value: String(option!.value == null ? "" : option!.value),
          label: String(option!.label || option!.value || ""),
          description: String(option!.description || ""),
        }))
    : [];
  if (structured.length > 0) {
    return structured;
  }
  const enumValues = Array.isArray(entry.enumValues) ? entry.enumValues : [];
  return enumValues.map((value) => ({
    value: String(value),
    label: String(value),
  }));
}

export function formatWorkflowFieldLabel(
  entry: WorkflowSettingsSchemaEntry,
): string {
  const titled = { ...entry, title: entry.title || entry.key };
  const vendor = dashboardVendorGlobals().zoteroAgentsWorkflowNumberFields;
  if (vendor) {
    return vendor.formatLabel(titled);
  }
  // Degraded path for a missing vendor script: reproduce the vendor's
  // min–max suffix semantics so the label stays stable.
  const title = String(titled.title || "");
  const min =
    typeof entry.min === "number" && Number.isFinite(entry.min)
      ? entry.min
      : null;
  const max =
    typeof entry.max === "number" && Number.isFinite(entry.max)
      ? entry.max
      : null;
  return min !== null && max !== null ? `${title} (${min}–${max})` : title;
}

export type WorkflowNumberFieldValidation =
  | { ok: true; remove: true }
  | { ok: true; value: number }
  | { ok: false; message: string };

export function validateWorkflowNumberFieldValue(args: {
  entry: WorkflowSettingsSchemaEntry;
  rawValue: unknown;
  texts: WorkflowFieldTexts;
}): WorkflowNumberFieldValidation {
  const raw = String(args.rawValue == null ? "" : args.rawValue).trim();
  const vendor = dashboardVendorGlobals().zoteroAgentsWorkflowNumberFields;
  // Degraded path for a missing vendor script: only the raw-parse semantics
  // are reproduced (bounds/integer hints come from the vendor contract).
  const contract = vendor
    ? vendor.validate({ entry: args.entry, rawValue: raw })
    : raw
      ? Number.isFinite(Number(raw))
        ? { valid: true, value: Number(raw) }
        : { valid: false, message: "" }
      : { valid: true, remove: true };
  if (!contract.valid) {
    return {
      ok: false,
      message: String(contract.message || "") || args.texts.numberInvalidText,
    };
  }
  if (contract.remove === true) {
    return { ok: true, remove: true };
  }
  const parsed = Number(contract.value);
  if (isNonNegativeIntegerWorkflowField(args.entry)) {
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, message: args.texts.positiveIntegerRequiredText };
    }
  } else if (isPositiveIntegerWorkflowField(args.entry)) {
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, message: args.texts.positiveIntegerRequiredText };
    }
  }
  return { ok: true, value: parsed };
}

export function createWorkflowSettingsDraft(
  descriptor: WorkflowSettingsDescriptorView | null | undefined,
): WorkflowSettingsDraft {
  return {
    backendId: String((descriptor && descriptor.selectedProfile) || "").trim(),
    workflowParams: cloneWorkflowSettingsRecord(
      descriptor && descriptor.workflowParams,
    ),
    providerOptions: cloneWorkflowSettingsRecord(
      descriptor && descriptor.providerOptions,
    ),
    hostOptions: cloneWorkflowSettingsRecord(
      descriptor && descriptor.hostOptions,
    ),
  };
}

export function cloneWorkflowSettingsDraft(
  draft: WorkflowSettingsDraft,
): WorkflowSettingsDraft {
  return {
    backendId: draft.backendId,
    workflowParams: cloneWorkflowSettingsRecord(draft.workflowParams),
    providerOptions: cloneWorkflowSettingsRecord(draft.providerOptions),
    hostOptions: cloneWorkflowSettingsRecord(draft.hostOptions),
  };
}

// Draft reset key: the draft is rebuilt exactly when the descriptor content
// that feeds it changes (selected workflow, selected profile, or any of the
// three value bags — including host echoes of applied drafts and host-side
// provider-option rebases after a backend switch).
export function workflowOptionsDraftResetKey(
  selection: DashboardWorkflowOptionsSelection,
): string {
  const descriptor = selection.descriptor;
  return stableRegionSignature([
    selection.selectedWorkflowId,
    descriptor ? String(descriptor.selectedProfile || "") : "",
    descriptor ? (descriptor.workflowParams ?? null) : null,
    descriptor ? (descriptor.providerOptions ?? null) : null,
    descriptor ? (descriptor.hostOptions ?? null) : null,
  ]);
}

// ---------------------------------------------------------------------------
// Custom select island: the vendor window.createCustomSelect widget is
// imperative, so it is mounted inside a display:contents host div that
// Preact never diffs into. The island rebuilds only when its
// options/value/classes signature changes.
// ---------------------------------------------------------------------------

export type CustomSelectIslandProps = {
  options: WorkflowSettingsFieldOption[];
  value: string;
  controlClassName?: string;
  controlStyle?: string;
  ariaRequired?: boolean;
  // data-workflow-settings-control-key anchor (dialog surface focus hooks).
  controlKey?: string;
  // The dialog disables its select controls in place (legacy
  // markCustomSelectDisabled) instead of swapping in a placeholder.
  markDisabled?: boolean;
  onValueChange?: (value: string) => void;
  // Fired once per island (re)build with the vendor-normalized value; the
  // legacy renderer writes it back into the draft without emitting a change.
  onMountedValue?: (value: string) => void;
};

export function CustomSelectIsland(props: CustomSelectIslandProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef(props);
  latestRef.current = props;
  const signature = stableRegionSignature([
    props.options,
    props.value,
    props.controlClassName || "",
    props.controlStyle || "",
    props.ariaRequired === true,
    props.controlKey || "",
    props.markDisabled === true,
  ]);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const factory = dashboardVendorGlobals().createCustomSelect;
    if (!factory) {
      return;
    }
    const current = latestRef.current;
    const select = factory(current.options, current.value, (value) => {
      const next = latestRef.current.onValueChange;
      if (next) {
        next(String(value == null ? "" : value));
      }
    });
    const element = select.element;
    for (const name of String(current.controlClassName || "").split(" ")) {
      if (name) {
        element.classList.add(name);
      }
    }
    if (current.controlStyle) {
      element.style.cssText = current.controlStyle;
    }
    if (current.ariaRequired === true) {
      element.setAttribute("aria-required", "true");
    }
    if (current.controlKey) {
      element.setAttribute(
        "data-workflow-settings-control-key",
        current.controlKey,
      );
    }
    if (current.markDisabled === true) {
      element.classList.add("disabled");
      element.setAttribute("aria-disabled", "true");
      const trigger = element.querySelector(".custom-select-trigger");
      if (trigger) {
        trigger.setAttribute("aria-disabled", "true");
        trigger.setAttribute("tabindex", "-1");
      }
    }
    host.appendChild(element);
    const onMountedValue = latestRef.current.onMountedValue;
    if (onMountedValue) {
      onMountedValue(select.getValue());
    }
    return () => {
      if (element.parentNode === host) {
        host.removeChild(element);
      }
    };
  }, [signature]);
  return (
    <div ref={hostRef} class="custom-select-island" style="display:contents" />
  );
}

// ---------------------------------------------------------------------------
// Field row
// ---------------------------------------------------------------------------

// Markup flavor of a field row. The dashboard inline form (defaults) and the
// workflow settings dialog share one engine but render different chrome:
// class names, label element, control wrapping, disabled presentation and the
// dialog's control-key anchors all come from this object.
export type WorkflowFieldRowPresentation = {
  rowClassName?: string;
  labelClassName?: string;
  labelWarningClassName?: string;
  descriptionClassName?: string;
  controlClassName?: string;
  errorClassName?: string;
  // Class applied to custom-select field controls; defaults to controlClassName.
  // The dialog leaves its select controls unclassed.
  selectControlClassName?: string;
  // Wrap control + error node in a column container (dialog).
  wrapControl?: boolean;
  controlWrapClassName?: string;
  labelElement?: "label" | "div";
  showDescription?: boolean;
  // "placeholder" (dashboard): a disabled entry collapses to a diagnostics
  // message plus a dead input. "disable-control" (dialog): the real control
  // renders with its disabled state.
  disabledMode?: "placeholder" | "disable-control";
  // The dialog sets the required attribute on plain text inputs; the
  // dashboard inline form does not.
  plainTextRequiredAttr?: boolean;
  // The dialog renders a bare checkbox control; the dashboard wraps it in a
  // labelled line with the field title span.
  booleanBare?: boolean;
  checkboxClassName?: string;
  checkboxLineClassName?: string;
  comboClassName?: string;
  // The dialog's shared control tail adds the numeric class to combo number
  // inputs; the dashboard combo branch does not.
  comboNumericClass?: boolean;
  // When set (dialog), rows carry data-workflow-settings-field-section and
  // controls carry data-workflow-settings-control-key anchors.
  controlKeyPrefix?: string;
};

type ResolvedFieldRowPresentation = {
  rowClassName: string;
  labelClassName: string;
  labelWarningClassName: string;
  descriptionClassName: string;
  controlClassName: string;
  errorClassName: string;
  selectControlClassName: string;
  wrapControl: boolean;
  controlWrapClassName: string;
  labelElement: "label" | "div";
  showDescription: boolean;
  disabledMode: "placeholder" | "disable-control";
  plainTextRequiredAttr: boolean;
  booleanBare: boolean;
  checkboxClassName: string;
  checkboxLineClassName: string;
  comboClassName: string;
  comboNumericClass: boolean;
  controlKeyPrefix: string;
};

function resolveFieldRowPresentation(
  presentation?: WorkflowFieldRowPresentation,
): ResolvedFieldRowPresentation {
  return {
    rowClassName: presentation?.rowClassName || "workflow-settings-field",
    labelClassName:
      presentation?.labelClassName || "workflow-settings-field-label",
    labelWarningClassName:
      presentation?.labelWarningClassName ||
      "workflow-settings-field-label-warning",
    descriptionClassName:
      presentation?.descriptionClassName || "workflow-settings-field-desc",
    controlClassName:
      presentation?.controlClassName || "workflow-settings-field-control",
    errorClassName:
      presentation?.errorClassName || "workflow-settings-field-error",
    selectControlClassName:
      presentation && presentation.selectControlClassName !== undefined
        ? presentation.selectControlClassName
        : presentation?.controlClassName || "workflow-settings-field-control",
    wrapControl: presentation?.wrapControl === true,
    controlWrapClassName:
      presentation?.controlWrapClassName || "field-input-col",
    labelElement: presentation?.labelElement === "div" ? "div" : "label",
    showDescription: presentation?.showDescription !== false,
    disabledMode:
      presentation?.disabledMode === "disable-control"
        ? "disable-control"
        : "placeholder",
    plainTextRequiredAttr: presentation?.plainTextRequiredAttr === true,
    booleanBare: presentation?.booleanBare === true,
    checkboxClassName:
      presentation?.checkboxClassName || "field-checkbox-control",
    checkboxLineClassName:
      presentation?.checkboxLineClassName || "workflow-settings-field-checkbox",
    comboClassName:
      presentation && presentation.comboClassName !== undefined
        ? presentation.comboClassName
        : "workflow-settings-field-combo",
    comboNumericClass: presentation?.comboNumericClass === true,
    controlKeyPrefix: String(presentation?.controlKeyPrefix || "").trim(),
  };
}

// Registers a silent commit/flush callback (dialog confirm + cache-refresh
// buttons drain pending control edits before sending their payloads). The
// registrar may return an unregister callback invoked on unmount.
export type WorkflowFieldCommitterRegistrar = (
  commit: () => boolean,
) => void | (() => void);

export type WorkflowFieldRowProps = {
  entry: WorkflowSettingsSchemaEntry;
  values: Record<string, unknown>;
  texts: WorkflowFieldTexts;
  // Overrides the value bag used for provider-conditional visibility. The
  // dashboard inline form evaluates against the owning section's values
  // (default); the dialog evaluates against draft.providerOptions for every
  // section.
  visibilityValues?: Record<string, unknown>;
  presentation?: WorkflowFieldRowPresentation;
  registerCommitter?: WorkflowFieldCommitterRegistrar;
  // null means "the draft mutated, re-evaluate visibility, but do not emit"
  // (successful commits whose value did not change, mirroring the legacy
  // card-level change listener that always re-applied visibility).
  onChange: (meta: WorkflowFieldChangeMeta | null) => void;
};

export function WorkflowFieldRow(props: WorkflowFieldRowProps) {
  const { entry, values, texts, onChange } = props;
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastCommittedRawRef = useRef<string | null>(null);

  const presentation = resolveFieldRowPresentation(props.presentation);
  const key = String(entry.key || "");
  const warning = isWarningProviderOptionKey(key);
  const conditional = entry.visibleIfProviderOption;
  const visible = isProviderConditionalWorkflowFieldVisible(
    entry,
    props.visibilityValues || values,
  );
  const disabledControl =
    entry.disabled === true && presentation.disabledMode === "disable-control";
  const currentValue = Object.prototype.hasOwnProperty.call(values, key)
    ? values[key]
    : entry.defaultValue;
  const optionEntries = resolveWorkflowFieldOptions(entry);
  const isCombo = optionEntries.length > 0 && entry.allowCustom === true;
  const isPlainSelect = optionEntries.length > 0 && !isCombo;
  const initialRaw =
    entry.type === "array" && Array.isArray(currentValue)
      ? currentValue.join(", ")
      : String(currentValue == null ? "" : currentValue);
  if (lastCommittedRawRef.current === null) {
    lastCommittedRawRef.current = initialRaw;
  }
  const controlKey = presentation.controlKeyPrefix
    ? `${presentation.controlKeyPrefix}.${key}`
    : undefined;

  const commitControlValue = (emitChange: boolean): boolean => {
    const input = inputRef.current;
    if (!input) {
      return false;
    }
    const rawValue = String(input.value == null ? "" : input.value);
    let changed = false;
    if (entry.required === true && rawValue.trim().length === 0) {
      setError(texts.parameterRequiredText);
      return false;
    }
    if (entry.type === "number") {
      const validation = validateWorkflowNumberFieldValue({
        entry,
        rawValue,
        texts,
      });
      if (!validation.ok) {
        setError(validation.message);
        return false;
      }
      setError("");
      if ("remove" in validation && validation.remove) {
        changed = values[key] !== null;
        values[key] = null;
      } else if ("value" in validation) {
        changed = values[key] !== validation.value;
        values[key] = validation.value;
      }
    } else {
      setError("");
      const nextValue = normalizeWorkflowTypeValue(entry.type, rawValue);
      changed = values[key] !== nextValue;
      values[key] = nextValue;
    }
    if (emitChange && (changed || rawValue !== lastCommittedRawRef.current)) {
      onChange({ changedKey: key, changedOrigin: "text" });
    } else {
      onChange(null);
    }
    lastCommittedRawRef.current = rawValue;
    return true;
  };

  const handleInput = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    if (entry.type === "number") {
      // Number fields validate on commit; typing only clears a stale error.
      setError("");
      return;
    }
    values[key] = input.value;
  };

  // preact/compat (pulled in transitively by memo) remaps the onChange prop
  // of text inputs to the input event, which would turn the commit into a
  // per-keystroke validation/emit. The legacy commit semantics need the
  // native change/blur events, so those two listeners attach imperatively on
  // the control (the legacy renderer wired them with addEventListener too).
  const commitRef = useRef(commitControlValue);
  commitRef.current = commitControlValue;
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const commit = () => commitRef.current(true);
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    return () => {
      input.removeEventListener("change", commit);
      input.removeEventListener("blur", commit);
    };
  }, []);

  // Boolean and select controls sync the draft on every change already, so
  // their flush is a no-op; text-ish controls commit silently.
  const registerCommitter = props.registerCommitter;
  useLayoutEffect(() => {
    if (!registerCommitter) {
      return;
    }
    return registerCommitter(() => {
      if (!inputRef.current) {
        return true;
      }
      return commitRef.current(false);
    });
  }, [registerCommitter]);

  const rowProps = {
    class: presentation.rowClassName,
    "data-workflow-settings-field-section":
      presentation.controlKeyPrefix || undefined,
    "data-workflow-settings-field-key": key,
    "data-workflow-settings-visible-provider-key": conditional
      ? String(conditional.key || "")
      : undefined,
    "data-workflow-settings-visible-provider-equals": conditional
      ? conditional.equals === true
        ? "true"
        : "false"
      : undefined,
    "aria-hidden": conditional && !visible ? true : undefined,
    style: conditional && !visible ? "display:none" : undefined,
  };

  const labelClass = warning
    ? `${presentation.labelClassName} ${presentation.labelWarningClassName}`
    : presentation.labelClassName;
  const labelText =
    formatWorkflowFieldLabel(entry) + (entry.required === true ? " *" : "");
  const labelNode =
    presentation.labelElement === "div" ? (
      <div class={labelClass}>{labelText}</div>
    ) : (
      <label class={labelClass}>{labelText}</label>
    );

  if (entry.disabled === true && presentation.disabledMode === "placeholder") {
    const diagnostics = Array.isArray(entry.diagnostics)
      ? entry.diagnostics
      : [];
    const first = diagnostics.length > 0 ? diagnostics[0] : null;
    const message = first
      ? String(first.message || first.code || "")
      : texts.noSelectableOptionsText;
    return (
      <div {...rowProps}>
        {labelNode}
        <div class={presentation.descriptionClassName}>{message}</div>
        <input
          type="text"
          disabled
          value=""
          class={presentation.controlClassName}
        />
      </div>
    );
  }

  const descriptionNode =
    presentation.showDescription && entry.description ? (
      <div class={presentation.descriptionClassName}>{entry.description}</div>
    ) : null;

  const assemble = (
    control: ComponentChildren,
    errorNode: ComponentChildren,
  ) => {
    const content = presentation.wrapControl ? (
      <div class={presentation.controlWrapClassName}>
        {control}
        {errorNode}
      </div>
    ) : (
      <>
        {control}
        {errorNode}
      </>
    );
    return (
      <div {...rowProps}>
        {labelNode}
        {descriptionNode}
        {content}
      </div>
    );
  };

  if (entry.type === "boolean") {
    const checkbox = (
      <input
        type="checkbox"
        class={
          presentation.booleanBare ? presentation.checkboxClassName : undefined
        }
        data-workflow-settings-control-key={controlKey}
        aria-required={entry.required === true ? "true" : undefined}
        checked={currentValue === true}
        disabled={disabledControl}
        onChange={(event) => {
          values[key] = event.currentTarget.checked;
          onChange({ changedKey: key });
        }}
      />
    );
    return assemble(
      presentation.booleanBare ? (
        checkbox
      ) : (
        <label class={presentation.checkboxLineClassName}>
          {checkbox}
          <span class={warning ? presentation.labelWarningClassName : ""}>
            {entry.title || key}
          </span>
        </label>
      ),
      null,
    );
  }

  if (isPlainSelect) {
    const currentValueStr = String(
      currentValue == null ? optionEntries[0].value || "" : currentValue,
    );
    return assemble(
      <CustomSelectIsland
        options={optionEntries}
        value={currentValueStr}
        controlClassName={presentation.selectControlClassName}
        ariaRequired={entry.required === true}
        controlKey={controlKey}
        markDisabled={disabledControl}
        onMountedValue={(value) => {
          values[key] = value;
        }}
        onValueChange={(value) => {
          values[key] = value;
          onChange({ changedKey: key });
        }}
      />,
      null,
    );
  }

  const errorNode = error ? (
    <div class={presentation.errorClassName}>{error}</div>
  ) : null;

  if (isCombo) {
    return assemble(
      <div
        class={presentation.comboClassName || undefined}
        style="display:flex;gap:8px;align-items:center;"
      >
        <CustomSelectIsland
          options={optionEntries}
          value={initialRaw}
          controlClassName={presentation.selectControlClassName}
          controlStyle="flex:1 1 55%;"
          controlKey={controlKey ? `${controlKey}.recommendation` : undefined}
          markDisabled={disabledControl}
          onValueChange={(value) => {
            const next = String(value == null ? "" : value);
            if (inputRef.current) {
              inputRef.current.value = next;
            }
            values[key] = next;
            onChange({ changedKey: key });
          }}
        />
        <input
          ref={inputRef}
          type="text"
          class={
            (entry.type === "number" && presentation.comboNumericClass
              ? `${presentation.controlClassName} numeric`
              : presentation.controlClassName) + (error ? " invalid" : "")
          }
          style="flex:1 1 45%;"
          data-workflow-settings-control-key={controlKey}
          defaultValue={initialRaw}
          placeholder={String(entry.placeholder || "")}
          required={entry.required === true}
          disabled={disabledControl}
          onInput={handleInput}
        />
      </div>,
      errorNode,
    );
  }

  const numberInputMode =
    entry.integer === true || isPositiveIntegerWorkflowField(entry)
      ? "numeric"
      : "decimal";
  return assemble(
    <input
      ref={inputRef}
      type="text"
      class={
        (entry.type === "number"
          ? `${presentation.controlClassName} numeric`
          : presentation.controlClassName) + (error ? " invalid" : "")
      }
      data-workflow-settings-control-key={controlKey}
      placeholder={String(entry.placeholder || "")}
      defaultValue={initialRaw}
      inputMode={entry.type === "number" ? numberInputMode : undefined}
      required={presentation.plainTextRequiredAttr && entry.required === true}
      disabled={disabledControl}
      onInput={handleInput}
    />,
    errorNode,
  );
}

// ---------------------------------------------------------------------------
// Settings section card
// ---------------------------------------------------------------------------

export type WorkflowSettingsSectionPresentation = {
  cardClassName?: string;
  titleClassName?: string;
  emptyClassName?: string;
};

export type WorkflowSettingsSectionProps = {
  title: string;
  emptyText: string;
  entries: WorkflowSettingsSchemaEntry[];
  values: Record<string, unknown>;
  texts: WorkflowFieldTexts;
  changedSection: string;
  onChange: (meta: WorkflowSettingsDraftChangeMeta) => void;
  visibilityValues?: Record<string, unknown>;
  presentation?: WorkflowSettingsSectionPresentation;
  cardExtraClassName?: string;
  fieldPresentation?: WorkflowFieldRowPresentation;
  registerCommitter?: WorkflowFieldCommitterRegistrar;
};

export function WorkflowSettingsSection(props: WorkflowSettingsSectionProps) {
  // Field edits mutate the shared draft record in place; the revision bump
  // re-renders the card so provider-conditional visibility tracks the latest
  // values immediately (the legacy card-level "change" listener re-applied
  // visibility the same way, without waiting for a host echo).
  const [, setRevision] = useState(0);
  const handleFieldChange = (meta: WorkflowFieldChangeMeta | null) => {
    setRevision((revision) => revision + 1);
    if (!meta) {
      return;
    }
    props.onChange({
      changedSection: props.changedSection,
      changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
      changedOrigin:
        typeof meta.changedOrigin === "string" ? meta.changedOrigin : "",
    });
  };
  const entries = Array.isArray(props.entries) ? props.entries : [];
  const cardClassName =
    props.presentation?.cardClassName || "workflow-settings-card";
  const titleClassName =
    props.presentation?.titleClassName || "workflow-settings-card-title";
  const emptyClassName =
    props.presentation?.emptyClassName || "workflow-settings-empty";
  const cardClass = props.cardExtraClassName
    ? `${cardClassName} ${props.cardExtraClassName}`
    : cardClassName;
  return (
    <section class={cardClass}>
      <h3 class={titleClassName}>{props.title}</h3>
      {entries.length === 0 ? (
        <div class={emptyClassName}>{props.emptyText}</div>
      ) : (
        entries.map((entry) => (
          <WorkflowFieldRow
            key={String((entry && entry.key) || "")}
            entry={entry}
            values={props.values}
            visibilityValues={props.visibilityValues}
            texts={props.texts}
            presentation={props.fieldPresentation}
            registerCommitter={props.registerCommitter}
            onChange={handleFieldChange}
          />
        ))
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export type DashboardWorkflowOptionsRegionProps = {
  selection: DashboardWorkflowOptionsSelection;
  onAction: DashboardActionHandler<DashboardWorkflowOptionsAction>;
};

function fixedProfileLabel(descriptor: WorkflowSettingsDescriptorView): string {
  const profiles = Array.isArray(descriptor.profiles)
    ? descriptor.profiles
    : [];
  const selected = String(descriptor.selectedProfile || "").trim();
  const fixed = profiles.find(
    (entry) => String((entry && entry.id) || "").trim() === selected,
  );
  return fixed ? String(fixed.label || "") : "-";
}

export const WorkflowOptionsRegion = memo(
  function WorkflowOptionsRegion(props: DashboardWorkflowOptionsRegionProps) {
    const { selection, onAction } = props;
    const descriptor = selection.descriptor;
    const resetKey = workflowOptionsDraftResetKey(selection);
    const draftRef = useRef<{
      key: string;
      draft: WorkflowSettingsDraft;
    } | null>(null);
    if (!draftRef.current || draftRef.current.key !== resetKey) {
      draftRef.current = {
        key: resetKey,
        draft: createWorkflowSettingsDraft(descriptor),
      };
    }
    const draft = draftRef.current.draft;

    const emitDraft = (meta: WorkflowSettingsDraftChangeMeta) => {
      onAction("workflow-settings-draft", {
        workflowId: selection.selectedWorkflowId,
        executionOptions: cloneWorkflowSettingsDraft(draft),
        changedSection:
          typeof meta.changedSection === "string" ? meta.changedSection : "",
        changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
        changedOrigin:
          typeof meta.changedOrigin === "string" ? meta.changedOrigin : "",
      });
    };

    return (
      <div
        class="dashboard-workflow-options"
        data-region-content="dashboard-workflow-options"
      >
        <h2 class="page-title">{selection.texts.pageTitle}</h2>
        {selection.workflows.length === 0 ? (
          <div class="empty">{selection.texts.noConfigurableText}</div>
        ) : (
          <>
            <div class="workflow-subtabs">
              {selection.workflows.map((workflow) => (
                <button
                  key={workflow.workflowId}
                  class={
                    workflow.active
                      ? "workflow-subtab-btn active"
                      : "workflow-subtab-btn"
                  }
                  onClick={() =>
                    onAction("select-workflow-settings-workflow", {
                      workflowId: workflow.workflowId,
                    })
                  }
                >
                  {workflow.label}
                </button>
              ))}
            </div>
            {descriptor ? (
              <div class="workflow-settings-shell" key={resetKey}>
                <div class="workflow-settings-banner">
                  {descriptor.requiresBackendProfile === true ? (
                    <div class="workflow-settings-banner-profile">
                      <div class="workflow-settings-banner-profile-label">
                        {selection.texts.profileLabelText}
                      </div>
                      {descriptor.profileEditable === true ? (
                        <CustomSelectIsland
                          options={(Array.isArray(descriptor.profiles)
                            ? descriptor.profiles
                            : []
                          ).map((entry) => ({
                            value: String((entry && entry.id) || ""),
                            label: String((entry && entry.label) || ""),
                          }))}
                          value={draft.backendId}
                          controlClassName="workflow-settings-banner-profile-select"
                          onValueChange={(value) => {
                            draft.backendId = String(value || "").trim();
                            emitDraft({
                              changedSection: "backend",
                              changedKey: "backendId",
                            });
                          }}
                        />
                      ) : descriptor.profileMissing === true ? (
                        <div class="workflow-settings-error">
                          {selection.texts.blockedNoProfileText}
                        </div>
                      ) : (
                        <div class="workflow-settings-empty">
                          {fixedProfileLabel(descriptor)}
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div class="workflow-settings-meta">
                    <div>{`${selection.texts.workflowLabelText}: ${descriptor.workflowLabel || ""}`}</div>
                    <div>{`${selection.texts.providerLabelText}: ${descriptor.providerId || ""}`}</div>
                  </div>
                </div>
                <div class="workflow-settings-sections-grid">
                  <WorkflowSettingsSection
                    title={selection.texts.workflowParamsTitleText}
                    emptyText={selection.texts.noWorkflowParamsText}
                    entries={
                      Array.isArray(descriptor.workflowSchemaEntries)
                        ? descriptor.workflowSchemaEntries
                        : []
                    }
                    values={draft.workflowParams}
                    texts={selection.texts}
                    changedSection="workflowParams"
                    onChange={emitDraft}
                  />
                  <WorkflowSettingsSection
                    title={selection.texts.providerOptionsTitleText}
                    emptyText={selection.texts.noProviderOptionsText}
                    entries={
                      Array.isArray(descriptor.providerSchemaEntries)
                        ? descriptor.providerSchemaEntries
                        : []
                    }
                    values={draft.providerOptions}
                    texts={selection.texts}
                    changedSection="providerOptions"
                    onChange={emitDraft}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);

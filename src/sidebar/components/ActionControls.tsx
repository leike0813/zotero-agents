/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from "preact/hooks";

import { safeText, stableRegionSignature } from "./regionEquality";

// Preact ports of the imperative action controls in
// src/sidebar/assistantPanelRenderer.js (renderActionButton,
// renderActionSwitch, renderExecutionDisplayMode). Classes, attributes, and
// emitted payloads are part of the CSS/wire contract and are preserved.

export type PanelActionRecord = Record<string, unknown> & {
  kind?: unknown;
  action?: unknown;
  label?: unknown;
  payload?: unknown;
};

export type PanelActionHandler = (action: unknown, payload: unknown) => void;

function PanelActionButton(props: {
  action: PanelActionRecord;
  onAction: PanelActionHandler;
}) {
  const { action, onAction } = props;
  return (
    <button
      type="button"
      class={
        "asst-button-compact assistant-panel-action assistant-panel-action-" +
        safeText(action.action || "unknown")
      }
      disabled={action.enabled === false || action.disabled === true}
      data-assistant-action-align={
        safeText(action.align) === "end" ? "end" : null
      }
      data-assistant-action-tone={action.tone ? safeText(action.tone) : null}
      onClick={() => onAction(action.action, action.payload || {})}
    >
      {safeText(action.label || action.action || "Action")}
    </button>
  );
}

function PanelActionSwitch(props: {
  action: PanelActionRecord;
  onAction: PanelActionHandler;
}) {
  const { action, onAction } = props;
  const checked = action.checked === true || action.value === true;
  const labelText =
    safeText(action.stateLabel) ||
    safeText(action.label) ||
    safeText(action.action) ||
    "Switch";
  const baseLabel =
    safeText(action.baseLabel) || safeText(action.label) || labelText;
  // The pending/busy markers mirror the imperative original exactly: set
  // synchronously on the clicked button, dropped on the next action change.
  // They are intentionally not part of the vnode, so Preact never diffs them.
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const actionSignature = stableRegionSignature(action);
  useLayoutEffect(() => {
    buttonRef.current?.removeAttribute("data-assistant-switch-pending");
    buttonRef.current?.removeAttribute("aria-busy");
  }, [actionSignature]);
  return (
    <button
      ref={buttonRef}
      type="button"
      class={
        "assistant-panel-switch-action assistant-panel-action assistant-panel-action-" +
        safeText(action.action || "unknown")
      }
      disabled={action.enabled === false || action.disabled === true}
      role="switch"
      aria-checked={checked ? "true" : "false"}
      aria-label={labelText}
      title={labelText}
      data-assistant-switch-state={checked ? "on" : "off"}
      data-assistant-switch-fallback="label"
      data-assistant-switch-label={baseLabel}
      data-assistant-action-align={
        safeText(action.align) === "end" ? "end" : null
      }
      onClick={(event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.setAttribute("data-assistant-switch-pending", "true");
        button.setAttribute("aria-busy", "true");
        onAction(action.action, action.payload || { enabled: !checked });
      }}
    >
      <span class="assistant-panel-switch-label">{labelText}</span>
      <span class="assistant-panel-switch-track" aria-hidden="true">
        <span class="assistant-panel-switch-thumb" />
      </span>
    </button>
  );
}

const DISPLAY_MODE_VALUES = ["live", "boundary", "silent"];

function ExecutionDisplayModeAction(props: {
  action: PanelActionRecord;
  onAction: PanelActionHandler;
}) {
  const { action, onAction } = props;
  const values = (Array.isArray(action.options) ? action.options : []).filter(
    (entry) =>
      entry &&
      DISPLAY_MODE_VALUES.includes(
        safeText((entry as Record<string, unknown>).value),
      ),
  ) as Array<Record<string, unknown>>;
  const selected = safeText(action.value) || "live";
  const select = (value: unknown) => {
    if (value && value !== selected) {
      onAction(action.action, { mode: value });
    }
  };
  return (
    <div
      class="assistant-panel-display-mode assistant-panel-action"
      role="radiogroup"
      aria-label={safeText(action.label) || "Display mode"}
      data-assistant-action-align={
        safeText(action.align) === "end" ? "end" : null
      }
    >
      {values.map((entry, index) => {
        const value = safeText(entry.value);
        const label = safeText(entry.label) || value;
        return (
          <button
            key={value || index}
            type="button"
            class="assistant-panel-display-mode-option"
            role="radio"
            data-execution-display-mode={value}
            aria-checked={value === selected ? "true" : "false"}
            aria-label={label}
            title={label}
            tabIndex={value === selected ? 0 : -1}
            onClick={() => select(value)}
            onKeyDown={(event) => {
              const key = safeText(event.key);
              let nextIndex = index;
              if (["ArrowRight", "ArrowDown"].includes(key)) {
                nextIndex = (index + 1) % values.length;
              } else if (["ArrowLeft", "ArrowUp"].includes(key)) {
                nextIndex = (index + values.length - 1) % values.length;
              } else if (key === "Home") {
                nextIndex = 0;
              } else if (key === "End") {
                nextIndex = values.length - 1;
              } else {
                return;
              }
              event.preventDefault();
              select(safeText(values[nextIndex] && values[nextIndex].value));
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PanelAction(props: {
  action: PanelActionRecord;
  onAction: PanelActionHandler;
}) {
  const kind = safeText(props.action && props.action.kind);
  if (kind === "display-mode") {
    return (
      <ExecutionDisplayModeAction
        action={props.action}
        onAction={props.onAction}
      />
    );
  }
  if (kind === "switch") {
    return (
      <PanelActionSwitch action={props.action} onAction={props.onAction} />
    );
  }
  return <PanelActionButton action={props.action} onAction={props.onAction} />;
}

// renderSelectControl port: label+select pair whose change emits the
// selector payload (selectorId/value/option plus the optional payloadKey).
export function optionValue(option: unknown): string {
  if (option === null || option === undefined) return "";
  if (typeof option !== "object") return safeText(option);
  const record = option as Record<string, unknown>;
  return safeText(record.value || record.id || record.key);
}

export function optionLabel(option: unknown): string {
  if (option === null || option === undefined) return "";
  if (typeof option !== "object") return safeText(option);
  const record = option as Record<string, unknown>;
  return safeText(
    record.label || record.name || record.title || record.value || record.id,
  );
}

export function SelectControl(props: {
  selector: Record<string, unknown>;
  onAction: PanelActionHandler;
}) {
  const { selector, onAction } = props;
  const entries = Array.isArray(selector.options) ? selector.options : [];
  return (
    <label
      class="assistant-panel-selector"
      data-assistant-selector-id={safeText(selector.id)}
      data-assistant-disabled={selector.disabled === true ? "true" : null}
    >
      <span class="assistant-panel-selector-label">
        {safeText(selector.label || selector.id)}
      </span>
      <select
        class="assistant-panel-select"
        disabled={selector.disabled === true}
        value={safeText(selector.value)}
        onChange={(event) => {
          const select = event.currentTarget;
          const selected = entries.find(
            (entry) => optionValue(entry) === select.value,
          );
          const payload: Record<string, unknown> = {
            ...(selector.payload && typeof selector.payload === "object"
              ? (selector.payload as Record<string, unknown>)
              : {}),
            selectorId: selector.id,
            value: select.value,
            option: selected || null,
          };
          const payloadKey = safeText(selector.payloadKey);
          if (payloadKey) payload[payloadKey] = select.value;
          onAction(selector.action || "select-context", payload);
        }}
      >
        {entries.length === 0 ? (
          <option value="">-</option>
        ) : (
          entries.map((entry, index) => (
            <option
              key={optionValue(entry) || index}
              value={optionValue(entry)}
              data-assistant-sentinel={
                entry &&
                typeof entry === "object" &&
                (entry as Record<string, unknown>).sentinel
                  ? safeText((entry as Record<string, unknown>).sentinel)
                  : null
              }
            >
              {optionLabel(entry) || "-"}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

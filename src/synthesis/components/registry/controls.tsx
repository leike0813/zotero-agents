/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef } from "preact/hooks";

import {
  fillRegistryTemplate,
  registryLocalizedValue,
  registryOperationLabel,
  type SynthesisRegistryText,
} from "./registryTypes";

// Shared building blocks for the registry surface: badges, action buttons
// with the legacy busy/pending treatment, empty states, filter controls, and
// the row-windowing hook used by the unbounded registry/canonical tables.

export function RegistryBadge(props: {
  t: SynthesisRegistryText;
  text: unknown;
  tone?: string;
  className?: string;
}) {
  const label = registryLocalizedValue(props.t, props.text) || "-";
  const className = `badge ${props.tone || ""}${
    props.className ? ` ${props.className}` : ""
  }`;
  return <span class={className}>{label}</span>;
}

/**
 * Legacy makeButton/makeLocalButton parity: pending host commands render a
 * spinner, aria-busy and the "operation in progress" title; disabled state
 * combines the caller's condition with the pending state.
 */
export function RegistryActionButton(props: {
  t: SynthesisRegistryText;
  label: string;
  active?: boolean;
  disabled?: boolean;
  pending?: boolean;
  pendingCommand?: string;
  title?: string;
  className?: string;
  onClick: (event: MouseEvent) => void;
  children?: preact.ComponentChildren;
}) {
  const pending = !!props.pending;
  const className = [
    props.active ? "active" : "",
    pending ? "is-busy" : "",
    props.className || "",
  ]
    .filter(Boolean)
    .join(" ");
  const title = pending
    ? props.t("synthesis-operation-in-progress", {
        operation: registryOperationLabel(props.t, props.pendingCommand || ""),
      })
    : props.title;
  return (
    <button
      type="button"
      class={className}
      disabled={props.disabled || pending}
      aria-busy={pending ? "true" : undefined}
      title={title}
      onClick={(event) => {
        event.preventDefault();
        props.onClick(event);
      }}
    >
      {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
      {props.children}
    </button>
  );
}

export function RegistryEmptyState(props: {
  title: string;
  message?: string;
  tone?: "default" | "info" | "warning";
  action?: preact.ComponentChildren;
}) {
  return (
    <div class={`empty-state empty-state-${props.tone || "default"}`}>
      <strong class="empty-state-title">{props.title}</strong>
      {props.message ? (
        <p class="empty-state-message">{props.message}</p>
      ) : null}
      {props.action ? (
        <div class="empty-state-actions">{props.action}</div>
      ) : null}
    </div>
  );
}

/**
 * Uncontrolled text input for host-echoed filters: typing dispatches per
 * keystroke (legacy input listener), while external value changes only land
 * when the input is not focused, so an in-flight echo never eats keystrokes.
 */
export function RegistryFilterInput(props: {
  value: string;
  placeholder: string;
  onValue: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useLayoutEffect(() => {
    const input = ref.current;
    if (
      input &&
      input.value !== props.value &&
      document.activeElement !== input
    ) {
      input.value = props.value;
    }
  });
  return (
    <input
      ref={ref}
      defaultValue={props.value}
      placeholder={props.placeholder}
      onInput={(event) => props.onValue(event.currentTarget.value)}
    />
  );
}

export function RegistrySelect(props: {
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    >
      {props.options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** Legacy renderPanelToolbar: .panel-header.panel-toolbar wrapping content. */
export function RegistryPanelToolbar(props: {
  children: preact.ComponentChildren;
}) {
  return <div class="panel-header panel-toolbar">{props.children}</div>;
}

/** Formats "%count%" legacy templates such as "%count% refs". */
export function registryCountText(template: string, count: number): string {
  return fillRegistryTemplate(template, { count });
}

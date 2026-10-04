/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Shared presentation primitives for the Zotero Agent settings window.
//
// Every visible string resolves through a host label key with an explicit
// English fallback, so a missing translation degrades to readable text instead
// of leaking a key. Nothing here owns domain state: Choice is a controlled
// menu, Field is a controlled input, Modal owns only its focus trap.

import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ZoteroAgentSettingsLabels } from "../../shared/zoteroAgentSettingsWireContract";
import type { ComponentChildren } from "preact";

export type SettingsLabels = ZoteroAgentSettingsLabels;

// A page bundle may only import same-directory paths and src/shared, so the
// label resolution a page needs lives here rather than in another directory. A
// host label wins; an unresolved key or an empty value falls back to readable
// text instead of leaking the key into the interface.
const UNRESOLVED_LABEL_KEY = /^task-dashboard-[a-z0-9-]+$/i;

export function text(
  labels: SettingsLabels | null | undefined,
  key: string,
  fallback: string,
): string {
  const resolved = String((labels && labels[key]) || "").trim();
  if (resolved && !UNRESOLVED_LABEL_KEY.test(resolved)) return resolved;
  return fallback;
}

export type Tone = "muted" | "info" | "success" | "warning" | "danger";

export function Button(props: {
  labels: SettingsLabels | null | undefined;
  children: ComponentChildren;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  small?: boolean;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      class={[
        "zs-button",
        props.primary ? "is-primary" : "",
        props.danger ? "is-danger" : "",
        props.small ? "is-small" : "",
        props.className || "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.ariaLabel}
      data-testid={props.testId}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function Badge(props: { tone?: Tone; children: ComponentChildren }) {
  return (
    <span class={"zs-badge zs-badge--" + (props.tone || "muted")}>
      {props.children}
    </span>
  );
}

export function Banner(props: {
  tone?: Tone;
  children: ComponentChildren;
  testId?: string;
}) {
  const role =
    props.tone === "warning" || props.tone === "danger" ? "alert" : "status";
  return (
    <div
      class={"zs-banner zs-banner--" + (props.tone || "info")}
      role={role}
      data-testid={props.testId}
    >
      {props.children}
    </div>
  );
}

export function Switch(props: {
  checked: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
  children?: ComponentChildren;
  testId?: string;
}) {
  return (
    <label class="zs-switch">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        data-testid={props.testId}
        onChange={(event) =>
          props.onChange((event.currentTarget as HTMLInputElement).checked)
        }
      />
      {props.children}
    </label>
  );
}

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

// A controlled menu with mouse and keyboard parity. A Zotero dialog cannot
// raise a native select popup, and a provider or model choice has to show one
// unavailable entry together with its reason, so this is a listbox rather than
// a native control.
export function Choice(props: {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected =
    props.options.find((option) => option.value === props.value) ??
    props.options[0];

  useEffect(() => {
    // A deferred effect can run after the page's document is gone; there is no
    // menu left to close in that case.
    if (!open || typeof document === "undefined") return;
    const close = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close, true);
    return () => document.removeEventListener("mousedown", close, true);
  }, [open]);

  // Opening always starts on the current value, so a keyboard user lands on
  // what is selected rather than on the first row.
  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") return;
    const index = props.options.findIndex(
      (option) => option.value === selected?.value,
    );
    setActiveIndex(index < 0 ? 0 : index);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || typeof document === "undefined") return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const enabledIndexes = props.options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const move = (delta: number) => {
    if (!enabledIndexes.length) return;
    const position = enabledIndexes.indexOf(activeIndex);
    const next =
      position < 0
        ? enabledIndexes[0]
        : enabledIndexes[
            (position + delta + enabledIndexes.length) % enabledIndexes.length
          ];
    setActiveIndex(next);
  };

  const choose = (option: ChoiceOption) => {
    if (option.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    props.onChange(option.value);
  };

  return (
    <div class="zs-choice" ref={rootRef} data-testid={props.testId}>
      <button
        ref={triggerRef}
        type="button"
        class="zs-button zs-choice-trigger"
        aria-label={props.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            move(event.key === "ArrowDown" ? 1 : -1);
          }
        }}
      >
        <span>{selected?.label || props.placeholder || ""}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          class="zs-choice-menu"
          role="listbox"
          aria-label={props.label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
              return;
            }
            if (event.key === "Home") {
              event.preventDefault();
              setActiveIndex(enabledIndexes[0] ?? 0);
              return;
            }
            if (event.key === "End") {
              event.preventDefault();
              setActiveIndex(enabledIndexes[enabledIndexes.length - 1] ?? 0);
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              const option = props.options[activeIndex];
              if (option) choose(option);
            }
          }}
        >
          {props.options.map((option, index) => (
            <button
              key={option.value}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={option.value === props.value}
              aria-disabled={option.disabled ? "true" : undefined}
              tabIndex={index === activeIndex ? 0 : -1}
              disabled={option.disabled}
              title={option.description}
              data-testid={
                (props.testId || "choice") + "-option-" + option.value
              }
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.description && (
                <small class="muted">{option.description}</small>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onCommit?: (value: string) => void;
  type?: string;
  placeholder?: string;
  help?: string;
  ariaLabel?: string;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <label class="zs-field">
      <span>{props.label}</span>
      <input
        type={props.type || "text"}
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        aria-label={props.ariaLabel || props.label}
        autocomplete="off"
        data-testid={props.testId}
        onInput={(event) =>
          props.onInput((event.currentTarget as HTMLInputElement).value)
        }
        onBlur={(event) =>
          props.onCommit?.((event.currentTarget as HTMLInputElement).value)
        }
      />
      {props.help && <small>{props.help}</small>}
    </label>
  );
}

export function TextArea(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
  help?: string;
  testId?: string;
}) {
  return (
    <label class="zs-field">
      <span>{props.label}</span>
      <textarea
        class="zs-code"
        rows={props.rows || 10}
        value={props.value}
        readOnly={props.readOnly}
        spellcheck={false}
        aria-label={props.label}
        data-testid={props.testId}
        onInput={(event) =>
          props.onInput((event.currentTarget as HTMLTextAreaElement).value)
        }
      />
      {props.help && <small>{props.help}</small>}
    </label>
  );
}

export function Header(props: {
  title: string;
  description?: string;
  action?: ComponentChildren;
}) {
  return (
    <header class="zs-page-header">
      <div class="zs-row zs-spread">
        <h2>{props.title}</h2>
        {props.action}
      </div>
      {props.description && <p>{props.description}</p>}
    </header>
  );
}

export function Modal(props: {
  title: string;
  children: ComponentChildren;
  footer?: ComponentChildren;
  wide?: boolean;
  testId?: string;
}) {
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // The trap addresses the open modal by class, not by test id, so a caller
    // can name its own test hook without changing focus behavior.
    const selector = ".zs-modal";
    const first = document
      .querySelector(selector)
      ?.querySelector<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)",
      );
    first?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          selector +
            " button:not(:disabled)," +
            selector +
            " input:not(:disabled)," +
            selector +
            " textarea:not(:disabled)",
        ),
      );
      if (!nodes.length) return;
      const firstNode = nodes[0] as HTMLElement | undefined;
      const lastNode = nodes[nodes.length - 1] as HTMLElement | undefined;
      if (event.shiftKey && firstNode && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode?.focus();
      } else if (
        !event.shiftKey &&
        lastNode &&
        document.activeElement === lastNode
      ) {
        event.preventDefault();
        firstNode?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus?.();
    };
  }, []);
  return (
    <div class="zs-modal-overlay">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        data-testid={props.testId || "settings-modal"}
        class={"zs-modal" + (props.wide ? " is-wide" : "")}
      >
        <header class="zs-modal-header">
          <h3>{props.title}</h3>
        </header>
        <div class="zs-modal-body">{props.children}</div>
        {props.footer && (
          <footer class="zs-modal-footer">{props.footer}</footer>
        )}
      </section>
    </div>
  );
}

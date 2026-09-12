/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef, useState } from "preact/hooks";

// Dialog-safe select primitives shared by the plugin's HTML pages.
//
// Zotero dialog windows (openDialog + non-remote iframe type="content") cannot
// raise native <select> popups, so pages render these pure-DOM dropdowns
// instead. The markup keeps the frozen .custom-select* class contract of the
// retired vendor widget (addon/content/components/custom-select.js), which
// addon/content/components/custom-select.css styles; pages only need the
// <link> for that stylesheet.
//
// Both components are fully controlled: the parent owns the value(s) and
// receives changes through onChange. CustomMultiSelect applies on close —
// toggling checkboxes while the menu is open only edits an internal draft,
// and the parent is notified once with a fresh array when the menu closes.
// Value-only prop updates re-render in place and never close an open menu.
// Interaction parity with the vendor widget: Enter/Space toggle the menu,
// Escape closes it, clicking outside closes it, and the menu flips upwards
// when there is no room below (200px viewport-bottom heuristic).

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
};

function toText(value: unknown): string {
  return String(value == null ? "" : value);
}

const MENU_VIEWPORT_HEURISTIC_PX = 200;

// Vendor heuristic: flip the menu upwards when it would overflow the
// viewport bottom (assuming a 200px max menu height) and there is room above.
function shouldOpenUp(trigger: HTMLElement | null): boolean {
  if (!trigger || typeof window === "undefined") {
    return false;
  }
  const rect = trigger.getBoundingClientRect();
  return (
    rect.bottom + MENU_VIEWPORT_HEURISTIC_PX > window.innerHeight &&
    rect.top > MENU_VIEWPORT_HEURISTIC_PX
  );
}

function menuInlineStyle(openUp: boolean) {
  return openUp
    ? { top: "auto", bottom: "100%", marginTop: "0", marginBottom: "4px" }
    : { top: "100%", bottom: "auto", marginTop: "4px", marginBottom: "0" };
}

// Closes the menu on any click outside the component root. The listener is
// attached only while the menu is open and removed on close/unmount, so a
// click on another select's trigger is "outside" for this one and closes it.
// A layout effect keeps attach/detach synchronous with the render commit:
// opening select B must close an already-open select A within the same click
// dispatch, with no deferred-effect gap.
function useOutsideClickClose(
  rootRef: { current: HTMLElement | null },
  open: boolean,
  close: () => void,
) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const onDocumentClick = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && root.contains(event.target as Node)) {
        return;
      }
      closeRef.current();
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [open, rootRef]);
}

export type CustomSelectProps = {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  controlClassName?: string;
  style?: string;
  ariaRequired?: boolean;
  // data-workflow-settings-control-key anchor (dialog surface focus hooks).
  dataControlKey?: string;
};

export function CustomSelect(props: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const disabled = props.disabled === true;

  const closeMenu = () => setOpen(false);
  const toggleMenu = () => {
    if (disabled) {
      return;
    }
    if (open) {
      setOpen(false);
    } else {
      setOpenUp(shouldOpenUp(triggerRef.current));
      setOpen(true);
    }
  };
  useOutsideClickClose(rootRef, open, closeMenu);

  const options = Array.isArray(props.options) ? props.options : [];
  const current = options.find(
    (option) => toText(option.value) === toText(props.value),
  ) ||
    options[0] || { value: "", label: "" };
  const selectedValue = toText(current.value);

  const rootClass =
    ["custom-select", props.className || "", props.controlClassName || ""]
      .join(" ")
      .trim() + (disabled ? " disabled" : "");
  return (
    <div
      ref={rootRef}
      class={rootClass}
      style={props.style || undefined}
      aria-required={props.ariaRequired === true ? "true" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      data-workflow-settings-control-key={props.dataControlKey || undefined}
    >
      <div
        ref={triggerRef}
        class="custom-select-trigger"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled ? "true" : undefined}
        title={current.label}
        onClick={() => {
          toggleMenu();
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleMenu();
          } else if (event.key === "Escape") {
            closeMenu();
          }
        }}
      >
        <span class="custom-select-trigger-label">{current.label}</span>
      </div>
      <div
        class={`custom-select-menu${open ? " open" : ""}${openUp ? " open-up" : ""}`}
        style={menuInlineStyle(openUp)}
      >
        {options.map((option) => (
          <div
            key={toText(option.value)}
            class={`custom-select-option${
              toText(option.value) === selectedValue ? " selected" : ""
            }`}
            title={
              option.description
                ? `${option.label}\n${option.description}`
                : option.label
            }
            onClick={() => {
              closeMenu();
              const nextValue = toText(option.value);
              if (nextValue !== selectedValue) {
                props.onChange(option.value);
              }
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export type CustomMultiSelectProps = {
  options: CustomSelectOption[];
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
  className?: string;
};

function normalizeMultiValues(values: unknown): string[] {
  return (Array.isArray(values) ? values : []).map((value) => toText(value));
}

function multiSelectTriggerText(
  options: CustomSelectOption[],
  values: string[],
  placeholder: string,
): string {
  if (values.length === 0) {
    return placeholder || "None";
  }
  if (values.length === options.length && options.length > 0) {
    return placeholder || "All";
  }
  if (values.length === 1) {
    const match = options.find(
      (option) => toText(option.value) === toText(values[0]),
    );
    return match ? match.label : values[0];
  }
  return `${values.length} selected`;
}

export function CustomMultiSelect(props: CustomMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  // Apply-on-close draft: edits while the menu is open never reach the
  // parent; closing the menu applies the draft once as a fresh array.
  const [draft, setDraft] = useState<string[]>([]);

  const closeMenuAndApply = () => {
    if (!open) {
      return;
    }
    setOpen(false);
    props.onChange([...draft]);
  };
  const toggleMenu = () => {
    if (open) {
      closeMenuAndApply();
    } else {
      setDraft(normalizeMultiValues(props.values));
      setOpenUp(shouldOpenUp(triggerRef.current));
      setOpen(true);
    }
  };
  useOutsideClickClose(rootRef, open, closeMenuAndApply);

  const options = Array.isArray(props.options) ? props.options : [];
  // While closed the display follows the controlled props; while open it
  // follows the draft, so value-only prop updates never disturb the menu.
  const effectiveValues = open ? draft : normalizeMultiValues(props.values);
  const rootClass = ["custom-select custom-multi-select", props.className || ""]
    .join(" ")
    .trim();
  return (
    <div ref={rootRef} class={rootClass}>
      <div
        ref={triggerRef}
        class="custom-select-trigger"
        tabIndex={0}
        onClick={() => {
          toggleMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleMenu();
          } else if (event.key === "Escape") {
            closeMenuAndApply();
          }
        }}
      >
        {multiSelectTriggerText(options, effectiveValues, props.placeholder)}
      </div>
      <div
        class={`custom-select-menu${open ? " open" : ""}${openUp ? " open-up" : ""}`}
        style={menuInlineStyle(openUp)}
      >
        {options.map((option) => {
          const value = toText(option.value);
          const checked = effectiveValues.indexOf(value) !== -1;
          return (
            <label
              key={value}
              class="custom-select-option custom-multi-select-option"
              title={option.label}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  const nextChecked = event.currentTarget.checked;
                  setDraft((current) => {
                    if (nextChecked) {
                      return current.indexOf(value) === -1
                        ? [...current, value]
                        : current;
                    }
                    return current.filter((entry) => entry !== value);
                  });
                }}
              />
              {` ${option.label}`}
            </label>
          );
        })}
      </div>
    </div>
  );
}

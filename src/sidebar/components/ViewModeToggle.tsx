/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature, safeText } from "./regionEquality";

// Preact port of the static conversation overlay menu (view-mode toggle).
// The two buttons used to live in the page HTML with labels injected by the
// child's configure() and listeners bound at boot; now the child renders
// this component into the same static container and selects flow back as a
// plain callback. Button classes, icons, and aria wiring are unchanged.

export const ViewModeToggle = memo(
  function ViewModeToggle(props: {
    container: HTMLElement;
    mode: "plain" | "bubble";
    labels: Record<string, unknown>;
    onSelect: (mode: "plain" | "bubble") => void;
  }) {
    const { container, mode, labels, onSelect } = props;
    const viewLabel = safeText(labels.view);
    useLayoutEffect(() => {
      container.setAttribute("aria-label", viewLabel);
    }, [container, viewLabel]);
    const entries: Array<{ mode: "plain" | "bubble"; icon: string }> = [
      { mode: "plain", icon: "zs-icon-subject" },
      { mode: "bubble", icon: "zs-icon-forum" },
    ];
    return (
      <>
        {entries.map((entry) => {
          const label = safeText(labels[entry.mode]);
          const pressed =
            entry.mode === "bubble" ? mode === "bubble" : mode !== "bubble";
          return (
            <button
              key={entry.mode}
              class="asst-button-compact"
              type="button"
              data-assistant-view-mode={entry.mode}
              aria-label={label}
              aria-pressed={pressed ? "true" : "false"}
              onClick={() => onSelect(entry.mode)}
            >
              <span
                class={"zs-icon zs-icon-sm asst-view-mode-icon " + entry.icon}
                aria-hidden="true"
              />
              <span class="asst-view-mode-label">{label}</span>
            </button>
          );
        })}
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(
      { mode: prev.mode, labels: prev.labels },
      { mode: next.mode, labels: next.labels },
    ),
);

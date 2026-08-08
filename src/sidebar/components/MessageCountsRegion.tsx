/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";

import {
  equalBySignature,
  safeText,
  stableRegionSignature,
  type MessageCountsSelection,
} from "./regionEquality";

// Preact port of the imperative renderAssistantMessageCounts region
// (src/sidebar/assistantPanelRenderer.js). The DOM structure, classes, and
// attributes are part of the CSS/test contract and are preserved exactly,
// including the quirk that a missing counts snapshot only hides the
// container: the previously rendered items stay mounted untouched.

const CATEGORIES = [
  { key: "assistant", labelKey: "assistant", fallback: "Assistant" },
  { key: "thought", labelKey: "thinking", fallback: "Thought" },
  { key: "tool", labelKey: "tool", fallback: "Tool" },
] as const;

const MessageCountsItems = memo(
  function MessageCountsItems(props: {
    counts: NonNullable<MessageCountsSelection>;
  }) {
    const counts = props.counts;
    const complete = safeText(counts.completeness) === "complete";
    const labels =
      counts.labels && typeof counts.labels === "object" ? counts.labels : {};
    return (
      <>
        {CATEGORIES.map((category) => {
          const label =
            safeText(labels[category.labelKey]) || category.fallback;
          const current = Math.max(
            0,
            Number((counts.current || {})[category.key]) || 0,
          );
          const cumulative = Math.max(
            current,
            Number((counts.cumulative || {})[category.key]) || 0,
          );
          const value = complete ? `${current}/${cumulative}` : String(current);
          return (
            <div
              key={category.key}
              class="assistant-message-counter-item"
              data-message-counter-kind={category.key}
              aria-label={`${label} ${value}`}
            >
              <span class="assistant-message-counter-label">{label}</span>
              <span class="assistant-message-counter-value">{value}</span>
            </div>
          );
        })}
      </>
    );
  },
  (prev, next) => equalBySignature(prev.counts, next.counts),
);

export const MessageCountsRegion = memo(
  function MessageCountsRegion(props: {
    container: HTMLElement;
    selection: MessageCountsSelection;
  }) {
    const { container, selection } = props;
    const present = Boolean(selection && selection.current);
    const lastPresent = useRef<MessageCountsSelection>(null);
    if (present) {
      lastPresent.current = selection;
    }
    const effective = present ? selection : lastPresent.current;
    const signature = stableRegionSignature(selection);
    useLayoutEffect(() => {
      container.classList.toggle("hidden", !present);
      if (present && selection) {
        container.setAttribute(
          "data-message-counter-owner",
          safeText(selection.scopeKey),
        );
      }
    }, [container, signature]);
    if (!effective || !effective.current) {
      return null;
    }
    return <MessageCountsItems counts={effective} />;
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(prev.selection, next.selection),
);

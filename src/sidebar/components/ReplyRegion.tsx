/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";

import {
  equalBySignature,
  replyRegionEqualityInput,
  replyStructuralSignature,
  safeText,
  stableRegionSignature,
} from "./regionEquality";
import { SelectControl, type PanelActionHandler } from "./ActionControls";
import type { LabelOfFn } from "./HintRegion";
import {
  navigateReplyHistory,
  rememberReplyHistory,
  replyHistoryKey,
  resetReplyHistoryNavigation,
  shouldHandleReplyHistoryKey,
} from "./replyHistory";

// Preact port of the imperative renderAssistantReply region
// (src/sidebar/assistantPanelRenderer.js), including the two-tier
// structure/live split: the textarea element is never part of the diffed
// value channel, so focus, caret, and in-progress drafts survive live
// updates; a structure change mirrors the old rebuild and re-syncs the
// value (owner switch).

const INTERRUPT_ACTIONS = new Set([
  "cancel",
  "cancel-run",
  "interrupt-run-turn",
]);

function formatTokenCount(value: unknown): string {
  const numeric = Number(value || 0);
  if (numeric <= 0) return "0k";
  const thousands = numeric / 1000;
  const rounded =
    thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return String(rounded).replace(/\.0$/, "") + "k";
}

function formatUsageLabel(
  used: number,
  limit: number,
  labelOf: LabelOfFn,
): string {
  if (used <= 0 && limit <= 0) return labelOf("usage.unavailable", "N/A");
  if (limit > 0) {
    return formatTokenCount(used) + "/" + formatTokenCount(limit);
  }
  return formatTokenCount(used);
}

function UsageGauge(props: { usage: unknown; labelOf: LabelOfFn }) {
  const source =
    props.usage && typeof props.usage === "object"
      ? (props.usage as Record<string, unknown>)
      : {};
  const total = Number(
    source.used || source.totalTokens || source.usedTokens || 0,
  );
  const inputOutputTotal =
    Number(source.inputTokens || 0) + Number(source.outputTokens || 0);
  const used = total > 0 ? total : inputOutputTotal;
  const limit = Number(
    source.size ||
      source.contextWindow ||
      source.tokenLimit ||
      source.limitTokens ||
      0,
  );
  const percent =
    limit > 0
      ? Math.max(0, Math.min(100, Math.round((used / limit) * 100)))
      : 0;
  const unavailable = used <= 0 && limit <= 0;
  const tokenLabel = formatUsageLabel(used, limit, props.labelOf);
  const centerLabel = unavailable
    ? props.labelOf("usage.unavailable", "N/A")
    : limit > 0
      ? String(percent) + "%"
      : formatTokenCount(used);
  const title = unavailable
    ? props.labelOf("usage.noData", "No usage data")
    : tokenLabel + " " + props.labelOf("usage.tokens", "tokens");
  return (
    <div
      class={
        "assistant-panel-usage-gauge" + (unavailable ? " is-unavailable" : "")
      }
      title={title}
      aria-label={title}
    >
      <span
        class="assistant-panel-usage-ring"
        style={"--assistant-usage-percent: " + percent + "%"}
      >
        <span class="assistant-panel-usage-label">{centerLabel}</span>
      </span>
    </div>
  );
}

type ReplyPanel = Record<string, unknown>;

export const ReplyRegion = memo(
  function ReplyRegion(props: {
    container: HTMLElement;
    panel: ReplyPanel;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
  }) {
    const { container, panel, onAction, labelOf } = props;
    const reply =
      panel.reply && typeof panel.reply === "object"
        ? (panel.reply as Record<string, unknown>)
        : {};
    const lifecycle =
      panel.lifecycle && typeof panel.lifecycle === "object"
        ? (panel.lifecycle as Record<string, unknown>)
        : {};
    const replyAction = safeText(reply.action || "reply");
    const interruptAction = INTERRUPT_ACTIONS.has(replyAction);
    const historyKey = replyHistoryKey(panel);
    const hasValue = Object.prototype.hasOwnProperty.call(reply, "value");
    const submitDisabled =
      reply.enabled !== true || (reply.sending === true && !interruptAction);
    const inputDisabled =
      reply.inputEnabled === false || reply.enabled !== true;
    const controls = Array.isArray(reply.controls)
      ? (reply.controls as Array<Record<string, unknown>>)
      : [];

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const previousStructure = useRef<string | null>(null);
    const signature = stableRegionSignature(replyRegionEqualityInput(panel));
    const structureSignature = stableRegionSignature(
      replyStructuralSignature(panel),
    );

    useLayoutEffect(() => {
      container.setAttribute(
        "data-assistant-reply-enabled",
        reply.enabled ? "true" : "false",
      );
      container.setAttribute(
        "data-assistant-reply-state",
        safeText(lifecycle.replyState),
      );
    }, [container, signature]);

    useLayoutEffect(() => {
      const input = inputRef.current;
      if (!input) return;
      const structureChanged = previousStructure.current !== structureSignature;
      previousStructure.current = structureSignature;
      if (!hasValue) return;
      if (structureChanged) {
        // Mirror the old rebuild path: value is authoritative, and a focused
        // textarea keeps focus and caret across the structural swap.
        const focused = document.activeElement === input;
        const selectionStart = focused ? input.selectionStart : null;
        const selectionEnd = focused ? input.selectionEnd : null;
        input.value = String(reply.value == null ? "" : reply.value);
        if (focused && !input.disabled) {
          input.focus();
          if (
            typeof selectionStart === "number" &&
            typeof selectionEnd === "number" &&
            typeof input.setSelectionRange === "function"
          ) {
            input.setSelectionRange(selectionStart, selectionEnd);
          }
        }
      } else if (document.activeElement !== input) {
        input.value = String(reply.value == null ? "" : reply.value);
      }
    }, [signature, structureSignature, hasValue]);

    const submit = () => {
      const input = inputRef.current;
      if (!input) return;
      if (!interruptAction) rememberReplyHistory(historyKey, input.value);
      onAction(
        replyAction || "reply",
        Object.assign(
          {},
          reply.payload && typeof reply.payload === "object"
            ? (reply.payload as Record<string, unknown>)
            : {},
          { message: safeText(input.value) },
        ),
      );
      resetReplyHistoryNavigation(historyKey);
      if (reply.clearOnSend !== false && !interruptAction) input.value = "";
    };

    return (
      <>
        <textarea
          ref={inputRef}
          class="assistant-panel-reply-input"
          placeholder={safeText(reply.placeholder)}
          disabled={inputDisabled}
          onKeyDown={(event) => {
            const input = inputRef.current;
            if (!input) return;
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              if (!submitDisabled) submit();
              return;
            }
            if (!shouldHandleReplyHistoryKey(event, input)) return;
            if (
              event.key === "ArrowUp" &&
              String(input.value || "").lastIndexOf(
                "\n",
                Math.max(0, Number(input.selectionStart || 0) - 1),
              ) < 0
            ) {
              if (navigateReplyHistory(historyKey, input, -1)) {
                event.preventDefault();
              }
              return;
            }
            if (
              event.key === "ArrowDown" &&
              String(input.value || "").indexOf(
                "\n",
                Number(input.selectionStart || 0),
              ) < 0
            ) {
              if (navigateReplyHistory(historyKey, input, 1)) {
                event.preventDefault();
              }
            }
          }}
          onInput={() => resetReplyHistoryNavigation(historyKey)}
        />
        <div class="assistant-panel-reply-footer">
          <div class="assistant-panel-reply-primary">
            <button
              type="button"
              class="asst-button assistant-panel-reply-submit"
              data-assistant-button-tone={safeText(reply.tone) || "primary"}
              disabled={submitDisabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                submit();
              }}
            >
              {safeText(reply.submitLabel) || labelOf("actions.send", "Send")}
            </button>
          </div>
          {controls.length > 0 ? (
            <div class="assistant-panel-reply-controls">
              {controls.map((control, index) => (
                <SelectControl
                  selector={control}
                  onAction={onAction}
                  key={safeText(control.id) || index}
                />
              ))}
            </div>
          ) : null}
          <div class="assistant-panel-reply-secondary">
            <span class="assistant-panel-reply-hint">
              {safeText(reply.hint)}
            </span>
            {reply.showUsageGauge === true ? (
              <UsageGauge usage={panel.usage} labelOf={labelOf} />
            ) : null}
          </div>
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(
      replyRegionEqualityInput(prev.panel),
      replyRegionEqualityInput(next.panel),
    ),
);

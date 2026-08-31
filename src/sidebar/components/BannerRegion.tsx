/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature, safeText } from "./regionEquality";
import {
  PanelAction,
  SelectControl,
  type PanelActionHandler,
} from "./ActionControls";

// Preact port of the imperative renderAssistantBanner region
// (src/sidebar/assistantPanelRenderer.js). The equality boundary is exactly
// the legacy banner signature: { context, lifecycle }.

export type StatusToneFn = (status: unknown) => string;

function indicatorLedClass(toneValue: unknown): string {
  const tone = safeText(toneValue);
  if (tone === "success") return "is-success";
  if (tone === "warning") return "is-warning";
  if (tone === "error" || tone === "danger") return "is-error";
  if (tone === "accent" || tone === "running") return "is-running";
  return "is-muted";
}

function BannerStatusBadge(props: {
  context: Record<string, unknown>;
  lifecycle: Record<string, unknown>;
  statusTone: StatusToneFn;
}) {
  const { context, lifecycle, statusTone } = props;
  const status = safeText(
    context.mainStatus || context.status || lifecycle.executionState,
  );
  if (!status) return null;
  const label =
    safeText(context.mainStatusLabel || context.statusLabel || status) ||
    status;
  const tone =
    safeText(context.mainStatusTone || context.statusTone) ||
    statusTone(status);
  return (
    <span
      class={
        "assistant-panel-banner-status " +
        "assistant-workspace-drawer-task-main-status is-" +
        (tone || "muted")
      }
      data-assistant-banner-status={status}
    >
      {label}
    </span>
  );
}

function BannerIndicator(props: { entry: Record<string, unknown> }) {
  const source = props.entry;
  const title = safeText(
    source.title || source.tooltip || source.value || source.label,
  );
  const extraValue = safeText(source.extraValue);
  const progressPercent = Number(source.progressPercent);
  const clamped = Math.max(0, Math.min(100, progressPercent));
  return (
    <span
      class="assistant-panel-indicator"
      data-assistant-indicator-id={safeText(source.id)}
      data-assistant-indicator-tone={safeText(source.tone || "muted")}
      data-assistant-indicator-value-visible={
        source.valueVisible === true ? "true" : null
      }
      title={title || undefined}
      aria-label={title || undefined}
    >
      <span class={"asst-led " + indicatorLedClass(source.tone)} />
      <span class="assistant-panel-indicator-label">
        {safeText(source.label || source.id)}
      </span>
      <strong class="assistant-panel-indicator-value">
        {safeText(source.value) || "-"}
      </strong>
      {extraValue ? (
        <span class="assistant-panel-indicator-extra">{extraValue}</span>
      ) : null}
      {Number.isFinite(progressPercent) ? (
        <span
          class="assistant-panel-indicator-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clamped}
        >
          <span
            class="assistant-panel-indicator-progress-fill"
            style={{ width: String(clamped) + "%" }}
          />
        </span>
      ) : null}
    </span>
  );
}

export const BannerRegion = memo(
  function BannerRegion(props: {
    context: Record<string, unknown> | null;
    lifecycle: Record<string, unknown> | null;
    onAction: PanelActionHandler;
    statusTone: StatusToneFn;
  }) {
    const context = props.context || {};
    const lifecycle = props.lifecycle || {};
    const subtitle = safeText(context.subtitle);
    const metadata = Array.isArray(context.metadata) ? context.metadata : [];
    const notice =
      context.notice && typeof context.notice === "object"
        ? (context.notice as Record<string, unknown>)
        : null;
    const status = safeText(
      context.mainStatus || context.status || lifecycle.executionState,
    );
    const indicators = Array.isArray(context.indicators)
      ? (context.indicators as Array<Record<string, unknown>>)
      : [];
    const selectors = Array.isArray(context.selectors)
      ? (context.selectors as Array<Record<string, unknown>>)
      : [];
    const actions = Array.isArray(context.actions)
      ? (context.actions as Array<Record<string, unknown>>)
      : [];
    return (
      <>
        <div class="assistant-panel-banner-main">
          <div class="assistant-panel-banner-title">
            {safeText(context.title) || "Assistant"}
          </div>
          {subtitle ? (
            <div class="assistant-panel-banner-subtitle">{subtitle}</div>
          ) : null}
        </div>
        <div class="assistant-panel-banner-meta">
          {metadata.map((item, index) => {
            const record =
              item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};
            return (
              <span
                class="asst-meta-pill assistant-panel-meta-pill"
                key={safeText(record.key || record.label) || index}
              >
                <strong>
                  {safeText(record.label) || safeText(record.key)}
                </strong>
                <span>{safeText(record.value) || "-"}</span>
              </span>
            );
          })}
        </div>
        {notice && safeText(notice.text) ? (
          <div
            class={
              "assistant-panel-banner-notice is-" +
              safeText(notice.tone || "info")
            }
          >
            {safeText(notice.text)}
          </div>
        ) : null}
        {status || indicators.length > 0 ? (
          <div class="assistant-panel-banner-status-row">
            <BannerStatusBadge
              context={context}
              lifecycle={lifecycle}
              statusTone={props.statusTone}
            />
            {indicators.length > 0 ? (
              <div class="assistant-panel-indicators">
                {indicators.map((entry, index) => (
                  <BannerIndicator
                    entry={entry}
                    key={safeText(entry.id) || index}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {selectors.length > 0 ? (
          <div class="assistant-panel-context-selectors">
            {selectors.map((selector, index) => (
              <SelectControl
                selector={selector}
                onAction={props.onAction}
                key={safeText(selector.id) || index}
              />
            ))}
          </div>
        ) : null}
        {actions.length > 0 ? (
          <div class="assistant-panel-context-actions">
            {actions.map((action, index) => (
              <PanelAction
                action={action}
                onAction={props.onAction}
                key={safeText(action.action) || index}
              />
            ))}
          </div>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    equalBySignature(
      { context: prev.context, lifecycle: prev.lifecycle },
      { context: next.context, lifecycle: next.lifecycle },
    ),
);

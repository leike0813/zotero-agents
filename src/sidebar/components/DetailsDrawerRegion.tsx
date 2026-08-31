/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature, safeText } from "./regionEquality";
import { PanelAction, type PanelActionHandler } from "./ActionControls";
import type { LabelOfFn } from "./HintRegion";

// Preact port of the imperative renderDetailsDrawer region
// (src/sidebar/assistantPanelRenderer.js), including renderDetailsSection and
// renderDetailsEntry. Renders into the region's managed mount; the overlay
// dismiss handler is installed on the container once and survives re-renders
// exactly like installOverlayDismiss did.

export type DetailsDrawerSelection = {
  title: string;
  details: unknown[];
  loading: boolean;
  actions: Array<Record<string, unknown>>;
  labels: { close: string; empty: string; noEntries: string; title: string };
};

function DetailsEntry(props: { entry: Record<string, unknown> }) {
  const entry = props.entry;
  const value = safeText(entry.value || entry.text || entry.message);
  return (
    <div
      class="assistant-panel-details-row"
      data-assistant-details-entry-kind={safeText(entry.kind || "text")}
    >
      <div class="assistant-panel-details-label">
        {safeText(entry.label || entry.key || "Detail")}
      </div>
      {entry.kind === "code" ? (
        <div class="asst-code-surface assistant-panel-details-value">
          {value || "-"}
        </div>
      ) : (
        <div class="assistant-panel-details-value">{value || "-"}</div>
      )}
    </div>
  );
}

function DetailsSection(props: {
  section: Record<string, unknown>;
  labels: DetailsDrawerSelection["labels"];
}) {
  const { section, labels } = props;
  const collapsible =
    section.collapsible === true || section.defaultCollapsed === true;
  const entries = Array.isArray(section.entries)
    ? (section.entries as Array<Record<string, unknown>>)
    : [];
  const header = (
    <>
      <span class="assistant-panel-details-section-title">
        {safeText(section.title) || "Details"}
      </span>
      {safeText(section.summary) ? (
        <span class="assistant-panel-details-section-subtitle">
          {safeText(section.summary)}
        </span>
      ) : null}
    </>
  );
  const body = (
    <div class="assistant-panel-details-section-body">
      {entries.length === 0 ? (
        <div class="assistant-panel-details-empty">{labels.noEntries}</div>
      ) : (
        entries.map((entry, index) => (
          <DetailsEntry entry={entry || {}} key={index} />
        ))
      )}
    </div>
  );
  if (collapsible) {
    return (
      <details
        class="assistant-panel-details-section is-collapsible"
        data-assistant-details-kind={safeText(section.kind || "metadata")}
        data-assistant-details-tone={
          section.tone ? safeText(section.tone) : null
        }
        open={section.defaultCollapsed !== true}
      >
        <summary class="assistant-panel-details-section-summary">
          {header}
        </summary>
        {body}
      </details>
    );
  }
  return (
    <section
      class="assistant-panel-details-section"
      data-assistant-details-kind={safeText(section.kind || "metadata")}
      data-assistant-details-tone={section.tone ? safeText(section.tone) : null}
    >
      <div class="assistant-panel-details-section-summary">{header}</div>
      {body}
    </section>
  );
}

export const DetailsDrawerRegion = memo(
  function DetailsDrawerRegion(props: {
    container: HTMLElement;
    selection: DetailsDrawerSelection;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
  }) {
    const { container, selection, onAction, labelOf } = props;
    useLayoutEffect(() => {
      container.onclick = (event) => {
        const panel = container.querySelector(":scope > .asst-drawer-panel");
        const target = event && (event.target as Node | null);
        if (panel && target && panel.contains(target)) {
          if (typeof event.stopPropagation === "function") {
            event.stopPropagation();
          }
          return;
        }
        onAction("close-details-drawer", {});
      };
    }, [container]);
    const actions = Array.isArray(selection.actions) ? selection.actions : [];
    const details = Array.isArray(selection.details) ? selection.details : [];
    return (
      <>
        <div class="assistant-panel-details-header">
          <strong>
            {selection.title || labelOf("details.title", "Details")}
          </strong>
          {actions.length > 0 ? (
            <div class="assistant-panel-details-actions">
              {actions.map((action, index) => (
                <PanelAction
                  action={action}
                  onAction={onAction}
                  key={safeText(action.action) || index}
                />
              ))}
            </div>
          ) : null}
          <button
            type="button"
            class="asst-button-compact"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction("close-details-drawer", {});
            }}
          >
            {labelOf("actions.close", "Close")}
          </button>
        </div>
        <div class="assistant-panel-details-list">
          {details.length === 0 ? (
            <div class="assistant-panel-details-empty">
              {selection.loading === true
                ? labelOf("details.loading", "Loading details...")
                : selection.labels.empty}
            </div>
          ) : null}
          {details.map((section, index) => {
            if (typeof section === "string") {
              return (
                <pre
                  class="asst-code-surface assistant-panel-details-entry"
                  key={index}
                >
                  {section}
                </pre>
              );
            }
            if (!section || typeof section !== "object") return null;
            return (
              <DetailsSection
                section={section as Record<string, unknown>}
                labels={selection.labels}
                key={index}
              />
            );
          })}
        </div>
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(prev.selection, next.selection),
);

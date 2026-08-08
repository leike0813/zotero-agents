/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature, safeText } from "./regionEquality";
import { PanelAction, type PanelActionHandler } from "./ActionControls";
import type { LabelOfFn } from "./HintRegion";

// Preact port of the imperative renderPermissionRequestDrawer region
// (src/sidebar/assistantPanelRenderer.js). The overlay element itself is
// created by the seam as a direct child of the panel root (matching the old
// renderer); this component owns its visibility class and sheet content.

export type PermissionDrawerSelection = {
  open: boolean;
  request: Record<string, unknown> | null;
  labels: { close: string; title: string };
};

export const PermissionDrawerRegion = memo(
  function PermissionDrawerRegion(props: {
    container: HTMLElement;
    selection: PermissionDrawerSelection;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
  }) {
    const { container, selection, onAction, labelOf } = props;
    const open = selection.open === true && !!selection.request;
    useLayoutEffect(() => {
      container.classList.toggle("hidden", !open);
      if (!open) return;
      // Overlay dismiss: clicks outside the sheet close the drawer; clicks
      // inside stop propagating, exactly like the imperative handler.
      container.onclick = (event) => {
        const sheet = container.querySelector(
          ":scope > .assistant-panel-permission-drawer-panel",
        );
        const target = event && (event.target as Node | null);
        if (sheet && target && sheet.contains(target)) {
          event.stopPropagation();
          return;
        }
        onAction("close-permission-request", {});
      };
    }, [container, open]);
    if (!open) return null;
    const request = selection.request!;
    const review =
      request.review && typeof request.review === "object"
        ? (request.review as Record<string, unknown>)
        : {};
    const meta = [
      safeText(request.approvalKind)
        ? labelOf("permission.source", "Source") +
          ": " +
          (safeText(request.approvalKind) === "zotero-write"
            ? labelOf("permission.sourceZotero", "Zotero")
            : labelOf("permission.sourceAcp", "ACP backend"))
        : "",
      safeText(review.requestedAt)
        ? labelOf("permission.requestedAt", "Requested") +
          ": " +
          safeText(review.requestedAt)
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const command =
      safeText(review.command) ||
      safeText(review.preview) ||
      safeText(request.summary) ||
      safeText(request.toolTitle) ||
      labelOf("permission.title", "Permission request");
    const actions = Array.isArray(request.actions)
      ? (request.actions as Array<Record<string, unknown>>)
      : [];
    return (
      <aside class="assistant-panel-permission-drawer-panel">
        <div class="assistant-panel-permission-drawer-header">
          <div class="assistant-panel-permission-drawer-title-stack">
            <strong>
              {safeText(request.toolTitle) ||
                labelOf("permission.title", "Permission request")}
            </strong>
            <div class="assistant-panel-permission-drawer-subtitle">
              {safeText(request.summary) ||
                labelOf(
                  "permission.reviewHint",
                  "Review this request before choosing.",
                )}
            </div>
          </div>
          <button
            type="button"
            class="asst-button-compact"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction("close-permission-request", {});
            }}
          >
            {labelOf("actions.close", "Close")}
          </button>
        </div>
        {meta ? (
          <div class="assistant-panel-permission-drawer-meta">{meta}</div>
        ) : null}
        <pre class="assistant-panel-permission-drawer-command">{command}</pre>
        {actions.length > 0 ? (
          <div class="assistant-panel-permission-drawer-actions">
            {actions.map((action, index) => (
              <PanelAction
                action={action}
                onAction={onAction}
                key={safeText(action.action) || index}
              />
            ))}
          </div>
        ) : null}
      </aside>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(prev.selection, next.selection),
);

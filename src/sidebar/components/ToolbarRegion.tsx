/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature, safeText } from "./regionEquality";
import { PanelAction, type PanelActionHandler } from "./ActionControls";

// Preact port of the imperative renderToolbar region
// (src/sidebar/assistantPanelRenderer.js). Renders into the region's
// managed mount; actions aligned "end" go to the end group, and empty
// groups are omitted, exactly like the imperative original.
//
// The equality boundary is the toolbar action list only. onAction must be
// a stable callback (the child passes its runtime-stable handlePanelAction).

export const ToolbarRegion = memo(
  function ToolbarRegion(props: {
    actions: unknown;
    onAction: PanelActionHandler;
  }) {
    const actions = Array.isArray(props.actions) ? props.actions : [];
    const startActions = actions.filter(
      (action) => safeText(action && action.align) !== "end",
    );
    const endActions = actions.filter(
      (action) => safeText(action && action.align) === "end",
    );
    return (
      <>
        {startActions.length > 0 && (
          <div class="assistant-panel-toolbar-group assistant-panel-toolbar-group-start">
            {startActions.map((action, index) => (
              <PanelAction
                key={safeText(action && action.action) || index}
                action={action}
                onAction={props.onAction}
              />
            ))}
          </div>
        )}
        {endActions.length > 0 && (
          <div class="assistant-panel-toolbar-group assistant-panel-toolbar-group-end">
            {endActions.map((action, index) => (
              <PanelAction
                key={safeText(action && action.action) || index}
                action={action}
                onAction={props.onAction}
              />
            ))}
          </div>
        )}
      </>
    );
  },
  (prev, next) => equalBySignature(prev.actions, next.actions),
);

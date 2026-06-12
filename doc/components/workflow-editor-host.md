# Workflow Editor Host

## Overview

The Workflow Editor Host (`src/modules/workflowEditorHost.ts`) is a generic
editor session framework used by the workflow debug probe and workflow settings
dialog. It manages renderer registration, session lifecycle, and action
dispatch.

---

## Core Types

```typescript
type WorkflowEditorRenderer<TState = unknown, TContext = unknown> = {
  render: (args: WorkflowEditorRenderArgs<TState, TContext>) => void;
  serialize?: (args: { state: TState; context?: TContext }) => unknown;
};

type WorkflowEditorAction = {
  id: string;
  label: string;
  noClose?: boolean;
  onClick?: (args: {
    state: unknown;
    context?: unknown;
    closeWithAction: (actionId?: string) => void;
    rerender: () => void;
    serialize: () => unknown;
  }) => void;
};

type WorkflowEditorOpenArgs<TState = unknown, TContext = unknown> = {
  rendererId: string;
  title: string;
  initialState: TState;
  context?: TContext;
  renderer?: WorkflowEditorRenderer<TState, TContext>;
  layout?: WorkflowEditorLayout;
  labels?: WorkflowEditorLabels;
  actions?: WorkflowEditorAction[];
  closeActionId?: string;
  detached?: boolean;
  autoClose?: { afterMs: number; actionId: string };
};

type WorkflowEditorOpenResult = {
  saved: boolean;
  result?: unknown;
  reason?: string;
  actionId?: string;
};
```

---

## API

| Function | Purpose |
|----------|---------|
| `registerWorkflowEditorRenderer(rendererId, renderer)` | Register a renderer by ID |
| `unregisterWorkflowEditorRenderer(rendererId)` | Unregister a renderer |
| `openWorkflowEditorSession(args)` | Open an editor session, returns `WorkflowEditorOpenResult` |
| `installWorkflowEditorHostBridge()` | Install functions to global scope (`addon.data.workflowEditorHost`) |
| `clearWorkflowEditorRendererRegistry()` | Clear all registered renderers (tests) |
| `createWorkflowEditorPanelContainer(doc)` | Create a DOM container element for the editor panel |

---

## Integration

`installWorkflowEditorHostBridge()` exposes three functions globally:

| Global key | `addon.data.workflowEditorHost` | Purpose |
|-----------|-------------------------------|---------|
| `__zsWorkflowEditorHostOpen` | `.open(args)` | Open an editor session |
| `__zsWorkflowEditorHostRegisterRenderer` | `.registerRenderer(id, renderer)` | Register a renderer |
| `__zsWorkflowEditorHostUnregisterRenderer` | `.unregisterRenderer(id)` | Unregister a renderer |

The framework is used by:

- **Workflow Debug Probe** (`src/modules/workflowDebugProbe.ts`) — registers a
  `"workflow-debug-probe"` renderer that displays diagnostic results in a
  structured dialog.
- **Workflow Settings Dialog** — uses `openWorkflowEditorSession` to present
  the workflow configuration form.

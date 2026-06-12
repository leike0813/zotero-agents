# Assistant Copy and Input UX

## Overview

The assistant workspace sidebar (`src/modules/assistantWorkspaceSidebar.ts`)
manages user interactions including clipboard copy, reply submission, and
child-frame communication via `postMessage`.

---

## Copy Operations

Two clipboard copy actions are available:

| Action | Trigger | Implementation |
|--------|---------|---------------|
| `copy-request-id` | Button/context menu | `copyText(requestId)` copies the request ID string |
| `copy-diagnostics` | Button/context menu | `JSON.stringify(snapshot)` copies the full runtime snapshot as formatted JSON |

Both use the `copyText` utility from `src/utils/ztoolkit.ts`.

---

## Reply and Prompt Submission

### ACP Chat

When the user submits a chat prompt:

```typescript
action === "send-prompt"
  → const message = String(payload.message || "").trim()
  → if empty: reject
  → sendAcpConversationPrompt({ message, hostContext: {
      target: "library" | "reader",
      libraryId,
      selectionEmpty,
      currentItem,
    }})
```

### ACP Skill Run

When the user replies to a skill run interaction:

```typescript
action === "reply-run"
  → replyAcpSkillRun({
      requestId: String(payload.requestId),
      message: String(payload.message),
    })
```

---

## PostMessage Communication Protocol

The sidebar communicates with iframe-based child "workspace" pages through
`postMessage`:

| Message Type | Direction | Payload | Trigger |
|-------------|-----------|---------|---------|
| `assistant-workspace:init` | Parent → Child | `{ activeTab }` | Activation or initialization |
| `assistant-workspace:child-snapshot` | Child → Parent | `{ tab, phase: "init"\|"snapshot", snapshot }` | Tab data ready |
| `assistant-workspace:action` | Parent → Child | Action request | User interaction in sidebar |
| `assistant-workspace:child-action` | Child → Parent | Action result | Action processed by child |

---

## Sidebar Button

`buildSidebarButton(doc, win, id, label)` creates a XUL `toolbarbutton`:

- CSS class: `"zotero-tb-button zs-assistant-sidebar-button"`
- Attribute: `data-zs-role="assistant-sidebar-entry"`
- Image: `SKILLRUNNER_ICON_URI` via `applyToolbarButtonStyling(button, icon, 26)`
- Tooltip and aria-label from localized label

`setButtonSelected(button, selected)` toggles `aria-pressed` and
`data-zs-selected` attributes for selection state management.

---

## Localization

| Key | Default | Usage |
|-----|---------|-------|
| `task-dashboard-sidebar-assistant` | `"Assistant"` | Sidebar button tooltip and aria-label |
| `task-dashboard-run-completed-tasks-title` | `"Completed"` | Drawer section header |
| `task-dashboard-run-running-tasks-title` | `"Running"` | Drawer section header |

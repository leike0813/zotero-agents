## Why

Assistant conversations, run details, logs, and permission previews often contain text users need to copy into issues, prompts, notes, or follow-up commands. Several Assistant surfaces currently make that text hard to select or copy, and code fences require manual drag selection.

## What Changes

- Make Assistant-first text surfaces explicitly selectable, including transcripts, markdown bodies, details values, code surfaces, permission previews, and log-like drawer content.
- Add a small copy handle to markdown fenced code blocks rendered in conversation transcripts.
- Add session-local ArrowUp/ArrowDown history navigation to the shared reply textarea.
- Keep pure controls such as buttons, tabs, selectors, and collapsible summaries optimized for interaction rather than text selection.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `assistant-sidebar-ui`: Assistant panels expose copy-friendly transcript, code, details, and reply composer behavior.

## Impact

- Code:
  - Shared Assistant transcript renderer.
  - Shared Assistant panel reply renderer.
  - Shared Assistant panel CSS.
- APIs:
  - No host, transport, workflow, or snapshot schema changes.
- Tests:
  - Extend ACP UI smoke coverage for copy handles, selectable surfaces, and reply history behavior.

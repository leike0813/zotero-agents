## Context

ACP Chat, ACP Skills, and SkillRunner run dialogs all flow through the shared Assistant renderer stack. The most stable implementation point is therefore the shared transcript renderer, shared reply renderer, and shared Assistant CSS rather than each page-specific wrapper.

## Approach

- Treat this as an Assistant-first UX improvement. The change applies to conversation windows, managed reply zones, details drawers, permission previews, and run-dialog Assistant surfaces.
- Add text selection CSS to content-bearing nodes, not to every element globally. This avoids fighting with controls while making the surfaces users actually copy from selectable.
- Decorate code fences after markdown rendering. The renderer already owns message/process markdown bodies, so it can add copy handles without changing markdown-it configuration.
- Keep reply history in memory only. The feature is convenience for the current Assistant page lifetime and does not create persistence, privacy, or sync behavior.

## Edge Cases

- Clipboard access may be restricted in some Zotero/chrome contexts. The copy helper falls back to a temporary textarea and `execCommand("copy")`; text remains selectable even if programmatic copy fails.
- Arrow history must not steal normal multiline editing. It only activates at first/last line with collapsed selection and no modifier keys.
- Re-rendering managed reply zones must keep the existing focused textarea behavior and not lose local drafts during unrelated snapshot updates.

## Non-goals

- Do not extend the scope to all Dashboard, Synthesis Workbench, settings, or custom select surfaces.
- Do not persist reply history across page reloads or Zotero restarts.
- Do not add per-block copy handles to every raw/log surface; those surfaces become selectable in this change.

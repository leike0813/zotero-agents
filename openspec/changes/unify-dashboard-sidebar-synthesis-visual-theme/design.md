# Design

## Theme Foundation

`addon/content/shared/theme.css` is the visual token source of truth for browser
surfaces. It defines background, panel, border, text, accent, status, focus,
shadow, radius, and font tokens under `--zs-*`.

`addon/content/shared/theme.js` applies the selected theme early by setting:

- `data-zs-theme="light"` for explicit light mode.
- `data-zs-theme="dark"` for explicit dark mode.
- no `data-zs-theme` for system mode.

The selected value is stored as `zotero-skills.theme` in local storage. Each
iframe loads the same runtime so independent documents can converge on the same
theme choice.

## Semantic Token Mapping

Existing page-specific tokens remain as compatibility aliases:

- Dashboard maps `--bg`, `--panel`, `--text`, `--line`, and status colors to
  `--zs-*`.
- Assistant panels map `--asst-*` to `--zs-*`.
- Synthesis Topic Detail maps `--topic-*` to `--zs-*`.

This avoids a large CSS rewrite while making new styling consume one visual
foundation.

## Theme Switch

The unified Workspace topbar exposes a compact `System / Light / Dark` switch.
The switch updates the shared runtime and re-renders its active state. Child
iframes observe local-storage updates and apply the same theme choice when
their document receives the storage event or reloads.

## Dark Mode Scope

The first pass targets the stable visible surfaces:

- Dashboard shell, sidebar, tabs, cards, tables, forms, logs, product preview.
- Assistant workspace tab shell.
- ACP Chat, ACP Skills, and SkillRunner shared panel shell, drawers,
  conversation surface, transcript rows, reply input, and details sections.
- Synthesis Workbench and structured Topic Detail.
- Custom select dropdowns and workflow settings dialog.

Remaining hard-coded colors are acceptable only where they are explicit
semantic fills, timeline gradients, or white text on colored buttons.

## Accessibility

Theme tokens preserve contrast for light and dark surfaces. Focus rings are
centralized through `--zs-focus-ring` and visible in both modes. The UI does not
use color as the only state indicator for running/error states; existing labels
and structure remain intact.


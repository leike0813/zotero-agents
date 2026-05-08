# Design: Unified Assistant Details Drawer

## Details Model

The managed panel keeps using `drawers.details`, but each section may now include:

- `title`: visible section title.
- `summary`: short header-side description.
- `entries`: row entries rendered as label/value or code surfaces.
- `kind`: semantic category such as `metadata`, `diagnostics`, `logs`, `result`, or `revisions`.
- `tone`: optional visual tone.
- `collapsible`: whether the section uses a collapsible card.
- `defaultCollapsed`: initial collapsed state.

Sections without `collapsible` continue to render open for compatibility.

## Rendering

`AssistantPanelRenderer.renderDetailsDrawer()` owns the drawer shell, header actions, close action, section layout, empty state, and collapsible card rendering. Page-specific scripts must not render visible Details drawer bodies.

The drawer uses a fixed two-row layout:

- Header row: title, diagnostic/export actions, close.
- Body row: scrollable details section list.

Heavy content entries use bounded code surfaces so logs and JSON do not expand the drawer beyond the viewport.

## Action Placement

Details actions are limited to diagnostics/export/artifact actions, for example `copy-diagnostics`, `copy-request-id`, and `open-workspace`.

Backend management, provider management, or other global backend actions belong in the outer toolbar. ACP Chat, ACP Skills, and SkillRunner all expose backend management through their toolbar when hosted by the unified Assistant shell.

## SkillRunner Boundary

SkillRunner Details must not render complete transcript/conversation history or full raw envelope dumps. It may render current task metadata, pending interaction metadata, conversation counts/latest row metadata, revision/replacement summaries, and diagnostic actions such as `copy-request-id` and `copy-diagnostics`. Full diagnostics can still be copied through `copy-diagnostics`.

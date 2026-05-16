## Decisions

- The unified entry point is a Zotero main-area tab.
- Dashboard remains host-owned and opens through the existing Dashboard
  runtime. The workspace shell exposes it as a first-class entry instead of
  duplicating Dashboard bridge logic.
- Synthesis remains a Zotero tab workbench and receives the deeper UI rewrite.
- Markdown reader remains an immersive main view, not a modal or drawer.
- Topic cards use data supplied by the Synthesis service/model, not DOM-only
  inference.

## UI System

The visual direction is a dense professional workbench:

- compact spacing with clear visual hierarchy;
- restrained teal/blue accents, with orange only for destructive or strong
  calls to action;
- visible focus rings for keyboard navigation;
- cards and table rows with stable hover states;
- no emoji icons as controls.

## Data Model

`SynthesisUiArtifactRow` gains:

- `paper_count`
- `summary`
- `completion`

The service derives these from persisted topic definitions, resolved paper sets,
and artifact dependency state where available.

## Risk

The Dashboard dialog code is large and stateful. Duplicating it inside a new tab
would risk diverging behavior. This change creates the unified tab shell and
routes Dashboard entry actions through the existing implementation first.

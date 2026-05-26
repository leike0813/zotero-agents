## Design

The Workbench will treat each review domain as a local queue. A domain may have
zero or more open review items, but the UI renders only the first current item
as a detailed card. Decisions continue to use the existing host commands; after
the service refreshes the snapshot, the next open item naturally becomes the
current card.

Domains included in v1:

- Tags import preview.
- Concept review items.
- Topic Graph suggested relations and relation review items.
- Literature cleanup proposals.
- Git Sync conflict assets.

Review cards use the same visual structure across domains:

- heading, kind badge, status/source badge;
- body text with reason, impact, evidence, diagnostics, or affected assets;
- optional candidate selector or conflict examples;
- existing host-command action buttons, which already use single-flight pending
  feedback.

The card is non-modal and does not block reading or navigation. It should not be
rendered when there is no item. Tags are the only special case: the import
textarea is hidden by default and appears when the user clicks Import Tags or
when an import preview already exists.

## Boundaries

- No canonical schema changes.
- No service facade changes.
- No global cross-domain review queue.
- Close/collapse is local UI state only and does not change canonical review
  state.
- Reduced-motion users receive the same layout without transition animation.

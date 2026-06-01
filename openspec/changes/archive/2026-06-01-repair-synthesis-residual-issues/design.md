## Overview

This repair keeps the current staged Registry rebuild and durable related-items outbox model, but fixes the ordering rule between them. Validation should block unsafe pending writes before promotion, while stale applied writes must be allowed through so the promoted active graph can drive revocation.

## Decisions

- `pending_external_write` related-items effects remain blocking during Registry candidate validation. A candidate that cannot resolve the effect's source/target literature items, active Zotero bindings, or matched backing edge cannot be promoted.
- `applied` Synthesis-created effects with a missing backing edge are no longer validation errors. They produce bounded warning diagnostics and are reconciled by the related-items worker after promotion.
- Applied effects do not require active candidate bindings for validation because revocation uses durable Zotero source/target keys saved in the effect row.
- Full Registry rebuild promotion schedules `related_items_sync_dirty` when the promoted graph contains matched library-to-library citation edges or durable Synthesis-created applied effects may need revocation.
- The dirty event remains idempotent; related-items sync still avoids duplicate writes when an active effect already exists.
- Discovery hints do not have an accept action. Restoring a rejected hint only returns it to open; topic update source selection remains a separate workflow concern.
- ISBN is a strong normalized work anchor that can converge duplicate rows directly. DOI/arXiv duplicate Zotero-bound rows continue to produce P0 dedupe review unless an accepted redirect already exists.
- Echo suppression stays durable and single-consume with a 10-minute window. When notifier `extraData` includes a related target key, matching is pair-specific. Without it, item-level fallback may suppress one real modify on the same item inside the window; this is an accepted Zotero notifier granularity risk.

## Risks

- Existing active specs include some historical delta-style files. This change only normalizes Synthesis specs that would otherwise mislead current implementation work.
- Zotero notifier `extraData` is not guaranteed to include related target keys, so the fallback behavior must remain explicit and tested.
- The full core suite has unrelated baseline failures; focused Synthesis tests are the gating signal for this repair.

# Design

## Literature Cleanup Snapshot Source

Workbench snapshots should combine projection data with canonical cleanup
proposal state. Projection rows remain useful for registry tables, but cleanup
proposal review status must come from canonical `cleanup-proposals/*.json`
records so that `approve`, `reject`, and `skip` are visible immediately after
the canonical transaction.

The snapshot input will enrich cleanup proposals with human-readable context:

- source paper title when the source paper can be resolved;
- reference title or raw reference text when the reference instance can be
  resolved;
- target paper/work title when available;
- proposal kind, status, reason, diagnostics, and a short decision summary.

`proposal_id` remains available for command routing/debugging but is not the
primary UI text.

## Topic Graph Review Cards

Topic Graph review cards should be relation-first:

`<source topic title> -> <relation> -> <target topic title>`.

The card body should show the decision context: relation type, confidence,
evidence/provenance, diagnostics, and what accepting/rejecting changes. Edge or
review ids are implementation details and must not be primary content.

## Optimistic Domain Review Queues

The frontend keeps a process-local `optimisticReviewDecisions` set keyed by
domain item, for example:

- `cleanup:<proposal_id>`
- `topic-edge:<edge_id>`
- `topic-review:<review_id>`
- `concept-review:<review_id>`
- `tag-import:<preview signature>`
- `git-conflict:<asset path>`

When a review action is submitted, the current item is locally hidden before the
host command finishes. The same scoped command remains single-flight. If the
command succeeds, the next authoritative snapshot naturally removes the item or
keeps it hidden until it disappears. If the command fails, the optimistic marker
is removed and the item reappears with a failed-action status.

## Render Stability

Background snapshots should not reset user position. The Workbench renderer
will capture view scroll state before re-rendering and restore it afterward for
the main content and common scroll containers. Status-only updates should remain
lightweight where practical. Heavy widgets should not be destroyed merely
because async action state changed.

This is a Workbench frontend stability rule; it does not allow read paths to
trigger rebuild jobs.

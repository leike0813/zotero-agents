# Fix Synthesis Review Action Closure

## Summary

Close the remaining Synthesis Workbench human-review gaps: cleanup and topic graph
review cards must show decision-ready information, review actions must appear to
advance immediately, and snapshot refreshes must stop resetting scroll or
flickering unchanged pages.

## Problem

The current review UI still exposes implementation identifiers as primary
content in several places. Literature Cleanup often shows `proposal_id`,
Zotero item keys, and a generic reason, so the user cannot tell what decision is
being requested. Topic Graph relation review similarly gives too much priority
to ids and template-like reason text while truncating the actual relation.

The action closure is also incomplete. Cleanup actions can succeed in canonical
storage, but the next Workbench snapshot reads stale projection proposals, so
the same proposal appears again. Review card queues wait for the backend promise
before moving to the next card, which defeats the purpose of a fast review
workflow. Background snapshots can rebuild large parts of the Workbench DOM and
reset scroll position.

## Goals

- Read Literature Cleanup proposal status from canonical records for Workbench
  snapshots, not only stale projection rows.
- Enrich cleanup review DTOs with paper/reference/work titles and decision
  context.
- Render Topic Graph review cards with complete source/relation/target titles
  and evidence-oriented details instead of ids as primary content.
- Optimistically advance domain review queues immediately after a scoped review
  action is submitted, while restoring the item on failure.
- Preserve scroll position and avoid unnecessary full-page visual resets during
  background snapshot updates.

## Non-Goals

- No canonical schema change.
- No global cross-domain review center.
- No new background job semantics.
- No complex paper/work merge workflow for cleanup proposals.
- No production data migration.

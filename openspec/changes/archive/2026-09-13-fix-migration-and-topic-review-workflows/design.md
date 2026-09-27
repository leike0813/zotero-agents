## Context

See [proposal.md](./proposal.md) for motivation. Migration already has one
Dashboard-local lifecycle service, durable run/set receipts, and a bounded
snapshot transport, but its mutation outcome mapping and UI projection did not
represent the real transaction. Topic relation approval is owned by the Rust
Synthesis application, while the hosted Topics and Review Center surfaces
project its canonical rows.

## Goals / Non-Goals

**Goals:**

- Keep migration lifecycle, progress, and outcome classification in the
  existing Dashboard-local service.
- Make approval and edge confirmation one canonical Topic Graph decision.
- Preserve bounded DTOs, existing host actions, and existing surface owners.
- Keep historical terminal decisions inspectable without presenting them as
  open work.

**Non-Goals:**

- No resumable replay of an old migration plan; Continue performs a fresh scan.
- No new migration worker, event bus, Topic Graph owner, or transport contract.
- No rewrite of old Topic Graph rows or old migration receipts.

## Decisions

### 1. Classify migration from canonical mutation outcomes

The migration service maps committed and unchanged mutations to applied,
repair-required and unknown outcomes to attention, and failed or canceled
outcomes to failure. A failed set is durably recorded and stops admission of
later sets; earlier committed receipts remain intact.

This keeps the Broker mutation result as the side-effect authority. Treating a
resolved Broker call as success was rejected because it loses terminal outcome
semantics; adding compensating global rollback was rejected because sets are
independent commits.

### 2. Reuse the existing snapshot refresh path for progress

Scan and apply report bounded progress through the migration service's existing
active snapshot. Dashboard actions publish an immediate refresh when the
operation starts and refresh again on progress. The migration region derives
busy, progress, and disabled controls from that snapshot while leaving Stop
enabled.

A second polling owner or page-local simulated percentage was rejected because
both would duplicate lifecycle state and could disagree with the runtime.

### 3. Extend existing receipts for history detail

The existing migration set receipt gains the parent title and retains bounded
counts, outcomes, reason codes, and diagnostics. The history region projects a
run list and selected-run set details from those receipts. The SQLite table is
upgraded in place with an additive title column; older rows use an empty-title
fallback.

A separate history store was rejected because receipts already are the durable
record. Raw parent refs and legacy payloads remain outside the Dashboard DTO.

### 4. Keep responsive migration layout in CSS

The toolbar uses one full-width row when space permits. At the existing narrow
breakpoint, command/status controls remain on the first row and search/filters
move to the second; the smallest layout uses a two-column filter grid.

JavaScript width measurement was rejected because CSS grid and media queries
cover the required layout without new state or observers.

### 5. Make Topic review approval atomic in the Rust application

Approving an open review item updates that review and confirms its canonical
edge tuple in one repository transaction. A confirmed `broader_than` approval
then uses the same post-commit discovery refresh as direct edge acceptance;
other relations skip that refresh. Refresh failure remains a post-commit
warning and does not undo the confirmed edge.

Keeping approval and edge acceptance as two user actions was rejected because
it leaves contradictory open and terminal representations of one decision.

### 6. Filter open review work at projection boundaries

Topics exposes only suggested edges and open review items. Review Center uses
the same terminal classification for Open, while Accepted and All retain the
decision history. For pre-fix data containing both an approved/rejected review
and a stale suggested edge for the same tuple, projection suppresses the stale
open row without rewriting history.

## Risks / Trade-offs

- [Older migration receipts have no title] → Render the existing fallback label
  while all new receipts persist the scanned parent title.
- [Canonical Topic approval commits but discovery refresh fails] → Preserve the
  committed decision and return a bounded post-commit warning for retry or
  maintenance.
- [Legacy Topic rows contain approved plus suggested duplicates] → Collapse the
  tuple only in review projections; canonical writes prevent new duplicates.

## Migration Plan

1. Apply the additive migration-receipt title column upgrade when the plugin
   state store opens.
2. Deploy the migration and Topic Graph behavior in the normal plugin/sidecar
   build; no data rewrite is required.
3. Existing Topic review residue is hidden by compatibility projection and is
   replaced by canonical state when subsequently reviewed.

Rollback can use the prior build: the added SQLite column is backward-tolerant,
and no existing receipt or Topic Graph row is deleted or rewritten in bulk.

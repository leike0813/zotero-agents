# Design

## Context

See proposal.md. The migration owner holds process-local plans and durable bounded receipts. The Broker reads native facts; canonical writes use one authority parent-set transaction. Reproduction found a 1 MiB Citation reparse after issue state mutation; retry skipped that issue. Dashboard currently shows batch commands above a filtered paged list.

## Goals / Non-Goals

**Goals:** atomic review decisions, one owner for policy and eligibility, bounded problem guidance, cooperative calculation, startup discovery with explicit final write consent.

**Non-Goals:** Rust conversion, remote migration commands, group-library migration, durable executable previews, dependency changes.

## Decisions

### Local decision ownership

Keep policies and effective choices in the migration service. Stage immutable candidate results from base conversion, validate using the migration intermediate budget, then classify canonical write eligibility at the existing canonical budget. An unrepresentable candidate remains blocked; skip never reparses its artifact. Publish the entire staged batch only after all calculations succeed. Typed failures contain candidate ID and stable validation issues. UI state never authorizes writes.

Issue choices carry `decisionSource: batch | individual`; selection carries `selectionSource: automatic | individual`. Bulk commands update every issued issue of their reason across the full plan, retaining individual overrides. An empty individual option restores the current group policy; an empty group kind removes its policy. Recompute automatic inclusion after each successful decision, preserving explicit exclusions. Changing selections or applying during calculation returns busy. Async calculation shares the same semantic core as synchronous import/review.

### Bounded Dashboard contract

Add optional problem groups, last-decision feedback, original reason codes, origin fields and bounded original affected facts to existing migration DTOs. Groups include resolved issues so users can go back and change decisions. The wizard uses overview, nonempty ordered issue groups, review and results. Search only affects the displayed rows; batch commands omit query. The apply command is available only on final review and still requires confirmation. Individual exceptions and current effect counts stay visible in list/detail/history.

### Cooperative execution

Reuse the pure conversion core with a cooperative driver; yield during reference/mention and compaction loops, not only between papers. Scanning progress covers reading and conversion. A staged async batch holds the existing single-flight owner, checks stop between work slices and never publishes on stop. A heartbeat/cancel test verifies observable responsiveness rather than internal callback ordering.

### Startup coordinator

One module schedules first/upgrade checks after runtime and main-window readiness. Use the startup add-on version and migration definition with a profile-local preference marker. Wait for local migration activity/preview review to settle. Reuse the service, toolkit progress and two-button dialog. Store success only after a complete check; failures remain retryable. Open navigates with the issued run identity; shutdown closes toast and cancels uncommitted work. No automatic apply or old-preview replay.

### Persistence

Extend the existing set receipt with a bounded decision-summary JSON field and selection origin, using additive schema initialization. Store issue reason, selected kind and origin only, never raw conversion input. Old receipts project empty evidence. Restart requires a fresh explicit review preview; receipts remain observational.

## Risks / Trade-offs

- Large artifacts → preserve private recovery budget and strict canonical write limit; do not increase global limits.
- Multi-window mutations → one service owner locks staging and publishes atomically.
- UI drift → extend current region/browser tests and keep shared tokens/scroll ownership.
- Private library acceptance → source is read-only; tests operate on copies and retain only sanitized structural evidence.

## Migration Plan

Add preference and receipt fields without rewriting source notes. Bump migration definition for changed decision semantics. Verify focused TDD slices, types/localization, current-source sidecar E2E and a copied-source migration. Keep the change active for review; no automatic archive, commit or release.

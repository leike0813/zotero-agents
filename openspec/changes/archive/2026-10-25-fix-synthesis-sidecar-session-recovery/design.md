# Design

## Context

See proposal.md for the incident. Restart attempts share one supervisor generation, so a generation check alone cannot reject an earlier attempt's delayed callback. Existing supervisor factories and Workbench port-based tests provide the agreed regression boundaries.

## Goals / Non-Goals

**Goals:** keep a successful replacement supervised; retire each session once; preserve causal diagnostics; stop unavailable polling chatter.

**Non-Goals:** native runtime changes, storage migration, mutation replay, new diagnostic stores, building/installing an XPI, or altering the live Zotero instance.

## Decisions

- Keep ownership in the current supervisor. Claim failure synchronously before awaiting teardown, share one teardown promise per session, and revalidate generation/session identity after asynchronous boundaries. Reject a generation-only fence because retries retain the same generation.
- Revoke ready status before teardown so Reverse Host bindings and Workbench observe loss promptly. Late startup work may only retire its own process, never publish readiness or replace the current session.
- Reuse the control client's existing bounded stable-code normalization for trace and lifecycle log cause. Keep ordinary business audit entries unchanged and add no persistent diagnostic snapshot.
- Reuse Workbench status subscription and existing polling ownership. A known non-ready state suspends RPC reads; unknown unavailable failures use a five-second retry delay, reset by a ready transition. Preserve cached content and the maintenance observer's original deadline and error semantics.
- Use TDD at the existing supervisor and mounted Workbench seams, with controllable process/clock boundaries. Assert connection continuity, bounded launches, preserved data, and no reads after disposal rather than internal field names.

## Risks / Trade-offs

- Immediate loss publication can expose existing readiness assumptions: cover concurrent failure, stop, and replacement through public snapshots and connections.
- Async spawn may finish after stop: retain enough ownership to stop that returned process without touching a successor.
- The first health failure's original trigger remains unknown: persist its normalized cause for future incidents.

## Migration Plan

No data or protocol migration. Deliver source and focused validation only; deployment and live acceptance are separate work.

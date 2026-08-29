## Context

WS5 has executable evidence for a private service composition over an isolated
SQLite database and canonical root. That composition has no public domain
routes and does not own production persistence, credentials, or Host effects.
The Stage 1 task lists predate two implemented boundary decisions: WebDAV uses
a secret-free application Host port whose plugin adapter owns prefs and
credentials, and remote exports use `SynthesisHostExportDeliveryPort` while the
plugin Host adapter owns ZIP materialization, integrity metadata, opaque file
registration, and cleanup.

## Goals / Non-Goals

**Goals:**

- Give the current milestone one precise name across active documents.
- Make the WS5 exit gate describe only observable private-foundation closure.
- Give WS6 and WS7 explicit ownership of the remaining remote and production
  integration work.
- Align the plan with the current Host port boundaries.

**Non-Goals:**

- Implementing remote routes, shadow parity, production cutover, or runtime
  asset closure.
- Syncing or archiving OpenSpec changes.
- Rewriting captured baselines, the self-review, or the final Stage 1 target.
- Adding source-string tests for documentation wording.

## Decisions

1. Use `Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete` as the
   exact milestone name. Every active status reference also states that Stage
   1, production cutover, and real-machine acceptance remain incomplete.
2. Keep the final Stage 1 Definition of Done unchanged. WS5 is a bounded
   milestone inside that plan, not a reinterpretation of the final target.
3. WS6 owns a remote-capable client/transport for representative private
   routes, bounded process events, reverse Host-port canaries, and semantic
   parity against fixed or read-only bounded inputs.
4. WS7 owns complete production capability routing, the client implementation
   switch, and the atomic single-writer transfer for the production database
   and canonical root.
5. Preserve current ownership boundaries instead of moving secrets or an asset
   registry into the service. The WebDAV adapter alone reads plugin prefs and
   credentials. Export applications provide bounded canonical entries while
   the plugin Host adapter owns ephemeral materialization and delivery.
6. Validate semantic assignments with targeted searches and OpenSpec strict
   validation. Do not add brittle tests that lock prose or source ordering.

## Risks / Trade-offs

- [The detailed plan mixes completed progress and future tasks] → Label the
  completed WS5 foundation separately and add explicit WS6/WS7 task sections.
- [A precise milestone can become duplicated prose] → Use the exact name only
  at active status boundaries and retain detailed implementation descriptions
  where they already provide useful evidence.
- [Editing historical evidence would erase the audit trail] → Leave captured
  baselines, self-review reports, and existing OpenSpec changes untouched.

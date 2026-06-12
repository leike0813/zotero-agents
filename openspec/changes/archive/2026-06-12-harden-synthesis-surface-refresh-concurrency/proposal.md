# Change: Harden Synthesis Surface Refresh Concurrency

## Summary

Fast Synthesis Workbench tab switching can leave the UI showing an empty or
not-yet-loaded backend-data state. SQLite busy retry makes surface reads slower
or transiently fail, which widens the race between multiple in-flight surface
snapshot requests. The Workbench currently accepts late surface responses as if
they were current.

This change makes Synthesis surface refreshes generation-guarded, preserves the
last-known-good visible surface data on transient read failures, and reports
storage busy as a temporary refresh diagnostic rather than a real empty state.

## Motivation

Surface refreshes are intentionally asynchronous and scoped, but the host and
iframe protocols do not currently identify which request a surface payload
belongs to. When users switch between Index, Graph, Concepts, and Review
quickly, older delayed requests can arrive after newer tab selections and
overwrite the iframe snapshot. If a read is delayed or fails due to SQLite busy,
the user can see default/empty snapshot data that does not represent the real
backend state.

## Scope

- Add request generation metadata to Synthesis surface refresh messages.
- Ignore stale surface responses in the iframe.
- Preserve last-known-good surface snapshots on transient surface errors.
- Classify SQLite busy-style errors as transient for Workbench refresh.
- Document the protocol and UI fallback semantics.

This change does not alter WAL mode, busy timeout values, retry attempts, or
database write locking strategy.

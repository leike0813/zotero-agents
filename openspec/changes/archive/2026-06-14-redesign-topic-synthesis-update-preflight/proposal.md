# Redesign Topic Synthesis Update Preflight

## Summary

Update topic synthesis now uses a current-state preflight route: Stage 00 reads topic context digest/audit, resolves the current resolver, and emits an update audit report; Stage 10 decides cancel or continue and submits an additive resolver proposal; Stage 30 triages only new papers when saved triage exists, or all resolved papers when it does not. The route always produces an `update_full` final bundle when it continues.

## Motivation

The previous update prepare contract asked the agent to choose an update operation before it had resolver and paper-change evidence. This made section-level routing unreliable and mixed semantic topic content with audit/control data.

## Scope

- Topic synthesis split skill source, generated packages, runtime gates, and payload schemas.
- Host Bridge topic context audit view fields needed by update preflight.
- Topic artifact `source_papers[].triage` persistence for reuse by update.
- OpenSpec docs/tests for the current update route.

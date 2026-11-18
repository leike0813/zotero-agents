# Design

## Context

The canonical store validates and migrates historical Topic paths on startup. Its search snapshot provides the bounded Topic candidate set used by search, retrieval indexing, and Discovery. Retrieval index commands can return an accepted receipt before their background work commits a terminal state.

## Goals

Keep the canonical store responsible for runtime Topic identity and the Host responsible for sanitized Runtime Log records. Preserve the meaning of accepted command receipts and the existing lifecycle trace.

## Decisions

- The canonical store records the historical paths verified by startup migration in memory. The shared enumerator skips those entries before reading candidates or charging the candidate limit. Startup has already verified their identity, and each runtime consumer receives the same authoritative candidates.
- Retrieval preserves recognized canonical snapshot failure codes. Unrecognized failures map to `retrieval_topic_source_unavailable`. An unreadable live snapshot still fails index maintenance through the existing source error path.
- The durable terminal commit winner sends a private `synthesis-maintenance-failure.v1` diagnostic on stderr for failed or timed-out build, rebuild, update, and cleanup operations. The supervisor validates the capability, public operation ID, status, and bounded code, then records the error under `synthesis-sidecar-business`. The commit winner owns emission, so polling and replay cannot duplicate the entry.
- The private `library.retrieval.execute` route wraps request validation, readiness, transport, and result validation in the existing Host read audit. Its terminal policy logs errors once and keeps successful reads silent, including lexical fallback results.

## Risks / Trade-offs

- Historical path exclusion depends on startup verification. Invalid current snapshots still fail startup, and unavailable live snapshots remain visible to enumeration as failures.
- The durable operation receipt remains authoritative if the diagnostic cannot reach the supervisor during process or Host shutdown.

## Migration Plan

On the next start, the canonical store rebuilds the in-memory exclusion set from the existing profile. Updated native and Host components deliver the new Runtime Log entry through the existing supervisor stream.

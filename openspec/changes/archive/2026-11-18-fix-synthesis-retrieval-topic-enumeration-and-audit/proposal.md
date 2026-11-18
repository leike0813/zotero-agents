# Proposal

## Why

A retained historical Topic directory can be counted as a live source and cause index construction to fail with `retrieval_topic_source_unavailable`, even when the canonical snapshot is healthy. The asynchronous failure appears in the trace, while Runtime Log lacks the durable failure entry needed to diagnose it.

## What Changes

- Enumerate each Topic from its authoritative current path. Exclude historical copies verified during startup before counting or reading candidates.
- Record failed or timed-out retrieval index maintenance in Runtime Log when the durable terminal is committed, independently of debug tracing and the Workbench.
- Audit private Library retrieval failures using the existing read failure policy. Successful queries with lexical fallback remain silent.

## Capabilities

### New Capabilities

### Modified Capabilities

- `synthesis-topic-path-identity` excludes verified recovery copies from runtime Topic enumeration.
- `synthesis-sidecar-operation-observability` records durable retrieval maintenance failures and private Library query failures.

## Impact

The Rust canonical store and retrieval maintenance paths, the Host sidecar supervisor, and the private Library retrieval route implement the changes. The shared Topic enumeration serves Topic search, retrieval indexing, and Discovery.

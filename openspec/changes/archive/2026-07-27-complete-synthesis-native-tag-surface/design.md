## Context

This change owns the nineteen Tag operations in the parent matrix. The surface includes pure vocabulary validation, durable vocabulary/index state, import preview/apply, staged suggestions, audit records, builtin policy, regulator export, and preconditioned Zotero tag effects.

## Goals / Non-Goals

**Goals:**

- Preserve all public vocabulary, stage, import, audit, policy, and export DTOs.
- Keep vocabulary and staging state durable in Rust and Host tag mutations explicit and receipted.
- Prove preview/apply consistency, basis conflicts, restart, and partial Host failure.

**Non-Goals:**

- Concept or Topic Graph review behavior.
- Passing Zotero objects or credentials to Rust.
- Enabling the global production mutation gate.

## Decisions

### Model Tag work as prepare, persist, and effect phases

Compatibility adapters validate public requests and derive the typed plan. Rust persists the vocabulary/staging decision and effect intent; the reverse Host applies only the declared preconditioned tag effect and returns a typed receipt. Recovery reconciles intent and receipt idempotently.

### Bind import apply to preview identity

Import preview returns a stable digest/basis. Apply must present the matching preview identity and current vocabulary basis, preventing an import from silently applying to changed state.

### Keep builtin policy and audit state durable

Initialization, audit replacement/clear, staged actions, and vocabulary index rebuild survive restart. Handler registration alone never marks an operation ready; fixtures must cover public DTO and durable/Host behavior.

## Risks / Trade-offs

- [Host effect succeeds but receipt persistence crashes] → Reconcile using stable effect identity and Host echo without repeating the mutation.
- [Preview becomes stale] → Reject apply with the stable conflict result.
- [Large imports exceed limits] → Enforce envelope and per-entry bounds before persistence or Host effects.

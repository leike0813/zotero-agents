# Design

## Context

See proposal.md. C02 stores strict-JSON parent-linked entries but has no production compaction CAS API; C03 freezes model selection; C07 freezes a tool catalog. C06 must consume these facts without taking ownership of storage, Provider execution or tool policy.

## Goals / Non-Goals

**Goals:** one deep preparation interface for Conversation and Skill Run, run before every model invocation; typed reconstruction, budget admission, summary planning/validation and bounded provenance.

**Non-Goals:** a second transcript store, live Provider wiring, tool registry, native resource loader, automatic retry or recovery, prompt authority inference.

## Decisions

1. `preparePiTurn(input, ports)` receives only stable DTOs and frozen facts. The caller supplies a canonical revision/leaf and the same turn snapshot for each continuation. It returns `ready`, `compacted` or `failed`; no SDK object crosses the interface. The narrow ports estimate tokens, summarize, append evidence and CAS-commit compaction. This keeps C02 as transcript authority and C07 as catalog authority.
2. The module follows parent links from the selected leaf, then projects only recognized committed messages, tool receipts and selected compaction. It groups assistant calls with their results as indivisible units. Unknown or unsettled lifecycle facts fail closed. Exact duplicate instruction text is removed in source order; no semantic ranking occurs.
3. Frozen resource inputs carry canonical source refs, digests and display facts. Only registered Managed Workspace controls become instructions. Skill metadata and bounded selection appear as blocks; Zotero attachment refs stay opaque. User file paths may appear in ephemeral context, while records retain only opaque path refs. The module never opens a file.
4. Budget uses the smallest frozen limit minus reserve and margin. The estimator is required, named and versioned. If full projection is over budget, the common compaction planner retains whole recent units toward a 20k-token target and summarizes the earlier range. History larger than one summary request is processed in bounded batches; each batch receives the preceding structured summary and a new durable invocation record, while only the final summary enters the single CAS commit. It validates required summary fields, coverage, refs, digest and final fit. The compaction callback owns atomic append and selection CAS; a false/stale result returns failure without mutating local selection. No threshold or silent truncation is introduced.
5. The stable-prefix and full-context digests use the existing Zotero-safe SHA helper over canonical JSON projections. A bounded record is appended before calling either Provider-facing port. The record callback returns the durable transcript revision and leaf; later summary records and the final compaction CAS use that current basis because canonical record append may itself advance the transcript. No message or summary body is copied into the record. The C03 credential reference and absolute user paths are excluded.

## Risks / Trade-offs

- C02 does not yet expose a production CAS operation → the injected callback is exercised with deterministic fakes here; C16/C17 wiring must provide an owner-locked C02 implementation.
- The Provider-specific estimator and summarizer are not yet wired → missing or incompatible ports fail closed, and later adapters must supply versioned implementations.
- C02's generic transcript entry kind permits unknown events → projection rejects unknown selected-path events until their contracts are defined, protecting recovery fidelity.

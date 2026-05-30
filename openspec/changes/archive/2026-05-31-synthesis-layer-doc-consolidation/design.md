# Design

## Overview

This change converts the Synthesis Layer docs from many peer documents into a small canonical documentation system. The old tree is preserved as a deprecated snapshot, while the new tree becomes the only active design anchor.

## Documentation Shape

The active tree contains:

- one README entry point;
- one glossary;
- six domain/runtime/UI design documents;
- three executable policy documents for reference resolution, Concepts, and performance/scale;
- two compact contract explanation documents for state machines and sequences;
- two YAML contract files for stable IDs only.

The new documents are organized by ownership and reader intent, not by every historical subsystem. This reduces the update surface for common design changes.

## Source-of-Truth Rules

- Terms are defined only in `glossary.md`.
- Domain ownership and coupling rules are defined only in `domain-model.md`.
- Runtime event/state IDs are defined only in `contracts/states-and-events.yaml`.
- Human-readable state machines and sequence diagrams live in `state-machines.md` and `sequences.md`.
- Invariant IDs are defined only in `contracts/invariants.yaml`.
- Markdown explains behavior and links to those anchors instead of duplicating complete tables.

## Simplification Decisions

The new docs explicitly model the Zotero plugin as a single-process, single JavaScript event-loop environment. Active docs do not prescribe distributed queue mechanics such as lease, heartbeat, reaper, dead-letter queue, event sourcing, CQRS, or lock ordering.

The previous three-track generation concept is replaced with lightweight epoch/basis terms:

- `registry_epoch`;
- `graph_basis_registry_epoch`;
- topic artifact version/source check.

Topic freshness remains soft-coupled from Registry rebuild. Registry/Graph work may produce discovery hints or diagnostics, but it must not silently invalidate or rewrite topic artifacts.

Discovery is expected to remain usable without external providers. The default baseline is `discovery.apply_time_token_overlap.v1`: a lightweight token/phrase overlap policy over topic interest metadata and literature matching metadata. BM25, embeddings, semantic search providers, and LLM pairwise judges are not part of the default path. The active docs retain the executable v1 scoring policy: normalization, field sets, hard rejects, weighted formula, thresholds, top-k limits, and filtered suppression rules.

Topic workflow apply keeps the final manifest as the sidecar source of truth. The consolidated docs summarize `analysis_manifest_path`, manifest `sidecars`, topic interest metadata, concept proposals, topic graph relation proposals, and source manifest baseline behavior rather than reintroducing the old long workflow contract.

Startup reconcile remains a bounded external-source drift detector. Small drift can enqueue bounded Registry work; bulk or structural drift records an incident and recommended repair/rebuild actions without fan-out into topic work, graph jobs, or thousands of review rows.

## Identity and Review Boundaries

`paper_ref` v1 remains `<libraryId>:<itemKey>`. `literature_item_id` is deterministic and opaque. Zotero-bound papers use `lit:` plus the first 24 hex chars of `sha256(hashCanonicalJson({ kind: "zotero-paper", ref: paper_ref }))`; external work nodes use kind-specific stable refs when available and provisional reference keys when no strong identity exists.

Registry rebuild resolves current Zotero bindings, accepted redirects, and strong identifiers before allocating provisional external IDs. Redirects and durable effects remain the way to express merge/split/retarget semantics; the deterministic ID alone is not a semantic merge decision.

Review queues must be bounded. Matching and dedupe use indexed blocking keys and auto-resolve high-confidence strong-identifier cases. Weak all-pairs candidates become aggregate diagnostics or debug rows rather than unbounded user-facing review cards.

Review actions commit only core durable facts in a short transaction. Expensive cascades such as dependent review refresh, graph rebuild, related-items sync, and broad diagnostics run as bounded follow-up work.

Registry rebuild uses staged promotion. Candidate state is validated before a new `registry_epoch` becomes active, and the previous promoted epoch remains available as last-known-good for explicit rollback.

The active docs also retain executable governance contracts that were too important to compress away: the reference matcher tiers and danger pairs, the performance/scale budgets, the event routing input/result shape, the rebuild operation matrix, numeric external drift thresholds, Topics/Concepts anti-corruption DTOs, review/override data model, and the `synt_*` table-family inventory.

Follow-up regression fixes add:

- a dedicated Concept KB document for proposal ingestion, overlay read patterns, review actions, and failure semantics;
- explicit Registry rebuild candidate validation checks, suspicious-count handling, timeout behavior, advanced bypass, and rollback protection;
- Discovery metadata snapshot semantics for digest apply versus concurrent topic update, including low-confidence fallback marking;
- provisional external identity lifecycle and redirect/retarget rules;
- related-items sync echo suppression to avoid Zotero observer feedback loops;
- terminal source-check diagnostic cleanup states for topic replacement/deletion.

## State Machines and Sequences

The active docs include a small contract layer for object lifecycle and cross-domain flows. It restores the useful parts of the previous engineering documents without recreating the old directory structure.

- State machines are documented in `state-machines.md` and indexed in `contracts/states-and-events.yaml`.
- Sequences are documented in `sequences.md` and indexed in `contracts/states-and-events.yaml`.
- The canonical names use Registry Cache terminology, not historical Index naming.
- These docs keep the current simplified runtime model: staged Registry rebuild, apply-time token-overlap Discovery, bounded external-source drift incidents, explicit Topic source checks, one-way related-items sync, and short review-action transactions.

## Deprecated Snapshot

The deprecated tree remains intact for history. It receives only a short archive README. Its internal links are not repaired because it is not an active design surface.

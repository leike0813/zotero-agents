## Context

See `proposal.md` for motivation. The Broker already owns portable library summaries and bounded keyset pagination, but current Workflow consumers can still use array-returning aliases, raw items, and caller-managed loops. Stable full-library snapshot semantics are a separate vertical slice.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. Contract foundation change `01-establish-workflow-host-v12-contract-foundation` supplies portable DTO, error, control, and projection rules.

The authoritative architecture source is [`artifact/workflow-host-v12-architecture-decisions.md`](../../../artifact/workflow-host-v12-architecture-decisions.md), especially §§5.1–5.8, 6, 7, 11.1–11.2, 12.0–12.12, 14.7, 17, and 18. Its exact DTOs, cursor and traversal budgets, completeness rules, owner boundaries, and recovery semantics take precedence over abbreviated wording in this design.

## Goals / Non-Goals

**Goals:**

- Concentrate live Zotero enumeration, serialization, pagination, budgets, and completion evidence in the Broker.
- Give workflows explicit read members with category-aware DTOs.
- Let long-running local consumers stream serial batches without receiving cursor mechanics.
- Keep context and navigation portable and variant-safe.

**Non-Goals:**

- Stable cross-page snapshot consistency, incremental feeds, or deletion tombstones.
- Annotation export/mutation, collection tree/detail/children, or readiness audit.
- Returning a full traversal array or adding an async-iterator contract in v12.
- Removing active v11 aliases before atomic activation.

## Decisions

### Named reads remain distinct; traversal owns the loop

`listItems`, `listCollections`, detail, note, payload, attachment, annotation, and portable-export members keep their own request, result, and limits. `traverseItems` owns the only live full-loop behavior and accepts a serial callback. A generic `read({kind})` dispatcher was rejected because it would move invariants into a large discriminated bag.

### List query and search are one semantic operation

Query is one normalized `listItems` criterion using stable identity ordering. The legacy array-returning `searchItems` behavior has no distinct relevance, session, or continuation semantics and therefore is not part of v12. It remains available only while the v11 facade is active.

### Completion evidence is Host-issued and process-scoped

The traversal owner computes criteria and coverage digests from the same complete item reads delivered to callbacks. A bounded verification registry prevents callers from fabricating evidence. Evidence is not authorization, mutation proof, durable state, or snapshot identity.

### Category unions replace raw item widening

Summary and detail serializers discriminate regular items, notes, attachments, and annotations. Shared fields and creator identity have one declaration. Reads that cannot prove completeness fail rather than returning misleading empty collections.

### Selection is a single bounded snapshot

Selection serialization remains one interaction-oriented call with a 10,000-item hard limit. A cursor or dual full/paged selection model was rejected because selection is transient and would complicate UI identity.

## Risks / Trade-offs

- [Large traversals retain too much state] → Stream serial bounded batches and retain only bounded evidence state.
- [Live traversal is mistaken for snapshot] → Separate types, results, specs, and tests; never use snapshot terminology in live outcomes.
- [Serializer drift across page/detail/export] → Reuse canonical category serializers and validate through public DTO tests.
- [Callback cancellation publishes late success] → Check the shared signal before reads, between batches, and before terminal publication.
- [Public v11 behavior breaks mid-slice] → Stage owner methods and adapters while leaving the active facade unchanged until activation.

## Migration Plan

1. Add failing Broker tests for pages, cursor binding, category details, tag completeness, traversal stops, and completion evidence.
2. Implement canonical serializers and named bounded reads.
3. Implement callback-scoped live traversal and evidence verification.
4. Migrate selection, collection-option, and tag-auditor internals behind v11-compatible adapters.
5. Run Broker, Zotero pagination, workflow package, type, lint, and build gates.

Rollback removes staged owner capabilities and restores migrated internal consumers; no persisted state or public version changes in this slice.

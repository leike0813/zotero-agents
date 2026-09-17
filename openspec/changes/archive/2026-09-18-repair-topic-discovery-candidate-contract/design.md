# Design

## Context

See [proposal.md](proposal.md). Discovery persistence stores five lifecycle states in JSON payloads. The general Topic projection currently copies up to 25 raw payloads into `discovery.hints`, while the strict protocol registry cannot close that object shape and the production Topic Detail wire omits discovery entirely. Reject/restore returns the raw stored payload through a Rust `Value`, although the TypeScript/schema side already assumes a different closed shape.

The existing path is sufficient: repository projection → Topic application detail → native Topic Workbench route → shared contract → Reader. No new route or persistence model is needed.

## Goals / Non-Goals

**Goals:**

- Give the public chain one recursively closed candidate DTO.
- Keep list surfaces lightweight and make Topic Detail the detailed discovery read seam.
- Preserve internal discovery lifecycle and storage compatibility.
- Reuse the current reject/restore commands and selected-surface refresh behavior.

**Non-Goals:**

- Creating the missing discovery producer or changing candidate scoring.
- Migrating persisted JSON or adding tables, endpoints, pagination, or dependencies.
- Exposing accepted, screened-out, or superseded records to the Workbench.

## Decisions

### 1. Separate the internal record from the public candidate

Persistence keeps its current five-state record and arbitrary producer-owned matching/outcome details. The public `TopicDiscoveryCandidate` is closed:

```text
hint_id: string
topic_id: string
literature_item_id: string
status: open | rejected
updated_at: string
title?: string
score?: number
method?: string
reasons?: string[0..3]
fallback_metadata?: boolean
basis_hash?: string
```

`matching_fields` and `outcome` stay internal. Optional title avoids inventing an empty display value; the UI falls back to `literature_item_id`.

Alternative: close the existing hint object in `TopicProjection`. Rejected because it sends row-detail payloads through every list/read path and keeps persistence shape coupled to the client.

### 2. Topic Detail owns detailed discovery reads

`TopicProjection.discovery` retains only source refs, readiness, cascade ids, candidate count, and discovery status. Topic Detail adds:

```text
discovery: {
  candidate_count: integer
  candidates: TopicDiscoveryCandidate[0..20]
  rejected_candidates: TopicDiscoveryCandidate[0..20]
}
```

The application derives this from the already refreshed internal discovery projection. The repository refresh is corrected to deduplicate and rank the complete cascade before bounding its internal windows. This avoids another repository query interface and keeps cascade knowledge in its current owner.

Alternative: add a repository `listDiscoveryHints(topicId)` port. Rejected because it duplicates the existing cascade/projection path and adds a second interface for one consumer.

### 3. One deterministic selection rule

The confirmed `broader_than` descendant closure includes the requested Topic. Candidates are grouped by `literature_item_id`; `open` beats `rejected`, then higher numeric score wins, then lower `hint_id`. Open and rejected representatives are each ordered by score descending and hint identity ascending. Missing score sorts after numeric scores. `candidate_count` counts the full unique open set before each list is limited to 20.

This same mapper converts a stored record returned by reject/restore, so command results and subsequent detail reads cannot drift.

### 4. The Reader renders a Discovery section without local authority

The existing Reader section list gains one Discovery section. It renders server-projected open and rejected arrays and dispatches existing `rejectTopicDiscoveryHint` / `restoreTopicDiscoveryHint` host commands. It does not optimistically move rows; the existing command invalidation and Topic Detail refresh remain authoritative.

Standalone Topic exports may display supplied candidates but disable host actions, consistent with their existing command policy.

### 5. Verify only stable seams

- Contract corpus: strict DTO acceptance/rejection across TypeScript and Rust.
- Rust Topic application: cascade, deduplication, ordering, and bounds through `detail`.
- Native route: production Topic Detail and reject/restore output validates against the capability schema.
- Preact Reader: rows, fallback title, and dispatched command payload through rendered interaction.

## Risks / Trade-offs

- [Older projections contain arbitrary or incomplete hints] → the mapper drops non-actionable invalid records instead of leaking or fabricating identities; a normal refresh rewrites bounded internal windows.
- [Two bounded arrays can carry 40 rows] → details are loaded only for one Topic and remain fixed-size; list projections carry none.
- [No discovery producer exists on the current production path] → this change repairs the read/action contract only; producer work requires a separate change when its source and trigger are specified.

## Migration Plan

1. Land the strict schema/types and failing corpus checks.
2. Correct internal projection selection and add the application detail DTO.
3. Adapt native Topic Detail and command results.
4. Add the Reader section and interaction test, then update documentation.
5. Run the Stage 1 contract gate; once green, complete Change 02 task 2.4.

Rollback removes the public field and Reader section; persisted data is unchanged.

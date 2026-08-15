## Context

ACP Chat and ACP Skills currently contain separate in-process implementations for tool display extraction, serialization, placeholder filtering, truncation, and partial-update merging. The Assistant Workspace renderer and transcript preview/index paths add further candidate-selection rules. The shared sidebar build already imports pure TypeScript modules from `src/shared`, while transcript lifecycle and persistence remain owned by their respective modules.

## Goals / Non-Goals

**Goals:**

- Establish one deep, pure module for ACP tool display projection and compact selection.
- Give Chat, Skills, preview/index, and renderer the same observable display semantics.
- Keep compatibility with supported adapter field variants and persisted legacy items.
- Test through the shared interface and representative integration seams.

**Non-Goals:**

- Unify tool lifecycle state, transcript boundaries, item identity, timestamps, event queues, persistence, or publication.
- Change transcript store schemas or rewrite historical data.
- Add backend-specific policies, dependencies, adapters, or Node-only runtime code.

## Decisions

### One pure shared module owns display state

Add `src/shared/acpToolCallDisplay.ts` with `applyAcpToolCallDisplayUpdate(current, update)` and `selectAcpToolCallDisplay(state)`. The update operation returns a complete next display state; the selector returns optional primary and secondary text. Callers cannot supply policy flags.

This keeps the interface smaller than the behavior it hides and prevents merge and selection semantics from leaking back into callers. A collection of shared primitive helpers was rejected because it would remain shallow and would not prevent drift.

### Display merge is separate from transcript lifecycle

The shared state contains only tool name, title, normalized kind, input summary, result summary, and compatibility summary. Each mirror maps that state onto its existing item while retaining status, tool-call identity, time, and persistence logic locally.

This preserves owner locality and ensures transcript-only behavior remains compatible with the existing Assistant Workspace rendering constraints.

### Sources are canonical-first and closed

Canonical ACP fields win within each update. A fixed compatibility allowlist supplies fallback values, but callers cannot extend it dynamically. Canonical `name` remains opaque; compatibility identity aliases use exact placeholder and toolCallId checks. Summary remains an isolated compatibility field.

This replaces backend-specific guessing with a single auditable contract while retaining the saved adapter samples already covered by the capability.

### Projection data and visual layout are distinct

The projection applies role-specific safety bounds and single-line normalization. CSS remains responsible for visible ellipsis, and the compact selector does not generate localized fallback copy. Renderer tooltips/details may consume the complete bounded state.

### Legacy data is read, not rewritten

Existing normalized items lack source provenance, so migration could not reliably distinguish an actual tool name from an inferred title or kind. The renderer continues to accept their structural fields and uses the shared selector without mutating stored JSONL.

## Risks / Trade-offs

- [Visible tool text changes as historical heuristics converge] → Lock the agreed contract with table-driven tests and retain legacy item fallback.
- [Shared projection accidentally captures lifecycle behavior] → Keep lifecycle fields out of shared types and retain route-level integration assertions.
- [Large or malformed payloads affect transcript performance] → Apply role-specific Unicode bounds and fail closed on unsafe serialization.
- [Renderer import introduces privileged runtime dependencies] → Keep the shared module DOM-free and dependency-free, following existing `src/shared` import patterns.

## Migration Plan

1. Add failing contract tests for the shared update and selector interfaces.
2. Implement the pure shared module one behavior slice at a time.
3. Migrate ACP Chat, then ACP Skills, preserving owner-specific item fields.
4. Replace preview/index and renderer selection with the shared selector.
5. Remove obsolete private display helpers after integrations are green.
6. Leave existing transcript data untouched; rollback consists of restoring the prior callers and private shaping without a data migration.

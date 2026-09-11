## Context

The Broker note-detail reader currently lets one low-level payload-limit exception escape its public taxonomy. The Synthesis adapter treats that exception as fatal even though its artifact descriptor model already represents decode errors. Literature migration already owns complete process-local plans and persists bounded per-candidate receipts, but Dashboard projects the complete preview and applies every eligible candidate. Topic Report currently inserts an unmanaged outline beside a Preact-owned scroll node, so an early Reader reconciliation can invalidate the imperative body.

## Goals / Non-Goals

**Goals:**

- Keep local note corruption and size limits from collapsing a bounded artifact scan.
- Reuse the migration runtime plan and receipt cursor as the only candidate/selection owners.
- Make the migration page operable with native controls and bounded DOM/data.
- Make Report layout ownership deterministic from the first render.

**Non-Goals:**

- Migrating Digest, Literature Score, Conversation, or Custom payload contents.
- Adding library/collection scope selection, database columns, dependencies, or Rust changes.
- Replacing the shared Markdown renderer or redesigning other Synthesis surfaces.

## Decisions

1. Normalize the raw note payload-limit error at the Broker `getNoteDetail` boundary, then classify `resource_limited` alongside existing per-note artifact diagnostics. This preserves the Broker taxonomy and reuses the descriptor error path; swallowing all note errors would hide transport and consistency failures.
2. Define one six-type legacy payload registry in the converter and reuse its two-type migratable subset from the migration host cleanup. Known non-target types are ignored for conversion and left untouched by cleanup; unknown types remain unsafe.
3. Increment the migration definition to version 3. Old process-local plans already require a fresh scan, so no durable schema migration is needed.
4. Add selection to the existing process-local runtime plan. Candidate receipts remain the ordered paging source, capped at 25 in Dashboard. Ready candidates initialize selected; selecting a review candidate is its explicit acceptance. Dashboard Apply carries only the scan identity and definition version.
5. Keep paging cursor history in the Preact region and the active cursor in Dashboard state. The existing receipt cursor action supplies each next page; changing runs resets both. No client-side full-list cache is introduced.
6. Render a memoized Report Markdown island with declarative outline and body slots. The renderer may replace descendants of those slots, but never inserts siblings into a Preact-owned frame. CSS grid rows give the toolbar intrinsic height and the Reader the remaining bounded height.

## Risks / Trade-offs

- A resource-limited untyped note can make otherwise missing artifacts report `decode_error` rather than `missing` → preserve the diagnostic code and leave independently decoded artifacts available.
- Process restart loses candidate selections and titles → require the existing fresh-scan workflow; durable history continues to use ordinal and outcome without new columns.
- Pagination adds state transitions to Dashboard refresh → reset the cursor on scan, continue, or selected-run change and test both directions.
- Imperative Markdown hooks may change while content is stable → pass a stable mutable hook ref into the memoized island while keeping DOM reconstruction content-signature driven.

## Migration Plan

Ship the definition-version bump and UI/runtime changes together. Existing version-2 history remains readable, while any executable preview must be rescanned under version 3. Rollback restores version 2 code; no stored data transformation is required.

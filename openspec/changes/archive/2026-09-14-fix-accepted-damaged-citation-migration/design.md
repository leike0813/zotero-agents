## Context

The failing parent-set operation committed native state, then called the public enriched-detail projection during verification. The canonical Citation payload was about 666 KiB, but adding derived Markdown produced a roughly 1.25 MiB detail and turned a successful commit into `resource_limited` with no useful recovery.

Three real-library collections also contain valid canonical References (419, 289, and 248 entries) plus legacy Citation attachment payloads between about 1.05 and 2.52 MiB. The ordinary 1 MiB reader correctly rejects those payloads. Migration version 5 nevertheless allowed References-only acceptance, retained the unread Citation, then later scans ignored canonical References and reported `no_references`. The legacy Citation objects also nest bibliographic facts under `reference`, so the converter currently misses facts it already has.

The Broker remains the managed-note semantic owner. Migration remains Dashboard-local. Citation compaction changes only snippet text; source and mention identity remain canonical.

## Goals / Non-Goals

**Goals:**

- Make parent-set postcommit verification incapable of failing solely because optional public enrichment exceeds the response limit.
- Repair recoverable oversized legacy Citation payloads instead of accepting permanent damage.
- Preserve existing canonical References during Citation-only repair and report their real verified count.
- Bound literature-analysis Citation snippets proactively and use exact managed-note sizing as the final gate.
- Keep later candidates running after failures that are terminal, local, and proven to have no residual effects.

**Non-Goals:**

- Raise the ordinary Broker read/write limit or change canonical schemas.
- Guess source identity from DOI, title, author, year, content hashes, or Synthesis IDs.
- Truncate fields other than Citation snippets or drop/reorder items or mentions.
- Continue after repair-required, ambiguous, infrastructure, cancellation, or residual-effect outcomes.

## Decisions

1. Parent-set verification returns `readManagedNoteDetail` results directly. Public `getNoteDetail` keeps `enrichManagedNoteDetail`; internal mutation receipts do not need duplicated derived Markdown.

2. Parameterize the existing embedded-payload reader with a private maximum. Migration passes 4 MiB; all ordinary callers retain the 1 MiB default. Payloads above 4 MiB, malformed payloads, or artifacts that cannot fit after snippet compaction remain blocking.

3. Add one shared pure Citation snippet compactor in the existing synthesis-contract artifact module. It clones the artifact, limits snippets by Unicode code points, keeps marker-centered context where possible, uses a prefix otherwise, and inserts an ellipsis only when text is omitted. The default literature-analysis cap is 512.

4. The parent-set owner performs the exact final fit check because it alone owns visible content, canonical payload, and embedded envelope construction. For an opted-in Citation entry it lowers one uniform snippet cap until the existing managed artifact builder accepts the write. A zero-snippet artifact that still cannot fit fails `resource_limited` before native mutation.

5. `LiteratureArtifactApplyAnalysisRequestDto` gains `compactCitationSnippets?: true`; direct Citation upsert remains strict. The result optionally reports truncated snippet count, final maximum characters, and original/final payload bytes. The built-in literature-analysis workflow opts in, propagates the report, and sends the persisted compacted Citation payload to the sidecar.

6. Remove `accept_damaged_input` and `acceptedDamagedInput`. Canonical References become converter input, `no_references` considers them, Citation-only repair does not rewrite References, and legacy nested `reference` / `metadata` facts are normalized before the existing exact matcher. Unmatched references remain unresolved.

7. The migration adapter derives a private `continueSafe?: true` from the typed authority result. A terminal candidate-local failure is continuation-safe only with `residualCount === 0` and code `resource_limited`, `invalid_artifact`, `legacy_artifact_requires_migration`, `conflict`, or `not_found`. `repair_required` and every ambiguous, infrastructure, canceled, unavailable, invalid-request, unknown-authority, or residual-effect result stop further writes.

8. Advance the static migration definition to version 6. Existing receipts remain history; actionable previews require a fresh scan.

## Risks / Trade-offs

- [A 4 MiB migration read allocates more memory] → Keep the exception private to migration and bounded; ordinary reads stay at 1 MiB.
- [Compaction can reduce citation context] → Preserve all identities and structure, report compaction, and only alter snippets.
- [Continuing after failure could hide damage] → Derive continuation from typed terminal evidence and zero residual effects, never from diagnostic strings.
- [A repaired Citation may still contain unresolved legacy references] → Keep the candidate blocked rather than inventing identity.

## Migration Plan

Ship definition version 6 and require a fresh Dashboard scan. Verification uses fixtures and read-only inspection of the real library; applying to the real library remains an explicit user action after the build is installed.

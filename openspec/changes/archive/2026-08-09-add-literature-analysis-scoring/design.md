## Context

The updated Skill returns `literature_score_path` in normal and score-only
success results. In score-only mode the digest, references, citation-analysis,
and matching-metadata paths are empty. Existing workflow availability is based
only on the presence of the three generated note kinds, and existing apply
unconditionally reads all three artifacts.

The library Artifacts column already provides a synchronous cached provider
backed by an asynchronous per-parent scan. The Synthesis Index is a bounded
current-library projection joined with sidecar rows; score display must not
restore a full-library projection or redefine sidecar artifact coverage.

## Decisions

### Declare readiness in the workflow manifest

Add a generic `generated-note-readiness` selection filter. It describes named
artifacts, optional payload validation, ordered modes, and accepted modes. The
core evaluator knows only notes, embedded payloads, JSON constraints, and mode
rules. The literature-analysis manifest owns the four-artifact vocabulary and
the `full`, `score-only`, and `unavailable` rules.

The score artifact is available only when a `literature-score` note has a
decodable `literature-score-json` payload containing a valid
`literature_score.v1` score. A marked note with a missing or invalid payload is
unavailable and therefore repairable.

### Keep request routing internal

`buildRequest` re-evaluates the manifest readiness immediately before building
the sequence. `score-only` adds `score_only: true` only to the Skill step and
omits tag-regulator. `full` uses `score_only: false` and preserves the optional
tag branch. `unavailable` is rejected. The readiness evidence hash is checked
again after asynchronous tag input preparation to reject stale requests.

Apply uses the request's internal `score_only` value. Score-only reads and
writes only the score artifact. Full mode validates all four required outputs
before applying them. Results without `literature_score_path` are rejected.

### Store source data and chart separately

The score note uses `literature-score` and `literature-score-json`. The original
JSON is wrapped in the canonical workbench payload envelope and stored in its
own disguised PNG attachment. A deterministic SVG radar is generated from the
six dimensions, converted through the Host image preparation API to PNG, and
inserted as a separate native embedded image. Text and table summaries remain
usable when chart preparation fails.

Image cleanup is marker-scoped. It never enumerates every image in the note,
and it validates attachment ownership before deleting replaced images.

### Share score semantics, not DOM implementations

A pure shared module validates the score projection and maps 0–100 to the
nearest half star. The Zotero item tree and Synthesis iframe use separate DOM
renderers because their document and styling environments differ.

Missing or invalid scores render as five gray filled stars. A valid score uses
filled, half-filled, and hollow stars; 60 renders as three filled and two
hollow, and 65 as three filled, one half, and one hollow.

### Keep Synthesis score projection bounded and non-canonical

The Index reads score notes only for the current bounded page and adds
`literatureScore` and `literatureAnalysisMode` to the Workbench UI DTO. It does
not persist score in the reference sidecar, add score to artifact coverage, or
extend MCP/Host Bridge index output. Score note and child attachment events
invalidate only the Index surface.

## Failure Handling

- Invalid/missing score payloads are shown as missing and remain score-only
  candidates.
- A failed score apply does not remove the analysis-needed tag.
- A failed radar conversion writes the textual score note and payload, removes
  stale chart references, and emits a warning.
- Imported scores rebuild derived note content and radar from JSON.
- Existing custom-column order is preserved; registration order only controls
  the initial default ordinal.

## Non-Goals

- No automatic bulk backfill, score sorting/filtering, or public score-only UI.
- No compatibility branch for old result bundles without a score path.
- No Synthesis database migration or public reference-index wire change.

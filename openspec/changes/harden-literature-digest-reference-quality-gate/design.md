## Design

The quality gate is split into two runtime layers.

The primary layer runs inside the builtin `literature-digest` workflow apply
hook before generated notes are written. It classifies normalized references
with a small deterministic predicate set. Rejected references are removed from
the references note payload and therefore never become the source artifact that
Reference Sidecar refresh later consumes. Warning-only references remain in the
payload because workflow apply is a fallback gate, not the owner of extraction
quality.

The secondary layer runs inside Synthesis sidecar ingestion. It uses the same
reason-code policy for legacy references notes, imported artifacts, or direct
service calls that bypass the workflow apply hook. This fallback only skips
deterministic bad rows. It does not score quality, create proposals, or call
Advanced Reference Matching.

## Quality Policy

Rejected rows are limited to precision-first cases:

- empty or missing titles;
- title is a bare DOI, bare DOI URL, or bare URL;
- title is only publication/container metadata;
- title is only an author list or author-like fragment;
- title has no usable content tokens.

Warning rows stay accepted:

- bibliographic suffixes inside the title;
- possible author-prefix contamination with a usable title;
- arXiv/DOI suffixes after a usable title;
- very long titles;
- missing year or missing authors;
- short but plausible titles.

All diagnostics use stable reason codes. Tests assert codes and counters rather
than full prose.

## Artifact Contract

The references note payload remains the existing internal wrapper with a
`references` array, and external export still produces the native bare array.
The quality summary is returned from apply as `reference_quality` and may be
logged or surfaced by workflow diagnostics, but it is not embedded as a new
top-level field in the native references artifact.

## External Skill Guidance

The external `literature-digest` skill should upgrade Stage 4 `persist_references`
with a two-layer gate:

- hard gate: block the deterministic bad rows above before persisting references;
- soft gate: attach defect categories such as `bibliographic_suffix_in_title`,
  `possible_author_prefix_noise`, `missing_year`, and `missing_authors`, then
  instruct the LLM to review and repair them in the next action.

The recommended compatibility shape is to place soft-gate details under
`metadata.title_quality` or `metadata.quality_flags` rather than changing the
top-level references array schema.

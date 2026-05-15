# Design: Add Reference Matching Freshness Gate

## Decisions

- The freshness gate is based on cheap hashes, not on re-running matching.
- The library snapshot source is always Zotero metadata, even when matching is
  later executed with `data_source=bbt-json`.
- The snapshot includes only matching-relevant fields from regular, non-deleted
  personal-library items: library id, item key, title, year/date, creators, DOI,
  URL, and citekey.
- Baseline metadata is stored in the existing `references-json` payload under
  `reference_matching`; the `references` array remains the primary data.
- A note is fresh only when `input_hash`, `settings_hash`, and
  `library_snapshot_hash` all match the stored baseline.
- Fresh notes are filtered out by `reference-matching` `filterInputs`; stale,
  legacy, malformed, or baseline-damaged notes remain executable.

## Runtime Contract

`FilterInputsHook` receives `executionOptions` with the same shape already used
by `buildRequest`. Existing hooks may ignore the new field.

## Failure Behavior

If freshness cannot be assessed safely, `filterInputs` does not reject the input.
The existing apply path remains responsible for producing the concrete error or
repairing the baseline through a successful match.

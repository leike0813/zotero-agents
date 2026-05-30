# Gold Labeling Rules

Use these labels for every reference instance.

## Labels

- `match`: the reference is the same work as a Zotero-bound library paper. Provide `target_item_key`, `target_literature_item_id`, evidence fields, and a short rationale.
- `suggested_match`: evidence is useful but not strong enough for automatic graph edges. Include one or more `suggested_candidates`.
- `ambiguous`: two or more plausible library targets cannot be safely disambiguated.
- `external_or_missing`: the cited work is not represented by any Zotero-bound library paper in the fixture.
- `ignore`: the row is not a real bibliographic reference, such as a malformed heading or non-reference artifact.

## Evidence

Prefer evidence in this order:

1. Trusted citeKeys already written into Zotero references notes by the old reference matching workflow.
2. Strong identifiers: DOI, arXiv, ISBN, canonical URL, citekey when available.
3. Exact normalized title with author overlap and year compatibility.
4. Compact title match with author overlap and year compatibility.
5. Guarded fuzzy title only as suggestion unless manually reviewed.

Do not use citation metrics, topic interest metadata, collection tags, or external web lookups as identity evidence.

## Trusted Reference Note CiteKeys

- A trusted reference-note citeKey that resolves uniquely to one active Zotero-bound library item is a `match`.
- A trusted citeKey that is not present in the current active library citeKey identifiers is `suggested_match` and must be listed for review; do not invent a target item key.
- A trusted citeKey that resolves to multiple active library items is `ambiguous`.
- Rows without a trusted citeKey are not automatically negative examples. Keep them available for semantic review instead of treating the current matcher output as truth.

## Dangerous Near Neighbors

Always record hazardous pairs in `danger-pairs.json` when a title is a plausible but wrong near-neighbor. Examples:

- `Transtrack` is not `MOTR`.
- `Fast Segment Anything` is not `Segment Anything`.
- `Sparse R-CNN` is not `Sparse DETR`.
- `YOLACT++` is not `YOLACT` unless stronger reviewed evidence says otherwise.

Automatic matcher changes must keep danger-set false positives at zero.

## Review Discipline

- Do not invent item keys or literature item IDs.
- Do not label a reference as `match` solely because it is semantically related.
- When uncertain, prefer `suggested_match` or `ambiguous` over `match`.
- Keep rationales concise but specific enough to audit later.

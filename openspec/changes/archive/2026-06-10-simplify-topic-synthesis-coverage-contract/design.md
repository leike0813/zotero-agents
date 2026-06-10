# Design

## Contract Shape

`coverage` is the single user-facing coverage section. It contains:

- `coverage_verdict`
- `coverage_reason`
- `coverage_caveats[]`
- `external_context_summary`
- `suggested_collection_directions[]`

The external literature context remains an input view for Stage 60, but it is
summarized directly into `external_context_summary`. There is no nested
`external_literature` artifact object.

## Runtime

The finalize runtime validates the Stage 60 payload, then writes the coverage
payload into `result/sections/coverage.json` with only the normalized current
fields. It does not synthesize extra summary fields or default prose.

## UI and Export

Topic Details Coverage renders one information flow:

1. coverage stats
2. verdict and reason
3. coverage caveats
4. external context summary
5. collection directions

Markdown export mirrors that structure and does not read removed fields.

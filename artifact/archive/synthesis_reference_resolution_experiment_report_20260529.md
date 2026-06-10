# Synthesis Reference Resolution Experiment Report

Date: 2026-05-29

Fixture: `test/fixtures/synthesis-reference-resolution/current-library-v1`

Scope:

- 55 Zotero-bound library papers.
- 2279 reference instances.
- 228 gold `match` labels and 5 `suggested_match` labels.
- 4 dangerous near-neighbor pairs.

Policy boundary:

- `literature_matching_metadata` is not used for literature-to-literature
  reference identity resolution.
- Automatic `matched` edges require precision-first evidence.
- Lower-confidence but useful candidates remain suggestions and do not create
  citation graph edges.

## Metrics

| Policy | TP | FP | FN | Precision | Recall | F1 | Candidate@1 | Candidate@3 | Danger FP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 152 | 0 | 76 | 1.0000 | 0.6667 | 0.8000 | 0.6524 | 0.6524 | 0 |
| policy-a | 173 | 0 | 55 | 1.0000 | 0.7588 | 0.8628 | 0.7425 | 0.7425 | 0 |
| policy-b | 190 | 0 | 38 | 1.0000 | 0.8333 | 0.9091 | 0.8155 | 0.8155 | 0 |
| policy-c | 201 | 0 | 27 | 1.0000 | 0.8816 | 0.9371 | 0.8627 | 0.8627 | 0 |
| policy-d | 201 | 0 | 27 | 1.0000 | 0.8816 | 0.9371 | 0.9657 | 0.9657 | 0 |
| production | 201 | 0 | 27 | 1.0000 | 0.8816 | 0.9371 | 0.9657 | 0.9657 | 0 |

## Interpretation

Policy A gains recall by canonicalizing strong identifiers from raw references,
especially arXiv DOI / URL / raw `arXiv:` forms.

Policy B adds exact normalized title with author overlap and year delta <= 1.
This improves recall without false positives in the current fixture.

Policy C adds compact title normalization. It captures common reference text
damage such as joined tokens and missing hyphens, while preserving precision.

Policy D does not increase automatic matches beyond policy C in this fixture,
but it improves candidate recall by surfacing guarded fuzzy suggestions. This is
the right production default: suggestions help review workflows without
polluting citation graph edges.

## Decision

Use `production` as policy D:

- auto-match deterministic identifiers;
- auto-match exact/compact title only with author evidence and year guard;
- keep guarded fuzzy results as `suggested_candidates`;
- keep danger-set false positives at zero.

The remaining false negatives should be reviewed through candidate diagnostics
or expanded by future, explicitly measured rules. They should not be solved by
making fuzzy matching more aggressive in the automatic `matched` path.

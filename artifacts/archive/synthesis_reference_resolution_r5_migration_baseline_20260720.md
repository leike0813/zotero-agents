# Synthesis Reference Resolution Experiment Report

Date: 2026-07-20

Fixture: `test/fixtures/synthesis-reference-resolution/current-library-v1`

| Policy | TP | FP | FN | Precision | Recall | F1 | Candidate@1 | Candidate@3 | Danger FP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 234 | 0 | 2 | 1.0000 | 0.9915 | 0.9957 | 0.9915 | 0.9915 | 0 |
| policy-a | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-b | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-c | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-d | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| production | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |

The Rust `reference_binding.v1` result is canonical-byte equivalent to the TypeScript oracle for all six policy runs. Clustered dedupe differential coverage includes exact identifiers/titles, typo review, bibliographic and author noise, semantic extension risk, numeric venue suffixes, excluded DOI-only rows, sticky representatives, representative-retarget review, and title-candidate selection.

## Resource gate

Each profile ran in three independent worker processes. Matcher used the maximum 25,000-paper library dimension with 100 representative references; Topic used a 25,000-element nested artifact; Citation Graph used the normal 2,000-source/100,000-reference profile.

| Profile | Elapsed runs | Peak RSS runs |
| --- | --- | --- |
| Matcher | 2.45 s / 2.47 s / 2.57 s | 128.2 / 128.3 / 127.9 MiB |
| Topic | 1.20 s / 1.11 s / 1.17 s | 73.8 / 73.9 / 73.9 MiB |
| Citation Graph | 10.47 s / 10.03 s / 10.41 s | 157.4 / 157.4 / 157.6 MiB |

All runs satisfy the five-second matcher/Topic deadline, thirty-second graph deadline, and 256 MiB peak-RSS gate.

Policy boundary:

- `literature_matching_metadata` is not used for literature-to-literature reference identity resolution.
- Automatic `matched` edges should remain precision-first.
- Lower-confidence candidates should remain suggestions until explicitly reviewed.

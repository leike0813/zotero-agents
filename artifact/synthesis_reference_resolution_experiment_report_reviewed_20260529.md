# Synthesis Reference Resolution Experiment Report

Date: 2026-05-29

Fixture: `test/fixtures/synthesis-reference-resolution/current-library-v1`

| Policy | TP | FP | FN | Precision | Recall | F1 | Candidate@1 | Candidate@3 | Danger FP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 234 | 0 | 2 | 1.0000 | 0.9915 | 0.9957 | 0.9915 | 0.9915 | 0 |
| policy-a | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-b | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-c | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| policy-d | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |
| production | 236 | 0 | 0 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0 |

Policy boundary:

- `literature_matching_metadata` is not used for literature-to-literature reference identity resolution.
- Automatic `matched` edges should remain precision-first.
- Lower-confidence candidates should remain suggestions until explicitly reviewed.


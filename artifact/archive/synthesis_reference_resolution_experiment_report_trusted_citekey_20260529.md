# Synthesis Reference Resolution Experiment Report

Date: 2026-05-29

Fixture: `test/fixtures/synthesis-reference-resolution/current-library-v1`

| Policy | TP | FP | FN | Precision | Recall | F1 | Candidate@1 | Candidate@3 | Danger FP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 55 | 97 | 31 | 0.3618 | 0.6395 | 0.4622 | 0.6395 | 0.6395 | 0 |
| policy-a | 61 | 112 | 25 | 0.3526 | 0.7093 | 0.4710 | 0.7093 | 0.7093 | 0 |
| policy-b | 69 | 121 | 17 | 0.3632 | 0.8023 | 0.5000 | 0.8023 | 0.8023 | 0 |
| policy-c | 69 | 132 | 17 | 0.3433 | 0.8023 | 0.4808 | 0.8023 | 0.8023 | 0 |
| policy-d | 69 | 132 | 17 | 0.3433 | 0.8023 | 0.4808 | 0.9419 | 0.9419 | 0 |
| production | 69 | 132 | 17 | 0.3433 | 0.8023 | 0.4808 | 0.9419 | 0.9419 | 0 |

Policy boundary:

- `literature_matching_metadata` is not used for literature-to-literature reference identity resolution.
- Automatic `matched` edges should remain precision-first.
- Lower-confidence candidates should remain suggestions until explicitly reviewed.


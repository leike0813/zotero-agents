# Source-Blind Semantic Surface Evaluation

## Method

Three independent agents receive only one materialized surface and `scenarios.json`. They must return the declared structured fields and cite package-local references. Repository source files are unavailable to the evaluator. The main agent checks commands and payloads against the embedded Agent Surface and applies the critical-failure and score thresholds.

## Baseline

The pre-correction audit found 112 leaf commands, 12 family defaults, 10 command overrides, 3 journeys, and approximately 22 distinct effective guidance records. Domain references were flat tables and the error reference contained no operational decision matrix. This is recorded as the qualitative baseline because the earlier materialized package was replaced in the same working tree before formal executor runs were introduced.

As a conservative completeness proxy, the baseline exposed distinct guidance for about 19.6% of leaf commands (`22 / 112`). It could not be replayed as a source-blind scenario score because that exact materialized package was not preserved. The final package is therefore assessed both against the explicit scenario gates and against this recorded proxy.

## Final

After content-only rendering, three independent source-blind evaluators read only their assigned materialized package and the scenario fixture. The Library Agent first pass found one critical failure: its first-level helper documentation named two commands absent from the packaged parser. The source contract was corrected, rerendered, covered by a regression test, and reevaluated by the same evaluator.

| Surface | Scenarios | Required facts | Critical failures | Result |
| --- | ---: | ---: | ---: | --- |
| CLI bundle | 6 | 100% | 0 | Pass |
| Zotero Library Agent | 8 | 100% | 0 | Pass |
| Zotero Librarian Profile | 7 | 100% | 0 | Pass |
| Overall | 21 | 100% | 0 | Pass |

The evaluators confirmed these previously weak or ambiguous decisions from package-local guidance alone:

- exact surface identity rejection when SemVer matches but catalog checksum differs;
- deterministic list versus relevance search versus snapshot, bounded paging, and resumable evidence;
- property-to-option and positional argv bindings plus valid complex resolver payloads;
- local path versus registered remote file delivery using `delivery.mode`, `fileId`, `downloadCommand`, and `unpackHint`;
- Host-owned versus agent-owned workflow handles, complete preflight, one-shot apply-back, and receipt-based partial recovery;
- approval/effect boundaries among resident index refresh, Synthesis cache invalidation, graph metric repair, and scheduled proposal-only work;
- packaged helper commands matching the actual helper parser.

All acceptance gates pass: every surface exceeds 85%, the 100% overall score exceeds 90%, no critical failure remains, and the final score is 80.4 points above the conservative 19.6% baseline completeness proxy. No release preparation, version bump, or publication was performed.

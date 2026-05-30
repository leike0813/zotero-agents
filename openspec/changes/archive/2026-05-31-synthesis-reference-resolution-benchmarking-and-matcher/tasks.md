## 1. OpenSpec and Documentation

- [x] 1.1 Create the `synthesis-reference-resolution-benchmarking-and-matcher`
  change.
- [x] 1.2 Add proposal, design, and delta spec.
- [x] 1.3 Add the normalization and matching design document.

## 2. Fixture and Gold Labels

- [x] 2.1 Extract the current test library into sanitized fixture JSON files.
- [x] 2.2 Add full gold labels and dangerous near-neighbor pairs.
- [x] 2.3 Add fixture schema/coverage tests.

## 3. Evaluation Harness

- [x] 3.1 Add pure evaluation helpers for baseline and policies A-D.
- [x] 3.2 Add metrics tests for precision, recall, F1, candidate recall, and
  danger false positives.
- [x] 3.3 Write the first experiment report artifact.

## 4. Matcher Implementation

- [x] 4.1 Extract reference matcher normalization and policy code into a module.
- [x] 4.2 Add strong identifier, raw identifier, title/year/author, compact
  title, and guarded fuzzy candidate rules.
- [x] 4.3 Preserve suggested candidates without creating matched graph edges.

## 5. Registry Integration and Verification

- [x] 5.1 Wire the production matcher into literature registry rebuild.
- [x] 5.2 Add integration tests for matched-count improvement and suggestion
  behavior.
- [x] 5.3 Run targeted mocha tests, `tsc --noEmit`, prettier check, eslint, and
  `npm run build`.

## 1. Change artifacts

- [x] 1.1 Create proposal, design, and delta specs for file-backed discovery
  candidates.
- [x] 1.2 Record the baseline, file contract, path pairing, and deletion boundary.

## 2. Skill and references

- [x] 2.1 Update Stage 20 to write or update one candidate file per deduplicated
  candidate.
- [x] 2.2 Update Stage 30 to read candidate files and Stage 40 to pass
  `CANDIDATE_FILES_JSON` paths.
- [x] 2.3 Update candidate and recovery references without changing discovery
  round, metadata, PDF, or final-output contracts.

## 3. Tests and validation

- [x] 3.1 Add stable contract assertions for the candidate file object and its
  embedded `payloadPath`.
- [x] 3.2 Verify the prompt no longer depends on aggregate candidates or an
  output-path map.
- [x] 3.3 Run OpenSpec, focused tests, workflow tests, package checks, type,
  format, lint, diff, and current-state-only audits.

## 4. Structured research report

- [x] 4.1 Define the Stage 40 stdout research report and its search-ledger
  projection.
- [x] 4.2 Update the Skill prompt and recovery reference without adding a gate,
  schema, sidecar, or workflow change.
- [x] 4.3 Replace prose- and history-sensitive assertions in the Skill runtime
  test with stable structural contract checks.
- [x] 4.4 Run focused, OpenSpec, workflow, package, type, lint, format, diff, and
  current-state-only validation.

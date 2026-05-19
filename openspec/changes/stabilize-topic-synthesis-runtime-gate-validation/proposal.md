# Change: Stabilize Topic Synthesis Runtime/Gate Validation

## Why

Recent topic synthesis runs exposed runtime/gate contradictions: a valid paper
unit persist action was not accepted by the gate, final validation did not catch
host apply reference errors, and stage state could be advanced by inconsistent
receipts. These failures make long ACP runs wasteful and push errors to apply
time.

## What Changes

- Normalize public stage/action names to the v2 contract.
- Make gate blockers actionable and forbid self-looping blockers.
- Harden runtime state integrity checks before gate/render.
- Make `validate_final_artifacts` reject the same evidence/evidence-map closure
  errors that host apply rejects.
- Add regression tests that exercise runtime validation before apply.

## Impact

- Affects only topic synthesis skill runtime/gate packages and contract tests.
- Does not change Workbench UI, host canonical storage format, or topic content
  protocol.

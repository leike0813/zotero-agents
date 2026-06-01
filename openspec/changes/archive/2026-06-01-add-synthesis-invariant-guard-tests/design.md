## Overview

The invariant guard layer treats `doc/synthesis-layer/contracts/invariants.yaml` as the source of truth. Each invariant declares one or more executable test references, and tests identify the invariant they protect by including the invariant marker in the `it(...)` title.

## Decisions

- `test_refs` is required for every invariant with severity `fatal` or `high`.
- Each `test_refs` entry has `file`, `marker`, and `kind`.
- `kind` is limited to `behavior` or `static_guard`.
- The marker format is `[inv.<domain>.<name>]` and must match the invariant ID exactly.
- The guard test verifies markers appear in runnable `it(...)` titles, not merely comments.
- Static-only evidence is allowed only for architecture boundary invariants where runtime behavior is not the correct enforcement unit.
- Existing behavior tests are annotated instead of duplicated.

## Risks

- Invariant markers make test titles longer. This is intentional because it keeps coverage discoverable in normal test output.
- Some current invariant evidence remains broad. The guard enforces a runnable reference, while future changes can split invariants if a single ID becomes too coarse.

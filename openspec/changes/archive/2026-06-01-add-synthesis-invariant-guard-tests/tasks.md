## 1. OpenSpec

- [x] 1.1 Add OpenSpec artifacts for invariant guardrails.
- [x] 1.2 Validate the change with `npx openspec validate add-synthesis-invariant-guard-tests --strict`.

## 2. Contract Mapping

- [x] 2.1 Add `test_refs` to every Synthesis invariant.
- [x] 2.2 Annotate existing behavior tests with invariant markers.
- [x] 2.3 Add a focused invariant guard npm script.

## 3. Guard Tests

- [x] 3.1 Add invariant YAML/meta guard tests.
- [x] 3.2 Add static guard tests for architecture-style invariants.
- [x] 3.3 Fill missing behavior coverage where no existing test is suitable.

## 4. Verification

- [x] 4.1 Run the invariant guard suite.
- [x] 4.2 Run focused referenced tests, TypeScript/build checks, OpenSpec validation, and touched-file Prettier check.

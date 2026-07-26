## 1. Regression Coverage

- [x] 1.1 Extend Host Bridge run materialization coverage to require an owner-executable POSIX shell shim.
- [x] 1.2 Add a recovery regression test proving profile, token, PATH, and write auto-approval reach the recovered adapter.
- [x] 1.3 Add a recovery regression test proving explicit host-access disablement does not materialize or inject Host Bridge credentials.

## 2. Runtime Implementation

- [x] 2.1 Extract one ACP Skills Host Bridge preparation path shared by initial execution and conversation recovery.
- [x] 2.2 Reconstruct the effective recovery request, rematerialize current Host Bridge access before dependency probing, and persist only the masked summary.
- [x] 2.3 Set the generated POSIX shell shim executable through the existing cross-runtime permission helper while retaining the resolved CLI PATH fallback.
- [x] 2.4 Settle recovery as failed without creating an adapter when Host Bridge preparation throws.

## 3. Verification

- [x] 3.1 Run the focused TDD regression cases and the complete ACP SkillRunner-compatible runner test file.
- [x] 3.2 Run TypeScript type checking, targeted Prettier and ESLint checks, and `git diff --check`.
- [x] 3.3 Validate the completed OpenSpec change and its two capability deltas.

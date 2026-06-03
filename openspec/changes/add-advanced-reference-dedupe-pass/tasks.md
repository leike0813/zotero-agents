## 1. OpenSpec and Docs

- [x] 1.1 Add delta specs for advanced dedupe semantics, progress, UI, performance, invariants, and docs.
- [x] 1.2 Update active Synthesis docs to describe binding + external dedupe passes and fuzzy review-only behavior.
- [x] 1.3 Validate the new change with strict OpenSpec validation.

## 2. Matcher and Service

- [x] 2.1 Add bounded canonical dedupe helpers that reuse existing reference matcher normalization primitives.
- [x] 2.2 Add an `external_dedupe` phase to `runAdvancedReferenceMatchingNow`.
- [x] 2.3 Auto-write only safe canonical redirects and write fuzzy/ambiguous output as `canonical_merge` proposals.
- [x] 2.4 Preserve rejected proposal suppression and mark citation graph cache stale after redirect changes.

## 3. UI and Guards

- [x] 3.1 Ensure canonical merge proposals expose readable source/target evidence for Review Center and Index drawer.
- [x] 3.2 Add or update guards so refresh/apply do not call the dedupe helper and fuzzy dedupe is not a global N² scan.

## 4. Tests and Validation

- [x] 4.1 Add matcher/service tests for exact, identifier, strong-title, fuzzy proposal, and rejected suppression behavior.
- [x] 4.2 Add UI/read-model tests for readable canonical merge proposal evidence where needed.
- [x] 4.3 Run TypeScript, targeted core tests, build, and OpenSpec validation.

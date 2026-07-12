## 1. Regression coverage

- [x] 1.1 Add ACP Chat coverage for Kilo none invalid-parameter fallback and non-fallback errors.
- [x] 1.2 Add ACP Skills coverage for one-session fallback, persisted effective options, and recovery.

## 2. Runtime option fallback

- [x] 2.1 Add one shared structured predicate and omission result for the Kilo none invalid-parameter case.
- [x] 2.2 Apply the fallback to ACP Chat selection and ACP Skills initial/recovered runtime-option setup.
- [x] 2.3 Persist and audit the effective ACP Skills fallback state.

## 3. Verification

- [x] 3.1 Run focused ACP Chat and ACP Skills regression tests.
- [x] 3.2 Run TypeScript, localization, lint, OpenSpec strict validation, and diff-whitespace checks.

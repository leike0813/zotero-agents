## 1. OpenSpec Contract

- [x] 1.1 Add workflow-runtime delta for preflight outcomes, short-circuit apply, and aggregate apply.
- [x] 1.2 Add workflow-contract delta for manifest, hook, and request-building boundaries.
- [x] 1.3 Add result-apply-handlers delta for preflight and aggregate result context.

## 2. Protocol and Loader

- [x] 2.1 Extend workflow types with `PreflightHook`, outcome types, and preflight hook args.
- [x] 2.2 Update workflow JSON schema and loader validation for optional `hooks.preflight`.
- [x] 2.3 Update hook bundler and diagnostics to recognize `preflight`.

## 3. Runtime Execution

- [x] 3.1 Run preflight after selection resolution and before request construction.
- [x] 3.2 Pass preflight context to `buildRequest` without modifying `selectionContext`.
- [x] 3.3 Implement `short-circuit-apply` through the existing apply seam.
- [x] 3.4 Implement `replace-units` request expansion.
- [x] 3.5 Implement aggregate single-apply collection and failure behavior.

## 4. Result Context and Apply

- [x] 4.1 Add `preflight` metadata to workflow result context.
- [x] 4.2 Add aggregate children to workflow result context.
- [x] 4.3 Preserve existing sequence apply and provider result apply behavior.

## 5. Tests and Docs

- [x] 5.1 Add loader/schema tests for preflight hook acceptance and invalid hook rejection.
- [x] 5.2 Add runtime tests for no-preflight, continue, skip, short-circuit apply, replace-units, and aggregate apply.
- [x] 5.3 Update workflow authoring/runtime docs with metadata-curator and MinerU examples.
- [x] 5.4 Run OpenSpec validation, focused mocha tests, and TypeScript check.

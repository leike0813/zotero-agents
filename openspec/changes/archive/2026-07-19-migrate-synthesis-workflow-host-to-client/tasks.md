## 1. Red Tests

- [x] 1.1 Add failing tests for the twelve-method workflow facade, grouped client routing, and removal of full-service access.
- [x] 1.2 Add failing tests for Zotero item snapshots and relative/absolute/manifest Topic asset materialization.
- [x] 1.3 Add failing tests for missing, non-JSON, count, per-asset, and aggregate materialization failures before mutation.

## 2. Contracts and Host Inputs

- [x] 2.1 Add package-owned workflow apply, Topic report, paper artifact, Tag Vocabulary, staging, and audit DTOs and grouped client interfaces.
- [x] 2.2 Define the narrow plugin-facing `WorkflowSynthesisApi` without importing or deriving from `SynthesisService`.
- [x] 2.3 Extract one plugin-side workflow item snapshot helper and use explicit JSON-safe digest inputs.
- [x] 2.4 Implement deterministic Topic asset materialization, path rewriting, JSON safety, and bounds.

## 3. Adapter and Consumer Migration

- [x] 3.1 Extend the narrow in-process/default client ports for all twelve workflow methods.
- [x] 3.2 Reconstruct read-only legacy Topic asset access inside the in-process adapter and preserve stable client error mapping.
- [x] 3.3 Replace workflow host service spreading with a synchronous lazy client facade and preserve existing invalidation behavior.
- [x] 3.4 Remove workflow host/types from the migration allowlist and verify the direct consumer count is five.

## 4. Documentation and Validation

- [x] 4.1 Update current Synthesis runtime and workflow host API documentation, including localized/generated surfaces, to the narrow in-process facade.
- [x] 4.2 Run contract/root typechecks, targeted workflow and Topic tests, boundary/invariant checks, formatting/lint, documentation checks, and production build.
- [x] 4.3 Run `openspec validate` and verify completeness, requirement coverage, and design coherence.

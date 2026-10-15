# Tasks

## 1. Source-bound freshness

- [x] 1.1 Add the shared ACP input fingerprint and read-only JSON checker; verify fresh, stale, missing/invalid evidence and tampering through the existing ACP packaging test seam.
- [x] 1.2 Bind locked Windows compilation and standalone packaging to build records, with unchanged-input and failure handling; verify process-boundary tests and actual Windows rebuild/check.
- [x] 1.3 Wire the package command and update preflight skill/AGENTS for check-rebuild-recheck and automatic single build; verify command execution and inspect workflow branches without static instruction-text tests.

## 2. Integration verification

- [x] 2.1 Run targeted ACP tests, formatting/lint and OpenSpec strict validation; record results.
- [x] 2.2 Complete full build preflight with current evidence, run the plugin build once and verify help docs/XPI; record remaining blockers if any.

Blocked: Synthesis hashes the entire changed package.json; all seven bundles require a new exact pushed-source prebuild. Independent preflight checks pass; see validation.md. Plugin build and new-XPI verification remain pending, with no commit/push/dispatch authorized.

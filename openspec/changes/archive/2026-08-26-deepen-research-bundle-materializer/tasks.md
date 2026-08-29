## 1. Contract Characterization

- [x] 1.1 Add a Workflow Host v11 characterization covering fail-soft missing papers, `core_source_missing`, and cached-projection late binding; verify it passes against the current implementation.

## 2. Materializer TDD

- [x] 2.1 Add a failing core test for the new materializer interface covering valid, duplicate, malformed, empty, and missing paper refs with stable first-selection output.
- [x] 2.2 Implement the minimal materializer factory and resolver seam; verify the new core test passes while delegating resolved DTOs to the existing materialization implementation.
- [x] 2.3 Add a failing core test that the materializer owns the standard four-artifact request and canonical `source_missing`; implement the typed artifact-reader seam and single artifact-set constant until it passes.

## 3. Adapter Migration

- [x] 3.1 Replace Workflow Host inline paper orchestration with pre-bound, invocation-late resolver and artifact-reader adapters; verify the v11 characterization and workflow package tests pass.
- [x] 3.2 Adapt direct paper/Topic export to the typed artifact-reader input and shared full artifact-set constant without changing strict selector, digest-only Topic, warning, or publication behavior; verify direct-export tests pass.
- [x] 3.3 Remove superseded Workflow Host parser/dedupe/artifact literals and review the diff for duplicate policy or leaked runtime state.

## 4. Documentation

- [x] 4.1 Add `Research Bundle Materialization` to `CONTEXT.md` without implementation details and verify glossary terminology is consistent.
- [x] 4.2 Update the Zotero Host Capability Broker SSOT with materializer ownership, Workflow-only warning projection, and runtime late-binding constraints; verify it agrees with code and existing specs.

## 5. Verification

- [x] 5.1 Run the targeted core, direct-export, and workflow tests and resolve all failures.
- [x] 5.2 Run both TypeScript checks and lint, then verify no generated help docs or unrelated files changed.
- [x] 5.3 Run strict OpenSpec validation and confirm every implementation task is complete.

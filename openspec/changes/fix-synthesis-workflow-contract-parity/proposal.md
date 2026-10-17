# Synthesis workflow contract parity

## Why

Topic Planner output passes its Skill schema but fails the production protocol before RPC. Topic synthesis and literature digest workflows also bypass the conversion required by the closed v12 Host interface. Existing mapping and mock tests do not establish complete protocol coverage.

## What Changes

- Derive workflow output schemas and Topic Plan rebuilders from the production contract set.
- Materialize Topic assets and project literature snapshots in shared workflow modules before invoking v12.
- Preserve bounded field diagnostics and distinguish permanent contract errors from retryable failures.
- Report and enforce protocol entry, recursive structure, cross-language execution and workflow producer coverage with explicit uncovered obligations.
- Exercise real hooks, native routes and isolated Zotero acceptance through existing runners.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workflow-client`: closed DTO producer conversion and permanent failure reporting.
- `synthesis-cross-language-sidecar-contract`: registry-derived executed coverage and recursive obligations.
- `topic-planning-workflow`: canonical resolver output and shared structural validation.

## Impact

Workflow packages, synthesis-contracts, content generation, native protocol tests, existing CI suites and Zotero E2E. Public v12 members and signatures remain unchanged. No dependencies, historical result migration, automatic replay, commits or publication are included. Existing binary changes are preserved.

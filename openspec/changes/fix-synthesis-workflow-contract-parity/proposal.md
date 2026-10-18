# Synthesis workflow contract parity

## Why

Topic Planner output passes its Skill schema but fails the production protocol before RPC. Topic synthesis and literature digest workflows also bypass the conversion required by the closed v12 Host interface. Existing mapping and mock tests do not establish complete protocol coverage.

## What Changes

- Derive workflow output schemas and Topic Plan rebuilders from the production contract set.
- Materialize Topic assets and project literature snapshots in shared workflow modules before invoking v12.
- Preserve bounded field diagnostics and distinguish permanent contract errors from retryable failures.
- Report and enforce protocol entry, recursive structure, cross-language execution and workflow producer coverage with explicit uncovered obligations.
- Exercise real hooks, native routes and isolated Zotero acceptance through existing runners.
- Implement the two registered reset capabilities, as subsequently authorized: database-only reset preserves canonical data; clean-install reset defaults to preview and requires its own confirmation. Verify backup, exclusive admission and crash recovery in isolated native processes.
- Consume the registered library snapshot protocol during explicit Reference maintenance refreshes, as subsequently authorized; preserve read-only library access and promote only complete validated generations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-workflow-client`: closed DTO producer conversion and permanent failure reporting.
- `synthesis-cross-language-sidecar-contract`: registry-derived executed coverage and recursive obligations.
- `topic-planning-workflow`: canonical resolver output and shared structural validation.
- `synthesis-native-webdav-maintenance-surface`: confirmed production reset, backup and crash recovery.
- `synthesis-native-reference-canonical-surface`: explicit snapshot staging/promotion and the current bounded maintenance read deadline.

## Impact

Workflow packages, synthesis-contracts, content generation, native protocol tests, existing CI suites and Zotero E2E. Public v12 members and signatures remain unchanged. No dependencies, historical result migration or automatic replay are included. The user subsequently authorized commits and push to dev, seven-platform development prebuild, and one dev Content Package patch publication. Existing binary changes are preserved in their own commit before synchronization. Plugin publication and formal release promotion remain outside scope.

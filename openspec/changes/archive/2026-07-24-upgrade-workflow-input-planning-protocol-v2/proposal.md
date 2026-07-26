## Why

Workflow input planning currently spreads selection validation, candidate derivation, MIME filtering, per-parent splitting, and execution-unit construction across manifest loading, runtime preparation, queue admission, and Host Bridge consumers. That overlap causes contract ambiguity and correctness defects such as revalidating global selection cardinality after units have already been split.

## What Changes

- **BREAKING** Introduce workflow manifest schema version 2 with explicit `trigger.requiresSelection`, `inputs.member`, `inputs.grouping`, and scoped `validateSelection` declarations.
- **BREAKING** Remove legacy input-unit, derivation, grouping, and selector aliases without compatibility normalization.
- Add a single workflow input planner that validates the raw selection once, derives and filters ordered atomic candidates, validates candidate cardinality, and creates immutable prepared execution units.
- Separate candidate statistics from top-level execution-unit results throughout runtime preparation, duplicate guarding, queueing, settings preview, and Host Bridge control.
- Make grouped execution units the concurrency, duplicate-confirmation, and Host queue identity boundary while preserving existing provider, request, hooks, result, parameters, queue-ownership, and submit-return contracts.
- Migrate all built-in, debug, fixture, and test workflow manifests to schema version 2.
- Raise the content API contract to `3.0.0` and align current-state workflow documentation and generated help content, without publishing a plugin, content package, or Host Bridge release.

## Capabilities

### New Capabilities

- `workflow-input-planning-protocol`: Defines the v2 candidate-production and immutable execution-unit planning contract.

### Modified Capabilities

- `workflow-manifest-authoring-schema`: Requires the v2 manifest structure and rejects legacy or contradictory declarations.
- `workflow-execution-runtime`: Makes confirmed prepared units the execution SSOT and separates candidate and unit outcomes.
- `workflow-execution-seams`: Moves preflight behind grouping and prevents prepared-unit consumers from replanning selection.
- `selection-context`: Defines ordered atomic candidate projection, related-item expansion, and scoped-context merging.
- `workflow-settings-dialog-model`: Uses prepared top-level units for preview and concurrency controls.
- `workflow-duplicate-job-submission-guard`: Treats an immutable group as the atomic duplicate-confirmation boundary.
- `host-bridge-workflow-control`: Projects inputs and validation separately and builds allowed prepared units without reconstructing raw selection.
- `builtin-workflow-package-and-sync`: Requires all distributed workflows to use manifest v2 and content API `3.0.0`.
- `workflow-docs-contract-alignment`: Documents inputs and validation as distinct current-state contracts and regenerates embedded help.

## Impact

The change affects workflow schema/types/loading, selection planning, runtime preparation, duplicate and queue identity handling, settings preview, Host Bridge workflow DTO projection, content-package validation, built-in and test manifests, and workflow documentation. It intentionally does not change provider request/result/hook/parameter contracts, queue ownership, submit handles, fixed-size grouping, publication state, or release automation.

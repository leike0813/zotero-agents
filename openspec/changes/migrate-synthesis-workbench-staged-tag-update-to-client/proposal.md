## Why

The Synthesis Workbench still implements staged Tag suggestion editing as separate discard and stage service calls, so a failure between them can lose the original row or leave a partially applied rename. Moving the operation behind a dedicated `client.tags` command lets the Tag domain own one atomic transaction while removing another direct Workbench service route.

## What Changes

- Add a strict staged Tag update DTO and expose `updateStagedTagSuggestion` through `SynthesisClient.tags` with an opaque JSON-safe command result.
- Add one Tag Vocabulary domain/service command that updates, renames, or collision-merges a staged suggestion in a single repository transaction without canonical autosync or Tag protocol validation.
- Add a narrow in-process legacy port with canonical DTO rebuilding, stable client error categories, and opaque result normalization.
- Route the Workbench staged Tag edit command through the lazily resolved default client while preserving host payload normalization, single-flight behavior, start timing, and Tags-only invalidation.
- Update service inventory, focused tests, and current-state documentation for the new public method and consumer boundary.

## Capabilities

### New Capabilities

- `synthesis-workbench-staged-tag-update-client-consumer`: Defines the strict staged Tag update contract, atomic Tag domain behavior, adapter normalization, and preserved Workbench orchestration.

### Modified Capabilities

None.

## Impact

The change affects Synthesis Tag contracts, the in-process adapter and legacy composition, Tag Vocabulary domain/service and service inventory, Workbench routing, focused client/domain/boundary/UI tests, and current-state Synthesis documentation. It raises the public service inventory to 126 methods while retaining four direct legacy consumers. It does not migrate generic staging, promotion, bulk discard/clear, Tag import, vocabulary entry edit/delete, audit, Host Bridge, MCP, or any `reference/Skill-Runner` content.

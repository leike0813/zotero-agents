## Why

The Synthesis Workbench still resolves the complete legacy service for Tag Vocabulary import preview and apply even though adjacent Tag maintenance, export, and staged bulk commands use `client.tags`. Moving this cohesive two-command slice behind the client removes two more direct calls without changing the established import domain behavior or preview state ownership.

## What Changes

- Add strict Tag import preview and apply DTOs with the two Workbench-supported apply actions.
- Add preview and apply methods to `SynthesisTagsClient` that return opaque JSON-safe command results.
- Add narrow in-process legacy ports with validation-before-port, canonical request rebuilding, object result normalization, and stable client error mapping.
- Route the three Workbench import host-command names through the lazily resolved default client while preserving raw payload bytes, aliases, single-flight keys, start timing, invalid-input behavior, and Tags-only invalidation.
- Update focused tests and current-state Synthesis documentation while retaining the existing service surface and migration inventory.

## Capabilities

### New Capabilities

- `synthesis-workbench-tag-import-command-client-consumer`: Defines strict Tag import client contracts and preserved Workbench orchestration for preview and apply commands.

### Modified Capabilities

None.

## Impact

The change affects the Tag contracts, in-process adapter and legacy composition, Workbench routing, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change Tag import domain parsing, preview state, autosync, staged edit, vocabulary edit/delete, public service methods, Host Bridge, MCP, or process ownership.

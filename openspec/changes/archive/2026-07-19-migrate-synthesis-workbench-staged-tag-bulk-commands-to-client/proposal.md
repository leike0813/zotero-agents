## Why

The Synthesis Workbench still resolves the complete legacy service for staged Tag suggestion promotion, discard, and clear even though Tag maintenance/export and adjacent domain commands use grouped client capabilities. Moving this cohesive staged-inbox lifecycle slice behind `client.tags` removes three more direct calls while tightening an already public but overly broad discard contract.

## What Changes

- Add a strict Tag selection DTO and opaque JSON-safe Tag command result.
- Add promote and clear methods to `SynthesisTagsClient` and narrow the existing discard method to the selection DTO.
- Add narrow in-process legacy ports with request rebuilding, object result normalization, and stable client error mapping.
- Route the three Workbench staged bulk commands through the lazily resolved default client while preserving payload aliases, empty-selection behavior, single-flight keys, start timing, diagnostics, and Tags-only invalidation.
- Keep the twelve-method Workflow Host compatible with an empty discard selection and update current-state documentation and boundary tests.

## Capabilities

### New Capabilities

- `synthesis-workbench-staged-tag-bulk-command-client-consumer`: Defines strict staged Tag selection contracts and preserved Workbench orchestration for promote, discard, and clear commands.

### Modified Capabilities

None.

## Impact

The change affects the Tag contracts, in-process adapter and legacy composition, Workflow Host type surface, Workbench routing, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change staged edit, Tag import, vocabulary edit/delete, bootstrap, audit, domain logic, public service methods, Host Bridge, MCP, or process ownership.

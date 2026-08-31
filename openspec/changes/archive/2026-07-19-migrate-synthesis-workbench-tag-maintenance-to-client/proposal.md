## Why

The Synthesis Workbench still resolves the complete legacy service for Tag Vocabulary validation, index rebuild, and regulator export even though adjacent Concept, Topic, Reference, and Graph commands use grouped client capabilities. Moving this coherent maintenance/export slice behind `client.tags` continues the client-boundary migration without changing Tag domain behavior or host-owned clipboard effects.

## What Changes

- Extract the existing Tag contracts into an environment-neutral top-level `SynthesisTagsClient` capability module.
- Add Tag Vocabulary validation and index rebuild methods while reusing the existing regulator export method.
- Add narrow in-process legacy ports with JSON-safe result normalization and stable client error mapping.
- Route the three Workbench commands through the lazily resolved default client while preserving confirmation, single-flight, deferred execution, clipboard formatting, and existing invalidation behavior.
- Update current-state Synthesis documentation and boundary tests without changing the public service surface or domain logic.

## Capabilities

### New Capabilities

- `synthesis-workbench-tag-maintenance-client-consumer`: Defines bounded Tag Vocabulary maintenance/export contracts and preserved Workbench orchestration for validation, index rebuild, and regulator export.

### Modified Capabilities

None.

## Impact

The change affects the Synthesis contracts package, in-process client adapter and legacy composition, production Workbench routing, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change staged suggestions, imports, vocabulary edits, bootstrap, audits, persistence, repositories, public service methods, Host Bridge, MCP, or process ownership.

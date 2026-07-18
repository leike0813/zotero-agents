## Why

The Synthesis Workbench still resolves the complete legacy service for Topic Graph rebuild and review mutations even though adjacent Concept, Topic, Reference, and Citation Graph commands use grouped client capabilities. Moving this coherent four-command slice behind an independent Topic Graph client preserves the separation between Topic Graph knowledge state and Citation Graph cache state.

## What Changes

- Add an environment-neutral top-level `SynthesisTopicGraphClient` for Topic Graph rebuild, edge acceptance/rejection, and review actions.
- Add strict canonical edge/review request DTOs and opaque JSON-safe command results.
- Add narrow in-process legacy ports with request rebuilding, shared result normalization, and stable client error mapping.
- Route the four Workbench commands through the lazily resolved default client while preserving confirmation, single-flight, diagnostics, deferred execution, and existing invalidation behavior.
- Update current-state Synthesis documentation and migration-boundary tests without changing the public service surface or domain logic.

## Capabilities

### New Capabilities

- `synthesis-workbench-topic-graph-command-client-consumer`: Defines bounded Topic Graph command contracts and preserved Workbench orchestration for rebuild, edge decisions, and review actions.

### Modified Capabilities

None.

## Impact

The change affects the Synthesis contracts package, in-process client adapter and legacy composition, production Workbench routing, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change Topic Graph queries/checkpoint export, persistence, repositories, public service methods, Host Bridge, MCP, Citation Graph, or process ownership.

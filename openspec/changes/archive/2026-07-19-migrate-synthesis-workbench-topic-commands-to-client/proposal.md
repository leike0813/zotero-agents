## Why

The production Synthesis Workbench already reads Topic data through grouped `SynthesisClient` capabilities, but four Topic commands still resolve the complete legacy service directly. Migrating this cohesive command group advances the staged client boundary while preserving current Topic deletion, discovery review, and UI orchestration behavior.

## What Changes

- Extend `SynthesisClient.topics` with bounded commands for Topic artifact deletion, deleted-artifact purge, discovery-hint rejection, and discovery-hint restoration.
- Add strict canonical Topic and discovery-hint request DTOs plus opaque JSON-safe command results.
- Add narrow in-process legacy ports with request rebuilding, shared result normalization, and stable client error mapping.
- Route the four Workbench commands through the lazily resolved default client while preserving confirmation, single-flight, diagnostic, failure, and invalidation behavior.
- Update current-state Synthesis documentation and migration boundary tests without changing the public service surface or domain logic.

## Capabilities

### New Capabilities

- `synthesis-workbench-topic-command-client-consumer`: Defines bounded client contracts and preserved Workbench behavior for Topic artifact deletion/purge and discovery-hint rejection/restoration.

### Modified Capabilities

None.

## Impact

The change affects the environment-neutral Synthesis contracts package, the in-process client adapter and legacy composition, production Workbench command routing, focused client/boundary/UI tests, and current-state Synthesis documentation. It does not change persistence schemas, repositories, public service methods, Host Bridge, MCP, Topic Graph commands, Topic mirror operations, or process ownership.

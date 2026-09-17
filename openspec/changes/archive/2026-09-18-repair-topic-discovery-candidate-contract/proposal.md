# Proposal

## Why

Topic discovery hints are currently stored and projected as opaque JSON objects: the protocol schema is open, Rust uses `Value`, and the Workbench never receives the data on its Topic Detail path. This both breaks the recursively closed sidecar contract gate and leaves reject/restore commands without the same typed candidate object that the user is acting on.

## What Changes

- **BREAKING**: remove opaque `discovery.hints` objects from the general Topic projection and replace them with a strict public `TopicDiscoveryCandidate` DTO on Topic Detail.
- Keep the five-state persisted discovery record internal; expose only actionable `open` and `rejected` candidates to the Workbench.
- Build Topic Detail candidates across the confirmed `broader_than` descendant scope, deduplicate by literature identity, prefer an open candidate, and return a bounded deterministic order.
- Return the same strict candidate DTO from discovery reject and restore commands.
- Render open candidates and restorable rejected candidates in the existing Workbench Reader/Topic Detail surface with reject/restore actions.
- Update the cross-language schema corpus and Synthesis documentation to make the public/internal split explicit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-cross-language-sidecar-contract`: require a recursively closed discovery-candidate schema with matching TypeScript and Rust acceptance.
- `synthesis-client-contracts`: require concrete Topic Detail discovery and discovery-command result DTOs instead of opaque JSON objects.
- `synthesis-sidecar-topic-application-foundation`: make bounded, cascaded, deduplicated discovery candidates part of the Topic Detail application projection.
- `synthesis-native-topic-workbench-surface`: adapt persisted discovery records into the strict public candidate DTO without exposing storage payloads.
- `synthesis-workbench-topic-command-client-consumer`: make reject/restore return the updated public candidate and keep the existing command/invalidation path.
- `synthesis-workbench-ui`: render and act on Topic discovery candidates in the existing Reader/Topic Detail region.

## Impact

- Contracts: `packages/synthesis-contracts`, protocol JSON schemas, and the shared contract corpus.
- Native sidecar: Topic application DTO/projection, repository discovery reads, and Topic Workbench route adapters.
- Workbench: shared wire contract, Reader projection/components, and existing topic command dispatch.
- Documentation: Topic discovery lifecycle and Workbench UI descriptions.
- No database migration, new endpoint, dependency, or background producer is introduced.

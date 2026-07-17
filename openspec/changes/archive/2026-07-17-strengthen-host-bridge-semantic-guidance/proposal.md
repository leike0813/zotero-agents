## Why

The Host Bridge exposes a broad CLI command surface, but its machine descriptor is incomplete and much of its safety metadata is inferred from command-name heuristics rather than backend facts. The three human-facing surfaces also lack enough domain-oriented guidance for agents to choose commands, preserve evidence, and recover safely without reading a flat command table.

## What Changes

- **BREAKING** Upgrade the agent-facing CLI descriptor and offline identity contract to `host-bridge.agent-surface.v2`, `host-bridge.surface-identity.v2`, and `zotero-bridge.cli.v2` while retaining Host Bridge HTTP protocol v1.
- Derive the complete command inventory and behavioral facts from the Rust CLI and structured backend bindings instead of regular-expression parsing and manual command sets.
- Compose generated command facts with schema-validated operation guidance that gives every public leaf command a specific selection rule, near-miss, evidence contract, example, and safe recovery path.
- Add progressively disclosed, reference-backed operating manuals and executable task recipes for the CLI wrapper, bounded Zotero Library Agent, and resident Zotero Librarian profile so each materialized package is usable without repository source access.
- Separate CLI invocation, decoded payload, result data, effects, approval stages, typed handle transitions, and preconditioned recovery in Agent Surface v2.
- Evaluate each materialized surface with source-blind agent journeys before declaring the change complete.
- Separate version-neutral content render/check commands from release identity materialization so feature changes can commit deterministic generated guidance without bumping or publishing.
- Make release planning compare against the latest completed release receipt and publish only from an explicitly prepared release-set/version change after changes have merged to `main`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-cli-interface`: Require a complete v2 Agent Surface, structured command discovery, backend-aligned safety metadata, and domain-oriented offline search/describe behavior.
- `host-bridge-cli-debug-commands`: Include all debug commands in the machine contract while keeping diagnostic commands out of ordinary intent recommendations by default.
- `zotero-library-agent-bundle`: Generate bounded task routing and evidence recipes from shared command facts plus Library-Agent-owned semantic supplements.
- `zotero-librarian-profile`: Generate resident maintenance guidance while preserving the profile's local-index, monitoring, and scheduled-read-only policy boundary.
- `host-bridge-release-pipeline`: Separate content validation from release preparation, accumulate unreleased changes from the latest complete receipt, and prevent ordinary feature merges from publishing.

## Impact

The change affects the Rust CLI command model and offline surface endpoints, Agent Surface schemas/generators, semantic sources and renderers for all three agent-facing surfaces, content/release governance scripts, OpenSpec contracts, and the unified Host Bridge release workflow. Generated command descriptors and semantic references will change, but component versions, the current release set, and external repositories will not change as part of this change.

## Why

The seven Host Bridge CLI Skills currently ship through the independently installed Content Package even though their exact command contract and release identity are owned by the plugin's bundled CLI. This split permits an incompatible Skill/CLI combination and makes a working Host Bridge installation depend on an optional content subscription.

## What Changes

- **BREAKING** Move the generated minimum-core and Generic Host Bridge Skill bundle from `skills_builtin/` into the plugin XPI under `content/host-bridge-skills/`; the Content Package no longer contains those seven Skill IDs.
- Add an integrity manifest that binds the seven-Skill closure to the bundled CLI version, build fingerprint, command-catalog checksum, surface versions, runner contracts, per-file digests, and aggregate digest.
- Materialize and validate the XPI bundle into a dedicated runtime root before the plugin Skill registry's first scan.
- Reserve the seven surface-derived Skill IDs for the validated `xpi-bundled` source. Official-content, development, and user copies are rejected and never used as fallback; precedence for all other Skills is unchanged.
- Persist the XPI bundle identity with ACP runs and reject silent recovery after a plugin upgrade changes that identity.
- Move the matching complete Host Bridge receipt gate from Content Package publication to plugin publication, and validate the complete Host Bridge inventory in the built XPI.
- Release plugin version `0.9.0` and Content Package version `0.8.0` with `plugin >=0.9.0`; this change does not publish, tag, update feeds, dispatch Host Bridge release workflows, or alter the CLI build fingerprint.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `host-bridge-agent-surfaces`: Generated Host Bridge Skills form one integrity-bound XPI bundle while preserving the exact seven-Skill surface closure and semantic bytes.
- `content-package-subscription`: Official content installation and replacement no longer owns or mutates the reserved Host Bridge Skill bundle.
- `content-package-release`: Content archives exclude the seven reserved Host Bridge Skills and no longer depend on a Host Bridge complete receipt.
- `plugin-skill-registry`: The registry validates and exclusively selects the XPI-bundled source for surface-derived reserved IDs.
- `acp-shared-skill-catalog-thin-proxy-overlay`: Shared catalogs record the XPI bundle and CLI identity while retaining content-derived Skill checksums.
- `acp-chat-session-management`: ACP Chat injects the reserved Host Bridge Skills through the existing registry path and refuses recovery across bundle identity changes.
- `acp-skills-session-recovery`: ACP Skills persists and compares the Host Bridge plugin Skill bundle identity before recovery.
- `host-bridge-release-pipeline`: Plugin release, rather than Content Package release, requires the matching complete Host Bridge receipt and validates the bundled Skills and CLI assets.

## Impact

This affects the Host Bridge surface renderer and validators, plugin packaging and release workflows, Content Package construction and release gating, startup materialization, the plugin Skill registry/shared catalog, ACP Chat and ACP Skills persisted run state, release-coordinator classification, documentation, generated Host Bridge paths, and their focused tests. The semantic sources in `skills_src/`, hosted Hermes profile output, CLI sources, command catalog, and external surface payload bytes remain unchanged.

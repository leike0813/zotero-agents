## Why

The current agent-facing choices are either a low-level Host Bridge CLI wrapper or a Hermes-specific, continuously operating Zotero Librarian profile. General third-party agents need a self-contained, agent-neutral surface that explains how to inspect a Zotero library and operate Zotero Agents on demand without inheriting resident maintenance, scheduling, or persistent-state assumptions.

## What Changes

- Add a standalone `zotero-library-agent-bundle` containing an on-demand `zotero-library-agent` Skill, the existing `zotero-bridge-cli` wrapper Skill, Host Bridge CLI prebuilds, installers, schemas, and stateless validation helpers.
- Define a generic evidence bundle for carrying Zotero refs, provenance, artifacts, workflow handles, and writeback state to downstream systems such as a future ResearchSpec adapter.
- Add a shared Host Bridge control-invariants reference for protocol-level terminology, handle ownership, approvals, file transfer, and writeback boundaries while keeping each agent-facing surface's task policy independent.
- Extend semantic review, rendering, versioning, checks, and GitHub publication to govern and publish the new repository alongside the existing CLI bundle and Zotero Librarian profile.
- Keep the Zotero Librarian profile as the Hermes-specific resident-maintenance surface with its own index, cron, inbox, and monitoring behavior.

## Capabilities

### New Capabilities

- `zotero-library-agent-bundle`: Defines the agent-neutral Skill surface, bundle contents, evidence contract, stateless helper boundary, versioning, and standalone distribution.

### Modified Capabilities

- `host-bridge-release-pipeline`: Publishes and verifies the new bundle from the same source commit and Host Bridge CLI prebuild set as the existing surfaces.
- `zotero-librarian-profile`: Keeps resident Hermes maintenance policy distinct while consuming only shared protocol-level facts.

## Impact

- Adds semantic and rendered Skill trees under `skills_src/` and `skills_builtin/`.
- Adds a shared protocol reference, JSON schemas, a Python standard-library helper, bundle renderer/check/version/publisher scripts, and focused tests.
- Extends `package.json`, Host Bridge surface governance, release coordinator inputs, and both Host Bridge GitHub release workflows.
- Adds publication to `leike0813/zotero-library-agent-bundle`; no ResearchSpec files or runtime contracts are modified in this change.

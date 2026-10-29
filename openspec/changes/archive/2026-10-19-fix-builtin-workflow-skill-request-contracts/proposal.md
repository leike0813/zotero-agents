# Proposal

## Why

Create Topic Synthesis fails before the first ACP prompt because its production requests contain Planned Topic parameters absent from generated Skill schemas. Existing green tests exercise workflow construction, schema fixtures and Python runtime separately; sidecar protocol coverage does not cover this earlier boundary.

## What Changes

- Align generated topic preparation and downstream parameter contracts with planned/ad-hoc entry and inherited sequence parameters.
- Align builtin form requiredness with the existing research bundle and manuscript Skill contracts.
- Declare the missing Tag Bootstrapper parameter contract and preserve offending field paths in schema diagnostics.
- Exercise every builtin Skill producer through real request construction, sequence expansion and production schema validation, including dynamic branches and file handoff.
- Distinguish validated boundaries from unused namespaces and non-Skill workflows in coverage reporting.

## Capabilities

### New Capabilities

- `builtin-workflow-skill-contracts`: Production builtin workflow requests conform to their Skill input and parameter contracts, with executable producer coverage and actionable validation diagnostics.

### Modified Capabilities

None. The topic entry and research-bundle requiredness fixes restore existing specified behavior.

## Impact

Topic Skill schema renderer and three generated parameter assets; Tag Bootstrapper schema/runner assets; two workflow manifests; ACP schema diagnostics; Node contract tests, documentation and project guidance. No new dependency, protocol kind, native binary, release or data migration is required.

# Proposal

## Why

Literature analysis fails before apply because its JSON renderer validates a bare matching-metadata artifact against a schema for the template context. A run-local Agent repaired the old shared catalog on October 13; installing dev.4 created a new catalog and exposed the unchanged source defect again.

## What Changes

- Correct the Skill's matching-metadata render schema to describe the emitted bare artifact, retaining all existing field constraints.
- Add CLI rendering and fresh/rebuilt catalog acceptance tests, retaining the real TS/Rust apply and reopen checks.
- Record current verification and delivery boundaries without changing the archived protocol-parity evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-workflows`: require matching-metadata rendering to work from unmodified Skill content in a newly materialized catalog.

## Impact

The literature-analysis submodule's render schema and Python tests, one existing main-repository native workflow test, and this OpenSpec record. Host API v12, canonical artifacts, wire schemas, Rust receivers, package mappings, dependencies and cache policy remain unchanged. Commit, gitlink update, publication and installation require separate delivery authorization.

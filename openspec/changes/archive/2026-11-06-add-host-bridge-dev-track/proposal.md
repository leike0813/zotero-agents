# Proposal

## Why

Host Bridge development builds currently consume the same CLI and surface patch counters as formal releases. Frequent development iterations therefore cause unexplained public version jumps; a development branch prebuild alone does not isolate publication state.

## What Changes

- Add independent stable and dev version counters, with strict `X.Y.Z-dev.N` development versions and channel-local release sets and complete receipts.
- Keep the root CLI manifest and generated release set as the selected build projection; formal release decisions use the last completed stable identity, never development counters or an uncompleted plan.
- Publish all three surfaces through one existing coordinator with isolated stable/dev mutable refs and source-branch finalization.
- Preserve exact seven-platform prebuild selection and require rebuilt binaries when changing the embedded CLI version.
- Initialize stable history from the verified remote immutable `hbrs-8c6de08010d459a0e87e74f2` (CLI `0.5.1`, surfaces `0.5.2`), without rewriting installed or prebuilt binaries.
- Update existing behavior suites, operational documentation, and release/prebuild Skills. Do not publish, push, commit, install dependencies, or change agent-facing operational instructions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-release-pipeline`: independent channel counters, version-bound prebuilds, channel-local publication, recovery, and finalization.
- `host-bridge-agent-surfaces`: preserve development prerelease identity without consuming stable surface patches.

## Impact

Version governance, release planning/preparation/rendering, three-surface manifests, dispatch/controller/workflow, prebuild synchronization and plugin asset verification, tests 139/168/170, release specifications, and release/prebuild operational Skills. The existing content-addressed prebuild store and all runtime Host capabilities remain unchanged.

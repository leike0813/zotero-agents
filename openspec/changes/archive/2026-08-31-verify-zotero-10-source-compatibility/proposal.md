## Why

The project supports Zotero 7, 9, and 10 but lacks version-pinned Zotero source trees for repeatable compatibility audits. CI and public documentation also retain older submodule and version assumptions, making the tested support boundary harder to verify.

## What Changes

- Add shallow Zotero source submodules pinned to stable 7.0.32, 9.0.6, and 10.0.1 commits while leaving nested submodules uninitialized by default.
- Exclude those reference worktrees from default repository search and indexing, and limit CI content-submodule initialization to `skills_builtin`.
- Record the Zotero 10 source audit and govern how source baselines, compatibility fixtures, and public support statements stay aligned.
- Update testing and localized user documentation to describe the verified Zotero 7/9/10 support boundary.
- Regenerate embedded help documentation from its site sources.

## Capabilities

### New Capabilities

- `zotero-source-reference-governance`: Governs pinned Zotero source baselines, default exclusion, nested-submodule initialization, and coordinated compatibility review.

### Modified Capabilities

None.

## Impact

Affected areas are repository submodule metadata, ignore rules, CI workflows, project/testing documentation, localized README and Docusaurus sources, generated help documentation, and OpenSpec. Plugin runtime APIs, DTOs, schemas, dependencies, and `src/**` behavior do not change.

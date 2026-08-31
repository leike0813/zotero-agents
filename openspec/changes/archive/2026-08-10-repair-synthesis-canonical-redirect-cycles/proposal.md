## Why

Canonical redirect facts can currently form a cycle when an open duplicate merge proposal is reverse-accepted after a sibling proposal has already materialized the forward redirect. Effective-canonical reads then fail, leaving users unable to open the Reference Index even though they cannot inspect or prevent the conflicting facts themselves.

## What Changes

- Define the canonical redirect graph as an acyclic rooted forest with one deterministic effective canonical per component.
- Interpret review accept, reverse accept, and manual retarget as component merge/reroot intents instead of raw edge inserts.
- Atomically supersede proposal facts displaced by a newer explicit decision and suppress semantically redundant open merge proposals.
- Enforce the final redirect graph invariant at every repository write boundary.
- Repair cycles already present in production databases during a versioned startup migration, preserving the newest explicit decision and recording a durable repair receipt.
- Normalize imported redirect graphs before durable bundle import commits.
- Reuse one redirect graph resolver in Reference Index and Citation Graph reads.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-reference-sidecar-citation-graph`: Require canonical redirects to remain an acyclic rooted forest and define deterministic automatic recovery for existing cyclic facts.
- `synthesis-sidecar-reference-matching-review-application-foundation`: Define component-aware reverse/retarget semantics, displaced proposal supersession, and atomic redirect normalization.
- `synthesis-sidecar-durable-bundle-import-foundation`: Require imported redirect facts to be normalized and validated before commit while preserving repair provenance.

## Impact

- Affects the Rust synthesis application, repository, production sidecar composition, Reference Index projection, Citation Graph command path, and durable import path.
- Adds an internal versioned redirect-graph migration identity for a one-time production data repair without changing the public repository foundation schema contract.
- Does not change public client DTOs, RPC capability names, UI controls, or dependencies.

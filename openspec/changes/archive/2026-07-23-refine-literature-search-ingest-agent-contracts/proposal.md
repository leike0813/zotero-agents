## Why

Literature Search Ingest now enforces the right stage order, but its agent-authored payloads still repeat gate-known context and fixed validation assertions, while its completed output repeats detailed evidence for every selected candidate. These contracts make correct execution harder and make successful runs unnecessarily noisy even though the detailed audit trail already exists in runtime artifacts.

## What Changes

- Remove the redundant `When To Use` and `Do Not Use` body sections while keeping the complete trigger contract in the Skill description and the operational safety boundaries in the executable workflow.
- Describe the Skill as running in interactive mode without claiming that it can run only through one backend or protocol surface.
- **BREAKING** Replace agent-authored stage actions with semantic-minimal payloads; the gate/runtime derives action routing, discovery round, current candidate, hashes, fixed policy values, identity keys, counts, and other deterministic fields.
- **BREAKING** Accept discovery-round deltas and merge them into the cumulative candidate/evidence state instead of requiring the agent to resubmit the entire accumulated set.
- **BREAKING** Replace the verbose completed output with a runtime-generated count summary and conditionally minimal per-approved-candidate outcomes.
- Generate the compact ledger and final output deterministically from accepted state and receipts, while retaining JSON gate state as the workflow source of truth.
- Preserve all existing search, evidence, metadata, PDF, ingest, interaction, failure, cancellation, and recovery semantics except for the explicitly authorized body-section and wire-contract changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: Refine the Literature Search Ingest interactive wording, agent payload contract, cumulative discovery behavior, and completed output contract without weakening its stage gates or semantic guidance.

## Impact

- Affected Skill package: `skills_builtin/literature-search-ingest`, including its action/output schemas, gate runtime, stage runtime, runner prompt, main instructions, and four stage references.
- Affected workflow documentation and focused workflow/runtime tests.
- The workflow apply hook remains unchanged and continues to consume `itemRef.id`, `ingestStatus`, `pdfStatus`, and `needsCuration`.
- No dependency, database, Host DOI, workflow parameter, version, release, or publication changes.

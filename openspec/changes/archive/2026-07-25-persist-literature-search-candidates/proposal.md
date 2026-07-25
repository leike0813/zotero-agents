## Why

The instruction-backed literature workflow now permits flexible delegation, but
the discovery candidates still exist only as implicit main-agent state. Stage 30
can render that state for review, yet Stage 40 has no direct, recoverable input
that a subagent can read. The resulting handoff requires an unnecessary
aggregate-and-split conversion before research begins.

## What Changes

- Persist each deduplicated discovery candidate immediately as one JSON file in
  `runtime/candidates/`.
- Update the same candidate file when later discovery adds evidence for the same
  direct work.
- Let Stage 30 read those files directly to render the approval table and resolve
  the user's decision to candidate ids.
- Pre-allocate each candidate's single-paper Host payload path in that candidate
  file.
- Pass one or more approved candidate file paths to subagents through the static
  prompt; remove the aggregate candidate data and separate output-path map
  contracts.
- Preserve flexible subagent grouping, mandatory metadata/direct-work/PDF work,
  direct per-paper Host payloads, incremental collection, serial mutation,
  receipts, recovery, ledger, and final output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: persist and consume one discovery candidate
  file per direct work while preserving the existing search and ingest stages.
- `literature-workbench-workflows`: pass candidate file paths and use the
  payload path embedded in each candidate file for flexible research delegation.

## Impact

- The Skill and its search and recovery references gain a small file-based
  candidate handoff contract.
- Contract tests verify the candidate file shape and prompt path contract.
- No workflow version, runner configuration, Host contract, parameter schema,
  output schema, or apply hook changes.
- No gate, scheduler, fixed batch, aggregate candidate payload, or new validation
  script is introduced.

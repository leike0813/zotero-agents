## Why

`workflow agent-run` currently produces a handoff bundle for agent-owned execution,
but it does not provide a Host-managed apply-back path. Agents can execute the
workflow externally, yet cannot return a finalized SkillRunner-style bundle for
the Zotero host to apply through the workflow's existing `applyResult` hook.

## What Changes

- Extend workflow agent-run handoff with a lightweight `agentRunId`, TTL, and
  prepared request records built by the existing buildRequest/declarative
  request path.
- Keep agent-run backend-free: Host Bridge builds context only and does not
  dispatch backend jobs during handoff.
- Add an explicit one-shot apply-back endpoint for local SkillRunner-style
  bundle paths.
- Apply-back rechecks current host apply readiness, requests Zotero-side write
  approval, and runs workflow `applyResult` with the stored prepared request.
- Include a vendored SkillRunner-compatible output-contract Python toolkit from
  Zotero Agents assets in handoff bundles so agents can finalize output using
  the same deterministic bundle contract.
- Add CLI support for `workflow agent-apply`.

## Capabilities

### Modified Capabilities

- `host-bridge-workflow-control`: Adds agent-run handles, prepared request
  projection, and apply-back.
- `host-bridge-cli-interface`: Adds CLI apply-back command and expanded
  agent-run output.
- `workflow-execution-seams`: Reuses request preparation and apply execution
  boundaries for agent-owned results.
- `workflow-runtime`: Clarifies that agent-run may execute buildRequest for
  context materialization without submitting backend work.

## Impact

- Host Bridge workflow control gains a lightweight agent-run store and apply
  route.
- Agent-run handoff bundles gain prepared request context and bundled output
  finalizer tooling from project assets.
- Rust CLI gains `workflow agent-apply`.
- Generated Host Bridge docs, wrapper skill guidance, and Zotero Librarian
  profile references are updated to the current apply-back flow.

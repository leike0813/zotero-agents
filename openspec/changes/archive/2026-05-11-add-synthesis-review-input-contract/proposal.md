# Add Synthesis Review Input Contract

## Why

The next literature review workflow should consume Synthesis Layer v1 assets
without re-deciding topic scope, resolver semantics, paper sets, registry
readiness, or citation graph access. Synthesis Layer needs a stable input
contract that exposes those assets while keeping review writing logic out of
the infrastructure layer.

## What Changes

- Add a `ReviewWorkflowInput` DTO builder for topic synthesis assets.
- Include topic synthesis Markdown, metadata, resolved paper set, registry
  readiness, citation graph slice, missing artifact diagnostics, and topic
  timeline.
- Add a read-only MCP tool `synthesis.get_review_input`.
- Document the recommended review workflow input contract.

## Out of Scope

- Implementing the literature review workflow.
- Generating review prose.
- Building method lineage, claim conflict, research gap, or topic timeline
  graphs.
- Re-running topic resolver or agent synthesis.
- Any write operation.

## Capabilities

### New Capabilities

- `synthesis-review-input-contract`: Stable DTO and read-only MCP entry point
  for future review workflows.

### Modified Capabilities

- `synthesis-mcp-tools`: Adds `synthesis.get_review_input`.

## Impact

- Adds review input helpers under `src/modules/synthesis/`.
- Extends Synthesis MCP service/protocol type surface.
- Adds contract tests for normalized review input and MCP routing.
- Adds documentation under `doc/components/`.

# Change: Split Topic Get-Context Host Views

## Why

`topics.get_context` currently returns topic semantics, hashes, freshness,
discovery diagnostics, and update hints in one flat object. That makes large
responses easy to truncate in stdout/MCP transports and gives callers no clean
way to ask for only semantic content or only audit/control state.

## What Changes

- Add explicit `digest`, `semantic`, `audit`, and `full` views to
  `topics.get_context`.
- Keep legacy no-view calls compatible with the current flat response shape.
- Add `outputPath`/`output_path` support so large explicit view results can be
  written to a UTF-8 JSON file while stdout/MCP returns a compact envelope.

## Impact

This change only affects the Host Bridge/MCP/service-facing topic context
contract. It does not change topic synthesis skill prompts, workflow manifests,
split runtime payload schemas, or update route selection.

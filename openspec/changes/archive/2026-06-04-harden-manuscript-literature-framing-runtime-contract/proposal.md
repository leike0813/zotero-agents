## Why

The builtin `manuscript-literature-framing` skill currently lets its stage
runtime write `result/result.json`, which conflicts with ACP interactive output
semantics where the assistant turn must emit `__SKILL_DONE__` and the runner
owns the final result file after validation. Its analysis stage persistence also
accepts non-empty but structurally empty payloads, allowing weak framing inputs
to advance into final drafting.

## What Changes

- Move runtime-authored business output from `result/result.json` to the
  fallback-compatible `manuscript-literature-framing.result.json`.
- Require the final assistant turn to output `__SKILL_DONE__: true` plus the
  business fields from that fallback result file.
- Keep `__SKILL_DONE__` out of business output schemas and persisted business
  result files.
- Add minimal deterministic structure checks for four framing analysis payloads
  and paragraph-level writing plans.
- Document and support a host-unavailable cancel branch that writes the same
  fallback business result file.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `manuscript-literature-framing`: hardens the runtime result boundary,
  assistant final envelope contract, payload gates, and host-unavailable cancel
  branch.

## Impact

- Affects only the builtin `manuscript-literature-framing` skill package and its
  OpenSpec capability contract.
- No ACP runner generic behavior changes.
- No new npm or Python dependencies.

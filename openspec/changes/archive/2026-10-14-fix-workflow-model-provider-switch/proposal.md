# Proposal

## Why

Workflow options and submit dialogs discard ACP model-provider drafts during runtime normalization, then reconstruct the old provider from the old model. SkillRunner can similarly restore a provider encoded in an old model, making a new provider selection unusable.

## What Changes

- Preserve ACP UI provider selections independently of runtime options and derive fields and model choices from the same UI state.
- On an explicit provider dropdown change, select the first model in that provider's advertised order for ACP and SkillRunner.
- Preserve unset/unavailable ACP values during ordinary mounting and refresh; retain full raw model identifiers and explicit-only reasoning.
- Keep valid explicit SkillRunner providers authoritative over model prefixes and prevent stale submit-dialog descriptor results from overwriting newer drafts.
- Extend existing behavioral tests and document the interaction contract.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-settings-single-source-submit-flow`: provider switching, selection stability and stale refresh handling in both workflow settings surfaces.

## Impact

Shared workflow settings, Dashboard actions and field controls, submit-dialog host, and SkillRunner option normalization. No public field, wire format, dependency or persistence migration changes.

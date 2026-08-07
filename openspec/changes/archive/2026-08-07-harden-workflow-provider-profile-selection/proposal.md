## Why

Workflow calls through the Zotero Bridge CLI can currently reach submission without a reliable providerProfile contract, a user-confirmation gate, or a trustworthy ACP catalog projection. An Agent may copy an arbitrary providerProfile shape from discovery, silently guess a backend/provider/model, or reject a model that the GUI can use; the K3 feedback shows the resulting disclosure and validation failures, including the missing `qwen3.7-plus` model and misleading ACP provider/model lists.

The change is needed now because provider selection is a user-visible execution choice and the CLI, Host Bridge, GUI, and ACP session cache currently use overlapping but inconsistent rules. The environment default must remain an explicit operator choice: when `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` is set, the CLI reads and validates it directly without asking the user; only the no-environment case requires an Agent-to-user confirmation step.

## What Changes

- Establish one canonical provider-profile runtime option contract shared by descriptor generation, validation, Host workflow submission, GUI projection, and execution normalization.
- Define provider-profile resolution precedence as explicit `--provider-profile`, then `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, then a Host-saved workflow default exposed only as an unconfirmed candidate, then no profile.
- Make the Agent-facing workflow procedure require presenting and obtaining user confirmation for a candidate or fully specified profile when no environment default exists; prohibit guessing backend/provider/model or filling a value merely because it matches a discovered shape.
- Preserve explicit `{}` as an intentional empty profile that overrides environment defaults, and keep direct REST callers independent from the CLI process environment.
- Validate backend identity, provider options, dependency relationships, dynamic catalog membership, and readiness before dispatch, returning structured failures without silently substituting invalid values.
- Normalize and project the ACP relationship `backendId -> providerId -> modelProvider -> modelId -> reasoningEffort`; group `acpModelId` choices by `acpModelProvider`, preserve the existing flat `providerOptions` wire shape, and fix valid provider-plus-model selections being reported as `could_not_be_applied`.
- Add a backend-scoped `workflow profile refresh --backend <id>` projection that reuses ACP probe/session catalog collection for CLI and GUI, and expose catalog source, revision, refresh time, state, consistency diagnostics, and readiness.
- Treat stale, missing, or contradictory catalogs as not ready; cover the K3 stale-catalog, 709-model, provider-grouping, missing-model, and provider/model-combination cases.
- Update agent-facing CLI guidance and Host Bridge documentation so the command contract, confirmation gate, profile refresh flow, and providerProfile semantics are explicit and implementation-aligned.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `backend-provider-profile-contract`: Define canonical profile schema, resolution precedence, environment-default behavior, explicit empty-profile semantics, fail-closed validation, readiness, and shared catalog projection.
- `host-bridge-workflow-control`: Require resolved and validated provider profiles at workflow submission, distinguish candidate disclosure from confirmed selection, and expose backend-scoped profile refresh and diagnostics.
- `host-bridge-agent-surfaces`: Publish the profile-selection disclosure, user-confirmation gate, refresh command, structured errors, and recovery rules in the generated CLI surface and `zotero-bridge-cli` Skill.
- `acp-skills-runtime-options`: Align ACP model/provider grouping, canonical selection normalization, catalog freshness and consistency, and runtime application of valid provider-plus-model selections across GUI, CLI, Chat, and Skills.

## Impact

- Affected Rust CLI workflow parsing, provider-profile fallback, profile validation, and workflow submission commands.
- Affected TypeScript Host Bridge workflow control, provider profile schema/normalization, ACP provider and model-option folding, runtime catalog cache, and shared GUI/CLI projections.
- Affected generated agent-facing surfaces under `skills_src`/materialized profile references and the Host Bridge CLI documentation; generated outputs must be regenerated rather than edited directly.
- Affected contract and integration tests for profile precedence, confirmation behavior, catalog readiness, ACP provider/model selection, and K3 fixtures.
- No new dependency or persistence format is required; the existing flat provider-options wire shape is retained.

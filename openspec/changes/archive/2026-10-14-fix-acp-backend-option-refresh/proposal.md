# Proposal

## Why

Backend switching revives removed options from saved workflow settings. ACP reasoning choices are cached for the default model but offered for other models, causing unavailable configuration failures after model selection.

## What Changes

- Give complete form drafts explicit replacement semantics while retaining partial-patch callers.
- Restore backend-scoped clearing and read-only current display without implicit RPC overrides.
- Automatically prepare a selected model/mode reasoning catalog with bounded cancellation and stale-response isolation.
- Validate explicit reasoning after live mode/model configuration, preserving structured failures and backend errors.
- Name modern and legacy OpenCode presets clearly and use `acp-opencode2` for newly created modern profiles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-settings-single-source-submit-flow`: complete draft authority and shared catalog preparation on both forms.
- `acp-skills-runtime-options`: model-bound reasoning cache and staged runtime validation.
- `backend-manager-ui`: OpenCode preset names and new-profile identity.

## Impact

Settings domain, ACP probe/cache/provider validation, Dashboard and submission form DTOs, existing regression suites, preset metadata and documentation. No dependencies or saved-profile migration.

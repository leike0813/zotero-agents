# Change: Support ACP Config Options Runtime Cache

## Why

OpenCode ACP can advertise session mode, model, and reasoning selectors through
ACP v1 `configOptions` instead of the older `modes` / `models` fields. The
plugin currently ignores those options during backend cache refresh, so a
successful refresh can persist an empty runtime cache and make mode/model
selection unavailable.

## What Changes

- Teach ACP backend probes to derive the existing runtime options cache from
  `configOptions`, with old `modes` / `models` as fallback.
- Preserve an existing non-empty runtime options cache when a refresh fails or
  returns no selectable mode/model data.
- Use `session/set_config_option` for ACP session controls when a session
  advertises matching config options; keep old mode/model methods as fallback.
- Project `config_option_update` notifications into ACP chat runtime selectors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skills-runtime-options`: ACP Skills runtime cache and workflow settings
  must support ACP `configOptions`.
- `acp-opencode-global-chat`: ACP chat must project config option state into
  mode/model selectors and use config-option setters when available.
- `acp-model-effort-selector`: model/reasoning controls may use
  `session/set_config_option` when advertised by the backend.

## Impact

Affected code is limited to ACP protocol types, ACP client/adapter/session
runtime handling, backend probing, ACP provider option normalization, and focused
ACP tests. No user-facing setting names, workflow manifest fields, or frontend
layout changes are introduced.

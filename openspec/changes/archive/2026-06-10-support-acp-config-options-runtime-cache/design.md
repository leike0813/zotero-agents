# Design: ACP Config Options Runtime Cache

## Runtime Cache Source

ACP probes treat `configOptions` as the preferred source for session runtime
selectors. Select options with category `mode`, `model`, and `thought_level`
map to the existing cache fields for modes, raw/display models, and reasoning
efforts. If no usable `configOptions` are present, the probe keeps the existing
legacy `modes` / `models` normalization.

Refreshes are non-destructive for usable cached selectors: a failed probe or a
probe result with no selectable mode/model data keeps the previous non-empty
runtime cache while updating connection-test status.

## Session Control

The ACP adapter stores the latest session config options returned by session
setup, `session/set_config_option`, or `config_option_update`. Mode/model/
reasoning changes prefer `session/set_config_option` when the relevant category
is advertised, and fall back to `session/set_mode` or `session/set_model` for
older backends.

## Chat Projection

ACP chat projects `configOptions` into the same snapshot selector fields that
legacy `modes` / `models` use. This keeps the dashboard model unchanged while
allowing OpenCode ACP to update selectors through `config_option_update`.

## Compatibility

Existing workflow settings, ACP Skills runtime option names, and older ACP
backends remain compatible. No Promise queue, frontend redesign, or persisted
schema migration is required.

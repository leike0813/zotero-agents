# Design

SkillRunner Host Bridge access already uses generic `runtime_options.env` for
endpoint, token, and connection mode. This change adds a fourth env value:
`ZOTERO_BRIDGE_SCOPE`, containing JSON with `kind: "skillrunner-run"` and the
stable SkillRunner run request id.

The Host Bridge permission manager keeps its current split:

- `acp-chat` routes to ACP Chat.
- `acp-skill-run` and `acp-run` route to ACP Skills.
- `skillrunner-run` routes to the SkillRunner run workspace state.
- Missing or unknown scope routes to the existing global approval prompt.

SkillRunner pending permissions are runtime UI state, not ACP run records. A
small SkillRunner permission registry owns live resolvers and exposes a
snapshot payload to `skillRunnerRunDialog.ts`. The existing assistant panel
permission interaction model is reused for rendering and actions.

The CLI config loader treats `ZOTERO_BRIDGE_SCOPE` as an env override above
profile scope. This keeps published template profiles static while allowing the
plugin to inject per-run scope at submission time.

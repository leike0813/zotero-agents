## Why

Hermes Agent can run as an ACP backend, but Backend Manager does not provide a
Hermes preset and ACP preset creation currently requires a separate dropdown
selection before clicking an add button. Hermes also differs from existing ACP
families because it does not consume project-level Agent Skill directories, so
the ACP Skills runner needs to surface available skills through a Hermes-specific
instruction file instead of proxy skill injection.

## What Changes

- Add a Hermes ACP backend preset using `hermes acp` with `agentFamily:
  "hermes"`.
- Replace the ACP preset dropdown plus adjacent add button with one "add ACP
  profile from preset" menu button that includes preset choices and a separated
  custom option.
- Add `hermes` as a first-class ACP agent family.
- Generate `HERMES.md` for Hermes ACP Skills runs.
- Keep building the shared skill catalog for Hermes, but do not materialize
  thin proxy skills for Hermes.
- Parse `description` from `SKILL.md` YAML frontmatter and expose it through the
  registry/catalog so `HERMES.md` can list available Agent Skills by ID,
  description, and catalog root.

## Impact

- Affected areas: Backend Manager UI/localization, ACP backend preset metadata,
  ACP agent family resolution, ACP skill materialization, run instruction
  generation, plugin skill registry/catalog metadata, and targeted tests.
- Compatibility: existing ACP families keep their proxy skill injection and
  instruction filenames. Existing custom ACP profile creation remains available
  via the new menu's custom item.

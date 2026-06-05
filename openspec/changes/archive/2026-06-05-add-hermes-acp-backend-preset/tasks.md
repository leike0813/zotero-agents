## 1. OpenSpec

- [x] Add proposal, design, tasks, and delta specs for the Hermes ACP preset
  change.
- [x] Validate the change with OpenSpec.

## 2. Backend Preset and UI

- [x] Add the Hermes ACP preset and `hermes` agent family metadata.
- [x] Replace ACP preset dropdown/add controls with one menu button containing
  preset items, a separator, and a custom item.
- [x] Update Backend Manager localization for the new ACP preset menu.

## 3. Hermes ACP Skills Runtime

- [x] Add Hermes family resolution and `HERMES.md` instruction filename.
- [x] Skip thin proxy skill materialization for Hermes while preserving the
  shared skill catalog.
- [x] Render Hermes-specific Agent Skills list in `HERMES.md`.
- [x] Adjust Hermes prompt context so it references catalog paths, not proxy
  skill paths.

## 4. Skill Metadata

- [x] Parse `description` from `SKILL.md` YAML frontmatter in the plugin skill
  registry.
- [x] Carry description metadata into the shared skill catalog.

## 5. Tests and Verification

- [x] Add/update focused tests for Hermes preset metadata, family resolution,
  catalog descriptions, Hermes instructions, and non-Hermes regressions.
- [x] Run targeted tests and typecheck.

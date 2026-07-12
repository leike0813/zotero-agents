## ADDED Requirements

### Requirement: Release pipeline governs Profile patch decisions
The Host Bridge release pipeline SHALL classify release inputs before rendering
the Zotero Librarian profile and SHALL instruct operators to bump the
Profile-owned patch once for public Profile content changes.

#### Scenario: Profile-only public change
- **WHEN** a release changes public Profile content without a CLI major/minor
  change
- **THEN** the pipeline SHALL require one Profile patch bump before rendering
  and publishing

#### Scenario: Generated-output drift only
- **WHEN** only generated Host Bridge or Profile output is stale
- **THEN** the pipeline SHALL not bump the Profile patch and SHALL require the
  generated output to be synchronized before publication

### Requirement: Surface publication rejects stale generated inputs
The surface-only publication workflow SHALL verify generated Host Bridge and
Profile surfaces before publishing either external surface.

#### Scenario: Source was not rendered
- **WHEN** a Profile or Host Bridge source change reaches the surface workflow
  without its generated output committed
- **THEN** the workflow SHALL fail before publishing the bundle branch or
  standalone Profile repository


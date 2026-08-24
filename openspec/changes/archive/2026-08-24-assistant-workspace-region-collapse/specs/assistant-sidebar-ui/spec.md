## ADDED Requirements

### Requirement: Chrome regions collapse under limited viewport height

The shell toolbar, banner, and reply zone of every Assistant Workspace child
panel (ACP Chat, ACP Skills, SkillRunner) SHALL be collapsible so the
conversation window keeps vertical space when the panel viewport height is
small.

Region collapse SHALL be a pure chrome presentation state: it is expressed by
an `is-region-collapsed` class on the region container and a
`data-collapse-stage` attribute on the panel root, applied by the child panel
runtime outside the region render pipeline. Collapse state SHALL NOT enter any
region signature selection, any region render key, or the panel DTO, and a
collapse toggle SHALL NOT re-render the transcript or any managed region.
Collapse toggle buttons SHALL be appended to the region containers outside
the Preact managed mounts and SHALL use shared localized labels.

The trigger model SHALL be manual-first with an automatic fallback: an auto
stage derived from the panel viewport height with hysteresis collapses the
banner at stage 1, additionally compacts the reply zone at stage 2, and
additionally collapses the shell toolbar at stage 3. A manual toggle SHALL
pin a per-region override that wins over the auto stage, and toggling back to
the auto-suggested value SHALL clear the override. Collapse state SHALL be
session-scoped and SHALL NOT persist.

The collapsed forms SHALL be:

- `shell toolbar`: action groups hidden; only a slim strip with the expand
  toggle remains.
- `banner`: only the title row remains; subtitle, metadata pills, status row,
  indicators, selectors, and context actions are hidden, except that
  warning/danger notices and the new-conversation `+` action stay visible.
- `reply zone`: the textarea compacts to a single line and the footer becomes
  a single row holding the runtime selectors and the Send button; the hint
  text and usage gauge are hidden. The textarea element SHALL be restyled,
  never replaced, so draft, focus, and caret survive collapse transitions.

#### Scenario: Banner auto-collapses first and recovers with hysteresis

- **WHEN** the panel viewport height drops to or below the banner enter
  threshold
- **THEN** the banner collapses to its title row while the reply zone and
  shell toolbar stay expanded
- **AND** the banner remains collapsed until the height climbs past the exit
  threshold above the enter threshold.

#### Scenario: Deeper stages compact reply zone then toolbar

- **WHEN** the panel viewport height drops to or below the reply zone enter
  threshold
- **THEN** the reply zone renders its compact single-line form in addition to
  the collapsed banner
- **AND** when the height drops to or below the toolbar enter threshold the
  shell toolbar collapses to its slim strip as well.

#### Scenario: Manual override wins over the auto stage

- **GIVEN** the banner is collapsed by the auto stage
- **WHEN** the user clicks the banner toggle
- **THEN** the banner expands and stays expanded across further auto stage
  changes
- **AND** clicking the toggle again returns the banner to the auto stage
  because the toggled value matches the auto suggestion.

#### Scenario: Collapse toggles preserve region DOM identity

- **WHEN** any region is collapsed or expanded by manual toggle or auto stage
- **THEN** the managed mounts and subtree nodes of every region, including
  the transcript, remain the same DOM nodes
- **AND** no region re-render is triggered.

#### Scenario: Composer compaction preserves the reply draft

- **GIVEN** the user has typed a draft into the reply textarea
- **WHEN** the reply zone switches between expanded and compact forms
- **THEN** the same textarea element keeps its value, and focus and caret are
  not reset by the transition.

## ADDED Requirements

### Requirement: Preferences local-runtime binding SHALL own one window lifecycle

Each Preferences window SHALL own one local-runtime binding, including its DOM listeners, runtime subscription, transient dialog state, and rendering eligibility. Rebinding or unloading SHALL dispose the applicable binding idempotently.

#### Scenario: Registering a replacement binding

- **GIVEN** a Preferences window already has a local-runtime binding
- **WHEN** the local-runtime UI is registered again
- **THEN** the old binding SHALL be disposed before the replacement becomes current
- **AND** a later unload from the old window SHALL NOT dispose the replacement binding.

#### Scenario: Window unload releases local resources

- **WHEN** the owning Preferences window unloads
- **THEN** its runtime subscription and command listeners SHALL be removed
- **AND** its transient uninstall-dialog state SHALL no longer be retained
- **AND** repeated cleanup SHALL have no additional effect.

#### Scenario: Host effect settles after disposal

- **GIVEN** a local-runtime Host effect started while the binding was active
- **WHEN** the binding is disposed before that effect settles
- **THEN** the effect MAY settle according to its Host contract
- **AND** the disposed binding SHALL NOT write the old DOM, refresh it, or start a follow-up Host effect.

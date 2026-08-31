## MODIFIED Requirements

### Requirement: Production activation SHALL require an exact proven inventory

Production availability SHALL require the verified XPI bundle, the production
lock, and one current-session health/handshake. Full operation inventory parity
SHALL remain a build and test gate rather than a persisted runtime activation
artifact.

#### Scenario: Current XPI owner becomes ready
- **WHEN** the verified child owns the production lock and passes health/handshake
- **THEN** the plugin publishes the native composition without receipt or activation evidence

### Requirement: All production consumers SHALL share one native composition

All production consumers SHALL use the one current-session native composition.
The plugin SHALL deduplicate concurrent startup and SHALL NOT construct a
legacy, candidate, or generation-scoped production owner.

#### Scenario: Consumers start concurrently
- **WHEN** multiple consumers request the default Synthesis client
- **THEN** they receive the same ready native composition or the same startup failure

## REMOVED Requirements

### Requirement: Activation and mutation admission SHALL be crash-safe
**Reason:** There is no separate activation or mutation-admission state.
**Migration:** The held production lock and repository transaction define the crash boundary.

### Requirement: Runtime activation SHALL bind the admission generation
**Reason:** Runtime generations and durable activation evidence are removed.
**Migration:** Bind only the live connection to its current session instance.

### Requirement: Promotion SHALL precede startup reconcile
**Reason:** There is no candidate promotion.
**Migration:** Reconcile only after the current-session native client is ready.

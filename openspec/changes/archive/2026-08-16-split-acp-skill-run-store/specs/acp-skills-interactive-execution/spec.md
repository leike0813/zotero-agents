## ADDED Requirements

### Requirement: ACP Skill run interactive concerns SHALL be separated

Controller registry, permission queue, runtime catalog, conversation actions,
and workspace selection SHALL each expose one narrow interface. Callers SHALL
import the focused module instead of the store facade.

#### Scenario: Controller registry owns controller lifecycle

- **WHEN** a controller or setup controller is registered or removed
- **THEN** the registry seam SHALL be implemented by the store host without exposing controller maps

#### Scenario: Permission queue owns per-run ordering

- **WHEN** permission requests are queued or resolved
- **THEN** the permission module SHALL preserve arrival order and resolver
  callbacks

#### Scenario: Runtime catalog owns selection state

- **WHEN** mode, model, or reasoning effort is read or changed
- **THEN** the runtime catalog seam SHALL expose that state through the store host and reset with it

#### Scenario: Actions orchestrate without owning persistence

- **WHEN** cancel, archive, reply, connect, disconnect, or session end runs
- **THEN** the actions module SHALL use store callbacks for record reads and
  writes
- **AND** SHALL NOT own the run record map

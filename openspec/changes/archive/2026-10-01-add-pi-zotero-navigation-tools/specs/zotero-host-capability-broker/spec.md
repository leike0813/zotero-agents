## ADDED Requirements

### Requirement: Navigation exposes its first effect through trusted call control

The Broker SHALL revalidate the captured window and cancellation immediately before its first UI effect, including Reader tab reservation or loaded-Reader selection. It SHALL notify an optional trusted in-process first-effect observer synchronously before dispatch. The observer and window SHALL remain outside portable DTOs and durable evidence. Cancellation before effects SHALL have no effect; cancellation after the first effect SHALL NOT cause rollback, replay or a false no-effect canceled result.

#### Scenario: Origin expires during Reader initialization
- **WHEN** Reader initialization settles after the original context became invalid
- **THEN** no new first effect occurs and no other window is used

#### Scenario: Cancellation follows Reader reservation
- **WHEN** cancellation arrives after a target-window Reader tab was reserved
- **THEN** the first-effect fact remains observable and later failure cannot claim no effect

#### Scenario: Navigation settles despite late cancellation
- **WHEN** a started navigation reaches its defined success boundary after cancellation
- **THEN** it returns its normal dispatch or selection result

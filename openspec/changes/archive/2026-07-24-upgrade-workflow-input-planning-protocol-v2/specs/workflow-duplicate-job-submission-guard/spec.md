## ADDED Requirements

### Requirement: Duplicate protection SHALL treat a prepared group atomically
The duplicate guard SHALL compare every prepared-unit member identity against active and queued identity indexes. Any conflict SHALL produce one confirmation for the entire immutable group.

#### Scenario: One member of a group conflicts
- **WHEN** one member identity in a multi-member unit is already active or queued
- **THEN** the system asks once for the group and either accepts or skips the whole unit without deleting individual members

### Requirement: Queue identity indexes SHALL include all group members
Internal Host queue indexes SHALL associate every stable member identity with its top-level unit, while public queue snapshots SHALL expose only a safe group label and member count.

#### Scenario: Public queue state is read
- **WHEN** a grouped unit is queued
- **THEN** conflict lookup can find each internal member identity but the public snapshot omits the full selection payload and identity list

### Requirement: Accepted duplicate groups SHALL be rechecked without regrouping
After the user allows a duplicate group, admission SHALL recheck current conflicts and SHALL retain the exact confirmed membership.

#### Scenario: Queue state changes during confirmation
- **WHEN** a conflicting queued unit is canceled or admitted while confirmation is open
- **THEN** the guard rechecks current identity indexes and does not replan or partially rewrite the candidate group

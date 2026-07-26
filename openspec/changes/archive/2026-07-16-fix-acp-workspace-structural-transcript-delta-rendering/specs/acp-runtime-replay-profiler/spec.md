## ADDED Requirements

### Requirement: R3 completeness is scoped to profile-owned publication identities

Replay R3 completeness SHALL use publications whose post stage was recorded inside the active profile as its identity set. A later stage for a publication posted outside that profile SHALL be classified out-of-window and SHALL NOT alter current lifecycle totals or completeness.

#### Scenario: Initialization acknowledgement arrives after profile start

- **GIVEN** an initialization publication was posted before the replay profile began
- **WHEN** its shell, child or render acknowledgement arrives during the profile
- **THEN** the acknowledgement does not increase current R3 stage totals
- **AND** all current profile-owned identities can still produce a complete measurement.

#### Scenario: Current publication misses render acknowledgement

- **WHEN** a publication posted inside the active profile lacks its terminal render acknowledgement
- **THEN** R3 measurement remains incomplete.

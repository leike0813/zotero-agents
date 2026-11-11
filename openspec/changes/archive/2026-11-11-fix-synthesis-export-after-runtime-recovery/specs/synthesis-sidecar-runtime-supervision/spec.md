## ADDED Requirements

### Requirement: Ready consumers SHALL follow automatic instance replacement

Owner readiness, Reverse Host instance binding, and export content transfer SHALL follow the supervisor's current ready instance, including a replacement completed before the next client operation. Departed initialization and stopped owners SHALL NOT publish readiness or restore a binding. A dispatched export SHALL NOT be replayed during recovery.

#### Scenario: Automatic recovery completes between client operations
- **GIVEN** an instance has been ready and then departs
- **WHEN** its replacement reaches ready without an explicit recovery call
- **THEN** the next owner readiness result and export transfer use the replacement connection
- **AND** the replacement Reverse Host instance is bound and the departed binding remains revoked

#### Scenario: A departed initialization finishes late
- **WHEN** initialization of an older instance settles after replacement or owner shutdown
- **THEN** it cannot overwrite the current ready connection or instance binding
- **AND** a waiting readiness caller either acquires the current instance or receives the existing stopped/failure result

#### Scenario: Export runs through the production recovery composition
- **WHEN** an automatically recovered runtime serves filtered export through the default Bridge and Reverse Host wiring
- **THEN** its manifest and artifact files are materialized through the current content-transfer endpoint
- **AND** acceptance verifies delivered files rather than only discovery or health

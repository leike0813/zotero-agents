## ADDED Requirements

### Requirement: Built-in Workflow packages SHALL require exact Host API v12
Every official built-in package that consumes Workflow Host SHALL declare and enforce version 12 as its only supported current Host contract. Distributed and synchronized copies SHALL preserve the same guard and MUST NOT contain a v2-v11 compatibility range.

#### Scenario: Package runs on current host
- **WHEN** a built-in package receives an exact v12 projection
- **THEN** its guard accepts the host and execution proceeds

#### Scenario: Package runs on v11
- **WHEN** the same package receives version 11
- **THEN** it rejects the host before calling any member

### Requirement: Built-in package synchronization SHALL preserve v12 consumer source
Manifest and synchronization gates SHALL verify that official package copies use the current v12 member names and do not restore raw access, flat Synthesis aliases, or compatibility files.

#### Scenario: Synchronized package contains an old alias
- **WHEN** generated or copied package content references a removed v11 member
- **THEN** the built-in workflow manifest/synchronization gate fails

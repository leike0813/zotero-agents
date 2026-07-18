## ADDED Requirements

### Requirement: Topic application follows shadow owner lifecycle
The service SHALL construct Topic application composition only after repository and canonical recovery, stop new apply admission during shutdown, and close both owners within the existing shutdown budget.

#### Scenario: Recovery precedes application readiness
- **WHEN** the service starts with a valid interrupted canonical journal and persisted Topic operations
- **THEN** recovery and operation reconciliation complete before the application can be used

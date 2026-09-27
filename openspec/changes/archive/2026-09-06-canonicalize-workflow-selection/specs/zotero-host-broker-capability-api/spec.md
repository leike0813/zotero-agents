## ADDED Requirements

### Requirement: Selection adapters SHALL use canonical context results
Broker, direct REST, registry and MCP selection reads SHALL use the same exact page contract and current-view facts. No adapter SHALL promote children, fabricate continuation, repaginate a complete selection, or fall back to a legacy or partial Broker.

#### Scenario: Incomplete Broker is injected
- **WHEN** an adapter lacks a configured context member
- **THEN** it fails closed without reading the real native selection

### Requirement: Attachment ordering SHALL use canonical creation facts
Canonical attachment details SHALL expose creation time for task-specific earliest-source selection. The value SHALL be detached from native item data, and paths SHALL remain confined to the existing file descriptor and locality adapter.

#### Scenario: Two attachments have different creation times
- **WHEN** a task reads their canonical details
- **THEN** it can apply earliest-source ordering without raw dateAdded data

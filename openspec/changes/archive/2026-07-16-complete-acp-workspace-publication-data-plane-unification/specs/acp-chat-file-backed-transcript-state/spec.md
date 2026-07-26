## ADDED Requirements

### Requirement: Chat page-first state uses the shared transcript region
ACP Chat owner switches SHALL publish the new owner in shared loading state before indexed page read or full mirror hydrate. A successful indexed page SHALL replace that state with the shared ready region, independently of full mirror readiness.

#### Scenario: Cold conversation is selected
- **WHEN** its cold mirror is absent
- **THEN** Chat publishes loading for the new owner and then a ready indexed page through the same transcript region
- **AND** no Chat-specific transcript lifecycle field is required.

### Requirement: Chat store fields stop at the adapter boundary
Chat store item identifiers, revisions, backend identity, and conversation identity SHALL be converted once by the Chat adapter. Store-specific fields SHALL NOT leak into shared page, item, mutation, receiver, or acknowledgement DTOs.

#### Scenario: Chat page is normalized
- **WHEN** the indexed Chat page enters Workspace publication
- **THEN** owner details exist only in the owner envelope and canonical sequence exists only as eventSeq.

## ADDED Requirements

### Requirement: Broker public references SHALL be portable and fail closed
The Zotero Host Capability Broker SHALL accept only portable JSON item and collection references at its public seam. Raw Zotero items and collections MAY be normalized only inside the trusted Workflow Host adapter and MUST NOT enter Broker DTOs, errors, receipts, or durable evidence.

#### Scenario: Raw item reaches the Broker
- **WHEN** a caller submits a raw Zotero item through the Broker public interface
- **THEN** the Broker rejects it with `invalid_ref` and does not serialize or retain the raw value

### Requirement: Broker errors SHALL conform to the shared Workflow Host contract
`ZoteroHostCapabilityError` SHALL remain the canonical runtime exception for Zotero capability semantics while using the shared code, retryability, and closed-details schema.

#### Scenario: Native Zotero operation fails
- **WHEN** a Broker operation fails with a native exception
- **THEN** the Broker returns or throws the appropriate shared coded failure without exposing the native cause, stack, local path, or raw input

### Requirement: Broker growth SHALL not widen Workflow Host implicitly
Workflow Host projections SHALL select Broker members through member-level declarations and explicit object literals. Adding a Broker member MUST leave every Workflow Host variant unchanged until a contract/version change names that member.

#### Scenario: Broker gains an internal capability
- **WHEN** a new member is added to the Broker implementation
- **THEN** recursive Workflow Host conformance still reports the previously declared surface and does not inherit the member

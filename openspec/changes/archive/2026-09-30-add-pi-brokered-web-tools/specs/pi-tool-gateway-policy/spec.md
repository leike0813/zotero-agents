## ADDED Requirements

### Requirement: Web source identities and receipts participate in admission

The Gateway SHALL bind the frozen Web source chain identity to tool admission and permission identity. Search and Fetch SHALL require external-egress plus local-network where applicable; curated stdio SHALL retain code-execution and host-control. Each source attempt SHALL retain bounded durable source/model/usage facts without response bodies or secrets. Pricing SHALL NOT introduce a new effect.

#### Scenario: Paid enabled fallback
- **WHEN** an explicitly enabled source is reached by authorized fallback
- **THEN** it uses the existing effects and its own receipt without a pricing prompt

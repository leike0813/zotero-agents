## ADDED Requirements

### Requirement: Production client ports SHALL expose concrete operation types

Every production `SynthesisClient` operation SHALL expose its operation-specific request and result types through the grouped client, neutral port, native adapter, and test harness. Production paths MUST NOT use `Promise<unknown>`, a legacy JSON port, or an untyped domain container.

#### Scenario: Production client inventory is type-checked
- **WHEN** the contract and production-capability gates inspect all 96 production operations
- **THEN** each method resolves through its concrete request and result mapping
- **AND** no production method reaches a legacy or unknown bridge


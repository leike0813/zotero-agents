## ADDED Requirements

### Requirement: Streaming canary does not alter production graph routing
The normal-scale transfer worker SHALL remain an internal explicit canary, while production full rebuild, source-slice rebuild, and related-items fallback continue to use plugin-owned composition and promotion.

#### Scenario: Production composition is constructed
- **WHEN** the default Synthesis client composition is created
- **THEN** Citation Graph Build SHALL remain injected as an in-process engine and SHALL NOT automatically invoke transfer execution

## ADDED Requirements

### Requirement: Split skill instructions omit audit and hash contracts

Generated split topic synthesis skill instructions SHALL focus on executable
stage order, payload authoring, and runtime-owned outputs.

#### Scenario: Generated SKILL.md is inspected

- **WHEN** any generated split topic synthesis `SKILL.md` is inspected
- **THEN** it SHALL NOT instruct the agent to maintain artifact registries
- **AND** it SHALL NOT require the agent to reason about payload hashes, content
  hashes, audit reports, or action receipts.

### Requirement: Split schemas omit runtime audit fields

Split topic synthesis payload and output schemas SHALL not make audit metadata a
business contract.

#### Scenario: Generated schemas are inspected

- **WHEN** generated split topic synthesis schemas are inspected
- **THEN** final outputs SHALL NOT require `__SKILL_DONE__`
- **AND** final outputs SHALL NOT require payload/file hash fields
- **AND** `digest_ref.payload_hash` SHALL NOT be required.

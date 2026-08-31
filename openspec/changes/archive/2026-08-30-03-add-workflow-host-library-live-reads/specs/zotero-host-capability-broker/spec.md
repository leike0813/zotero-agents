## ADDED Requirements

### Requirement: Broker SHALL own canonical bounded library reads
The Broker SHALL own item, collection, note, payload, attachment, annotation, and portable-export reads, including validation, serialization, fixed ordering, resource limits, and coded failure behavior. Workflow callers MUST NOT enumerate raw Zotero objects or reconstruct these DTOs.

#### Scenario: Item detail is requested
- **WHEN** a portable item reference identifies a current regular item, note, attachment, or annotation
- **THEN** the Broker returns the matching discriminated detail variant with one canonical revision and no raw host object

#### Scenario: Read cannot prove complete tags
- **WHEN** tag loading fails or exceeds the contract bound
- **THEN** the Broker fails closed rather than returning an empty or truncated complete tag set

### Requirement: Broker SHALL own live traversal completion evidence
The Broker SHALL enumerate live library pages, apply fixed criteria and budgets, invoke one serial batch callback at a time, and issue completion evidence only after the cursor is proven exhausted.

#### Scenario: Traversal exhausts the cursor
- **WHEN** every matching item has been delivered successfully
- **THEN** the result is `completed` and includes criteria and coverage digests bound to the delivered item revisions and tags

#### Scenario: Traversal stops at a budget
- **WHEN** max items, pages, or duration is reached before exhaustion
- **THEN** the result is `resource_limited`, includes a criteria-bound resume cursor, and contains no completion evidence

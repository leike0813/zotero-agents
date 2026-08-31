## MODIFIED Requirements

### Requirement: Live item traversal SHALL be bounded and callback-scoped
`library.traverseItems` SHALL accept only the `top-level-regular` scope in v12, process batches serially, enforce centralized defaults and hard maxima, and return completed, canceled, or resource-limited coverage. Each batch item SHALL be a traversal-only regular-item summary carrying the Broker-owned canonical tag digest from the same complete Host read as its revision and tags. Ordinary item-list and selection-summary DTOs SHALL remain unchanged. Previously completed callbacks SHALL not be represented as rolled back after a later stop.

#### Scenario: Callback receives audit evidence
- **WHEN** a traversal batch is delivered to a trusted callback
- **THEN** every item carries its canonical tag digest and the terminal coverage digest is derived from those exact delivered item references, revisions, and tag digests

#### Scenario: Callback rejects
- **WHEN** the batch callback throws or rejects
- **THEN** traversal fails and does not claim that caller side effects from earlier batches were rolled back

#### Scenario: Empty library is traversed
- **WHEN** no item matches the resolved criteria
- **THEN** traversal returns completed with canonical empty coverage evidence

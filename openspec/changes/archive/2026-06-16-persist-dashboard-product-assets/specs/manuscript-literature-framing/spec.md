## MODIFIED Requirements

### Requirement: Runtime-authored business result file

The `manuscript-literature-framing` stage runtime SHALL write completed and canceled business result payloads to `manuscript-literature-framing.result.json` at the run workspace root and SHALL NOT write `result/result.json`.

#### Scenario: Successful completed result is registered as a product

- **WHEN** the workflow run status is `succeeded`
- **AND** the business result kind is `writing.manuscript_literature_framing`
- **THEN** the apply hook SHALL register the manuscript literature framing product assets in Dashboard product storage.

#### Scenario: Failed or canceled result is not registered as a product

- **WHEN** the workflow run status is not `succeeded`
- **OR** the business result kind is not `writing.manuscript_literature_framing`
- **THEN** the apply hook SHALL NOT register a Dashboard product
- **AND** the apply hook result SHALL remain ok with `product: null`.

# mineru-workflow-result-materialization Delta

## MODIFIED Requirements

### Requirement: MinerU Workflow SHALL Materialize Bundle Outputs Next To Source PDF
The workflow SHALL extract one or more MinerU bundle outputs and materialize the final result in the same directory as the source PDF.

#### Scenario: Materialize aggregate markdown output
- **WHEN** a long PDF aggregate has multiple successful child bundles
- **THEN** the workflow SHALL read `full.md` from every child bundle in page order
- **AND** the workflow SHALL join the Markdown parts with one blank line between adjacent parts
- **AND** the workflow SHALL materialize the joined Markdown as `<pdfBaseName>.md` in the source PDF directory

#### Scenario: Materialize aggregate images directory
- **WHEN** aggregate child bundles contain `images/` directories
- **THEN** the workflow SHALL merge their images into one `Images_<itemKey>/` directory in the source PDF directory
- **AND** image names SHALL remain flat without page-range or part subdirectories

#### Scenario: Aggregate materialization failure is atomic
- **WHEN** any aggregate child bundle is missing required `full.md`
- **THEN** the workflow SHALL fail the aggregate apply
- **AND** existing target Markdown and image outputs SHALL remain unchanged


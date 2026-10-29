# mineru-workflow-result-materialization Specification

## Purpose
TBD - created by archiving change add-mineru-workflow. Update Purpose after archive.
## Requirements
### Requirement: MinerU Workflow SHALL Materialize Bundle Outputs Next To Source PDF
The workflow SHALL extract one or more MinerU bundle outputs and materialize the final result in the same directory as the source PDF, staging the complete output before replacing existing targets.

#### Scenario: Rename markdown output
- **WHEN** bundle contains `full.md` and the source PDF filename is `ABC.pdf`
- **THEN** the workflow SHALL materialize markdown output as `ABC.md` in the source PDF directory

#### Scenario: Rename images directory
- **WHEN** bundle contains `images/` and source PDF item key is `XXXXXX`
- **THEN** the workflow SHALL materialize images directory as `Images_XXXXXX/` in the source PDF directory

#### Scenario: Replace orphan images directory before move
- **WHEN** `<pdfBaseName>.md` does not exist and target `Images_<itemKey>` already exists in the source PDF directory
- **THEN** the workflow SHALL back up that target before promoting the complete new output
- **AND** it SHALL remove the backup only after confirmed success, restore it after confirmed failure, and retain it for recovery after an uncertain outcome

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

### Requirement: MinerU Workflow SHALL Rewrite Markdown Image Paths
The workflow SHALL rewrite markdown image references from the original bundle path to the renamed images directory.

#### Scenario: Replace images prefix
- **WHEN** markdown content contains references like `images/figure-1.jpg`
- **THEN** the workflow SHALL rewrite them to `Images_<itemKey>/figure-1.jpg`

### Requirement: MinerU Workflow SHALL Attach Materialized Markdown To Parent Item
After successful materialization, the workflow SHALL import the generated Markdown and image companions as a stored attachment under the source PDF parent. Reruns SHALL replace a unique existing stored result or update a same-path linked result without converting it. Exact path matches SHALL precede unique stored-filename fallback; ambiguous candidates SHALL fail before output writes.

#### Scenario: Add linked markdown attachment
- **WHEN** Markdown is successfully materialized without an existing output attachment
- **THEN** the workflow imports the Markdown and images into Zotero storage under the source PDF parent

#### Scenario: Existing linked result is updated
- **WHEN** an existing attachment points to the exact adjacent output path
- **THEN** rerunning overwrites that output without creating a duplicate or converting the linked attachment

### Requirement: Adjacent MinerU output replacement SHALL preserve recoverability

MinerU SHALL stage the complete Markdown and image set before promoting adjacent output. Only workflow-owned target paths SHALL be replaced. Confirmed failures SHALL restore previous output; uncertain attachment outcomes SHALL preserve recovery material and report uncertainty. Multiple candidates or indistinguishable source filenames SHALL fail before writes.

#### Scenario: Attachment import fails after adjacent promotion
- **WHEN** the attachment operation is confirmed failed
- **THEN** previous Markdown and image outputs are restored without changing unrelated source-directory files

#### Scenario: A rerun has no images
- **WHEN** a previous result had images but the new complete result has none
- **THEN** obsolete workflow-owned images are removed only after successful replacement

### Requirement: MinerU Workflow SHALL Fail Fast On Missing Required Bundle Entries
The workflow SHALL report an explicit failure when required bundle entries are missing.

#### Scenario: Missing full markdown entry
- **WHEN** downloaded bundle does not contain required markdown entry (`full.md`)
- **THEN** the workflow SHALL fail that PDF unit with a clear error
- **THEN** no partial attachment SHALL be created for that failed unit


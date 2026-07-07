# mineru-workflow-http-pipeline Delta

## MODIFIED Requirements

### Requirement: MinerU Workflow SHALL Follow Recommended MinerU API Route
For each PDF or PDF page-range unit, the workflow SHALL execute the recommended MinerU API route: apply upload URL, upload file, poll result, and download bundle.

#### Scenario: Page-range upload URL request
- **WHEN** execution starts for a split page-range unit
- **THEN** the workflow SHALL call `POST /api/v4/file-urls/batch` with exactly one file descriptor for the source PDF
- **AND** that file descriptor SHALL include the page range for the split unit

#### Scenario: Split file upload
- **WHEN** upload URL is returned by MinerU for a split page-range unit
- **THEN** the workflow SHALL upload the original source PDF to the returned file URL using HTTP `PUT`


# mineru-workflow-http-pipeline Specification

## Purpose
TBD - created by archiving change add-mineru-workflow. Update Purpose after archive.
## Requirements
### Requirement: MinerU Workflow SHALL Use Declarative Generic HTTP Steps Pipeline
The `mineru` workflow SHALL declare a `generic-http.steps.v1` request and MUST NOT require a `buildRequest` hook to orchestrate MinerU API calls.

#### Scenario: Declarative-only request build
- **WHEN** workflow runtime builds requests for `mineru`
- **THEN** request payload SHALL be compiled from workflow manifest declarative steps
- **THEN** no workflow-specific network orchestration code SHALL be required in hooks

### Requirement: MinerU Workflow SHALL Follow Recommended MinerU API Route
For each PDF or PDF page-range unit, the workflow SHALL execute the recommended MinerU API route: apply upload URL, upload file, poll result, and download bundle.

#### Scenario: Upload URL request
- **WHEN** execution starts for a PDF unit
- **THEN** the workflow SHALL call `POST /api/v4/file-urls/batch` with exactly one file descriptor for that PDF unit

#### Scenario: File upload
- **WHEN** upload URL is returned by MinerU
- **THEN** the workflow SHALL upload the source PDF to the returned file URL using HTTP `PUT`

#### Scenario: Page-range upload URL request
- **WHEN** execution starts for a split page-range unit
- **THEN** the workflow SHALL call `POST /api/v4/file-urls/batch` with exactly one file descriptor for the source PDF
- **AND** that file descriptor SHALL include the page range for the split unit

#### Scenario: Split file upload
- **WHEN** upload URL is returned by MinerU for a split page-range unit
- **THEN** the workflow SHALL upload the original source PDF to the returned file URL using HTTP `PUT`

#### Scenario: Poll extraction result
- **WHEN** upload succeeds and a `batch_id` is available
- **THEN** the workflow SHALL poll `GET /api/v4/extract-results/batch/{batch_id}` until the file state becomes `done` or `failed` or timeout

#### Scenario: Bundle download
- **WHEN** file state becomes `done` and `full_zip_url` is returned
- **THEN** the workflow SHALL download the zip as bundle bytes for `applyResult`

### Requirement: MinerU Workflow SHALL Use Backend Bearer Auth
The workflow SHALL rely on backend profile authentication for MinerU token handling.

#### Scenario: Bearer token injection
- **WHEN** backend profile is configured with `auth.kind=bearer` and `auth.token`
- **THEN** provider requests to MinerU API SHALL include `Authorization: Bearer <token>`

#### Scenario: Missing token on bearer backend
- **WHEN** backend profile selects `auth.kind=bearer` without token
- **THEN** backend resolution/validation SHALL fail before workflow execution


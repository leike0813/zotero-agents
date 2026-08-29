# mineru-long-pdf-page-range-splitting Specification

## Purpose
Defines the MinerU workflow behavior for splitting long PDFs into ordered page-range request units when preflight determines the PDF exceeds the page limit, including outline-aware split boundary selection and physical-PDF-split-free submission.

## Requirements
### Requirement: MinerU Workflow SHALL Split PDFs Above The Page Limit
The MinerU workflow SHALL split a PDF into ordered page-range request units when preflight can determine that the PDF has more than 200 pages.

#### Scenario: PDF at or below page limit
- **WHEN** preflight determines that a PDF has 200 pages or fewer
- **THEN** the workflow SHALL continue with one request for the original PDF

#### Scenario: PDF above page limit
- **WHEN** preflight determines that a PDF has more than 200 pages
- **THEN** the workflow SHALL replace the original unit with ordered page-range units
- **AND** every page-range unit SHALL contain no more than 200 pages
- **AND** the replacement units SHALL belong to one `single-apply` aggregate ordered by unit order

#### Scenario: Unknown page count
- **WHEN** preflight cannot determine the PDF page count
- **THEN** the workflow SHALL continue with one request for the original PDF
- **AND** diagnostics SHALL record that splitting was not attempted

### Requirement: MinerU Workflow SHALL Prefer Outline-Aware Split Boundaries
The MinerU workflow SHALL use PDF outline/bookmark entries as best-effort split boundary hints when they are available and safe.

#### Scenario: Outline boundary inside range window
- **WHEN** a long PDF has a chapter or section outline entry near a planned split boundary
- **THEN** the workflow SHOULD choose that outline page as the next page-range start
- **AND** the previous page range SHALL still contain no more than 200 pages

#### Scenario: No reliable outline boundary
- **WHEN** no safe outline boundary is available for a planned split
- **THEN** the workflow SHALL use a balanced page boundary that keeps each range within the page limit

### Requirement: MinerU Workflow SHALL Submit Page Ranges Without Physical PDF Splitting
The MinerU workflow SHALL submit each split unit by sending the original PDF with a MinerU page-range descriptor.

#### Scenario: Split request payload
- **WHEN** buildRequest receives a split unit with `page_ranges`
- **THEN** the upload URL request SHALL include that page range on the file descriptor
- **AND** the file upload step SHALL upload the original source PDF path

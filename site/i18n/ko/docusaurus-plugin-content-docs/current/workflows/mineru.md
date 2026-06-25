# MinerU PDF Parsing

## Purpose

Call the MinerU service to parse PDF documents, extracting high-quality Markdown text and images, producing directly readable note files.

MinerU is a deep learning-based PDF parsing tool that extracts high-quality text and figures from academic papers.

## Use Cases

- Converting PDF-format literature into editable Markdown
- Preparing plain text documents for downstream workflows (e.g., Literature Analysis, Deep Reading)
- Extracting images and tables from PDFs

## Configuring the MinerU Backend

### 1. Register a MinerU Account and Obtain an API Token

1. Visit [mineru.net](https://mineru.net) to register an account
2. After logging in, go to the **API → API Management** page
3. Create or copy an API Token

### 2. Add a Backend in Backend Manager

1. Open **Tools → [Backend Manager](../backends/backend-manager)**
2. Switch to the **Generic HTTP** tab
3. Click **Add Generic HTTP**
4. Fill in the following fields:

| Field | Value |
|------|-----|
| Display Name | `MinerU Official` (or any name you prefer) |
| Base URL | `https://mineru.net` |
| Auth Method | `bearer` |
| Auth Token | Paste the API Token obtained in the previous step |
| Timeout | `60000` (60 seconds) |

5. Click **Save** in the bottom-right corner

## Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | Attachment |
| Accepted Types | `application/pdf` (PDF only) |
| Conflict Detection | If a `.md` file with the same name already exists in the same directory, the PDF is skipped |

### Trigger Methods

- Directly select one or more PDF attachments
- Select the parent item, and the plugin will automatically expand its child PDF attachments

### Conflict Handling

- Checks whether `<PDF filename>.md` exists in the target directory
- If it exists, the input is skipped during preprocessing
- If all candidates have conflicts, the workflow does not submit any tasks

## Execution Flow

```
1. Request Upload URL
   └── POST to MinerU API to obtain batch_id and upload_url

2. Upload File
   └── Binary upload of the PDF file

3. Poll for Results
   └── Repeated queries until processing completes or fails
       └── Interval: 2 seconds

4. Download Results
   └── Download bundle (zip format)

5. Local Materialization
   └── Extract bundle
       └── Extract Markdown content
       └── Extract images
       └── Rewrite image paths in Markdown to local relative paths
       └── Write to the same directory as the PDF
```

## Outputs

### 1. Markdown File

- **Location**: Same directory as the PDF
- **Naming**: `<original filename>.md`
- **Content**: Parsed Markdown text
- **Encoding**: UTF-8

### 2. Image Directory

- **Location**: Same directory as the PDF: `Images_<ItemKey>/`
- **Content**: Image files extracted from the PDF

### 3. Linked Attachment

- **Type**: Link to local file
- **Location**: Under the parent item
- **Target**: The `.md` file

### Cleanup Logic

- If `Images_<ItemKey>/` already exists in the target directory, the old directory is deleted before writing
- Avoids creating duplicate `.md` linked attachments that already exist

## Estimated Duration

| PDF Size | Estimated Time |
|---------|---------|
| Short paper (≤15 pages) | 30 seconds - 1 minute |
| Standard (15-40 pages) | 1-2 minutes |
| Long paper (40+ pages) | 2-3 minutes |

Duration mainly depends on the processing speed of the MinerU service.

## Parameters

The MinerU workflow has no user-configurable parameters.

## Model Recommendation

No LLM model required. This workflow only calls the MinerU service via HTTP API.

## Dependencies

- **Backend**: MinerU service (Generic HTTP backend)
- **Backend Configuration**: Configure a Generic HTTP type backend in Backend Manager
- **Authentication**: A valid API Token (Bearer token) is required
- **MinerU Service URL**: `https://mineru.net` or another deployed instance

## Related Workflows

- [Literature Analysis](literature-analysis) — Generate digests and citation analysis from the parsed Markdown

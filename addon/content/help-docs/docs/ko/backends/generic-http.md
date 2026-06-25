# Generic HTTP Backend Configuration

## Purpose

The Generic HTTP backend is used to send raw HTTP requests to any URL. It does not execute agent skills but serves as a general-purpose HTTP client.

## Primary Use Case: MinerU Document Parsing

The main use of the Generic HTTP backend is to support the **MinerU workflow** — a PDF document parsing workflow.

MinerU is a document parsing service that converts PDF files to Markdown format. The MinerU workflow sends requests to the MinerU service through the Generic HTTP backend to obtain parsing results.

### Configuring MinerU

1. Visit [mineru.net](https://mineru.net) to register an account, and obtain an API Token from the **API → API Management** page
2. Open **Tools → [Backend Manager](#doc/backends%2Fbackend-manager)**
3. Switch to the **Generic HTTP** tab
4. Click **Add Generic HTTP**
5. Fill in:

| Field | Value |
|-------|-------|
| Display Name | `MinerU Official` |
| Base URL | `https://mineru.net` |
| Authentication | `bearer` |
| Auth Token | Paste your API Token |
| Timeout | `60000` (60 seconds) |

6. Click **Save** in the bottom-right corner

## Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| Display Name | Yes | Display name for the backend |
| Base URL | Yes | Base address of the HTTP service |
| Bearer Token | No | Authentication token |
| Timeout | No | Request timeout (milliseconds) |

## Technical Details

The Generic HTTP backend supports:
- **Single-step requests**: `generic-http.request.v1` — Send a single HTTP request
- **Multi-step pipelines**: `generic-http.steps.v1` — Chained requests with JSON path extraction (`$.*` expressions), extracting values from previous responses as parameters for subsequent requests
- **Multipart uploads**: File upload support
- Polling and retry mechanisms

## Next Steps

- [Learn about Workflows](#doc/workflows%2Findex) — Generic HTTP backends are primarily used for specific workflows

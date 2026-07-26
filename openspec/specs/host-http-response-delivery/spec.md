# host-http-response-delivery Specification

## Purpose
TBD - created by archiving change govern-host-response-and-runtime-tree-io. Update Purpose after archive.
## Requirements
### Requirement: Host HTTP JSON responses are prepared once

Host Bridge and embedded MCP SHALL serialize and UTF-8 encode each JSON response
body exactly once before delivery.

#### Scenario: Unicode JSON response is returned

- **WHEN** a Host Bridge capability or MCP request returns a JSON response
- **THEN** its `Content-Length` SHALL equal the prepared UTF-8 body length
- **AND** runtime diagnostics SHALL reuse that length without another full-body
  serialization or encoding
- **AND** the existing response envelope and wire bytes SHALL remain unchanged.

### Requirement: In-memory responses are delivered asynchronously

Host Bridge and embedded MCP SHALL deliver prepared in-memory response bodies
without synchronously constructing or writing a complete HTTP response string.

#### Scenario: A prepared response is written to a Zotero socket

- **WHEN** an in-memory JSON, text, SSE, or empty response is delivered
- **THEN** headers and prepared body bytes SHALL be written without constructing
  a complete HTTP response string
- **AND** socket completion and abort SHALL retain connection ownership until
  asynchronous delivery settles.

### Requirement: File-backed responses remain isolated

Host Bridge SHALL preserve the existing bounded file-transfer data path for
registered file responses.

#### Scenario: A registered file is downloaded

- **WHEN** Host Bridge resolves a registered file response
- **THEN** it SHALL continue using `RuntimeFileTransferSource` and the bounded R6
  file-transfer contract
- **AND** it SHALL NOT enter the in-memory JSON/text response branch.

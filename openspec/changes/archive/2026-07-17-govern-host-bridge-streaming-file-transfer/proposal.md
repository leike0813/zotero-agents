## Why

Host Bridge file handles currently read entire files into JavaScript memory during registration and again during download, while attachment registration starts all hashes concurrently. Large or numerous Zotero attachments can therefore amplify main-thread work, allocation, and copying even when Assistant Workspace uses silent display mode.

## What Changes

- Introduce one cross-runtime file-transfer boundary for bounded asynchronous inspection, SHA-256 digest, validation, and socket delivery.
- Replace whole-file download payloads with file-backed sources and stream them to the Host Bridge response.
- Serialize attachment registration through an explicit bounded policy while preserving input order.
- Preserve the existing HTTP and CLI contracts, including opaque handles, exact lengths, known checksums, filenames, content types, authentication, and structured unavailable-file failures.
- Add deterministic resource-boundary tests and Zotero 7/9 host coverage; update the R6 audit with the implemented mechanism and evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-file-downloads`: Require bounded file-backed registration, verification, and download without whole-file JavaScript buffers, and define source-change handling.

## Impact

- Host Bridge file registry, capability attachment mapping, binary HTTP response delivery, and shared SHA-256 utilities.
- Node tests, Zotero runtime tests, OpenSpec documentation, and the ACP silent-execution risk audit.
- No public route, CLI schema, capability name, preference, dependency, or user-interface change.

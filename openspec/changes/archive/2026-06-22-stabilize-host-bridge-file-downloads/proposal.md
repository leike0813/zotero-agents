# Stabilize Host Bridge File Downloads

## Why

Agent-owned workflow handoff bundles are downloaded through Host Bridge as zip
files. Large binary bundles must not be truncated or corrupted by string-based
HTTP response handling, and agents need stable metadata to decide whether a
download is complete.

## What Changes

- Send registered file downloads as binary response bodies with accurate
  `Content-Length` and optional `X-Zotero-Bridge-Sha256` metadata.
- Record file registry `size` and `sha256` metadata when bytes are available.
- Include agent-run bundle `size` and `sha256` in the returned descriptor.
- Make the Rust CLI validate downloaded bytes against length and checksum
  metadata, retry transient download integrity failures once, and report
  stable agent-friendly JSON fields.

## Impact

- Affected specs: `host-bridge-file-downloads`,
  `host-bridge-cli-interface`.
- Affected code: Host Bridge file registry, Host Bridge HTTP server,
  workflow agent-run bundle materialization, Rust CLI download client and
  command output.

# Proposal

## Why

The published vector index can support library-grounded answers when agents can retrieve and verify specific passages, including their surrounding context.

## What Changes

- Add read-only semantic evidence search and context expansion to Synthesis, CLI and MCP.
- Share ranking and verification with Workbench and expose the same client seam to the built-in Pi runtime.
- Provide traceable excerpts, coverage and unavailable reasons over the existing indexed corpus.

## Capabilities

### New Capabilities

- `synthesis-semantic-evidence` covers bounded semantic evidence search and source-context reads.

### Modified Capabilities

- `synthesis-vector-retrieval` defines the shared Workbench semantic search behavior.
- `host-bridge-service` exposes both read-only evidence operations.

## Impact

Shared TS/Rust protocol, native applications, Workbench, CLI, MCP and agent-facing guidance.

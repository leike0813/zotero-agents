# Proposal

## Why

The approved search contract requires a real, bounded Library evidence search that returns source-verified passages with stable provenance and offsets. Synthesis has no production retrieval application for this behavior yet, and the later Library and Topic search changes need one shared contract and lexical kernel to avoid divergent semantics.

## What Changes

- Define environment-neutral shared search request/result DTOs and one TypeScript/Rust schema source for method, coverage, issue, paging, and bounded result semantics.
- Add one reusable Rust Unicode-aware lexical kernel with deterministic coverage, phrase, field, and identity ordering. C3's Broker search will call the same Rust Retrieval Application/kernel through a private injected native port; C4's TopicApplication will reuse the kernel. C1 remains limited to list filter naming. Do not add a TypeScript duplicate, BM25, term-frequency ranking, a persistent lexical index, or vector execution.
- Add `SynthesisClient.searchEvidence` and the explicit `host.synthesis.searchEvidence` projection, backed by a production Rust retrieval application inside the current sidecar runtime.
- Search bounded Library metadata/abstract, existing Markdown full text, and canonical digest/analysis sources; read and verify each returned passage through its source owner during the same request.
- Define the private Host source-facts read seam needed by Rust retrieval and by the dependent Library search change, reusing current runtime adapters and source readers.
- Keep `searchEvidence` as the only public evidence operation; do not add `readEvidence`, a separate process, Topic-content search, or vector/index configuration.
- Add remote `synthesis.search_evidence`, its MCP mirror, Rust CLI `synthesis evidence search`, and the needed agent-facing guidance with baseline parity, thickness, and render checks; preserve JSON-container `--query` behavior.

## Capabilities

### New Capabilities

- `synthesis-search-contracts`: Shared search request, result, ranking-method, coverage, issue, and paging semantics consumed by the separate Library and Topic search changes.
- `synthesis-lexical-search-kernel`: Bounded, deterministic, Unicode-aware lexical matching and ranking shared by evidence, Library, and Topic search.
- `synthesis-evidence-search`: Synthesis-owned search of bounded Library source passages with same-call source-version and range verification.

### Modified Capabilities

- `synthesis-client-contracts`: Add the concrete typed `searchEvidence` operation and keep internal source transport private to native composition.
- `synthesis-cross-language-sidecar-contract`: Add canonical closed DTO/schema and shared positive/negative protocol fixtures for search.
- `synthesis-native-production-routing`: Route the typed operation to the in-runtime Rust retrieval application and its bounded private Host source-facts port.
- `synthesis-host-library-read-port`: Define bounded source-owner reads that return complete content and opaque source versions for verification without exposing paths or Zotero objects.
- `host-bridge-service`: Expose the search through the declared remote `synthesis.search_evidence` capability and its existing validated dispatch path.
- `workflow-host-api-v12`: Explicitly project `host.synthesis.searchEvidence` through the closed v12 Workflow Host surface.
- `host-bridge-cli-synthesis-subcommands`: Expose Rust CLI `synthesis evidence search` through the current CLI command contract, preserving JSON-container `--query` semantics.
- `zotero-mcp-tool-suite`: Mirror the remote Synthesis evidence-search capability as an MCP tool through the existing Host Bridge handler.

## Impact

The change affects Synthesis contract DTOs and schemas, native client composition, Workflow Host projection, the sidecar's production application graph and RPC routing, and the private reverse-Host source-facts adapter. The exact existing files and new files are enumerated in `design.md`. No production code is changed by this planning artifact set.

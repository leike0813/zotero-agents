# Proposal

## Why

The earlier retrieval contracts described an OpenAI-compatible/Ollama baseline, while the current provider/preferences implementation covers six protocols, draft templates, explicit discovery and testing, and optional encoding options. This change updates the contracts and design documents to the observed behavior while leaving real-endpoint, Preferences-GUI, packaging and broader acceptance evidence open.

## What Changes

- Extend connection protocols to `openai`, `ollama`, `tei`, `cohere`, `voyage`, and `gemini`, with protocol-owned request bodies and response parsing.
- Add thirteen presets: protocol service templates for OpenAI, Ollama, TEI, Cohere, Voyage and Gemini; LM Studio, vLLM, Xinference, Azure OpenAI and Jina provider presets; and local templates for `qwen3-embedding:0.6b` and `qwen3-embedding:4b`. A preset SHALL fill a new unsaved draft only; it SHALL NOT start a network request, save, establish primary/fallback selection, enable, test, activate, or index a connection. Preset names SHALL identify the provider and remove private-network examples.
- Add free-form connection fields for `embeddingUrl`, optional discovery (`protocol`, `url`, or both), authentication (`none`, `bearer`, or a named header), and JSON `common`/`query`/`document` parameters. Parameter values SHALL be nonsecret request options. Secrets SHALL be stored separately with encryption and SHALL NOT enter snapshots.
- Preserve existing base-URL/API-root/full-endpoint resolution semantics, including proxy paths and query parameters. Existing configurations SHALL retain their behavior, and model identifiers SHALL be stored and sent exactly as entered.
- Add explicit multi-connection create, edit, and delete controls with one selected primary and an ordered fallback list. Deleting a connection SHALL clear its credential, unset it as primary, and remove it from fallbacks while preserving the order of the others; invalid explicit selections SHALL still be rejected. Saving SHALL preserve retrieval scope and SHALL NOT implicitly activate, enable, test, or index a connection.
- Add click-only model discovery over the unsaved draft and available credential. Supported discovery SHALL include OpenAI-compatible models, Ollama tags followed by selected-model `show`, TEI info, Cohere filtered models, and Gemini models; Voyage and Jina SHALL report unsupported generic discovery, and Azure deployment names SHALL remain manual.
- Bound discovery to one shared 15-second operation, 20 pages, and 1,000 reported entries. Partial results SHALL remain visible; cancellation and late results SHALL be isolated to the owning draft; failures SHALL retain user input.
- Make save-and-test one operation that validates before mutation, writes the nonsecret configuration and encrypted credential before issuing a small synthetic query/document probe, and restores both previous values when either write fails. A failed probe SHALL NOT create or update an index. Tests SHALL bind a request-configuration key plus encrypted-credential revision, reject late completions including an older same-configuration probe, and filter fallback services by the effective encoding identity.
- Extend `EncodingIdentity` with optional `encodingOptionsKey` derived from the effective paired query/document parameters through canonical JSON. Endpoints, secrets, and connection identities SHALL remain outside index identity; legacy OpenAI and Ollama default identities SHALL keep their existing four fields.
- Make Rust `encodingOptionsKey` optional and omitted when absent, with no SQL migration. Deployment SHALL require a compatible sidecar build.
- Validate complete vectors atomically for every supported protocol: each coordinate SHALL be finite float32, the expected dimension SHALL match, and every vector norm SHALL be nonzero. Adapters SHALL own native envelope, batched-response, and query/document differences while merging common parameters without allowing adapter-owned model, input, dimensions, output format, or truncation fields to be overridden. Only an explicit synthetic probe SHALL establish the actual dimension; discovery or `show` metadata SHALL not set the output-dimension request.
- Split requests by protocol capacity under one operation deadline, with at most three document attempts including fallback and all-or-nothing per response/batch.
- Keep all connection, credential, file, and HTTP ownership in the Host. Add no Node-runtime code or dependency, preserve Home's runtime-only presentation, and document the configuration, discovery, testing, identity, and compatibility boundaries.

No field removal, SQL migration, implicit activation, automatic model discovery, or background index work is part of this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-vector-retrieval`: expands supported protocols and connection data, model discovery, identity options, response adapters, batched request limits, credential-bound testing, and ordered fallback semantics while preserving index compatibility.
- `synthesis-workbench-ui`: defines the Preferences draft, preset, connection CRUD, discovery, credential, save-and-test, stale-result, and scope-preservation behavior exposed to users while keeping Home runtime-only.

## Impact

Affected implementation areas are the Synthesis embedding Host adapter and Preferences controller, preference markup, locale strings, and styles; Synthesis contracts and reverse-Host DTO validation; Rust sidecar retrieval parsing and identity handling; focused Synthesis tests; and the Synthesis design documents. The change adds no package dependency and introduces no SQL migration. Existing connections, compatible published indexes, scope selections, Home presentation, permissions, and Host ownership remain supported.

Combined verification passed 104 tests (UI 49, provider/preferences 43, Home 12) with two pre-existing pending tests: runtime default and context `openDashboard`. The model-filter case is covered by an existing UI test. All 11 locale catalogs and localization governance pass. The Node `synthesis-workbench` shard passed 272 items and `synthesis-application` passed 181. Rust evidence covers 31 retrieval and four identity tests and one native embedding test. A native production run passed 43 tests in eight minutes covering 121 retrieval and 92 embedding cases. The standalone full checker returned `ok: false` with no errors but missing current execution evidence and broad coverage because its identity includes actively changed tests, so the full aggregate remains incomplete. Root and Synthesis TypeScript checks and contracts including canonical validators pass. Targeted cross-language behavior is validated, while full cross-language evidence is not green. These tests use controlled HTTP, preference state and fake DOM; no live provider endpoint, real interactive Preferences GUI or real Zotero run was exercised. Seven-platform artifacts are stale against the current source fingerprint, XPI and real-Zotero acceptance are blocked, and source publication plus remote prebuild remain unauthorized. This evidence does not satisfy the unchecked acceptance tasks or close index acceptance.

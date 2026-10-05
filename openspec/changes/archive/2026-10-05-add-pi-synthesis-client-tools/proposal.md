# Proposal

## Why

Pi exposes only two of the 29 public Synthesis Client tools. The #10 decision chain left this as a planning omission: #13 requested a Synthesis tool disposition, #20 allowed independent Gateway registration, and #26 C12–C15 specified only Broker-native tools.

## What Changes

- Add an explicit local Synthesis catalog with 29 reviewed tools, shared by Pi Conversations and Skill Runs. Move the existing two search definitions into it without changing their names.
- Reuse canonical Synthesis request schemas and Client methods, preserving lazy initialization, bounded results, cache readiness and structured failures.
- Deliver Topic context and planning context through owner-managed files when requested; export filtered paper artifacts as an atomically published workspace directory retaining relative paths and manifest.
- Submit the three maintenance operations through Gateway authorization, durably associate returned operation views with the originating call, and expose explicit status reads without polling or replay.
- Correct shared Native file-tool classification to claim the owner workspace resource before Gateway execution.
- Preserve the existing search-adaptation and release-acceptance changes; add no dependency or sidecar wire change.

## Capabilities

### New Capabilities

- `pi-synthesis-tool-catalog`: Reviewed local Synthesis tool projection, workspace delivery and asynchronous maintenance admission.

### Modified Capabilities

- `pi-zotero-tool-catalog`: Synthesis tools are composed independently of the Broker catalog; Native file reads claim the owner workspace resource.
- `pi-trusted-native-execution`: Bounded, atomic generated-directory delivery with relative-path preservation and owner quota accounting.

## Impact

Add `src/modules/piSynthesisToolCatalog.ts`; update native catalog, managed workspace, Conversation and Skill Run composition, shared canonical schema materialization where needed, domain documentation and relevant Node/real-Zotero tests. Host Bridge remains the remote adapter; Pi does not consume its registry policy or expose its file handles. There are no persisted format changes, commits or publication in this change.

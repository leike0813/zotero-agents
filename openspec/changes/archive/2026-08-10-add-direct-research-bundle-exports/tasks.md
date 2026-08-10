## 1. Baseline and executable tests

- [x] 1.1 Record the fixed semantic baseline, affected materialized metrics, and empty deletion inventory in the change evidence.
- [x] 1.2 Extend existing core tests with failing paper/topic bundle content, layout, warning, deduplication, navigation, and bound scenarios.
- [x] 1.3 Add failing CLI parser and payload/result contract tests for both canonical command leaves and connection-mode argument gates.

## 2. Shared paper materialization

- [x] 2.1 Implement the Host-owned paper materialization service for canonical identity, metadata, Markdown/images, PDF fallback, four artifacts, paths, integrity inputs, and diagnostics.
- [x] 2.2 Expose the shared materializer through the versioned Workflow Host API and update its capability summary and types.
- [x] 2.3 Refactor the existing Research Bundle workflow to consume the shared Host DTO while preserving Product selection, layout, bibliography, and registration behavior.

## 3. Direct bundle capabilities and delivery

- [x] 3.1 Implement paper and Topic direct-bundle selection, manifest/index generation, global digest deduplication, validated report-copy navigation, and fallback source index.
- [x] 3.2 Implement atomic local output, declared preflight/final bounds, cleanup, and path/collision protection.
- [x] 3.3 Implement disk-backed remote ZIP creation with incremental source hashing and existing Host Bridge file-handle registration and delivery descriptors.
- [x] 3.4 Register and type `items.export_research_bundle` and `topics.export_research_bundle` through Host Bridge, Synthesis MCP, and protocol surfaces.

## 4. CLI and executable contracts

- [x] 4.1 Implement `library items export-research-bundle --items` and `synthesis topic export-research-bundle --topic-id ...` in the Rust CLI.
- [x] 4.2 Add strict capability and CLI command input/result contracts, file output boundaries, effects, aliases, evidence, and recovery metadata.
- [x] 4.3 Run the focused Rust and Host Bridge tests and fix all behavior or contract failures.

## 5. Generic agent-facing workflow

- [x] 5.1 Update the Generic coordinator and research-task model with the independent direct-delivery branch and Query-to-Synthesis identity handoff.
- [x] 5.2 Update the Query and Synthesis Skills/playbook with scope, content, local/remote evidence, missing-content stops, completion, and recovery semantics.
- [x] 5.3 Run semantic surface review against the fixed baseline and reach zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate counts.

## 6. Rendering and validation

- [x] 6.1 Validate the OpenSpec change and run focused core, workflow, CLI, type/build, and lint checks.
- [x] 6.2 Render and validate governed Host Bridge content without modifying release identity or running prebuild/release commands.
- [x] 6.3 Regenerate the complete Chinese ownership review mirror through prepare/finalize and pass its provenance and structure check.
- [x] 6.4 Record final files, commands, results, remaining risks, and completed task status.

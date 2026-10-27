# Design

## Context

See proposal.md for motivation. The existing System E2E runner already owns isolated profiles, current-source sidecar staging, lifecycle cleanup, public evidence, and sanitized manifests. Its ACP scenarios mostly use debug workflows, so their output is not a golden source for production workflows.

## Goals / Non-Goals

The confirmed test boundary is the production selection/submission entrypoint through real apply and public reads. This change adds no transport fault injection, production API, dependency, release gate, or publication. Windows validation is outside this iteration.

## Decisions

- Use the existing runner with `ZOTERO_WORKFLOW_E2E_MODE=offline|live`, default offline. One WF-01 serial chain owns all imported items, collections, settings, runs, artifacts, and peers; cleanup and health run before yielding the shared profile. Per-workflow evidence identifies the last successful step without a second scenario registry.
- Build the live driver before offline fixture materialization. Execution failures, invalid final artifact contracts, apply failures, and invalid business-flow transitions stop capture and never become golden expectations. Validate public states, artifact structure, ownership, resource readability, and workflow composition. Agent prose accuracy and quality are outside this boundary; do not lock exact generated content. Do not build expected output from the implementation's own return value.
- Prepare private source metadata with Node's SQLite support against a copied database. Resolve stored/linked PDFs and copy bytes into private staging; import through Zotero APIs. Do not copy old notes, source profile, or plugin state. Missing PDFs are reported and excluded. All source paths and source keys remain private.
- Following diagnosis and explicit user continuation, copy a stopped capture's test profile/data into a new scaffold invocation. Preserve original failure evidence, reference successful prior steps, and write new evidence separately; do not import from a real profile or replay completed steps.
- Install the current dev Content Package through the production installer. Create fresh MinerU and OpenCode v2 backend profiles. Keep the exact requested model ID and unspecified reasoning. Reuse credentials without changing global configuration or publishing secrets.
- Choose 20 available PDFs and a coherent five-paper analysis subset. Use English source and Chinese target for the deep-reading/translator path. Include two additional related, not-yet-analyzed papers in T1's resolved sources and verify their missing-material baseline. Analyze them after creating T2, then observe T1 stale and fresh after update through public reads.
- Answer live workflow interactions within explicit user delegation, recording each actual question and decision; otherwise await the user's answer. Offline peers use synthetic reviewed dialogue and remap fixture roles to current-run identities. They emulate external ACP/file and HTTP interactions while the production workflow, Host Bridge, and sidecar execute normally.
- Export and actually restore literature and note objects in the temporary library, rather than accepting no-op reimports. Compare structural fields and ownership, not prose snapshots or incidental IDs.
- The authorized reference-filter repair recognizes explicit author-list structure instead of capitalized-token ratios. Analysis apply removes Citation items and timeline IDs only for references rejected by that same filter; unrelated unknown IDs retain the host's existing conflict rejection. Both managed notes and sidecar input use the resulting consistent pair.
- Collection Collector uses the existing Host contracts: omit the first cursor and pass opaque continuation unchanged; read actual Topic membership from `resolved_paper_set.papers` in the default flat context. Resolver selectors are not resolved sources. Inventory failures remain failed, resumable gate commands unless Host explicitly reports `collection_not_found`. Skill execution preserves failures for operator diagnosis without changing installed code or repository state.
- Keep private source manifests, raw artifacts, and diagnostics outside published evidence. Committed fixtures carry three-field identities, synthetic assets, and reviewed structure contracts. The existing Foundation remains the Suite Baseline.

## Risks / Trade-offs

- Network, quotas, or model output may fail → stop and retain first-failure evidence; request follow-up before continuing.
- Human interaction can take time → preserve the live owner and distinguish human waiting from active execution budgets.
- A successful terminal response can still leave an invalid business state → check public apply results, artifact ownership, readable resources, and required downstream transitions before admitting a fixture.
- Source library and linked files contain private content → never publish paths, source identifiers, databases, document bytes, or their content hashes.

## Migration Plan

Add test-only infrastructure incrementally with TDD, capture successful live behavior, then construct and validate synthetic offline fixtures. Run Linux Zotero 7/9/10 independently. No persisted production schema migration is needed; incomplete work remains an active OpenSpec change.

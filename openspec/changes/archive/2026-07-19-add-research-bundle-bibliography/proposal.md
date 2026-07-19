## Why

Research Bundle Products include portable metadata and source artifacts but do not provide a bibliography that downstream agents and writing tools can consume directly. The export must use the bibliography behavior already registered in Zotero while remaining deterministic when Better BibTeX is missing or fails.

## What Changes

- Add a root `references.bib` containing every Zotero item successfully materialized as a core or related paper.
- Prefer the Better BibTeX export translator and fall back to Zotero's native BibTeX translator when Better BibTeX is unavailable, fails, or returns empty output.
- Record bibliography format, translator identity, fallback state, and item count in the Product manifest; record fallback as a structured warning.
- Reject Product registration atomically when neither translator can produce a non-empty bibliography.
- Add a generic ordered text-export capability to Workflow Host API v10 instead of coupling the workflow to Better BibTeX globals or its local HTTP endpoint.
- Update localized Product guidance, workflow documentation, and stable behavior tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research-bundle-workflow`: Require bibliography generation, Better BibTeX preference, native fallback, provenance, and atomic failure behavior.
- `research-bundle-readable-product`: Add `references.bib` to the stable root layout and README navigation contract.
- `zotero-host-broker-capability-api`: Expose ordered Zotero export-translator execution through Workflow Host API v10.

## Impact

- Workflow Host API types and runtime version negotiation.
- Zotero export translator discovery and execution.
- Research Bundle materialization, manifest, README, tests, OpenSpec requirements, and user documentation.
- No new dependency, content package version bump, release action, or direct Better BibTeX plugin API coupling.

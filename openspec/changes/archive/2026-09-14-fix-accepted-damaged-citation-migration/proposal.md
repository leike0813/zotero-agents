## Why

The migration can currently fail after a successful native commit because parent-set verification enriches the returned Citation detail and pushes the result above the Broker's 1 MiB response boundary. Separately, a previous workaround migrated References while leaving an oversized legacy Citation behind. A fresh scan then ignores the canonical References, cannot read the retained Citation, and misclassifies reference-bearing collections as `no_references`.

The same size risk exists for new literature-analysis Citation artifacts because snippets are stored without a bounded compaction policy. Fixing only the observed candidate would leave both producers and later candidates exposed.

## What Changes

- Keep parent-set verification internal and return the verified managed-note detail without public detail enrichment.
- Let the migration reader recover legacy embedded payloads up to 4 MiB while leaving ordinary Broker reads at 1 MiB.
- Reuse canonical References during Citation repair, understand the legacy nested Citation reference shape, and write only artifact kinds that need replacement.
- Compact Citation snippets without changing item or mention identity, fields, order, or counts; literature-analysis opts into a 512-code-point default and the managed-note owner tightens the cap only when exact envelope sizing requires it.
- Remove the accepted-damaged-input bypass. Unreadable or uncompacted oversized Citation data remains blocking.
- Continue a migration batch after terminal candidate-local failures with no residual effects, while stopping on ambiguous, infrastructure, cancellation, or repair-required outcomes.
- Advance the migration definition version so old previews cannot execute under the repaired semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-artifact-migration`: Recover and repair oversized Citation artifacts, reuse canonical References, and continue after safe candidate-local failures.
- `managed-literature-artifacts`: Verify parent-set writes within the response boundary and provide exact Citation snippet compaction for opted-in trusted writes.
- `literature-workbench-package`: Opt literature-analysis into bounded Citation snippet compaction and propagate the stored artifact and compaction report.

## Impact

- Affects the Dashboard-local migration service, private Broker parent-set mutation, managed-note payload reader, Workflow Host literature-analysis apply path, built-in literature-analysis workflow, focused Node/Zotero tests, and component documentation.
- Does not change the canonical artifact schema or storage format, ordinary managed-note read limit, direct strict Citation upsert behavior, or public Host Bridge/MCP surface.
- Adds no dependency and performs no automatic write against a real Zotero library during verification.

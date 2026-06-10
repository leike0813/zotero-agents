# Step 06 Cross-Paper Context

This step is runtime-managed.

## Outputs

Runtime writes:

```text
runtime/views/cross-paper-context.md
runtime/views/external-literature-context.md
runtime/views/cross-paper-context.manifest.json
runtime/views/cross-paper-evidence-index.json
runtime/payloads/cross-paper-evidence-map.json
```

The agent reads the markdown views and uses `source_paper_refs` in later payloads. Runtime validates those refs and materializes evidence ids, evidence-map refs, provenance, and final evidence sections.

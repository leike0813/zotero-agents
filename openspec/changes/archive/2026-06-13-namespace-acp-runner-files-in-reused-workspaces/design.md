# Design

## File Namespace

The ACP workspace factory allocates a file namespace for each run in a
workspace. The namespace is:

```text
<safe skill id>.<index>
```

The index starts at 1 and increments per safe skill id within the same
workspace. Safe skill ids use the existing path-segment sanitizer.

## Paths

Each run records concrete absolute paths:

```text
result/<namespace>/result.json
.audit/<namespace>/input_manifest.json
```

The shared `workspaceDir` and `.acp` runtime directory are unchanged. Sequence
steps that use `workspace: "reuse-workflow"` share the same `workspaceDir`, but
their runner-owned result and audit files are separate.

## Compatibility

The provider response and persisted run record already include `resultJsonPath`
and `inputManifestPath`. Existing result resolution continues to read those
fields. Bundle fallback semantics still allow `result/result.json` for legacy
bundle entries; ACP local result resolution should prefer `resultJsonPath`.

Package result-file fallback remains outside runner-owned directories. Files in
`result/` and `.audit/` are ignored by fallback discovery.

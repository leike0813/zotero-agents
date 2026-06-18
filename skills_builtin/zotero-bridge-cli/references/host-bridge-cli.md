# Host Bridge CLI Reference

This reference is generated from the Host Bridge surface catalog. Edit the Host
Bridge capability registry or Rust CLI source, then run
`npm run render:host-bridge-surface`.

The published bundle includes `assets/profile.template.json`. Copy it to the Host
Bridge well-known profile location or set `ZOTERO_BRIDGE_PROFILE` to its path.
Override the template at runtime with `ZOTERO_BRIDGE_ENDPOINT`,
`ZOTERO_BRIDGE_TOKEN`, `ZOTERO_BRIDGE_SCOPE`, and
`ZOTERO_BRIDGE_CONNECTION_MODE=local|remote`. `ZOTERO_BRIDGE_SCOPE` may contain
`{"kind":"skillrunner-run","frontendScopeId":"..."}` so Host Bridge write
approvals return to the SkillRunner panel.

## Resolver Payloads

For resolver commands, pass direct resolver fields: `tag`, `collection_key`,
`paper_refs`, optional `combine`, and optional paging fields. Do not wrap them
in a top-level `resolver` object. `topic_resolver`, `mode`, `query`, `include`,
and `exclude` are legacy fields and are rejected by `resolvers resolve`.

<!-- host-bridge-surface:wrapper-reference:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### Discovery commands

```text
zotero-bridge status
zotero-bridge manifest
zotero-bridge --help
zotero-bridge item --help
zotero-bridge note --help
zotero-bridge topics --help
zotero-bridge schemas --help
zotero-bridge concepts --help
zotero-bridge citation-graph --help
zotero-bridge library-index --help
zotero-bridge resolvers --help
zotero-bridge reference-index --help
zotero-bridge paper-artifacts --help
zotero-bridge insights --help
zotero-bridge literature --help
zotero-bridge workflow --help
zotero-bridge task --help
zotero-bridge file --help
```

### Semantic mappings

| CLI command | Target | Kind | Flags |
| --- | --- | --- | --- |
| `status` | `GET /bridge/v1/health` | endpoint | - |
| `manifest` | `GET /bridge/v1/manifest` | endpoint | - |
| `item attachments` | `library.get_item_attachments` | capability | - |
| `item get` | `library.get_item_detail` | capability | - |
| `item notes` | `library.get_item_notes` | capability | - |
| `item search` | `library.search_items` | capability | - |
| `note get` | `library.get_note_detail` | capability | - |
| `note payload` | `library.get_note_payload` | capability | - |
| `note payloads` | `library.list_note_payloads` | capability | - |
| `topics find-by-paper-ref` | `topics.find_by_paper_ref` | capability | - |
| `topics get-context` | `topics.get_context` | capability | - |
| `topics get-report` | `topics.get_report` | capability | - |
| `topics get-review-input` | `topics.get_review_input` | capability | - |
| `topics list` | `topics.list` | capability | - |
| `schemas get` | `schemas.get` | capability | - |
| `concepts query` | `concepts.query` | capability | - |
| `citation-graph get-layout` | `citation_graph.get_layout` | capability | cache-view |
| `citation-graph get-metrics` | `citation_graph.get_metrics` | capability | cache-view |
| `citation-graph get-slice` | `citation_graph.get_slice` | capability | cache-view |
| `citation-graph overview` | `citation_graph.get_overview` | capability | cache-view |
| `citation-graph query-cluster` | `citation_graph.query_cluster` | capability | cache-view |
| `citation-graph rank-external-references` | `citation_graph.rank_external_references` | capability | cache-view |
| `citation-graph rank-library-papers` | `citation_graph.rank_library_papers` | capability | cache-view |
| `citation-graph refresh-metrics` | `citation_graph.refresh_metrics` | capability | dangerous |
| `library-index get` | `library_index.get` | capability | cache-view |
| `resolvers resolve` | `resolvers.resolve` | capability | - |
| `reference-index get` | `reference_index.get` | capability | cache-view |
| `paper-artifacts export-filtered` | `paper_artifacts.export_filtered` | capability | - |
| `paper-artifacts manifest` | `paper_artifacts.get_manifest` | capability | - |
| `paper-artifacts read` | `paper_artifacts.read` | capability | - |
| `paper-artifacts resolve-topic-digest` | `paper_artifacts.resolve_topic_digest` | capability | - |
| `insights attention-queue` | `insights.get_attention_queue` | capability | - |
| `literature ingest` | `mutation.execute` | capability | - |
| `workflow list` | `GET /bridge/v1/workflows` | endpoint | - |
| `workflow run` | `GET /bridge/v1/workflows/runs/{runId}` | endpoint | - |
| `workflow submit` | `POST /bridge/v1/workflows/submit` | endpoint | - |
| `task list` | `GET /bridge/v1/tasks` | endpoint | - |
| `file download` | `GET /bridge/v1/files/{fileId}` | endpoint | - |

### Topic context payloads

- `topics get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--input` JSON.
- Omit `view` only when a legacy flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge topics get-context --input '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Resolver payloads

- `resolvers resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge resolvers resolve --input '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge resolvers resolve --input '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Legacy fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

### Raw-only and debug capabilities

| Capability | Category | Approval | Input | CLI exposure | Flags |
| --- | --- | --- | --- | --- | --- |
| `context.get_current_view` | context | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `context.get_selected_items` | context | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `library.list_items` | library | `none` | `object` | `raw call only` | raw-only, mcp-mirror |
| `citation_graph.refresh_metrics` | citation_graph | `zotero-ui-required` | `object` | `citation-graph refresh-metrics` | dangerous, mcp-mirror |
| `mutation.execute` | mutation | `zotero-ui-required` | `mutation-preview required` | `literature ingest` | raw-only, mcp-mirror |
| `mutation.preview` | mutation | `none` | `mutation-preview required` | `raw call only` | raw-only, mcp-mirror |
| `diagnostic.get_status` | diagnostic | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `debug.acpSkillRun.reapplyResult` | debug | `none` | `object` | `debug acp-skill-run reapply-result` | debug-only, mcp-mirror |
| `debug.persistence.snapshot` | debug | `none` | `object` | `debug persistence` | debug-only, mcp-mirror |
| `debug.status` | debug | `none` | `object` | `debug status` | debug-only, mcp-mirror |
| `debug.synthesis.cache.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.cleanInstallReset` | debug | `zotero-ui-required` | `object` |  | debug-only, dangerous, mcp-mirror |
| `debug.synthesis.diff` | debug | `none` | `object` | `debug synthesis diff` | debug-only, mcp-mirror |
| `debug.synthesis.operations.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.paper.inspect` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.profiler.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.snapshot` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.topic.inspect` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.tasks.snapshot` | debug | `none` | `object` | `debug tasks` | debug-only, mcp-mirror |
| `debug.zotero.eval` | debug | `zotero-ui-required` | `object` | `raw call only` | debug-only, dangerous, raw-only, mcp-mirror |
<!-- host-bridge-surface:wrapper-reference:end -->

## Remote Export Bundles

- With a remote profile, `topics get-context` with `outputPath` returns `delivery.mode="bridge-download"` instead of writing the caller path. Run `delivery.downloadCommand`, then run `delivery.unpackHint`.
- With a remote profile, `paper-artifacts export-filtered` returns the same kind of zip bundle. Treat `manifest_file` as a path inside the unpacked zip.

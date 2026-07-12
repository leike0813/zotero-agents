# Host Bridge CLI Reference

This reference is generated from the Host Bridge surface catalog. Edit the Host
Bridge capability registry or Rust CLI source, then run
`npm run render:host-bridge-surface`.

The published bundle includes `install.ps1`, `install.sh`, and
`assets/profile.template.json`. Use `.\install.ps1 --yes --json` on Windows or
`./install.sh --yes --json` on POSIX to install or upgrade without a Node
dependency. The installer auto-detects the platform and does not accept a
platform override. Copy the template to the Host Bridge well-known profile
location or set `ZOTERO_BRIDGE_PROFILE` to its path. Override the template at
runtime with `ZOTERO_BRIDGE_ENDPOINT`, `ZOTERO_BRIDGE_TOKEN`,
`ZOTERO_BRIDGE_SCOPE`, and `ZOTERO_BRIDGE_CONNECTION_MODE=local|remote`.
`ZOTERO_BRIDGE_SCOPE` may contain `{"kind":"skillrunner-run","frontendScopeId":"..."}`
so Host Bridge write approvals return to the SkillRunner panel.

## Resolver Payloads

For resolver commands, pass direct resolver fields: `tag`, `collection_key`,
`paper_refs`, optional `combine`, and optional paging fields. Do not wrap them
in a top-level `resolver` object. `topic_resolver`, `mode`, `query`, `include`,
and `exclude` are unsupported fields and are rejected by `synthesis resolver resolve`.

<!-- host-bridge-surface:wrapper-reference:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### CLI release check

- Expected `zotero-bridge` CLI version for this generated surface: `0.2.1`.
- Confirm with `<zotero-bridge> --version` when the loaded skill or reference path is uncertain, command help does not match this surface, or a CLI error points to command shape mismatch.
- If the observed version differs from the expected version, stop using this loaded skill copy for command syntax. Prefer the workspace-injected skill and run-local shim, then inspect `<zotero-bridge> --help` or the generated reference beside that workspace copy.

### Discovery commands

```text
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge --help
zotero-bridge bridge --help
zotero-bridge library --help
zotero-bridge synthesis --help
zotero-bridge workflow --help
zotero-bridge run --help
zotero-bridge mutation --help
zotero-bridge file --help
zotero-bridge context --help
zotero-bridge product --help
```

### Semantic mappings

| CLI command | Target | Kind | Flags |
| --- | --- | --- | --- |
| `bridge backend list` | `GET /bridge/v1/diagnostics/backends` | endpoint | - |
| `bridge backend status` | `GET /bridge/v1/diagnostics/backends/{backendId}` | endpoint | - |
| `bridge manifest` | `GET /bridge/v1/manifest` | endpoint | - |
| `bridge profile diagnose` | `GET /bridge/v1/diagnostics/profile/diagnose` | endpoint | - |
| `bridge profile inspect` | `GET /bridge/v1/diagnostics/profile` | endpoint | - |
| `bridge status` | `GET /bridge/v1/health` | endpoint | - |
| `library annotation export` | `library.export_annotations` | capability | - |
| `library annotation list` | `library.list_annotations` | capability | - |
| `library item attachments` | `library.get_item_attachments` | capability | - |
| `library item get` | `library.get_item_detail` | capability | - |
| `library item notes` | `library.get_item_notes` | capability | - |
| `library item search` | `library.search_items` | capability | - |
| `library items list` | `library.list_items` | capability | - |
| `library note get` | `library.get_note_detail` | capability | - |
| `library note payload` | `library.get_note_payload` | capability | - |
| `library note payloads` | `library.list_note_payloads` | capability | - |
| `library readiness audit` | `library.readiness_audit` | capability | - |
| `library readiness missing-analysis` | `library.readiness_audit` | capability | - |
| `library readiness missing-markdown` | `library.readiness_audit` | capability | - |
| `library readiness missing-pdf` | `library.readiness_audit` | capability | - |
| `library snapshot` | `library.sync_snapshot` | capability | - |
| `synthesis artifact export-filtered` | `paper_artifacts.export_filtered` | capability | - |
| `synthesis artifact manifest` | `paper_artifacts.get_manifest` | capability | - |
| `synthesis artifact read` | `paper_artifacts.read` | capability | - |
| `synthesis artifact resolve-topic-digest` | `paper_artifacts.resolve_topic_digest` | capability | - |
| `synthesis cache invalidate` | `POST /bridge/v1/synthesis/cache/invalidate` | endpoint | - |
| `synthesis cache status` | `GET /bridge/v1/synthesis/cache/status` | endpoint | - |
| `synthesis concept query` | `concepts.query` | capability | - |
| `synthesis graph get-layout` | `citation_graph.get_layout` | capability | cache-view |
| `synthesis graph get-metrics` | `citation_graph.get_metrics` | capability | cache-view |
| `synthesis graph get-slice` | `citation_graph.get_slice` | capability | cache-view |
| `synthesis graph overview` | `citation_graph.get_overview` | capability | cache-view |
| `synthesis graph query-cluster` | `citation_graph.query_cluster` | capability | cache-view |
| `synthesis graph rank-external-references` | `citation_graph.rank_external_references` | capability | cache-view |
| `synthesis graph rank-library-papers` | `citation_graph.rank_library_papers` | capability | cache-view |
| `synthesis graph refresh-metrics` | `citation_graph.refresh_metrics` | capability | dangerous |
| `synthesis index library get` | `library_index.get` | capability | cache-view |
| `synthesis index reference get` | `reference_index.get` | capability | cache-view |
| `synthesis index status` | `GET /bridge/v1/synthesis/index/status` | endpoint | - |
| `synthesis insight attention-queue` | `insights.get_attention_queue` | capability | - |
| `synthesis resolver resolve` | `resolvers.resolve` | capability | - |
| `synthesis schema get` | `schemas.get` | capability | - |
| `synthesis topic find-by-paper-ref` | `topics.find_by_paper_ref` | capability | - |
| `synthesis topic get-context` | `topics.get_context` | capability | - |
| `synthesis topic get-report` | `topics.get_report` | capability | - |
| `synthesis topic get-review-input` | `topics.get_review_input` | capability | - |
| `synthesis topic list` | `topics.list` | capability | - |
| `workflow agent-apply` | `POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply` | endpoint | - |
| `workflow agent-run` | `POST /bridge/v1/workflows/agent-run` | endpoint | - |
| `workflow describe` | `POST /bridge/v1/workflows/describe` | endpoint | - |
| `workflow list` | `GET /bridge/v1/workflows` | endpoint | - |
| `workflow requirements` | `POST /bridge/v1/workflows/requirements` | endpoint | - |
| `workflow submit` | `POST /bridge/v1/workflows/submit` | endpoint | - |
| `workflow validate` | `POST /bridge/v1/workflows/validate` | endpoint | - |
| `run active` | `GET /bridge/v1/tasks/active` | endpoint | - |
| `run cancel` | `POST /bridge/v1/workflows/runs/{workflowRunId}/cancel` | endpoint | - |
| `run get` | `GET /bridge/v1/workflows/runs/{workflowRunId}` | endpoint | - |
| `run list` | `GET /bridge/v1/tasks` | endpoint | - |
| `run notification ack` | `POST /bridge/v1/notifications/ack` | endpoint | - |
| `run notification list` | `GET /bridge/v1/notifications` | endpoint | - |
| `run notification wait` | `GET /bridge/v1/notifications` | endpoint | - |
| `run permission get` | `GET /bridge/v1/permissions/{permissionRequestId}` | endpoint | - |
| `run permission pending` | `GET /bridge/v1/permissions/pending` | endpoint | - |
| `run recent` | `GET /bridge/v1/tasks/recent` | endpoint | - |
| `run skill connect` | `POST /bridge/v1/skill-runs/{skillRunId}/connect` | endpoint | - |
| `run skill events` | `GET /bridge/v1/skill-runs/{skillRunId}/events` | endpoint | - |
| `run skill get` | `GET /bridge/v1/skill-runs/{skillRunId}` | endpoint | - |
| `run skill recent` | `GET /bridge/v1/skill-runs/recent` | endpoint | - |
| `run skill reply` | `POST /bridge/v1/skill-runs/{skillRunId}/reply` | endpoint | - |
| `run workflow recent` | `GET /bridge/v1/workflows/runs` | endpoint | - |
| `mutation apply` | `mutation.execute` | capability | - |
| `mutation collection add-items` | `mutation.execute` | capability | - |
| `mutation collection create` | `mutation.execute` | capability | - |
| `mutation collection remove-items` | `mutation.execute` | capability | - |
| `mutation item attach-file` | `mutation.execute` | capability | - |
| `mutation item update` | `mutation.execute` | capability | - |
| `mutation literature-ingest` | `mutation.execute` | capability | - |
| `mutation note create` | `mutation.execute` | capability | - |
| `mutation note update` | `mutation.execute` | capability | - |
| `mutation note upsert-payload` | `mutation.execute` | capability | - |
| `mutation preview` | `mutation.preview` | capability | - |
| `mutation tag add` | `mutation.execute` | capability | - |
| `mutation tag remove` | `mutation.execute` | capability | - |
| `file download` | `GET /bridge/v1/files/{fileId}` | endpoint | - |
| `file upload` | `POST /bridge/v1/files/upload` | endpoint | - |
| `context collection open` | `POST /bridge/v1/context/collections/open` | endpoint | - |
| `context current` | `GET /bridge/v1/context/current` | endpoint | - |
| `context current` | `context.get_current_view` | capability | - |
| `context item open` | `POST /bridge/v1/context/items/open` | endpoint | - |
| `context note open` | `POST /bridge/v1/context/notes/open` | endpoint | - |
| `context selection get` | `GET /bridge/v1/context/selection` | endpoint | - |
| `context selection get` | `context.get_selected_items` | capability | - |
| `context selection open` | `POST /bridge/v1/context/selection/open` | endpoint | - |
| `product download` | `workflow_products.export` | capability | - |
| `product get` | `workflow_products.get` | capability | - |
| `product list` | `workflow_products.list` | capability | - |
| `product remove` | `workflow_products.remove` | capability | - |

### Library guidance

- Use inline JSON with `--query` by default. Use stdin, `@file`, or a bare JSON file path only when that source is intentional.
- Use `zotero-bridge library item search --query '{"text":"graph","limit":10}'` for finite candidate discovery.
- Use `zotero-bridge library items list --query '{"limit":50,"collectionKey":"COLL"}'` for bounded library inventory pages.
- Use `zotero-bridge library snapshot --query '{"limit":200,"cursor":"0"}'` for local metadata indexes.
- Use `zotero-bridge library readiness missing-pdf|missing-markdown|missing-analysis --query '{"limit":100}'` before scheduling PDF retrieval, Markdown conversion, or literature-analysis work.
- `library items list` accepts `collectionKey`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--query`.
- `library snapshot` accepts `collectionKey`, `collectionId`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--query`.
- `library readiness audit` accepts the same library filters plus `checks` and `missingOnly`; Markdown and analysis readiness reuse the Zotero Artifacts column rules.
- Use `nextCursor` with `hasMore` to page library and snapshot results.

### Large response pagination

- Treat `response:paged` capabilities as one-page reads. Iterate the returned cursor metadata instead of assuming one call returns the whole collection.
- `synthesis graph overview` returns summary plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use `cursor`/`limit` for all sections together or section cursors such as `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor`.
- Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded subgraph, layout, or ranked metric page instead of the entire citation graph.
- `synthesis topic list`, `synthesis index library get`, graph metrics, and graph rankings are paged reads. Do not build workflows that rely on stdout containing every topic, index row, graph node, edge, or rank item in one response.

### Topic context payloads

- `synthesis topic get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--query` JSON.
- Omit `view` only when the flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge synthesis topic get-context --query '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Resolver payloads

- `synthesis resolver resolve` accepts direct resolver fields in `--query`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge synthesis resolver resolve --query '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge synthesis resolver resolve --query '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Unsupported fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

### Workflow payloads

- Use `workflow describe --workflow <id>` or `workflow requirements --workflow <id>` before submit when selection, workflow options, or provider profile requirements are unclear.
- `workflow submit` and `workflow validate` use `--selection <JSON_OR_FILE>` for an item ref array or `--none` for no-selection workflows.
- Put manifest parameter values in `--workflow-options`; put only `schema`, `backendId`, and `providerOptions` in `--provider-profile`.
- Never put bearer tokens, backend auth, base URLs, or local paths in provider profile files.
- Use `workflow agent-run --workflow <id> (--selection <JSON_OR_FILE> | --none) --output-dir <DIR>` when the calling agent should execute the workflow itself from a downloaded handoff bundle.
- `workflow agent-run` does not accept workflow options, provider profiles, or agent-engine flags, and it does not start a Host backend task; the host only prepares request context for the handoff.
- `workflow agent-run` gates bundle creation only on `inputs`; `validateSelection` is returned as `applyStatus` advisory and is recalculated when apply-back is submitted.
- Use `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>` after finalizing a SkillRunner-compatible output bundle from the handoff output contract.
- Agent-run apply-back is one-shot. Approval denial does not consume the agentRunId, but once applyResult starts the agentRunId cannot be reused.

### Raw-only and debug capabilities

| Capability | Category | Approval | Input | CLI exposure | Flags |
| --- | --- | --- | --- | --- | --- |
| `workflow_products.read_asset` | workflow_products | `none` | `object required` | `raw call only` | raw-only, response:file-output, mcp-mirror |
| `citation_graph.refresh_metrics` | citation_graph | `zotero-ui-required` | `object` | `synthesis graph refresh-metrics` | dangerous, mcp-mirror |
| `diagnostic.get_status` | diagnostic | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `debug.acpSkillRun.reapplyResult` | debug | `none` | `object` | `debug acp-skill-run reapply-result` | debug-only, mcp-mirror |
| `debug.persistence.snapshot` | debug | `none` | `object` | `debug persistence` | debug-only, mcp-mirror |
| `debug.skillrunner.connections.snapshot` | debug | `none` | `object` |  | debug-only, mcp-mirror |
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

- With a remote profile, `synthesis topic get-context` with `outputPath` returns `delivery.mode="bridge-download"` instead of writing the caller path. Run `delivery.downloadCommand`, then run `delivery.unpackHint`.
- With a remote profile, `synthesis artifact export-filtered` returns the same kind of zip bundle. Treat `manifest_file` as a path inside the unpacked zip.

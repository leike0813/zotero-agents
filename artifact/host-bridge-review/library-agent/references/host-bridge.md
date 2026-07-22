# Host Bridge CLI 参考

本参考文档从 Host Bridge surface 目录生成。编辑 Host Bridge capability 注册表或 Rust CLI 源码后，运行 `npm run render:host-bridge-surface`。

已发布的发布包包含 `install.ps1`、`install.sh` 和 `assets/profile.template.json`。在 Windows 上使用 `.\install.ps1 --yes --json`，在 POSIX 系统上使用 `./install.sh --yes --json` 进行安装或升级，无需 Node 依赖。安装器自动检测平台，不接受平台覆盖参数。将模板复制到 Host Bridge 的已知 profile 位置，或设置 `ZOTERO_BRIDGE_PROFILE` 指向其路径。在运行时通过 `ZOTERO_BRIDGE_ENDPOINT`、`ZOTERO_BRIDGE_TOKEN`、`ZOTERO_BRIDGE_SCOPE` 和 `ZOTERO_BRIDGE_CONNECTION_MODE=local|remote` 覆盖模板。`ZOTERO_BRIDGE_SCOPE` 可包含 `{"kind":"skillrunner-run","frontendScopeId":"..."}`，使 Host Bridge 写入 approval 返回到 SkillRunner 面板。

## Resolver Payload

对于 resolver 命令，传递直接的 resolver 字段：`tag`、`collection_key`、`paper_refs`、可选的 `combine` 和可选的分页字段。不要将它们包装在顶层 `resolver` 对象中。`topic_resolver`、`mode`、`query`、`include` 和 `exclude` 是不受支持的字段，会被 `synthesis resolver resolve` 拒绝。

<!-- host-bridge-surface:wrapper-reference:start -->
本节从 Host Bridge surface 目录生成。

### 运行时命令入口

- 优先使用本地运行 shim（如存在）：Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`；POSIX `./.zotero-bridge/bin/zotero-bridge`。
- 当 Skill 指令显示 `<zotero-bridge>` 时，将其替换为当前操作系统的本地运行 shim；仅在 shim 不存在时使用 PATH 命令 `zotero-bridge`。
- 保留注入环境中的 `ZOTERO_BRIDGE_PROFILE` 和 `ZOTERO_BRIDGE_TOKEN`；绝不打印令牌值。

### CLI 版本检查

- 本生成表面的预期 `zotero-bridge` CLI 版本：`0.3.0`。
- 当已加载的 Skill 路径、命令帮助或 CLI 错误表明活动命令表面可能不同时，运行 `<zotero-bridge> --version`。
- 版本不匹配本身不是阻塞问题。当版本不同时，在执行命令前检查 `<zotero-bridge> <command> --help`；当规范命令或 argv 仍不确定时，使用离线的 `surface search` 或 `surface describe`。
- 在依赖已加载的命令合约之前，运行 `<zotero-bridge> surface identity --json`。
- 将 CLI schema、构建 fingerprint 和命令目录校验和与当前表面一同发布的发布信封进行比对。仅凭 SemVer 不足以作为兼容性证据。
- 仅在所需命令不可用、其 argv 或控制合约无法确认，或观察到的 approval、handle、状态变更或恢复语义不兼容时停止。使用同一 release set 中的包装器、CLI shim 和发布信封进行恢复。

### 发现命令

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
zotero-bridge call --help
zotero-bridge context --help
zotero-bridge product --help
```

### 语义映射

| CLI 命令 | 目标 | 类型 | 标志 |
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
| `synthesis cache refresh-reference-sidecar` | `reference_sidecar.refresh` | capability | dangerous |
| `synthesis cache status` | `GET /bridge/v1/synthesis/cache/status` | endpoint | - |
| `synthesis cache status` | `synthesis.operation.get` | capability | - |
| `synthesis concept query` | `concepts.query` | capability | - |
| `synthesis graph get-layout` | `citation_graph.get_layout` | capability | cache-view |
| `synthesis graph get-metrics` | `citation_graph.get_metrics` | capability | cache-view |
| `synthesis graph get-slice` | `citation_graph.get_slice` | capability | cache-view |
| `synthesis graph overview` | `citation_graph.get_overview` | capability | cache-view |
| `synthesis graph query-cluster` | `citation_graph.query_cluster` | capability | cache-view |
| `synthesis graph rank-external-references` | `citation_graph.rank_external_references` | capability | cache-view |
| `synthesis graph rank-library-papers` | `citation_graph.rank_library_papers` | capability | cache-view |
| `synthesis graph refresh-metrics` | `citation_graph.refresh_metrics` | capability | dangerous |
| `synthesis graph update` | `citation_graph.update` | capability | dangerous |
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
| `workflow agent-apply-status` | `GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply` | endpoint | - |
| `workflow agent-run` | `POST /bridge/v1/workflows/agent-run` | endpoint | - |
| `workflow describe` | `POST /bridge/v1/workflows/describe` | endpoint | - |
| `workflow list` | `GET /bridge/v1/workflows` | endpoint | - |
| `workflow profile describe` | `POST /bridge/v1/workflows/provider-profiles/describe` | endpoint | - |
| `workflow profile list` | `GET /bridge/v1/workflows/provider-profiles` | endpoint | - |
| `workflow profile validate` | `POST /bridge/v1/workflows/provider-profiles/validate` | endpoint | - |
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
| `call` | `POST /bridge/v1/call` | service | - |
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

### 文献库使用指引

- 默认使用 `--query` 内联 JSON。仅在有意为之时使用 stdin、`@file` 或裸 JSON 文件路径。
- 使用 `zotero-bridge library item search --query '{"text":"graph","limit":10}'` 进行有限候选发现。
- 使用 `zotero-bridge library items list --query '{"limit":50,"collectionKey":"COLL"}'` 获取有界的文献库清单页。
- 使用 `zotero-bridge library snapshot --query '{"limit":200}'` 获取首个本地元数据索引页。
- 在安排 PDF 获取、Markdown 转换或文献分析工作之前，使用 `zotero-bridge library readiness missing-pdf|missing-markdown|missing-analysis --query '{"limit":100}'`。
- `library items list` 在 `--query` 中接受 `collectionKey`、`tag`、`itemType`、`query`、`cursor` 和 `limit`。
- `library snapshot` 在 `--query` 中接受 `collectionKey`、`collectionId`、`tag`、`itemType`、`query`、`cursor` 和 `limit`。
- `library readiness audit` 接受相同的文献库过滤器以及 `checks` 和 `missingOnly`；Markdown 和分析就绪状态复用 Zotero Artifacts 列规则。
- 首个文献库、快照或就绪状态页省略 `cursor`。当 `hasMore` 为 true 时，传递精确返回的不透明 `nextCursor`；绝不构造或递增游标。

### 大响应分页

- 将 `response:paged` capability 视为单页读取。迭代返回的游标元数据，而非假设一次调用返回整个集合。
- `synthesis graph overview` 返回摘要以及分页的 `nodes`、`edges`、`hover_only_nodes` 和 `hover_only_edges`。对所有部分一起使用 `cursor`/`limit`，或使用部分游标如 `nodeCursor`、`edgeCursor`、`hoverNodeCursor` 和 `hoverEdgeCursor`。
- 当任务需要一致的有界子图、布局或排序指标页而非完整引文图谱时，使用 `synthesis graph get-slice`、`synthesis graph get-layout` 或 `synthesis graph get-metrics`。
- `synthesis topic list`、`synthesis index library get`、图谱指标和图谱排名是分页读取。不要构建依赖 stdout 在单个响应中包含所有主题、索引行、图节点、边或排名项的 workflow。

### 主题上下文 Payload

- `synthesis topic get-context` 通过 `--query` JSON 接受 `view` 值 `digest`、`semantic`、`audit` 和 `full`。
- 仅在需要扁平主题上下文响应时省略 `view`。
- 对于大型 `semantic` 或 `full` 主题上下文，传递 `outputPath` 或 `output_path` 及可选的 `overwrite`；此时 stdout 仅包含紧凑的文件信封。
- 示例：`zotero-bridge synthesis topic get-context --query '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`。

### Resolver Payload

- `synthesis resolver resolve` 在 `--query` 中接受直接的 resolver 字段；不要将它们包装在顶层 `resolver` 对象中。
- 允许的选择器字段为 `tag`、`collection_key` 和 `paper_refs`；至少需要一个选择器。
- `combine` 为可选，默认为 `union`；当每个提供的选择器类型都必须匹配时使用 `intersection`。
- `tag` 接受标签字符串、标签数组或 `{ and, or, not }` 对象。`collection_key` 接受字符串或字符串数组。`paper_refs` 接受规范的 `libraryId:itemKey` 引用。
- 示例：`zotero-bridge synthesis resolver resolve --query '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`；`zotero-bridge synthesis resolver resolve --query '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`。
- 以下不受支持的字段会被拒绝：`resolver`、`topic_resolver`、`mode`、`query`、`include` 和 `exclude`。

### Workflow Payload

- 当选择、workflow 选项或 provider profile 需求不明确时，在提交前使用 `workflow describe --workflow <id>` 或 `workflow requirements --workflow <id>`。
- `workflow submit` 和 `workflow validate` 使用 `--selection <JSON_OR_FILE>` 传递条目引用数组，或使用 `--none` 表示无选择 workflow。
- 将 manifest 参数值放入 `--workflow-options`；仅在 `--provider-profile` 中放入 `schema`、`backendId` 和 `providerOptions`。
- 绝不在 provider profile 文件中放入 bearer 令牌、backend 认证、基础 URL 或本地路径。
- 当调用 Agent 应从下载的交接包中自行执行 workflow 时，使用 `workflow agent-run --workflow <id> (--selection <JSON_OR_FILE> | --none) --output-dir <DIR>`。
- `workflow agent-run` 不接受 workflow 选项、provider profile 或 Agent 引擎标志，也不启动 Host backend 任务；Host 仅为交接准备请求上下文。
- `workflow agent-run` 仅基于 `inputs` 控制包创建；`validateSelection` 作为 `applyStatus` 建议值返回，在提交 apply-back 时重新计算。
- 在从交接输出合约最终确定 SkillRunner 兼容的输出包后，使用 `workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>`。
- Agent-run 的 apply-back 是一次性的。Approval 拒绝不消费 agentRunId，但一旦 applyResult 启动，agentRunId 不可重用。

### 仅限原始模式和调试 capability

| Capability | 类别 | Approval | 输入 | CLI 暴露 | 标志 |
| --- | --- | --- | --- | --- | --- |
| `workflow_products.read_asset` | workflow_products | `none` | `object required` | `raw call only` | raw-only, response:file-output, mcp-mirror |
| `citation_graph.refresh_metrics` | citation_graph | `zotero-ui-required` | `object` | `synthesis graph refresh-metrics` | dangerous, mcp-mirror |
| `citation_graph.update` | citation_graph | `zotero-ui-required` | `object` | `synthesis graph update` | dangerous, mcp-mirror |
| `reference_sidecar.refresh` | reference_index | `zotero-ui-required` | `object` | `synthesis cache refresh-reference-sidecar` | dangerous, mcp-mirror |
| `diagnostic.get_status` | diagnostic | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `debug.acpSkillRun.reapplyResult` | debug | `none` | `object` | `debug acp-skill-run reapply-result` | debug-only, mcp-mirror |
| `debug.persistence.snapshot` | debug | `none` | `object` | `debug persistence` | debug-only, mcp-mirror |
| `debug.skillrunner.connections.snapshot` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.status` | debug | `none` | `object` | `debug status` | debug-only, mcp-mirror |
| `debug.synthesis.cache.list` | debug | `none` | `object` | `debug synthesis cache` | debug-only, mcp-mirror |
| `debug.synthesis.cleanInstallReset` | debug | `zotero-ui-required` | `object` | `debug synthesis clean-install-reset` | debug-only, dangerous, mcp-mirror |
| `debug.synthesis.diff` | debug | `none` | `object` | `debug synthesis diff` | debug-only, mcp-mirror |
| `debug.synthesis.operations.list` | debug | `none` | `object` | `debug synthesis operations` | debug-only, mcp-mirror |
| `debug.synthesis.paper.inspect` | debug | `none` | `object` | `debug synthesis inspect-paper` | debug-only, mcp-mirror |
| `debug.synthesis.profiler.list` | debug | `none` | `object` | `debug synthesis profiler` | debug-only, mcp-mirror |
| `debug.synthesis.snapshot` | debug | `none` | `object` | `debug synthesis snapshot` | debug-only, mcp-mirror |
| `debug.synthesis.topic.inspect` | debug | `none` | `object` | `debug synthesis inspect-topic` | debug-only, mcp-mirror |
| `debug.tasks.snapshot` | debug | `none` | `object` | `debug tasks` | debug-only, mcp-mirror |
| `debug.zotero.eval` | debug | `zotero-ui-required` | `object` | `raw call only` | debug-only, dangerous, raw-only, mcp-mirror |
<!-- host-bridge-surface:wrapper-reference:end -->

## 远程导出包

- 使用远程 profile 时，带 `outputPath` 的 `synthesis topic get-context` 返回 `delivery.mode="bridge-download"` 而非写入调用者路径。运行 `delivery.downloadCommand`，然后运行 `delivery.unpackHint`。
- 使用远程 profile 时，`synthesis artifact export-filtered` 返回相同类型的 zip 包。将 `manifest_file` 视为解压后 zip 内的路径。

# Host Bridge 参考

此参考从 Host Bridge capability 注册表和 Rust CLI 映射生成。

<!-- zotero-librarian:host-bridge:start -->
## CLI Identity

此 profile surface 的预期 `zotero-bridge` CLI 版本：`0.3.0`。当加载的 profile 路径、命令帮助或 CLI 错误提示 surface 不匹配时，运行 `zotero-bridge --version`。

版本不匹配本身不是阻塞问题。当版本不同时，在执行该命令之前检查 `zotero-bridge <command> --help`；当规范命令或 argv 仍不确定时，使用离线的 `surface search` 或 `surface describe`。

运行 `zotero-bridge surface identity --json` 并将 CLI schema、构建 fingerprint 和命令 catalog 校验和与 profile release 信封进行比较。仅 SemVer 不是兼容性证据。

加载 `references/commands/` 下相关的生成卡片以进行面向任务的命令选择；仅在需要详尽目标检查时使用下表。

## CLI 命令

| 命令 | 目标 | 类型 |
| --- | --- | --- |
| `zotero-bridge bridge backend list` | GET /bridge/v1/diagnostics/backends | endpoint |
| `zotero-bridge bridge backend status` | GET /bridge/v1/diagnostics/backends/{backendId} | endpoint |
| `zotero-bridge bridge manifest` | GET /bridge/v1/manifest | endpoint |
| `zotero-bridge bridge profile diagnose` | GET /bridge/v1/diagnostics/profile/diagnose | endpoint |
| `zotero-bridge bridge profile inspect` | GET /bridge/v1/diagnostics/profile | endpoint |
| `zotero-bridge bridge status` | GET /bridge/v1/health | endpoint |
| `zotero-bridge context collection open` | POST /bridge/v1/context/collections/open | endpoint |
| `zotero-bridge context current` | GET /bridge/v1/context/current | endpoint |
| `zotero-bridge context current` | context.get_current_view | capability |
| `zotero-bridge context item open` | POST /bridge/v1/context/items/open | endpoint |
| `zotero-bridge context note open` | POST /bridge/v1/context/notes/open | endpoint |
| `zotero-bridge context selection get` | GET /bridge/v1/context/selection | endpoint |
| `zotero-bridge context selection get` | context.get_selected_items | capability |
| `zotero-bridge context selection open` | POST /bridge/v1/context/selection/open | endpoint |
| `zotero-bridge library annotation export` | library.export_annotations | capability |
| `zotero-bridge library annotation list` | library.list_annotations | capability |
| `zotero-bridge library item attachments` | library.get_item_attachments | capability |
| `zotero-bridge library item get` | library.get_item_detail | capability |
| `zotero-bridge library item notes` | library.get_item_notes | capability |
| `zotero-bridge library item search` | library.search_items | capability |
| `zotero-bridge library items list` | library.list_items | capability |
| `zotero-bridge library note get` | library.get_note_detail | capability |
| `zotero-bridge library note payload` | library.get_note_payload | capability |
| `zotero-bridge library note payloads` | library.list_note_payloads | capability |
| `zotero-bridge library readiness audit` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-analysis` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-markdown` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-pdf` | library.readiness_audit | capability |
| `zotero-bridge library snapshot` | library.sync_snapshot | capability |
| `zotero-bridge synthesis artifact export-filtered` | paper_artifacts.export_filtered | capability |
| `zotero-bridge synthesis artifact manifest` | paper_artifacts.get_manifest | capability |
| `zotero-bridge synthesis artifact read` | paper_artifacts.read | capability |
| `zotero-bridge synthesis artifact resolve-topic-digest` | paper_artifacts.resolve_topic_digest | capability |
| `zotero-bridge synthesis cache invalidate` | POST /bridge/v1/synthesis/cache/invalidate | endpoint |
| `zotero-bridge synthesis cache refresh-reference-sidecar` | reference_sidecar.refresh | capability; approval required |
| `zotero-bridge synthesis cache status` | GET /bridge/v1/synthesis/cache/status | endpoint |
| `zotero-bridge synthesis cache status` | synthesis.operation.get | capability |
| `zotero-bridge synthesis concept query` | concepts.query | capability |
| `zotero-bridge synthesis graph get-layout` | citation_graph.get_layout | capability |
| `zotero-bridge synthesis graph get-metrics` | citation_graph.get_metrics | capability |
| `zotero-bridge synthesis graph get-slice` | citation_graph.get_slice | capability |
| `zotero-bridge synthesis graph overview` | citation_graph.get_overview | capability |
| `zotero-bridge synthesis graph query-cluster` | citation_graph.query_cluster | capability |
| `zotero-bridge synthesis graph rank-external-references` | citation_graph.rank_external_references | capability |
| `zotero-bridge synthesis graph rank-library-papers` | citation_graph.rank_library_papers | capability |
| `zotero-bridge synthesis graph refresh-metrics` | citation_graph.refresh_metrics | capability; approval required |
| `zotero-bridge synthesis graph update` | citation_graph.update | capability; approval required |
| `zotero-bridge synthesis index library get` | library_index.get | capability |
| `zotero-bridge synthesis index reference get` | reference_index.get | capability |
| `zotero-bridge synthesis index status` | GET /bridge/v1/synthesis/index/status | endpoint |
| `zotero-bridge synthesis insight attention-queue` | insights.get_attention_queue | capability |
| `zotero-bridge synthesis resolver resolve` | resolvers.resolve | capability |
| `zotero-bridge synthesis schema get` | schemas.get | capability |
| `zotero-bridge synthesis topic find-by-paper-ref` | topics.find_by_paper_ref | capability |
| `zotero-bridge synthesis topic get-context` | topics.get_context | capability |
| `zotero-bridge synthesis topic get-report` | topics.get_report | capability |
| `zotero-bridge synthesis topic get-review-input` | topics.get_review_input | capability |
| `zotero-bridge synthesis topic list` | topics.list | capability |
| `zotero-bridge workflow agent-abandon` | POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon | endpoint |
| `zotero-bridge workflow agent-apply` | POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply | endpoint |
| `zotero-bridge workflow agent-apply-status` | GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply | endpoint |
| `zotero-bridge workflow agent-renew` | POST /bridge/v1/workflows/agent-runs/{agentRunId}/renew | endpoint |
| `zotero-bridge workflow agent-run` | POST /bridge/v1/workflows/agent-run | endpoint |
| `zotero-bridge workflow describe` | POST /bridge/v1/workflows/describe | endpoint |
| `zotero-bridge workflow list` | GET /bridge/v1/workflows | endpoint |
| `zotero-bridge workflow profile describe` | POST /bridge/v1/workflows/provider-profiles/describe | endpoint |
| `zotero-bridge workflow profile list` | GET /bridge/v1/workflows/provider-profiles | endpoint |
| `zotero-bridge workflow profile validate` | POST /bridge/v1/workflows/provider-profiles/validate | endpoint |
| `zotero-bridge workflow requirements` | POST /bridge/v1/workflows/requirements | endpoint |
| `zotero-bridge workflow submit` | POST /bridge/v1/workflows/submit | endpoint |
| `zotero-bridge workflow validate` | POST /bridge/v1/workflows/validate | endpoint |
| `zotero-bridge run active` | GET /bridge/v1/tasks/active | endpoint |
| `zotero-bridge run cancel` | POST /bridge/v1/workflows/runs/{workflowRunId}/cancel | endpoint |
| `zotero-bridge run get` | GET /bridge/v1/workflows/runs/{workflowRunId} | endpoint |
| `zotero-bridge run list` | GET /bridge/v1/tasks | endpoint |
| `zotero-bridge run notification ack` | POST /bridge/v1/notifications/ack | endpoint |
| `zotero-bridge run notification list` | GET /bridge/v1/notifications | endpoint |
| `zotero-bridge run notification wait` | GET /bridge/v1/notifications | endpoint |
| `zotero-bridge run permission get` | GET /bridge/v1/permissions/{permissionRequestId} | endpoint |
| `zotero-bridge run permission pending` | GET /bridge/v1/permissions/pending | endpoint |
| `zotero-bridge run recent` | GET /bridge/v1/tasks/recent | endpoint |
| `zotero-bridge run skill connect` | POST /bridge/v1/skill-runs/{skillRunId}/connect | endpoint |
| `zotero-bridge run skill events` | GET /bridge/v1/skill-runs/{skillRunId}/events | endpoint |
| `zotero-bridge run skill get` | GET /bridge/v1/skill-runs/{skillRunId} | endpoint |
| `zotero-bridge run skill recent` | GET /bridge/v1/skill-runs/recent | endpoint |
| `zotero-bridge run skill reply` | POST /bridge/v1/skill-runs/{skillRunId}/reply | endpoint |
| `zotero-bridge run workflow recent` | GET /bridge/v1/workflows/runs | endpoint |
| `zotero-bridge mutation apply` | mutation.execute | capability |
| `zotero-bridge mutation collection add-items` | mutation.execute | capability |
| `zotero-bridge mutation collection create` | mutation.execute | capability |
| `zotero-bridge mutation collection remove-items` | mutation.execute | capability |
| `zotero-bridge mutation item attach-file` | mutation.execute | capability |
| `zotero-bridge mutation item update` | mutation.execute | capability |
| `zotero-bridge mutation literature-ingest` | mutation.execute | capability |
| `zotero-bridge mutation note create` | mutation.execute | capability |
| `zotero-bridge mutation note update` | mutation.execute | capability |
| `zotero-bridge mutation note upsert-payload` | mutation.execute | capability |
| `zotero-bridge mutation preview` | mutation.preview | capability |
| `zotero-bridge mutation tag add` | mutation.execute | capability |
| `zotero-bridge mutation tag remove` | mutation.execute | capability |
| `zotero-bridge file download` | GET /bridge/v1/files/{fileId} | endpoint |
| `zotero-bridge file upload` | POST /bridge/v1/files/upload | endpoint |
| `zotero-bridge product download` | workflow_products.export | capability |
| `zotero-bridge product get` | workflow_products.get | capability |
| `zotero-bridge product list` | workflow_products.list | capability |
| `zotero-bridge product remove` | workflow_products.remove | capability |

## Library Capability

| Capability | 摘要 | CLI | Approval |
| --- | --- | --- | --- |
| `library.export_annotations` | 将一个 Zotero 条目的阅读器 annotation 导出为 Markdown 或 JSON。 | zotero-bridge library annotation export | none |
| `library.get_item_attachments` | 返回子附件元数据，并在可用时提供 broker 签发的下载 handle。 | zotero-bridge library item attachments | none |
| `library.get_item_detail` | 返回一个 Zotero 条目的详细 JSON 安全元数据。 | zotero-bridge library item get | none |
| `library.get_item_notes` | 返回一个 Zotero 条目的有界子笔记摘要。 | zotero-bridge library item notes | none |
| `library.get_note_detail` | 分块读取一个 Zotero 笔记正文。 | zotero-bridge library note get | none |
| `library.get_note_payload` | 从一个 Zotero 笔记中解码一个 workflow payload。 | zotero-bridge library note payload | none |
| `library.list_annotations` | 当 Zotero 运行时暴露 annotation 时，列出一个 Zotero 条目的阅读器 annotation。 | zotero-bridge library annotation list | none |
| `library.list_items` | 列出紧凑的父级 Zotero 文献库条目摘要，支持有界分页和过滤。 | zotero-bridge library items list | none |
| `library.list_note_payloads` | 从嵌入附件和笔记 payload 块中列出 workflow 笔记 payload。 | zotero-bridge library note payloads | none |
| `library.readiness_audit` | 返回关于缺失 PDF、源 Markdown 和文献分析 artifact 的分页只读文献库 readiness。 | zotero-bridge library readiness audit, zotero-bridge library readiness missing-analysis, zotero-bridge library readiness missing-markdown, zotero-bridge library readiness missing-pdf | none |
| `library.search_items` | 按有界文本查询搜索常规 Zotero 文献库条目。 | zotero-bridge library item search | none |
| `library.sync_snapshot` | 返回分页的 Zotero 文献库元数据快照，供本地图书管理员索引使用。 | zotero-bridge library snapshot | none |

## Snapshot Payload

`zotero-bridge library snapshot --query <JSON_OR_FILE>` 映射到 `library.sync_snapshot`。

`zotero-bridge library items list --query <JSON_OR_FILE>` 映射到 `library.list_items`。

`zotero-bridge library readiness audit|missing-pdf|missing-markdown|missing-analysis --query <JSON_OR_FILE>` 映射到 `library.readiness_audit`。

输入字段：`libraryId`、`cursor`、`limit`、`collectionId`、`collectionKey`、`tag`、`itemType` 和 `query`。

Readiness 命令使用相同的过滤器加上 `checks` 和 `missingOnly`；在规划 PDF 获取、Markdown 转换或文献分析修复之前使用它们。

输出字段：`schema`、`generatedAt`、`snapshotId`、`items`、`nextCursor`、`hasMore`、`returned` 和 `totalScanned`。

每个条目包含 `libraryId`、`key`、`id`、`itemType`、`title`、`creators`、`year`、`date`、`publicationTitle`、`DOI`、`ISBN`、`ISSN`、`url`、`tags`、`collections`、`noteCount` 和 `attachmentCount`。
<!-- zotero-librarian:host-bridge:end -->

仅对诊断使用 `zotero-bridge call library.sync_snapshot --input <JSON_OR_FILE>`。优先使用 `zotero-bridge library snapshot`。

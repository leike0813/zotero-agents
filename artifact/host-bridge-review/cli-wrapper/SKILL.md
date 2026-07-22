---
name: zotero-bridge-cli
description: 当 Agent 需要通过 Zotero Bridge CLI 访问 Zotero 文献库或合成上下文、执行和监控 workflow、进行变更或文件回写、获取精确 surface 身份和命令合约，或执行结构化故障恢复时使用。
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

本 wrapper 负责 CLI 安装、连接、精确 surface 身份、语义命令合约、类型化 handle、输出解读和结构化故障恢复。如需有界的 Zotero 任务路由和证据交接，请使用 `zotero-library-agent` Skill。如需常驻索引、调度、监控和维护，请使用 Zotero Librarian profile。

## 操作原则

1. 优先选择能表达请求操作的最窄语义命令。仅在需要 raw-only capability 或明确的诊断调查时才使用 raw `call`。
2. 从有界读取开始。使用显式 limit，保留返回的不透明 cursor，请求图切片或指标分页，而不是假设一个响应就能容纳完整的文献库或图。
3. 将返回的标识符视为类型化 handle。绝不在 `workflowRunId`、`skillRunId`、`agentRunId`、`agentRequestId`、`permissionRequestId`、`eventId`、`fileId`、Product id 和 Zotero 对象引用之间互换。
4. 使用 `context` 检查或导航 Zotero 的可见状态。导航会改变可见目标或选择，不会变更文献库数据，也不代表授权写入。
5. 由外而内诊断：精确 surface → bridge 健康 → 连接 profile → backend 就绪 → workflow 需求 → 最后才用 debug 命令。
6. 写入前先读取目标。预览开放式变更，然后仅通过语义 mutation、workflow apply-back 或其他 Host 管理的 approval 路径执行。
7. 在发出运行控制命令之前，先确定 workflow 执行由 Host Bridge 负责还是由调用 Agent 负责交接。
8. 将权限可见性视为只读。`run permission` 可解释待处理状态，但不能批准或拒绝请求。
9. 保留足以复现结论的证据：稳定的 Zotero 引用、运行 handle、artifact id、输出路径、校验和以及相关结构化 receipt。

## 连接

- 优先使用当前工作区提供的本地运行 shim。
- 保留 `ZOTERO_BRIDGE_PROFILE`、`ZOTERO_BRIDGE_ENDPOINT` 和 `ZOTERO_BRIDGE_TOKEN`；绝不打印 token 值。
- 仅在本地运行 shim 和 PATH 命令均不可用时，才使用内置安装器。
- 在诊断认证 profile 或 backend 状态之前，先检查 `bridge status`。
- 在重试 profile 敏感或 backend 敏感的操作之前，使用 `bridge profile inspect`、`bridge profile diagnose` 和 `bridge backend ...`。

## 验证精确 Surface

无需连接 Zotero 即可运行 `zotero-bridge surface identity --json`。对比预期的 CLI 版本、CLI schema、构建 fingerprint 和命令目录校验和。生成的发布指南说明了如何在版本不同时进行探索，而不是将版本字符串本身视为硬性阻断。

使用 `zotero-bridge surface describe <command> --json` 获取 argv、approval、类型化 handle、可重试性、状态变更和恢复元数据。当规范命令未知时，使用 `zotero-bridge surface search --intent <intent> --json`。

## Provider 运行时 Profile

`--profile` 和 `ZOTERO_BRIDGE_PROFILE` 选择 Host Bridge 连接 profile；它们不选择 workflow provider 运行时。workflow 声明 provider 需求，而 workflow 无关的 provider profile 选择具体的 `backendId` 及其非敏感 `providerOptions`。需单独发现和验证这些合约。仅 `workflow submit` 同时接受两者。

对于合约允许工具权限自动化的 ACP workflow，调用 Agent 可以提交：

```bash
zotero-bridge workflow profile describe --backend <backendId>
zotero-bridge workflow profile validate --provider-profile '{"backendId":"<backendId>","providerOptions":{}}'
zotero-bridge workflow submit ... --provider-profile '{"backendId":"<backendId>","providerOptions":{}}'
```

`autoApproveAcpPermissions` 仅适用于该次提交的 ACP 运行。它不授予 Zotero 写入 approval，不配置 `autoApproveZoteroWrites`，不在 Host Bridge 中持久化，也不批准 `run permission` 显示的待处理请求。

## Workflow 所有权

- 使用 `workflow describe`、`workflow requirements` 和 `workflow validate` 获取 workflow 管理的选择、选项、用途、provider 需求和执行模式。使用 `workflow profile list|describe|validate` 获取 backend 管理的 provider 选项。`ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` 可在 submit/validate 没有显式 profile 时提供内联 JSON 或 `@` 加绝对 profile 路径。
- 当 Host Bridge 应执行 workflow 并返回 `workflowRunId` 时，使用 `workflow submit`。通过 `run get`、`run active`、历史、通知或 skill-run 事件进行监控。
- 当调用 Agent 应执行已准备好的请求时，使用 `workflow agent-run`。将其 `agentRunId` 视为 apply-back session handle，完成每个 `agentRequestId` 合约，然后使用 `workflow agent-apply` 提交完成的包。
- 不要对 `agentRunId` 使用运行控制面命令。这些命令控制 Host 管理的 workflow 和 skill 运行。
- 将 `currentSkillRunId` 仅用于显示和决策支持。回复、连接和事件命令需要为当前任务显式返回的 `skillRunId`。
- 使用稳定的通知 `client-id`，确认已处理的事件，并记住通知和 skill-run 事件是生命周期事实，而非 transcript 或隐藏交互通道。

## 文件与远程交付

- 将 Host Bridge 文件视为已注册的 handle。使用 `file download` 下载出站 `fileId`；在使用 `mutation item attach-file` 附加之前，先上传本地 artifact。
- 不要将 Agent 本地路径作为 Zotero 附件路径传递。当需要精确的 artifact 身份时，保留返回的校验和和字节数。
- 对于远程交付，遵循返回的交付模式和下载命令。信封中的 Host 本地路径不能作为调用 Agent 可以读取该文件的证据。

## 控制不变量

在使用 handle、approval、文件传输、workflow 或回写之前，阅读 `references/control-invariants.md`。不要在 `workflowRunId`、`skillRunId`、`agentRunId`、`agentRequestId`、`fileId` 和 Zotero 对象引用之间互换。

## 输出与故障

stdout 是一个 JSON 信封。失败时，在重试之前使用 `retryable`、`stateChanged`、`handleConsumed`、`safeNextActions` 和 `nextCommand`。当 apply-back 状态不确定时，查询 `workflow agent-apply-status <agentRunId>`；绝不仅从错误消息推断安全性。

- 仅当 `retryable` 为 true 且当前状态仍允许时才重试同一命令。
- 如果 `stateChanged` 为 true，在决定是否需要再次写入之前查询相关当前状态。
- 如果 `handleConsumed` 为 true，不要复用该 handle。
- 当运行等待用户输入时，找到其显式 `skillRunId`，仅在操作允许时使用 `run skill reply`。
- 当失败的 skill run 提供恢复选项时，仅对返回的 `skillRunId` 和允许的操作使用 `run skill connect`。
- 如果 mutation 或 apply 命令被拒绝或无效，报告结构化代码和安全的下一步操作；不要通过 raw `call` 重试写入。

## 职责边界

Agent 负责意图路由、语义命令选择、证据解读、approval 感知决策和恢复判断。仓库渲染器负责确定性版本插入、命令卡片、schema、复制引用和包布局。不要手动编辑生成的命令清单或机器可读的发布 artifact。

<!-- host-bridge-surface:wrapper-skill:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### CLI release check

- Expected `zotero-bridge` CLI version for this generated surface: `0.3.0`.
- Run `<zotero-bridge> --version` when the loaded skill path, command help, or a CLI error suggests that the active command surface may differ.
- Version mismatch alone is not a blocker. When versions differ, inspect `<zotero-bridge> <command> --help` before executing that command; use offline `surface search` or `surface describe` when the canonical command or argv remains uncertain.
- Run `<zotero-bridge> surface identity --json` before relying on a loaded command contract.
- Compare CLI schema, build fingerprint, and command catalog checksum with the release envelope shipped beside the current surface. SemVer alone is not compatibility evidence.
- Stop only when the required command is unavailable, its argv or control contract cannot be confirmed, or the observed approval, handle, state-change, or recovery semantics are incompatible. Recover with the wrapper, CLI shim, and release envelope from one release set.

### Command families

- Prefer semantic CLI command families: bridge (backend list, backend status, manifest, profile diagnose, profile inspect, status); library (annotation export, annotation list, item attachments, item get, item notes, item search, items list, note get, note payload, note payloads, readiness audit, readiness missing-analysis, readiness missing-markdown, readiness missing-pdf, snapshot); synthesis (artifact export-filtered, artifact manifest, artifact read, artifact resolve-topic-digest, cache invalidate, cache refresh-reference-sidecar, cache status, concept query, graph get-layout, graph get-metrics, graph get-slice, graph overview, graph query-cluster, graph rank-external-references, graph rank-library-papers, graph refresh-metrics, graph update, index library get, index reference get, index status, insight attention-queue, resolver resolve, schema get, topic find-by-paper-ref, topic get-context, topic get-report, topic get-review-input, topic list); workflow (agent-apply, agent-apply-status, agent-run, describe, list, profile describe, profile list, profile validate, requirements, submit, validate); run (active, cancel, get, list, notification ack, notification list, notification wait, permission get, permission pending, recent, skill connect, skill events, skill get, skill recent, skill reply, workflow recent); mutation (apply, collection add-items, collection create, collection remove-items, item attach-file, item update, literature-ingest, note create, note update, note upsert-payload, preview, tag add, tag remove); file (download, upload); call; context (collection open, current, item open, note open, selection get, selection open); product (download, get, list, remove).
- Current graph/insight commands: synthesis graph get-layout, synthesis graph get-metrics, synthesis graph get-slice, synthesis graph overview, synthesis graph query-cluster, synthesis graph rank-external-references, synthesis graph rank-library-papers, synthesis graph refresh-metrics, synthesis graph update, synthesis insight attention-queue.
- Use raw `call <capability>` only for raw-only capabilities or explicit diagnostics.
- MCP is not the default fallback; MCP tools mirror Host Bridge capability names when explicitly used.
- Load only the relevant generated card under `references/commands/`; use `references/host-bridge-cli.md` for exhaustive capability diagnostics.

### Topic context payloads

- `synthesis topic get-context` accepts `view` values `digest`, `semantic`, `audit`, and `full` through `--query` JSON.
- Omit `view` only when the flat topic context response is required.
- For large `semantic` or `full` topic contexts, pass `outputPath` or `output_path` and optional `overwrite`; stdout then contains only a compact file envelope.
- Example: `zotero-bridge synthesis topic get-context --query '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'`.

### Large response pagination

- Treat `response:paged` capabilities as one-page reads. Iterate the returned cursor metadata instead of assuming one call returns the whole collection.
- `synthesis graph overview` returns summary plus paged `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges`. Use `cursor`/`limit` for all sections together or section cursors such as `nodeCursor`, `edgeCursor`, `hoverNodeCursor`, and `hoverEdgeCursor`.
- Use `synthesis graph get-slice`, `synthesis graph get-layout`, or `synthesis graph get-metrics` when the task needs a coherent bounded subgraph, layout, or ranked metric page instead of the entire citation graph.
- `synthesis topic list`, `synthesis index library get`, graph metrics, and graph rankings are paged reads. Do not build workflows that rely on stdout containing every topic, index row, graph node, edge, or rank item in one response.

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

### Runtime control payloads

- Use `run get <workflowRunId>` for workflow-level runtime status and known skill run projections.
- Use `run active` for the lightweight global active-task list; it excludes transcripts, local paths, and provider-private payloads.
- Use `run cancel <workflowRunId>` for workflow-level cancellation intent; cancellation does not imply immediate terminal state.
- Use `run skill get|reply|connect <skillRunId>` for explicit skill run interactions. Do not infer a skill run target from a workflow run id.
<!-- host-bridge-surface:wrapper-skill:end -->

## 参考文档

- `references/identity-and-connection.md`：在安装、profile 选择、身份对比或连接诊断之前阅读。
- `references/invocation-and-json-input.md`：在构造 `--query`、`--input`、stdin、文件、分页或输出路径参数之前阅读。
- `references/commands/connectivity-context.md`：surface 发现、bridge 诊断、当前上下文和导航。
- `references/commands/library-items.md`：文献库搜索、确定性条目列表、条目详情、笔记和附件。
- `references/commands/library-notes-attachments-readiness.md`：笔记 payload、标注、就绪审计和快照分页。
- `references/commands/workflows-and-runs.md`：workflow 选择、提交、Agent 交接、apply-back、监控、交互或权限检查之前阅读。
- `references/commands/mutations-files-products.md`：mutation 预览/应用、语义写入、文件传输或 Product 操作之前阅读。
- `references/commands/synthesis-topics-artifacts.md`：主题、论文 artifact、Concept KB 和 schema 查询。
- `references/commands/synthesis-graph.md`：图概览、切片、布局、指标、聚类、排名和指标刷新。
- `references/commands/synthesis-index-resolver-insight.md`：索引、resolver 选择器、关注队列和缓存维护。
- `references/commands/diagnostics.md`：仅在常规 bridge/profile/backend 诊断无法解释问题时阅读。
- `references/output-and-recovery.md`：任何失败、不确定写入、部分 apply-back、分页中断或文件交付问题之后阅读。
- `references/host-bridge-cli.md`：完整的生成命令和 capability 诊断。
- `references/control-invariants.md`：共享协议级安全事实。
- `references/agent-guidance.md`：详细的命令选择、就绪检查、分页、回写、workflow 所有权、通知、运行交互、维护和证据处理。
- `references/terminology.md`：共享 handle 和 Host Bridge 术语。


# Agent 指南

在选择 Host Bridge CLI 命令、规划有界操作序列或从结构化故障中恢复时，使用本参考。配合 `commands/` 下的一份生成命令手册使用；仅在需要完整目标检查时使用 `host-bridge-cli.md`。

当任务使用可能含糊的简写、artifact 名称、图术语、运行 handle 或回写术语时，先阅读 `terminology.md`。

## CLI 发布检查

优先使用本地运行 shim（如果存在）。当加载的 skill 路径不确定、命令帮助与本参考不匹配或 CLI 错误提示命令形态不同时，运行 `<zotero-bridge> --version`。

版本不匹配本身不是阻断条件。当版本不同时，在执行命令之前检查 `<zotero-bridge> <command> --help`。当命令可用性、argv、approval、handle、效果或恢复仍不确定时，使用离线 `surface search --intent <intent> --json` 或 `surface describe <command> --json`。运行 `surface identity --json` 将完整的 CLI schema、构建 fingerprint 和命令目录校验和与当前发布信封进行对比。

仅在所需命令缺失、接受的 argv 无法确认或观察到的 approval、handle、状态变更或恢复合约与请求操作不兼容时才停止。

## 命令选择

- 使用 `surface` 进行离线身份和命令合约发现。
- 使用 `bridge` 检查 Host Bridge 可用性、检查 manifest 和活跃连接 profile，以及诊断 backend 就绪状态。
- 使用 `context` 检查活跃 Zotero 视图或选择，并导航到已知的 Zotero 对象。
- 使用 `library` 读取当前 Zotero 对象：条目、笔记、标注、附件、就绪状态和有界快照。
- 使用 `synthesis` 获取派生的研究上下文：主题、概念、图、索引、resolver、artifact、洞察和 schema。
- 使用 `product` 获取已完成的 Dashboard workflow 输出。Product 不是 Synthesis 论文 artifact、文件 handle 或运行 handle。
- 使用 `workflow` 检查 workflow 定义、验证输入、提交 Host 管理的 workflow、准备 Agent 管理的交接，以及应用已完成的交接结果。
- 使用 `run` 检查或取消 Host 管理的 workflow、跟踪通知、检查权限等待，以及与显式 skill run 交互。
- 使用 `mutation` 进行可预览、approval 感知的写入：标签、集合、条目字段、笔记和附件。
- 使用 `file` 下载 Host Bridge 文件 handle 或将本地 artifact 上传到短期 Host Bridge handle。
- 仅在任务为诊断性质或所需 capability 没有语义命令时，才使用 `debug` 和 raw `call`。

## JSON 参数意图

默认使用内联 JSON。语义读取使用 `--query`；workflow 提交、mutation 和其他请求 payload 使用 `--input`。仅在该来源确实是有意选择时，才使用 stdin、`@file` 或裸 JSON 文件路径。

使用 `library item search --query '{"text":"...","limit":10}'` 进行有限候选发现。使用 `library items list --query '{"query":"...","limit":50,"collectionKey":"..."}'` 进行分页清单读取。不要用一条命令替代另一条。

不要通过 `call` 绕过语义命令的参数验证。Raw `call` 仅限于 raw-only capability 或有界的诊断调查。

## 诊断与就绪

在提交工作之前，如果失败可能由环境、连接 profile、backend 或 workflow 合约引起，使用诊断：

```text
zotero-bridge bridge profile inspect
zotero-bridge bridge profile diagnose
zotero-bridge bridge backend list
zotero-bridge bridge backend status <backendId>
zotero-bridge workflow requirements --workflow <workflowId>
zotero-bridge workflow validate --workflow <workflowId> --selection <JSON_OR_FILE>
zotero-bridge workflow profile list
zotero-bridge workflow profile describe --backend <backendId>
zotero-bridge workflow profile validate --provider-profile <JSON_OR_FILE>
```

诊断是为 Agent 决策提供的轻量级投影。不得将其视为 token、私有 backend payload、完整本地路径、transcript 或不受限 backend 错误文本的来源。

如果诊断指向权限等待，检查它但不要试图从 CLI 做出决定：

```text
zotero-bridge run permission pending
zotero-bridge run permission get <permissionRequestId>
```

权限命令是只读的。它们解释什么在等待以及哪个 workflow 或 skill run 拥有它；它们不批准或拒绝请求。

## 文献库就绪

在规划缺失源文件或生成的文献 artifact 的补救批次之前，使用就绪命令：

```text
zotero-bridge library readiness missing-pdf --query '{"limit":100}'
zotero-bridge library readiness missing-markdown --query '{"collectionKey":"COLL","limit":100}'
zotero-bridge library readiness missing-analysis --query '{"tag":"to-review","limit":100}'
```

就绪是只读的。它不检索 PDF、不转换 Markdown、不运行文献分析、不写入笔记。`missing-markdown` 遵循 Zotero Artifacts 源 Markdown 规则：`.md` 或 `.markdown` 附件与所选 PDF 的文件名片段共享。`missing-analysis` 需要同一列使用的 digest、references 和 citation-analysis artifact 标记。

## 大响应分页

将文献库、主题、索引、排名和图的集合结果视为分页。当结果大小可能随文献库增长时，始终传递显式 `limit`。首页省略 cursor，然后在 `hasMore` 为 true 时传递精确返回的不透明 `nextCursor`；绝不构造或递增 cursor。

`synthesis graph overview` 返回摘要计数加上分别分页的 `nodes`、`edges`、`hover_only_nodes` 和 `hover_only_edges`。独立推进时使用分区 cursor。当任务需要一致的有界邻域、布局或排名指标分页时，优先使用 `synthesis graph get-slice`、`get-layout` 或 `get-metrics`。

## Zotero UI 上下文

当任务锚定在用户正在查看或选择的内容时，使用上下文读取：

```text
zotero-bridge context current
zotero-bridge context selection get
```

仅使用 Zotero 或 Host Bridge 返回的 Zotero 对象 handle 进行导航：

```text
zotero-bridge context item open <itemRef>
zotero-bridge context note open <noteRef>
zotero-bridge context collection open <collectionKey> --library-id <libraryId>
zotero-bridge context selection open <itemRef...>
```

导航改变可见的 Zotero 目标或选择。它不是文献库 mutation，不授权写入，也不应接收文件路径、Web URL、任意 JavaScript 或推断的对象标识符。

## 安全回写

写入前读取目标对象。应用开放式编辑前先预览：

```text
zotero-bridge mutation preview --input <JSON_OR_FILE>
zotero-bridge mutation apply --input <JSON_OR_FILE>
```

当写入已经明确时，使用对应的语义 mutation：

```text
zotero-bridge mutation tag add --items <itemRef> --tags <tag>
zotero-bridge mutation item update --item <itemRef> --patch <JSON_OR_FILE>
zotero-bridge mutation note create --item <itemRef> --input <JSON_OR_FILE>
zotero-bridge mutation note update --note <noteRef> --input <JSON_OR_FILE>
zotero-bridge mutation collection add-items --collection <collectionRef> --items <itemRef...>
```

所有 mutation 写入都使用 Host Bridge approval 和稳定的 Zotero 对象引用。不要对有语义 mutation 命令的写入使用 raw `call`，也不要将本地路径、URL、JavaScript 或推断的标识符作为 mutation 目标。

## 标注读取

标注在 CLI surface 中是只读的：

```text
zotero-bridge library annotation list --item <itemRef>
zotero-bridge library annotation export --item <itemRef> --format markdown
```

当下游任务需要引用的高亮或评论时，使用标注导出。它不创建或修改标注。

## 文件回写

使用 Host Bridge 文件 handle 在 Agent 文件系统和 Zotero 之间传递 artifact。使用 `file download` 下载出站 handle。附加前先上传本地 artifact：

```text
zotero-bridge file upload <path> --display-name digest.md --content-type text/markdown
zotero-bridge mutation item attach-file --item <itemRef> --file <fileId>
```

返回的 `fileId` 是不透明的、短期的，可能被附件消费。当需要精确的 artifact 身份时，保留校验和和字节数。本地路径、已注册的 `fileId`、Product asset 和 Zotero 附件记录是不同的对象。

## Dashboard Product

使用 `product list --limit <n>` 和返回的 cursor 元数据进行有界的 Product 清单读取。当知道来源运行时，按 workflow、backend 或请求 id 过滤。`product download <productId> --output-dir <dir>` 下载所有 asset；添加 `--asset <assetId>` 下载单个 asset，`--force` 仅在有意替换时使用。遵循返回的远程交付信封，而不是假设 Host 本地路径可读。

`product remove <productId>` 通过 Zotero approval 移除 Dashboard Product 记录。它不意味着立即删除受管理的 asset 字节。不要用 raw `call` 重试 approval 拒绝。

## 请求级 Provider Profile

仅在调用者或 `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` 提供 workflow 无关的 backend profile 时使用 `--provider-profile`。它选择已配置的 backend 和非敏感 provider 选项；不选择或修改 Host Bridge 连接 profile。Workflow describe 和 validate 会拒绝它。Profile describe/validate 不接受 workflow id，提交是唯一的兼容连接点。

使用 `synthesis cache refresh-reference-sidecar` 和 `synthesis graph update` 作为独立的 approval 管理操作。保留每个返回的操作 id，使用 `synthesis cache status --operation-id` 轮询，并在需要强制执行新鲜度时将已提交的 sidecar basis hash 传递给图更新。

对于合约允许的 ACP workflow，`{"providerOptions":{"autoApproveAcpPermissions":true}}` 为该次提交的运行自动化 ACP backend 工具权限请求。它不批准 Zotero 写入，也不决定 `run permission` 暴露的待处理请求。

## Workflow 执行选择

当 Host Bridge 应运行 workflow 时，选择 `workflow submit`。结果是 `workflowRunId`；通过 `run get`、`run active`、历史、通知或 skill-run 事件进行监控。

当 workflow 将执行委托给调用 Agent 时，选择 `workflow agent-run`。结果是 `agentRunId` 和一个或多个已准备好的请求，每个请求都有 `agentRequestId`、输入合约、输出合约和结果包规则。

仅在已完成的 Agent 管理结果满足请求合约后才应用：

```text
zotero-bridge workflow agent-apply <agentRunId> --result <agentRequestId>=<bundlePath>
```

不要对 `agentRunId` 使用运行控制面命令；这些命令适用于 Host 管理的 workflow 和 skill 运行。如果 apply-back 状态不确定，在决定下一个操作是否安全之前查询 `workflow agent-apply-status <agentRunId>`。

## 通知收件箱

使用通知收件箱实现回调式进度，无需长时间运行的监视流：

```text
zotero-bridge run notification list --client-id <agentId> --workflow-run-id <workflowRunId>
zotero-bridge run notification wait --client-id <agentId> --workflow-run-id <workflowRunId> --since-event-id <eventId>
zotero-bridge run notification ack --client-id <agentId> --event <eventId>
```

通知是轻量级的生命周期事实。它们可以报告已启动、等待、完成、取消、失败和可恢复失败状态，但它们不是 transcript，也不暴露工作区路径或 provider 私有 payload。为每个 Agent 或服务使用稳定的 client id。确认已处理的事件，以便后续检查可以专注于新工作。

## 运行历史与事件

当需要确定任务是活跃、完成还是失败而不读取 transcript 时，使用有界历史和事件：

```text
zotero-bridge run recent --limit 10
zotero-bridge run workflow recent --workflow <workflowId> --limit 10
zotero-bridge run skill recent --state waiting_user --limit 10
zotero-bridge run skill events <skillRunId> --limit 20
```

Skill-run 事件是生命周期和进度事实，不是监视流、cursor transcript 或隐藏续传通道。

## 交互式运行

Workflow 状态可能暴露 `currentSkillRunId` 用于显示和决策支持。交互命令仍需为当前任务显式返回的 `skillRunId`。

```text
zotero-bridge run skill reply <skillRunId> --message "..."
zotero-bridge run skill connect <skillRunId>
```

仅在 skill run 等待用户输入时使用 reply。仅在失败的运行可恢复且返回的操作允许时使用 connect。否则报告结构化错误，而不是猜测另一个 handle。

## Synthesis 维护

仅在明确的诊断或修复时使用维护命令：

```text
zotero-bridge synthesis cache status
zotero-bridge synthesis index status
zotero-bridge synthesis cache invalidate --scope <topic|graph|index> --id <optional-id>
```

缓存和索引状态是只读的。缓存失效是 approval 管理的，仅接受受支持的范围；它不是数据库、文件系统、JavaScript 或表重置通道。仅将 `synthesis graph refresh-metrics` 用于引用图指标修复。

## 结构化故障恢复

将 JSON 错误信封视为权威来源：

- 仅在 `retryable` 为 true 时重试。
- 如果 `stateChanged` 为 true，在发出另一次写入之前检查当前状态。
- 如果 `handleConsumed` 为 true，不要复用该 handle。
- 选择合适的 `safeNextActions` 条目，优先使用提供的 `nextCommand`。
- 在解决部分 apply-back、分页中断、文件验证或不确定的 mutation 状态时，保留原始 handle 和 receipt。
- 如果安全操作需要用户 approval、缺失权限或新的输入选择，停止并报告该边界。

## 证据与 Artifact

对于文献库和合成任务，在任务结果中保留 Zotero 条目 key、主题 id、workflow 和 skill-run handle、Product 或 artifact id、导出的文件 handle、已验证的本地路径、校验和以及相关 receipt。在解释结果的推导方式时，优先使用当前的结构化命令输出，而非记忆。


# Host Bridge 控制不变量

在每个 Host Bridge Agent 面向的 surface 中使用这些协议级规则。

## Handle

- 将 Zotero 对象引用、主题 ID、Product ID、文件 ID、workflow ID、`workflowRunId`、`skillRunId`、`agentRunId` 和 `agentRequestId` 视为不透明的类型化 handle。
- 使用 `workflowRunId` 获取 Host 管理的 workflow 状态和取消。
- 使用显式 `skillRunId` 进行 skill-run 回复、重连和 skill 事件读取。
- 仅将 `agentRunId` 用作 Agent 管理工作的 apply-back session，与其声明的 `agentRequestId` 值配对。
- 绝不在一种 handle 类型和另一种之间替换，也不要通过解析显示文本来恢复缺失的 handle。

## 权限与 Approval

- 读取不授予写入权限。
- Provider 权限策略控制一次提交运行的 backend 工具权限；它不批准 Zotero 写入。
- Mutation 和 workflow apply-back 仍受 Host Bridge approval 和当前就绪检查约束。
- 被拒绝时停止。不要通过 raw 调用、直接存储访问或不同的命令族来绕过边界。

## Workflow 所有权

- `workflow submit` 启动 Host 管理的执行并返回 `workflowRunId`。
- `workflow agent-run` 准备本地交接并返回 `agentRunId` 加请求合约；它不启动 Host backend 运行。
- `workflow agent-apply` 通过已准备好的 `agentRunId` 合约应用已最终确定的 Agent 管理结果包。
- 在声明的边界验证选择、workflow 选项、provider profile、结果包和 apply 就绪状态，而不是假设之前的验证仍然有效。

## 文件与 Artifact

- 将 `fileId` 和代理下载 handle 视为不透明的、可能短期的。
- 当需要精确的 artifact 身份时，验证声明的大小或校验和。
- 在 Host mutation 中引用本地文件之前先上传；不要将任意本地路径作为 Zotero mutation 目标。
- 将生成的路径和证据位置视为定位器。稳定的引用和摘要在交接中承载身份。

## 隐私与输出

- 将凭证、授权头、完整 transcript、provider 私有 payload 和 Agent 私有状态排除在可移植证据之外。
- 优先使用结构化错误代码、类型化 handle、cursor 元数据和 artifact 摘要，而非复制的日志或推断的状态。
- 将缓存的、分页的或生成的数据视为性能或交接辅助，而非当前 Zotero 真实状态的数据源。


# Host Bridge CLI 参考

本参考从 Host Bridge surface 目录生成。编辑 Host Bridge capability 注册表或 Rust CLI 源码，然后运行 `npm run render:host-bridge-surface`。

发布的包包含 `install.ps1`、`install.sh` 和 `assets/profile.template.json`。在 Windows 上使用 `.\install.ps1 --yes --json`，在 POSIX 上使用 `./install.sh --yes --json` 来安装或升级，无需 Node 依赖。安装器自动检测平台，不接受平台覆盖。将模板复制到 Host Bridge 的知名 profile 位置，或设置 `ZOTERO_BRIDGE_PROFILE` 为其路径。在运行时使用 `ZOTERO_BRIDGE_ENDPOINT`、`ZOTERO_BRIDGE_TOKEN`、`ZOTERO_BRIDGE_SCOPE` 和 `ZOTERO_BRIDGE_CONNECTION_MODE=local|remote` 覆盖模板。`ZOTERO_BRIDGE_SCOPE` 可包含 `{"kind":"skillrunner-run","frontendScopeId":"..."}` 以使 Host Bridge 写入 approval 返回到 SkillRunner 面板。

## Resolver Payload

对于 resolver 命令，传递直接的 resolver 字段：`tag`、`collection_key`、`paper_refs`、可选的 `combine` 和可选的分页字段。不要将它们包装在顶层 `resolver` 对象中。`topic_resolver`、`mode`、`query`、`include` 和 `exclude` 是不受支持的字段，会被 `synthesis resolver resolve` 拒绝。

<!-- host-bridge-surface:wrapper-reference:start -->
This section is generated from the Host Bridge surface catalog.

### Runtime command entry

- Prefer the run-local shim when it exists: Windows `.\.zotero-bridge\bin\zotero-bridge.cmd`; POSIX `./.zotero-bridge/bin/zotero-bridge`.
- When skill instructions show `<zotero-bridge>`, replace it with the run-local shim for the current OS; use PATH command `zotero-bridge` only when the shim is absent.
- Keep `ZOTERO_BRIDGE_PROFILE` and `ZOTERO_BRIDGE_TOKEN` from the injected environment; never print token values.

### CLI release check

- Expected `zotero-bridge` CLI version for this generated surface: `0.3.0`.
- Run `<zotero-bridge> --version` when the loaded skill path, command help, or a CLI error suggests that the active command surface may differ.
- Version mismatch alone is not a blocker. When versions differ, inspect `<zotero-bridge> <command> --help` before executing that command; use offline `surface search` or `surface describe` when the canonical command or argv remains uncertain.
- Run `<zotero-bridge> surface identity --json` before relying on a loaded command contract.
- Compare CLI schema, build fingerprint, and command catalog checksum with the release envelope shipped beside the current surface. SemVer alone is not compatibility evidence.
- Stop only when the required command is unavailable, its argv or control contract cannot be confirmed, or the observed approval, handle, state-change, or recovery semantics are incompatible. Recover with the wrapper, CLI shim, and release envelope from one release set.

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
zotero-bridge call --help
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

### Library guidance

- Use inline JSON with `--query` by default. Use stdin, `@file`, or a bare JSON file path only when that source is intentional.
- Use `zotero-bridge library item search --query '{"text":"graph","limit":10}'` for finite candidate discovery.
- Use `zotero-bridge library items list --query '{"limit":50,"collectionKey":"COLL"}'` for bounded library inventory pages.
- Use `zotero-bridge library snapshot --query '{"limit":200}'` for the first local metadata index page.
- Use `zotero-bridge library readiness missing-pdf|missing-markdown|missing-analysis --query '{"limit":100}'` before scheduling PDF retrieval, Markdown conversion, or literature-analysis work.
- `library items list` accepts `collectionKey`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--query`.
- `library snapshot` accepts `collectionKey`, `collectionId`, `tag`, `itemType`, `query`, `cursor`, and `limit` in `--query`.
- `library readiness audit` accepts the same library filters plus `checks` and `missingOnly`; Markdown and analysis readiness reuse the Zotero Artifacts column rules.
- Omit `cursor` on the first library, snapshot, or readiness page. When `hasMore` is true, pass the exact returned opaque `nextCursor`; never construct or increment a cursor.

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

- 使用远程 profile 时，带 `outputPath` 的 `synthesis topic get-context` 返回 `delivery.mode="bridge-download"` 而不是写入调用者路径。运行 `delivery.downloadCommand`，然后运行 `delivery.unpackHint`。
- 使用远程 profile 时，`synthesis artifact export-filtered` 返回相同类型的 zip 包。将 `manifest_file` 视为解压后 zip 内的路径。

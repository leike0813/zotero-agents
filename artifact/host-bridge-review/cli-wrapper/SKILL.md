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
- 当 Host Bridge 应执行 workflow 并返回 `workflow submit` 时，使用 `workflowRunId`。通过 `run get`、`run active`、历史、通知或 skill-run 事件进行监控。
- 当调用 Agent 应执行已准备好的请求时，使用 `workflow agent-run`。将其 `agentRunId` 视为 apply-back session handle，完成每个 `agentRequestId` 合约，然后使用 `workflow agent-apply` 提交完成的包。
- 不要对 `agentRunId` 使用运行控制面命令。这些命令控制 Host 管理的 workflow 和 skill 运行。
- 将 `currentSkillRunId` 仅用于显示和决策支持。回复、连接和事件命令需要为当前任务显式返回的 `skillRunId`。
- 使用稳定的通知 `client-id`，确认已处理的事件，并记住通知和 skill-run 事件是生命周期事实，而非 transcript 或隐藏交互通道。

## 文件与远程交付

- 将 Host Bridge 文件视为已注册的 handle。使用 `fileId` 下载出站 `file download`；在使用 `mutation item attach-file` 附加之前，先上传本地 artifact。
- 不要将 Agent 本地路径作为 Zotero 附件路径传递。当需要精确的 artifact 身份时，保留返回的校验和和字节数。
- 对于远程交付，遵循返回的交付模式和下载命令。信封中的 Host 本地路径不能作为调用 Agent 可以读取该文件的证据。

## 控制不变量

在使用 handle、approval、文件传输、workflow 或回写之前，阅读 `references/control-invariants.md`。不要在 `workflowRunId`、`skillRunId`、`agentRunId`、`agentRequestId`、`fileId` 和 Zotero 对象引用之间互换。

## 输出与故障

stdout 是一个 JSON 信封。失败时，在重试前使用 `retryable`、`stateChange`、`handleConsumption`、`safeNextActions` 和 `nextCommand`。状态变更请求丢失响应时查询 `operation get <operationId>`；apply-back 状态不确定时也查询 `workflow agent-apply-status <agentRunId>`。绝不只根据错误消息推断安全性。

- 仅当 `retryable` 为 true 且当前状态仍允许时才重试同一命令。
- 如果 `stateChange` 为 `changed` 或 `unknown`，在决定是否需要再次写入前查询相关当前状态。
- 如果 `handleConsumption` 为 `consumed` 或 `unknown`，在 receipt 证明可安全复用前不要复用该 handle。
- 当运行等待用户输入时，找到其显式 `skillRunId`，仅在操作允许时使用 `run skill reply`。
- 当失败的 skill run 提供恢复选项时，仅对返回的 `run skill connect` 和允许的操作使用 `skillRunId`。
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
- `references/commands/synthesis-index-resolver-insights.md`：索引、resolver 选择器、关注队列和缓存维护。
- `references/commands/diagnostics.md`：仅在常规 bridge/profile/backend 诊断无法解释问题时阅读。
- `references/output-and-recovery.md`：任何失败、不确定写入、部分 apply-back、分页中断或文件交付问题之后阅读。
- `references/host-bridge-cli.md`：完整的生成命令和 capability 诊断。
- `references/control-invariants.md`：共享协议级安全事实。
- `references/agent-guidance.md`：详细的命令选择、就绪检查、分页、回写、workflow 所有权、通知、运行交互、维护和证据处理。
- `references/terminology.md`：共享 handle 和 Host Bridge 术语。

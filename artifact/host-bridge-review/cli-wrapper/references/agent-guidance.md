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

将文献库、主题、索引、排名和图的集合结果视为分页。当结果大小可能随文献库增长时，始终传递显式 `limit`。首页省略 cursor，然后在 `nextCursor` 为 true 时传递精确返回的不透明 `hasMore`；绝不构造或递增 cursor。

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

仅在调用者或 `--provider-profile` 提供 workflow 无关的 backend profile 时使用 `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`。它选择已配置的 backend 和非敏感 provider 选项；不选择或修改 Host Bridge 连接 profile。Workflow describe 和 validate 会拒绝它。Profile describe/validate 不接受 workflow id，提交是唯一的兼容连接点。

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
- 如果 `stateChange` 为 `changed` 或 `unknown`，在发出另一次写入之前检查持久化 operation receipt 和当前领域状态。
- 如果 `handleConsumption` 为 `consumed` 或 `unknown`，在领域 receipt 证明可安全复用之前，不要复用该 handle。
- 选择合适的 `safeNextActions` 条目，优先使用提供的 `nextCommand`。
- 在解决部分 apply-back、分页中断、文件验证或不确定的 mutation 状态时，保留原始 handle 和 receipt。
- 如果安全操作需要用户 approval、缺失权限或新的输入选择，停止并报告该边界。

## 证据与 Artifact

对于文献库和合成任务，在任务结果中保留 Zotero 条目 key、主题 id、workflow 和 skill-run handle、Product 或 artifact id、导出的文件 handle、已验证的本地路径、校验和以及相关 receipt。在解释结果的推导方式时，优先使用当前的结构化命令输出，而非记忆。

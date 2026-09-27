# 常驻操作

## 服务契约

每个驻留 operation 都运行 `scripts/zotero_librarian_service.py`。全局选项选择状态数据库（`--db`）、CLI 可执行文件（`--bridge`）或静默的 unchanged 输出（`--quiet`）。每次调用在需要时初始化本地 schema，执行一次有界遍历，输出一个 receipt，然后退出。

正常 JSON 形状是 `zotero-librarian.operation-receipt.v1`，含 `operation`、`status`、`generatedAt` 及可选的 `summary` 或 `data`。失败的遍历会添加 `error.code`、`error.message` 与可选的 `error.details`，打印 JSON 并以非零状态退出。`--quiet` 只把 `unchanged` receipt 渲染为 `[SILENT]`；changed、attention 与失败结果保持可见。

## Profile workspace 选择

服务在有界扫描前解析一个 profile workspace。Agent 与 cron 任务无需提供 workspace 路径：`--profile` 优先于 `ZOTERO_BRIDGE_PROFILE`，省略 profile 时使用平台熟知的连接 profile 及其默认 `$HERMES_HOME/zotero-librarian/state.sqlite`。显式 profile 路径会被规范化，并在 `workspaces/` 下分配到 SHA-256 workspace；服务对每次 bridge 调用都传入同一显式 profile，并优先使用该 workspace 的 `.zotero-bridge/bin` 可执行文件。

`--db` 仅允许指向所选 workspace 内部的路径。失败的 profile 查找、路径规范化、workspace 根检查、连接或包含检查均为失败即封闭（fail closed），返回失败的 receipt；它绝不会回退到另一 profile 的数据库。Profile identity 不读取 profile JSON，也不包含凭据。因此切换 profile 会把 catalog、index、被监视 run、notification 与本地 CLI 状态作为一个整体切换。

## 操作契约矩阵

| 命令 | 读取 | 本地影响 | Receipt 数据与含义 |
| --- | --- | --- | --- |
| `index refresh [--limit N] [--library-id ID]` | Zotero capability Broker 捕获的一个固定全库快照 | 逐页暂存代次，然后仅在终态证据验证后原子提升并移除先前行 | 计数 `added`、`updated`、`deleted`、`total` 及 `generationId` 与 `snapshotId`；仅对已提升的投影增量改变 |
| `index search <query> [--limit N]` | 本地标题与序列化 item 字段 | 除 schema 初始化外无 | `ok` 并带匹配的缓存 `items`；绝不暗示 Zotero 已变更 |
| `index item <key-or-id>` | 一个本地缓存 item | 无 | 带缓存 `ok` 的 `item`；缺失缓存条目为 `item_not_found` |
| `index stats` | 当前代次计数、刷新元数据与暂存计数 | 无 | `ok` 带 `itemCount`、`lastRefresh`、`currentGenerationId` 与 `stagingGenerationCount` |
| `workflow catalog-refresh` | 实时 workflow 列表与变更描述 | 原子 upsert 变更的目录条目 | `updated` 的定义数 |
| `workflow show <workflow-id>` | 一份缓存的 workflow 定义 | 无 | 带缓存 `ok` 的 `workflow`；执行前仍需实时 describe |
| `run register --run-id ID --workflow-id ID [--state S]` | 提供的标识符 | Upsert 一个被监视 run | 已注册的 `runId` |
| `run watch` | 每个非终态受监视 run 一次实时状态读取 | 更新已更改的 run 状态 | 当前 `runs`；无变化表示无转移 |
| `notification sync [--limit N]` | 一页有界的未确认事件 | Upsert notification projection | `inserted`、`updated` 与 `fetched` 计数 |
| `notification inbox [--limit N]` | 本地未确认事件 | 无 | 带有序 `ok` 的 `events` |
| `notification summary` | 本地未确认事件 | 无 | 按事件 `ok` 分组计数的 `type` |
| `notification ack --event ID [...]` | 实时确认结果 | 将命名的本地事件标记为已确认 | 已确认的 event ID |`acknowledged`
| `maintenance workflow-status` | 本地被监视 run | 无 | 非成功候选；存在时加 `attention` |
| `maintenance library-hygiene` | 本地重复标题组 | 无 | 重复标题候选；`attention` 是提案 |
| `synthesis attention-queue` | 实时排序的 attention 队列 | 无 | 队列 `items`；绝不改变 synthesis 状态 |

只读查询返回 `ok`。`changed` 保留给本地投影/journal 更改或显式启动的远程操作。两种状态都不能独立证明当前 Zotero 状态。

## Index 与库问题

`index refresh` 打开由 Zotero capability Broker 捕获的一个固定快照，并将接受的页面写入一个暂存代。快照身份、库、范围、稳定顺序、批次序列、交付计数与终止完成证据必须保持一致。只有该确切快照的终止证据才允许一次提升事务将暂存代变为当前代，并移除完整集合中不存在的行。分页、解析、过期、重启、证据、暂存写入或提升失败会使上一代保持可读；后续的遍历将开启新快照，而不是续接不完整的那个。

已完成的空快照是空当前 generation 的有效证据。活动中的终态形状、本地计数的行、旧的 receipt 或缓存的 `snapshotId` 不是等效证据。Staging 状态在中断后仍可保留用于诊断，但 `index search`、`index item`、`index stats` 与库 hygiene 只读取当前 generation。

对缓存的标题、创建者、标识符、tags、collections、出版物字段与序列化 item 数据使用 `index search`。对已知 key 或数字 ID 使用 `index item`，用 `index stats` 判断投影大小与刷新时间。这些操作加速发现与排序；它们不能确立当前选择、attachment 访问、权限、workflow 模式、Product 存在性或写回状态。

对库问题，先在本地定位候选，然后调用继承的 Query Skill 与适合该声明的实时 CLI 读取。当缓存查询与刷新时间影响了发现时报告它们，并为回答引用实时 item keys 或其他当前 refs。若问题依赖比投影更新的更改，跳过本地确定性并立即执行实时读取。

## Workflow catalog 与 run 监督

Catalog 刷新列出当前 workflows，并仅为新增或变更的摘要 digest 获取描述。`workflow show` 是快速的本地发现；执行仍需实时 workflow 描述、当前执行模式、输入校验以及 Generic 拥有的任何 provider-profile 校验。

交互式提交不是常驻 service operation。Generic 与捆绑的 CLI 读取实时的 workflow 选择契约，分别保留 workflow 选项与 provider-profile 输入，验证完整请求，并提交一个经审查的范围。Host 规划仍负责候选生成、筛选与不可变 unit 分组。Zotero 插件的原生队列是待处理 unit 与有界准入的唯一所有者。

直接准入返回真实的 `workflowRunId`。host 队列准入返回 `submissionId`、逐单元 `queueId` 值、计数与链接；检查该原生投影，直到已准入 tasks 暴露真实 run 身份。待处理队列取消与已准入 run 取消是两种独立的控制。在驻留服务之外创建的 run 可以用 `run register` 添加；只使用真实的 `workflowRunId` 及其 workflow ID。

`run watch` 每次检查一个本地注册的未终止 Zotero 管理 run。它记录转换，并自然地将终止状态排除在后续活动遍历之外。它不获取 transcripts、不解决权限决定、不执行自有的 handoffs、也不推断缺失的 Products 与 artifacts。交互使用实时 run/skill 命令，`agentRunId` 相关工作使用 Generic handoff 契约。

## 通知

通知同步读取一个受限的未确认事件页并 upsert 轻量事件 payload。收件箱与摘要读取本地投影。用通知检测 started、waiting、completed、failed、canceled 或可恢复的生命周期变化，无需长轮询。

行动前检查属主实时 workflow 或 skill run。事件文本不能识别 reply/connect 目标，除非实时 run 暴露相应的 `skillRunId`，它也绝不授予 approval 或 mutation 权限。仅在动作已处理后确认；失败的实时确认使本地事件留待后续审阅。

## 定时趟

该 profile 附带七个独立的 cron 任务：六小时 index 刷新、每日 workflow catalog 刷新、五分钟 run 观察、五分钟 notification 同步、每日 workflow-status 分流、每周库卫生维护与每日 Synthesis attention queue。每个都以 `--quiet` 调用 service、执行一遍，且不能提交或变更 Zotero。

独立的调度让一次失败不会掩盖另一领域的结果。`unchanged` 变为 `[SILENT]`；变化的本地投影、attention 候选或失败仍可报告。Triage、hygiene 与 attention 趟只提出审阅工作。任何后续的 acquisition、curation、workflow 提交、apply-back 或 maintenance 操作都需要新的交互式任务及其自身权限。

## 完成证据与失败

对于常驻报告，保留 operation receipt、相关刷新时间、item key、workflow/run/event ID、变更计数、attention 原因，以及用户结论中使用的任何实时确认。当评审候选与下一个安全检查清晰时，`attention` 即完成；它不是已完成的补救。

在 CLI 或解析失败时，service 发出稳定错误并保留已提交状态。不要用部分页替换投影，也不要在没有有效结果的情况下推进 notification/run 结论。对于不确定的直接提交，在再次调用前检查近期的实时 run。对于不确定的排队提交，在再次调用前检查原始原生提交与按提交筛选的任务。对于本地查找失败，只刷新所需的投影并重试一次有界 operation。

## 详细操作卡片

在 Librarian `SKILL.md` 选定常驻操作后使用这些卡片。它们描述服务行为与 receipt 解读；确切的 Zotero CLI 机制仍在内置 CLI Skill 中。

### `index refresh`

用途：

- 为变更检测与重复发现构建完整的常驻投影。

之前：

- 确认预期的库连接以及当前缓存是否可用。
- 选择 1 到 1,000 之间的批大小；默认为 500，更改它不会放宽一百万个 item 的快照上限或 30 分钟 Host session 生存期。

命令：

```sh
scripts/zotero_librarian_service.py index refresh --library-id 1 --limit 500
```

回执：

- 当行被添加、更新或移除时为 `changed`。
- 完成快照与投影匹配时 `unchanged`。
- 仅提升后数据才报告 `added`、`updated`、`deleted`、`total`、`generationId` 与 `snapshotId`。
- 完整的空快照可能对每个先前行报告 `deleted` 且 `total: 0`。

下一步：

- 对外部可见的当前事实使用实时 Query 读取。
- 失败时，保留上一个当前 generation 与原始失败；不要提升或手工合并 staging 行。
- 当 Host session 过期、重启或拒绝延续时，开始一次新的完整刷新。

### `index search`

用途：

- 从标题与序列化字段快速发现缓存候选 items。

命令：

```sh
scripts/zotero_librarian_service.py index search "<query>" --limit 25
```

回执：

- 零个或多个缓存 `ok` 时为 `items`。
- 结果是候选，并携带 projection 的新鲜度限制。

下一步：

- 通过 Generic Query 与实时 Zotero 读取解析相关候选。
- 不要仅凭 cache 断言不存在或当前状态。

### `index item`

用途：

- 在发现或变更比较期间，按 key 或数字 ID 检查一个缓存的 item。

命令：

```sh
scripts/zotero_librarian_service.py index item <key-or-id>
```

回执：

- `ok` 带一个缓存的 `item`。
- 无行匹配时返回带 `failed` 的 `item_not_found`。

下一步：

- 在当前回答或写入前，用稳定 ref 做实时读取。

### `index stats`

用途：

- 检查投影大小与最后一次成功刷新。

命令：

```sh
scripts/zotero_librarian_service.py index stats
```

回执：

- `ok` 带 `itemCount`、`lastRefresh`、`currentGenerationId` 与 `stagingGenerationCount`。

下一步：

- 当计划的发现依赖较新的变更时刷新。
- 近期时间戳不证明单个对象未变更。

### `workflow catalog-refresh`

用途：

- 维护当前 workflow 定义的本地发现缓存。

命令：

```sh
scripts/zotero_librarian_service.py workflow catalog-refresh
```

回执：

- 缓存定义改变时 `changed` 带更新计数。
- 未检测到 catalog delta 时为 `unchanged`。

下一步：

- 规划执行前使用实时 workflow list/describe。

### `workflow show`

用途：

- 检查一个缓存的 workflow 候选，而不声称当前可用。

命令：

```sh
scripts/zotero_librarian_service.py workflow show <workflow-id>
```

回执：

- `ok` 带缓存 `workflow`。
- 缺失时以 `failed` 返回 `workflow_not_found`。

下一步：

- 将结果选择委托给 Generic 并确认实时描述。

### 交互式原生 workflow handoff

用途：

- 验证并呈现一个可审查的 Zotero 受管理请求，而不创建常驻队列状态。

命令：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

之前：

- 确认该 workflow 是正确的 Generic task 候选。
- 确保当前选择是实时候选生成契约的预期原始输入。
- 将必需选项、provider profiles、无选择与自有模式保持在它们声明的 Generic 与 CLI 契约内。
- 实时描述需要 provider profile 时独立验证它。
- 考虑 provider 限制、成本、单元独立性、交互与 apply-back 时长后选择有限的并发边界。

证据：

- 实时 workflow identity 与执行模式。
- 确切选择 refs 与单独的 `inputs` 和 `validateSelection` 契约。
- 已审阅的 workflow 选项与独立验证的 provider-profile 输入。
- Host 候选生成与不可变分组行为。
- 预期单元数量或形状、结果身份，以及所选原生准入边界。

下一步：

- 呈现完整当前范围而不持久化 approval 标志。
- 为该确切 workflow、选择、options、provider 与并发请求当前授权。

### 原生队列提交与监督

用途：

- 提交一个已审查请求并用类型化 handles 监督直接或原生队列准入。

命令：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

之前：

- 确认当前指令授权确切的选择、options、provider profile 与并发。
- 记住 Zotero 侧 approval 仍然是分开的。
- 重新校验任何新鲜度影响调用的实时契约事实。

准入结果：

- 直接准入暴露真实 task 与 `workflowRunId`。
- Host-queue 接纳暴露 `submissionId`、聚合计数、queue 链接与不可变 unit projection。
- 排队响应有意省略待处理 unit 的虚构 run handle。
- 结构化失败保留状态变更与安全下一步事实。

下一步：

- 检查 `workflow submission get <submissionId>` 获取聚合与逐单元状态。
- 使用 `workflow queue list` 观察活动队列。
- 仅在 unit 处于待处理时使用 `workflow queue cancel <queueId>`。
- 通过 `run list --submission <submissionId>` 关联已准入任务。
- 仅当常驻一次性监控有用时，注册真实的已接纳 `workflowRunId`。
- 准入后用 run 平面交互或取消。
- 单独核实每个期望 Product、artifact 或 Zotero 变更。
- 不要重放不确定的提交，也不要实现常驻预留循环。
- 另一次提交需要新的当前指令。

### `run register`

用途：

- 添加在此 helper 之外创建的已知 Zotero 托管 workflow run。

命令：

```sh
scripts/zotero_librarian_service.py run register \
  --run-id <workflowRunId> --workflow-id <workflow-id> \
  --state running
```

之前：

- 通过实时 workflow 结果验证类型化句柄。
- 绝不注册 `agentRunId`。

回执：

- 带注册 run ID 的 `changed`。

下一步：

- 使用一次性 `run watch`。

### `run watch`

用途：

- 逐个读取每个已注册的非终态 run 并记录转换。

命令：

```sh
scripts/zotero_librarian_service.py run watch
```

回执：

- 至少一个状态转换时 `changed`。
- 无转换时 `unchanged`。
- 数据列出当前已检查的 run 状态。

下一步：

- 使用实时 run/skill 命令进行交互与输出检查。
- 终止状态不是 Product、artifact 或写入验证。

### `notification sync`

用途：

- 把一页有界的未确认生命周期事件取入本地收件箱。

命令：

```sh
scripts/zotero_librarian_service.py notification sync --limit 100
```

回执：

- 事件被插入或更新时为 `changed`。
- 获取页无 delta 时 `unchanged`。

下一步：

- 行动前检查属主实时 run。

### `notification inbox`

用途：

- 读取按更新时间排序的本地未确认事件。

命令：

```sh
scripts/zotero_librarian_service.py notification inbox --limit 25
```

回执：

- `ok` 带 `events`。

下一步：

- 实时解析当前 run、skill、权限或输出状态。

### `notification summary`

用途：

- 按类型统计本地未确认事件以形成紧凑报告。

命令：

```sh
scripts/zotero_librarian_service.py notification summary
```

回执：

- 带分组计数的 `ok`。

下一步：

- 不要仅从事件类型推断严重性或所需动作。

### `notification ack`

用途：

- 在其关联操作已处理后确认命名事件。

命令：

```sh
scripts/zotero_librarian_service.py notification ack \
  --event <event-id>
```

之前：

- 检查实时属主状态。
- 在当前权限下完成或有意驳回所需的后续动作。

回执：

- 带已确认 IDs 的 `changed`。

失败：

- 当实时确认失败时，保持本地事件未确认。

### `maintenance workflow-status`

用途：

- 报告状态仍待审阅的被 watch runs。

命令：

```sh
scripts/zotero_librarian_service.py maintenance workflow-status
```

回执：

- 带 run 候选的 `attention`。
- 无需要审阅时 `unchanged`。

下一步：

- 检查实时 run；不要自动重试或取消。

### `maintenance library-hygiene`

用途：

- 将重复标题组报告为可能的重复候选。

命令：

```sh
scripts/zotero_librarian_service.py maintenance library-hygiene
```

回执：

- 带候选组的 `attention`。
- 未找到时 `unchanged`。

下一步：

- 调用 Generic Curation 做 identity 分析与可审阅提案。
- 重复标题绝不是破坏性权限。

### `synthesis attention-queue`

用途：

- 读取实时排序的 Synthesis attention 队列，不改变派生状态。

命令：

```sh
scripts/zotero_librarian_service.py synthesis attention-queue
```

回执：

- `attention` 带队列 items。
- 队列为空时 `unchanged`。

下一步：

- 把解读委托给 Generic Synthesis。
- 单独诊断每个 maintenance 动作。

## 库问题流程

对于“我的库里有什么？”或“什么变了？”：

1. 检查 index stats。
2. 为所请求的比较需要时刷新。
3. 在投影中搜索候选。
4. 将有界问题委托给 Generic Query。
5. 实时确认相关事实。
6. 返回 Generic 业务结果加常驻刷新/变更证据。

对否定回答，缓存搜索不够。Generic Query 拥有完整的实时分页与证据边界。

对 run 或 workflow 问题，本地 cache 只用于发现。读取实时 workflow/run 并核实所请求的输出。

## 计划化遍的解释

每个随附 cron 用 `--quiet` 恰好调用一个操作。

- `[SILENT]` 表示操作返回 `unchanged`。
- JSON `changed` 表示本地投影/日志已变，不一定是 Zotero 变了。
- JSON `attention` 表示存在审查候选。
- JSON `failed` 表示该趟未完成。
- JSON `ok` 通常是交互式读取输出，不应被误认为 delta。

不要将多个 cron 域合并进一次隐藏的遍。独立的 receipts 使失败、attention 与恢复可归属于单一状态所有者。

## 操作级恢复示例

Index 刷新在第四页失败：

- 先前投影仍可用；
- 不推进刷新时间；
- 保留不完整的暂存代次作为非权威诊断状态；
- 启动新的有界全快照而非恢复进程本地会话；
- 不要手动合并三页，也不要从其本地计数推断缺失行的删除。

Workflow 验证会过期：

- 在提交调用前停止；
- 重新读取实时 workflow 与选择；
- 重新验证选项与 provider profile；
- 不要把缓存的校验当作当前权限。

Queued 提交响应不确定：

- 保留 `submissionId` 与任何返回的 `queueId` 值；
- 检查原始提交投影与按 submission 筛选的任务；
- 有用时将已接纳的真实 run 与被监视状态对账；
- 不要自动重放选择或构建替代的常驻批次。

Notification 确认失败：

- 保持本地事件可见；
- 重新检查属主动作；
- 仅当事件仍存在且该操作仍被处理时才重试确认。

卫生候选是误报：

- 记录实时区别；
- 让 Zotero 保持不变；
- 没有独立规则时，不要抑制所有未来的重复标题候选。

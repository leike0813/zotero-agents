# 常驻操作

## 服务契约

对每一次常驻操作都运行 `scripts/zotero_librarian_service.py`。全局选项用于选择状态数据库（`--db`）、CLI 可执行文件（`--bridge`）或静默 unchanged 输出（`--quiet`）。每次调用会在需要时初始化本地模式，执行一次有界扫描，发出一份回执，然后退出。

正常的 JSON 形态为 `zotero-librarian.operation-receipt.v1`，包含 `operation`、`status`、`generatedAt`，以及可选的 `summary` 或 `data`。失败的扫描附加 `error.code`、`error.message` 与可选的 `error.details`，打印 JSON 并以非零退出。`--quiet` 仅把 `unchanged` 回执渲染为 `[SILENT]`；changed、attention 与 failed 结果仍保持可见。

## 配置工作区选择

服务在有界扫描前解析一份配置工作区。智能体与 cron 任务无需提供工作区路径：`--profile` 优先于 `ZOTERO_BRIDGE_PROFILE`，未提供配置时使用平台熟知的连接配置及其默认的 `$HERMES_HOME/zotero-librarian/state.sqlite`。显式配置路径会被规范化，并分配到 `workspaces/` 之下的 SHA-256 工作区；服务把同一显式配置传递给每个 bridge 调用，并优先使用该工作区的 `.zotero-bridge/bin` 可执行文件。

`--db` 仅在其解析后的路径位于所选工作区内时可用。配置查找、路径规范化、工作区根检查、连接或包含检查失败时将失败关闭并返回失败回执；它绝不回退到其他配置的数据库。配置身份不读取配置 JSON，也不包含凭据。因此切换配置会一并切换目录、索引、被关注的运行、通知以及本地 CLI 状态。

## 操作契约矩阵

| 命令 | 读取 | 本地效果 | 回执数据与含义 |
| --- | --- | --- | --- |
| `index refresh [--limit N] [--library-id ID]` | 由 Zotero 能力 Broker 捕获的一次固定全库快照 | 按页暂存一个代次，仅在终态证据通过校验后原子地提升并移除先前行 | 计数 `added`、`updated`、`deleted`、`total`，加 `generationId` 与 `snapshotId`；仅在提升的投影差异上发生变化 |
| `index search <query> [--limit N]` | 本地标题与序列化条目字段 | 仅初始化模式 | `ok` 并返回匹配的缓存 `items`；绝不意味着 Zotero 已改变 |
| `index item <key-or-id>` | 一条本地缓存条目 | 无 | `ok` 并返回缓存的 `item`；缺少缓存条目时返回 `item_not_found` |
| `index stats` | 当前代次计数、刷新元数据与暂存计数 | 无 | `ok` 并返回 `itemCount`、`lastRefresh`、`currentGenerationId` 与 `stagingGenerationCount` |
| `workflow catalog-refresh` | 实时工作流列表与变更后的描述 | 原子地上传/更新发生变更的目录条目 | 已 `updated` 的定义数量 |
| `workflow show <workflow-id>` | 一条缓存的工作流定义 | 无 | `ok` 并返回缓存的 `workflow`；执行前仍需进行实时 describe |
| `run register --run-id ID --workflow-id ID [--state S]` | 提供的标识 | 上传/更新一条被关注的运行 | 已注册的 `runId` |
| `run watch` | 对每个非终态被关注的运行进行一次实时状态读取 | 更新已变更的运行状态 | 当前 `runs`；unchanged 表示无状态变更 |
| `notification sync [--limit N]` | 一页有界的未确认事件 | 上传/更新通知投影 | `inserted`、`updated` 与 `fetched` 计数 |
| `notification inbox [--limit N]` | 本地未确认事件 | 无 | `ok` 并返回有序的 `events` |
| `notification summary` | 本地未确认事件 | 无 | `ok` 并返回按事件 `type` 分组的计数 |
| `notification ack --event ID [...]` | 实时确认结果 | 将指定的本地事件标记为已确认 | 已 `acknowledged` 的事件 ID |
| `maintenance workflow-status` | 本地被关注的运行 | 无 | 非成功候选；存在时为 `attention` |
| `maintenance library-hygiene` | 本地重复标题分组 | 无 | 重复标题候选；`attention` 是提案 |
| `synthesis attention-queue` | 实时排序的关注队列 | 无 | 队列 `items`；从不改变 synthesis 状态 |

只读查询返回 `ok`。`changed` 保留用于本地投影/日志变更或显式启动的远端操作。两者都不单独证明当前 Zotero 状态。

## 索引与文献库问答

`index refresh` 开启一次由 Zotero 能力 Broker 捕获的固定快照，并把接受的页面写入暂存代次。快照标识、文献库、范围、稳定顺序、批序、交付计数与终态完成证据必须保持一致。仅对那次完全相同快照的终态证据才允许一次提升事务将暂存代次设为当前，并移除完整集合中不存在的行。分页、解析、过期、重启、证据、暂存写入或提升失败会让先前代次保持可读；随后的扫描将开启新的快照，而不是恢复不完整的快照。

已完成的空快照是空当前代次的有效证据。活跃的终态形态、本地计数的行、旧的回执或缓存的 `snapshotId` 并非等效证据。中断后暂存状态仍可保留用于诊断，但 `index search`、`index item`、`index stats` 与文献库整洁度仅读取当前代次。

在缓存的标题、创作者、标识符、标签、集合、出版字段以及序列化条目数据上使用 `index search`。对已知键或数字 ID 使用 `index item`，对投影规模与刷新时间使用 `index stats`。这些操作加速发现与排序；它们不能确立当前选择、附件访问、权限、工作流模式、产物存在或回写状态。

对于文献库问答，请先在本地定位候选，再调用继承自查询 Skill 的方法与合适的实时 CLI 读取。当缓存查询与刷新时间影响了发现时，请将其汇报，并就答案引用实时条目键或其他当前引用。若问题依赖于晚于投影的变更，请放弃本地确定性，立即执行实时读取。

## 工作流目录与运行监督

目录刷新列出当前工作流，并仅为新增或变更的摘要摘要获取描述。`workflow show` 是快速的本地发现；执行仍需实时工作流描述、当前执行模式、输入校验，以及通用拥有的任何提供方配置校验。

交互式提交不是常驻服务操作。通用与随附 CLI 读取实时工作流选择契约，分别保留工作流选项与提供方配置输入，校验完整请求，并提交一次已审阅范围。宿主规划仍负责候选生成、过滤与不可变单元分组。Zotero 插件的原生队列是待处理单元与有界接纳的唯一所有者。

直接接纳返回真实的 `workflowRunId`。宿主队列接纳返回 `submissionId`、每单元 `queueId`、计数与链接；在已接纳任务暴露真实运行标识前持续检视该原生投影。待处理队列取消与已接纳运行取消是相互独立的控制。在常驻服务之外创建的运行可通过 `run register` 添加；仅使用真实的 `workflowRunId` 及其工作流 ID。

`run watch` 对每个本地注册的非终态 Zotero 托管运行检查一次。它记录状态变更，并自然地把终态排除在后续活跃扫描之外。它不获取转录、解析权限决策、执行自有交接，也不推断缺失的产物与制品。使用实时 run/skill 命令进行交互，使用通用交接契约处理 `agentRunId` 工作。

## 通知

通知同步读取一页有界的未确认事件，并上传/更新轻量级事件载荷。Inbox 与 summary 读取本地投影。使用通知来检测已开始、等待中、已完成、已失败、已取消或可恢复的生命周期变更，无需长时间轮询。

在动作前，检视所属的实时工作流或 skill 运行。除非实时运行暴露相应的 `skillRunId`，否则事件文本不会标识回复/连接目标；它也绝不授予审批或变更授权。仅在动作已处理后予以确认；实时确认失败时，本地事件将保留以供后续审阅。

## 定时扫描

配置随附七项独立 cron 任务：六小时索引刷新、每日工作流目录刷新、五分钟运行监控、五分钟通知同步、每日工作流状态分诊、每周文献库整洁度以及每日 Synthesis 关注队列。每一项都使用 `--quiet` 调用服务，执行一次扫描，且无法提交或变更 Zotero。

独立时刻表确保一次失败不会掩盖其他域的结果。`unchanged` 变为 `[SILENT]`；本地投影变更、关注候选或失败仍可汇报。分诊、整洁度与关注扫描仅作为审阅工作的提案。任何后续采集、策展、工作流提交、回写或维护操作都需要新的交互式任务及其独立授权。

## 完成证据与失败

对于常驻汇报，请保留操作回执、相关刷新时间、条目键、工作流/运行/事件 ID、变更计数、关注原因以及面向用户结论中所用的任何实时确认。`attention` 在审阅候选与下一步安全检查清晰时即视为完成；它并非已完成的修复。

在 CLI 或解析失败时，服务发出稳定的错误并保留已提交状态。切勿用部分页面替换投影，也不要在缺少有效结果的情况下推进通知/运行的结论。对于不确定的直接提交，请在另一次调用前检视实时近期运行。对于不确定的排队提交，请在另一次调用前检视原始原生提交与按提交过滤的任务。对于本地查询失败，仅刷新所需的投影并重试一次有界操作。

## 详细操作卡

在 Librarian `SKILL.md` 已选定一项常驻操作后使用这些卡。它们描述服务行为与回执解读；精确的 Zotero CLI 机制仍归随附的 CLI Skill。

### `index refresh`

目的：

- 构建完整的常驻投影以支持变更检测与重复发现。

之前：

- 确认预期的文献库连接以及当前缓存是否可用；
- 在 1 到 1,000 之间选择批大小；默认 500，更改它不会放宽一百万条目快照上限或 30 分钟宿主会话生命期。

命令：

```sh
scripts/zotero_librarian_service.py index refresh --library-id 1 --limit 500
```

回执：

- 当行被添加、更新或移除时为 `changed`；
- 当完成快照与投影匹配时为 `unchanged`；
- 仅在提升之后，数据才上报 `added`、`updated`、`deleted`、`total`、`generationId` 与 `snapshotId`；
- 一次完整的空快照可以上报每个先前行被 `deleted` 且 `total: 0`。

之后：

- 对外部可见的当前事实使用实时 Query 读取；
- 失败时保留先前的当前代次与原始失败；不要提升或手动合并暂存行；
- 当宿主会话过期、重启或拒绝继续时，开启一次新的全量刷新。

### `index search`

目的：

- 快速从标题与序列化字段中发现缓存的候选条目。

命令：

```sh
scripts/zotero_librarian_service.py index search "<query>" --limit 25
```

回执：

- `ok` 并返回零个或多个缓存 `items`；
- 结果是候选，并带有投影的新鲜度上限。

之后：

- 通过通用 Query 与实时 Zotero 读取解析相关候选；
- 切勿仅凭缓存断言不存在或当前状态。

### `index item`

目的：

- 在发现或变更对比过程中，按键或数字 ID 检视一条缓存条目。

命令：

```sh
scripts/zotero_librarian_service.py index item <key-or-id>
```

回执：

- `ok` 并返回一条缓存的 `item`；
- 无匹配行时 `failed` 并返回 `item_not_found`。

之后：

- 在当前答复或写入前，使用稳定引用进行实时读取。

### `index stats`

目的：

- 检视投影规模与最近一次成功刷新。

命令：

```sh
scripts/zotero_librarian_service.py index stats
```

回执：

- `ok` 并返回 `itemCount`、`lastRefresh`、`currentGenerationId` 与 `stagingGenerationCount`。

之后：

- 当计划中的发现依赖更新的变更时进行刷新；
- 最近的时间戳并不证明单个对象未发生变化。

### `workflow catalog-refresh`

目的：

- 维护当前工作流定义的本地发现缓存。

命令：

```sh
scripts/zotero_librarian_service.py workflow catalog-refresh
```

回执：

- 当缓存定义发生变更时为 `changed` 并附更新计数；
- 未检测到目录差异时为 `unchanged`。

之后：

- 在规划执行前使用实时工作流 list/describe。

### `workflow show`

目的：

- 在不主张当前可用性的前提下检视一条缓存的工作流候选。

命令：

```sh
scripts/zotero_librarian_service.py workflow show <workflow-id>
```

回执：

- `ok` 并返回缓存的 `workflow`；
- 缺失时 `failed` 并返回 `workflow_not_found`。

之后：

- 把结果选择委托给通用，并确认实时描述。

### 交互式原生工作流交接

目的：

- 在不创建常驻队列状态的前提下，校验并展示一次可被审阅的 Zotero 托管请求。

命令：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

之前：

- 确认工作流是通用任务的正确候选；
- 确保当前选择是实时候选生成契约的预期原始输入；
- 将必需选项、提供方配置、无选择与自有模式保留在其声明的通用与 CLI 契约内；
- 在实时描述要求时独立校验提供方配置；
- 在考虑提供方限制、成本、单元独立性、交互与回写时长后选择一个有限并发上限。

证据：

- 实时工作流身份与执行模式；
- 精确的选择引用与独立的 `inputs` 与 `validateSelection` 契约；
- 已审阅的工作流选项与独立校验的提供方配置输入；
- 宿主候选生成与不可变分组行为；
- 期望的单元计数或形态、结果标识以及所选原生接纳上限。

之后：

- 在不持久化审批标记的前提下展示完整的当前范围；
- 为该精确的工作流、选择、选项、提供方与并发请求当前授权。

### 原生队列提交与监督

目的：

- 提交一次已审阅请求，并以类型化句柄监督直接或原生队列接纳。

命令：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

之前：

- 确认当前指令已授权精确的选择、选项、提供方配置与并发；
- 牢记 Zotero 侧审批仍是独立的；
- 对影响本次调用的实时契约事实进行重新校验。

接纳结果：

- 直接接纳暴露真实任务与 `workflowRunId`；
- 宿主队列接纳暴露 `submissionId`、聚合计数、队列链接与不可变单元投影；
- 已排队响应会刻意省略待处理单元的虚构运行句柄；
- 结构化失败保留状态变更与安全下一步动作事实。

之后：

- 使用 `workflow submission get <submissionId>` 检视聚合与单元状态；
- 使用 `workflow queue list` 进行活跃队列观察；
- 仅在单元仍处于待处理时使用 `workflow queue cancel <queueId>`；
- 通过 `run list --submission <submissionId>` 关联已接纳任务；
- 仅在常驻一次性监控有用时注册一条真实的已接纳 `workflowRunId`；
- 在接纳后使用运行平面交互或取消；
- 单独核实每个期望的产物、制品或 Zotero 变更；
- 不要重放不确定的提交，也不要实现常驻预留循环；
- 另一次提交需要新的当前指令。

### `run register`

目的：

- 添加在常驻服务之外创建的已知 Zotero 托管工作流运行。

命令：

```sh
scripts/zotero_librarian_service.py run register \
  --run-id <workflowRunId> --workflow-id <workflow-id> \
  --state running
```

之前：

- 通过实时工作流结果验证类型化句柄；
- 切勿注册 `agentRunId`。

回执：

- `changed` 并附已注册的运行 ID。

之后：

- 使用一次性 `run watch`。

### `run watch`

目的：

- 对每个已注册的非终态运行读取一次并记录状态变更。

命令：

```sh
scripts/zotero_librarian_service.py run watch
```

回执：

- 至少一个状态发生变更时为 `changed`；
- 无变更时为 `unchanged`；
- 数据列出当前已检查的运行状态。

之后：

- 使用实时 run/skill 命令进行交互与产出检视；
- 终态并非产物、制品或写入的核实。

### `notification sync`

目的：

- 把一页有界的未确认生命周期事件取至本地收件箱。

命令：

```sh
scripts/zotero_librarian_service.py notification sync --limit 100
```

回执：

- 当事件被插入或更新时为 `changed`；
- 当所取页面无新增差异时为 `unchanged`。

之后：

- 在动作前检视所属的实时运行。

### `notification inbox`

目的：

- 按更新时间排序读取本地未确认事件。

命令：

```sh
scripts/zotero_librarian_service.py notification inbox --limit 25
```

回执：

- `ok` 并返回 `events`。

之后：

- 实时解析当前运行、skill、权限或输出状态。

### `notification summary`

目的：

- 按类型统计本地未确认事件以形成紧凑报告。

命令：

```sh
scripts/zotero_librarian_service.py notification summary
```

回执：

- `ok` 并返回分组的计数。

之后：

- 切勿仅凭事件类型推断严重程度或所需动作。

### `notification ack`

目的：

- 在其关联动作已处理后确认命名事件。

命令：

```sh
scripts/zotero_librarian_service.py notification ack \
  --event <event-id>
```

之前：

- 检视实时所属状态；
- 在当前授权下完成或刻意驳回所需的后续动作。

回执：

- `changed` 并附已确认的 ID。

失败：

- 当实时确认失败时，保留本地事件为未确认。

### `maintenance workflow-status`

目的：

- 汇报其状态仍需审阅被关注运行。

命令：

```sh
scripts/zotero_librarian_service.py maintenance workflow-status
```

回执：

- 存在运行候选时为 `attention`；
- 无需审阅时为 `unchanged`。

之后：

- 检视实时运行；切勿自动重试或取消。

### `maintenance library-hygiene`

目的：

- 把重复标题分组作为可能的重复项候选汇报。

命令：

```sh
scripts/zotero_librarian_service.py maintenance library-hygiene
```

回执：

- 存在候选分组时为 `attention`；
- 未发现时为 `unchanged`。

之后：

- 调用通用 Curation 进行身份分析与可审阅的提案；
- 重复标题永远不是破坏性授权。

### `synthesis attention-queue`

目的：

- 读取实时排序的 Synthesis 关注队列，且不修改派生状态。

命令：

```sh
scripts/zotero_librarian_service.py synthesis attention-queue
```

回执：

- 存在队列项时为 `attention`；
- 队列为空时为 `unchanged`。

之后：

- 把解读委托给通用 Synthesis；
- 单独诊断任何维护动作。

## 文献库问答流程

对于"我的文献库里有什么？"或"发生了什么变化？"：

1. 检视 index stats；
2. 在需要所请求的对比时进行刷新；
3. 在投影中搜索候选；
4. 把有限问题委托给通用 Query；
5. 实时确认相关事实；
6. 返回通用业务结果加上常驻刷新/变更证据。

对于否定性回答，缓存搜索并不充分。通用 Query 拥有完整的实时分页与证据边界。

对于关于运行或工作流的问题，本地缓存仅用于发现。读取实时工作流/运行并核实所请求的输出。

## 定时扫描解读

每个随附 cron 调用恰好一个带有 `--quiet` 的操作。

- `[SILENT]` 表示该操作返回了 `unchanged`；
- JSON `changed` 表示本地投影/日志发生了变化，不一定是 Zotero；
- JSON `attention` 表示存在审阅候选；
- JSON `failed` 表示本次扫描未完成；
- JSON `ok` 通常是交互式只读输出，不应被视为差异。

切勿把多个 cron 域合并成一次隐藏扫描。独立的回执使失败、关注项与恢复可归属于单一状态所有者。

## 操作级恢复示例

索引刷新在第四页失败：

- 先前投影仍可用；
- 不要推进刷新时间；
- 把不完整的暂存代次保留为非权威的诊断状态；
- 开启一次新的有界全量快照，而非恢复进程本地的会话；
- 切勿手动合并三页，也不要从它们的本地计数推断缺失行被删除。

工作流校验过期：

- 在提交调用前停止；
- 重新读取实时工作流与选择；
- 重新校验选项与提供方配置；
- 切勿把缓存的校验当作当前授权复用。

排队提交响应不确定：

- 保留 `submissionId` 与任何已返回的 `queueId`；
- 检视原始提交投影与按提交过滤的任务；
- 在有用时把已接纳的真实运行与被关注状态相关联；
- 不要重放选择，也不要自动构建替换的常驻批次。

通知确认失败：

- 保留本地事件可见；
- 重新检查所属动作；
- 仅在事件仍然存在且动作仍处于已处理状态时重试确认。

整洁度候选是误报：

- 记录实时区分；
- 保持 Zotero 不变；
- 在没有独立规则的情况下，不要抑制所有未来的重复标题候选。

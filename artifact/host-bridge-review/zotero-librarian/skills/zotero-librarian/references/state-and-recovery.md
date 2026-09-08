# 状态与恢复

## 状态所有权与 schema

`scripts/zotero_librarian_service.py` 独占创建与更新 `state.sqlite`。活动 schema 标记是 `zotero-librarian.state.v4`。其拥有的数据包括：

- 元数据含最后一次成功的 index refresh；
- current 与 staging 库 index generation，item 行按 generation、library ID 与 item key 键控；
- 按 workflow ID 键控的缓存 workflow 定义；
- 按 `workflowRunId` 监控被 watch 的 Zotero 托管 runs；
- 按 event ID 键控的轻量级 notifications；

任何 Skill、cron 文件、shell 片段、外部辅助或手动 SQL 会话都不得创建表、更改 schema 或写入行。服务启用外键并以事务方式初始化 schema，使并发首次读取收敛到同一份有效数据库。

数据库是可重建的 cache 与日志。实时 Zotero 对 UI 上下文、库内容、workflow 定义、执行模式、run、permission、notification、Product、文件、操作与写入保持权威。

## Profile 本地状态边界

活动连接 profile 由服务 `--profile`、`ZOTERO_BRIDGE_PROFILE` 或平台 well-known profile 选择。well-known profile 是现有状态路径的默认所有者。每个显式的规范化 profile 路径拥有独立的 `workspaces/<sha256>/` 根，包括其 SQLite 数据库、workflow catalog、被监视 run、notification 与 `.zotero-bridge/bin`；没有任何 profile 内容或 token 参与该 identity。agent 无需手算此根。

仅当 `--db` 的解析路径位于所选根目录内部时，它才能指定诊断数据库。profile/路径/根/连接错误与 `workspace_path_outside_profile` 会在创建任何数据库之前停止本次执行，且没有共享目录回退。该路由既不改变 `state.v4` schema，也不改变要求实时 Zotero 事实、当前 approval、原生队列所有权与持久 receipt 的规则。

## 时效性与原子更新

每条缓存结论都携带相应刷新或更新时间。用 cache 做发现与变更检测；用实时读取获取外部可见的当前事实以及每个可导致写入或交互的决策。

索引刷新将每个被接受的快照页写入暂存代次，同时先前代次保持当前。服务跨快照身份、库、范围、稳定顺序、批次序列、已投递计数与终态证据验证一个不可变的 Host 基础。仅匹配的 `outcome: completed` 证据允许提升事务将暂存代次标记为当前、移除先前代次的行并记录刷新时间。

活动中的页、中断、过期、cursor 不匹配、资源限制、Host 重启、解析失败、写入失败或证据不匹配都不能晋升。不完整的 generation 保持非权威，先前的当前 generation 保持可读。随后的刷新会打开新的进程本地快照；它不会复用缓存的快照身份，也不会从暂存行数推断完成。已完成的空快照可能晋升一个空 generation，从而移除所有先前的 item 行。catalog 刷新同样只提交每个成功变更的描述，而不臆造定义。

Run watch 与 notification sync 只更新被接纳的实时结果。连接失败保留最后已知状态以供后续比较。不要抹除旧状态、不要从被拒数据推进 cursor，也不要在失败刷新后把缓存的 terminal/run/event 值描述为当前值。

## 恢复序列

1. 保留失败 receipt 的 operation、code、详情、输入路径或 handle，以及最后一个可用的本地状态。
2. 若 Zotero 状态可能已变化，在选择重试前检查受影响的实时对象、workflow/run、operation、apply receipt、Product、文件属主或 notification。
3. 对于本地损坏或数据库不可用，停止驻留 operations，并在实际可行时保留受损文件以供检查。
4. 只通过服务初始化新数据库；绝不手动修复表。
5. 刷新下一决策所需的最小投影：库 index、workflow catalog、被观察 run 的注册/状态或 notification 收件箱。
6. 重新运行一次有界 operation，并将其 receipt 与保留的失败比较。

重建本地状态不能重放丢失的 Zotero 写入，也不授权提交、mutation、事件确认或 apply-back。

## Handles 与不确定结果

将 Zotero 引用、`submissionId`、`queueId`、`workflowRunId`、`skillRunId`、`agentRunId`、`operationId`、`permissionRequestId`、`eventId`、`fileId` 与 Product ID 各自留在其所属领域。submission 标识一个被接纳的原生 admission 请求，queue ID 在 unit 处于待处理或被投影时标识一个 unit，workflow-run ID 标识已接纳的执行。本地行 identity 不是替代 handle。

对于不确定的直接 workflow 提交，在下一次调用前检查匹配的实时近期 run。对于不确定的原生排队提交，在再次提交前检查原始 `submissionId`、其不可变 unit、按 submission 过滤的任务以及任何本地监视的已接纳 run。对于不确定的 mutation 或 maintenance 操作，查询其持久 receipt 与实时目标。对于不确定的 agent apply-back，交给 Generic 处理并检查 apply 状态；不要把 `agentRunId` 注册为被监视的 workflow run。

当状态已变更或 handle 消耗未知时，不要复用该 handle。当远程调用之后的本地更新成功时，本地提交只证明服务记录了返回结果；实时 Zotero 或域 receipt 才证明外部影响。

对于部分准入的原生提交，保留提交 handle、待处理 unit 投影、已准入 task/run handle、终态 unit、失败 unit 与已取消 unit。插件拥有这些状态；常驻状态既不得移除也不得重建它们。待处理 unit 在已接受的提交下继续，而单独的后续提交需要新的当前操作者指令。

## 安装与 profile 恢复

在 profile 初始化期间运行 `scripts/install_zotero_bridge_cli.py`。它安装打包的可执行文件并链接众所周知的连接 profile，不改变 `HOME`。仅用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME` 定位 Zotero 侧 profile。

驻留工作之前，运行捆绑的 CLI 身份检查，并将协议、CLI schema、版本、构建指纹与 command catalog 校验和同 profile release identity 比较。仅版本匹配不够。按顺序诊断服务、profile、已认证 manifest 与 backend 就绪状态。

凭据保留在连接环境中。绝不将 bearer tokens 写入 `state.sqlite`、cron YAML、receipts、日志、命令证据或 profile 文档。若可执行文件/profile 身份不同，选择匹配的打包集合，而不是合并不同 release 的资产。

## 当前状态 model

数据库仅拥有常驻簿记。每张表用于一个用途。

### `meta`

存储：

- 活动状态 Schema 标记；
- 上次成功的 index 刷新；
- 保留让常驻读取保持失败即封闭（fail-closed）所需的本地服务元数据。

它不存储用户权限、当前 Zotero 连接真相、workflow approval 或任务结论。

### `library_index_generations`

存储：

- 代与 Host 快照身份；
- 已解析的库身份；
- `staging` 或 `current` 状态；
- Host 内容 digest、总 item 与批计数；
- 创建与提升时间。

暂存代次是可恢复的本地工作，不是当前索引，也不是缺席行已被删除的证明。提升要求确切的当前 Host 完成证据；较旧的 receipt 或本地重建的证据不能使代次成为当前。

### `library_generation_items`

存储：

- 属主代次身份；
- library ID 与 item key；
- 数字 item ID；
- item 类型与标题；
- 序列化快照 payload；
- 内容摘要与本地更新时间。

只有属于 `meta.current_library_generation` 所命名的代的那些行支持发现与变更比较。暂存行不出现在驻留搜索、item 读取、统计或卫生候选中。当前行与暂存行都不证明当前 item 状态、附件访问、选择或权限。

### `workflow_catalog`

存储：

- workflow ID；
- 缓存描述 payload；
- 发现摘要与本地更新时间。

它有助于识别候选。执行前实时 list/describe/validate 仍具权威。

### `watched_runs`

存储：

- 真实 `workflowRunId`；
- workflow ID；
- 最后已知状态；
- 已接受的实时 payload；
- 更新时间。

它是一遍式监视缓存。它不拥有 transcripts、权限、Products、artifacts 或自有 agent runs。

### `notifications`

存储：

- 事件 ID；
- 关联的 workflow run ID；
- 事件类型；
- 本地确认投影；
- payload 与更新时间。

事件是生命周期提示。它不是回复目标、permission，也不是其隐含动作已发生的证明。

### 原生提交观察边界

常驻 SQLite 不存储 workflow submission、待处理 queue unit、预留、approval 或重放状态。这些事实属于实时 Zotero 插件，并通过 Zotero Bridge surface 读取。

常驻 profile 可观察：

- 当前交互式 CLI 调用返回的 `submissionId`；
- 不可变的逐 unit `queueId` 值；
- 聚合提交计数与链接；
- 已接纳任务身份；
- 准入后的真实 `workflowRunId` 值；
- 终态单元结果与结构化失败；
- Product、artifact、operation 或实时对象证据分别检查。

当单趟监督有用时，常驻 profile 只能在 `watched_runs` 中持久化真实被接纳的 run。注册该 run 不会把其 submission、queue 位置、选择、provider profile、选项或 approval 复制到常驻所有权下。

驻留 profile 绝不存储：

- 可复用的 workflow approval；
- Agent 生成的 workflow 队列；
- 待处理单元的预留；
- 下一个条目的 cursor；
- 重放资格位；
- 后台 worker 租约；
- 本地重建的 Host unit；
- 替代的聚合提交状态。

### 原生 handle 所有权

| Handle | 所有者 | 含义 | 有效控制平面 |
| --- | --- | --- | --- |
| `submissionId` | Zotero 原生队列 | 一次已接受的 host-queue 提交及其不可变单元 | `workflow submission get`；按 submission 筛选的任务发现 |
| `queueId` | Zotero 原生队列 | 一个投影单元，仅待处理时可取消 | `workflow queue list`；待处理队列取消 |
| 任务身份 | Host 任务运行时 | 一个已准入单元的任务谱系 | 按 submission 筛选的 Host 任务读取 |
| `workflowRunId` | Zotero 托管执行 | 一次已接纳的 workflow run | Run 状态、取消、交互、历史与事件 |
| `skillRunId` | Skill 执行 | 一个交互式 skill 目标 | Skill 回复/连接 |
| `agentRunId` | 自有 handoff | 一个 Agent 拥有的请求集 | Agent handoff/apply 契约，绝不 watched runs |

绝不要从一个 handle 推导另一个。排队提交响应中缺少 `workflowRunId` 在单元待处理时是预期的；它不是无效 handle，也不证明准入失败。

## 原生提交身份

排队的提交结果提供后续观察所需的原生身份：

- `admission: host-queue`；
- `submissionId`；
- 按声明的 total、pending、admitted/running、terminal、failed 与 canceled 计数；
- queue 与 submission 链接；
- 含 `queueId` 与源关联的不可变 unit projection；
- 可用时的已接纳 task 或 run identity。

将 `submissionId` 视为不透明。按返回原样保留它，且仅与描述符接受该 handle 类型的命令一起使用。

把每个 `queueId` 视为不透明。它在接纳后仍可用于单元关联，但其改变状态的取消动作仅在单元仍待处理时有效。

把每个已接纳 task/run 身份视为执行中独立权威。聚合提交状态不能替代 run 转录、交互、permissions、终态细节或结果核实。

初始提交响应可能先不完整于时间，而不是不完整于契约。待处理 unit 有意不携带编造的 run 身份。重新读取同一原生提交，而不是用本地推断填补缺口。

## 原生提交状态转换

正常待处理 unit：

```text
pending
  -> admitted or running
  -> terminal success or terminal failure
```

待处理取消：

```text
pending
  -> canceled
```

准入竞争：

```text
pending
  -> admitted
  -> queue cancellation conflicts
  -> run control owns later cancellation
```

聚合提交：

```text
accepted
  -> pending and/or admitted
  -> all units terminal or canceled
```

Apply-back 槽位生存期：

```text
admitted
  -> workflow execution terminal
  -> apply-back terminal
  -> native slot released
```

原生队列拥有每一次转换。常驻监督观察投影，但不推进它、不预留容量、也不启动下一个 unit。

### 直接准入

当提交结果声明直接接纳时：

1. 保留返回的真实 task 与 `workflowRunId`。
2. 立即使用普通 run 面。
3. 仅当常驻一次性监控有用时才在本地注册 run。
4. 分别验证预期的 Products、artifacts、operations 与 Zotero 变更。
- 5. 传输不确定时，在另一次提交前检查当前/近期匹配 runs。

不要为直接 run 创建合成的 `submissionId` 或 queue unit。

### Host-queue 接纳

当提交结果声明 host-queue 准入时：

1. 保留返回的 `submissionId`。
2. 保留每个不可变 unit 与 `queueId`。
3. 检查提交投影的聚合与逐单元状态。
- 4. 仅用队列列表观察活动单元。
- 5. 仅取消仍待处理的队列单元。
6. 按提交血缘发现已准入任务。
7. 一旦存在 run handle，就把执行监督移交给真实 run 平面。
8. 执行与 apply-back 之后，独立验证每个预期输出。

不要因为一些单元仍待处理就创建另一次提交。它们已是原并发界限管辖的已接受工作。

### 不确定观察

当提交响应或后续读取不确定时：

- 保留任何返回的原生 handle 与结构化错误；
- 已知 `submissionId` 时重新读取原始提交；
- 查询按提交筛选的任务以发现已接纳工作；
- 可能已发生直接接纳时，检查实时近期 runs；
- 关联任务前比较来源 refs 与 workflow 身份；
- 保持无关但时间相近的 runs 分开；
- 不要因缺失初始 run 句柄而推断失败；
- 不要从聚合终态状态推断成功；
- 仅在较早影响解决后获取新授权。

驻留行缺失不证明原生工作缺失。驻留状态刻意不是提交的 SSOT。

活动提交与队列投影是进程本地的。当 Host 重启使先前的 `submissionId` 不可用时，检查按提交过滤的 task 谱系与真实 runs，以恢复重启前已准入的单元。从未准入的待处理单元不再可作为活动队列工作观察；在交互式 task 证据中保留已审查的源范围，报告未解决剩余部分，并在创建任何替代提交前取得当前授权。绝不在 `state.sqlite` 中重建待处理单元。

## 失败分类矩阵

| 失败 | 可能的远程影响 | 状态 | 安全下一步 |
| --- | --- | --- | --- |
| 当前提交授权缺失 | 调用前无 | 无原生提交 | 获取当前精确范围授权 |
| 无效的 selection/options JSON | 调用前无 | 无原生提交 | 修正声明输入并再次校验 |
| Workflow 契约已变更 | 此调用中无 | 校验已陈旧 | 重新描述并重新校验 |
| 选择重新校验失败 | 本次调用无 | 校验被拒 | 解析实时选择并重新校验 |
| Provider profile 校验失败 | 此调用中无 | Provider 被拒 | 独立纠正 provider 输入 |
| 并发低于一 | 调用前无 | 无原生提交 | 选择正的有界值 |
| 直接提交返回有效 run ID | 已知接纳 | 真实 run 存在 | 监视返回的 run |
| Queue 提交返回 `submissionId` | 已知的已接受提交 | 原生 units 存在 | 检查提交投影 |
| 待处理取消成功 | 已知取消 | 单元已取消 | 保留 receipt 与剩余单元 |
| 准入后待处理取消冲突 | 已知所有权转移 | Task/run 拥有单元 | 重读提交并使用 run 控制 |
| 远程提交传输在无 handle 时失败 | Unknown | 原生效果不确定 | 重试前检查匹配的实时 tasks/runs |
| 远程提交返回提交 handle 后传输失败 | 身份已知、后续状态不确定 | 提交保持权威 | 重新读取该 `submissionId` |
| 已准入 task 失败 | 其他单元仍独立有效 | 单元终止失败 | 保留失败；继续有界监督 |
| Apply-back 仍活动 | 槽位保持占用 | unit 尚未完全终态 | 通过声明的观察路径等待；不要过度订阅 |
| 无待处理 units | queue 取消不产生任何项 | 既有原生状态保留 | 检查已准入/终态 units；不要重新提交 |

## 按领域的恢复序列

### 库投影

1. 保留失败的刷新回执与最后可用的数据库。
2. 存在时保留 staging generation identity，但保持其非权威。
3. 确定是否收到匹配的 Host 完成证据且晋升已提交。
4. 任一条件缺失时，保留先前的当前代次与刷新时间戳。
5. 通过服务运行一次新的有界完整刷新；中断、过期或 Host 重启后不要恢复旧的进程本地快照。
6. 比较晋升计数、generation 身份与快照身份。
7. 用实时 item 读取得出当前结论。

绝不手工修补缺失的行。

### Workflow 目录

1. 保留缓存定义与刷新失败。
2. 使用实时 workflow list/describe 做即时决策。
3. 稍后重试一遍 catalog-refresh。
4. 不要把缓存的 provider/readiness 事实说成当前。

### 被监视 run

1. 保留 run ID、workflow ID、最后状态与更新时间。
2. 读取实时 run。
3. 记录有效的返回转换。
4. 通过各自契约检查 prompts、权限、Products、artifacts 与写入。
5. 不要从本地终止状态推断完成。

### 通知

1. 保留事件 ID 与属主 run 身份。
2. 检查实时属主状态。
3. 在其 authority 契约下执行所需动作。
4. 确认所指名的事件。
5. 实时确认失败时保持其未确认。

### 原生 workflow 提交

1. 保留 workflow ID、`submissionId`、unit 的 `queueId` 值、来源 refs 与结构化失败。
2. 确定失败发生在 submit 调用之前、准入期间、原生 handle 返回之后、执行期间还是 apply-back 期间。
3. 对于本地校验失败，纠正实时 selection/options/provider 输入并在寻求授权前重新校验。
4. 对于未知的排队影响，检查原始 submission projection 与按 submission 过滤的任务。
5. 对未知直接效果，用 workflow 与源身份检查匹配的活跃/近期 runs。
6. 只通过 `run register` 注册已证明的真实 run；不要手改 SQLite 或制造谱系。
7. 绝不要仅因其初始响应缺少 run handles 就重放已接受或不确定的提交。
8. 已接受提交内的待处理单元继续在原生所有权下运行，无需常驻重启。
- 9. 在任何不同的替换提交前获得当前权限。

### Maintenance 候选

- 1. 保留候选理由与 refs。
2. 读取实时对象/model。
3. 把语义诊断委托给 Generic。
4. 产生可审查的 proposal。
5. 获取当前权限。
- 6. 单独验证任何已批准效果。

候选消失是有效的无变化结果。它不需要补偿性的 maintenance。

## 未知效果恢复

传输或结构化提交失败且状态未知，意味着远程状态可能与本地确定不同。

保留：

- 返回时保留 `submissionId`；
- 每个返回单元的 `queueId`；
- 单元序号与源 refs；
- workflow ID；
- 时间戳；
- bridge 错误；
- 所有已准入 task 与 run IDs；
- 聚合计数与 queue 链接；
- 已审查的 selection/options/provider/concurrency 范围。

检查：

- 原始原生提交投影；
- 按提交筛选的已准入任务；
- 直接或已准入执行的当前/近期 workflow runs；
- 选择/源身份；
- workflow 特定的去重或提交证据；
- 被监视 run cache；
- 只在定位到 run 后检查预期的下游 Product/artifact。

禁止：

- 再次提交同一已审查范围；
- 将单元重建或重置为待处理；
- 删除常驻行以强制走 submission 路径；
- 在对账前为同一来源创建替代 submission；
- 从缺失的本地 run ID 推断失败；
- 从时间相近的不相关 run 推断成功。

若无法确立可靠匹配，保持 submission 效果未知并报告需要操作员审阅。

## Receipt 到重试清单

在任何重试前回答：

- 先前的调用是否可能产生远程效果？
- 其状态更改是已知、未更改、已更改还是未知？
- 输入 handle 是否被消耗？
- 持久 receipt 是否指明安全下一步？
- 当前目标是否已实时读取？
- 重试是否会重复已接受的页、上传、提交、mutation、确认或 apply-back？
- 当前请求是否仍授权确切的影响？

仅当所有相关答案都使重复不可能时重试。

## 状态重建边界

可重建：

- library 投影；
- workflow catalog 缓存；
- 真实 run ID 可用时替换受监视 run 行；
- 通知投影。

不可从猜测重建：

- 用户 authority；
- 远程 workflow 提交影响；
- 已消耗句柄；
- 其所有者未返回的 Products 或 artifacts；
- 先前的 Zotero mutations；
- 自有 apply-back receipts；
- 未解决的原生提交影响。

全新数据库改进未来观察。它不能抹除或证明远程历史。

## 恢复报告模式

用法：

> index 刷新在完整快照被接受前失败。先前投影仍可用，但我将用实时读取支持当前主张。

用法：

> 排队提交响应在其原生 handle 返回后变得不确定。我保留了提交与 unit 身份，关联了任何已准入的 run，并且在原始投影对账完成前不会发出替代提交。

用法：

> 缓存 workflow 定义可用于发现，但实时 describe 已变化，因此选择、选项、provider profile 与请求的并发在提交前必须重新审阅并验证。

用法：

> notification 仍未确认，因为其关联的动作未被成功处理。

请勿使用：

- 丢失提交响应后“什么都没发生”；
- 未经 receipt 与实时状态检查就称"可安全重试"；
- 临时 SQL 后称 "database repaired"（数据库已修复）；
- 仅凭观察到的终态发出的“workflow complete”；
- 将缓存验证或常驻状态称为"已批准提交"；
- 仅跑一遍时称为“schedule restored”。

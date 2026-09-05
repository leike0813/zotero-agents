# 状态与恢复

## 状态所有权与 schema

`scripts/zotero_librarian_service.py`独家创建并更新`state.sqlite`。当前 schema 标记是`zotero-librarian.state.v4`。其拥有的数据包括：

- 包括最后一次成功 index refresh 在内的元数据；
- current 与 staging library-index generation，以及以 generation、library ID 和 item key 为键的 item row；
- 以 workflow ID 为键的缓存工作流定义；
- 以 `workflowRunId` 为键的 watched Zotero 托管 run；
- 以 event ID 为键的轻量通知；

任何 Skill、cron 文件、shell 片段、外部 helper 或手工 SQL session 都不得创建表、修改 schema 或写入行。服务启用外键，并以事务方式初始化 schema，使并发首次读取收敛到同一个有效数据库。

该数据库是可重建的缓存和 journal。UI 上下文、文献库内容、工作流定义、执行模式、run、permission、通知、Product、文件、operation 和写入仍以实时 Zotero 为权威。

## Profile-local state 边界

active connection profile 由 service `--profile`、`ZOTERO_BRIDGE_PROFILE` 或平台 well-known profile 选择。well-known profile 是现有 state path 的默认 owner。每个显式规范化 profile 路径拥有独立的 `workspaces/<sha256>/` root，包括 SQLite database、workflow catalog、watched run、notification 和 `.zotero-bridge/bin`；identity 不包含 profile 内容或 token。Agent 无需手动计算该 root。

`--db` 只能指定当前 root 内的诊断 database。profile/path/root/connection 错误和 `workspace_path_outside_profile` 会在创建 database 前停止 pass，且不回退到共享目录。该路由不改变 `state.v4` schema，也不改变要求 live Zotero facts、current approval、native queue ownership 和 durable receipt 的规则。

## 新鲜度与原子更新

每项缓存结论都附带相关刷新或更新时间。缓存用于发现与变化检测；对外可见的当前事实，以及所有可能导致写入或交互的决策，都使用实时读取。

Index refresh 把每个已接受 snapshot page 写入 staging generation，先前 generation 仍保持 current。service 会校验一个不可变 Host basis：snapshot identity、library、scope、稳定顺序、batch 序列、已交付 counter 与 terminal evidence。只有匹配的 `outcome: completed` evidence 才允许 promotion transaction 将 staged generation 标记为 current、移除 prior-generation row，并记录刷新时间。

active page、中断、过期、cursor 不匹配、资源上限、Host 重启、解析失败、写入失败或 evidence 不匹配均不能 promote。未完成 generation 保持非 authoritative，先前 current generation 仍可读取。后续 refresh 会打开新的进程内 snapshot；它不会复用缓存的 snapshot identity，也不会从 staged row count 推断完成。完整的空 snapshot 可以 promote 为空 generation，从而移除所有先前 item row。Catalog refresh 同样只提交每项成功取得的变更描述，不虚构定义。

Run watch 与 notification sync 只更新已接受的实时结果。连接失败时保留最后已知状态以供后续比较。不得抹除旧状态、依据被拒数据推进 cursor，或在刷新失败后把缓存 terminal/run/event 值描述为当前值。

## 恢复顺序

1. 保留失败 receipt 的 operation、code、details、输入路径或 handle，以及最后可用本地状态。
2. 若 Zotero 状态可能已改变，选择重试前检查受影响的实时对象、workflow/run、operation、apply receipt、Product、文件所属对象或通知。
3. 本地损坏或数据库不可用时，停止常驻操作；条件允许时保留损坏文件供检查。
4. 只能通过服务初始化新数据库；绝不能手工修复表。
5. 只刷新下一项决策所需的最小 projection：library index、workflow catalog、watched run 注册/状态或 notification inbox。
6. 重新运行一个有边界的操作，并将其 receipt 与已保留失败进行比较。

重建本地状态不能重放丢失的 Zotero 写入，也不授权 submission、mutation、event 确认处理 或 apply-back。

## Handle 与不确定结果

Zotero ref、`submissionId`、`queueId`、`workflowRunId`、`skillRunId`、`agentRunId`、`operationId`、`permissionRequestId`、`eventId`、`fileId` 和 Product ID 必须留在各自领域。submission 标识一个已 accepted native admission request，queue ID 标识一个仍处于 pending 或 projection 中的 unit，workflow-run ID 标识 admitted execution。本地行身份不能替代 handle。

direct workflow submission 不确定时，另一次调用前检查匹配的近期实时 run。native queued submission 不确定时，在再次提交前检查原始 `submissionId`、其不可变 units、submission-filtered tasks，以及本地 watched 的 admitted runs。mutation 或维护 operation 结果不确定时，查询其持久 receipt 和实时目标。Agent apply-back 结果不确定时，委托给 Generic 并检查 apply status；不得把 `agentRunId` 注册为 watched 工作流 run。

状态变化或 handle 消费情况未知时，不得复用 handle。远程调用后本地更新成功，只证明服务记录了返回结果；外部 effect 必须由实时 Zotero 或领域 receipt 证明。

对 partially admitted native submission，保留 submission handle、pending unit projections、admitted task/run handles、terminal units、failed units 与 canceled units。这些状态归插件所有；常驻状态既不能删除也不能重建。pending units 继续受已 accepted submission 管理；独立的后续 submission 需要新的当前操作员指令。

## 安装与 profile 恢复

profile 初始化期间运行 `scripts/install_zotero_bridge_cli.py`。它安装随附可执行文件并链接 well-known 连接 profile，且不更改 `HOME`。`ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME` 仅用于定位 Zotero 端 profile。

常驻工作前，运行随附 CLI 身份检查，将 protocol、CLI schema、version、build fingerprint 和 command-catalog checksum 与 profile release identity 比较。仅版本匹配不足以证明一致。按服务、profile、已认证 manifest、backend 就绪状态的顺序诊断。

凭据始终留在连接环境中。绝不能把 bearer token 写入 `state.sqlite`、cron YAML、receipt、日志、命令证据或 profile 文档。可执行文件/profile 身份不一致时，应选择匹配的随附集合，不得组合不同 release 的 asset。

## 当前状态模型

该数据库仅拥有常驻簿记。将每个表用于一个目的。

### `meta`

商店：

- 活动状态Schema标记；
- 最后一次成功的索引刷新；
- 用于让常驻读取保持 fail closed 的本地服务元数据。

它不存储用户权限、当前 Zotero 连接真相、workflow 批准或任务结论。

### `library_index_generations`

商店：

- generation 与 Host snapshot identity；
- 已解析 library identity；
- `staging` 或 `current` status；
- Host content digest、item 与 batch 总数；
- 创建与 promotion 时间。

staging generation 是可恢复的本地工作，并非 current index，也不能证明缺失行已被删除。Promotion 需要当前 Host 的准确 completion evidence；旧 receipt 或本地重建 evidence 不能把 generation 设为 current。

### `library_generation_items`

商店：

- 所属 generation identity；
- 文献库 ID 和单册密钥；
- 数字项目 ID；
- 项目类型和标题；
- 序列化快照负载；
- 内容摘要和本地更新时间。

只有 `meta.current_library_generation` 指定 generation 的行支持发现与变化比较。Staging row 不会出现在 resident search、item read、stats 或 hygiene candidate 中。current 与 staging row 都不能证明当前 item state、attachment access、selection 或 permission。

### `workflow_catalog`

商店：

- workflow ID；
- 缓存的描述负载；
- 发现摘要和本地更新时间。

它有助于识别候选项。实时列表/描述/验证在执行之前仍然具有权威性。

### `watched_runs`

商店：

- 真实`workflowRunId`；
- workflow ID；
- 最后已知的状态；
- 接受的实时有效负载；
- 更新时间。

它是一个一次性手表缓存。它不拥有成绩单、权限、Products、artifacts 或自有的 agent 运行。

### `notifications`

商店：

- 事件ID；
- 关联的 workflow 运行ID；
- 事件类型；
- 本地确认投影；
- 有效负载和更新时间。

事件是生命周期提示。它不是回复目标、许可或其隐含操作发生的证据。

### Native submission observation boundary

常驻 SQLite 不存储 workflow submission、pending queue unit、reservation、approval 或 replay state。这些事实归实时 Zotero 插件所有，并通过 Zotero Bridge surface 读取。

常驻 profile 可以观察：

- 当前交互式 CLI 调用返回的 `submissionId`；
- 不可变的 per-unit `queueId`；
- aggregate submission counts 与 links；
- admitted task identities；
- admission 后的真实 `workflowRunId`；
- terminal unit outcome 与结构化 failure；
- 分别检查的 Product、artifact、operation 或 live-object evidence。

只有真实 admitted run 需要 one-pass supervision 时，常驻 profile 才可将其持久化到 `watched_runs`。注册该 run 不会把其 submission、queue position、selection、provider profile、options 或 approval 复制到常驻所有权中。

常驻 profile 绝不存储：

- 可复用 workflow approval；
- agent-generated workflow queue；
- pending-unit reservations；
- next-entry cursor；
- replay eligibility bit；
- background worker lease；
- 本地重建的 Host unit；
- 替代性的 aggregate submission state。

### Native handle ownership

| Handle | Owner | 含义 | 有效 control plane |
| --- | --- | --- | --- |
| `submissionId` | Zotero native queue | 一个已 accepted host-queue submission 及其不可变 units | `workflow submission get`；submission-filtered task discovery |
| `queueId` | Zotero native queue | 一个 projected unit，仅在 pending 时可取消 | `workflow queue list`；pending queue cancel |
| task identity | Host task runtime | 一个 admitted unit 的 task lineage | 按 submission 过滤的 Host task read |
| `workflowRunId` | Zotero-managed execution | 一个 admitted workflow run | Run status、cancellation、interaction、history 与 events |
| `skillRunId` | Skill execution | 一个 interactive skill target | Skill reply/connect |
| `agentRunId` | Agent 自主 handoff | 一个 Agent 自主 request set | Agent handoff/apply contract，绝不进入 watched runs |

不得从一种 handle 推导另一种 handle。queued submit response 中缺少 `workflowRunId` 是 units 尚处于 pending 时的预期行为；这不是无效 handle，也不能证明 admission 失败。

## Native submission identity

queued submit result 提供后续观察所需的 native identity：

- `admission: host-queue`；
- `submissionId`；
- 声明的 total、pending、admitted/running、terminal、failed 与 canceled counts；
- queue 与 submission links；
- 包含 `queueId` 与 source correlation 的不可变 unit projections；
- 可用时的 admitted task 或 run identities。

将 `submissionId` 视为 opaque。按返回值精确保留，并且只用于 descriptor 接受该 handle kind 的命令。

将每个 `queueId` 视为 opaque。admission 后它仍可用于 unit correlation，但其状态变更 cancellation action 只在 unit 处于 pending 时有效。

将每个 admitted task/run identity 视为 execution 的独立权威。aggregate submission state 不取代 run transcript、interaction、permission、terminal detail 或 result verification。

初始 submission response 可以在时间上尚未完整，但在 contract 上仍然完整。pending units 有意不包含 fabricated run identity。重新读取同一个 native submission，不得用本地推断填补空缺。

## Native submission state transitions

正常 pending unit：

```text
pending
  -> admitted or running
  -> terminal success or terminal failure
```

Pending cancellation：

```text
pending
  -> canceled
```

Admission race：

```text
pending
  -> admitted
  -> queue cancellation conflicts
  -> run control owns later cancellation
```

Aggregate submission：

```text
accepted
  -> pending and/or admitted
  -> all units terminal or canceled
```

Apply-back slot lifetime：

```text
admitted
  -> workflow execution terminal
  -> apply-back terminal
  -> native slot released
```

native queue 拥有每项 transition。常驻 supervision 只观察 projection，不推进状态、不预留容量，也不启动下一 unit。

### Direct admission

submit result 声明 direct admission 时：

1. 保留返回的真实 task 与 `workflowRunId`。
2. 立即使用普通 run plane。
3. 只有 one-pass resident watching 有用时，才在本地注册 run。
4. 分别验证预期 Products、artifacts、operations 与 Zotero changes。
5. transport 状态不确定时，在再次 submit 前检查匹配的 current/recent runs。

不得为 direct run 创建 synthetic `submissionId` 或 queue unit。

### Host-queue admission

submit result 声明 host-queue admission 时：

1. 保留返回的 `submissionId`。
2. 保留每个不可变 unit 与 `queueId`。
3. 检查 submission projection 的 aggregate 与 per-unit state。
4. queue list 仅用于观察 active units。
5. 只取消仍处于 pending 的 queue unit。
6. 按 submission lineage 发现 admitted tasks。
7. 真实 run handle 存在后，将 execution supervision 转交 run plane。
8. execution 与 apply-back 后，分别验证每个预期输出。

不得因为某些 units 仍为 pending 就创建另一 submission。它们已经是受原 concurrency bound 管理的 accepted work。

### Uncertain observation

submit response 或后续读取不确定时：

- 保留所有返回的 native handles 与结构化 error；
- 已知 `submissionId` 时重新读取原始 submission；
- 查询 submission-filtered tasks 以寻找 admitted work；
- direct admission 可能已经发生时检查实时 recent runs；
- 关联 task 前比较 source refs 与 workflow identity；
- 将时间接近但无关的 runs 保持分离；
- 不得从初始 run handle 缺失推断失败；
- 不得从 aggregate terminal state 推断成功；
- 只有较早 effect 已解决后，才能取得新授权。

常驻 rows 不存在不能证明 native work 不存在。常驻状态被有意设计为不是 submission SSOT。

Active submission 与 queue projections 是 process-local。Host restart 使先前 `submissionId` 不再可用时，检查 submission-filtered task lineage 与真实 runs，恢复 restart 前已 admitted units。未 admitted 的 pending units 不再可作为 active queue work 观察；在 interactive task evidence 中保留 reviewed source scope，报告 unresolved remainder，并在 replacement submission 前取得当前授权。绝不能在 `state.sqlite` 中重建 pending units。

## 故障分类矩阵

|失败|可能的远程影响|状态|安全下一步行动|
| --- | --- | --- | --- |
| 缺少当前 submission authority | 调用前无 effect | 无 native submission | 取得当前 exact-scope authority |
| 无效 selection/options JSON | 调用前无 effect | 无 native submission | 修正声明输入并重新校验 |
| workflow contract 已变化 | 本次调用无 effect | validation stale | 重新 describe 与 validate |
| selection revalidation 失败 | 本次调用无 effect | validation rejected | 解析实时 selection 并重新校验 |
| provider profile validation 失败 | 本次调用无 effect | provider rejected | 独立修正 provider input |
| concurrency 小于一 | 调用前无 effect | 无 native submission | 选择正的有界值 |
| direct submit 返回有效 run ID | known admission | real run exists | 监控返回的 run |
| queue submit 返回 `submissionId` | known accepted submission | native units exist | 检查 submission projection |
| pending cancel 成功 | known cancellation | unit canceled | 保留 receipt 与 remaining units |
| pending cancel 在 admission 后 conflict | known ownership transition | task/run owns unit | 重读 submission 并使用 run control |
| remote submit transport 失败且无 handle | unknown | native effect uncertain | 重试前检查 matching live tasks/runs |
| remote submit 返回 submission handle 后 transport 失败 | identity known，later state uncertain | submission remains authoritative | 重读该 `submissionId` |
| admitted task 失败 | 其他 units 仍独立有效 | unit terminal failed | 保留 failure；继续 bounded supervision |
| apply-back 仍 active | slot remains occupied | unit not fully terminal | 按声明 observation path 等待；不得 oversubscribe |
| 无 pending units | queue cancel 无 effect | 保留现有 native state | 检查 admitted/terminal units；不得 resubmit |

## 按域恢复顺序

### 文献库投影

1. 保留失败的刷新receipt和最后可用的数据库。
2. 如存在 staging generation identity，保留它，但保持非 authoritative。
3. 确认是否收到匹配的 Host completion evidence，且 promotion 已提交。
4. 任一条件缺失时，保留先前 current generation 与刷新时间戳。
5. 通过 service 运行新的有界完整 refresh；中断、过期或 Host 重启后不得 resume 旧的进程内 snapshot。
6. 比较 promoted count、generation identity 与 snapshot identity。
7. 使用 live item read 得出当前结论。

切勿手动修补缺失的行。

### workflow 目录

1. 保留缓存的定义和刷新失败。
2. 使用实时 workflow 列表/描述来立即做出决定。
3. 稍后重试一次目录刷新。
4. 不要声称缓存的 provider/就绪事实是最新的。

### Watched run

1. 保留运行 ID、workflow ID、上次状态和更新时间。
2. 阅读当前实时状态。
3. 记录有效的返回转换。
4. 检查提示、权限、Products、artifacts，并通过自己的合约进行写入。
5. 不要从本地终端状态推断完成。

### 通知

1. 保留事件 ID 和拥有的运行身份。
2. 检查实时拥有状态。
3. 根据其授权合同执行所需的操作。
4. 确认指定的事件。
5. 当实时确认失败时，保持未确认状态。

### Native workflow submission

1. 保留 workflow ID、`submissionId`、unit `queueId`、source refs 与结构化 failure。
2. 判断 failure 发生于 submit call 前、admission 期间、native handle 返回后、execution 期间还是 apply-back 期间。
3. 本地 validation 失败时，修正实时 selection/options/provider input，并在请求 authority 前重新校验。
4. queued effect 未知时，检查原始 submission projection 与 submission-filtered tasks。
5. direct effect 未知时，使用 workflow 与 source identity 检查 active/recent matching runs。
6. 只能通过 `run register` 注册已证明的真实 run；不得手工编辑 SQLite 或制造 lineage。
7. 不得仅因初始响应缺少 run handle 就重播 accepted 或 uncertain submission。
8. accepted submission 内的 pending units 继续由 native owner 管理，不需要常驻重启。
9. 任何独立 replacement submission 都必须重新取得当前 authority。

### 维护候选项

1. 保留候选项理由和refs。
2. 读取活动对象/模型。
3. 将语义诊断委托给Generic。
4. 提出可审查的提案。
5. 获得当前授权。
6. 单独验证任何批准的效果。

候选项失踪是一个有效的、不变的结果。它不需要补偿性维护。

## 未知效果恢复

transport 或 structured submit failure 的 state 为 unknown 时，远程状态可能与本地确定性不同。

保存：

- 返回时的 `submissionId`；
- 每个返回的 unit `queueId`；
- unit ordinal 与 source refs；
- workflow ID；
- 时间戳；
- 桥接错误；
- 所有 admitted task 与 run ID；
- aggregate counts 与 queue links；
- reviewed selection/options/provider/concurrency scope。

检查：

- 原始 native submission projection；
- submission-filtered admitted tasks；
- direct 或 admitted execution 的 current/recent workflow runs；
- 选择/来源标识；
- workflow-特定的去重或提交证据；
- 监视运行缓存；
- 仅在找到运行后才预期下游Product/artifact。

不要：

- 再次提交相同 reviewed scope；
- 重建 unit 或将其重置为 pending；
- 删除 resident rows 以强制打开 submission path；
- 在 reconciliation 前为同一 source 创建 replacement submission；
- 从缺少本地运行 ID 推断失败；
- 从类似时间的不相关运行推断成功。

如果无法建立可靠匹配，保持 submission effect 为 unknown，并报告需要操作员审阅。

## Receipt 重试清单

在重试之前，请回答：

- 先前的通话是否可能产生远程影响？
- 它的状态变化是已知的、未改变的、已改变的还是未知的？
- 输入handle是否被消耗？
- 耐用的receipt是否命名了安全的下一步行动？
- 当前目标是否已被实时读取？
- 重试是否会重复已接受的页面、上传、提交、更改、确认或申请返回？
- 当前的请求是否仍然授权确切的效果？

仅当所有相关答案都无法重复时才重试。

## 状态重建边界

可重建：

- 文献库投影；
- workflow 目录缓存；
- 当实际运行 ID 可用时监视运行行；
- 通知投影。

无法根据猜测重建：

- 用户权限；
- 远程 workflow 提交效果；
- 消耗handles；
- Products 或 artifacts 未由其所有者归还；
- 之前的 Zotero 写入变更；
- 自有申请返还receipts；
- 未解决的 native submission effects。

新的数据库可以改善未来的观察。它无法擦除或证明遥远的历史。

## 恢复报告模板

用途：

> 在接受完整快照之前索引刷新失败。之前的预测仍然可用，但我将使用当前声明的实时读数。

用途：

> native handle 返回后，queued submission response 变得不确定。我已保留 submission 与 unit identities，并关联所有 admitted runs；在原始 projection 对齐之前不会发出 replacement submission。

用途：

> 缓存的 workflow 定义可供发现，但实时 describe 已变化，因此必须重新审阅并校验 selection、options、provider profile 和 requested concurrency，才能提交。

用途：

> 该通知仍未确认，因为其关联操作未成功处理。

不要使用：

- 丢失提交响应后“什么也没发生”；
- “安全重试”，无需 receipt 和实时状态检查；
- 即席 SQL 后“数据库已修复”；
- 仅从观看的终端状态“workflow 完成”；
- 对 cached validation 或 resident state 使用“approved submission”；
- 当仅运行一个通道时，“计划已恢复”。

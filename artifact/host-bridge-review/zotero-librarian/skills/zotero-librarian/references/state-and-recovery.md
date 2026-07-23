# 状态与恢复

## 状态所有权与 schema

`scripts/zotero_librarian_service.py`独家创建并更新`state.sqlite`。当前 schema 标记是`zotero-librarian.state.v2`。其拥有的数据包括：

- 包括最后一次成功 index refresh 在内的元数据；
- 以 library ID 和 item key 为键的文献库条目 projection；
- 以 workflow ID 为键的缓存工作流定义；
- 以 `workflowRunId` 为键的 watched Zotero 托管 run；
- 以 event ID 为键的轻量通知；
- 不可变的 workflow 计划身份；
- 每个计划条目的保留、启动和不确定效果状态。

任何 Skill、cron 文件、shell 片段、外部 helper 或手工 SQL session 都不得创建表、修改 schema 或写入行。服务启用外键，并以事务方式初始化 schema，使并发首次读取收敛到同一个有效数据库。

该数据库是可重建的缓存和 journal。UI 上下文、文献库内容、工作流定义、执行模式、run、permission、通知、Product、文件、operation 和写入仍以实时 Zotero 为权威。

## 新鲜度与原子更新

每项缓存结论都附带相关刷新或更新时间。缓存用于发现与变化检测；对外可见的当前事实，以及所有可能导致写入或交互的决策，都使用实时读取。

Index refresh 在一个事务中接受所有 snapshot 页面，upsert 已变更行，删除完整 snapshot 中缺失的行，并且仅在成功时记录刷新时间。页面、解析或事务失败会回滚新 projection。Catalog refresh 同样只提交每项成功取得的变更描述，不虚构定义。

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

Zotero ref、`workflowRunId`、`skillRunId`、`agentRunId`、`operationId`、`permissionRequestId`、`eventId`、`fileId`、Product ID 和 plan 路径必须留在各自领域。本地行身份不能替代 handle。

工作流提交结果不确定时，启动另一 plan 条目前检查匹配的近期实时 run 和本地 watched 条目。mutation 或维护 operation 结果不确定时，查询其持久 receipt 和实时目标。Agent apply-back 结果不确定时，委托给 Generic 并检查 apply status；不得把 `agentRunId` 注册为 watched 工作流 run。

状态变化或 handle 消费情况未知时，不得复用 handle。远程调用后本地更新成功，只证明服务记录了返回结果；外部 effect 必须由实时 Zotero 或领域 receipt 证明。

对于部分 workflow 计划提交，保留已启动的运行、待处理条目和未知条目。从驻留状态中不删除任何内容。稍后的传递需要当前操作员指令，并且只能提交待处理的条目。

## 安装与 profile 恢复

profile 初始化期间运行 `scripts/install_zotero_bridge_cli.py`。它安装随附可执行文件并链接 well-known 连接 profile，且不更改 `HOME`。`ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME` 仅用于定位 Zotero 端 profile。

常驻工作前，运行随附 CLI 身份检查，将 protocol、CLI schema、version、build fingerprint 和 command-catalog checksum 与 profile release identity 比较。仅版本匹配不足以证明一致。按服务、profile、已认证 manifest、backend 就绪状态的顺序诊断。

凭据始终留在连接环境中。绝不能把 bearer token 写入 `state.sqlite`、plan 文件、cron YAML、receipt、日志、证据或 profile 文档。可执行文件/profile 身份不一致时，应选择匹配的随附集合，不得组合不同 release 的 asset。

## 当前状态模型

该数据库仅拥有常驻簿记。将每个表用于一个目的。

### `meta`

商店：

- 活动状态Schema标记；
- 最后一次成功的索引刷新；
- 当未分类的驻留数据需要注意时，失败关闭的提交阻止程序。

它不存储用户权限、当前 Zotero 连接真相、workflow 批准或任务结论。

### `library_items`

商店：

- 文献库 ID 和单册密钥；
- 数字项目 ID；
- 项目类型和标题；
- 序列化快照负载；
- 内容摘要和本地更新时间。

该投影支持发现和变更比较。它不证明当前项目状态、附件访问、选择或权限。

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

### `workflow_plans`

商店：

- `planId`；
- 规范计划摘要；
- workflow ID；
- 准备时捕获的实时 workflow 描述摘要；
- 规范计划JSON；
- 注册的绝对输出路径；
- 聚合状态；
- 默认并发；
- 创建、更新和首次提交时间。

聚合状态：

|状态|意义|
| --- | --- |
| `prepared` |所有条目均已验证且没有保留 |
| `partial` |至少有一项已启动且尚未完成 |
| `complete` |每个条目均以已知的运行 ID 启动 |
| `attention` |至少有一项具有不确定的远程影响 |
| `invalid` |不可变的计划或实时 workflow 合同不再匹配 |

没有任何状态意味着“批准”。权限永远不会被保留以供重用。

### `workflow_plan_entries`

商店：

- 计划 ID 和稳定序号；
- 确切的项目-refJSON；
- 条目摘要；
- 进入状态；
- 已知时返回 workflow 运行ID；
- 提交receipt或稳定错误；
- 创建和更新时间。

条目状态：

|状态|意义|自动重播 |
| --- | --- | --- |
| `pending` |仅在当前授权的提交调用下才有资格 |允许在该通话中 |
| `launching` |远程请求之前本地保留|从来没有|
| `launched` |返回有效的运行 ID，并且观察运行链接仍然存在 |从来没有|
| `unknown` |远程效应可能已经发生 |从来没有|

当新调用发现陈旧的 `launching` 时，会将其转换为 `unknown`。没有成功响应并不能证明没有远程运行。

## workflow 计划标识

计划文件使用`zotero-librarian.workflow-plan.v2`。

必填身份字段：

- `planId`；
- `workflowId`；
- `createdAt`；
- `workflowDescriptionDigest`；
- `defaultConcurrency`；
- `submissions`；
- `planDigest`。

规范摘要计算：

1. 删除`planDigest`。
2. 使用排序键和紧凑分隔符将剩余对象序列化为 UTF-8 JSON。
3. 计算SHA-256。
4. 将十六进制摘要存储在文件和数据库中。

提交验证：

- 绝对解析路径；
- 可读的JSON对象；
- Schema标识符；
- 必填身份字段；
- 重新计算的摘要；
- 注册计划 ID；
- 注册摘要；
- workflow ID；
- 规范的JSON；
- 注册的输出路径；
- 当前 workflow-描述摘要；
- 每个待处理条目的实时验证。

任何不匹配都会在远程提交调用之前停止。

不要：

- 将计划复制到另一个路径并提交；
- 编辑refs、workflow ID、并发数、时间或摘要；
- 编辑后修复摘要；
- 使用从不同状态数据库生成的计划；
- 将文件解释为权威。

相反，根据当前的实际情况准备一个新计划。

## 提交状态转换

正常录入：

```text
pending
  -> launching
  -> launched
```

不确定的条目：

```text
pending
  -> launching
  -> unknown
```

正常计划：

```text
prepared
  -> partial
  -> complete
```

不确定的计划：

```text
prepared or partial
  -> attention
```

无效计划：

```text
prepared or partial
  -> invalid
```

远程调用在提交`launching`预留后发生。有效的运行结果与监视的运行一起记录在一个本地事务中。稍后的条目失败无法回滚之前启动的条目记录。

## 故障分类矩阵

|失败|可能的远程影响|状态|安全下一步行动|
| --- | --- | --- | --- |
|失踪`--allow-submit` |无 |计划不变|获取当前授权 |
|相对/不可读的计划路径 |无 |计划不变 |使用注册的绝对文件 |
| JSON 或 Schema 无效 |无 |计划不变|制定新计划 |
|文件/数据库摘要不匹配 |无 |计划不变或无效|请勿编辑；制定新计划 |
|workflow 合同已变化 | 本次调用未提交 | `invalid` |重新描述和重新规划|
|选择重新验证失败 |本次调用中没有 |计划不变 |解决现场选择并重新规划 |
|并发数低于1 |无 |计划不变 |选择一个正有界值 |
|远程提交返回有效的运行 ID |已知发射 | `launched` |监控返回的运行|
|远程提交传输失败 |未知 | `unknown`，计划`attention` |协调最近的实时运行 |
|远程提交缺少运行 ID |未知 | `unknown`，计划`attention` |协调最近的实时运行 |
|预订后进程终止 |未知 |陈旧 `launching` 变为 `unknown` |调和;永不重播 |
|稍后录入失败 |早期的发布仍为人所知|进入失败`unknown` |停止批次；保留早期运行 |
|没有待处理的条目 |无 |保留现有状态 |请勿重新提交 |

## 按域恢复顺序

### 文献库投影

1. 保留失败的刷新receipt和最后可用的数据库。
2. 确定在完成快照接受之前是否发生故障。
3. 保留之前的刷新时间戳。
4. 通过服务运行新的有界完全刷新。
5. 比较计数。
6. 使用实时项目读取来得出当前结论。

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

### workflow 计划

1. 保留计划路径、ID、摘要、workflow ID 和条目状态。
2. 判断故障是发生在预约入场之前还是之后。
3. 对于本地预检失败，如果输入需要更改，请创建新计划。
4. 对于未知的远程效果，请检查活动/最近的匹配运行。
5. 仅通过深思熟虑的协调实施才能将经过验证的运行联系起来；不要手动编辑SQLite。
6. 切勿重播已启动或未知的条目。
7. 获取任何剩余待处理条目的当前授权。

### 维护候选项

1. 保留候选项理由和refs。
2. 读取活动对象/模型。
3. 将语义诊断委托给Generic。
4. 提出可审查的提案。
5. 获得当前授权。
6. 单独验证任何批准的效果。

候选项失踪是一个有效的、不变的结果。它不需要补偿性维护。

## 未知效果恢复

`attention`提交receipt意味着远程状态可能与本地确定性不同。

保存：

- 计划ID和路径；
- 条目序号；
- 项目refs；
- workflow ID；
- 时间戳；
- 桥接错误；
- 所有先前启动的运行 ID；
- 待计数。

检查：

- 当前/最近 workflow 运行；
- 选择/来源标识；
- workflow-特定的去重或提交证据；
- 监视运行缓存；
- 仅在找到运行后才预期下游Product/artifact。

不要：

- 再次提交相同的参赛作品；
- 将条目重置为待处理；
- 删除计划数据库行；
- 在调节之前为同一来源创建一个新计划；
- 从缺少本地运行 ID 推断失败；
- 从类似时间的不相关运行推断成功。

如果无法建立可靠的匹配，则保持该条目未知并报告需要操作员审查。

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
- 未知的计划进入结果。

新的数据库可以改善未来的观察。它无法擦除或证明遥远的历史。

## 恢复报告模板

用途：

> 在接受完整快照之前索引刷新失败。之前的预测仍然可用，但我将使用当前声明的实时读数。

用途：

> 运输失败后，计划条目 2 未知。条目1有记录的 workflow 运行，后面的条目没有启动，也不会发生自动重播。

用途：

> 缓存的 workflow 定义可供发现，但实时描述已更改，因此准备好的计划无效，必须重新构建。

用途：

> 该通知仍未确认，因为其关联操作未成功处理。

不要使用：

- 丢失提交响应后“什么也没发生”；
- “安全重试”，无需 receipt 和实时状态检查；
- 即席 SQL 后“数据库已修复”；
- 仅从观看的终端状态“workflow 完成”；
- 持久计划的“批准计划”；
- 当仅运行一个通道时，“计划已恢复”。

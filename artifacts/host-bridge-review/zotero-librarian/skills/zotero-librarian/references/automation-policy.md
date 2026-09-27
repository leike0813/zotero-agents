# 自动化政策

## 权限矩阵

| Action | Cron | 交互式驻留请求 | 必需证据 |
| --- | --- | --- | --- |
| 刷新本地 index/catalog | 允许 | 允许 | Receipt 与刷新/变更计数 |
| 搜索本地投影 | 当 job 声明时允许 | 允许 | 外部主张需 cache 新鲜度加实时确认 |
| 读取实时 library/Synthesis 状态 | 以一次有界扫描允许 | 允许 | 返回的引用与新鲜度事实 |
| 观察已注册的 runs 或同步 notifications | 作为一遍有界执行允许 | 允许 | Run/event ID 与 receipt |
| 生成卫生、workflow 状态或 attention 提议 | 允许 | 允许 | 候选原因与下一次实时检查 |
| 校验一个 Zotero 托管 workflow | 未随附于 cron | 通过 Generic/CLI 允许 | 当前选择、workflow/选项校验、provider 兼容性 |
| 提交 workflow | 从不 | 仅允许用于已审查的当前范围 | 当前操作者指令、有界并发、Zotero approval 路径 |
| 执行自有 agent handoff | 绝不 | 委托给 Generic | Handoff 契约、本地验证、apply receipt |
| 变更 Zotero 或应用 agent 输出 | 绝不 | 使用 Generic/CLI 契约 | 当前请求、确切目标/效果、Zotero 侧 approval |
| 破坏性维护 | 绝不 | 需要当前目标级人工决策 | 诊断、提案、审批、事后状态 |

本地 cache 与日志写入是常驻簿记，不是变更 Zotero 的权限。先前的 approval、观察到的原生 submission、待处理 workflow、缓存候选或定时建议都不能升级为新的写入。

## Workflow 模式与委派

从实时描述中选择 workflow 所有权。Zotero 托管执行使用 Generic task 策略与精确的 CLI 汇合点；Zotero 插件的原生队列拥有待处理单元排序、有界接纳与槽位生命周期。已接纳的运行可注册并被监控。Provider-profile 决策、workflow 选项、源分组判断与有限研究解读属于继承的 Generic task Skill。

当 workflow 宣示自有 agent 执行时，将整个 handoff 委托给 Generic：准备/检查请求、执行语义工作、验证每个结果、应用映射并检查持久 apply receipt。常驻的受监视 runs 与通知不监督 `agentRunId` 值。

即使存在缓存 catalog 条目也使用实时 workflow 发现。缓存定义帮助选择，但不能确立当前执行模式、backend 兼容性、permissions 或结果 schema。

## 原生提交与 queue 监督

通过捆绑 CLI 描述并验证当前请求：

```sh
zotero-bridge workflow describe --workflow <workflow-id>
zotero-bridge workflow validate \
  --workflow <workflow-id> --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>'
```

检查确切的选择 refs、分开的 `inputs` 与 `validateSelection` 契约、workflow ID、必需选项、provider 要求、候选生成规则、不可变单元分组、预期输出与 approval 边界。空、过期或非有意的选择是未解决的调用范围：操作者的修正 refs 构成新的已审查调用，而原始验证失败仍与其原始 refs 关联。不得在本地重建已准备单元或将缓存的目录数据呈现为实时验证。

操作者授权确切已审查范围与有界并发后，提交一次：

```sh
zotero-bridge workflow submit \
  --workflow <workflow-id> \
  --selection '<reviewed-selection>' \
  --workflow-options '<reviewed-options>' \
  --max-concurrency <bounded-count>
```

有效参数记录当前已审阅的范围，但不能取代 Zotero 侧的 approval。Host 在接纳工作前重新验证实时 workflow 契约与选择。读取返回的 `admission` 分支：直接接纳时保留 `workflowRunId`；host-queue 接纳时保留 `submissionId`、计数、queue 链接与不可变 unit projection。当初始响应有意表示待处理工作时，不要臆造 run handle。

对于排队工作，将 `workflow submission get <submissionId>` 视为聚合准入记录来检查。使用 `workflow queue list` 观察活动单元；仅对仍在待处理的单元使用 `workflow queue cancel <queueId>`。单元一旦准入，就用 `run list --submission <submissionId>` 关联它并监督真实 run。后续提交需要另一条当前指令；不要把原始授权当作无限许可，也不要重放准入效果不确定的单元。

## Provider profiles 与并发

workflow 选择与选项不编码 backend provider profile。若 workflow 需要 backend 所有的 provider 选项，用 Generic 列出/描述 backend profile，独立于 workflow 输入验证 provider JSON，并通过连接二者的确切 CLI 契约提交。连接 profile 与 provider profile 是两个不同概念。

交互式提交默认为并发 1。更高的 `--max-concurrency` 最多同时准入相应数量的原生 unit，并且必须在考虑 backend/provider 限制、成本、item 独立性、apply-back 时长与监控能力后被显式批准。该上界属于此已接受的提交；它不授权将来的工作。

独立记录返回的 `submissionId`、每个单元的 `queueId` 以及每个已接纳 task 或 `workflowRunId`。待处理单元已是已接受原生提交的一部分；它们不需要常驻重启，也不得被解读为失败。接纳不确定时，在下一次调用前检查原始 submission 与按 submission 筛选的任务列表。

## Cron 与维护

每个随附 cron 都是 Zotero 只读且单遍的。它可更新 `state.sqlite`、发出 attention，并在无报告性 delta 时产生 `[SILENT]`。它不能等待、请求 approval、提交、应用、凭假设确认事件、调用用户选择的脚本或写入任意路径。

workflow 状态分诊识别需要审阅的 watched runs。库卫生当前识别重复标题候选。Synthesis attention 报告实时排序的关注条目。这些都是诊断与提案。补救前，调用适当的 Generic task，重读当前对象，说明影响，并取得当前授权。

Synthesis 缓存、索引、sidecar、graph 或指标的维护遵循 Generic Synthesis 与 CLI 契约。空队列或过期的本地投影不是修改派生状态的充分理由。

## 交互与报告

对于等待中的 run，在 reply 或 connect 前检查其实时 `skillRunId` 与声明的动作。权限 ID 在 CLI 中是观察性的；approval 仍发生在限定的 Zotero UI 内。Notification 事件仅在其请求或暗示的后续动作确实处理后确认。

报告 attention（关注项）及其原因、item/run/event 标识符、相关时的缓存新鲜度，以及下一次安全实时检查。区分提案与已启动的 run、已启动的 run 与终止结果、终止结果与已验证的 Products、artifacts 或 Zotero 变更。失败的 receipts 保留稳定代码，并说明重试前所需的实时重读。

## 自然语言自动化决策

常驻请求常使用操作性语言而不点出实际权限边界。使用以下决策模式。

### “观察这个 workflow”

确定：

- 用户是否提供 `workflowRunId`，还是必须注册已知 run？
- 用户想要一次当前状态检查，还是指既有计划？
- 哪些状态或事件可报告？
- 允许交互，还是此遍只应报告？
- 预期输出是否需要超出 run 状态的 Product/artifact 验证？

策略：

- 只注册真实的 Zotero 管理 workflow run。
- 执行一遍 `run watch`。
- 交互使用实时 run 命令。
- 不要等待、休眠或轮询直到完成。
- 不要把自有的 `agentRunId` 放入 watched runs。
- 不要仅因 run 已终态就确认 notification。

### “有事需要关注时告诉我”

确定：

- 哪些域计入：失败/停滞 runs、未处理事件、重复候选、Synthesis attention，还是全部？
- 用户想要每个候选还是只想要达到阈值的候选？
- 这是当前报告还是已存在的周期性计划？

策略：

- 运行产生 attention 的有界趟。
- 保留每个候选的理由与身份。
- 将 `attention` 视为已完成的提案/报告。
- 不要自动变更、重新提交、修复或确认。
- 对任何后续研究或策展使用 Generic 任务策略。

### “保持我的库整洁”

这种措辞永远不构成 mutation authority。

将其转换为：

- 1. 声明的诊断域。
- 2. 一遍式的候选报告。
- 3. 实时重新读取候选对象。
4. 一个 Generic Curation 提案。
- 5. 单独的目标级当前决定。
- 6. 获批准时进行验证写入与持久 receipt。

计划的库卫生维护执行目前识别重复标题候选。重复标题不是重复证明，不能选择幸存者。

### “每晚运行分析”

分离：

- 有限 workflow 选择与校验；
- 操作员批准的验证/提交范围；
- 外部计划配置；
- 逐 run 监控；
- 输出验证。

常驻服务不能安装或修改 cron。随附的 cron 任务有意不提交 workflows。将所请求的节奏报告为外部配置需求；不要修改 cron 文件或暗示计划存在。

### "Answer questions from my library"（回答关于我的库的问题）

用常驻 index 做发现或变更对比，然后把有界答案委托给 Generic Query。实时确认当前事实。不要把仅缓存的结论呈现为当前 Zotero 状态。

### “自动修复任何失败的东西”

拒绝暗示的全盘权限。不同失败可能表示：

- 无远程效果；
- 成功的远程效果但响应丢失；
- 部分原生接纳；
- 缺失 Product 或 artifact；
- provider 不可用；
- 权限被拒；
- 过期的本地投影；
- 破坏性策展含混。

对失败分类并返回下一个安全检查。绝不把“自动”一词变成 mutation 或重放权限。

## 原生提交权限生命周期

### 准备

仅当满足以下条件时，Zotero 管理请求才可进入授权审阅：

- 实时 workflow 描述可用；
- 实时描述暴露分开的执行输入与候选生成契约；
- 原始当前选择无需常驻候选或分组推断即可解析；
- 完整选择通过实时 workflow 校验；
- 必需的 workflow 选项显式且已验证；
- provider 要求通过单独 profile 契约识别并验证；
- 受支持的执行模式是 Zotero 托管；
- 预期 Products、artifacts、实时更改与交互点已知；
- 拟议的并发是此请求的有限正数上界。

审阅记录保持这些值彼此不同：

- workflow 身份与结果；
- 确切选定的 refs 或声明的无选择形式；
- workflow 选项；
- provider profile 身份与已校验的 provider JSON；
- 候选选择与不可变分组行为；
- 提议的原生准入界限；
- 期望的单元到来源关联；
- 预期的 run 与输出证据。

### 审查

操作者审查：

- workflow 结果；
- 确切所选 refs；
- execution 成员与分组契约；
- 候选选择与验证契约；
- 原生 units 的预期数量或形态；
- 预期的 provider/执行边界；
- workflow 选项及其范围效果；
- 本次已接受提交的并发；
- 预期的 run/result 证据；
- Zotero 侧 approval 时机。

审阅不创建队列条目或持久授权。任何期望的变更都要求对照当前实时上下文重新校验。

### 授权

权限是当前的且针对调用的：

- 用户指令必须指向已审查的 workflow、选择、选项与 provider 范围。
- 当有界并发大于 1 时，它必须是已审阅影响的一部分。
- 先前的 submission 不授权另一次 submission。
- 已接纳原生 submission 内的待处理 unit 不需要新的常驻启动决策。
- 增加并发需要在调用前显式考虑并取得授权。
- Zotero 侧 approval 保持独立。

绝不在驻留状态中持久化“approved”标志。那会把过去的决定变成可复用授权。

### 再次验证

远程提交之前：

- 重新描述 workflow；
- 确认执行模式；
- 解析当前选择；
- 校验完整选择与 workflow options；
- 重新验证独立选择的 provider profile；
- 保留精确 JSON 绑定，不把 provider 字段移入 workflow options；
- 确认预期的 unit 分组与输出契约；
- 确认已授权的并发界限。

任何不匹配在远程效果前封闭失败。

### 通过 Zotero 准入

提交已审阅的请求一次。然后：

1. 在选择监视族前读取 `admission`。
2. 直接接纳时，保留返回的任务身份与 `workflowRunId`。
3. 对 host-queue 接纳，保留 `submissionId`、单元计数、队列链接与每个不可变 `queueId`。
4. 检查提交投影中的待处理、已准入、终态、失败与已取消 units。
5. 通过提交谱系筛选器关联已准入任务。
6. 仅在目标单元仍待处理时使用队列取消。
7. 仅在真实 run 句柄存在后使用 run 取消或交互。
8. 在监督全程把源 refs 与预期输出附到每个单元上。

Zotero 插件拥有待处理单元排序、接纳与槽位释放。常驻 profile 不预留单元、不启动下一条目，也不运行重放 worker。

### 监督并报告

交互式提交证据声明：

- 直接或 host 队列准入；
- 排队时保留 `submissionId`；
- 聚合单元计数与链接；
- 不可变的 unit identity；
- 存在时给出已接纳 task 与 run 身份；
- 请求时的待处理取消 receipts；
- 存在时保留不确定的传输或状态证据。

监督报告区分：

- 原生队列已接受的待处理单元；
- 接纳前被取消的 units；
- 已接纳或运行中的任务；
- 终态成功任务；
- 终态失败任务；
- 其 Product、artifact 或实时变更验证不完整的任务。

该证据证明观察到的原生准入与执行状态。它不证明输出质量、Product 交付、Zotero 回写或用户研究结果的完成。

## Provider、选项与不支持的提交

交互式路径将一份经审查的请求发送到 Host 验证，并把候选生成与不可变分组委托给实时 workflow 契约。满足以下条件时路由到 Generic：

- 必需的 workflow 选项需要语义选择或澄清；
- 必须选择或验证 provider profile；
- workflow 使用自有 Agent 执行；
- 需要无选择执行；
- 任务需要自定义结果处理或 apply-back。

不要剥离必需选项、静默选择默认 provider、将自有 workflow 转成 Zotero 受管理的 workflow，或在本地重建 Host 已准备的单元。

## 并发决策

默认并发 1 是安全边界，不是性能上的偶然。所选值成为此提交的原生 queue 准入上界。

仅在以下情况提高并发：

- 条目相互独立；
- provider/backend 容量已知；
- 预期成本可接受；
- 监控可区分每个 run；
- 提交谱系可将每个已准入单元与其源身份关联；
- 一个失败不使另一个失效；
- operator 授权本次提交的精确界限。

在以下情况不要提高并发：

- 选择重叠；
- 写入可能冲突；
- provider 配额不确定；
- 可能需要 run 交互；
- apply-back 可能以实质不同的时长占用原生槽位；
- workflow 结果顺序很重要；
- 较早的提交状态未知。

并发值仅适用于当前提交调用。它配置 Zotero 的原生队列；它不创建常驻队列 worker、不预留本地条目，也不授权未来提交。待处理原生单元已是已接受的工作，不得被重新提交以模拟进度。

## Cron 决策模型

随附 cron 拥有节奏；服务拥有单趟。保持这些职责分离。

Cron 可以：

- 刷新本地投影；
- 比较状态；
- 已知 run 监视一次；
- 同步轻量通知；
- 生成 workflow 状态、卫生或 attention 报告；
- 对 `[SILENT]` 输出 `unchanged`。

Cron 不得：

- 提交或重新提交 workflow；
- 执行自有交接；
- 确认事件而无处理动作；
- 变更 Zotero；
- 应用结果；
- 运行破坏性 maintenance；
- 等待交互；
- 创建另一个计划。

若用户请求新节奏，报告：

- 预期的 service 命令；
- 读/写权限；
- 期望的报告阈值；
- 外部计划需求。

不要将 profile 计划编辑作为普通 Skill 执行的一部分。

## Attention 与升级 playbooks

### 等待中的 run

1. 读取实时 run 状态。
2. 解析当前 `skillRunId`。
3. 检查声明的操作。
4. 报告所需交互。
5. 只在匹配的 Generic/CLI 契约下 reply 或 connect。
6. 处理后确认相关 notification。

### 失败 run

1. 保留 run 与 workflow ID。
2. 检查结构化失败与预期输出。
- 3. 判断是否存在任何 Product/artifact。
4. 分离 provider 失败、workflow 失败、缺失输出与 Zotero 应用失败。
5. 把有限的语义重试决定路由给 Generic。
6. 不要从 notification 重新提交。

### 未知提交

1. 保留已返回或先前观察到的 `submissionId`、单元 `queueId` 值、选择 refs 与结构化错误。
2. 在寻找替代操作前检查原生 submission projection。
3. 将已接纳工作与按 submission 过滤的任务发现及真实 run 状态关联。
4. 调和已准入 runs 与受监视状态，而不把受监视 run 日志当作队列权威。
- 5. 不要重放选择或任何准入效果仍未知的单元。
6. 仅证明早期调用未产生被接受的 submission 或已准入任务并获得新权限后，才做新提交。

### 卫生候选

- 1. 保留候选理由与 item refs。
2. 读取两个实时对象。
- 3. 判断它们是重复、版本还是误报。
4. 把提案构造委托给 Curation。
- 5. 要求确切的破坏性权限。

### Synthesis 关注项

1. 检查实时 attention 条目。
2. 解析模型身份与新鲜度。
3. 将解释委托给 Generic Synthesis。
4. 单独诊断 maintenance。
5. 不要仅凭 queue 成员关系变更派生状态。

## 报告用语

用法：

> 单趟 run 检查发现两个 run 需要审阅。未提交或重试任何 workflow。

用法：

> 原生提交的响应不确定。我保留了其 submission 与 unit handles，并在任何替换调用前停下。任何新提交前必须调和原始提交投影与关联任务。

用法：

> 每周卫生遍发现三组重复标题。这些是审查候选，不是已确认的重复。

请勿使用：

- 一遍式检查却称"持续监控"；
- “approved”用于缓存校验或驻留状态；
- attention 提议用"fixed"；
- 对输出未核实的终态 run 用“completed”；
- 未配置外部计划时称 "scheduled"；
- 远程影响未知时“可安全重试”。

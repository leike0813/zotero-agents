# 自动化政策

## 权限矩阵

| 动作 | Cron | 交互式常驻请求 | 所需证据 |
| --- | --- | --- | --- |
| 刷新本地 index/catalog | 允许 | 允许 | Receipt 及 refresh/change 计数 |
| 搜索本地 projection | job 声明时允许 | 允许 | 缓存新鲜度；对外部主张还需实时确认 |
| 读取实时文献库/Synthesis 状态 | 允许单次有界 pass | 允许 | 返回的 ref 与新鲜度事实 |
| 监控已注册 run 或同步通知 | 允许单次有界 pass | 允许 | Run/event ID 与 receipt |
| 生成 hygiene、workflow-status 或 attention proposal | 允许 | 允许 | 候选原因与下一项实时检查 |
| 规划 Zotero 托管工作流 | 随附 cron 不执行 | 允许 | 当前 selection、工作流校验、已持久化 plan |
| 提交工作流 | 禁止 | 仅允许提交已审阅 plan | 操作员当前指令、`--allow-submit`、Zotero approval 路径 |
| 执行 Agent 自主 handoff | 禁止 | 委托给 Generic | Handoff 合同、本地校验、apply receipt |
| 修改 Zotero 或应用 Agent 输出 | 禁止 | 使用 Generic/CLI 合同 | 当前请求、精确 target/effect、Zotero 端 approval |
| 破坏性维护 | 禁止 | 需要当前目标级人工决策 | 诊断、proposal、approval、事后状态 |

本地缓存与 journal 写入属于常驻记账，不构成修改 Zotero 的权限。既往 approval、旧 plan、pending 工作流、缓存候选项或定时 proposal 都不能升级为新的写入授权。

## workflow 执行模式与委托

根据实时描述选择工作流所有权。常驻 plan helper 支持对当前 selection 进行 Zotero 托管执行，并生成可注册、可监控的 run。provider profile 决策、超出该 helper plan 合同的工作流选项，以及有边界的研究判断，均属于继承的 Generic 任务 Skill。

工作流声明支持 Agent 自主执行时，将整个 handoff 委托给 Generic：准备/检查请求、执行语义工作、校验每项结果、应用映射并检查持久 apply receipt。常驻 watched run 和通知不监管 `agentRunId`。

即使存在缓存 catalog 条目，也必须使用实时工作流发现。缓存定义可辅助选择，但不能确定当前执行模式、backend 兼容性、permission 或结果 schema。

## Plan 与 submit

从当前上下文创建确定性 plan：

```sh
scripts/zotero_librarian_service.py workflow plan \
  --workflow <workflow-id> --from-context \
  --output <absolute-plan.json>
```

检查`receipt.data.selectionRefs`、`inputUnit`、workflow ID、`planId`、`planDigest`、workflow 合约摘要、`defaultConcurrency`、条目以及`receipt.data.path`中返回的文件。如果选择为空、过时或包含意外对象，请更正 Zotero 选择并生成新计划。请勿手动编辑该文件并将其表示为经过服务验证。

操作员针对该确切 plan 授权后再提交：

```sh
scripts/zotero_librarian_service.py workflow submit \
  --plan <absolute-plan.json> --allow-submit
```

显式标志记录了当前操作员权限，但不能替代 Zotero 侧审批。该服务在远程调用之前验证文件、注册路径、计划摘要、实时 workflow 合同以及每个待处理的选择。保留每个返回的运行和剩余计划条目的计数。对剩余条目的另一次传递需要另一条当前指令；不要将原始授权视为无限期批量授权或重放标记为已启动或未知的条目。

## Provider profile 与并发

常驻 plan 文件不编码 backend provider profile。若工作流需要 backend 所有的 provider 选项，应使用 Generic 列出/描述 backend profile，将 provider JSON 与工作流输入分开校验，并通过汇合两者的精确 CLI 合同提交。连接 profile 与 provider profile 是不同概念。

常驻提交默认并发为一。较高的 `--concurrency` 在当前 pass 最多启动相应数量的 plan 条目；必须在考虑 backend/provider 限额、成本、条目独立性和监控能力后明确批准。绝不能用大数值模拟无人值守队列。

分别记录每个已启动的 `workflowRunId`。部分启动不表示剩余条目失败，也不表示其已获后续运行授权。某次启动结果不确定时，重新提交该条目前先检查近期实时 run。

## Cron 与维护

每个随附 cron 均只读 Zotero 且只执行单次 pass。它可以更新 `state.sqlite`、发出 attention，并在无可报告变化时输出 `[SILENT]`；不能等待、请求 approval、submit、apply、凭假设确认事件、调用用户选择的脚本或写入任意路径。

Workflow-status triage 识别需要审阅的 watched run。Library hygiene 当前识别标题重复候选项。Synthesis attention 报告实时排序条目。这些都属于诊断和 proposal。修复前必须调用合适的 Generic 任务、重新读取当前对象、解释 effect 并获得当前授权。

Synthesis cache、index、sidecar、graph 或 metric 的维护遵循 Generic Synthesis 与 CLI 合同。队列为空或本地 projection 过期，不足以构成修改派生状态的理由。

## 交互与报告

对于等待中的 run，回复或连接前先检查实时 `skillRunId` 和声明动作。permission ID 在 CLI 中只供观察；approval 仍位于有 scope 的 Zotero UI。只有通知事件要求或隐含的后续动作已实际处理后，才确认该事件。

报告 attention 时给出原因、item/run/event 标识符、必要时的缓存新鲜度，以及下一项安全实时检查。区分 proposal 与已启动 run、已启动 run 与终态结果，并区分终态结果与已验证的 Product、artifact 或 Zotero 变更。失败 receipt 保留稳定错误码，并说明重试前需要进行的实时重读。

## 自然语言自动化决策

驻留请求经常使用操作性语言，而不指定实际的权限边界。使用以下决策模型。

### “看这个 workflow”

确定：

- 用户是否提供`workflowRunId`，或者必须注册已知的运行？
- 他们想要进行一次当前状态检查还是参考现有时间表？
- 哪些状态或事件是可报告的？
- 是否允许交互，或者单次执行应该只报告？
- 预期输出是否需要运行状态之外的Product/artifact验证？

政策：

- 仅注册真正的 Zotero 管理的 workflow 运行。
- 执行一次 `run watch` 遍。
- 使用实时运行命令进行交互。
- 在完成之前不要等待、休眠或轮询。
- 请勿将自有的`agentRunId`放置在观看的跑步中。
- 不要仅仅因为运行已结束而确认通知。

### “当有事情需要注意时告诉我”

确定：

- 哪些领域重要：失败/停滞的运行、未处理的事件、重复的候选者、Synthesis 注意力，还是所有这些？
- 用户想要每个候选者还是只想要一个阈值？
- 这是当前报告还是现有的定期计划？

政策：

- 运行有限的注意力产生通道。
- 保留每个候选项的理由和身份。
- 将`attention`视为已完成的提案/报告。
- 请勿自动修改、重新提交、修复或确认。
- 使用Generic 任务策略进行任何后续研究或管理。

### “保持我的文献库清洁”

这种措辞永远不够写入变更权威。

将其转换为：

1. 声明的诊断域。
2. 一次性候选项报告。
3. 实时重读候选对象。
4. Generic 整理提案。
5. 单独的当前目标级别决策。
6. 如果获得批准，则经过验证的写入和耐用receipt。

预定的文献库整理单次执行目前可以识别重复标题的候选者。重复的标题不是重复的证明，也不能选择幸存者。

### “每晚进行分析”

分开：

- 有限 workflow 选择和验证；
- 运营商批准的计划/提交；
- 外部时间表配置；
- 每次运行监控；
- 输出验证。

常驻服务无法安装或修改cron。已发送的cron作业故意不提交workflows。将请求的节奏报告为外部配置需求；不要修改 cron 文件或暗示时间表存在。

### “回答我文献库的问题”

使用常驻索引进行发现或更改比较，然后将有界答案委托给Generic 查询。现场确认当前事实。不要将仅缓存结论公开为当前 Zotero 状态。

### “自动修复失败的地方”

拒绝暗示的一揽子权威。不同的故障可能代表：

- 无远程影响；
- 成功的远程效果但失去响应；
- 部分 workflow 发射；
- 缺少 Product 或 artifact；
- provider 不可用；
- 拒绝许可；
- 陈旧的局部投影；
- 破坏性的整理模糊性。

对故障进行分类并返回下一个安全检查。切勿将“自动”一词变成写入变更或重放权限。

## workflow 计划权限生命周期

### 准备

仅在以下情况下才准备计划：

- 实时 workflow 描述可用；
- 选择合约使用由助手支持的输入单元；
- 每个选定的对象根据该输入单元进行标准化；
- 每个条目都通过实时 workflow 验证；
- 没有不支持的必需 workflow 选项或隐藏 provider 输入；
- 接受绝对输出路径；
- 计划文件和数据库注册表共享相同的标识。

该计划存储：

- `schema: zotero-librarian.workflow-plan.v2`；
- `planId`；
- `workflowId`；
- 创建时间；
- workflow 描述摘要；
- 默认并发；
- 经验证的提交内容；
- 规范的`planDigest`。

### 评论

运营商点评：

- workflow 结果；
- 准确selection ref；
- 输入单元；
- 条目数量；
- 预期provider/执行边界；
- 规划路径并摘要；
- 下一次传递的并发性；
- 预期运行/结果证据。

审阅不会改变文件。任何想要的改变都需要根据实际情况制定新的计划。

### 授权

权限是当前的且特定于调用：

- `--allow-submit` 必须存在。
- 用户说明必须参考经过审查的确切计划。
- 先前的提交不会授权剩余的条目。
- 增加并发性需要明确的考虑和授权。
- Zotero 方审批保持独立。

切勿在计划数据库中保留“已批准”标志。这会将过去的决定转化为可重用的权威。

### 再次验证

远程提交之前：

- 读取绝对文件；
- 验证Schema和必填字段；
- 重新计算规范摘要；
- 匹配计划ID、摘要、输出路径、workflow ID、注册的JSON；
- 重新描述 workflow；
- 匹配 workflow 描述摘要；
- 重新验证为此通道选择的每个条目。

任何不匹配都会在远程生效之前关闭。

### 预留并启动

对于每个符合资格的参赛作品：

1. 坚持`launching`。
2. 调用远程 workflow 提交。
3. 在有效返回的 `workflowRunId` 上，保留 `launched` 并在一个本地事务中监视运行。
4. 如果出现传输错误或缺少运行 ID，请保留 `unknown`。
5. 在`unknown`后停止批次。

只有`pending`参赛作品符合资格。 `launched`、`unknown` 和过时的 `launching` 条目永远不会自动重播。

### 报告

提交receipt指出：

- 计划 ID；
- 在此单次执行中启动的运行；
- 剩余待处理计数；
- 存在时不确定进入；
- 已知发布的状态`changed`；
- 状态`attention`表示未知的远程效果。

这个receipt证明了返回结果的本地记录。它不证明 workflow 完成、输出质量、Product交付或 Zotero 写回。

## 提供商、选项和不受支持的计划

驻留计划助手故意 handles 只有简单的当前选择连接才能安全验证。前往Generic 的路线：

- 必需的 workflow 选项不由帮助器表示；
- 必须选择或验证providerprofile；
- workflow 使用自有的agent执行；
- 选择合同接受帮助者不支持的单位；
- 不需要选择执行；
- 一个 workflow 条目需要一个多项目分组，而不是由一个选定的ref表示；
- 该任务需要自定义结果处理或apply-back。

不要删除必需的选项，默默地选择默认的 provider，将自有的 workflow 转换为 Zotero 管理的选项，或者仅仅为了让助手接受它而拆分分组的选择。

## 并发决策

默认并发一是一个安全边界，而不是性能事故。

仅在以下情况下增加并发性：

- 条目是独立的；
- provider/backend容量已知；
- 预期成本是可以接受的；
- 监控可以区分每次运行；
- 一个人的失败并不意味着另一个人的失败；
- 操作员授权此通道的确切边界。

在以下情况下不要增加并发性：

- 选择重叠；
- 写入可能会发生冲突；
- provider配额不确定；
- 可能需要运行交互；
- workflow 结果顺序很重要；
- 先前的条目状态未知。

并发值仅适用于当前的提交调用。它不会创建队列工作人员或授权后续单次执行。

## Cron决策模型

随附 cron拥有节奏；该服务负责一次单次执行。将这些责任分开。

克朗可能：

- 刷新本地投影；
- 比较状态；
- 观看已知运行一次；
- 同步轻量级通知；
- 生成 workflow-状态、整理或attention 报告；
- 为 `[SILENT]` 发出 `unchanged`。

克朗可能不会：

- 提交或重新提交 workflow；
- 执行自有交接；
- 确认事件而不处理操作；
- 写入变更 Zotero；
- 应用结果；
- 进行破坏性维护；
- 等待交互；
- 创建另一个时间表。

如果用户请求新的节奏，请报告：

- 预期的服务命令；
- 读/写权限；
- 期望的报告阈值；
- 外部调度要求。

请勿将编辑 profile 计划作为普通 Skill 执行的一部分。

## Attention 与升级 playbook

### 等待运行

1. 读取实时运行状态。
2. 解析当前的`skillRunId`。
3. 检查已声明的操作。
4. 报告所需的交互。
5. 仅在匹配的Generic/CLI合同下回复或连接。
6. 处理完毕后确认相关通知。

### 运行失败

1. 保留运行 ID 和 workflow ID。
2. 检查结构化故障和预期输出。
3. 判断是否存在Product/artifact。
4. 单独的provider故障、workflow 故障、丢失输出和 Zotero 应用故障。
5. 将有限语义重试决策路由至Generic。
6. 不要从通知中重新提交。

### 未知提交

1. 保留计划 ID、条目序号、选择 refs 和错误。
2. 检查实时活跃/最近运行的比赛。
3. 与监视状态协调。
4. 不要重播未知条目。
5. 仅在证明不存在早期运行/效果并获得新权限后才能创建新计划。

### 文献库整理候选项

1. 保留候选项原因和项目refs。
2. 读取两个活动对象。
3. 确定它们是否重复、版本或误报。
4. 将提案构建委托给 Curation。
5. 需要精确的破坏力。

### Synthesis attention

1. 检查实时关注条目。
2. 解决模型的同一性和新鲜度。
3. 将解释委托给GenericSynthesis。
4. 单独诊断维护。
5. 不要仅从队列成员身份改变派生状态。

## 报告语言

用途：

> 一次运行检查发现有两次运行需要审查。未提交或重试任何 workflow。

用途：

> 条目 2 的提交结果不确定。我保留了计划标识并在后续条目之前停止。在任何新计划之前必须协调最近的实时运行。

用途：

> 每周整理任务发现了三个重复标题的组。这些是审查候选者，而不是确认的重复者。

不要使用：

- “持续监控”以进行一次性检查；
- 对于存储的计划“已批准”；
- 关注提案“固定”；
- “已完成”表示输出未经验证的终端运行；
- 当没有配置外部计划时为“已计划”；
- 当远程效果未知时“安全重试”。

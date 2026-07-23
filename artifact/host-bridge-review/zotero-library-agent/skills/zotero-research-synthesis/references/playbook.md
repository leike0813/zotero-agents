# 研究综合操作手册

## 综合模型选择

根据问题选择派生模型：

| 模型 | 用途 | 不得推断 |
| --- | --- | --- |
| Topic list/membership | Topic 发现与论文 membership | membership 证明一致意见或与每个子问题相关 |
| Topic context/report/review input | 已识别 topic 的不同读取视图 | 一个视图包含完整来源记录 |
| Graph overview/slice | 全局摘要或有界邻域 | 由连通性推断因果 |
| Layout/metrics/query cluster | 坐标、计算 metric 或 topic scope cluster | 由排序或邻近推断学术认可 |
| External-reference/library-paper ranking | 候选优先级 | 文献搜索的完整性 |
| Library/reference index | 派生索引记录 | 当前书目写入状态 |
| Resolver | 根据标签、分类、ref 与 combine rule 得到论文 scope | 超出返回有界集合的身份 |
| Artifact manifest/read/export | 发现、内容访问与文件交付 | 从本地文件存在推断已持久化到 Zotero |
| Attention queue | 排序后的审阅候选项 | 修复它们的权限 |
| Concept/schema | 类型化语义定义 | 原始 Zotero 元数据搜索 |

解释前解析所选 topic、paper ref、graph scope、resolver selector、artifact 身份或 schema。记录模型身份与分页完成状态，使其他任务能够复现来源边界。

## 来源与新鲜度纪律

关联来源前陈述研究问题与纳入规则。对每项结论区分：

- 直接书目或来源事实；
- 已记录笔记或批注；
- 插件派生的 topic、graph、index、resolver 或 artifact 事实；
- 工作流生成解释；
- 自身比较或推断；
- 分歧与缺失证据。

答案依赖新鲜度时检查当前 cache 与 index 状态。过期派生视图仍可证明其记录状态，但不能证明最新文献库。通过各自实时所属命令确认当前 selection、附件、permission、Product 和任何请求写入。

保留冲突来源，不得将其平均成虚假共识。说明 gap 是“在声明来源边界内未找到”“未在派生 index 中表示”，还是“来源材料不可用”。

## 工作流与维护边界

期望综合需要工作流声明的可复用行为、provider 执行或多 artifact 输出时使用工作流。描述 requirements，校验来源 selection 和工作流选项，单独校验 provider profile，并仅以支持模式提交。保留 `workflowRunId`、相关 `skillRunId`、交互、终态与预期输出身份。

Topic 创建与更新有不同身份要求：从明确新 seed 创建；只更新已识别当前 topic。在请求的 topic report、topic ID、artifact 或 Product 检查前，工作流终态只是中间证据。

维护 operation 是独立合同：

- reference-sidecar refresh 更新其自身来源 basis 并返回 operation receipt；
- citation-graph update 消费已提交 scope 与预期 reference basis；
- graph metric refresh 修复已持久化复杂 metric；
- cache invalidation 只影响其声明支持 scope；
- 本地常驻 index refresh 不是 Synthesis index operation。

维护前运行诊断。保留每项 operation ID、approval、pre-state、post-state、成功/失败 ref、retryability 与 basis hash。若 `stateChange` 或 handle 消费情况不确定，再次尝试前查询该 operation 的持久 receipt。

## 有序综合生命周期

对完整有界研究 bundle，维护独立阶段证据：

1. 获取预期文献 scope，并保留成功实时 item ref 与 provenance。
2. 为成功或明确选择的父条目生成文献分析 artifact；保持逐篇失败可见。
3. 为已提交论文 scope 刷新 reference sidecar，并保留 `reference_basis_hash` 与结果 partition。
4. 使用预期 basis hash 更新 citation graph。不匹配时检查 sidecar 状态，并决定是否应重新 refresh。
5. 通过匹配工作流创建或更新 topic synthesis，并验证 topic 身份与 report。
6. export 研究 bundle，识别预期 Product 或 artifact asset，下载并验证文件元数据或 digest。

只有当前证据已满足前置条件时，才能跳过某阶段。从首个缺失稳定 receipt 或 artifact 处恢复；绝不能仅因后续 export 失败而重跑更早 mutation 或 maintenance。

## 恢复与易错边界

- graph edge、cluster 或 ranking 都只是计算关系，除非来源证据支持更强主张。
- 空 topic/index/resolver 结果本身不能证明需要维护；先检查 scope 与状态。
- 部分 sidecar receipt 要求从依赖已刷新 references 的 graph 主张中排除失败 ref。
- basis 不匹配需要新的状态决策，不能绕过比较。
- 论文 scope graph update 可能要求已有 graph；有意选择的 library scope 具有不同 effect 与 approval 边界。
- 工作流需要用户交互时，保留其确切 run/skill handle 并请求决策，不得更换工作流。
- 终态 run 缺少 report、topic、Product 或 artifact 时，返回带 run 证据的 missing-output 失败。
- 用户要求把解释持久化到 Zotero 时，呈现建议笔记、标签、关系或文件，并以新权限路由给 curation。
- 持续 topic refresh 或 queue 监控属于托管 facet，不属于此有界任务。

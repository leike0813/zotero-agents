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

## 派生模型决策记录

当多个 Synthesis 模型都可能回答问题时，使用决策记录：

```text
research_question:
selected_model:
alternative_models_considered:
selection_reason:
source_scope:
model_identity_or_schema:
freshness_status:
paging_or_slice_boundary:
excluded_interpretations:
follow_on_read:
```

可用于判别的典型选择：

- 选择 topic membership 建立 paper set，再选择 topic report 进行叙述性综合；
- 选择 graph slice 获取有界 neighborhood，选择 metrics 获取计算结构属性，选择 source read 进行学术解释；
- 当 paper set 由 tag、collection 与 ref 组合定义，而非来自现有 topic 时，选择 resolver；
- 在 artifact read 前选择 artifact manifest；内容选择会影响结果时，在 export 前先 read；
- 仅使用 attention queue 排定 review candidate 优先级，提出 maintenance 前先诊断所属模型。

只有备选方案确实合理且会改变解释时才记录被拒方案。这样既能审计决策，也不会把每次简单读取都变成 planning artifact。

## Maintenance 前置条件与 receipt

| Maintenance operation | 所需前置证据 | 需保留的 receipt field | 需检查的 postcondition |
| --- | --- | --- | --- |
| Reference-sidecar refresh | 明确 paper scope 与当前 sidecar 诊断 | Operation ID、successful/failed ref、retryability、basis hash | Sidecar status 与逐论文结果 |
| Citation-graph update | 已提交 scope 与兼容的预期 reference basis | Operation ID、scope、basis comparison、result partition | Graph status 与请求的 slice/overview |
| Graph metric refresh | 现有 graph state 与缺失/过期 metric 诊断 | Operation ID、metric scope、approval、failure | 请求的持久 metrics |
| 受支持的 cache invalidation | 已命名 cache scope，以及无法安全读取过期状态的原因 | Operation ID、invalidated scope、state change | 对所属模型进行 fresh read |
| Topic create/update workflow | Create 使用 new seed；update 使用现有 topic identity | Workflow run、interaction、terminal state | Topic identity、membership、report |

保守解释 receipt：

- `stateChange: applied` 表示已声明 operation 改变了状态，不表示每个下游 model 或 export 都已完成；
- partial success 只确立成功 partition，失败 ref 不得进入依赖 freshness 的主张；
- handle consumption 不确定时，重试前必须查询 receipt；
- terminal workflow receipt 仍需检查承诺的 topic、Product、report 或 artifact；
- basis mismatch 是诊断边界，不是省略 expected basis 的许可。

如果 operation 报告没有变更，应区分“已经最新”“scope 为空”与“请求被拒”。只有第一种可以在不采取其他操作的情况下满足 freshness 前置条件。

## Export 证据矩阵

| Export 路径 | 传输前身份 | 字节级证据 | 允许的持久性主张 |
| --- | --- | --- | --- |
| Product asset download | Product ID 与所选 asset | 返回的 filename/media type、size，以及提供时的 checksum | 该 Product asset 的已验证本地副本 |
| Synthesis artifact export | Artifact manifest entry 与请求的 format/filter | Export handle 加已验证字节 | 已命名 artifact 的本地 export |
| Workflow output file | Workflow run 与 output/artifact mapping | Output schema 加 file checksum/size | 已生成 workflow artifact |
| Zotero attachment delivery | 实时 parent 与 attachment ref | 签发的 file handle 加已验证字节 | 现有 attachment 的读取副本 |
| 将 export 结果附加到 Zotero | Source Product/artifact、uploaded file handle、target parent | Source 与 upload checksum 加实时 child ref | 仅在实时确认后的持久 Zotero attachment |

Export manifest 或 file path 证明已经发现，不证明交付成功。已验证本地文件证明交付，不证明 Zotero attachment。如果最终 bundle 包含多个 asset，逐一清点 role 与 checksum，并说明哪些 asset 被有意排除。

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

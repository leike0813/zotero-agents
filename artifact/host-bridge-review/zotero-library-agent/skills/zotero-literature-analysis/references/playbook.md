# 文献分析操作手册

## 来源可用性与证据层级

选择分析主张前，先确定每个条目的最强当前来源层级：

| 可用来源 | 适用主张 | 必须说明的限制 |
| --- | --- | --- |
| 书目元数据 | 身份、出版事实、已索引字段 | 不得主张未公开的方法或结果 |
| 摘要 | 摘要明示的目的、概括方法/结果 | 标注基于摘要；不得重构完整论证 |
| 笔记或批注 | 已记录摘录和读者观察 | 保留笔记/批注身份，并区分作者文本与评论 |
| OCR 或部分内容视图 | 可用 chunk 中可见的主张 | 标明缺失页面、识别不确定性与不连续处 |
| 已交付全文 | 已检查章节支持的问题 | 保留 page/section/chunk locator 与文件验证事实 |
| 生成的 digest 或分析 artifact | 既往解释及声明来源基础 | 除非当前任务明确分析该 artifact，否则视为次级来源 |

组合来源前解析版次、译本、版本和附件身份。条目有多个附件时，识别由哪一个提供证据。按文件合同验证交付字节，并避免暴露超出问题所需的私有内容。

## 分析流程

1. 将请求转化为明确分析问题；对于比较，定义适用于每个来源的稳定维度。
2. 解析条目集合及每个条目的可用证据层级。
3. 提取带 locator 的相关段落、字段、批注或观察。
4. 区分来源陈述与自身解释、方法评估、比较及不确定性。
5. 使用矛盾段落和缺失数据检验结论，不得依据预期填补空白。
6. 生成请求交付物，并为实质主张附加内联来源证据。

论文 digest 应按请求目的组织；用户提出聚焦问题时，不使用通用模板。比较矩阵使用对等标准，以 `not available` 显示缺失，不得静默改变维度。citation 或 reference analysis 区分被引记录元数据、引文上下文及自身对影响的推断。

审阅批注时，保留返回的 quote、comment、color/category、page 或 position 及父条目。读者批注可证明标记或记录了什么，但不一定代表论文作者主张。

## 工作流生成分析

已声明文献分析工作流提供稳定多 artifact 合同、后台 provider 执行或重复逐篇处理时使用它。提交前描述并校验当前输入。多篇论文默认串行或显式有界并发，使 provider 限额和逐条目 receipt 可归因。

使用各自 `workflowRunId` 监控每个已提交 Zotero 托管 run。分别记录成功与失败父条目 ref。工作流承诺 digest、结构化 references 和 citation analysis 时，检查每个预期 artifact，不得只接受 run 终态。

Agent 自主执行遵循协调器 handoff 合同：检查每个请求、按各请求 schema 生成输出、在本地校验，并且仅通过已审阅映射 apply。即使结构校验成功，分析质量决策仍由 Agent 负责。

## 交付物与完成证据

常见交付物包括：

- 带来源身份与证据层级的聚焦 digest；
- 带 locator 与不确定性的提取表；
- 使用稳定维度的跨论文比较；
- 方法/结果/局限分析；
- 批注派生的主张图；
- 报告 artifact 及其实质结论的内联证据；
- 每篇成功论文的已校验工作流 artifact。

声明文件 artifact 的 path、role 与 media type。机制提供 checksum 或字节数时，将其放入面向来源的 evidence。本地报告证明分析已生成，但不证明 Zotero 包含它。用户请求 Zotero 笔记、附件、标签或元数据更新时，先完成分析 artifact，再把单独写入路由给 curation。

完成需要覆盖请求分析维度，明确不可用证据，保证结论可追溯，并清楚区分 extraction 与 inference。宁可给出较小但真实的答案，也不要给出暗示阅读了未读内容的宽泛报告。

## 分析交付物模式

依据用户需要做出的决策选择模式：

| 交付物 | 内部结构 | 证据重点 |
| --- | --- | --- |
| 聚焦论文摘要 | 问题、答案、支持段落、局限 | 最强可用来源层级与精确 locator |
| 方法提取 | Population/data、design、variable、procedure、analysis、validity limit | 平行 field；缺失处填写 `not available` |
| 结果提取 | Outcome、estimate/direction、condition、uncertainty、author interpretation | Table/figure/section 与分析单位 |
| 跨论文比较 | 稳定维度、逐论文条目、一致点、矛盾点 | 等价来源层级，或显式的不对称 |
| 主张—证据图 | Claim、source statement、evidence type、support/challenge relation | 区分作者主张与 Agent inference |
| 批注综合 | Reader theme、引用/标记段落、comment、开放问题 | Annotation identity、position 与 parent source |
| Workflow artifact 审计 | Expected output、schema validity、source basis、content adequacy | Run identity 加每个已检查 artifact |

一份交付物可以组合多种模式，但每个 section 应保持一种证据语法。例如，比较可以包含短摘要，但结论仍须指向共享比较维度，而不能仅依赖叙述摘要。

对于结构化输出，在提取前选择稳定 field name。对于叙述输出，当答案跨越多篇论文或多个来源层级时，应先构建内部证据表，避免流畅文字掩盖支持缺失。

## 比较与矛盾处理

解释结果前先建立比较框架：

```text
comparison question:
unit of comparison:
dimensions:
source level per item:
normalization decisions:
missing-value policy:
contradiction test:
```

在认定矛盾之前，先对表面分歧分类：

| 差异 | 诊断问题 | 报告方式 |
| --- | --- | --- |
| Population 或 corpus | 研究对象、dataset 或 period 是否不同？ | 条件性差异，而非直接矛盾 |
| Construct 或 measure | 相似 label 是否代表不同 variable？ | 保留 definition，避免数值比较 |
| Method 或 model | Design choice 能否解释结果？ | 比较 assumption 与 sensitivity |
| Outcome direction | Estimate 是否针对相同 outcome 与 scale？ | 对齐后才可认定直接矛盾 |
| Interpretation | 作者是否从兼容 finding 推导出不同 mechanism？ | 区分实证一致与解释分歧 |
| Version 或 edition | 来源是否在版本之间变化？ | 把主张归于确切版本 |
| Evidence level | 某项结论是否仅基于 abstract 或 annotation？ | 标出不对称；不得拉平置信度 |

完成对齐后矛盾仍存在时，呈现各方最强支持、相关方法差异，以及能够判别它们的额外证据。除非任务明确定义系统聚合方法，否则不得以票数解决分歧。

## 证据缺口矩阵

| 缺口 | 仍可支持的内容 | 不可支持的内容 | 下一项有用证据 |
| --- | --- | --- | --- |
| 仅书目记录 | Identity 与已索引出版事实 | Method、finding、argument | Abstract 或 full text |
| 仅 abstract | Abstract 陈述的目的与概括性结果 | 详细 procedure、robustness、细致 limitation | Full text 或已验证 analysis artifact |
| Page/chunk 缺失 | 已检查部分中的主张 | 跨缺口的连续性 | 完整交付或特定页面来源 |
| OCR 不确定 | 带置信说明的近似可见内容 | 对损坏文本的精确引用 | Native PDF/text 或人工检查 |
| Note 缺少 source locator | Reader interpretation | 归因于论文 | 已定位 passage 或 annotation |
| 混合版本 | 特定版本主张 | 统一的论文级结论 | 版本解析与比较 |
| Workflow artifact 缺少 source basis | 把 artifact 内容作为分析对象 | 声称其忠实代表论文 | Manifest/source mapping 或直接读取 |
| 比较中一个 item 失败 | 对成功 item 的结论 | 完整集合比较 | 恢复该 item 或收窄已声明 scope |

缺口处理属于交付物本身，而非仅是失败附录。说明答案是被收窄、主张被削弱，还是任务受阻。如果缺失证据只影响一个维度，应保留其余分析并隔离该维度。

## 恢复与易错边界

- 仅有摘要的来源不能回答全文方法或结果问题；应请求缺失来源，或返回有界摘要分析。
- OCR 缺口需要 locator 与置信度说明；不得把重构的缺失句子当作引文。
- 过期附件 handle 应从所属附件恢复，绝不能使用猜测的本地路径。
- 混合来源层级的比较只有在每项受影响结论都显示这种不对称时才能继续。
- 批次中一篇论文失败时，保留成功 artifact，并从需要其证据的结论中排除失败论文。
- 工作流输出为空或格式错误时，保留 run 和校验诊断；不得制造预期 digest 或 references。
- 请求回写缺少权限时，将分析作为已完成工作返回，并把写入阶段标记为 canceled，不得修改 Zotero。

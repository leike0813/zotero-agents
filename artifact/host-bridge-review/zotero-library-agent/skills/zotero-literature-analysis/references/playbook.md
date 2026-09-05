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

host 直接准入工作时，使用各自 `workflowRunId` 监控每个已提交 Zotero 托管 run。host 通过原生队列准入请求时，保留单一 `submissionId`，检查每个不可变 unit 及其 source parent ref，并且只有该 unit 暴露真实 task 或 run handle 后才开始 run-plane monitoring。不得构造逐篇论文的 Agent 侧 queue，也不得重新提交仍处于 pending 的 unit。

分别记录 successful、failed 与 pending-or-canceled parent ref。所选 bounded concurrency 控制的是原生准入，而不是分析完整性，也不构成后续 submission 的权限。工作流承诺 digest、结构化 references 与 citation analysis 时，必须检查每个预期 artifact，不得把 aggregate submission state 或 terminal run status 当作充分证据。

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

## 分析交付物类型

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
## 端到端决策轨迹

这些痕迹展示了证据深度决策、稳定的分析维度、workflow 输出检查和诚实的部分结果。

### Trace 1：比较三篇来源深度不等的论文

用户话语：

> 比较这三篇论文的方法和实验结果。

已解决的源集：

- 论文 A 有经过验证的 PDF。
- 论文 B 有经过验证的 PDF。
- 论文 C 仅包含元数据和摘要。

实质性问题：

- 方法细节和实验数据需要的不仅仅是元数据。
- 采用不同的隐藏标准会使比较产生误导。

澄清：

> 两篇论文有全文，而第三篇论文只有摘要。我应该进行有限的比较来标记纸 C 不可用的尺寸，还是停止直到全文可用？

接受的有限路径：

1. 在提取之前修复方法和结果维度。
2. 从A和B中提取第locators页的全文证据。
3. 仅从 C 中提取抽象支持的声明。
4. 标记不可用的单元格而不是推断。
5. 解释证据基础是不对称的。

不要：

- 从标题推断 C 的架构；
- 使用实验编号的引用记录；
- 默默地排除C；
- 短语缺少细节作为 C 缺乏该功能的证据。

当用户接受有限基础时完成的结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared the three papers on the declared dimensions, with full-text evidence for two and explicitly limited abstract-only evidence for the third.",
  "evidence": [
    {
      "kind": "attachment",
      "ref": {
        "libraryId": 1,
        "key": "PAPERAPD"
      },
      "locator": "pages 4-8",
      "description": "Method and experiment evidence for Paper A."
    }
  ],
  "diagnostics": [
    {
      "code": "asymmetric_source_depth",
      "message": "Paper C was compared only on claims present in its abstract."
    }
  ]
}
```

### Trace 2：深读 workflow 返回混合结果

用户话语：

> 深入阅读这些论文并向我提供报告。

准备工作：

1. 解析每个选定的书目项目和附件。
2. 阅读实时 ​​workflow 描述。
3. 确认 workflow 输入单元和接受的媒体。
4. 验证每个选择。
5. 分别验证选项和 provider profile。
6. 目前提交范围和当前授权。

Execution:

- 四个附件作为单独的单元提交。
- 三跑成功。
- 一次运行在没有所需报告artifact的情况下终止。

验证：

- 检查三份报告。
- 验证 artifact 路径和角色。
- 保留失败的运行 handle 和预期的 artifact 合约。
- 不要将第四个来源称为已分析。

结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Verified deep-reading reports for three of four requested papers; the fourth run ended without the required report, so the overall batch is incomplete.",
  "artifacts": [
    {
      "path": "/workspace/deep-reading/paper-a.md",
      "role": "deep-reading-report",
      "mediaType": "text/markdown"
    }
  ],
  "diagnostics": [
    {
      "code": "workflow_artifact_missing",
      "message": "One terminal run did not produce the required deep-reading report."
    }
  ]
}
```

恢复：

- 检查第四次运行和 workflow 结果。
- 仅遵循该源声明的重试路径。
- 不要重新提交三个经过验证的来源。
- 如果提出provider或选项变更，请获得新的决定。

### Trace 3：带来源 locator 的提取过程中 OCR 中断

用户话语：

> 从这张扫描的论文中提取报告的样本量和置信区间。

证据要求：

- 精确的数字提取需要可检查的内容和页面locators。
- OCR 的不确定性必须保持可见。

Execution:

1. 解析精确的扫描附件。
2. 传送并验证字节。
3. 检查 OCR 可用性和页面映射。
4. 用页和表locators提取候选号码。
5. 如果支持的话，对照图像交叉检查不明确的 OCR 字符。

失败：

- OCR 提供第 1-6 页，然后处理失败。
- 请求的结果表位于后面几页。

决定：

- 保留已验证的部分内容。
- 不要从摘要中推断样本量。
- 不要将部分数字字段报告为请求的已完成提取。
- 返回准确的恢复位置和源身份。

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "failed",
  "summary": "Could not complete the requested numerical extraction because verified OCR stopped before the results tables.",
  "evidence": [
    {
      "kind": "attachment",
      "ref": {
        "libraryId": 1,
        "key": "SCAN0001"
      },
      "locator": "verified OCR pages 1-6",
      "description": "Accepted partial content; it does not contain the requested tables."
    }
  ],
  "diagnostics": [
    {
      "code": "ocr_incomplete_before_target",
      "message": "Resume content processing from page 7 before extracting sample sizes or intervals."
    }
  ]
}
```

有惊无险：

- 先前生成的提及“大样本”的摘要不是源定位数字。

## 分析对话模板

证据深度披露：

> 我有两个来源的全文和一个来源的摘要。我只能根据摘要支持的主张来比较这三个内容，或者对两个全文进行更深入的比较。

版本披露：

> 所选 Zotero 条目包含预印本附件，引用结果为期刊版本。在确认预期来源之前，我会将版本分开。

workflow 披露：

> workflow 可以为每个附件生成摘要和结构化参考。提交是一个单独的权限步骤，运行后我会检查每个承诺的artifact。

故障披露：

> 该报告共三篇论文。第四次运行是终端，但缺少声明的报告，因此我保留了三个 artifacts 并将该批次报告为不完整。

使用分析记录：

- 来源及附件refs；
- 版本/版本；
- 证据深度；
- 分析维度；
- 检查locators；
- 提取的观察结果；
- 矛盾；
- 不可用的尺寸；
- workflow 和artifact证据；
- 状态和诊断。

记录支持一致的推理；它不会取代最终的业务结果或允许 Zotero 写入。

在将分析进行综合之前，保留确切的源集、每个项目的来源深度、声明 locators、矛盾、缺失维度和 artifact 角色。在将 artifact 交给管理之前，请验证 artifact 路径并识别预期的 Zotero 目标，而无需暗示写入权限。

不要手递手：

- 标题而不是 Zotero ref；
- workflow 终端状态而不是检查的 artifacts；
- 没有 locator 的报价；
- OCR 猜测作为已验证的数字；
- 生成的摘要作为实时笔记状态的证明；
- 成功的子集，就像请求的完整比较已完成一样。

下游任务可能会缩小到有效受试者，但它必须在诊断中保持排除和失败的受试者可见。

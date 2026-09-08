# 文献分析 Playbook

## 源可用性与证据级别

在选择分析主张前，为每个 item 确立当前最强的来源级别：

| 可用来源 | 适合的声明 | 必要限制 |
| --- | --- | --- |
| 书目元数据 | 身份、出版事实、已索引字段 | 不对未暴露的方法或结果作论断 |
| Abstract | 陈述的目的、abstract 中的高层方法/结果 | 标注为基于 abstract；不做完整论证重构 |
| Notes 或 annotations | 记录的摘录与读者观察 | 保留 note/annotation identity，区分作者文本与评注 |
| OCR 或部分内容视图 | 可见块中支持的论断 | 标记缺失页面、识别不确定性与不连续处 |
| 已交付全文 | 所检查章节支持的提问 | 保留 page/section/chunk locators 与文件核实事实 |
| 生成的 digest 或分析 artifact | 先前的解读与声明的源基础 | 除非当前任务明确分析该 artifact，否则视为次要 |

在合并来源前，解析版次、译本、版本与附件身份。当一个 item 有多个附件时，识别哪一个提供了证据。按文件契约验证交付的字节，并避免暴露超出问题所需的更广私有内容。

## 分析流程

1. 把请求转化为显式分析问题，并对比较给出应用于每个来源的稳定维度。
2. 解析 item 集与每个 item 的可用证据级别。
- 3. 提取相关段落、字段、annotations 或观察并带定位符。
4. 把来源陈述的内容与你的解读、方法学评估、比较与不确定性分开。
5. 用矛盾段落与缺失数据检验结论，而非从期望填补缺口。
6. 产出请求的交付物，并为实质声明附上内联源证据。

论文摘要应由所请求的用途塑形，而不是在用户提出聚焦问题时套用通用模板。比较矩阵使用等价标准，并显示 `not available` 而不是悄悄改变维度。引用或参考文献分析要区分被引记录的元数据、引用语境，以及你对影响力的推断。

对 annotation 审阅，保留返回处的 quote、comment、color/category、page 或 position 与父 item。阅读器 annotations 可提供被标记或记录内容的证据；它们未必陈述论文作者的论断。

## Workflow 产生的分析

当已声明的文献分析 workflow 提供稳定的多 artifact 契约、后台 provider 执行或重复的逐论文处理时使用它。提交前描述并验证当前输入。对于多篇论文，默认串行或显式有界并发，以便 provider 限制与逐 item receipt 保持可归属。

当 Host 直接接纳工作时，按 `workflowRunId` 监控每个已提交的 Zotero 托管 run。当它通过原生队列接纳请求时，保留唯一的 `submissionId`，检查每个不可变单元及其源父 ref，并且只在该单元暴露真实 task 或 run 句柄后开始 run 面监控。不要构建逐论文的 agent 侧队列，也不要重交仍待处理的单元。

独立记录成功、失败与待处理或已取消的父 refs。所选有界并发控制原生接纳，而不是分析完整性或后续提交的许可。workflow 承诺 digest、结构化 references 与 citation analysis 时，检查每个期望的 artifact，而不是把聚合提交状态或终态 run 状态当作充分。

对于自有执行，遵循协调者的 handoff 契约：检查每个请求，按每个请求的 schema 产出输出，在本地验证它们，并且只通过已审阅的映射应用。即使结构化验证成功，分析质量决策仍归 agent。

## 交付物与完成证据

常见交付物包括：

- 带源 identity 与证据级别的聚焦 digest；
- 带定位符与不确定性的提取表；
- 使用稳定维度的跨论文比较；
- 方法/结果/局限分析；
- 源自 annotation 的主张图；
- 报告 artifact 加其重要结论的内联证据；
- 每篇成功论文的已验证 workflow artifacts。

以路径、角色与媒体类型声明文件 artifact。当机制提供校验和或字节数时，将其携带在面向来源的证据中。本地报告是分析已产生的证据，而非 Zotero 已包含它的证据。若用户请求 Zotero note、附件、tag 或元数据更新，先完成分析 artifact，再将单独的写入路由到 curation。

完成要求所请求的分析维度、显式不可用证据、可追溯结论以及提取与推断的清晰区分。较小的真实答案优于暗示未读内容的宽泛报告。

## 分析交付物模式

按用户所需决定选择模式：

| 交付物 | 内部结构 | 证据重点 |
| --- | --- | --- |
| 聚焦论文 digest | 问题、答案、支撑段落、局限 | 最强可用源级别与精确定位符 |
| 方法提取 | 人群/数据、设计、变量、程序、分析、效度限制 | 平行字段；缺失处为 `not available` |
| 结果提取 | 结果、估计/方向、条件、不确定性、作者解释 | 表格/图/章节与分析单元 |
| 跨论文比较 | 稳定维度、逐论文条目、趋同点、矛盾点 | 等效源级别或可见的不对称 |
| 声明-证据映射 | 声明、源陈述、证据类型、支持/挑战关系 | 将作者声明与 agent 推断分开 |
| Annotation 综合 | 读者主题、引用/标记段落、评论、开放问题 | Annotation 身份、位置与父来源 |
| Workflow artifact 审计 | 期望输出、schema 有效性、源基础、内容充分性 | Run 身份加每个已检查 artifact |

交付物可以组合多种模式，但每个部分应保持一种证据语法。例如，比较可以包含简短摘要，但其结论仍必须指向共享的比较维度，而不是仅指向散文摘要。

对于结构化输出，在提取前选择稳定字段名。对于叙述性输出，当答案跨越多篇论文或多种源层级时，先创建内部证据表；这可以防止打磨过的散文掩盖缺失的支持。

## 比较与矛盾处理

解释结果前构建比较框架：

```text
comparison question:
unit of comparison:
dimensions:
source level per item:
normalization decisions:
missing-value policy:
contradiction test:
```

在称之为矛盾前先归类表面分歧：

| 差异 | 诊断问题 | 报告处理 |
| --- | --- | --- |
| 总体或语料 | 研究的是不同主体、数据集还是时期？ | 条件差异，而非直接矛盾 |
| 构造或度量 | 相似的标签是否代表不同的变量？ | 保留定义并避免数值比较 |
| 方法或模型 | 设计选择能否解释结果？ | 比较假设与敏感性 |
| 结果方向 | 估计是否关于同一结果与量纲？ | 仅对齐后才是直接矛盾 |
| 解读 | 作者是否从兼容的发现中推断出不同机制？ | 将经验一致性与解读分歧分开 |
| 版本或版次 | 来源在版本间是否变化？ | 把主张归于确切版本 |
| 证据层级 | 某个结论是否仅基于摘要或来源于 annotation？ | 标记不对称；不要拉平置信度 |

对齐后矛盾仍存时，呈现每方的最强支持、相关的方法论差异，以及哪些额外证据可以区分它们。除非任务明确定义系统的聚合方法，否则不要以票数解决分歧。

## 证据缺口矩阵

| Gap | 仍可支持什么 | 什么不可支持 | 下一个有用证据 |
| --- | --- | --- | --- |
| 仅书目记录 | 身份与已索引的出版事实 | 方法、发现、论证 | 摘要或全文 |
| 仅摘要 | 摘要陈述的目的与首要结果 | 详细流程、稳健性、细微限制 | 全文或已核验的分析 artifact |
| 缺失页/块 | 已检查部分的断言 | 跨缺口的连续性 | 完整交付或按页来源 |
| OCR 不确定性 | 带置信度说明地近似可见内容 | 对损坏文本的精确引用 | 原生 PDF/text 或人工检查 |
| 无源定位的笔记 | Reader 解读 | 归属到论文 | 有定位的段落或 annotation |
| 混合版本 | 特定版本的主张 | 统一的论文级结论 | 版本解析与比较 |
| Workflow artifact 缺少源基础 | 把 artifact 内容当作分析对象 | 声称它忠实代表论文 | Manifest/源映射或直接读取 |
| 比较中一个 item 失败 | 关于成功 items 的结论 | 完整集合比较 | 恢复该 item 或收窄声明范围 |

Gap 处理是交付物的一部分，而不仅是失败附录。说明答案是收窄了、主张减弱了，还是任务被阻塞。若缺失的证据只改变一个维度，保留其余分析并隔离该维度。

## 恢复与接近命中

- 仅摘要的来源无法回答全文方法或结果问题；请求缺失的来源，或返回有界的摘要分析。
- OCR 缺口需要定位符与置信度说明；不要将缺失句子重建为引文。
- 过期的 attachment handle 从其所属 attachment 恢复，绝不从猜测的本地路径恢复。
- 混合源级别的比较只能在不对称对每个受影响结论都可见时进行。
- 若批次中一篇论文失败，保留成功的 artifact，并将失败论文排除在需要其证据的结论之外。
- 若 workflow 输出为空或格式错误，保留 run 与验证诊断；不要制造预期的摘要或参考文献。
- 若所请求的回写缺少权限，把分析作为已完成工作返回，并把写入阶段标记为 canceled，而不是修改 Zotero。
## 端到端决策轨迹

这些轨迹展示证据深度决策、稳定的分析维度、workflow 输出检查与诚实的部分结果。

### Trace 1：比较源深度不等的三篇论文

用户表述：

> 比较这三篇论文的方法与实验结果。

已解析来源集：

- Paper A 有已验证的 PDF。
- Paper B 有已核验的 PDF。
- 论文 C 只有元数据与 abstract。

实质问题：

- 方法细节与实验数字需要的不止元数据。
- 应用不同的隐藏标准会使比较产生误导。

澄清：

> 两篇论文有全文，第三篇只有摘要。我应该生成一个有限的比较（把 Paper C 不可用的维度标记出来），还是等到全文可用？

接受的受限路径：

1. 在提取前修正方法与结果维度。
- 2. 从 A 与 B 提取带页码定位符的全文证据。
3. 只从 C 提取摘要支持的论断。
4. 标记不可用的单元格，而不是推断。
5. 说明证据基础不对称。

禁止：

- 从 C 的标题推断其架构；
- 用引文记录支持实验数字；
- 静默排除 C；
- 把缺失细节表述为 C 缺乏该特性的证据。

用户接受有限依据时即为已完成结果：

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

### Trace 2：带混合结果的深度阅读 workflow

用户表述：

> 对这些论文做深度阅读并把报告给我。

准备：

- 1. 解析每个选定的书目 item 与 attachment。
2. 读取实时 workflow 描述。
3. 确认 workflow 成员种类、分组模式与接受的媒体。
4. 验证每个选择。
- 5. 分别验证选项与 provider profile。
- 6. 呈现提交范围与当前权限。

执行：

- 四个 attachments 作为独立单元提交。
- 三个 runs 成功。
- 一个 run 在缺少其必需报告 artifact 的情况下终止。

验证：

- 检查这三份报告。
- 验证 artifact 路径与角色。
- 保留失败的 run handle 与预期 artifact 契约。
- 不要调用被分析的第四个来源。

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

- 检查第四个 run 与 workflow 结果。
- 只对该来源遵循声明的重试路径。
- 不要重新提交这三个已验证来源。
- 若提议更改 provider 或选项，获得新的决定。

### Trace 3：源定位提取期间的 OCR 中断

用户表述：

> 从这篇扫描的论文中提取所报告的样本量与置信区间。

证据要求：

- 精确数值提取要求可检查的内容与页 locators。
- OCR 不确定性必须保持可见。

执行：

1. 解析精确的扫描 attachment。
2. 交付并验证字节。
3. 检查 OCR 可用性与页映射。
4. 提取带页与表定位符的候选数字。
5. 在支持处将存疑的 OCR 字符与图像交叉核对。

失败：

- OCR 提供第 1–6 页，然后处理失败。
- 所请求的结果表在后续页面上。

决策：

- 保留已验证的部分内容。
- 不要从摘要外推样本量。
- 不要将部分数字字段报告为所请求的已完成提取。
- 返回确切恢复位置与源身份。

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

接近命中：

- 先前提到“大样本”的生成摘要不是带源定位的数字。

## 分析性对话模式

证据深度披露：

> 我有两个来源的全文和一个来源的摘要。我只能就摘要支持的论断比较三者，或为两篇全文提供更深入的比较。

版本披露：

> 所选 Zotero item 含预印本附件，而被引结果指期刊版本。在预期来源确认前，我会让版本保持分离。

Workflow 披露：

> workflow 可以为每个 attachment 生成摘要与结构化参考文献。提交是单独的授权步骤，我会在 run 之后检查每个承诺的 artifact。

失败披露：

> 报告存在于三篇论文。第四次 run 已终态但缺少声明的报告，因此我保留三个 artifacts 并将批次报告为不完整。

用分析记录：

- 源与 attachment 引用；
- 版本/edition；
- 证据深度；
- 分析维度；
- 已检查的 locators；
- 提取的观察；
- 矛盾；
- 不可用维度；
- workflow 与 artifact 证据；
- 状态与 diagnostics。

记录支持一致的推理；它不替代最终业务结果，也不允许 Zotero 写入。

在将分析交给 synthesis 之前，保留确切的来源集、每个 item 的来源深度、主张定位符、矛盾、缺失维度与 artifact 角色。在将 artifact 交给 curation 之前，验证 artifact 路径并识别预期的 Zotero 目标，而不暗示写入 authority。

不要 hand off：

- 用标题顶替 Zotero 引用；
- 用 workflow 终止状态代替已检查的 artifacts；
- 无 locator 的引文；
- 把 OCR 猜测当作已验证数字；
- 用生成的摘要证明实时 note 状态；
- 把成功的子集当作所请求完整比较已完成。

下游任务可收窄到有效主体，但必须让被排除与失败的主体在 diagnostics 中可见。

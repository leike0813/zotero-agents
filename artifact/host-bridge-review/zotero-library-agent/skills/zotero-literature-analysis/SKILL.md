---
name: zotero-literature-analysis
描述：以可追溯的源证据分析有界 Zotero 文献与附件。当用户需要基于当前库材料的论文摘要、比较、提取或结构化解读时使用。
---

# Zotero 文献分析

## 目标

从已验证的 Zotero 源产出有界的 digest、提取、比较或解读，具有显式证据深度与 locators，而不把生成的 analysis 或 artifacts 当作实时 library 状态。

## 输入

- 已解析的 item、note、annotation 或 attachment refs，或可解析它们的有界查询。
- 分析性问题、比较维度、期望交付物与所需源深度。
- 可用元数据、摘要、OCR、全文、先前分析 artifact，以及相关时的 workflow 权限。

## 自然语言输入

将“read”“summarize”“explain”“compare”“extract”与“analyze”翻译为已声明的分析视角与证据要求。

| 用户措辞 | 初始分析任务 | 必需边界 |
| --- | --- | --- |
| “总结这篇论文” | 单源 digest | 解析所选来源与可接受的元数据/abstract/全文深度 |
| “解释该方法” | 方法聚焦解读 | 确定确切论文/版本，以及实现细节是否需要全文 |
| "Compare these papers"（比较这些论文） | 结构化比较 | 解析集合、稳定维度与不等源深度的处理 |
| “提取结果” | 有来源定位的提取 | 定义目标字段、表、度量或结果及所需定位符 |
| “做一次深度阅读” | 详细的多部分分析 | 确认全文可用性以及是否需要内置 workflow |
| "翻译并分析这个" | 有序翻译与分析 | 决定源/目标语言、翻译 artifact，以及哪些文本支持结论 |
| "分析所有关于 X 的论文" | Query 然后有界分析 | 分析前确立来源集与批次边界 |

捕获：

- 确切的 item、attachment、note、annotation、版本与版次身份；
- 分析问题与预期用途；
- 请求的交付物；
- 跨源应用的维度；
- 最低可接受证据级别；
- 引文或 locator 要求；
- 隐私与输出语言约束；
- 直接分析对比 workflow 产生的多 artifact 结果。

在以下情况询问：

- 当前选择缺失或包含多个可能源对象；
- 只有元数据或摘要可用，但请求需要方法、结果、限制或引文；
- 来源的深度不对称，用户必须在更窄的比较与明确受限的比较之间选择；
- 版本、译本、preprints 或已发表版本可能改变结论；
- "analyze" 可能指 digest、提取、批评、比较或 synthesis；
- workflow 执行引入 provider、选项、成本或提交权限。

安全默认值：

- 仅分析已解析的有界来源集；
- 对每个 item 使用最强可用来源并披露不对称；
- 保持分析只读；
- 除非单独请求 artifact，否则给出对话式回答；
- 将先前生成的分析视为次级线索，而非源文本。

对于伪造全文访问、静默排除请求的论文、按来源改变比较维度或将分析写回 Zotero，都没有安全默认。

## 工作流

### 建立源 basis

1. 解析精确的 item、note、annotation、attachment、version 与 edition 集。陈述分析问题、稳定比较维度、所需源深度与交付物。
2. 为每个来源确定最强可用证据级别：元数据、摘要、note/annotation、部分 OCR/内容视图、已投递全文或先前生成的分析。
3. 只通过受支持的 Zotero 读取与文件交付获取内容。记录哪个 attachment 与定位符提供了每个被检查段落，并在分析前让缺失或不对称的证据可见。

### 带 locators 分析

4. 提取与所声明视角相关的字段、段落、annotations 或观察。把引用与提取同比较、方法学评估、推断与 synthesis 分开。
5. 对每个被比较来源应用相同声明维度。把不可用证据记录为不可用，而不是悄悄改变标准，并用矛盾与源版本差异检验结论。
6. 有界材料已可用时选择直接分析。任务需要稳定多 artifact 契约、provider 执行或重复逐论文处理时选择声明 workflow。

### 验证 workflow 可交付物

7. 对 workflow 执行，校验源选择、workflow 选项与 provider profile；分别保留每个已提交父 ref 及其 run 结果。
8. 检查每个承诺的 digest、结构化引用集、citation analysis、翻译、深度阅读输出或 report。结构化结果成功并不能确立分析质量或 Zotero 写回。
9. 返回 `zotero-library-task.result.v1`；把生成的报告声明为 artifacts，把带源定位的证据附到实质性结论上，并将任何单独请求的 Zotero 变更路由到整理。

### 构建分析交付物

对于单篇论文：

1. 识别确切来源与证据深度。
2. 仅在有支持处说明研究问题、贡献、方法、数据、发现、局限与相关性。
3. 给引文、数值主张与具体方法论细节附加 locators。
4. 把作者论断与你的解读分开。
5. 说明缺失章节、OCR 不确定或版本限制。

进行比较：

1. 在解读结果前修复比较维度。
- 2. 将每个维度应用于每个来源。
- 3. 用"已检查证据中不可用"而非静默更改维度。
- 4. 保留矛盾发现与方法论不兼容性。
5. 区分缺失的报告与功能或结果缺席的证据。

对于 workflow 产生的分析：

1. 验证 workflow 选择与其声明的候选生产与执行输入契约一致。
2. 单独验证选项与 provider profile。
- 3. 为每个提交源保留一个 run 结果。
4. 检查每个承诺的 artifact。
5. 对照声明的分析问题评估内容。
6. 用新权限将任何期望的 note、tag、attachment 或元数据更改导向策展。

### 分析完成清单

源基础：

- 每个来源都有稳定的 Zotero 与 attachment identity。
- 版本、edition、译本与出版关系是显式的。
- 每个源的证据深度都有记录。
- 交付的字节或内容视图在全文主张前已核实。

分析方法：

- 比较前已固定问题与维度。
- 提取与引用同解读是分开的。
- 每个实质性结论都有定位符。
- 矛盾与不可用维度保持可见。
- 先前生成的分析不被用作源证据的替代。

Workflow 输出：

- 选择符合 workflow 的候选产出与执行输入契约。
- 选项与 provider 就绪度已验证。
- 每个来源有自己的 run 结果。
- 每个承诺的 artifact 都存在并已检查。
- artifact 结构与分析质量不被混为一谈。

可交付物：

- 答案陈述来源作用域与证据深度。
- 引文极少且定位准确。
- 缺失内容、OCR 不确定性与不对称证据均被披露。
- 任何独立的 Zotero 写入留给 curation。

接近命中：

- 仅摘要证据无法支持未报告的方法细节。
- 引文元数据无法支持论文的实验结果。
- 相似的方法名不证明实现等价。
- workflow “succeeded”状态不证明存在可用的分析 artifacts。
- 可读的生成摘要不是实时 note 状态。
- 一个已分析来源不能完成所请求的多来源比较。

若可用证据只能回答请求的已声明子集，告诉用户是哪个子集，并返回结果契约要求的总体状态。

## 硬性约束

- 不要声称读过 `zotero-bridge` 未交付或未通过受支持视图暴露的内容。
- 不要作为分析的一部分改动 notes、annotations、附件、元数据或 workflow 状态。
- 引文与私有 attachment 内容保持在不超出所请求分析所需的范围。
- 把不确定、缺页、OCR 限制与推断如实标注。
- 不要用 digest、abstract、引文记录或先前生成的分析，作为需要当前全文的陈述的证据。
- 未识别版本差异时，不要合并不同 edition、translation 或 version 的发现。
- 不要仅凭 workflow 终止就声称分析完成；检查请求的 digest、references、citation analysis 或 report artifact。

## LLM 与工具职责

LLM 拥有分析视角、比较模型、证据充分性、定位到源的解读、不确定性及 artifact 内容。内置 CLI 与 runner 拥有确切的 argv、内容交付、文件检查、workflow 传输与结果 schema 验证。不要臆造 handle、receipt、未读内容、引文或源位置。

## 结果契约

返回与 `assets/output.schema.json` 匹配的一个业务 JSON 对象。

必需：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或 `failed`。
- `summary`：指明分析问题、来源集、证据深度、交付结果与重要局限。

可选：

- `evidence` 是可选数组；每个条目要求 `kind` 与 `ref`；用 `locator` 表示页、节、annotations、引文跨度、表格或源块，用 `description` 表示所支持的论断。
- `artifacts` 是可选数组；每个条目需要现有的 Agent 可访问 `path` 与 `role`，如 `digest`、`comparison`、`translation` 或 `deep-reading-report`；已知时添加 `mediaType`。
- `diagnostics` 是可选数组；每个条目对不可用内容、OCR 限制、版本歧义、不对称证据、workflow 失败或其他稳定差距要求 `code` 与 `message`。

状态规则：

- `completed`：所声明的分析维度已按所声明证据层级作答，且每个承诺的 artifact 都已检查。
- `canceled`：实质性疑问、源身份、比较集合、证据深度选择或 workflow 授权缺失。
- `failed`：尝试的读取、文件交付、workflow 或分析批次无法完成声明的整体目标。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared the three resolved papers on the declared method and evaluation dimensions, with full-text evidence for each material conclusion."
}
```

不要臆造 `partial`。当只能分析请求批次的一部分时，使用 `failed`，保留已完成的源证据与 artifact，并诊断每个不可用或未尝试的来源。

Runner 的 `__SKILL_DONE__` 标记是传输元数据。它在 Schema 验证前被移除，且不得出现在业务对象或结果文件中。不输出任何 Markdown 框架，只输出恰好一个 JSON 对象。

## 完成

返回一个最终的 `zotero-library-task.result.v1` 对象，带必需的 `schema`、`status` 与 `summary`。当所请求的分析维度已从声明源级别得到回答且每个实质结论都可追溯时，使用 `completed`。对不明确的问题、未解决的比较集或必需但不可用的源选择使用 `canceled`；对不可恢复的访问、workflow 或处理错误使用 `failed`。

## 失败处理

保留源身份、可用证据层级、已接受内容、artifact 路径、workflow handles 与结构化失败。部分批次结果分别标识成功与失败的论文。仅当更窄的基础能回答请求的已声明部分时才提供它，并标注由此产生的限制，而不是把它呈现为完整分析。

## 参考

当任务需要详细的证据级决策、提取或引用协议、比较/矛盾模式、混合版本或混合深度分析、多论文 workflow artifact 验证、OCR 处理或证据缺口恢复时，请查阅[综合分析的 playbook](references/playbook.md)。

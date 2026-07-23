---
name: zotero-literature-analysis
description: 使用可追溯的来源证据分析边界明确的 Zotero 文献和附件。当用户需要根据当前文献库资料生成论文摘要、比较、信息提取或结构化解释时使用。
---

# Zotero 文献分析

## 目标

基于已验证 Zotero 来源生成有边界的摘要、提取、比较或解释，明确证据深度和 locator，不把生成分析或 artifact 视为实时文献库状态。

## 输入

- 已解析的条目、笔记、批注或附件 ref，或能够解析它们的有界查询。
- 分析问题、比较维度、期望交付物及必要来来源深度。
- 可用元数据、摘要、OCR、全文、既往分析 artifact，以及相关时的工作流权限。

## 自然语言输入理解

将“阅读”、“总结”、“解释”、“比较”、“提取”和“分析”转化为声明的分析镜头和证据要求。

|用户措辞 |初始分析任务|所需边界|
| --- | --- | --- |
| “总结本文” |单一来源摘要 |解析所选来源和可接受的元数据/摘要/全文深度 |
| “解释一下方法”|以方法为中心的解释|确定确切的论文/版本以及实施细节是否需要全文 |
| “比较这些论文”|结构化比较|解决设置、稳定尺寸、不等来源深度的处理 |
| “提取结果”|源定位提取|定义目标字段、表格、度量或结果以及必需的 locators |
| “深度阅读” |详细的多部分分析 |确认全文可用性以及是否需要内置 workflow |
| “翻译并分析这个” |订购翻译和分析 |确定源/目标语言，翻译artifact，以及哪些文本支持结论 |
| “分析所有关于 X 的论文”|查询然后有界分析|分析前建立源集和批次边界 |

捕获：

- 准确的项目、附件、注释、注释、版本和版本标识；
- 分析问题和预期用途；
- 要求交付的成果；
- 跨来源应用的维度；
- 可接受的最低证据水平；
- 报价或locator要求；
- 隐私和输出语言限制；
- 直接分析与 workflow 产生的多个artifact结果。

询问时间：

- 当前选择不存在或包含多个可能的源对象；
- 仅提供元数据或摘要，但请求需要方法、结果、限制或引用；
- 来源具有不对称的深度，用户必须在较窄的比较和明显受限的比较之间进行选择；
- 版本、翻译、预印本或出版版本可能会改变调查结果；
- “分析”可能意味着消化、提取、批判、比较或综合；
- workflow 的执行引入了provider、选项、成本或提交权限。

安全默认值：

- 仅分析已解析的有界源集；
- 对每个项目使用最强的可用来源并披露不对称性；
- 保持分析只读；
- 除非请求单独的artifact，否则生成对话答案；
- 将先前生成的分析视为次要线索，而不是源文本。

对于构建全文访问、默默排除请求的论文、更改每个来源的比较维度或将分析写回 Zotero，没有安全的默认设置。

## 工作流

### 确立来源基础

1. 解析确切的 item、note、annotation、attachment、version 与 edition 集合。陈述分析问题、稳定比较维度、所需来来源深度与交付物。
2. 确定每个来源最强的可用证据层级：metadata、abstract、note/annotation、部分 OCR/content view、已交付全文或既有生成分析。
3. 只通过受支持的 Zotero 读取与文件交付获得内容。记录每个已检查 passage 来自哪个 attachment 与 locator，并在分析前明确缺失或不对称证据。

### 使用 locator 分析

4. 提取与已声明视角相关的 field、passage、annotation 或 observation。区分 quotation/extraction 与 comparison、方法评估、inference、synthesis。
5. 对所有比较来源应用相同的已声明维度。记录不可用证据，不得悄然更改标准；并依据矛盾内容和来源版本差异检验结论。
6. 有界材料已经可用时选择直接分析；任务需要稳定的多 artifact 合同、provider 执行或逐篇重复处理时选择已声明 workflow。

### 验证 workflow 交付物

7. 对 workflow 执行，校验来源 selection、workflow option 与 provider profile；分别保留每个已提交 parent ref 及其 run 结果。
8. 检查每个承诺的 digest、structured reference set、citation analysis、translation、deep-reading output 或 report。结构化结果成功并不证明分析质量或 Zotero 回写。
9. 返回 `zotero-library-task.result.v1`；将生成报告声明为 artifact，为实质结论附加带来源 locator 的证据，并把任何另行请求的 Zotero 变更交给 curation。

### 构建分析交付成果

对于单篇论文：

1. 确定确切的来源和证据深度。
2. 仅在有支持的情况下说明研究问题、贡献、方法、数据、发现、局限性和相关性。
3. 将locators附在报价、数字声明和具体方法细节上。
4. 将作者的主张与您的解释分开。
5. 说明缺失的部分、OCR 不确定性或版本限制。

用于比较：

1. 在解释结果之前修复比较维度。
2. 将每个维度应用于每个来源。
3. 使用“在检查的证据中不可用”而不是默默地改变维度。
4. 保留矛盾的发现和方法上的不相容性。
5. 将缺失的报告与特征或结果缺失的证据区分开来。

对于 workflow 生成的分析：

1. 验证 workflow 选择与其声明的输入单位相符。
2. 分别验证选项和 provider profile。
3. 为每个提交的源保留一次运行结果。
4. 检查每一个承诺的artifact。
5. 根据声明的分析问题评估内容。
6. 将任何所需的注释、标签、附件或元数据更改路由到具有新权限的管理。

### 分析完成清单

来源依据：

- 每个来源都有一个稳定的 Zotero 和附件身份。
- 版本、版本、翻译、出版关系明确。
- 证据深度按来源记录。
- 交付的字节或内容视图在全文声明之前进行验证。

分析方法：

- 问题和尺寸在比较之前就已确定。
- 摘录和引用与解释是分开的。
- 每个实质性结论都有一个locator。
- 矛盾和不可用的维度仍然可见。
- 先前生成的分析不能替代源证据。

workflow 输出：

- 选择与 workflow 输入单位匹配。
- 选项和 provider 准备情况已得到验证。
- 每个源都有自己的运行结果。
- 每个承诺的artifact都存在并经过检查。
- 工件结构和分析质量不会混为一谈。

可交付成果：

- 答案说明了来源范围和证据深度。
- 报价最少且位置准确。
- 内容缺失、OCR 不确定性和证据不对称都会被披露。
- 任何单独的 Zotero 写入都将留给管理。

有惊无险：

- 仅摘要证据不能支持未报告的方法细节。
- 引文元数据无法支持论文的实验结果。
- 类似的方法名称并不能证明等效的实现。
- workflow“成功”状态并不能证明分析可用artifacts。
- 可读的生成摘要不是实时笔记状态。
- 一个分析源未完成所请求的多源比较。

如果可用证据只能回答请求的声明子集，则告诉用户哪个子集并返回结果合约所需的总体状态。

## 硬约束

- 如果 `zotero-bridge` 未交付内容或未通过受支持视图公开内容，不得声称已阅读该内容。
- 分析过程中不得更改笔记、批注、附件、元数据或 workflow 状态。
- 引文和私有附件内容不得超出请求分析所需的范围。
- 明确标示不确定性、缺失页面、OCR 限制和推断。
- 不得使用 digest、abstract、citation record 或既往生成分析，作为需要当前全文的陈述证据。
- 未识别版本、译本或其他版本差异时，不得合并其发现。
- 不得仅凭工作流终态声称分析完成；应检查请求的 digest、references、citation analysis 或 report artifact。

## LLM 与工具职责

LLM 负责分析视角、比较模型、证据充分性、带来源定位的解释、不确定性及 artifact 内容。随附 CLI 与 runner 负责精确 argv、内容交付、文件校验、工作流传输及结果 schema 校验。不得虚构 handle、receipt、未读内容、引文或来源位置。

## 结果契约

返回与 `assets/output.schema.json` 匹配的一项业务 JSON 对象。

要求：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或`failed`。
- `summary`：确定分析问题、源集、证据深度、交付结果和材料限制。

可选：

- `evidence`是一个可选数组；每个条目都需要`kind`和`ref`；将 `locator` 用于页面、部分、注释、引用范围、表格或源代码块，并将 `description` 用于受支持的声明。
- `artifacts`是一个可选数组；每个条目都需要现有的agent可访问的`path`和`role`，例如`digest`、`comparison`、`translation`或`deep-reading-report`；已知时添加`mediaType`。
- `diagnostics`是一个可选数组；每个条目都需要`code`和`message`来应对不可用的内容、OCR限制、版本模糊、不对称证据、workflow 失败或其他稳定的差距。

状态规则：

- `completed`：声明的分析维度从声明的证据级别回答，并检查每个承诺的artifact。
- `canceled`：缺少实质性问题、来源身份、比较集、证据深度选择或 workflow 权威。
- `failed`：尝试读取、文件传送、workflow 或分析批次无法完成声明的总体目标。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Compared the three resolved papers on the declared method and evaluation dimensions, with full-text evidence for each material conclusion."
}
```

不要发明`partial`。当只能分析所请求批次的一部分时，使用`failed`，保留完整的源证据和artifacts，并诊断每个不可用或未尝试的源。

Runner 的 `__SKILL_DONE__` 标记是传输元数据。它在 Schema 验证之前被删除，并且不得出现在业务对象或结果文件中。恰好发出一个 JSON 对象，而无需 Markdown 框架。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。已从声明来源层级回答请求分析维度，且每项实质结论可追溯时使用 `completed`。问题说明不足、比较集未解决或必须选择不可用来源时使用 `canceled`；访问、工作流或处理错误不可恢复时使用 `failed`。

## 失败处理

保留来源身份、可用证据层级、已接受内容、artifact 路径、工作流 handle 与结构化失败。批量结果部分成功时，分别标识成功与失败论文。只有较窄基础仍能回答请求中声明部分时才提供，并标明由此产生的限制，不得呈现为完整分析。

## 参考资料

当任务需要详细 evidence-level 决策、extraction 或 quotation 协议、comparison/contradiction 模式、混合版本或混合深度分析、多篇 workflow artifact 校验、OCR 处理或 evidence-gap 恢复时，查阅[完整分析操作手册](references/playbook.md)。

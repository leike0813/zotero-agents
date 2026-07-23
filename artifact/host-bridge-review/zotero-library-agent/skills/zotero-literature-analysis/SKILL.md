---
name: zotero-literature-analysis
description: 使用可追溯的来源证据分析边界明确的 Zotero 文献和附件。当用户需要根据当前文献库资料生成论文摘要、比较、信息提取或结构化解释时使用。
---

# Zotero 文献分析

## 目标

基于已验证 Zotero 来源生成有边界的摘要、提取、比较或解释，明确证据深度和 locator，不把生成分析或 artifact 视为实时文献库状态。

## 输入

- 已解析的条目、笔记、批注或附件 ref，或能够解析它们的有界查询。
- 分析问题、比较维度、期望交付物及必要来源深度。
- 可用元数据、摘要、OCR、全文、既往分析 artifact，以及相关时的工作流权限。

## 工作流

### 确立来源基础

1. 解析确切的 item、note、annotation、attachment、version 与 edition 集合。陈述分析问题、稳定比较维度、所需来源深度与交付物。
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

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。已从声明来源层级回答请求分析维度，且每项实质结论可追溯时使用 `completed`。问题说明不足、比较集未解决或必须选择不可用来源时使用 `canceled`；访问、工作流或处理错误不可恢复时使用 `failed`。

## 失败处理

保留来源身份、可用证据层级、已接受内容、artifact 路径、工作流 handle 与结构化失败。批量结果部分成功时，分别标识成功与失败论文。只有较窄基础仍能回答请求中声明部分时才提供，并标明由此产生的限制，不得呈现为完整分析。

## 参考资料

当任务需要详细 evidence-level 决策、extraction 或 quotation 协议、comparison/contradiction 模式、混合版本或混合深度分析、多篇 workflow artifact 校验、OCR 处理或 evidence-gap 恢复时，查阅[完整分析操作手册](references/playbook.md)。

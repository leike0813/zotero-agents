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

1. 阅读[分析操作手册](references/playbook.md)，解析确切来源集，并陈述请求视角、来源深度与交付物。
2. 检查可用元数据、摘要、笔记、批注、受支持内容视图和附件。只能通过随附 CLI 文件合同获取交付字节。
3. 判断直接分析还是已声明文献分析工作流最适合请求。校验所选工作流，并逐条目保留成功与失败证据。
4. 区分 extraction、quotation、comparison、inference 与 synthesis。每项实质发现都必须关联稳定条目身份及最佳可用 page、section、chunk、annotation 或 field locator。
5. 返回 `zotero-library-task.result.v1`；将生成报告声明为 artifact，并保留其来源基础，但不得暗示已回写 Zotero。

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

选择证据深度、比较论文、调用分析工作流、校验分析 artifact 或恢复混合来源可用性前，阅读[分析操作手册](references/playbook.md)。

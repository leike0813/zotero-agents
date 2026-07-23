---
name: zotero-library-query
description: 检索当前 Zotero 文献库内容，并回答有明确边界且有来源依据的问题。当用户需要当前条目、分类、笔记、附件、上下文或文献库答案时使用。
---

# Zotero 文献库查询

## 目标

依据当前 Zotero 文献库、UI、附件和 Synthesis 上下文解决有边界的问题；区分实时事实与解释；在不修改 Zotero 托管状态的前提下，返回有来源依据的答案。

## 输入

- 问题、search/list filter，或明确的对象、分类、topic、Product、artifact 或 run handle。
- 任何依赖当前 Zotero pane 或 selection 的指示性短语。
- 所需新鲜度、来源深度、结果边界和请求的证据格式。

## 工作流

1. 阅读[查询操作手册](references/playbook.md)，陈述有边界的问题，并判断请求是指定对象、描述候选搜索，还是依赖当前 UI 上下文。
2. 在选择条目详情、笔记、payload、批注、附件、readiness、Product、run 或 Synthesis 读取前，先解析当前上下文和稳定对象身份。
3. 使用能够回答问题的最窄实时操作。完成必要的 cursor 或 offset 分页，并保留 filter、ref、locator、新鲜度事实和文件交付证据。
4. 区分提取事实、来源引文、派生结构与自身解释。主张强度不得超过可用元数据、摘要、批注或全文所支持的范围。
5. 返回 `zotero-library-task.result.v1`，为每项实质结论提供面向来源的内联证据；只有答案生成单独交付物时才声明 artifact。

## 硬约束

- 只能通过 `zotero-bridge` 读取，不得根据标题、引文字符串或陈旧结果推断条目身份。
- 回答查询时不得执行 mutation、提交、apply back 或启动无人值守监控。
- 不得在结果中暴露私有附件内容、凭据或本地存储路径。
- 当时效性很重要或 handle 已过期时，重新查询实时数据。
- 不得把导航、snapshot 数据、通知、终态 run、生成 artifact 或 Synthesis 关联视为书目写入的证据。
- 只有元数据、摘要、OCR 片段或不可访问附件记录时，不得声称具有全文证据。
- 不得根据不完整分页得出不存在的结论，也不得在 ref 过期后擅自替换为另一对象。

## LLM 与工具职责

LLM 负责查询 scope、候选选择、证据充分性、来源比较、解释与新鲜度判断。随附 CLI 和 runner 负责精确 argv、实时读取、cursor 与文件 handle 传输、下载字节校验及结果 schema 校验。不得虚构 handle、locator、命令结果或文献库事实。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 和 `summary`。仅当声明 scope 已被充分搜索或解析，足以支持答案且实质主张都有实时证据时，才使用 `completed`。缺少问题、scope、身份或来源深度选择时使用 `canceled`；访问或分页错误不可恢复时使用 `failed`。

## 失败处理

保留已接受页面、最后 cursor 或 offset、来源身份、文件所属对象和结构化错误。只有缩小后的边界仍能回答用户问题时，才缩小过宽请求。从签发访问的附件、Product 或 artifact 重新获取已过期文件访问。若只剩较弱来源基础，应在明确说明局限的情况下提供有界答案，不得暗示满足了请求的证据深度。

## 参考资料

解析当前上下文、选择 search 或 list、读取笔记或附件、审计 readiness、解释 Synthesis 状态，或恢复分页与文件访问前，阅读[查询操作手册](references/playbook.md)。

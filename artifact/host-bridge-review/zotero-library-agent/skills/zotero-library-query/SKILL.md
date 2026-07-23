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

### 分类并解析范围

1. 陈述有边界的问题、所需新鲜度、来源深度、结果上限与证据格式。判断它依赖当前 UI 上下文、已知对象、候选发现，还是穷尽式有界清单。
2. 优先解析指示性上下文。对于已知 ref，读取实时对象；对于标题、引文或描述，先搜索候选项，再依据稳定身份证据选择；对于清单，保留完整 filter 与分页边界。
3. 区分 note、attachment、parent item、collection、topic、Product、artifact、run 与 operation 身份。只有所选读取合同要求时才推导顶层 parent。

### 收集实时证据

4. 使用能够回答问题的最窄当前操作，并且只在需要时扩展：先读 item 详情再读 child，先读 note 元数据再读 body/payload，先读 attachment 元数据再读字节，进行新鲜度敏感解释前先读派生模型状态。
5. 完成必要的 cursor、offset 或内容分页。保留已接受页面、filter、ref、locator、返回的新鲜度事实与最后一个安全恢复位置，不得重复合并同一页。
6. 需要字节时，从所属 attachment、Product 或 artifact 获取访问能力，并验证交付的 checksum 与 byte count。不得从 Zotero 端元数据推断可读本地路径。
7. 区分直接 Zotero 事实、来源文本、插件派生结构、workflow 状态与自身解释。每项主张都不得超过实际交付的最强证据。

### 陈述有边界的答案

8. 使用最小充分证据集回答。凡未遍历范围、不可用内容、过期派生视图或不对称来源深度会影响结论，都必须明确说明。
9. 返回 `zotero-library-task.result.v1`，为每项实质结论提供面向来源的内联证据；只有答案生成单独交付物时才声明 artifact。

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

当请求需要详细的 search/list/snapshot 决策、note payload 或 annotation 处理、attachment 字节交付、readiness 解释、Synthesis 模型选择、隐私最小化，或中断后的分页/文件恢复时，查阅[完整查询操作手册](references/playbook.md)。

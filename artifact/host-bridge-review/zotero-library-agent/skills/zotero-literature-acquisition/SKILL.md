---
name: zotero-literature-acquisition
description: 为 Zotero 文献库发现、评估并采集文献。当用户要求为当前研究任务查找、导入、准备文献或进行去重时使用。
---

# Zotero 文献采集

## 目标

将有边界的文献需求转化为可追溯候选评估，或经实时验证且获批的获取结果，同时保留外部 provenance、Zotero 身份、重复状态与附件 readiness。

## 输入

- 研究问题、纳入/排除标准、日期或来源限制，以及期望结果边界。
- 请求包含获取时的目标 Zotero library、collection 或当前 selection。
- 外部候选项元数据与 provenance，以及 import、附件获取、merge、relink 或其他写入的当前权限。

## 工作流

### 确立候选边界

1. 将请求转化为明确概念、纳入与排除标准、日期/语言/venue/source 约束、所需广度、停止规则与预期结果：候选报告、import、attachment 获取、去重或分析就绪集合。
2. 只有某项选择会实质改变合格文献、目标 library/collection 或请求写入效果时，才要求澄清。
3. 搜索请求的外部来源，并记录 identifier、书目事实、provider provenance、搜索限制与纳入理由。所有外部结果都保持 candidate 状态。

### 解析实时身份与重复项

4. 对每个保留候选项搜索当前 Zotero 文献库。优先比较强 identifier，再比较 title、author、year、venue、edition、translation、preprint 与 publication 关系。
5. 读取可能的实时匹配项，并检查其 attachment、collection membership、note、tag 与获取决策所需的 readiness 事实。不得把相关版本直接折叠为重复项决策。
6. 仅候选项工作返回有边界评估，并列出未解决的身份或访问问题。不得虚构写入阶段。

### 提议、授权并验证

7. 对请求写入，呈现精确 target、candidate set、重复项影响、metadata 来源、attachment 来源、collection 影响、预期输出及最小可审阅批次。
8. 需要 provider 交互或可复用多步 ingest 时，选择已经描述的 acquisition workflow；只有身份与期望效果均已明确时才使用直接语义 operation。分别校验 workflow option 与 provider profile。
9. 将当前获批范围执行一次。重新读取每个已获取 item、collection membership、重复项结果或 attachment 状态，并区分成功、失败与未尝试 candidate。
10. 返回 `zotero-library-task.result.v1`，包含 candidate provenance，或持久 operation/workflow receipt 加实时验证。

## 硬约束

- 没有当前授权以及 Zotero 中显示的必要审批，不得导入、合并、删除、重新链接或获取附件。
- 在对照实时文献库检查身份和重复状态前，将外部发现结果视为候选。
- 不得对现有来源无法支持的相关性、许可或元数据作出断言。
- 获取范围必须限定在请求内；不要创建长期监视列表或后台采集任务。
- 备选项 effect 存在实质差异时，不得静默选择重复项 survivor、目标 collection、版本、附件来源或元数据覆盖。
- 不得把成功搜索、已接受请求、已下载文件或终态工作流视为可用 Zotero 条目和附件已存在的证据。
- 未经单独批准的策展决策，不得用冲突的 provider 元数据替换已策展文献库元数据。

## LLM 与工具职责

LLM 负责搜索策略、纳入判断、provenance 比较、重复评估、readiness 解释与权限检查。随附 CLI 和 runner 负责精确 argv、实时 Zotero 调用、工作流与 mutation 校验、approval 传输、handle 及结果 schema 校验。不得虚构 handle、receipt、获取状态、许可或重复处理结果。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 和 `summary`。已满足声明搜索边界的候选评估，或条目/collection/附件状态经实时验证的获批结果，使用 `completed`。缺少标准、目标选择、重复项决策或写权限时使用 `canceled`；已尝试操作无法安全完成时使用 `failed`。

## 失败处理

保留候选 provenance、重复项备选方案、目标 ref、已接受 workflow 或 operation handle、approval receipt 与结构化失败。获取部分成功时，分别返回成功条目与失败或未尝试候选项。遭拒或存在歧义后，在已准备选项处停止；不得切换到其他 import、mutation、附件或工作流路径。

## 参考资料

当任务需要详细 search-plan 模板、identifier/version 比较、重复项决策记录、licensing 或 provider 边界分析、workflow/provider 选择、attachment-readiness 路径，或批次与部分结果恢复时，查阅[完整获取操作手册](references/playbook.md)。

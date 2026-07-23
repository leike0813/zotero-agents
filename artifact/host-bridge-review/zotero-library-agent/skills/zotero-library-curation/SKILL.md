---
name: zotero-library-curation
description: 规划并执行已获批准、边界明确的 Zotero 文献库维护。当用户要求修正元数据、标签、分类、笔记、链接、就绪状态或其他明确的文献库状态时使用。
---

# Zotero 文献库整理

## 目标

安全地检查、提出、应用并实时验证对 Zotero 元数据、标签、分类、笔记、链接、文件、readiness、Product 或其他明确请求文献库状态的有界变更。

## 输入

- 明确目标对象，或能够解析它们的有界实时查询。
- 当前值、期望状态、修正证据、预期副作用及批次边界。
- 每项 mutation、workflow、upload/attachment、removal、merge 或 apply-back 的当前权限。

## 工作流

1. 阅读[策展操作手册](references/playbook.md)，解析每个实时目标，并且只检查与请求变更相关的字段、membership、笔记、附件、Product 或 readiness 事实。
2. 构建具体 proposal，包含当前状态、期望状态、修正来源、受影响对象、预期副作用、备选方案及最小可审阅批次。
3. 对具体操作选择直接语义 mutation；对已审阅 payload 选择通用 preview/apply 路径；仍需分类、生成或多步业务逻辑时选择工作流。
4. 在当前 Zotero 端权限边界呈现建议的精确 effect。将获批 scope 执行一次，并保留 operation、workflow、file、Product 与 apply-back receipt。
5. 重新读取每个受影响实时对象，并分别分类 completed、unchanged、partial、denied、failed 与 unverified 结果。
6. 返回 `zotero-library-task.result.v1`，包含变更前后身份证据、持久 receipt 以及为审阅生成的任何 artifact。

## 硬约束

- 绝不能依据标题匹配、陈旧缓存、生成的报告或未经验证的导入元数据执行 mutation。
- 没有明确的当前授权以及 Zotero 中显示的必要审批，不得删除、合并、重新链接、覆盖、提交或 apply back。
- 不得执行定时、批量或无人值守的维护变更。
- 必须报告部分应用和验证失败；不能仅凭请求已被接受就声称成功。
- 不得使用导航、原始 capability call、本地数据库访问或工作流绕过 mutation 校验与 approval。
- 不得互换本地路径、已上传 `fileId`、Product ID、工作流 artifact、附件 ref 或 operation handle。
- 在持久 receipt 与当前目标状态明确前，不得重复不确定写入。
- 未经单独审阅的变更，不得把诊断性 readiness 或 attention 结果转为修复。

## LLM 与工具职责

LLM 负责目标解释、期望状态推理、修正证据、批次划分、mutation/workflow 选择、权限检查与结果说明。随附 CLI 和 runner 负责精确 argv、实时读取、preview、mutation、upload/download、approval、handle、receipt 及结果 schema 校验。不得虚构 handle、preview、已应用变更、文件交付或已验证状态。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。只有每个请求目标都经实时验证处于期望状态，或按设计明确报告 unchanged 时，才使用 `completed`。缺少身份、期望状态、修正选择、批次或权限时使用 `canceled`；已尝试操作无法完成或无法确定其结果时使用 `failed`。

## 失败处理

保留 preview、operation/apply receipt、上传文件事实、受影响 ref、变更前证据与结构化诊断。状态未知时检查 operation 并重新读取目标。部分应用时计算剩余 delta，不重放成功变更。遭拒、发生冲突或新发现破坏性 effect 后停止；进行任何补偿 mutation 前呈现确切当前状态。

## 参考资料

选择 mutation 或 workflow、修改 notes/tags/collections/files、处理 Product 或 readiness、划分变更批次，或恢复部分/不确定结果前，阅读[策展操作手册](references/playbook.md)。

---
name: zotero-research-synthesis
description: 将边界明确的 Zotero 文献综合为可追溯的研究上下文。当用户需要针对当前问题生成有证据支持的主题、主张、图谱、缺口或跨来源综合时使用。
---

# Zotero 研究综合

## 目标

将有边界的已验证 Zotero 来源及派生研究结构关联到问题、topic、claim、graph、gap 或 export 结果，同时保留来源分歧、模型 provenance、新鲜度及阶段特定完成证据。

## 输入

- 研究问题，以及 topic、claim、graph、index、resolver selector、artifact、Product 或已解析来源集。
- 纳入规则、期望综合模型与交付物，以及必要新鲜度。
- 工作流提交、派生状态维护、export、persistence 或 Agent apply-back 的当前权限。

## 工作流

1. 阅读[综合操作手册](references/playbook.md)，陈述研究问题，并通过实时读取解析确切来源边界与派生模型。
2. 确立新鲜度、纳入/排除规则，并区分来源主张、Zotero 事实、计算关系、生成 artifact、解释、分歧与 gap。
3. 选择基于受支持读取的直接综合，或实时描述的工作流。分别校验工作流输入与 provider profile，并保留逐阶段 handle 和证据。
4. 需要派生维护时，把 cache、sidecar、graph、index 或 metric operation 作为分别获批、分别出具 receipt 的独立阶段进行诊断和执行。
5. 验证请求的 topic report、graph 结果、artifact、Product、export 或实时 Zotero effect。只能通过其当前权限边界 submit、persist 或 apply 输出。
6. 返回 `zotero-library-task.result.v1`，包含可追溯证据、已声明 artifact、未解决分歧，以及任何失败或跳过的来源 scope。

## 硬约束

- 未经实时验证，不得将生成的图谱、主题或 workflow 输出表述为实时 Zotero 事实。
- 没有当前授权以及 Zotero 中显示的必要审批，不得提交 workflow 或应用 Agent 自有输出。
- 不得将有明确边界的综合请求转化为后台主题维护或持续监控。
- 保留来源分歧、不确定性和缺失证据，不要强行得出结论。
- 不得仅从计算的 graph edge、cluster、ranking 或 topic membership 推断因果关系或学术共识。
- 不得把空派生查询自动作为 cache invalidation、sidecar refresh、graph update 或 metric repair 的理由。
- 不得把一个维护 receipt 视为另一模型的完成证据，也不得跨阶段复用 operation ID。
- 预期 Product 或 artifact asset 下载并验证前，不得声称 export 完成。

## LLM 与工具职责

LLM 负责来源边界、模型选择、关系解释、证据充分性、分歧、gap 分析与工作流判断。随附 CLI 和 runner 负责精确 argv、实时服务调用、run/operation/file/artifact handle、approval 传输及结果 schema 校验。不得虚构 handle、receipt、graph 事实、工作流结果、basis hash 或已应用状态。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。声明的来源/模型边界支持请求综合，且每项承诺输出均已检查时使用 `completed`。缺少问题、来源边界、模型选择、维护 scope 或权限时使用 `canceled`；必要读取或已批准执行无法安全完成时使用 `failed`。

## 失败处理

报告来源集、topic/model 身份、run 与 operation handle、已提交 basis 事实、生成 artifact 及稳定诊断。从首个缺少有效完成证据的综合阶段恢复。工作流需要交互或维护前置条件失败时，返回所需决策或诊断；不得替换另一工作流、扩大来源 scope 或绕过 basis 检查。

## 参考资料

选择 topic/graph/index/resolver/artifact 模型、判断新鲜度、调用综合工作流、执行派生状态维护、export 输出或恢复分阶段生命周期前，阅读[综合操作手册](references/playbook.md)。

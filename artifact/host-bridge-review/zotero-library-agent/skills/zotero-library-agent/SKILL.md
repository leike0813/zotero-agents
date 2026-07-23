---
name: zotero-library-agent
description: 路由和协调有明确边界的 Zotero 文献库研究任务。当请求跨越文献库查询、采集、分析、综合或整理任务，或者需要在这些任务之间进行选择时使用。
---

# Zotero 文献库 Agent

## 目标

将有边界的 Zotero 研究请求路由到能够完成任务的最小 Skill，或协调一组显式有序的任务 Skills，并在边界间保留身份、证据、权限与恢复信息。返回一个真实的任务结果；不得转变为常驻服务，也不得复述 CLI 机制。

## 输入

- 用户的研究目标、纳入边界、期望交付物及新鲜度要求。
- 调用方提供的当前上下文短语、Zotero 对象、分类、topic、工作流、Product、artifact、文件、operation 或 run handle。
- 可用来源材料，以及对获取、工作流提交、变更或 apply-back 的当前权限。

## 工作流

1. 将请求转化为有边界的结果、来源或候选范围、预期新鲜度，以及请求的 Zotero 状态变更。只有缺失选择会实质改变这些维度时才提问。
2. 使用[研究任务模型](references/research-task-model.md)选择查询、获取、分析、综合或策展。若一个任务 Skill 能独立负责完整结果，就只调用该 Skill。
3. 对多阶段工作，声明有序任务序列，以及每个阶段在下一阶段开始前必须生成的证据。复用稳定 Zotero ref 和 bridge 签发的 handle，不改变其类型。
4. 当工作流可执行任务时，根据实时工作流描述选择 Zotero 托管或 Agent 自主执行。工作流选项与 provider profile 必须按各自独立合同校验。
5. 遇到每个新权限边界都必须停止。读取、候选报告、本地校验、既往 approval 或已完成前置任务都不授权 submission、acquisition、mutation 或 apply-back。
6. 要求每个阶段返回 `zotero-library-task.result.v1`。跨阶段只传递面向来源的证据、已声明 artifact、结构化诊断及下一阶段所需 handle。
7. 任何意在改变 Zotero 的操作之后，必须重新读取受影响的实时对象或持久 receipt，才能声明该阶段完成。
8. 精确 argv、输入通道、分页、文件传输、effect、approval、handle 与恢复信息应查阅随附 `zotero-bridge-cli` Skill。不得在此重构其命令目录。

## 硬约束

- 通过实时 Zotero 读取解析当前事实；标题、缓存摘要和先前任务结果不能证明对象身份。
- 所有操作都必须限定在当前请求范围内。不要安排定时任务、无限期轮询或创建无人值守的维护工作。
- 如果范围变化会实质改变候选集或结论，继续执行前必须取得用户当前的决定。
- 没有当前请求以及 Zotero 中显示的必要审批，不得写入 Zotero 数据、提交 workflow 或应用 Agent 输出。
- 将任务的结构化 `failed` 或 `canceled` 结果视为边界。不得虚构后续成功结果。
- 绝不能在任务结果中暴露凭据、bearer token、本地数据库路径或私有附件内容。
- 不得把工作流终态当作预期 Product、artifact、条目变更或 synthesis 状态存在的证据。
- 需要文件 handle、Product ID、工作流 artifact、Zotero ref 或 run handle 时，不得传入本地路径。
- 不得通过 Zotero 托管 run 平面监控 Agent 自主的 `agentRunId`，也不得使用 `workflowRunId` 执行 Agent apply-back。

## LLM 与工具职责

LLM 负责任务路由、scope、证据充分性、工作流模式判断、解释、权限检查及跨任务 handoff。各任务 Skill 负责其领域决策。随附 CLI 与 runner 负责精确 argv、服务调用、归档检查、handle 传输、approval 交换和结果 schema 校验。不得虚构 handle、receipt、命令结果或 Zotero 成功状态。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象。必需字段为 `schema`、`status` 与 `summary`：`completed` 表示每个请求阶段均满足各自基于证据的完成条件；`canceled` 表示缺少必要决策、身份、输入或权限；`failed` 表示已尝试阶段无法安全完成。包含相关内联 `evidence`、已声明 `artifacts` 与结构化 `diagnostics`。仅在等待具体用户决策时使用 runner pending envelope。

## 失败处理

保留最后完成阶段、稳定来源 ref、结构化错误、operation receipt 和类型化 handle。从首个缺少必要证据的阶段恢复；不得仅因后续阶段失败，就重放更早的 acquisition、submission、mutation、维护 operation 或 apply-back。缺少当前决策时返回 `canceled`；声明的恢复路径无法完成后返回 `failed`。

## 路由

- 查询：`zotero-library-query`
- 采集：`zotero-literature-acquisition`
- 分析：`zotero-literature-analysis`
- 综合：`zotero-research-synthesis`
- 整理：`zotero-library-curation`

## 参考资料

进行路由、阶段组合、工作流所有权选择、Agent 自主 handoff、证据或文件传递，或多阶段请求恢复前，阅读[研究任务模型](references/research-task-model.md)。该文档包含完整的跨任务决策模型；任务特定决策仍归所选任务 Skill 所有。

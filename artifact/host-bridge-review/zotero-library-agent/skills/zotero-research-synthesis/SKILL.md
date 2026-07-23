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

### 确立来源与模型边界

1. 陈述研究问题、纳入与排除规则、所需新鲜度与预期交付物。解析每个 source ref 及所用的确切 topic、graph、index、resolver selector、artifact、Product 或 schema。
2. 选择真正回答问题的派生模型。在解释之前，记录其 identity、scope、分页完成情况、freshness 状态及缺失的来源覆盖。
3. 区分直接来源主张、当前 Zotero 事实、note/annotation、计算关系、workflow 生成解释、自身 inference、分歧与 evidence gap。

### 分离读取、workflow 与 maintenance

4. 不需要可复用执行合同时，直接从受支持读取进行综合。workflow 负责请求的 provider 执行或多 artifact 输出时，使用实时描述的 workflow；分别校验 workflow input 与 provider profile。
5. 将 sidecar refresh、citation-graph update、graph-metric repair、cache invalidation 与 index status 视为独立 maintenance 合同。提出操作前，先诊断准确的过期模型与 scope。
6. 保留每个 workflow 或 maintenance 阶段的 handle、approval、source scope、pre-state、post-state、成功与失败 ref、retryability 与 basis hash。一份 receipt 绝不能完成另一个阶段。

### 验证每项请求输出

7. 独立于 terminal run 状态验证请求的 topic identity/report、graph result、resolver scope、artifact、Product、downloaded export 或实时 Zotero effect。
8. 只有经过新的当前权限边界，才能 submit、persist、attach 或 apply 综合输出。本地 artifact 不证明 Zotero 状态。
9. 返回 `zotero-library-task.result.v1`，包含可追溯证据、已声明 artifact、明确的分歧与 gap，以及每个失败、跳过或不可用的来源对象。

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

当任务需要详细派生模型选择、freshness 决策记录、workflow/maintenance 前置条件、basis-hash 生命周期、多阶段 literature-to-topic 序列、Product/export 验证或分阶段恢复时，查阅[完整综合操作手册](references/playbook.md)。

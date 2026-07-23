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
- 工作流提交、派生状态维护、export、persistence 或 Agent apply-back 的当前授权。

## 自然语言输入理解

将诸如“文献说了什么”、“绘制这个领域的地图”、“找到差距”或“更新主题”等宽泛的措辞翻译成有限的源集、研究问题、综合模型和可交付成果。

|用户措辞 |初始路线|物质边界|
| --- | --- | --- |
| “文献对 X 有何看法？” |源头综合 |绑定包含的 Zotero 来源和正在综合的问题|
| “这些论文有何关联？” |比较或图辅助合成|确定关系是否来自来源声明、引文、计算图边缘或解释 |
| “研究差距是什么？” |间隙合成|定义语料库、时间界限、证据标准，以及缺失的覆盖范围是否可以与真实的差距区分开来 |
| “为 X 创建一个主题”| Synthesis workflow 候选项 |建立源集、主题标识、workflow 选项、提交权限 |
| “刷新这个主题并告诉我发生了什么变化”|维护后合成|诊断过时的模型和范围；获得单独的维护权限|
| “导出合成”| Product/artifact 发货 |确定预期的导出、格式、Product/资产和本地目的地 |
| “图表没有 X；更新它”|维护前诊断|空结果本身并不能证明刷新或图形写入变更是合理的 |

捕获：

- 研究问题和预期的决定；
- 已验证的源集和包含/排除规则；
- 源新鲜度和所需的派生模型新鲜度；
- 综合形式：叙述、权利要求表、主题报告、引文图、差距图、时间线、解析器结果或导出；
- 分歧和不确定性处理；
- 当两者都支持时，workflow 或直读首选项；
- 请求的维护、持久性、导出或apply-back效果。

询问时间：

- 源集或研究问题不受限制；
- 多种模型可以回答不同的问题；
- 派生状态已过时，维护操作会更改它；
- 图结构可能会被误认为是学术协议或因果关系；
- workflow/provider 选择会改变执行、成本或产出；
- “保存”、“发布”、“附加”或“更新”引入了新的状态更改边界。

安全默认值：

- 从当前经过验证的 Zotero 源进行合成，无需维护；
- 保留分歧和缺失的证据；
- 除非要求结构化交付成果，否则使用叙述性答案；
- 在使用派生视图之前检查模型状态；
- 将生成的输出保留在 Zotero 之外，除非稍后的管理/apply-back阶段获得授权。

源包含、主题标识、维护范围、因果解释、workflow 提交、导出目标、持久性或apply-back没有安全默认值。

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
8. 只有经过新的当前授权边界，才能 submit、persist、attach 或 apply 综合输出。本地 artifact 不证明 Zotero 状态。
9. 返回 `zotero-library-task.result.v1`，包含可追溯证据、已声明 artifact、明确的分歧与 gap，以及每个失败、跳过或不可用的来源对象。

### 分层构建综合

1. 盘点经过验证的来源和可用的证据深度。
2. 使用locators提取源级声明。
3. 按所声明的问题或模型对主张进行分组，而不消除分歧。
4. 单独的直接证据、书目关系、计算结构、workflow 输出和你的推论。
5. 状态覆盖差距以及它们是否反映了缺失的来源、无法访问的内容、过时的派生状态或支持的研究差距。
6. 验证每个请求的 artifact、Product 资产、主题报告、图表结果或导出。

使用 workflow 时，保留实时 workflow 描述、选择、providerprofile、选项、运行handle、预期结果证据和检查结果。使用维护时，保留诊断的模型、预状态、范围、操作 ID、receipt、后状态和基础哈希（如果已声明）。

不要将 workflow 执行和维护合并为一项权限决策。不要将已完成的维护操作视为重新计算或检查了所请求的综合的证据。

对于面向人的结果，请说明：

- 有界问题和源集；
- 主要支持的主题或关系；
- 分歧和不确定性；
- 证据和locators；
- 派生模型的出处和新鲜度；
- 来源不可用或阶段不完整；
- 生成artifacts及其验证；
- 任何单独提议的下一个状态更改。

### Synthesis 完成清单

源边界：

- 每个包含的源都已解析且符合声明的规则。
- 排除的和不可用的来源是可见的。
- 源级证据不会被图表或主题成员资格取代。
- 实时来源和派生模型的新鲜度都会被记录。

模型边界：

- 所选模型回答所声明的问题。
- 保留模型标识、范围、分页、基础和状态。
- 图、主题、解析器、索引、artifact 和 Product 身份保持不同。
- 计算的结构不会提升为因果关系或共识。

执行：

- 直接综合、workflow 执行和维护是不同的阶段。
- workflow 选择、选项、provider和预期输出均经过验证。
- 维护已诊断范围、权限、操作receipt、后状态。
- 一个receipt不会被重新用作另一个模型的证据。

输出：

- 主题、主张、关系、差距和分歧都可以追溯到证据。
- 缺失的覆盖范围与受支持的研究空白不同。
- 每个承诺的Product或artifact都会经过检查，并根据要求下载和验证。
- 坚持或申请回来都有自己的权威和receipt。

有惊无险：

- 空图查询并不能证明没有学术关系。
- 主题簇并不能证明作者同意。
- 过时的索引不会自动授权刷新。
- 完成的刷新并不证明综合报告已重新生成。
- 本地导出并不能证明 Zotero 笔记或附件存在。
- 未经验证，workflowartifact不会成为实时库真理。

如果模型无法回答问题，请在解释差异后选择其他支持的模型；不要默默地重新解释用户的目标。

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

## 结果契约

返回与 `assets/output.schema.json` 匹配的一项业务 JSON 对象。

要求：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或`failed`。
- `summary`：说明研究问题、来源/模型边界、综合结果、验证的可交付成果、分歧和材料限制。

可选：

- `evidence`是一个可选数组；每个条目需要`kind`和`ref`；将其用于 Zotero 源、源locators、主题、图形查询、模型状态、workflow 运行、Products、artifacts或维护receipts。
- `artifacts`是一个可选数组；每个条目都需要现有的`path`和`role`，例如`topic-report`、`claim-matrix`、`graph-export`或`synthesis-bundle`；已知时添加`mediaType`。
- `diagnostics`是一个可选数组；每个条目都需要 `code` 和 `message` 来表示过时的模型、源间隙、不受支持的推论、workflow/维护故障、缺少 Products 或其他稳定的限制。

状态规则：

- `completed`：有界源/模型基础支持综合，并且检查每个承诺的输出。
- `canceled`：问题、来源边界、型号选择、维护范围、导出目标或权限缺失。
- `failed`：尝试读取、workflow、维护操作或输出验证无法完成总体综合目标。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Synthesized the bounded source set into a claim map, preserved two material disagreements, and verified the requested export artifact."
}
```

不要发明`partial`。如果存在有效的子集结果，但总体请求的合成失败，请使用`failed`，保留有效证据和artifacts，并诊断缺失的阶段或来源。

Runner 的`__SKILL_DONE__` 标记是传输元数据，而不是业务字段。仅将挂起分支用于具体的用户决策，并发出最终的业务对象，而无需 Markdown 或额外的文字。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。声明的来源/模型边界支持请求综合，且每项承诺输出均已检查时使用 `completed`。缺少问题、来源边界、模型选择、维护 scope 或权限时使用 `canceled`；必要读取或已批准执行无法安全完成时使用 `failed`。

## 失败处理

报告来源集、topic/model 身份、run 与 operation handle、已提交 basis 事实、生成 artifact 及稳定诊断。从首个缺少有效完成证据的综合阶段恢复。工作流需要交互或维护前置条件失败时，返回所需决策或诊断；不得替换另一工作流、扩大来源 scope 或绕过 basis 检查。

## 参考资料

当任务需要详细派生模型选择、freshness 决策记录、workflow/maintenance 前置条件、basis-hash 生命周期、多阶段 literature-to-topic 序列、Product/export 验证或分阶段恢复时，查阅[完整综合操作手册](references/playbook.md)。

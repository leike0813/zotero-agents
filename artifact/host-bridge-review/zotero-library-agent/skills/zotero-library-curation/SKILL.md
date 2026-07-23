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
- 每项 mutation、workflow、upload/attachment、removal、merge 或 apply-back 的当前授权。

## 自然语言输入理解

将“组织”、“清理”、“修复”、“标记”、“合并”、“保存”和“将其放入 Zotero”视为审查所需状态的请求，而不是立即允许写入。

|用户措辞 |候选项变更 |材料澄清|
| --- | --- | --- |
| “清理这些标签” |标签规范化提案 |目标集、受控词汇、添加/删除策略和批量大小 |
| “修复元数据” |现场修正建议|精确字段、更正证据、冲突策略和版本/版本标识 |
| “将这些论文放入我的项目集中” |集合成员写入变更 |目标收集、已解决的项目、现有成员资格和删除期望 |
| “合并重复项”|破坏性的重复决定 |幸存者、孩子、笔记、依恋、关系和不可逆转的后果 |
| “将此分析另存为注释” |神器笔记写|已验证artifact、目标父级、注释角色、替换策略和权限 |
| “附加此文件”|上传然后附件写入变更|本地文件验证、目标父级、附件元数据和覆盖行为 |
| “应用 workflow 结果” |workflow 申请返回 |类型化请求/结果映射、验证、批准和持久 receipt |
| “修复准备问题” |诊断后提出建议 |准确的准备类别和单独审查的补救措施|

捕获：

- 精确目标refs或有界实时查询；
- 当前值和期望值；
- 支持每项更正的证据；
- 受影响的子对象、关系、文件、Products、注释和集合成员资格；
- 破坏性或不可逆转的后果；
- 最小可审查批次；
- 直接写入变更、通用预览/应用、workflow、文件上传或apply-back路径；
- 写入后实时验证。

询问时间：

- 目标身份不明确；
- “清洁”、“修复”或“组织”允许几种本质上不同的期望状态；
- 修正源与策划的元数据冲突；
- 可以合并、删除、覆盖、重新链接或替换附件；
- 生成的artifact必须映射到 Zotero 对象；
- 批次范围或审批效果不明确；
- 部分之前的操作可能已经改变了状态。

安全默认值：

- 检查并提出不书面建议；
- 保留未明确针对的现有价值观；
- 将异构或破坏性变更分成较小的批次；
- 将准备情况和诊断视为观察结果，而不是补救权威；
- 需要实时写入后验证。

目标身份、重复幸存者、破坏性影响、元数据覆盖、集合删除、上传文件消耗、workflow 提交或apply-back没有安全默认值。

## 工作流

### 解析目标与 proposal

1. 解析每个实时目标，并且只检查与请求变更相关的当前 field、membership、note、payload、attachment、Product、relation 或 readiness 事实。
2. 陈述期望状态与修正证据。公开 conflict、alternative、受影响 child 或相关 record，以及任何会使 target 产生歧义或具有破坏性的后果。
3. 构建最小可审阅 proposal，包含逐 target 的 before/after 状态、精确 effect、修正来源、预期副作用、artifact/file 流程与 batch 边界。

### 选择并授权写入

4. target 与 effect 明确时使用直接语义 mutation；对已审阅 payload 使用通用 preview/apply；只有仍需 classification、generation、provider execution 或可复用多步业务逻辑时才使用 workflow。
5. 对文件回写，验证本地 artifact，上传并保留签发的 `fileId`，通过获批 mutation 把它附加到已解析 parent，并区分每个身份。
6. 在当前 Zotero 端权限边界呈现精确 proposal。将获批 scope 执行一次，并保留 preview、operation/workflow handle、approval outcome、file/Product 事实与 apply-back receipt。

### 验证并恢复结果

7. 重新读取每个受影响实时对象，并与获批 proposal 比较。分别分类 completed、unchanged、partial、denied、failed、unattempted 与 unverified 结果。
8. 对部分或不确定状态，使用持久 receipt 与实时 target，只计算 residual delta。不得重放已验证成功项，也不得在没有新审阅 proposal 时开始补偿性写入。
9. 返回 `zotero-library-task.result.v1`，包含 before/after 身份证据、持久 receipt、remaining delta 以及为审阅生成的任何 artifact。

### 使提案可供审查

每个提案行必须标识：

- 目标 Zotero ref 和当前实时值；
- 期望值；
- 支持变更的证据或用户说明；
- 语义操作和预期效果；
- 可能发生变化的相关子项或对象；
- 影响是否具有破坏性或难以逆转；
- 审批范围；
- 预期的实时验证读取；
- 恢复handle或receipt。

仅当行共享相同的更改规则、证据源、权限边界和恢复行为时，才对行进行分组。当结果不同时，将元数据更正、标签规范化、集合更改、附件写入、合并、删除和应用回分成单独的批次。

执行后：

1. 重新阅读每个目标。
2. 将实际状态与批准的行进行比较。
3. 将每个目标标记为已完成、未更改设计、已拒绝、已失败、未尝试或未验证。
4. 保持持久运行或apply-backreceipt。
5. 仅计算剩余增量。
6. 将任何补偿性变更作为新提案提出。

接受的请求、预览、操作开始、上传的文件、终端 workflow 或Productartifact不是实时写入验证。

### 整理完成清单

目标：

- 每个目标ref均已实时解决。
- 子项、父项、Product、artifact、文件、运行和操作标识保持不同。
- 该提案仅包含所请求的字段或关系。
- 保留当前值以供比较和恢复。

期望的状态：

- 每个建议值都有用户说明或纠正证据。
- 冲突和替代方案是显而易见的。
- 破坏性影响和受影响的儿童是显而易见的。
- 异构变更被分成独立的批次。

权威机构：

- 确切的当前提案显示在正确的批准边界处。
- 事先预览、批准或 workflow 并不授权此新效果。
- 上传的字节不会在其声明的下一步之外被消耗。
- Apply-back 使用完整的类型化请求到结果映射。

验证：

- 每个受影响的活动对象都被重新读取。
- 根据目标对实际状态和批准状态进行比较。
- 持久的receipts和handle消耗被保留。
- 部分或未知的结果仅产生残余增量。

有惊无险：

- 标题匹配不是写入变更目标。
- provider 更正并不自动具有权威性。
- 上传成功不等于附件成功。
- workflow 终止不是apply-back完成。
- 准备情况诊断不是补救权威。
- 补偿写入需要新的提案。
- 不得重复未知的先前写入。

如果验证无法确定结果，请勿将目标标记为已完成。保留receipt，报告未知状态，并在任何重试之前停止。

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

## 结果契约

返回与 `assets/output.schema.json` 匹配的一项业务 JSON 对象。

要求：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或`failed`。
- `summary`：描述审查的目标范围、请求的期望状态、应用和验证的结果以及剩余增量。

可选：

- `evidence`是一个可选数组；每个条目需要`kind`和`ref`；将其用于目标refs、读取、预览、操作receipts之前/之后、审批结果、上传的文件、workflow 运行、Products或apply-backreceipts。
- `artifacts`是一个可选数组；每个条目都需要现有的`path`和`role`，例如`change-proposal`、`conflict-report`或`residual-delta`；已知时添加`mediaType`。
- `diagnostics`是一个可选数组；每个条目都需要 `code` 和 `message` 来表示冲突、拒绝授权、部分执行、未知状态、破坏性歧义或验证失败。

状态规则：

- `completed`：每个请求的目标都在所需状态下进行实时验证，或者经批准的设计明确未更改。
- `canceled`：目标、期望状态、修正选择、批次范围、破坏性决策或当前授权缺失。
- `failed`：尝试的操作无法完成，或者其结果无法足够好地满足总体请求。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Applied and live-verified the approved tag changes for eight items; two already matched the desired state."
}
```

不要发明`partial`。如果批次部分适用，则使用`failed`，保留成功的前后证据和receipts，并仅描述剩余的增量。切勿将整个批次报告为成功。

Runner 的 `__SKILL_DONE__` 标记是传输元数据，在 Schema 验证之前被删除。它不得出现在业务对象或结果文件中。恰好发出一个 JSON 对象，而无需 Markdown 框架。

## 完成条件

返回一个最终 `zotero-library-task.result.v1` 对象，必需字段为 `schema`、`status` 与 `summary`。只有每个请求目标都经实时验证处于期望状态，或按设计明确报告 unchanged 时，才使用 `completed`。缺少身份、期望状态、修正选择、批次或权限时使用 `canceled`；已尝试操作无法完成或无法确定其结果时使用 `failed`。

## 失败处理

保留 preview、operation/apply receipt、上传文件事实、受影响 ref、变更前证据与结构化诊断。状态未知时检查 operation 并重新读取目标。部分应用时计算剩余 delta，不重放成功变更。遭拒、发生冲突或新发现破坏性 effect 后停止；进行任何补偿 mutation 前呈现确切当前状态。

## 参考资料

当任务需要 change-type 决策矩阵、note/payload/file/Product 身份流程、破坏性变更审阅、异构 batching、operation-receipt 解释、部分执行分析或 residual-delta 恢复时，查阅[完整整理操作手册](references/playbook.md)。

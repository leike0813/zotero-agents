---
name: zotero-library-curation
description：规划并应用经批准的、有界的 Zotero 库维护。当用户请求修正元数据、tags、collections、notes、链接、就绪度或其他显式库状态时使用。
---

# Zotero 库策展

## 目标

安全地检查、提议、应用并实时验证对 Zotero 元数据、tags、collections、notes、链接、文件、就绪状态、Products 或其他显式请求的库状态的有界变更。

## 输入

- 显式目标对象或能解析它们的有界实时查询。
- 当前值、期望状态、修正证据、预期副作用与批次边界。
- 对每个 mutation、workflow、上传/attachment、移除、合并或 apply-back 的当前权限。

## 自然语言输入

把 "organize"（整理）、"clean up"（清理）、"fix"（修复）、"tag"（加标签）、"merge"（合并）、"save"（保存）与 "put this in Zotero"（把这放进 Zotero）视为对经审阅的期望状态的请求，而非立即写入许可。

| 用户措辞 | 候选更改 | 实质澄清 |
| --- | --- | --- |
| “清理这些 tags” | tag 规范化 proposal | 目标集合、受控词表、添加/移除策略与批大小 |
| “修复元数据” | 字段修正 proposal | 确切字段、修正证据、冲突策略与版本/版次身份 |
| “把这几篇论文放进我的 project collection” | collection 成员关系变更 | 目标 collection、已解析 items、既有成员关系与移除预期 |
| "Merge the duplicates"（合并重复项） | 破坏性重复决策 | 幸存者、子项、notes、attachments、关系与不可逆后果 |
| “把这份分析保存为 note” | artifact 到 note 的写入 | 已验证 artifact、目标父级、note 角色、替换策略与 authority |
| “附加此文件” | 上传后接 attachment 变更 | 本地文件校验、目标父项、attachment 元数据与覆盖行为 |
| “应用 workflow 结果” | workflow apply-back | 类型化请求/结果映射、验证、approval 与持久 receipt |
| “修复就绪问题” | 先诊断后提案 | 确切就绪类别与单独审阅的补救措施 |

捕获：

- 确切的目标 refs 或有界的实时查询；
- 当前值与期望值；
- 支撑每个修正的证据；
- 受影响的子对象、关系、文件、Products、notes 与 collection 成员关系；
- 破坏性或不可逆后果；
- 最小的可审阅批次；
- 直接 mutation、通用 preview/apply、workflow、file upload 或 apply-back 路径；
- 写后实时验证。

在以下情况询问：

- 目标身份有歧义；
- "clean"、"fix" 或 "organize" 承认多种实质不同的期望状态；
- 修正源与策展元数据冲突；
- merge、delete、overwrite、relink 或 attachment 替换可能发生；
- 生成的 artifact 必须映射到 Zotero 对象；
- 批次范围或 approval 影响不清楚；
- 先前部分操作可能已改变状态。

安全默认值：

- 只检查与提议，不写入；
- 保留未被显式针对的现有值；
- 把异构或破坏性变更拆成更小批次；
- 把 readiness 与 diagnostics 当作观察，而非补救权限；
- 要求实时写后验证。

目标身份、重复项保留记录、破坏性影响、元数据覆盖、collection 移除、上传文件消耗、workflow 提交或 apply-back 都没有安全默认。

## 工作流

### 解析目标与提案

1. 解析每个实时目标，只检查与请求变更相关的当前字段、成员关系、notes、payloads、attachments、Products、关系或就绪事实。
2. 说明期望状态与修正证据。暴露会使目标含混或具破坏性的冲突、替代项、受影响的子级或相关记录及后果。
3. 构建最小可审阅提案，含逐目标变更前后状态、确切影响、更正来源、预期副作用、artifact/file 流向与批次边界。

### 选择并授权写入

4. 当目标与效果具体时使用直接语义 mutation；对经审查的 payload 使用通用 preview/apply；仅当仍需分类、生成、provider 执行或可复用多步业务逻辑时才使用 workflow。
5. 对于文件回写，验证本地 artifact，上传它，保留签发的 `fileId`，通过已批准的 mutation 将其附加到已解析的父级，并保持每个身份分开。
6. 在当前 Zotero 侧授权边界呈现确切提案。只执行一次已批准的范围，并保留预览、operation/workflow handle、approval 结果、file/Product 事实与 apply-back receipt。

### 核实并恢复结果

7. 重新读取每个受影响的实时对象，并与已批准的提案比较。分别归类 completed、unchanged、partial、denied、failed、unattempted 与 unverified 结果。
8. 对于部分或不确定状态，使用持久 receipt 与实时目标只计算残余 delta。不要重放已验证的成功，也不要在没有新的经审查 proposal 时开始补偿性写入。
9. 返回 `zotero-library-task.result.v1`，含前后身份证据、持久 receipt、剩余 delta 与为审查产生的任何 artifact。

### 使提议可审查

每个提案行必须指明：

- 目标 Zotero ref 与当前实时值；
- 期望值；
- 支持更改的证据或用户指示；
- 语义 operation 与预期影响；
- 可能更改的相关子级或对象；
- 影响是否具破坏性或难以逆转；
- approval 范围；
- 期望的实时核实读取；
- 恢复 handle 或 receipt。

仅当行共享相同的变更规则、证据来源、权限边界与恢复行为时才分组。当后果不同时，把元数据修正、tag 规范化、collection 变更、attachment 写入、合并、移除与 apply-back 拆成独立批次。

执行后：

1. 重读每个目标。
2. 将实际状态与已批准行比较。
3. 将每个目标标记为已完成、按设计未变更、被拒绝、失败、未尝试或未验证。
- 4. 保留持久 operation 或 apply-back receipt。
- 5. 仅计算残余 delta。
6. 把任何补偿性变更作为新提案呈现。

已接受的请求、preview、operation 启动、上传文件、终态 workflow 或 Product artifact 都不是实时的写入验证。

### 策展完成清单

目标：

- 每个目标 ref 都已实时解析。
- Child、parent、Product、artifact、file、run 与 operation identity 保持不同。
- 提案只含所请求的字段或关系。
- 保留当前值以供比较与恢复。

期望状态：

- 每个拟议值都有用户指令或纠正证据。
- 冲突与替代方案可见。
- 破坏性效果与受影响的子级是显式的。
- 异构变更被拆分为独立批次。

授权：

- 确切的当前提议已在正确的 approval 边界显示。
- 先前的 preview、approval 或 workflow 不授权这一新效果。
- 上传的字节不会在其声明的下一步之外被消耗。
- apply-back 使用完整的类型化请求到结果映射。

验证：

- 每个受影响的实时对象已重新读取。
- 实际状态与批准状态按目标逐一比较。
- 持久 receipts 与 handle 消耗被保留。
- 部分或未知结果只产生残余 delta。

接近命中：

- 标题匹配不是 mutation 目标。
- provider 修正不自动成为权威。
- 上传成功不等于 attachment 成功。
- workflow 终止不是 apply-back 完成。
- 就绪诊断不是补救授权。
- 补偿性写入需要新提案。
- 未知的先前写入不得重复。

若验证无法确定结果，不要把目标标为已完成。保留 receipt、报告未知状态，并在任何重试前停止。

## 硬性约束

- 绝不基于标题匹配、过期 cache、生成的报告或未验证的导入元数据进行 mutation。
- 未经明确的当前权限及 Zotero 中显示的任何 approval，不要删除、合并、relink、覆盖、提交或 apply back。
- 不做计划的、批量的或不看护的 maintenance 变更。
- 报告部分应用与验证失败；不要仅凭已接受的请求声称成功。
- 不要把导航、原始 capability 调用、本地数据库访问或 workflow 当作绕过变更校验与 approval 的方式。
- 不要交换本地路径、已上传的 `fileId` 值、Product ID、workflow artifact、attachment 引用或 operation handle。
- 在持久 receipt 与当前目标状态已知之前，不要重复不确定的写入。
- 未经单独审阅的变更，不要把诊断就绪度或 attention 结果转化为补救。

## LLM 与工具职责

LLM 拥有目标解读、期望状态推理、修正证据、批处理、mutation/workflow 选择、权限检查与结果说明。捆绑的 CLI 与 runner 拥有精确 argv、实时读取、previews、mutations、上传/下载、approvals、handles、receipts 与结果 schema 校验。不要臆造 handles、previews、已应用变更、文件交付或已核实状态。

## 结果契约

返回与 `assets/output.schema.json` 匹配的一个业务 JSON 对象。

必需：

- `schema`：`zotero-library-task.result.v1`。
- `status`：`completed`、`canceled` 或 `failed`。
- `summary`：描述已审查的目标范围、请求的期望状态、已应用与已验证结果及剩余 delta。

可选：

- `evidence` 是可选数组；每个条目要求 `kind` 与 `ref`；用于目标 refs、前后读取、previews、operation receipts、approval 结果、上传文件、workflow runs、Products 或 apply-back receipts。
- `artifacts` 是可选数组；每个条目要求现有的 `path` 与 `role`，如 `change-proposal`、`conflict-report` 或 `residual-delta`；已知时添加 `mediaType`。
- `diagnostics` 是可选数组；每个条目在冲突、被拒授权、部分执行、未知状态、破坏性歧义或验证失败时需要 `code` 与 `message`。

状态规则：

- `completed`：每个请求的目标都已在期望状态实时核实，或按已批准设计显式不变。
- `canceled`：目标、期望状态、修正选择、批次范围、破坏性决策或当前权限缺失。
- `failed`：尝试的 operation 无法完成，或其结果无法充分确立以满足整体请求。

最小结果：

```json
{
  "schema": "zotero-library-task.result.v1",
  "status": "completed",
  "summary": "Applied and live-verified the approved tag changes for eight items; two already matched the desired state."
}
```

不要发明 `partial`。若批次部分应用，使用 `failed`、保留成功的变更前后证据与 receipts，并只描述剩余差异。绝不把整个批次报告为成功。

Runner 的 `__SKILL_DONE__` 标记是传输元数据，在 Schema 验证前移除。它不得出现在业务对象或结果文件中。发出恰好一个 JSON 对象，无 Markdown 框架。

## 完成

返回一个最终的 `zotero-library-task.result.v1` 对象，含必需的 `schema`、`status` 与 `summary`。仅当每个请求的目标都已在期望状态中实时验证或被明确报告为按设计未变更时，才使用 `completed`。当身份、期望状态、纠正选择、批次或 authority 缺失时使用 `canceled`；当尝试的 operation 无法完成或其结果无法确立时使用 `failed`。

## 失败处理

保留 preview、operation/apply receipt、已上传文件事实、受影响的 ref、变更前证据与结构化诊断。对于未知状态，检查 operation 并重新读取目标。对于部分应用，在不重放已成功变更的情况下计算剩余 delta。在拒绝、冲突或新发现的破坏性效果后停止；在任何补偿性变更之前呈现确切当前状态。

## 参考

当任务需要变更类型决策矩阵、note/payload/file/Product identity 流程、破坏性变更审阅、异构批处理、operation-receipt 解读、部分执行分析或残余 delta 恢复时，查阅 [comprehensive curation playbook](references/playbook.md)。

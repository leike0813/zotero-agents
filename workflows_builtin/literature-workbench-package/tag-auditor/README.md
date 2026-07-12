# Tag Auditor

## 这个 Workflow 做什么？

全库扫描所有顶层常规文献，将每个条目的标签与受控词表逐一比对，记录合规状态到 Synthesis Workbench 的 Tags 审查面板。它**不修改任何标签**，只做只读审查。

## 前置准备

需要在 Synthesis Workbench → Tags 中已定义受控词表（至少一条）。可通过 [Tag Bootstrapper](../tag-bootstrapper/README.md) 创建，或手动维护。未定义词表时，所有条目都会被标记为不合规。

## 怎么输入？

无需选中条目。从 Dashboard 直接运行，无用户参数。

## 执行方式

全自动执行，不包含中间确认：

1. 遍历所有 library 中的顶层常规条目，跳过子条目和软删除条目。
2. 逐条提取标签，与受控词表比对，判定合规状态。
3. 按 `libraryId` 分组，写入 Synthesis Workbench 的 Tags 审查面板（`replaceTagAuditRecords`）。

可安全重复运行——每次执行会覆盖上次审查结果。

## 需要多长时间？

取决于文献库中顶层常规条目的数量。通常数秒到数分钟。

## 产出什么？

更新 Synthesis Workbench 的 Tags 审查面板中的 audit records，每条包含：

- `compliant`：该条目标签是否全部在词表内
- `nonCompliantTags`：不在词表中的标签列表

运行结果汇总各 library 的 `audited`（审查总数）和 `needsTagRegulation`（不合规条目数）。

## 参数说明

无用户可配置参数。

## 模型建议

无需后端模型，纯本地执行。

## 依赖

不需要后端连接。依赖 Zotero 条目访问权限和 Synthesis 受控词表。

## 相关 Workflow

- [Tag Bootstrapper](../tag-bootstrapper/README.md) — 创建受控标签词表
- [Tag Regulator](../tag-regulator/README.md) — 规范化标签并清除审查记录

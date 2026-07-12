# 标签审计

## 用途

扫描 Zotero 库中所有顶层常规条目的受控标签词表合规性，并报告每个条目的标签合规情况。结果写入 Synthesis 工作台的标签审计面板供审查和后续规范化。

## 输入

无需参数，无需选择 Zotero 条目。该 workflow 操作整个库。

## 工作过程

1. 通过 `exportTagVocabularyForRegulator` 从 Synthesis 加载受控标签词表。
2. 分页读取库中所有顶层常规条目（排除子条目、笔记、附件和已删除条目）。
3. 对每个条目收集其当前标签并评估合规性：不在受控词表中的标签视为不合规。
4. 按库 ID 分组审计记录，通过 `replaceTagAuditRecords` 写入 Synthesis。

该 workflow 完全自动运行，不修改任何 Zotero 条目或标签。它是一个只读扫描，为标签面板生成审计记录。

## 输出与 Apply

Synthesis 工作台标签审计面板显示每个条目的审计记录，每条记录包含：

| 字段 | 说明 |
|-------|-------------|
| `itemKey` | Zotero 条目 key |
| `compliant` | 该条目的所有标签是否都在受控词表中 |
| `nonCompliantTags` | 不在受控词表中的标签列表 |

运行结果汇总每个库中已审计的条目数和需要标签规范化的条目数。再次运行 workflow 将替换之前的审计记录（在同一词表状态下幂等）。

前提条件是受控标签词表必须已在 Synthesis 工作台的标签页面中定义。

## 依赖

- 无需后端连接
- **受控词表**：必须先定义受控标签词表；参见[标签管理](../synthesis/tags)

## 相关 Workflow

- [Tag Regulator](tag-regulator) — 基于受控词表规范化标签并推断新标签
- [Tag Bootstrapper](tag-bootstrapper) — 交互式创建受控标签词表

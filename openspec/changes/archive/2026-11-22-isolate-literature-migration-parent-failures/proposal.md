# Proposal

## Why

一次文献产物迁移在第 5 组返回通用错误后终止，留下 108 组未尝试。后续独立父条目应能继续迁移，只有整批执行所需的条件失效时才停止。

## What Changes

- 按父条目隔离写入和回执。单组失败、异常或待修复时，持久化该组结果后继续尝试后续独立组。
- 将用户取消、宿主关闭、库不可写和必要回执无法持久化作为整批停止条件，保留已有回执和未尝试候选。
- 为写入前缺失的旧载荷附件记录 `not_found / read`，保留原笔记及附件记录。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `literature-artifact-migration` 按父条目结算失败与修复状态，明确整批停止条件。

## Impact

涉及文献迁移调度、Zotero Broker 的旧附件读取与宿主关闭入口，以及迁移回归测试和项目文档。增量以 `babc978b2` 为基线，补记已经实现并写入主规格的变更。

# Redesign Synthesis Persistence for Performance

## Summary

将 Synthesis layer 从当前 **JSON canonical hot path** 重设为 **SQLite-first local working state**。UI、MCP、Host Bridge、后台 worker、review action 和 Registry Cache / Citation Graph 查询默认读写 SQLite；`data/synthesis/` 中的 JSON canonical assets 降级为显式 import / export / checkpoint / future sync 的冷路径。

本 change 的目标不是继续修补现有 JSON projection，而是统一重定 Synthesis 的持久化主架构、Paper Registry Cache 业务边界、review action 事务后果、Citation Graph 更新规则、Topic discovery metadata 合同和后台 job 性能诊断边界。

## Problem

当前 Synthesis 实现功能面已经很宽，但在实际测试中还不能称为产品可用：

- Workbench / MCP / Host Bridge read path 容易间接扫描 JSON canonical 文件或读取大型 JSON projection。
- Registry cache rebuild 和 Citation Graph rebuild 过重，后台任务在 Zotero UI runtime 中表现为明显卡顿。
- review action 经常只改变 proposal / review 状态，没有同步改变 Registry Cache / Citation Graph 的领域事实。
- Reference 引出的外部文献没有稳定地成为 registry cache 一等实体，Registry/Index UI 仍偏向库内项目投影。
- Zotero deletion / dedupe review 与 reference resolution review 缺少层级依赖，容易先处理低层 review，再被上游 merge/delete 推翻。
- Topic freshness / discovery 缺少轻量候选机制，read path 曾经承担过不该承担的刷新职责。
- 性能问题缺少后台 job 维度的 profiler，定位慢点主要靠猜。

## Goals

- SQLite 成为 Synthesis 本地运行态 source of truth。
- JSON canonical / checkpoint 只作为 cold import / export / audit / future sync 边界。
- Paper Registry Cache 采用统一 `literature_item` 模型，库内文献和 references 引出的文献使用同一实体模型。
- Review action 在同一事务中更新领域事实、review 状态、Citation Graph structure / lightweight metrics 和下游 dirty signal。
- Citation Graph structure 成为 registry cache 的 DB-native 同步投影；complex metrics 低优先级后台更新；layout 由 Graph UI 按需触发。
- Topic freshness 遵守 read-path purity，区分 known dependency dirty 和 discovery hints。
- BM25 / metadata 合同保持 v1 最小化，避免把 skill 和 DB schema 拖复杂。
- 后台 worker 具备 debug-mode-only profiler，便于定位全量扫描退化、budget 失效和 DB transaction 慢点。

## Non-Goals

- 不在本 change 中实现 Git Sync。
- 不保留 JSON canonical 文件作为运行时热路径。
- 不新增 npm 依赖。
- 不做生产启动自动迁移。
- 不删除现有 `data/synthesis/` 文件。
- 不把 UI profiler 纳入本期；本期只设计后台 job profiler。
- 不把 SQLite FTS / BM25 后端实现作为第一阶段强制项；先锁定 metadata 和 hint 合同。

## Design References

- 主设计工件：`artifact/synthesis_persistence_and_action_boundary_redesign_20260526.md`
- 实施总则：`artifact/synthesis_persistence_redesign_implementation_principles_20260526.md`
- 分期计划：`artifact/synthesis_persistence_redesign_phase_plan_20260526.md`

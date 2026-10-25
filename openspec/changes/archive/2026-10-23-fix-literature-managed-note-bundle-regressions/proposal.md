# Proposal

## Why

`literature-analysis` 的带图大摘要错误地触发普通笔记输入限额；`export-literature-bundle` 在大 Citation 详情派生和图片资源清理时失败。本 change 补录本次已经完成的修复与验证，让主规格中的新增场景有对应的变更记录。

## What Changes

- 带图 managed parent-set 写入复用图片绑定校验，并按既有 managed content/payload/envelope 预算验证最终计划内容；超限保留旧笔记。
- 私有笔记 transfer 返回完整 canonical payload 与 provenance，不生成公开详情的派生 Markdown；公开详情的 1 MiB 边界保持不变。
- Bundle 按笔记顺序暂存图片，失败后清理已暂存资源；清理失败独立记录，保留原始业务错误。
- XPC 文件读取失败和复制取消等到原生停止回调才结算、释放传输槽，并显式关闭源流；启动失败关闭已取得的流。
- 原生 ZIP 解压后的临时副本设为 owner read/write，避免 Windows 只读属性阻止清理。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `managed-literature-artifacts`：补充带图写入的容量边界、私有 transfer 的完整语义数据，以及暂存失败的清理和主错误保留场景。

## Impact

- 插件实现：`zoteroHostCapabilityBroker.ts`、`zoteroHost/zoteroManagedNotes.ts`、`workflowHostOwners.ts`、`researchBundleService.ts`、`runtimeFileTransfer.ts`、`archive.ts`。
- 验证：既有笔记导入导出、Bundle、Broker、资源清理、文件传输、socket 与 archive 测试，以及 Windows Zotero 10.0.2 隔离 E2E；新增大 Citation 合成 fixture 由 Node 与真实宿主测试共用。
- 文档：主规格、note payload 与 attachment lifecycle 组件文档、项目 `AGENTS.md`。
- 无新增依赖、公共 DTO 或 Host API 版本变化。交付位于插件 XPI；`workflows_builtin/`、`skills_builtin/` 和 Content Package 版本描述符均未修改，因此本次不要求 Content Package bump 或发布。

## Context

Dashboard 产品区由 `addon/content/dashboard/app.js` 渲染，宿主 `src/modules/taskManagerDialog.ts` 负责目录选择、Product 文件复制和目标目录打开。当前 `open-product-folder` 动作是异步的，但 Dashboard 快照没有导出进行中字段，宿主也没有并发锁。

产品区快照已经参与 selected-surface signature，因此只要快照中的导出状态发生变化，产品区就会重新渲染，而不会影响其他 Dashboard surface 的签名语义。

## Goals / Non-Goals

**Goals**

- 让一个 Dashboard 会话内的普通 Product 导出成为单飞操作。
- 让按钮在导出流程期间明确处于 disabled 和 busy 状态。
- 覆盖目录选择取消、导出成功、文件复制失败和目录打开失败等恢复路径。
- 保持忙碌状态与当前选择的 Product 解耦。

**Non-Goals**

- 不改变 `exportWorkflowProductToDirectory` 的复制、路径校验或覆盖策略。
- 不改变 Skill Feedback 的聚合导出操作。
- 不增加跨 Dashboard 窗口或持久化级别的导出队列。
- 不新增导出进行中的本地化文案。

## Decisions

### Decision 1: Host-owned single-flight state

在 `DashboardState` 中增加 `productExportInProgress: boolean`，由宿主作为导出状态的唯一事实源。处理 `open-product-folder` 时先检查该状态；不存在正在进行的导出时，立即置为 `true`，然后再等待目录选择器。这样可以防止两个异步 `handleAction` 调用在第一次 `await` 前同时通过检查。

### Decision 2: Snapshot projection is product-surface scoped

在 `productStorageView` 中增加 `isExporting`。只有产品区快照需要消费这一状态，前端不需要知道锁的实现，也不需要记录正在导出的 Product ID。状态变化通过现有产品区 selected-surface signature 触发重渲染。

### Decision 3: One `try/finally` owns lifecycle cleanup

目录选择、Product 导出和成功后的目录打开放在同一个 `try` 生命周期中。错误沿用当前导出失败提示；`finally` 无条件清除忙碌状态并刷新快照，因此取消、失败和成功都不会遗留 disabled 状态。

### Decision 4: Accessible busy button without new copy

`app.js` 根据 `isExporting` 设置按钮的 `disabled`、`aria-busy` 和 `is-busy` class，并在忙碌时显示轻量 spinner。按钮继续使用已有的“导出产物”标签，避免扩展 11 个 locale 文件。

## Risks / Trade-offs

- 忙碌锁在打开目录选择器前建立，因此用户取消选择时按钮也会短暂进入忙碌状态；这换取了并发动作不会穿透的确定性。
- 导出状态快照会重建产品区按钮，但不会影响其他 Dashboard surface；现有产品列表、预览和滚动恢复逻辑保持不变。
- 目录打开失败仍会沿用现有错误提示并释放导出状态；这保持当前行为，同时确保按钮可恢复。

## Test Strategy

- Playwright 产品区测试从快照验证按钮的 disabled、`aria-busy` 和 busy class，并验证 idle 快照恢复按钮。
- Dashboard core 测试锁定宿主在动作开始前加锁并通过 `finally` 释放的结构性约束。
- 运行 TypeScript 检查、定向测试、Prettier 检查和严格 OpenSpec 校验。

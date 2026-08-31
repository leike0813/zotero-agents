## Why

Dashboard 的“导出产物”按钮当前不会反映导出进行中的状态，用户可以在目录选择或文件复制尚未结束时重复触发导出。需要让导出成为 Dashboard 会话内的单飞操作，并让按钮明确显示忙碌状态。

## What Changes

- 为 Dashboard 宿主增加不绑定 `productId` 的产物导出进行中状态。
- 在等待目录选择、复制产物和打开目标目录的完整流程中阻止并发产物导出。
- 通过 Dashboard 产品区快照向前端传递导出状态。
- 导出进行中禁用“导出产物”按钮，并设置可访问性忙碌状态和视觉忙碌指示。
- 在目录选择取消、导出成功或导出失败后恢复按钮状态。
- 增加产品区 UI 和宿主导出锁的回归测试。

## Capabilities

### New Capabilities

### Modified Capabilities

- `task-runtime-ui`: 修改 Dashboard 产物导出需求，增加单飞约束、按钮忙碌状态和完整恢复路径。

## Impact

- 影响 `src/modules/taskManagerDialog.ts` 的 Dashboard 状态、产品区快照和 `open-product-folder` 动作处理。
- 影响 `addon/content/dashboard/app.js` 的产品工具栏按钮渲染。
- 影响 `addon/content/dashboard/styles.css` 的按钮忙碌视觉样式。
- 增加 Dashboard UI 与 core 回归测试。
- 不改变 Product Storage 的导出文件布局、覆盖策略、错误语义或 Skill Feedback 导出流程。
- 不新增依赖，也不新增本地化文案。

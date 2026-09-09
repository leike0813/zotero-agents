# Dashboard Host

## 职责

Dashboard Host 是 Zotero 插件进程中 Task Dashboard 的唯一宿主边界。根入口 `src/modules/dashboardHost.ts` 只管理独立窗口单例、嵌入/独立模式组合和公开生命周期；页面渲染由 `src/dashboard/` 持有，跨边界 DTO 与消息动作由 `src/shared/dashboardWireContract.ts` 定义。

公开入口只有：

- `openTaskDashboard()`：打开或复用独立 Task Dashboard，也可承载嵌入模式。
- `mountTaskDashboardRuntime()`：将 Dashboard 嵌入 Workspace 等现有容器。
- `resetTaskDashboardHostForTests()`：清理独立窗口和宿主运行时。

## 私有模块

`src/modules/dashboard/` 按变化原因分为四个模块：

- `dashboardRuntime.ts`：状态、缓存、刷新调度、订阅、snapshot 发布和幂等清理。
- `dashboardSnapshot.ts`：host facts 到 `DashboardSnapshot` 的组装、区域 signature 和本地化投影。
- `dashboardActions.ts`：`dashboard:action` 的分发及其副作用，通过运行时提供的受限 context 请求刷新、窗口和 frame 操作。
- `dashboardFrame.ts`：iframe/browser、消息监听和 SkillRunner management overlay 生命周期。

依赖方向固定为：

```text
dashboardHost.ts
  -> dashboard/dashboardRuntime.ts
       -> dashboard/dashboardSnapshot.ts
       -> dashboard/dashboardActions.ts
       -> dashboard/dashboardFrame.ts
```

私有兄弟模块不导入根入口或 runtime。共享任务投影、历史、toolbar 和迁移模块保留在 `src/modules/` 根部，因为它们还有 Dashboard 以外的调用方。

## 运行生命周期

宿主挂载后创建 Dashboard frame，注册一个 `message` listener，并立即请求初始 snapshot。运行时订阅任务、ACP Skill run、backend health、提交队列和可用的诊断源；高噪声更新由同一刷新链合并。snapshot 只在 chrome 或当前 surface signature 变化时发布。

清理会取消订阅与定时器、移除消息监听和 frame、清空 management overlay，并撤销独立窗口的外部 tab selector。清理可重复调用。

## Host 与页面边界

Host 向页面发送 `dashboard:init` 或 `dashboard:snapshot`，页面只发送 `dashboard:action`。页面的 Preact 区域以各自可见数据计算 signature；host 不依赖页面私有 DOM，只有 `dashboardFrame.ts` 管理 frame 与 management mount。

Task Dashboard 的 DOM 角色、诊断 source 和 Fluent key 统一使用 `task-dashboard` 命名。用户可见翻译由各 locale 保持。

## 测试

宿主行为测试通过 `mountTaskDashboardRuntime()` 和 `tests/helpers/dashboardHostHarness.ts` 验证刷新、action、发布与清理。页面测试直接驱动 Dashboard controller/renderer，验证可见交互和 DOM identity；测试不读取私有模块源码来断言函数名、路径、CSS token 或完整翻译文本。

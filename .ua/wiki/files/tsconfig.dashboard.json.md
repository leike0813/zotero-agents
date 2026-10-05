
# tsconfig.dashboard.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:tsconfig.dashboard.json -->

Dashboard 页面的 TypeScript 子配置：启用 Preact JSX（react-jsx / preact）与 DOM lib，noEmit 检查 src/dashboard、src/shared 与 synthesis-contracts 源码。
源码：[tsconfig.dashboard.json](../../../tsconfig.dashboard.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardActions.ts](src/modules/dashboard/dashboardActions.ts.md) | src/modules/dashboard/dashboardActions.ts | Dashboard 动作分发器：把页面 action 路由到宿主能力，覆盖后端管理、工作流设置保存防抖、任务筛选与诊断上报等交互。 |
| [dashboardFrame.ts](src/modules/dashboard/dashboardFrame.ts.md) | src/modules/dashboard/dashboardFrame.ts | Dashboard 页面框架 owner：创建 content browser 与 frame，登记挂载句柄并在卸载时移除 frame。 |

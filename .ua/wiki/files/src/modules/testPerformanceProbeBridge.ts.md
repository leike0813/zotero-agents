
# src/modules/testPerformanceProbeBridge.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/testPerformanceProbeBridge.ts -->

测试性能探针桥：把性能 span 记录钩子挂到 globalThis 上，供工作流运行时与 Host API 在测试环境中零成本埋点，不启用时所有调用直接短路返回。
源码：[src/modules/testPerformanceProbeBridge.ts](../../../../../src/modules/testPerformanceProbeBridge.ts)

## 符号（3）
<!-- node: function:src/modules/testPerformanceProbeBridge.ts:measureAsyncTestPerformanceSpan -->
<!-- node: function:src/modules/testPerformanceProbeBridge.ts:measureSyncTestPerformanceSpan -->
<!-- node: function:src/modules/testPerformanceProbeBridge.ts:recordTestPerformanceSpan -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| measureAsyncTestPerformanceSpan | 函数 | 54–74 | 简单 | instrumentation、async、performance、exported | 0 | 包裹一个异步调用并上报耗时与异常，探针关闭时不引入额外 await。 |
| measureSyncTestPerformanceSpan | 函数 | 76–96 | 简单 | instrumentation、sync、performance、exported | 0 | 包裹一个同步调用并上报耗时与异常结果标签。 |
| recordTestPerformanceSpan | 函数 | 41–52 | 简单 | instrumentation、performance、short-circuit、exported | 0 | 在探针启用时上报一个已完成的时间片，关闭时立即返回。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.ts](../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [testRuntimeCleanup.ts](testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| measureAsyncTestPerformanceSpan | 函数 | 54–74 | 包裹一个异步调用并上报耗时与异常，探针关闭时不引入额外 await。 |
| measureSyncTestPerformanceSpan | 函数 | 76–96 | 包裹一个同步调用并上报耗时与异常结果标签。 |
| recordTestPerformanceSpan | 函数 | 41–52 | 在探针启用时上报一个已完成的时间片，关闭时立即返回。 |

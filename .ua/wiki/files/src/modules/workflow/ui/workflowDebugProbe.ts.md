
# src/modules/workflow/ui/workflowDebugProbe.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/ui](../../../../../modules/src/modules/workflow/ui.md)
<!-- node: file:src/modules/workflow/ui/workflowDebugProbe.ts -->

工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。
源码：[src/modules/workflow/ui/workflowDebugProbe.ts](../../../../../../../src/modules/workflow/ui/workflowDebugProbe.ts)

## 符号（5）
<!-- node: function:src/modules/workflow/ui/workflowDebugProbe.ts:buildProbeRenderer -->
<!-- node: function:src/modules/workflow/ui/workflowDebugProbe.ts:collectWorkflowDebugProbeChecks -->
<!-- node: function:src/modules/workflow/ui/workflowDebugProbe.ts:installWorkflowDebugProbeBridge -->
<!-- node: function:src/modules/workflow/ui/workflowDebugProbe.ts:openWorkflowDebugProbeDialog -->
<!-- node: function:src/modules/workflow/ui/workflowDebugProbe.ts:runWorkflowDebugProbe -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildProbeRenderer | 函数 | 306–420 | 中等 | debug、rendering、probe、ui | 0 | 构建探针结果渲染器，按分组输出可读条目与状态标记。 |
| collectWorkflowDebugProbeChecks | 函数 | 181–304 | 中等 | debug、probe、diagnostics、collection、capability | 1 | 收集调试探针的各组检查项：运行时能力、Host 契约版本、工作流注册表与来源、输入规划与包诊断。 |
| installWorkflowDebugProbeBridge | 函数 | 511–529 | 简单 | debug、bridge、install、probe | 0 | 向宿主注入工作流调试探针桥接对象，供页面或控制台直接调用。 |
| openWorkflowDebugProbeDialog | 函数 | 422–456 | 简单 | debug、dialog、probe、reporting | 0 | 打开探针结果对话框并提供复制报告能力。 |
| runWorkflowDebugProbe | 函数 | 458–509 | 中等 | debug、probe、orchestration | 0 | 执行探针检查并渲染结果对话框。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [errorMeta.ts](../../../workflows/errorMeta.ts.md) | src/workflows/errorMeta.ts | 工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。 |
| [hostApi.ts](../../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [registry.ts](../../../providers/registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |
| [runtimeBridge.ts](../../../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowEditorHost.ts](workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowHostContract.ts](../../../workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowInputPlanning.ts](../../../workflows/workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowPackageDiagnostics.ts](../catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |
| [workflowRuntime.ts](../catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowVisibility.ts](../catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [ztoolkit.ts](../../../utils/ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectWorkflowDebugProbeChecks | 函数 | 181–304 | 收集调试探针的各组检查项：运行时能力、Host 契约版本、工作流注册表与来源、输入规划与包诊断。 |
| installWorkflowDebugProbeBridge | 函数 | 511–529 | 向宿主注入工作流调试探针桥接对象，供页面或控制台直接调用。 |
| runWorkflowDebugProbe | 函数 | 458–509 | 执行探针检查并渲染结果对话框。 |

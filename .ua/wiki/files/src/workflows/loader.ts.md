
# src/workflows/loader.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/loader.ts -->

工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。

规模：1153 行
源码：[src/workflows/loader.ts](../../../../../src/workflows/loader.ts)

## 符号（14）
<!-- node: function:src/workflows/loader.ts:collectPackageWorkflowCandidates -->
<!-- node: function:src/workflows/loader.ts:collectSingleWorkflowCandidate -->
<!-- node: function:src/workflows/loader.ts:computeWorkflowContentDigest -->
<!-- node: function:src/workflows/loader.ts:createHostHookScope -->
<!-- node: function:src/workflows/loader.ts:filterDirectoryEntriesByOfficialManifest -->
<!-- node: function:src/workflows/loader.ts:importHooksModuleFromNode -->
<!-- node: function:src/workflows/loader.ts:importHooksModuleFromText -->
<!-- node: function:src/workflows/loader.ts:importPrecompiledPackageHooksModule -->
<!-- node: function:src/workflows/loader.ts:loadHooks -->
<!-- node: function:src/workflows/loader.ts:loadHooksModule -->
<!-- node: function:src/workflows/loader.ts:loadPackageLocalizationResources -->
<!-- node: function:src/workflows/loader.ts:loadWorkflowManifests -->
<!-- node: function:src/workflows/loader.ts:summarizeHostHookScope -->
<!-- node: function:src/workflows/loader.ts:transformModuleExports -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [collectPackageWorkflowCandidates](../../../symbols/src/workflows/loader.ts/collectPackageWorkflowCandidates.md) | 函数 | 575–628 | 复杂 | loader、filesystem、scan | 1 | 扫描工作流包内的单个工作流目录，产出候选工作流及其诊断。 |
| collectSingleWorkflowCandidate | 函数 | 630–661 | 中等 | loader、filesystem、scan | 1 | 从单个 manifest 文件路径构造工作流候选，解析失败时转为错误级诊断而非抛出。 |
| computeWorkflowContentDigest | 函数 | 452–478 | 中等 | loader、fingerprinting、caching | 0 | 计算工作流内容摘要，用于工作流包去重、缓存与变更检测。 |
| createHostHookScope | 函数 | 191–209 | 中等 | loader、security、hook | 1 | 构造注入 hook 的宿主作用域对象，只暴露声明允许的 Zotero 能力。 |
| [filterDirectoryEntriesByOfficialManifest](../../../symbols/src/workflows/loader.ts/filterDirectoryEntriesByOfficialManifest.md) | 函数 | 692–736 | 复杂 | loader、validation、security | 1 | 按官方工作流包 manifest 过滤目录项，避免加载非声明内容。 |
| importHooksModuleFromNode | 函数 | 171–189 | 中等 | dynamic-import、loader、node-environment | 0 | 在 Node 环境下按模块路径 import hook 模块，供预编译与测试使用。 |
| [importHooksModuleFromText](../../../symbols/src/workflows/loader.ts/importHooksModuleFromText.md) | 函数 | 120–160 | 复杂 | dynamic-import、loader、sandbox | 1 | 在 Zotero 沙箱中以源码文本方式动态 import hook 模块，兼容 blob/data URL 等无 Node 依赖的加载路径。 |
| [importPrecompiledPackageHooksModule](../../../symbols/src/workflows/loader.ts/importPrecompiledPackageHooksModule.md) | 函数 | 237–348 | 复杂 | loader、precompiled、diagnostics | 1 | 加载工作流包预编译的 hook 模块：解析入口、校验导出并给出按来源分类的加载诊断。 |
| [loadHooks](../../../symbols/src/workflows/loader.ts/loadHooks.md) | 函数 | 738–971 | 复杂 | loader、hook、validation、entry-point | 1 | 加载单个工作流的 hook 集合：定位 hook 模块、校验各 hook 导出是否存在，并汇总 warning 与 error 级诊断。 |
| [loadHooksModule](../../../symbols/src/workflows/loader.ts/loadHooksModule.md) | 函数 | 350–407 | 复杂 | loader、dispatch、entry-point | 1 | hook 模块加载总入口，按运行环境与来源选择合适的导入路径并归一诊断。 |
| [loadPackageLocalizationResources](../../../symbols/src/workflows/loader.ts/loadPackageLocalizationResources.md) | 函数 | 518–573 | 复杂 | loader、i18n、diagnostics | 1 | 加载工作流包的多语言资源，按 locale 归一消息表并对缺失语言给出诊断。 |
| [loadWorkflowManifests](../../../symbols/src/workflows/loader.ts/loadWorkflowManifests.md) | 函数 | 973–1149 | 复杂 | loader、entry-point、workflow、diagnostics | 2 | 加载入口：扫描工作流与工作流包来源，加载 hook 与本地化资源，返回已加载工作流集合与全部诊断。 |
| summarizeHostHookScope | 函数 | 211–235 | 中等 | diagnostics、loader、security | 0 | 把 hook 宿主作用域摘要为可诊断的键列表，供加载诊断与问题定位使用。 |
| transformModuleExports | 函数 | 92–118 | 中等 | loader、normalization、hook | 1 | 把动态 import 得到的模块命名空间转换为符合 hook 契约形状的导出集合，缺项时报明确错误。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../modules/debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [loaderContracts.ts](loaderContracts.ts.md) | src/workflows/loaderContracts.ts | 工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。 |
| [packageHookBundler.ts](packageHookBundler.ts.md) | src/workflows/packageHookBundler.ts | 工作流包 hook 打包器：收集工作流包声明的 hook 脚本与其依赖资源，生成可分发的 bundle 目录结构。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowPackageDiagnostics.ts](../modules/workflow/catalog/workflowPackageDiagnostics.ts.md) | src/modules/workflow/catalog/workflowPackageDiagnostics.ts | 工作流包诊断通道：在 debug 模式或诊断详细级别下，把工作流运行时可用能力摘要与 hook 诊断信息写入 runtimeLog，并按诊断级别选择 console 通道输出。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](../modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [dashboardReadonlyModel.ts](../modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [e2e-single-markdown-live.ts](../../scripts/e2e-single-markdown-live.ts.md) | scripts/e2e-single-markdown-live.ts | 端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。 |
| [inspect-literature-analysis.ts](../../scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [inspect-single-markdown-request.ts](../../scripts/inspect-single-markdown-request.ts.md) | scripts/inspect-single-markdown-request.ts | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [workflowRuntime.ts](../modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [loadWorkflowManifests](../../../symbols/src/workflows/loader.ts/loadWorkflowManifests.md) | 函数 | 973–1149 | 加载入口：扫描工作流与工作流包来源，加载 hook 与本地化资源，返回已加载工作流集合与全部诊断。 |

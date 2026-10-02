
# src/workflows/packageHookBundler.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/packageHookBundler.ts -->

工作流包 hook 打包器：收集工作流包声明的 hook 脚本与其依赖资源，生成可分发的 bundle 目录结构。
源码：[src/workflows/packageHookBundler.ts](../../../../../src/workflows/packageHookBundler.ts)

## 符号（5）
<!-- node: function:src/workflows/packageHookBundler.ts:buildBundleScript -->
<!-- node: function:src/workflows/packageHookBundler.ts:bundlePackageHookScript -->
<!-- node: function:src/workflows/packageHookBundler.ts:collectModuleGraph -->
<!-- node: function:src/workflows/packageHookBundler.ts:collectModuleImports -->
<!-- node: function:src/workflows/packageHookBundler.ts:transformModuleSource -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildBundleScript | 函数 | 325–370 | 中等 | 工作流包、打包、缓存指纹 | 0 | 把模块图组装为单文件 bundle 脚本，注入指纹以支持缓存失效判断。 |
| bundlePackageHookScript | 函数 | 372–422 | 中等 | 工作流包、打包入口、缓存 | 0 | 对外入口：按包路径与内容指纹打包 hook 脚本，命中缓存时直接复用既有 bundle。 |
| collectModuleGraph | 函数 | 277–314 | 中等 | 工作流包、依赖图、hook、环检测 | 0 | 从入口出发沿相对 import 递归收集模块图，并检测环与越界引用。 |
| collectModuleImports | 函数 | 118–150 | 中等 | 工作流包、模块解析、hook | 0 | 解析 hook 源文件中的 import 说明符，区分本地模块与外部依赖。 |
| transformModuleSource | 函数 | 227–275 | 中等 | 工作流包、源码转换、hook | 0 | 把单个 ES 模块源码转换为可直接内联执行的形态，剥离 export 关键字。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [loader.ts](loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [testRuntimeCleanup.ts](../modules/testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bundlePackageHookScript | 函数 | 372–422 | 对外入口：按包路径与内容指纹打包 hook 脚本，命中缓存时直接复用既有 bundle。 |

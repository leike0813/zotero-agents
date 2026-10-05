
# src/modules/workflow/catalog/contentPackageSubscription.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/contentPackageSubscription.ts -->

内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。
源码：[src/modules/workflow/catalog/contentPackageSubscription.ts](../../../../../../../src/modules/workflow/catalog/contentPackageSubscription.ts)

## 符号（14）
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:buildContentPackageInstallProgress -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:checkContentPackageUpdate -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:checkPackageCompatibility -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:fetchPackageBytesWithFallback -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:getContentPackageStatus -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:installContentPackageFromFeed -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:normalizeFeedPackage -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:readContentPackageInstallState -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:readEffectiveContentPackageInstallState -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:readStoredZipEntries -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:resolveFeed -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:resolvePackageAction -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:setContentPackageInstallProgress -->
<!-- node: function:src/modules/workflow/catalog/contentPackageSubscription.ts:validatePackageManifestAgainstFeed -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildContentPackageInstallProgress | 函数 | 250–274 | 中等 | 进度、内容包、归一化 | 0 | 构造内容包安装进度对象，规整阶段、百分比与已处理条目计数。 |
| checkContentPackageUpdate | 函数 | 849–891 | 中等 | 更新检查、feed、内容包 | 0 | 检查内容包可用更新：拉取 feed、比对摘要并返回建议动作与原因。 |
| checkPackageCompatibility | 函数 | 721–756 | 中等 | 兼容性校验、版本约束、内容包 | 0 | 校验包的插件版本与宿主要求约束，不满足时给出结构化不兼容原因。 |
| fetchPackageBytesWithFallback | 函数 | 1152–1173 | 中等 | 下载、多源回退、诊断 | 0 | 按候选 URL 顺序下载包字节，失败时记录诊断并尝试下一个来源。 |
| getContentPackageStatus | 函数 | 612–628 | 简单 | 状态视图、内容包、订阅 | 0 | 汇总内容包当前状态视图：通道、已安装版本、可用更新与错误信息。 |
| [installContentPackageFromFeed](../../../../../symbols/src/modules/workflow/catalog/contentPackageSubscription.ts/installContentPackageFromFeed.md) | 函数 | 1175–1285 | 复杂 | 安装、事务化、主流程、内容包 | 1 | 从 feed 安装内容包的主流程：校验兼容性、事务化解包落盘、发布进度并更新安装状态。 |
| normalizeFeedPackage | 函数 | 449–476 | 中等 | 归一化、feed、校验 | 0 | 归一化 feed 中的包条目，补齐必填字段并剔除不合法描述符。 |
| readContentPackageInstallState | 函数 | 528–542 | 简单 | 持久化、内容包、状态读取 | 0 | 读取本地内容包安装状态文件，返回已安装通道与版本信息。 |
| readEffectiveContentPackageInstallState | 函数 | 599–601 | 简单 | 内容包、状态校正、一致性 | 0 | 返回生效安装状态：结合磁盘实际内容校正陈旧状态记录。 |
| readStoredZipEntries | 函数 | 970–1023 | 中等 | zip、条目校验、路径安全 | 0 | 读取 zip 条目索引为内存结构，校验条目名安全并跳过目录条目。 |
| resolveFeed | 函数 | 758–801 | 中等 | feed、多源回退、内容包 | 0 | 解析配置的 feed 通道与 URL 列表，尝试多个来源直到取得有效清单。 |
| resolvePackageAction | 函数 | 824–847 | 中等 | 升级判定、决策、内容包 | 0 | 在无操作/安装/升级/降级四类动作间做出判定，依据已装版本与 feed 摘要。 |
| setContentPackageInstallProgress | 函数 | 276–288 | 简单 | 进度、订阅、内容包 | 1 | 发布新的安装进度并通知订阅方，推进 UI 进度条。 |
| validatePackageManifestAgainstFeed | 函数 | 1077–1112 | 中等 | manifest 校验、完整性、内容包 | 0 | 把包内 manifest 与 feed 声明逐项比对，阻断被篡改或版本不符的包。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [package.json](../../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [build-content-package-feed.ts](../../../../scripts/content-package/build-content-package-feed.ts.md) | scripts/content-package/build-content-package-feed.ts | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [pluginSkillRegistry.ts](pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [preferenceScript.ts](../../preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [workflowRuntime.ts](workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildContentPackageInstallProgress | 函数 | 250–274 | 构造内容包安装进度对象，规整阶段、百分比与已处理条目计数。 |
| checkContentPackageUpdate | 函数 | 849–891 | 检查内容包可用更新：拉取 feed、比对摘要并返回建议动作与原因。 |
| getContentPackageStatus | 函数 | 612–628 | 汇总内容包当前状态视图：通道、已安装版本、可用更新与错误信息。 |
| [installContentPackageFromFeed](../../../../../symbols/src/modules/workflow/catalog/contentPackageSubscription.ts/installContentPackageFromFeed.md) | 函数 | 1175–1285 | 从 feed 安装内容包的主流程：校验兼容性、事务化解包落盘、发布进度并更新安装状态。 |
| readContentPackageInstallState | 函数 | 528–542 | 读取本地内容包安装状态文件，返回已安装通道与版本信息。 |
| readEffectiveContentPackageInstallState | 函数 | 599–601 | 返回生效安装状态：结合磁盘实际内容校正陈旧状态记录。 |
| setContentPackageInstallProgress | 函数 | 276–288 | 发布新的安装进度并通知订阅方，推进 UI 进度条。 |

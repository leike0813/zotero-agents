
# src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/cli](../../../../../modules/src/modules/hostBridge/cli.md)
<!-- node: file:src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts -->

构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。
源码：[src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts](../../../../../../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts)

## 符号（2）
<!-- node: function:src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts:materializeHostBridgePluginSkillBundle -->
<!-- node: function:src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts:validateManifest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| materializeHostBridgePluginSkillBundle | 函数 | 230–364 | 复杂 | host-bridge、materializer、skill-bundle、contract | 0 | 把 Host Bridge agent skill 包物化到插件目录：以 surfaces 契约为事实源生成内容，用 SHA-256 身份判断是否需要重写。 |
| validateManifest | 函数 | 103–190 | 复杂 | validation、host-bridge、manifest、integrity | 0 | 校验 skill 包 manifest 的表面闭包、条目数与内容摘要，阻止不完整或被篡改的包被物化。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgePluginSkillBundleContract.ts](../../../shared/hostBridgePluginSkillBundleContract.ts.md) | src/shared/hostBridgePluginSkillBundleContract.ts | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |
| [packagedAssetResolver.ts](../../packagedAssetResolver.ts.md) | src/modules/packagedAssetResolver.ts | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [surfaces.json](../../../../contracts/host-bridge/surfaces.json.md) | contracts/host-bridge/surfaces.json | Host Bridge 面向代理的 surface 清单，列出 MCP、CLI 与插件内置 skill 包三类 surface 及其发布身份。是判断某个能力从哪条代理通道暴露、以及 CLI 发布版本的权威配置。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpChatSkillInjection.ts](../../acp/chat/acpChatSkillInjection.ts.md) | src/modules/acp/chat/acpChatSkillInjection.ts | ACP Chat 的 Skill 注入层：把 Host Bridge CLI 注入能力与可共享 Skill 目录组装成会话级 prompt 片段，并按 agent family 定制注入策略。 |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| materializeHostBridgePluginSkillBundle | 函数 | 230–364 | 把 Host Bridge agent skill 包物化到插件目录：以 surfaces 契约为事实源生成内容，用 SHA-256 身份判断是否需要重写。 |

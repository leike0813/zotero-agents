
# scripts/host-bridge/check-plugin-host-bridge-assets.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-plugin-host-bridge-assets.ts -->

插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。
源码：[scripts/host-bridge/check-plugin-host-bridge-assets.ts](../../../../../scripts/host-bridge/check-plugin-host-bridge-assets.ts)

## 符号（7）
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:assertPluginHostBridgeAssets -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:expectedHostBridgeSkillIds -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:parseSkillBundleManifest -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:readHostBridgeRelease -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:validateHostBridgeRelease -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:validateSkillBundleManifest -->
<!-- node: function:scripts/host-bridge/check-plugin-host-bridge-assets.ts:verifyPluginHostBridgeAssets -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertPluginHostBridgeAssets | 函数 | 343–356 | 简单 | assertion、validation、host-bridge | 0 | 在资产校验失败时抛错，并输出全部问题码。 |
| expectedHostBridgeSkillIds | 函数 | 98–104 | 简单 | host-bridge、skill、derivation | 0 | 依据 surface 定义推导出期望的 Host Bridge skill id 集合。 |
| parseSkillBundleManifest | 函数 | 106–114 | 简单 | parsing、skill、host-bridge | 0 | 从 skill bundle zip 中提取并解析 manifest 字节。 |
| readHostBridgeRelease | 函数 | 69–73 | 简单 | manifest、filesystem、host-bridge | 0 | 读取并解析插件侧的 Host Bridge release manifest。 |
| validateHostBridgeRelease | 函数 | 75–96 | 简单 | validation、manifest、host-bridge | 0 | 校验 release manifest 的 schema、版本与二进制条目完整性。 |
| validateSkillBundleManifest | 函数 | 116–169 | 中等 | validation、skill、security | 0 | 校验 skill bundle manifest 的 schema、条目与 digest 载荷。 |
| verifyPluginHostBridgeAssets | 函数 | 171–341 | 中等 | validation、host-bridge、release-gate | 0 | 主校验流程：逐项核对原生二进制与 skill bundle，汇总为结构化 issue 列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |
| [hostBridgePluginSkillBundleContract.ts](../../src/shared/hostBridgePluginSkillBundleContract.ts.md) | src/shared/hostBridgePluginSkillBundleContract.ts | Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。 |
| [zip-archive.ts](../zip-archive.ts.md) | scripts/zip-archive.ts | 零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [zotero-plugin.config.ts](../../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertPluginHostBridgeAssets | 函数 | 343–356 | 在资产校验失败时抛错，并输出全部问题码。 |
| verifyPluginHostBridgeAssets | 函数 | 171–341 | 主校验流程：逐项核对原生二进制与 skill bundle，汇总为结构化 issue 列表。 |

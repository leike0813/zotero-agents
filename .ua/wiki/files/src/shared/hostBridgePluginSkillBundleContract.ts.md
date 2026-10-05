
# src/shared/hostBridgePluginSkillBundleContract.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/hostBridgePluginSkillBundleContract.ts -->

Host Bridge 与插件之间 Skill bundle 的共享契约类型定义，约束 bundle 条目结构与校验函数在两侧保持一致。
源码：[src/shared/hostBridgePluginSkillBundleContract.ts](../../../../../src/shared/hostBridgePluginSkillBundleContract.ts)

## 符号（2）
<!-- node: function:src/shared/hostBridgePluginSkillBundleContract.ts:hostBridgePluginSkillBundleDigestPayload -->
<!-- node: function:src/shared/hostBridgePluginSkillBundleContract.ts:isSafeHostBridgePluginSkillBundlePath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| hostBridgePluginSkillBundleDigestPayload | 函数 | 47–57 | 简单 | 契约、内容摘要、一致性 | 1 | 构造 bundle 摘要计算载荷，保证插件侧与 Host Bridge 侧对同一 bundle 得到相同 digest。 |
| isSafeHostBridgePluginSkillBundlePath | 函数 | 36–45 | 简单 | 契约、路径安全、host-bridge | 0 | 校验 Skill bundle 条目路径安全：拒绝绝对路径、父级跳出与非法字符。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-plugin-host-bridge-assets.ts](../../scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [hostBridgePluginSkillBundle.ts](../modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [pluginSkillRegistry.ts](../modules/workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [render-host-bridge-surfaces.ts](../../scripts/host-bridge/render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| hostBridgePluginSkillBundleDigestPayload | 函数 | 47–57 | 构造 bundle 摘要计算载荷，保证插件侧与 Host Bridge 侧对同一 bundle 得到相同 digest。 |
| isSafeHostBridgePluginSkillBundlePath | 函数 | 36–45 | 校验 Skill bundle 条目路径安全：拒绝绝对路径、父级跳出与非法字符。 |

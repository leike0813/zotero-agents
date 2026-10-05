
# src/utils/docsUrl.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/docsUrl.ts -->

帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。
源码：[src/utils/docsUrl.ts](../../../../../src/utils/docsUrl.ts)

## 符号（3）
<!-- node: function:src/utils/docsUrl.ts:getDocsBaseUrl -->
<!-- node: function:src/utils/docsUrl.ts:getDocsUrl -->
<!-- node: function:src/utils/docsUrl.ts:stripLocalePrefix -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getDocsBaseUrl | 函数 | 61–67 | 简单 | i18n、url、environment、exported | 0 | 根据用户 locale 与 debug 状态选择 GitHub Pages 或本地站点基址。 |
| getDocsUrl | 函数 | 74–84 | 简单 | i18n、url、docs、exported | 0 | 构造帮助中心文档链接，拼接基址、语言前缀与文档路径。 |
| stripLocalePrefix | 函数 | 34–45 | 简单 | i18n、url、normalization | 0 | 剥离路径中的 zh-CN 语言前缀，避免重复拼接。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../modules/debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [helpCenterTab.ts](../modules/helpCenterTab.ts.md) | src/modules/helpCenterTab.ts | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [workspaceTab.ts](../modules/workspaceTab.ts.md) | src/modules/workspaceTab.ts | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getDocsBaseUrl | 函数 | 61–67 | 根据用户 locale 与 debug 状态选择 GitHub Pages 或本地站点基址。 |
| getDocsUrl | 函数 | 74–84 | 构造帮助中心文档链接，拼接基址、语言前缀与文档路径。 |

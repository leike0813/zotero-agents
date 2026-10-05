
# src/modules/markdownAttachmentOpenProbe.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/markdownAttachmentOpenProbe.ts -->

Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。
源码：[src/modules/markdownAttachmentOpenProbe.ts](../../../../../src/modules/markdownAttachmentOpenProbe.ts)

## 符号（4）
<!-- node: function:src/modules/markdownAttachmentOpenProbe.ts:installMarkdownAttachmentOpenProbe -->
<!-- node: function:src/modules/markdownAttachmentOpenProbe.ts:isMarkdownAttachmentCandidate -->
<!-- node: function:src/modules/markdownAttachmentOpenProbe.ts:resolveAttachmentTitle -->
<!-- node: function:src/modules/markdownAttachmentOpenProbe.ts:uninstallMarkdownAttachmentOpenProbe -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| installMarkdownAttachmentOpenProbe | 函数 | 94–162 | 中等 | event-handler、markdown、entry-point、monkey-patch | 0 | 安装打开探针，包装宿主的附件打开处理器并在命中 Markdown 附件时打开阅读器标签页。 |
| isMarkdownAttachmentCandidate | 函数 | 53–63 | 简单 | validation、markdown、attachment | 1 | 判断给定条目是否为应当由内置 Markdown 阅读器处理的附件候选。 |
| resolveAttachmentTitle | 函数 | 72–82 | 简单 | utility、attachment、title | 1 | 从附件条目或文件路径推导阅读器标签页显示的标题。 |
| uninstallMarkdownAttachmentOpenProbe | 函数 | 164–172 | 简单 | cleanup、event-handler、markdown | 0 | 卸载打开探针并恢复宿主原有处理器。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [markdownAttachmentTab.ts](markdownAttachmentTab.ts.md) | src/modules/markdownAttachmentTab.ts | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [prefs.ts](../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| installMarkdownAttachmentOpenProbe | 函数 | 94–162 | 安装打开探针，包装宿主的附件打开处理器并在命中 Markdown 附件时打开阅读器标签页。 |
| isMarkdownAttachmentCandidate | 函数 | 53–63 | 判断给定条目是否为应当由内置 Markdown 阅读器处理的附件候选。 |
| uninstallMarkdownAttachmentOpenProbe | 函数 | 164–172 | 卸载打开探针并恢复宿主原有处理器。 |

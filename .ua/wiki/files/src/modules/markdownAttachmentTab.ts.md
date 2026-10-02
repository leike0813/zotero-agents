
# src/modules/markdownAttachmentTab.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/markdownAttachmentTab.ts -->

Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。
源码：[src/modules/markdownAttachmentTab.ts](../../../../../src/modules/markdownAttachmentTab.ts)

## 符号（10）
<!-- node: function:src/modules/markdownAttachmentTab.ts:applyMarkdownReaderTabTitle -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:buildDocumentPayload -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:buildStandaloneFallbackHtml -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:createMarkdownBrowser -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:openFileLocation -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:openMarkdownAttachmentTab -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:openStandaloneFallback -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:resolveMarkdownReaderPageUrl -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:scheduleReaderHandshake -->
<!-- node: function:src/modules/markdownAttachmentTab.ts:writeReaderBridgeTarget -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyMarkdownReaderTabTitle | 函数 | 230–263 | 中等 | ui、tab、title、compatibility | 1 | 把解析出的标题写入标签页记录，使不同 Zotero 版本的标签标题行为保持一致。 |
| buildDocumentPayload | 函数 | 418–433 | 简单 | serialization、markdown、bridge | 1 | 读取附件文本并组装注入阅读器页面的文档 payload（标题、正文、来源路径等）。 |
| buildStandaloneFallbackHtml | 函数 | 530–562 | 中等 | fallback、markdown、html-generation | 1 | 在页面脚本不可用时生成内联的独立阅读器 HTML，保证附件内容仍可被查看。 |
| createMarkdownBrowser | 函数 | 284–303 | 简单 | ui、xul-injection、markdown | 1 | 创建承载 Markdown 阅读器的 XUL browser 元素并设置基础属性。 |
| openFileLocation | 函数 | 383–416 | 中等 | platform、utility、file-system | 0 | 以操作系统默认程序打开 Markdown 文件或其所在目录，用于「在文件管理器中查看」等操作。 |
| openMarkdownAttachmentTab | 函数 | 645–709 | 中等 | entry-point、ui、tab、markdown | 1 | Markdown 附件阅读器标签页的对外入口：创建/复用标签、加载页面、安装 bridge 并完成文档注入。 |
| openStandaloneFallback | 函数 | 564–597 | 中等 | fallback、markdown、ui | 0 | 把内联回退 HTML 加载进 browser 元素并注入文档数据，启用无脚本降级路径。 |
| resolveMarkdownReaderPageUrl | 函数 | 265–282 | 简单 | url、markdown、utility | 0 | 把阅读器页面路径解析为基于插件根目录的绝对 URL。 |
| scheduleReaderHandshake | 函数 | 599–631 | 中等 | bridge、scheduling、fallback、markdown | 1 | 以重试定时器方式与阅读器页面完成握手，校验 frame 身份后注入文档内容，失败时切换到独立 HTML 回退。 |
| writeReaderBridgeTarget | 函数 | 435–463 | 中等 | bridge、host-communication、markdown | 1 | 把文档 payload 与宿主能力写入阅读器页面可访问的位置，完成宿主到页面的数据交接。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceSidebar.ts](assistant/workspace/assistantWorkspaceSidebar.ts.md) | src/modules/assistant/workspace/assistantWorkspaceSidebar.ts | 侧边栏 shell 宿主：创建并停靠 Assistant Workspace 侧边栏、安装 shell/message 双向桥、驱动 dock 切换与 SkillRunner 挂载，并处理 shell 消息与 action 日志。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [runtimePersistence.ts](runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [markdownAttachmentOpenProbe.ts](markdownAttachmentOpenProbe.ts.md) | src/modules/markdownAttachmentOpenProbe.ts | Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| openMarkdownAttachmentTab | 函数 | 645–709 | Markdown 附件阅读器标签页的对外入口：创建/复用标签、加载页面、安装 bridge 并完成文档注入。 |

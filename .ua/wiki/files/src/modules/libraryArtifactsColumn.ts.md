
# src/modules/libraryArtifactsColumn.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/libraryArtifactsColumn.ts -->

为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。
源码：[src/modules/libraryArtifactsColumn.ts](../../../../../src/modules/libraryArtifactsColumn.ts)

## 符号（9）
<!-- node: function:src/modules/libraryArtifactsColumn.ts:notifyLibraryArtifactsColumnItemsChanged -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:provideArtifactsCellData -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:provideRatingCellData -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:registerLibraryArtifactsColumn -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:registerLibraryRatingColumn -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:renderArtifactsCell -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:renderRatingCell -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:scanItemArtifacts -->
<!-- node: function:src/modules/libraryArtifactsColumn.ts:scheduleItemRowsRefresh -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| notifyLibraryArtifactsColumnItemsChanged | 函数 | 106–146 | 中等 | 事件处理、缓存、防抖 | 0 | 响应条目变更通知，清理受影响行的缓存并防抖调度局部刷新。 |
| provideArtifactsCellData | 函数 | 169–183 | 简单 | zotero-ui、列表列、数据供给 | 1 | 向 Zotero 虚拟列提供产物列单元格数据，优先读取缓存再回落到条目扫描。 |
| provideRatingCellData | 函数 | 185–199 | 简单 | zotero-ui、列表列、评分 | 1 | 向 Zotero 虚拟列提供评分列单元格数据，缺失评分时返回空值而非默认值。 |
| registerLibraryArtifactsColumn | 函数 | 28–55 | 简单 | zotero-ui、列表列、注册 | 0 | 向 Zotero 虚拟列注册「文献产物」列并挂接单元格数据供给与渲染函数。 |
| registerLibraryRatingColumn | 函数 | 57–84 | 简单 | zotero-ui、列表列、评分 | 0 | 向 Zotero 虚拟列注册「文献评分」列，并将评分映射为星形展示。 |
| renderArtifactsCell | 函数 | 246–275 | 中等 | 渲染、zotero-ui、文献产物 | 0 | 渲染产物列单元格，用徽标展示已有产物与缺失产物状态。 |
| renderRatingCell | 函数 | 277–330 | 中等 | 渲染、zotero-ui、本地化 | 0 | 渲染评分列单元格，以本地化文本与星形符号展示文献评分。 |
| scanItemArtifacts | 函数 | 201–233 | 中等 | 文献产物、扫描、数据来源 | 1 | 扫描条目 managed note 得出产物覆盖集合与文献评分，作为列数据的唯一来源。 |
| scheduleItemRowsRefresh | 函数 | 348–372 | 简单 | 防抖、刷新、zotero-ui | 1 | 以防抖方式调度指定行或全表的重新读取，避免通知风暴触发重复刷新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryArtifactReadiness.ts](zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [literatureScore.ts](../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [locale.ts](../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [zoteroHostCapabilityBroker.ts](zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| notifyLibraryArtifactsColumnItemsChanged | 函数 | 106–146 | 响应条目变更通知，清理受影响行的缓存并防抖调度局部刷新。 |
| registerLibraryArtifactsColumn | 函数 | 28–55 | 向 Zotero 虚拟列注册「文献产物」列并挂接单元格数据供给与渲染函数。 |
| registerLibraryRatingColumn | 函数 | 57–84 | 向 Zotero 虚拟列注册「文献评分」列，并将评分映射为星形展示。 |

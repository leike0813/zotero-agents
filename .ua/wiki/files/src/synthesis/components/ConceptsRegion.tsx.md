
# src/synthesis/components/ConceptsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/ConceptsRegion.tsx -->

Synthesis Workbench 的 concepts 表面：概念筛选工具栏、缓存状态行、批量选择条、概念表与内联评审面板。
源码：[src/synthesis/components/ConceptsRegion.tsx](../../../../../../src/synthesis/components/ConceptsRegion.tsx)

## 符号（11）
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:compactReviewValue -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:conceptHostCommandOperationKey -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:conceptsRegionPropsEqual -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:createConceptDisplayNameResolver -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:hasStructuredContent -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:HostCommandButton -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:isOpenConceptReviewItem -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:maybeLocalizedValue -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:PillList -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:projectConceptReviewItemView -->
<!-- node: function:src/synthesis/components/ConceptsRegion.tsx:projectConceptRowView -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compactReviewValue | 函数 | 286–312 | 中等 | formatting、review、concepts | 0 | 把评审字段压缩为单行可展示文本，避免长定义撑爆表格行。 |
| conceptHostCommandOperationKey | 函数 | 336–353 | 中等 | operation-key、concepts、pending-state | 1 | 由概念命令与其参数派生稳定操作键，用于禁用进行中的按钮。 |
| conceptsRegionPropsEqual | 函数 | 161–170 | 简单 | equality、memoized、preact | 0 | Concepts 区域的 memo 比较器：回调恒等加 selection 签名相等才算 props 未变。 |
| createConceptDisplayNameResolver | 函数 | 400–410 | 简单 | resolver、concepts、alias | 0 | 构造别名感知的概念显示名解析器，供渲染与检索共用。 |
| hasStructuredContent | 函数 | 196–208 | 简单 | predicate、concepts、content | 0 | 判定概念行是否含有可展示的结构化内容（定义、用法说明等）。 |
| HostCommandButton | 函数 | 452–490 | 中等 | button、host-command、pending-state | 1 | 通用宿主命令按钮，按命令是否处于 pending 自动禁用并上报意图。 |
| isOpenConceptReviewItem | 函数 | 415–417 | 简单 | predicate、review、concepts | 0 | 判定评审项是否处于展开状态。 |
| maybeLocalizedValue | 函数 | 262–284 | 中等 | localization、projection、concepts | 0 | 把可能是本地化对象或原始标量的字段解析为展示字符串。 |
| PillList | 函数 | 492–522 | 中等 | badge、list、presentational | 1 | 渲染别名词元列表，超出上限时折叠为计数提示。 |
| projectConceptReviewItemView | 函数 | 419–444 | 中等 | projection、review、concepts | 1 | 把概念评审 wire 项投影为内联评审面板所需的视图形状。 |
| projectConceptRowView | 函数 | 359–396 | 中等 | projection、concepts、view-model | 1 | 把收窄后的概念 wire 行投影为表格行视图。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchI18nContract.ts](../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSurfaceProjection.ts](../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| conceptHostCommandOperationKey | 函数 | 336–353 | 由概念命令与其参数派生稳定操作键，用于禁用进行中的按钮。 |
| conceptsRegionPropsEqual | 函数 | 161–170 | Concepts 区域的 memo 比较器：回调恒等加 selection 签名相等才算 props 未变。 |
| createConceptDisplayNameResolver | 函数 | 400–410 | 构造别名感知的概念显示名解析器，供渲染与检索共用。 |
| isOpenConceptReviewItem | 函数 | 415–417 | 判定评审项是否处于展开状态。 |
| projectConceptReviewItemView | 函数 | 419–444 | 把概念评审 wire 项投影为内联评审面板所需的视图形状。 |
| projectConceptRowView | 函数 | 359–396 | 把收窄后的概念 wire 行投影为表格行视图。 |


# src/dashboard/components/ProductsRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/dashboard/components](../../../../modules/src/dashboard/components.md)
<!-- node: file:src/dashboard/components/ProductsRegion.tsx -->

Dashboard 的产物（Products）面板：产物与 Skill 反馈分栏切换、可展开的产物文件树、代码/Markdown 预览（highlight.js 高亮 + 共享 Markdown renderer）以及反馈选择工具栏。
源码：[src/dashboard/components/ProductsRegion.tsx](../../../../../../src/dashboard/components/ProductsRegion.tsx)

## 符号（11）
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:buildProductAssetTree -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:copyProductTextToClipboard -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:createProductMarkdownParser -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:highlightProductCode -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductCodeViewer -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductFileTree -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:productFileTypeIconClass -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductPreview -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductsRegion -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductsToolbarActions -->
<!-- node: function:src/dashboard/components/ProductsRegion.tsx:ProductTreeNodeView -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildProductAssetTree | 函数 | 317–375 | 中等 | data-transform、file-tree | 0 | 把扁平的产物资产路径列表构建成按目录分层的树结构，保留原始显示顺序。 |
| copyProductTextToClipboard | 函数 | 533–556 | 简单 | clipboard、utility | 0 | 把产物文本复制到剪贴板并返回成功与否，供复制按钮给出反馈。 |
| createProductMarkdownParser | 函数 | 506–531 | 中等 | markdown、sanitization、factory | 0 | 用共享 sanitize profile 创建 Markdown 解析器实例，供产物 Markdown 预览复用。 |
| highlightProductCode | 函数 | 476–504 | 中等 | presentation、syntax-highlight | 0 | 对代码类产物调用 vendor highlight.js 做高亮，非代码内容原样转义输出。 |
| ProductCodeViewer | 函数 | 562–662 | 中等 | component、preview、code | 0 | 代码类产物查看器：按语言高亮渲染、滚动定位与复制操作。 |
| ProductFileTree | 函数 | 862–917 | 中等 | component、file-tree | 0 | 产物文件树容器：渲染整棵树并派发资产选中与打开目录动作。 |
| productFileTypeIconClass | 函数 | 377–412 | 中等 | presentation、file-type | 0 | 由文件扩展名推导产物文件的图标 class，区分代码、Markdown、图片与归档。 |
| ProductPreview | 函数 | 710–756 | 中等 | component、preview、dispatch | 0 | 产物预览分发器：按资产类型在代码查看器、Markdown 视图与通用文本预览之间选择。 |
| [ProductsRegion](../../../../symbols/src/dashboard/components/ProductsRegion.tsx/ProductsRegion.md) | 函数 | 1307–1442 | 复杂 | component、memo、region | 1 | memo 化的产物区域组件：按 signature 相等判断重渲染，组合工具栏、文件树、预览与反馈选择区。 |
| ProductsToolbarActions | 函数 | 923–973 | 中等 | component、toolbar、action-dispatch | 0 | 产物面板工具栏：分栏切换、打开产物目录与导出等动作入口。 |
| ProductTreeNodeView | 函数 | 762–860 | 中等 | component、file-tree、recursive | 0 | 产物文件树的单个节点：递归渲染子节点并维护展开状态与选中态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardWireContract.ts](../../shared/dashboardWireContract.ts.md) | src/shared/dashboardWireContract.ts | Dashboard 跨边界 wire 契约的单一事实源：定义 dashboard iframe 页面与 Zotero 宿主之间 postMessage 交换的全部信封、动作、payload 与 snapshot 类型。 |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardChromeRenderer.ts](../dashboardChromeRenderer.ts.md) | src/dashboard/dashboardChromeRenderer.ts | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [dashboardPanelModel.ts](../dashboardPanelModel.ts.md) | src/dashboard/dashboardPanelModel.ts | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [dashboardTypes.ts](../dashboardTypes.ts.md) | src/dashboard/dashboardTypes.ts | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardDomUtils.ts](../dashboardDomUtils.ts.md) | src/dashboard/dashboardDomUtils.ts | Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。 |
| [equalBySignature](../../../../symbols/src/shared/regionEquality.ts/equalBySignature.md) | src/shared/regionEquality.ts | 按签名判定两个区域 selection 是否等价，为同引用、null 合并与同类型原值提供与 stringify 等价的快路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildProductAssetTree | 函数 | 317–375 | 把扁平的产物资产路径列表构建成按目录分层的树结构，保留原始显示顺序。 |
| highlightProductCode | 函数 | 476–504 | 对代码类产物调用 vendor highlight.js 做高亮，非代码内容原样转义输出。 |
| ProductCodeViewer | 函数 | 562–662 | 代码类产物查看器：按语言高亮渲染、滚动定位与复制操作。 |
| ProductFileTree | 函数 | 862–917 | 产物文件树容器：渲染整棵树并派发资产选中与打开目录动作。 |
| productFileTypeIconClass | 函数 | 377–412 | 由文件扩展名推导产物文件的图标 class，区分代码、Markdown、图片与归档。 |
| ProductPreview | 函数 | 710–756 | 产物预览分发器：按资产类型在代码查看器、Markdown 视图与通用文本预览之间选择。 |
| [ProductsRegion](../../../../symbols/src/dashboard/components/ProductsRegion.tsx/ProductsRegion.md) | 函数 | 1307–1442 | memo 化的产物区域组件：按 signature 相等判断重渲染，组合工具栏、文件树、预览与反馈选择区。 |

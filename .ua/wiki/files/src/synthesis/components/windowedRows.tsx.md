
# src/synthesis/components/windowedRows.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/windowedRows.tsx -->

窗口化（虚拟）行渲染基础设施：按滚动偏移计算可见区间、上下占位高度，并提供表格与网格两套 spacer 组件。
源码：[src/synthesis/components/windowedRows.tsx](../../../../../../src/synthesis/components/windowedRows.tsx)

## 符号（5）
<!-- node: function:src/synthesis/components/windowedRows.tsx:indexAtOffset -->
<!-- node: function:src/synthesis/components/windowedRows.tsx:useWindowedGridRows -->
<!-- node: function:src/synthesis/components/windowedRows.tsx:useWindowedRows -->
<!-- node: function:src/synthesis/components/windowedRows.tsx:WindowedGridSpacer -->
<!-- node: function:src/synthesis/components/windowedRows.tsx:WindowedTableSpacer -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| indexAtOffset | 函数 | 56–71 | 简单 | utility、virtualization、math | 0 | 把像素滚动偏移换算为起始行索引并夹紧到合法区间。 |
| useWindowedGridRows | 函数 | 339–392 | 中等 | hook、virtualization、performance | 0 | 窗口化网格行 hook：按列数与行高计算可见网格窗口。 |
| [useWindowedRows](../../../../symbols/src/synthesis/components/windowedRows.tsx/useWindowedRows.md) | 函数 | 78–337 | 复杂 | hook、virtualization、performance | 2 | 窗口化行 hook：监听容器滚动与尺寸变化，输出可见区间、偏移与总高度。 |
| WindowedGridSpacer | 函数 | 409–418 | 简单 | component、virtualization | 0 | 网格上下占位 spacer 组件。 |
| WindowedTableSpacer | 函数 | 394–407 | 简单 | component、virtualization、data-table | 0 | 表格上下占位 spacer 组件，撑出虚拟滚动所需高度。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [CanonicalRevisionWorkbench.tsx](registry/CanonicalRevisionWorkbench.tsx.md) | src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [RegistryTables.tsx](registry/RegistryTables.tsx.md) | src/synthesis/components/registry/RegistryTables.tsx | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [TopicsRegion.tsx](TopicsRegion.tsx.md) | src/synthesis/components/TopicsRegion.tsx | Synthesis Workbench 的 artifacts 表面：搜索排序工具栏、图/列表/网格视图切换与主题关系图嵌入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| useWindowedGridRows | 函数 | 339–392 | 窗口化网格行 hook：按列数与行高计算可见网格窗口。 |
| [useWindowedRows](../../../../symbols/src/synthesis/components/windowedRows.tsx/useWindowedRows.md) | 函数 | 78–337 | 窗口化行 hook：监听容器滚动与尺寸变化，输出可见区间、偏移与总高度。 |
| WindowedGridSpacer | 函数 | 409–418 | 网格上下占位 spacer 组件。 |
| WindowedTableSpacer | 函数 | 394–407 | 表格上下占位 spacer 组件，撑出虚拟滚动所需高度。 |

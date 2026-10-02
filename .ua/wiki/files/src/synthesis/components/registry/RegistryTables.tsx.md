
# src/synthesis/components/registry/RegistryTables.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/RegistryTables.tsx -->

注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。
源码：[src/synthesis/components/registry/RegistryTables.tsx](../../../../../../../src/synthesis/components/registry/RegistryTables.tsx)

## 符号（12）
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:artifactTitleFor -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:ReferenceStatusCell -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:ReferenceTitleCell -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryArtifacts -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryIndexTable -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryParentRow -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryRating -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryReferencedOnlyTable -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryReferenceRow -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:registryRefreshAction -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryRowActions -->
<!-- node: function:src/synthesis/components/registry/RegistryTables.tsx:RegistryTitleCell -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| artifactTitleFor | 函数 | 41–56 | 简单 | utility、projection、fallback | 0 | 在多个产物字段中挑出可展示的标题文本。 |
| ReferenceStatusCell | 函数 | 295–309 | 简单 | component、data-table、registry | 0 | 文献状态单元格，展示状态徽标与色调。 |
| ReferenceTitleCell | 函数 | 275–293 | 简单 | component、data-table、registry | 0 | 文献标题单元格，输出可读标题与可访问文本。 |
| RegistryArtifacts | 函数 | 58–93 | 简单 | component、registry、presentation | 0 | 渲染一行记录关联的产物徽标集合。 |
| [RegistryIndexTable](../../../../../symbols/src/synthesis/components/registry/RegistryTables.tsx/RegistryIndexTable.md) | 函数 | 422–559 | 复杂 | component、data-table、registry、virtualization | 1 | 注册表索引主表：列定义、窗口化渲染、父级展开与选择联动。 |
| RegistryParentRow | 函数 | 340–396 | 中等 | component、data-table、registry | 0 | 父级文献行：承载子级展开状态、聚合计数与父级动作。 |
| RegistryRating | 函数 | 95–135 | 中等 | component、registry、scoring | 0 | 把文献质量评分投影为星级与诊断提示。 |
| RegistryReferencedOnlyTable | 函数 | 571–687 | 复杂 | component、data-table、registry、virtualization | 0 | “仅被引用条目”表格：只渲染有引用关系的记录及其来源列。 |
| RegistryReferenceRow | 函数 | 311–338 | 简单 | component、data-table、registry | 0 | 索引表中的文献数据行，装配各单元格与行内动作。 |
| registryRefreshAction | 函数 | 398–419 | 简单 | utility、action、registry | 0 | 构造注册表刷新动作描述，携带筛选与选择上下文。 |
| RegistryRowActions | 函数 | 170–228 | 中等 | component、row-actions、registry | 0 | 索引表行内动作集合，按操作可用性决定按钮的启用与禁用。 |
| RegistryTitleCell | 函数 | 230–273 | 中等 | component、data-table、registry | 0 | 索引表标题单元格：折叠父级、展开子级并处理空标题回退。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [controls.tsx](controls.tsx.md) | src/synthesis/components/registry/controls.tsx | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [literatureScore.ts](../../../shared/literatureScore.ts.md) | src/shared/literatureScore.ts | 文献评分的前端共享投影层：重导出 synthesis-contracts 的评分常量与类型，解析已存评分产物，并据此推导质量先验、质量快照与星级呈现。 |
| [registryTypes.ts](registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [windowedRows.tsx](../windowedRows.tsx.md) | src/synthesis/components/windowedRows.tsx | 窗口化（虚拟）行渲染基础设施：按滚动偏移计算可见区间、上下占位高度，并提供表格与网格两套 spacer 组件。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [RegistryRegion.tsx](RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [RegistryIndexTable](../../../../../symbols/src/synthesis/components/registry/RegistryTables.tsx/RegistryIndexTable.md) | 函数 | 422–559 | 注册表索引主表：列定义、窗口化渲染、父级展开与选择联动。 |
| RegistryReferencedOnlyTable | 函数 | 571–687 | “仅被引用条目”表格：只渲染有引用关系的记录及其来源列。 |

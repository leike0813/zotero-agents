
# src/synthesis/components/registry/controls.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/controls.tsx -->

注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。
源码：[src/synthesis/components/registry/controls.tsx](../../../../../../../src/synthesis/components/registry/controls.tsx)

## 符号（5）
<!-- node: function:src/synthesis/components/registry/controls.tsx:RegistryActionButton -->
<!-- node: function:src/synthesis/components/registry/controls.tsx:RegistryBadge -->
<!-- node: function:src/synthesis/components/registry/controls.tsx:RegistryEmptyState -->
<!-- node: function:src/synthesis/components/registry/controls.tsx:RegistryFilterInput -->
<!-- node: function:src/synthesis/components/registry/controls.tsx:RegistrySelect -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [RegistryActionButton](../../../../../symbols/src/synthesis/components/registry/controls.tsx/RegistryActionButton.md) | 函数 | 34–79 | 中等 | component、ui-control、action、pending-state | 2 | 动作按钮：处理 pending、禁用原因提示与点击派发。 |
| RegistryBadge | 函数 | 16–27 | 简单 | component、ui-control、presentation | 1 | 通用状态徽标，按 tone 映射视觉样式。 |
| RegistryEmptyState | 函数 | 81–98 | 简单 | component、ui-control、empty-state | 0 | 区域空态占位，展示空态说明与可选的恢复动作。 |
| RegistryFilterInput | 函数 | 105–129 | 简单 | component、ui-control、filter | 0 | 筛选输入框，输出规范化后的筛选关键词。 |
| RegistrySelect | 函数 | 131–148 | 简单 | component、ui-control、filter | 0 | 下拉选择控件，输出选中项的原始值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registryTypes.ts](registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [CanonicalRevisionWorkbench.tsx](CanonicalRevisionWorkbench.tsx.md) | src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [IndexReviewDrawer.tsx](IndexReviewDrawer.tsx.md) | src/synthesis/components/registry/IndexReviewDrawer.tsx | 注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。 |
| [RegistryRegion.tsx](RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [RegistryTables.tsx](RegistryTables.tsx.md) | src/synthesis/components/registry/RegistryTables.tsx | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [RegistryActionButton](../../../../../symbols/src/synthesis/components/registry/controls.tsx/RegistryActionButton.md) | 函数 | 34–79 | 动作按钮：处理 pending、禁用原因提示与点击派发。 |
| RegistryBadge | 函数 | 16–27 | 通用状态徽标，按 tone 映射视觉样式。 |
| RegistryEmptyState | 函数 | 81–98 | 区域空态占位，展示空态说明与可选的恢复动作。 |
| RegistryFilterInput | 函数 | 105–129 | 筛选输入框，输出规范化后的筛选关键词。 |
| RegistrySelect | 函数 | 131–148 | 下拉选择控件，输出选中项的原始值。 |

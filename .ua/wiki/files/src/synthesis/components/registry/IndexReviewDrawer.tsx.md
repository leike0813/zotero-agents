
# src/synthesis/components/registry/IndexReviewDrawer.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/IndexReviewDrawer.tsx -->

注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。
源码：[src/synthesis/components/registry/IndexReviewDrawer.tsx](../../../../../../../src/synthesis/components/registry/IndexReviewDrawer.tsx)

## 符号（9）
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:anchorRectFromEvent -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:canonicalRevisionContext -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:CanonicalRevisionReviewCard -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:CleanupReviewCard -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:IndexReviewDrawer -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:ReferenceMatchReviewCard -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:ReferenceProposalPendingControls -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:ReviewCard -->
<!-- node: function:src/synthesis/components/registry/IndexReviewDrawer.tsx:ReviewDrawerItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| anchorRectFromEvent | 函数 | 55–69 | 简单 | utility、positioning、dom | 0 | 从点击事件推算浮层锚点矩形，供抽屉内容定位。 |
| canonicalRevisionContext | 函数 | 362–382 | 简单 | utility、review、projection | 0 | 为规范修订审阅卡片提取目标与操作上下文。 |
| CanonicalRevisionReviewCard | 函数 | 385–449 | 简单 | component、review、decision | 0 | 规范修订审阅卡片：展示规范差异并派发接受或拒绝意图。 |
| CleanupReviewCard | 函数 | 452–503 | 简单 | component、review、cleanup | 0 | 遗留清理审阅卡片：展示待清理对象及清理影响范围。 |
| [IndexReviewDrawer](../../../../../symbols/src/synthesis/components/registry/IndexReviewDrawer.tsx/IndexReviewDrawer.md) | 函数 | 543–658 | 复杂 | component、drawer、review、orchestration | 1 | 索引审阅抽屉主组件：聚合并按类型分派待审条目，驱动审阅队列消费。 |
| ReferenceMatchReviewCard | 函数 | 227–359 | 复杂 | component、review、decision | 0 | 引用匹配审阅卡片：并排展示候选与现有条目，接受/拒绝后写入审阅状态。 |
| ReferenceProposalPendingControls | 函数 | 94–136 | 简单 | component、review、pending-state | 0 | 待提交提案的动作控件组：按操作键禁用重复提交并展示进行中状态。 |
| ReviewCard | 函数 | 141–211 | 中等 | component、review、presentation | 0 | 审阅卡片通用外壳：统一标题、元信息、状态徽标与决策按钮布局。 |
| ReviewDrawerItem | 函数 | 505–540 | 简单 | component、review、list | 0 | 审阅抽屉中的单条列表项：按待决状态分组并派发打开详情。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [controls.tsx](controls.tsx.md) | src/synthesis/components/registry/controls.tsx | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [registryTypes.ts](registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [RegistryRegion.tsx](RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [IndexReviewDrawer](../../../../../symbols/src/synthesis/components/registry/IndexReviewDrawer.tsx/IndexReviewDrawer.md) | 函数 | 543–658 | 索引审阅抽屉主组件：聚合并按类型分派待审条目，驱动审阅队列消费。 |

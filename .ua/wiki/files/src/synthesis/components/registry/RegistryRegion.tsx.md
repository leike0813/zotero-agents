
# src/synthesis/components/registry/RegistryRegion.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/RegistryRegion.tsx -->

注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。
源码：[src/synthesis/components/registry/RegistryRegion.tsx](../../../../../../../src/synthesis/components/registry/RegistryRegion.tsx)

## 符号（5）
<!-- node: function:src/synthesis/components/registry/RegistryRegion.tsx:RegistryCacheBadge -->
<!-- node: function:src/synthesis/components/registry/RegistryRegion.tsx:RegistryCanonicalToolFilters -->
<!-- node: function:src/synthesis/components/registry/RegistryRegion.tsx:RegistryIndexFilters -->
<!-- node: function:src/synthesis/components/registry/RegistryRegion.tsx:RegistryRegion -->
<!-- node: function:src/synthesis/components/registry/RegistryRegion.tsx:RegistrySidecarCommands -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| RegistryCacheBadge | 函数 | 43–59 | 简单 | component、registry、status | 0 | 展示注册表缓存命中与新鲜度状态徽标。 |
| RegistryCanonicalToolFilters | 函数 | 299–324 | 简单 | component、filter、registry | 0 | 规范工具区筛选器：限定规范工作台内的作用范围。 |
| RegistryIndexFilters | 函数 | 99–297 | 复杂 | component、filter、registry、state | 0 | 索引筛选器：状态、来源、评分等条件组合并输出筛选后选择态。 |
| RegistryRegion | 函数 | 333–432 | 中等 | component、region、registry、memoization | 1 | 注册表区域主组件：按签名比较 props，联动子区域并派发宿主动作。 |
| RegistrySidecarCommands | 函数 | 61–97 | 简单 | component、registry、action | 0 | 注册表区域的 sidecar 命令按钮组：派发刷新、重建等宿主命令。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [CanonicalRevisionWorkbench.tsx](CanonicalRevisionWorkbench.tsx.md) | src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [controls.tsx](controls.tsx.md) | src/synthesis/components/registry/controls.tsx | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [IndexReviewDrawer.tsx](IndexReviewDrawer.tsx.md) | src/synthesis/components/registry/IndexReviewDrawer.tsx | 注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。 |
| [regionEquality.ts](../../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [RegistryTables.tsx](RegistryTables.tsx.md) | src/synthesis/components/registry/RegistryTables.tsx | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [registryTypes.ts](registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchChromeRenderer.ts](../../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| RegistryRegion | 函数 | 333–432 | 注册表区域主组件：按签名比较 props，联动子区域并派发宿主动作。 |

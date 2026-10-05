
# src/synthesis/components/registry
> 目录聚合页：6 个文件、75 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx](../../../../files/src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx.md) | 文件 | 16 | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [src/synthesis/components/registry/controls.tsx](../../../../files/src/synthesis/components/registry/controls.tsx.md) | 文件 | 5 | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [src/synthesis/components/registry/IndexReviewDrawer.tsx](../../../../files/src/synthesis/components/registry/IndexReviewDrawer.tsx.md) | 文件 | 9 | 注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。 |
| [src/synthesis/components/registry/RegistryRegion.tsx](../../../../files/src/synthesis/components/registry/RegistryRegion.tsx.md) | 文件 | 5 | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [src/synthesis/components/registry/RegistryTables.tsx](../../../../files/src/synthesis/components/registry/RegistryTables.tsx.md) | 文件 | 12 | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [src/synthesis/components/registry/registryTypes.ts](../../../../files/src/synthesis/components/registry/registryTypes.ts.md) | 文件 | 28 | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](../../shared.md) | 6 |
| [src/synthesis/components](../components.md) | 4 |

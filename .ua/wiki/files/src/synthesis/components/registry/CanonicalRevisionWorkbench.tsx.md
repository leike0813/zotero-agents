
# src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx -->

注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。
源码：[src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx](../../../../../../../src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx)

## 符号（16）
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:blockersText -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalBindingBlock -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalDetailDrawer -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalDuplicatePeers -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalEditDrawer -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalEditFields -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalEditIdentifierRows -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalIdentifierChips -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalMergeBar -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalProposalList -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalRawReferenceList -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalRedirectList -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalRevisionTable -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalRevisionWorkbench -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalRowActions -->
<!-- node: function:src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx:CanonicalSelectAllCheckbox -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| blockersText | 函数 | 58–68 | 简单 | utility、formatting、validation | 0 | 把规范行的阻塞原因数组拼成可读提示文本，无阻塞时返回空串。 |
| CanonicalBindingBlock | 函数 | 560–588 | 简单 | component、registry、binding | 0 | 展示规范记录与宿主条目的绑定关系及绑定状态。 |
| CanonicalDetailDrawer | 函数 | 1069–1221 | 复杂 | component、drawer、registry、presentation | 0 | 规范记录详情抽屉：汇总绑定、重定向、重复、提案与原始元数据，并提供跳转编辑入口。 |
| CanonicalDuplicatePeers | 函数 | 634–660 | 简单 | component、registry、dedupe | 0 | 展示被判为重复的同级规范记录及其差异线索。 |
| CanonicalEditDrawer | 函数 | 919–1063 | 复杂 | component、drawer、registry、form | 0 | 规范记录编辑抽屉：装配字段表单、标识符编辑、脏草稿比对与保存/重置动作。 |
| CanonicalEditFields | 函数 | 879–917 | 简单 | component、registry、form | 0 | 规范记录可编辑字段的表单布局与脏值提示。 |
| CanonicalEditIdentifierRows | 函数 | 812–877 | 中等 | component、registry、form、validation | 0 | 规范编辑抽屉中的标识符行编辑控件，支持增删改与冲突提示。 |
| CanonicalIdentifierChips | 函数 | 540–558 | 简单 | component、registry、presentation | 0 | 以徽标形式展示一条规范记录的多种标识符。 |
| CanonicalMergeBar | 函数 | 74–152 | 简单 | component、registry、bulk-action | 0 | 规范行顶部合并操作条：展示可合并对象计数并派发合并意图。 |
| CanonicalProposalList | 函数 | 662–704 | 简单 | component、registry、proposal | 0 | 展示与该规范记录相关的待决合并/重定向提案。 |
| CanonicalRawReferenceList | 函数 | 706–755 | 中等 | component、registry、presentation | 0 | 以折叠形式展示规范记录引用的原始文献元数据。 |
| CanonicalRedirectList | 函数 | 590–632 | 简单 | component、registry、redirect | 0 | 列出指向当前规范记录的重定向条目。 |
| CanonicalRevisionTable | 函数 | 275–534 | 复杂 | component、data-table、registry、virtualization | 0 | 规范修订主表：负责列定义、窗口化行渲染、选择联动与行内动作装配。 |
| [CanonicalRevisionWorkbench](../../../../../symbols/src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx/CanonicalRevisionWorkbench.md) | 函数 | 1227–1697 | 复杂 | component、registry、orchestration、memoization | 1 | 规范修订工作台主组件：编排筛选、选择、表格、编辑与详情抽屉，并管理本地审阅状态。 |
| CanonicalRowActions | 函数 | 158–247 | 简单 | component、registry、row-actions、validation | 0 | 规范行内动作集合：绑定、重定向、去重与提案操作，按可用性条件渲染。 |
| CanonicalSelectAllCheckbox | 函数 | 249–273 | 简单 | component、registry、selection | 0 | 规范表全选复选框，反映并更新当前选择集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [controls.tsx](controls.tsx.md) | src/synthesis/components/registry/controls.tsx | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [registryTypes.ts](registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [windowedRows.tsx](../windowedRows.tsx.md) | src/synthesis/components/windowedRows.tsx | 窗口化（虚拟）行渲染基础设施：按滚动偏移计算可见区间、上下占位高度，并提供表格与网格两套 spacer 组件。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [RegistryRegion.tsx](RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [CanonicalRevisionWorkbench](../../../../../symbols/src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx/CanonicalRevisionWorkbench.md) | 函数 | 1227–1697 | 规范修订工作台主组件：编排筛选、选择、表格、编辑与详情抽屉，并管理本地审阅状态。 |


# src/synthesis/components/registry/registryTypes.ts
所属分层：[页面与交互界面](../../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components/registry](../../../../../modules/src/synthesis/components/registry.md)
<!-- node: file:src/synthesis/components/registry/registryTypes.ts -->

注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。
源码：[src/synthesis/components/registry/registryTypes.ts](../../../../../../../src/synthesis/components/registry/registryTypes.ts)

## 符号（28）
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:buildRegistryReviewLookup -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:canonicalEditComparableDraft -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:canonicalEditDraftFromRecord -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:canonicalEditDraftIsDirty -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:canonicalEditPatch -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:compactRegistryReviewValue -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:indexReviewItems -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:isReferenceDecisionSubmitting -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowActionAvailability -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowCanonicalRow -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowCanonicalRows -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowIdentifiers -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowRedirectEndpoint -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowRegistryProposal -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowRegistryRow -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:narrowRegistryRows -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryEnumLabel -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryFilterOptionLabel -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryHasArtifact -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryLocalizedValue -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryMatchProposalContext -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryOperationKey -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryReferencedEntries -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryReferenceDisplayId -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryReferencePrimaryTitle -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryReferenceReadableTitle -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:registryStatusTone -->
<!-- node: function:src/synthesis/components/registry/registryTypes.ts:scrollRegistryListToGroup -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRegistryReviewLookup | 函数 | 938–968 | 中等 | projection、review、indexing、performance | 0 | 构建按文献键索引的审阅上下文查找表，避免逐行线性查找。 |
| canonicalEditComparableDraft | 函数 | 1267–1279 | 简单 | utility、diff、form | 0 | 抽取草稿中参与比较的字段，忽略顺序与空值噪声。 |
| canonicalEditDraftFromRecord | 函数 | 1256–1265 | 简单 | utility、form、canonical-revision | 0 | 由规范记录构造编辑草稿初值。 |
| canonicalEditDraftIsDirty | 函数 | 1281–1292 | 简单 | utility、diff、form | 0 | 比较初值与当前草稿，判定是否需要提交确认。 |
| canonicalEditPatch | 函数 | 1294–1308 | 简单 | utility、diff、action、form | 0 | 由草稿与初值差异生成提交补丁，只包含真正变更的字段。 |
| compactRegistryReviewValue | 函数 | 1155–1181 | 中等 | utility、formatting、review | 0 | 把任意审阅值压缩为单行可读文本，避免详情区被长文本撑开。 |
| [indexReviewItems](../../../../../symbols/src/synthesis/components/registry/registryTypes.ts/indexReviewItems.md) | 函数 | 1062–1105 | 复杂 | projection、review、grouping | 1 | 把待决提案展开为抽屉用的审阅条目列表，并按类型分组排序。 |
| isReferenceDecisionSubmitting | 函数 | 1113–1123 | 简单 | utility、pending-state、review | 0 | 判定某条引用决策是否正在提交，用于禁用重复操作。 |
| narrowActionAvailability | 函数 | 646–655 | 简单 | narrowing、validation、registry | 0 | 收窄动作可用性描述，输出可执行动作与阻塞原因。 |
| narrowCanonicalRow | 函数 | 670–749 | 复杂 | narrowing、projection、registry、canonical-revision | 0 | 把 wire 规范行收窄为完整的规范记录视图：绑定、重定向、重复与提案信息。 |
| narrowCanonicalRows | 函数 | 751–755 | 简单 | narrowing、projection、canonical-revision | 1 | 对规范行列表逐条应用 narrowCanonicalRow，统一输出受控规范行集合。 |
| narrowIdentifiers | 函数 | 626–644 | 简单 | narrowing、utility、registry | 0 | 收窄标识符列表，去除空值并统一键名形态。 |
| narrowRedirectEndpoint | 函数 | 657–668 | 简单 | narrowing、registry、redirect | 0 | 收窄重定向端点信息。 |
| narrowRegistryProposal | 函数 | 757–811 | 复杂 | narrowing、projection、proposal | 0 | 收窄单条注册表提案，补齐目标、操作与上下文字段。 |
| narrowRegistryRow | 函数 | 597–620 | 中等 | narrowing、projection、registry | 0 | 把 wire 索引行收窄为渲染所需的受控字段集合。 |
| narrowRegistryRows | 函数 | 622–624 | 简单 | narrowing、projection、registry | 1 | 对索引行列表逐条应用 narrowRegistryRow，统一输出受控行集合。 |
| registryEnumLabel | 函数 | 410–421 | 简单 | i18n、formatting、registry | 0 | 注册表枚举标签本地化：优先 i18n 消息，缺失时回退人类化文本。 |
| registryFilterOptionLabel | 函数 | 423–430 | 简单 | i18n、filter、registry | 0 | 生成筛选下拉的展示标签。 |
| registryHasArtifact | 函数 | 871–878 | 简单 | utility、type-guard、registry | 0 | 判定文献是否挂有任一受支持的产物。 |
| registryLocalizedValue | 函数 | 432–454 | 简单 | i18n、type-guard、registry | 0 | 判定字段是枚举还是已本地化对象，输出统一的可渲染文本。 |
| registryMatchProposalContext | 函数 | 977–1039 | 复杂 | projection、review、matching | 0 | 为引用匹配提案组装候选与现有条目的对照上下文。 |
| registryOperationKey | 函数 | 511–559 | 复杂 | utility、action、dedupe、registry | 0 | 由动作名、关键负载与 requestId 派生稳定的操作键，用于抑制重复提交。 |
| registryReferencedEntries | 函数 | 881–919 | 中等 | projection、registry、grouping | 0 | 汇总被引用的文献条目并按引用关系分组。 |
| registryReferenceDisplayId | 函数 | 847–856 | 简单 | utility、presentation、registry | 0 | 生成文献行的展示编号。 |
| registryReferencePrimaryTitle | 函数 | 823–836 | 简单 | utility、projection、fallback | 0 | 选出文献的首选标题，缺失时回退到可读标识。 |
| registryReferenceReadableTitle | 函数 | 858–868 | 简单 | utility、presentation、fallback | 0 | 输出文献行的可读标题，无标题时给出占位文本。 |
| registryStatusTone | 函数 | 481–497 | 简单 | utility、presentation、registry | 0 | 把状态枚举映射为徽标色调。 |
| scrollRegistryListToGroup | 函数 | 1217–1236 | 简单 | utility、dom、navigation | 0 | 将注册表列表滚动到指定分组锚点。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18nContract.ts](../../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [CanonicalRevisionWorkbench.tsx](CanonicalRevisionWorkbench.tsx.md) | src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx | 注册表区域的规范修订（canonical revision）工作台组件集：负责规范行的合并、绑定校验、重定向与提案操作，以及规范详情抽屉和编辑抽屉的全部渲染。 |
| [controls.tsx](controls.tsx.md) | src/synthesis/components/registry/controls.tsx | 注册表区域共享的原子控件集合：徽标、动作按钮、空态、筛选输入框、下拉选择和面板工具条。 |
| [IndexReviewDrawer.tsx](IndexReviewDrawer.tsx.md) | src/synthesis/components/registry/IndexReviewDrawer.tsx | 注册表索引审阅抽屉：按待审条目类型分派引用匹配、规范修订与遗留清理三类审阅卡片，并收集用户的接受/拒绝/忽略决策。 |
| [registryProjection.ts](../../registryProjection.ts.md) | src/synthesis/registryProjection.ts | 注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。 |
| [RegistryRegion.tsx](RegistryRegion.tsx.md) | src/synthesis/components/registry/RegistryRegion.tsx | 注册表（Registry）主区域组件：装配索引表、canonical 工作台与审阅抽屉三个子区域，并提供缓存徽标、sidecar 命令和索引/工具筛选器。 |
| [RegistryTables.tsx](RegistryTables.tsx.md) | src/synthesis/components/registry/RegistryTables.tsx | 注册表表格渲染层：包含索引表与“仅被引用条目”两张表的行、标题、状态、评分、父级展开与行内动作渲染。 |
| [synthesisSurfaceProjection.ts](../../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchApp.ts](../../synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchPanelModel.ts](../../synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](../../synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRegistryReviewLookup | 函数 | 938–968 | 构建按文献键索引的审阅上下文查找表，避免逐行线性查找。 |
| canonicalEditDraftFromRecord | 函数 | 1256–1265 | 由规范记录构造编辑草稿初值。 |
| canonicalEditDraftIsDirty | 函数 | 1281–1292 | 比较初值与当前草稿，判定是否需要提交确认。 |
| canonicalEditPatch | 函数 | 1294–1308 | 由草稿与初值差异生成提交补丁，只包含真正变更的字段。 |
| compactRegistryReviewValue | 函数 | 1155–1181 | 把任意审阅值压缩为单行可读文本，避免详情区被长文本撑开。 |
| [indexReviewItems](../../../../../symbols/src/synthesis/components/registry/registryTypes.ts/indexReviewItems.md) | 函数 | 1062–1105 | 把待决提案展开为抽屉用的审阅条目列表，并按类型分组排序。 |
| isReferenceDecisionSubmitting | 函数 | 1113–1123 | 判定某条引用决策是否正在提交，用于禁用重复操作。 |
| narrowCanonicalRow | 函数 | 670–749 | 把 wire 规范行收窄为完整的规范记录视图：绑定、重定向、重复与提案信息。 |
| narrowCanonicalRows | 函数 | 751–755 | 对规范行列表逐条应用 narrowCanonicalRow，统一输出受控规范行集合。 |
| narrowRegistryProposal | 函数 | 757–811 | 收窄单条注册表提案，补齐目标、操作与上下文字段。 |
| narrowRegistryRow | 函数 | 597–620 | 把 wire 索引行收窄为渲染所需的受控字段集合。 |
| narrowRegistryRows | 函数 | 622–624 | 对索引行列表逐条应用 narrowRegistryRow，统一输出受控行集合。 |
| registryEnumLabel | 函数 | 410–421 | 注册表枚举标签本地化：优先 i18n 消息，缺失时回退人类化文本。 |
| registryFilterOptionLabel | 函数 | 423–430 | 生成筛选下拉的展示标签。 |
| registryHasArtifact | 函数 | 871–878 | 判定文献是否挂有任一受支持的产物。 |
| registryLocalizedValue | 函数 | 432–454 | 判定字段是枚举还是已本地化对象，输出统一的可渲染文本。 |
| registryMatchProposalContext | 函数 | 977–1039 | 为引用匹配提案组装候选与现有条目的对照上下文。 |
| registryOperationKey | 函数 | 511–559 | 由动作名、关键负载与 requestId 派生稳定的操作键，用于抑制重复提交。 |
| registryReferencedEntries | 函数 | 881–919 | 汇总被引用的文献条目并按引用关系分组。 |
| registryReferenceDisplayId | 函数 | 847–856 | 生成文献行的展示编号。 |
| registryReferencePrimaryTitle | 函数 | 823–836 | 选出文献的首选标题，缺失时回退到可读标识。 |
| registryReferenceReadableTitle | 函数 | 858–868 | 输出文献行的可读标题，无标题时给出占位文本。 |
| registryStatusTone | 函数 | 481–497 | 把状态枚举映射为徽标色调。 |
| scrollRegistryListToGroup | 函数 | 1217–1236 | 将注册表列表滚动到指定分组锚点。 |


# src/workflows/types.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/types.ts -->

工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。

规模：3080 行
源码：[src/workflows/types.ts](../../../../../src/workflows/types.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [builtinTagPolicy.ts](../modules/synthesis/builtinTagPolicy.ts.md) | src/modules/synthesis/builtinTagPolicy.ts | Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。 |
| [index.ts](../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [literatureArtifacts.ts](../../packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [resultContext.ts](../modules/workflowExecution/resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |
| [sourceReferenceArtifact.ts](../../packages/synthesis-contracts/src/sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [wait.ts](../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [workflowProductStore.ts](../modules/workflow/catalog/workflowProductStore.ts.md) | src/modules/workflow/catalog/workflowProductStore.ts | 工作流产品存储：把已安装工作流包的产品化元数据（版本、来源、产物摘要、运行结果上下文）持久化到 pluginStateStore，并投影成 Dashboard wire DTO。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunRequestAdapter.ts](../modules/acp/skillRun/acpSkillRunRequestAdapter.ts.md) | src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts | 请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。 |
| [addon.ts](../addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [applyDiagnostics.ts](../modules/workflowExecution/applyDiagnostics.ts.md) | src/modules/workflowExecution/applyDiagnostics.ts | 工作流 apply 阶段诊断信息的归一化，限制 warning 数量与 code 长度上限，输出结构化且有界的诊断记录。 |
| [archive.ts](archive.ts.md) | src/workflows/archive.ts | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [assistantReadonlyPublication.ts](../modules/harness/assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [bibliography.ts](bibliography.ts.md) | src/workflows/bibliography.ts | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [clipboard.ts](clipboard.ts.md) | src/workflows/clipboard.ts | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [contracts.ts](../modules/workflowExecution/contracts.ts.md) | src/modules/workflowExecution/contracts.ts | 工作流执行层的类型契约集合，定义执行上下文、已准备执行单元、构建计划与 apply 摘要等跨 seam 共享的只读结构。 |
| [converter.ts](../modules/literatureArtifactMigration/converter.ts.md) | src/modules/literatureArtifactMigration/converter.ts | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |
| [dashboardReadonlyModel.ts](../modules/harness/dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |
| [declarativeRequestCompiler.ts](declarativeRequestCompiler.ts.md) | src/workflows/declarativeRequestCompiler.ts | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [feedbackPolicy.ts](../modules/workflowExecution/feedbackPolicy.ts.md) | src/modules/workflowExecution/feedbackPolicy.ts | 工作流通知策略的单一判定点，按 manifest 的 execution.feedback.showNotifications 决定是否展示完成通知。 |
| [feedbackSeam.ts](../modules/workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [file.ts](file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [helpers.ts](helpers.ts.md) | src/workflows/helpers.ts | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [host-bridge-workflow-catalog.ts](../../scripts/host-bridge/host-bridge-workflow-catalog.ts.md) | scripts/host-bridge/host-bridge-workflow-catalog.ts | 构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。 |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [hostBridgeCapabilityRegistry.ts](../modules/hostBridgeCapabilityRegistry.ts.md) | src/modules/hostBridgeCapabilityRegistry.ts | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [hostBridgeCapabilityRoutes.ts](../modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [hostBridgeMutationAdapter.ts](../modules/hostBridge/server/hostBridgeMutationAdapter.ts.md) | src/modules/hostBridge/server/hostBridgeMutationAdapter.ts | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [hostBridgeServer.ts](../modules/hostBridge/server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowAgentRun.ts](../modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [hostBridgeWorkflowResources.ts](../modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [inspect-literature-analysis.ts](../../scripts/inspect-literature-analysis.ts.md) | scripts/inspect-literature-analysis.ts | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [libraryAdapter.ts](../modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactReadiness.ts](../modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [literatureArtifactMigration.ts](../modules/literatureArtifactMigration.ts.md) | src/modules/literatureArtifactMigration.ts | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [loader.ts](loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [loaderContracts.ts](loaderContracts.ts.md) | src/workflows/loaderContracts.ts | 工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。 |
| [localization.ts](localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [manifestContract.ts](manifestContract.ts.md) | src/workflows/manifestContract.ts | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [preparationSeam.ts](../modules/workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |
| [registry.ts](../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [registry.ts](../modules/synthesis/registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |
| [requestMeta.ts](../modules/workflowExecution/requestMeta.ts.md) | src/modules/workflowExecution/requestMeta.ts | 从请求对象中解析目标父条目引用、任务名与输入单元身份等元信息，统一携带索引便于日志与判重使用。 |
| [researchBundleService.ts](../modules/hostBridge/workflow/researchBundleService.ts.md) | src/modules/hostBridge/workflow/researchBundleService.ts | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [runSeam.ts](../modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [runtime.ts](runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [selectionContext.ts](../modules/selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [sequenceRuntime.ts](../modules/workflowExecution/sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStepApply.ts](../modules/workflowExecution/sequenceStepApply.ts.md) | src/modules/workflowExecution/sequenceStepApply.ts | 序列单步 apply 执行：构造结果上下文与 bundle reader 调用运行时 apply，并收集 Skill Run 反馈侧信息返回给序列状态机。 |
| [skillRunnerForegroundContinuation.ts](../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerReadonlyProjection.ts](../modules/harness/skillRunnerReadonlyProjection.ts.md) | src/modules/harness/skillRunnerReadonlyProjection.ts | SkillRunner 只读投影：把插件状态中的 run 记录与 sequence 状态投影成 Harness 可见的运行列表，附带状态语义与技能显示名。 |
| [triggerPolicy.ts](triggerPolicy.ts.md) | src/workflows/triggerPolicy.ts | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [uploadMapping.ts](../providers/skillrunner/uploadMapping.ts.md) | src/providers/skillrunner/uploadMapping.ts | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowEditorHost.ts](../modules/workflow/ui/workflowEditorHost.ts.md) | src/modules/workflow/ui/workflowEditorHost.ts | 工作流编辑器宿主：在 Zotero 窗口中打开内嵌 HTML 编辑器面板，承载工作流节点编辑，并把 legacy 文献产物负载通过迁移转换器升级为现行 schema。 |
| [workflowExecute.ts](../modules/workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowHostClient.ts](../modules/synthesisClient/workflowHostClient.ts.md) | src/modules/synthesisClient/workflowHostClient.ts | Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。 |
| [workflowHostContract.ts](workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [workflowInputPlanning.ts](workflowInputPlanning.ts.md) | src/workflows/workflowInputPlanning.ts | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [workflowLoggingOwner.ts](workflowLoggingOwner.ts.md) | src/workflows/workflowLoggingOwner.ts | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [workflowMenu.ts](../modules/workflow/ui/workflowMenu.ts.md) | src/modules/workflow/ui/workflowMenu.ts | 工作流菜单与弹出面板构建：按显示顺序、可见性与选择上下文组装工作流条目，提供统一触发入口、安装官方工作流包项以及窗口级菜单刷新。 |
| [workflowNoteImagePreparation.ts](workflowNoteImagePreparation.ts.md) | src/workflows/workflowNoteImagePreparation.ts | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [workflowParameterOptions.ts](../modules/workflow/settings/workflowParameterOptions.ts.md) | src/modules/workflow/settings/workflowParameterOptions.ts | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [workflowRequestKind.ts](../modules/workflow/catalog/workflowRequestKind.ts.md) | src/modules/workflow/catalog/workflowRequestKind.ts | 请求类型解析：按后端类型与显式声明判定一次工作流请求的 kind（ACP prompt、ACP skill run、SkillRunner sequence 或透传），是队列分派的输入。 |
| [workflowRuntime.ts](../modules/workflow/catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialog.ts](../modules/workflow/settings/workflowSettingsDialog.ts.md) | src/modules/workflow/settings/workflowSettingsDialog.ts | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [workflowSettingsDialogModel.ts](../modules/workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [workflowSettingsDomain.ts](../modules/workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [workflowSettingsNormalizer.ts](../modules/workflow/settings/workflowSettingsNormalizer.ts.md) | src/modules/workflow/settings/workflowSettingsNormalizer.ts | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [workflowSettingsWebDialog.ts](../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |
| [workflowVisibility.ts](../modules/workflow/catalog/workflowVisibility.ts.md) | src/modules/workflow/catalog/workflowVisibility.ts | 工作流可见性判定：依据 manifest 的 debug_only 标记结合全局 debug 开关决定某个已加载工作流是否应在菜单中展示。 |
| [zoteroHostAccessOptions.ts](zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](../modules/zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |
| [zoteroHostMutationSchemas.ts](../schemas/zoteroHostMutationSchemas.ts.md) | src/schemas/zoteroHostMutationSchemas.ts | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |
| [zoteroHostNativeMutations.ts](../modules/zoteroHost/zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [zoteroHostTrash.ts](../modules/zoteroHost/zoteroHostTrash.ts.md) | src/modules/zoteroHost/zoteroHostTrash.ts | 宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。 |
| [zoteroManagedNotes.ts](../modules/zoteroHost/zoteroManagedNotes.ts.md) | src/modules/zoteroHost/zoteroManagedNotes.ts | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [zoteroMcpProtocol.ts](../modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | src/modules/hostBridge/mcp/zoteroMcpProtocol.ts | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [zoteroMcpServer.ts](../modules/hostBridge/mcp/zoteroMcpServer.ts.md) | src/modules/hostBridge/mcp/zoteroMcpServer.ts | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |

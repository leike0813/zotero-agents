
# src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/workflow](../../../../../modules/src/modules/hostBridge/workflow.md)
<!-- node: file:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts -->

Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts](../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts)

## 符号（8）
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:buildApplyBackInstructions -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:buildHostBridgeWorkflowAgentRunHandoff -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:buildOutputContract -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:buildProtocolGuide -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:collectSelectedFilesFromContext -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:isUnsafePackageEntry -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:prepareHostBridgeWorkflowAgentRunHandoff -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:projectAgentRunRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildApplyBackInstructions | 函数 | 518–549 | 中等 | host-bridge、agent-run、documentation、protocol | 1 | 生成 apply-back 指令，说明 Agent 如何回传结果包以及被拒绝时的处理路径。 |
| [buildHostBridgeWorkflowAgentRunHandoff](../../../../../symbols/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts/buildHostBridgeWorkflowAgentRunHandoff.md) | 函数 | 551–731 | 复杂 | host-bridge、agent-run、handoff、core | 1 | 组装完整 handoff 载荷：请求投影、选区文件、目录条目、协议指引、输出契约与 apply-back 指令一次性成型。 |
| buildOutputContract | 函数 | 505–516 | 简单 | host-bridge、agent-run、manifest、contracts | 0 | 按 manifest 声明的输出槽位生成结果包契约，约束 Agent 产出文件的结构与命名。 |
| buildProtocolGuide | 函数 | 388–473 | 中等 | host-bridge、agent-run、documentation、protocol、core | 1 | 生成 Agent 侧协议指引文本，说明交接结构、字段语义与必须遵守的调用顺序。 |
| collectSelectedFilesFromContext | 函数 | 177–216 | 中等 | host-bridge、agent-run、selection、validation | 1 | 从锁定的选区上下文中收集可传给 Agent 的文件条目，校验 portable ref 完整性。 |
| isUnsafePackageEntry | 函数 | 141–156 | 简单 | security、validation、host-bridge、packaging | 0 | 判定工作流包条目是否包含路径穿越等不安全成分，拒绝则整体拒绝该次运行。 |
| prepareHostBridgeWorkflowAgentRunHandoff | 函数 | 314–342 | 中等 | host-bridge、agent-run、preparation、core | 0 | handoff 准备阶段：锁定选区、注册文件句柄并把 request 落成可续接的 run 记录。 |
| projectAgentRunRequest | 函数 | 229–312 | 中等 | host-bridge、agent-run、projection、security | 1 | 把工作流请求投影为 Agent 侧请求视图，剔除宿主内部标识并保留 portable ref。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeFileRegistry.ts](../server/hostBridgeFileRegistry.ts.md) | src/modules/hostBridge/server/hostBridgeFileRegistry.ts | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [hostBridgeWorkflowAgentRunStore.ts](hostBridgeWorkflowAgentRunStore.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [localization.ts](../../../workflows/localization.ts.md) | src/workflows/localization.ts | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [sha256.ts](../../../utils/sha256.ts.md) | src/utils/sha256.ts | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [uploadMapping.ts](../../../providers/skillrunner/uploadMapping.ts.md) | src/providers/skillrunner/uploadMapping.ts | SkillRunner 上传路径映射：把工作流声明的输入物化为受控的上传相对路径，并生成 Host Bridge 选择包路径。 |
| [zipStore.ts](../../zipStore.ts.md) | src/modules/zipStore.ts | 纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildHostBridgeWorkflowAgentRunHandoff](../../../../../symbols/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts/buildHostBridgeWorkflowAgentRunHandoff.md) | 函数 | 551–731 | 组装完整 handoff 载荷：请求投影、选区文件、目录条目、协议指引、输出契约与 apply-back 指令一次性成型。 |
| prepareHostBridgeWorkflowAgentRunHandoff | 函数 | 314–342 | handoff 准备阶段：锁定选区、注册文件句柄并把 request 落成可续接的 run 记录。 |

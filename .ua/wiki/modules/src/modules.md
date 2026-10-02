
# src/modules
> 目录聚合页：44 个文件、356 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/acpProtocol.ts](../../files/src/modules/acpProtocol.ts.md) | 文件 | 4 | ACP 协议基础定义：协议版本号、Agent/Client 方法名常量与 JSON-RPC 消息判别函数，并提供标准 RequestError。 |
| [src/modules/acpTypes.ts](../../files/src/modules/acpTypes.ts.md) | 文件 | 5 | ACP 领域类型定义与快照规整工具：定义会话、状态、transcript 条目与权限请求类型，并提供快照归一化构造函数。 |
| [src/modules/backgroundRefreshGovernance.ts](../../files/src/modules/backgroundRefreshGovernance.ts.md) | 文件 | 3 | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [src/modules/bufferedWriteCoordinator.ts](../../files/src/modules/bufferedWriteCoordinator.ts.md) | 文件 | 8 | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [src/modules/dashboardActiveTasks.ts](../../files/src/modules/dashboardActiveTasks.ts.md) | 文件 | 6 | Dashboard 活跃任务投影：按可见 scope 过滤 ACP skill run 与工作流任务，产出需要人工关注的任务计数。 |
| [src/modules/dashboardHost.ts](../../files/src/modules/dashboardHost.ts.md) | 文件 | 3 | 任务 Dashboard 的宿主装配层：既支持在独立 Zotero 窗口中以 DialogHelper 打开，也支持挂载到外部传入的 embeddedRoot 容器，并把外部的选择动作转接给 Dashboard 运行时。 |
| [src/modules/dashboardToolbarButton.ts](../../files/src/modules/dashboardToolbarButton.ts.md) | 文件 | 8 | Zotero 主窗口工具栏按钮的注入与维护模块，负责为 Dashboard、通用工作流和 SkillRunner 各自创建 XUL browser 按钮，并同步图标与待处理计数徽标。 |
| [src/modules/debugMode.ts](../../files/src/modules/debugMode.ts.md) | 文件 | 6 | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [src/modules/diagnosticVerbosity.ts](../../files/src/modules/diagnosticVerbosity.ts.md) | 文件 | 3 | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [src/modules/guardedSqlite.ts](../../files/src/modules/guardedSqlite.ts.md) | 文件 | 3 | 受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。 |
| [src/modules/helpCenterTab.ts](../../files/src/modules/helpCenterTab.ts.md) | 文件 | 7 | 帮助中心标签页模块：在 Zotero 中创建内嵌 browser 标签页加载帮助页面，并通过向 frame 注入的 bridge 对象把在线文档打开、URL 跳转等能力暴露给页面。 |
| [src/modules/hostBridgeCapabilityRegistry.ts](../../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | 文件 | 18 | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [src/modules/libraryArtifactsColumn.ts](../../files/src/modules/libraryArtifactsColumn.ts.md) | 文件 | 9 | 为 Zotero 文献库列表注册「文献产物」与「文献评分」两个虚拟列，负责单元格数据供给、渲染、缓存与防抖刷新。 |
| [src/modules/literatureArtifactMigration.ts](../../files/src/modules/literatureArtifactMigration.ts.md) | 文件 | 8 | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [src/modules/markdownAttachmentOpenProbe.ts](../../files/src/modules/markdownAttachmentOpenProbe.ts.md) | 文件 | 4 | Markdown 附件打开探针：拦截 Zotero 附件的双击/打开动作，识别出 Markdown 附件后转交给内置阅读器标签页。 |
| [src/modules/markdownAttachmentTab.ts](../../files/src/modules/markdownAttachmentTab.ts.md) | 文件 | 10 | Markdown 附件阅读器标签页的完整实现：在 Zotero 标签中创建内嵌 browser 加载共享阅读器页面，把文档内容通过 bridge 注入，并在页面脚本加载失败时回退到内联独立 HTML。 |
| [src/modules/notificationHub.ts](../../files/src/modules/notificationHub.ts.md) | 文件 | 4 | 插件内通知中心：接收各模块投递的通知事件，按展示分组与去重键抑制重复提示，并提供有界事件列表与按客户端确认。 |
| [src/modules/packagedAssetResolver.ts](../../files/src/modules/packagedAssetResolver.ts.md) | 文件 | 4 | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [src/modules/pluginStateStore.ts](../../files/src/modules/pluginStateStore.ts.md) | 文件 | 5 | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [src/modules/preferenceScript.ts](../../files/src/modules/preferenceScript.ts.md) | 文件 | 3 | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |
| [src/modules/runtimeFileRangeProtocol.ts](../../files/src/modules/runtimeFileRangeProtocol.ts.md) | 文件 | 2 | 定义跨运行时读取文件分片的请求/响应协议类型，供 runtimeFileRangeReader 与其 worker 侧实现共享。 |
| [src/modules/runtimeFileRangeReader.ts](../../files/src/modules/runtimeFileRangeReader.ts.md) | 文件 | 5 | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [src/modules/runtimeFileTransfer.ts](../../files/src/modules/runtimeFileTransfer.ts.md) | 文件 | 9 | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [src/modules/runtimeLogManager.ts](../../files/src/modules/runtimeLogManager.ts.md) | 文件 | 9 | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [src/modules/runtimePersistence.ts](../../files/src/modules/runtimePersistence.ts.md) | 文件 | 11 | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [src/modules/runtimePersistenceGovernance.ts](../../files/src/modules/runtimePersistenceGovernance.ts.md) | 文件 | 5 | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [src/modules/runtimeTreeManifest.ts](../../files/src/modules/runtimeTreeManifest.ts.md) | 文件 | 2 | 目录清单工具：把持久化目录树序列化为 manifest 结构并比较差异，用于检测文件是否需要重新物化或清理。 |
| [src/modules/selectionContext.ts](../../files/src/modules/selectionContext.ts.md) | 文件 | 6 | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [src/modules/sidebarBrowserHost.ts](../../files/src/modules/sidebarBrowserHost.ts.md) | 文件 | 4 | Zotero 侧边栏内嵌页面的通用宿主构件：创建 browser/iframe 承载内容、提供外层容器并统一设置 flex 与尺寸样式，屏蔽 XUL 与 HTML 两种元素实现的差异。 |
| [src/modules/skillRunnerSsoFacts.ts](../../files/src/modules/skillRunnerSsoFacts.ts.md) | 文件 | 0 | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [src/modules/systemE2ETestRun.ts](../../files/src/modules/systemE2ETestRun.ts.md) | 文件 | 0 | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |
| [src/modules/taskDashboardHistory.ts](../../files/src/modules/taskDashboardHistory.ts.md) | 文件 | 13 | Dashboard 任务历史归档层：把 JobQueue 的 Job 记录与 SkillRunner run 投影归档为可持久化的历史记录，提供按保留策略清理、按 requestId 更新状态、批量删除与状态分布汇总。 |
| [src/modules/taskDashboardSnapshot.ts](../../files/src/modules/taskDashboardSnapshot.ts.md) | 文件 | 6 | Dashboard 快照的数据装配层：归一化后端实例、合并活动任务与历史任务行、把工作流提交队列中的排队单元投影为 Dashboard 行，并生成后端标签页键。 |
| [src/modules/taskRetentionPolicy.ts](../../files/src/modules/taskRetentionPolicy.ts.md) | 文件 | 1 | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |
| [src/modules/taskRuntime.ts](../../files/src/modules/taskRuntime.ts.md) | 文件 | 21 | 工作流任务运行时的中心模块：把 JobQueue 的 Job 记录与 SkillRunner run store 投影为统一的 WorkflowTaskRecord，并负责任务增删改查、状态推进、启动时投影对账与变更订阅。 |
| [src/modules/testLeakProbeTempArtifacts.ts](../../files/src/modules/testLeakProbeTempArtifacts.ts.md) | 文件 | 4 | 测试泄漏探针的临时工件收集器：记录测试运行期产生的临时路径，在断言阶段统一校验并清理，用于捕捉忘记删除的运行时残留。 |
| [src/modules/testPerformanceProbeBridge.ts](../../files/src/modules/testPerformanceProbeBridge.ts.md) | 文件 | 3 | 测试性能探针桥：把性能 span 记录钩子挂到 globalThis 上，供工作流运行时与 Host API 在测试环境中零成本埋点，不启用时所有调用直接短路返回。 |
| [src/modules/testRuntimeCleanup.ts](../../files/src/modules/testRuntimeCleanup.ts.md) | 文件 | 2 | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [src/modules/windowsCommandResolution.ts](../../files/src/modules/windowsCommandResolution.ts.md) | 文件 | 10 | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |
| [src/modules/workspaceTab.ts](../../files/src/modules/workspaceTab.ts.md) | 文件 | 14 | 工作台 Tab 的宿主控制器：创建并管理嵌入页面的 iframe、向页面安装/清理 bridge、投递快照与用户操作、调度 Dashboard 与 Synthesis 运行时挂载，以及侧边栏与工具栏联动的整体编排。 |
| [src/modules/workspaceToolbarTaskPopover.ts](../../files/src/modules/workspaceToolbarTaskPopover.ts.md) | 文件 | 11 | Zotero 主窗口工具栏的任务气泡：用 XUL 元素实现悬停/点击展开的任务列表弹层，按状态渲染 LED 色调、显示可见任务行并支持直接打开对应工作台。 |
| [src/modules/zipStore.ts](../../files/src/modules/zipStore.ts.md) | 文件 | 3 | 纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。 |
| [src/modules/zoteroHostCapabilityBroker.ts](../../files/src/modules/zoteroHostCapabilityBroker.ts.md) | 文件 | 73 | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [src/modules/zoteroHostMutationAuthority.ts](../../files/src/modules/zoteroHostMutationAuthority.ts.md) | 文件 | 21 | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 子目录
- [acp/chat](modules/acp/chat.md)、[acp/diagnostics](modules/acp/diagnostics.md)、[acp/skillRun](modules/acp/skillRun.md)、[acp/transport](modules/acp/transport.md)、[assistant/publication](modules/assistant/publication.md)、[assistant/workspace](modules/assistant/workspace.md)、[dashboard](modules/dashboard.md)、[harness](modules/harness.md)、[hostBridge/cli](modules/hostBridge/cli.md)、[hostBridge/mcp](modules/hostBridge/mcp.md)、[hostBridge/permissions](modules/hostBridge/permissions.md)、[hostBridge/server/routes](modules/hostBridge/server/routes.md)、[hostBridge/workflow](modules/hostBridge/workflow.md)、[literatureArtifactMigration](modules/literatureArtifactMigration.md)、[pluginStateStore](modules/pluginStateStore.md)、[preferences](modules/preferences.md)、[skillRunner/connection](modules/skillRunner/connection.md)、[skillRunner/run](modules/skillRunner/run.md)、[skillRunner/runtime](modules/skillRunner/runtime.md)、[skillRunner/surface](modules/skillRunner/surface.md)、[synthesis/debug](modules/synthesis/debug.md)、[synthesis/production](modules/synthesis/production.md)、[synthesis/reverseHost](modules/synthesis/reverseHost.md)、[synthesis/sidecar](modules/synthesis/sidecar.md)、[synthesis/workbench](modules/synthesis/workbench.md)、[synthesisClient](modules/synthesisClient.md)、[workflow/catalog](modules/workflow/catalog.md)、[workflow/settings](modules/workflow/settings.md)、[workflow/ui](modules/workflow/ui.md)、[workflowExecution](modules/workflowExecution.md)、[zoteroHost](modules/zoteroHost.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/utils](utils.md) | 29 |
| [src/modules/zoteroHost](modules/zoteroHost.md) | 12 |
| [src/workflows](workflows.md) | 12 |
| [src/modules/skillRunner/run](modules/skillRunner/run.md) | 10 |
| [.](../index.md) | 9 |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 7 |
| [src/modules/hostBridge/server](modules/hostBridge/server.md) | 6 |
| [src/modules/workflow/catalog](modules/workflow/catalog.md) | 6 |
| [src/modules/pluginStateStore](modules/pluginStateStore.md) | 5 |
| [src/config](config.md) | 4 |
| [src/jobQueue](jobQueue.md) | 4 |
| [src/modules/acp/skillRun](modules/acp/skillRun.md) | 4 |
| [src/backends](backends.md) | 3 |
| [src/modules/assistant/publication](modules/assistant/publication.md) | 3 |
| [src/modules/skillRunner/connection](modules/skillRunner/connection.md) | 3 |
| [src/modules/acp/diagnostics](modules/acp/diagnostics.md) | 2 |
| [src/modules/acp/transport](modules/acp/transport.md) | 2 |
| [src/modules/assistant/workspace](modules/assistant/workspace.md) | 2 |
| [src/modules/synthesisClient](modules/synthesisClient.md) | 2 |
| [src/platform](platform.md) | 2 |


# 插件外壳与核心运行时

Zotero 插件的启动外壳与跨模块运行时基础设施：插件基类与生命周期 hooks、prefs/locale 默认配置、后端注册与任务队列、跨运行时持久化（SQLite 门面、文件传输与配额治理）、运行日志与诊断开关、打包资产解析。
> 本页由知识图谱分层 `layer:plugin-core` 生成，共 65 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [src/modules](../modules/src/modules.md) | 22 |
| [src/utils](../modules/src/utils.md) | 14 |
| [src/platform](../modules/src/platform.md) | 8 |
| [src/backends](../modules/src/backends.md) | 5 |
| [src/modules/pluginStateStore](../modules/src/modules/pluginStateStore.md) | 5 |
| [src](../modules/src.md) | 3 |
| [src/jobQueue](../modules/src/jobQueue.md) | 3 |
| [typings](../modules/typings.md) | 3 |
| [src/config](../modules/src/config.md) | 1 |
| [src/workers](../modules/src/workers.md) | 1 |

## 关键符号

本层中被其他节点引用较多、值得单独成页的符号。

| 符号 | 类型 | 复杂度 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- |
| [sha256Hex](../symbols/globals.md) | 函数 | 简单 | 5 | 计算字节数组的 SHA-256 十六进制摘要，按 WebCrypto → Mozilla 顺序回退。 |
| [isSystemE2ETestRun](../symbols/globals.md) | 函数 | 简单 | 2 | 判断当前 Zotero 进程是否由 System E2E 目录驱动，是则返回 true。 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [src/addon.ts](../files/src/addon.ts.md) | 文件 | — | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [src/backends/displayName.ts](../files/src/backends/displayName.ts.md) | 文件 | — | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [src/backends/identity.ts](../files/src/backends/identity.ts.md) | 文件 | — | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [src/backends/managementAuth.ts](../files/src/backends/managementAuth.ts.md) | 文件 | — | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [src/backends/registry.ts](../files/src/backends/registry.ts.md) | 文件 | — | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [src/backends/types.ts](../files/src/backends/types.ts.md) | 文件 | — | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [src/config/defaults.ts](../files/src/config/defaults.ts.md) | 文件 | — | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [src/hooks.ts](../files/src/hooks.ts.md) | 文件 | — | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [src/index.ts](../files/src/index.ts.md) | 文件 | — | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
| [src/jobQueue/manager.ts](../files/src/jobQueue/manager.ts.md) | 文件 | — | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [src/jobQueue/workflowSubmissionQueue.ts](../files/src/jobQueue/workflowSubmissionQueue.ts.md) | 文件 | — | 工作流提交队列：按后端作用域限制并发槽位，管理提交项的 held/yielded/settled 状态机，并向 UI 暴露队列摘要与导航条目。 |
| [src/jobQueue/workflowSubmissionQueueContracts.ts](../files/src/jobQueue/workflowSubmissionQueueContracts.ts.md) | 文件 | — | 工作流提交队列的类型契约：定义 branded ID、后端作用域、展示身份、槽位状态与让出/恢复原因等纯类型，不含运行时逻辑。 |
| [src/modules/backgroundRefreshGovernance.ts](../files/src/modules/backgroundRefreshGovernance.ts.md) | 文件 | — | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [src/modules/bufferedWriteCoordinator.ts](../files/src/modules/bufferedWriteCoordinator.ts.md) | 文件 | — | 带缓冲的写入协调器：按 key 合并短时间内的重复写入、施加字节与条数上限并支持显式 flush/discard，避免高频 IO 打爆文件系统。 |
| [src/modules/debugMode.ts](../files/src/modules/debugMode.ts.md) | 文件 | — | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [src/modules/diagnosticVerbosity.ts](../files/src/modules/diagnosticVerbosity.ts.md) | 文件 | — | 诊断日志的冗长输出开关，从运行时环境变量或测试 override 读取 verbose 标记，并提供统一的条件 console 输出入口。 |
| [src/modules/guardedSqlite.ts](../files/src/modules/guardedSqlite.ts.md) | 文件 | — | 受保护的 SQLite 连接封装：设置 busy timeout、对 SQLITE_BUSY 做有界重试，并暴露统一的连接获取入口供 pluginStateStore 使用。 |
| [src/modules/notificationHub.ts](../files/src/modules/notificationHub.ts.md) | 文件 | — | 插件内通知中心：接收各模块投递的通知事件，按展示分组与去重键抑制重复提示，并提供有界事件列表与按客户端确认。 |
| [src/modules/packagedAssetResolver.ts](../files/src/modules/packagedAssetResolver.ts.md) | 文件 | — | 打包资产解析器：把插件内相对路径映射为 Zotero 插件目录下的真实文件路径，并校验资产是否存在，是 CLI/sidecar 等二进制定位的统一入口。 |
| [src/modules/pluginStateStore.ts](../files/src/modules/pluginStateStore.ts.md) | 文件 | — | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [src/modules/pluginStateStore/core.ts](../files/src/modules/pluginStateStore/core.ts.md) | 文件 | — | pluginStateStore 的底层核心：SQLite 打开、连接复用、事务辅助与通用类型定义。 |
| [src/modules/pluginStateStore/literatureMigrationTables.ts](../files/src/modules/pluginStateStore/literatureMigrationTables.ts.md) | 文件 | — | 文献库迁移相关数据表的建表语句、schema 版本与读写封装，为 Dashboard 本地迁移服务提供持久化支撑。 |
| [src/modules/pluginStateStore/mutationAuthorityTable.ts](../files/src/modules/pluginStateStore/mutationAuthorityTable.ts.md) | 文件 | — | 变更权威表（mutation authority）：持久化 canonical mutation 的 scope/operationId/语义摘要、终态证据与 identity binding，是受审批写入的唯一事实源。 |
| [src/modules/pluginStateStore/runTables.ts](../files/src/modules/pluginStateStore/runTables.ts.md) | 文件 | — | 工作流运行记录表：保存 run 的状态、阶段与诊断信息，并在 debug 模式或性能 profiler 打开时附加审计字段。 |
| [src/modules/pluginStateStore/taskTables.ts](../files/src/modules/pluginStateStore/taskTables.ts.md) | 文件 | — | 任务表层：任务队列、任务状态迁移、附件与产物元数据的持久化读写，是后台任务恢复与保留策略的主要落点。 |
| [src/modules/runtimeFileRangeProtocol.ts](../files/src/modules/runtimeFileRangeProtocol.ts.md) | 文件 | — | 定义跨运行时读取文件分片的请求/响应协议类型，供 runtimeFileRangeReader 与其 worker 侧实现共享。 |
| [src/modules/runtimeFileRangeReader.ts](../files/src/modules/runtimeFileRangeReader.ts.md) | 文件 | — | 在 Zotero 沙箱中按字节区间读取大文件的读取器，配合 runtimeFileRangeProtocol 与 worker 实现分段读取，避免一次性载入造成内存峰值。 |
| [src/modules/runtimeFileTransfer.ts](../files/src/modules/runtimeFileTransfer.ts.md) | 文件 | — | 跨运行时文件传输层：按宿主环境选择 XPC 或 Node 兼容实现分块读取文件、计算 SHA-256 摘要并校验文件在传输期间未被改动。 |
| [src/modules/runtimeLogManager.ts](../files/src/modules/runtimeLogManager.ts.md) | 文件 | — | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [src/modules/runtimePersistence.ts](../files/src/modules/runtimePersistence.ts.md) | 文件 | — | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [src/modules/runtimePersistenceGovernance.ts](../files/src/modules/runtimePersistenceGovernance.ts.md) | 文件 | — | 运行时持久化治理：集中执行配额、保留期限与清理策略，串联 pluginStateStore、任务保留策略与 workflow 产品存储，控制插件落盘数据的增长。 |
| [src/modules/runtimeTreeManifest.ts](../files/src/modules/runtimeTreeManifest.ts.md) | 文件 | — | 目录清单工具：把持久化目录树序列化为 manifest 结构并比较差异，用于检测文件是否需要重新物化或清理。 |
| [src/modules/systemE2ETestRun.ts](../files/src/modules/systemE2ETestRun.ts.md) | 文件 | — | System E2E 测试运行的检测入口：从 Zotero 首选项读取事件上报 URL 与 launch fault 开关，作为 sidecar 走测试私有检查点的判据。 |
| [src/modules/taskRetentionPolicy.ts](../files/src/modules/taskRetentionPolicy.ts.md) | 文件 | — | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |
| [src/modules/testLeakProbeTempArtifacts.ts](../files/src/modules/testLeakProbeTempArtifacts.ts.md) | 文件 | — | 测试泄漏探针的临时工件收集器：记录测试运行期产生的临时路径，在断言阶段统一校验并清理，用于捕捉忘记删除的运行时残留。 |
| [src/modules/testPerformanceProbeBridge.ts](../files/src/modules/testPerformanceProbeBridge.ts.md) | 文件 | — | 测试性能探针桥：把性能 span 记录钩子挂到 globalThis 上，供工作流运行时与 Host API 在测试环境中零成本埋点，不启用时所有调用直接短路返回。 |
| [src/modules/testRuntimeCleanup.ts](../files/src/modules/testRuntimeCleanup.ts.md) | 文件 | — | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |
| [src/modules/windowsCommandResolution.ts](../files/src/modules/windowsCommandResolution.ts.md) | 文件 | — | Windows 上外部命令解析模块：定位 npx/node/python 等可执行文件，识别 shim（.cmd/.ps1）与 App Execution Alias，并为 subprocess 调用生成可运行的命令行。 |
| [src/modules/zipStore.ts](../files/src/modules/zipStore.ts.md) | 文件 | — | 纯前端 ZIP 写入器：用 TextEncoder、CRC32 表与 PNG 风格的分块编码把一组文本/字节条目打包成 ZIP 字节流，供工作流归档在无 Node 环境下使用。 |
| [src/platform/command.ts](../files/src/platform/command.ts.md) | 文件 | — | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [src/platform/env.ts](../files/src/platform/env.ts.md) | 文件 | — | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [src/platform/filePicker.ts](../files/src/platform/filePicker.ts.md) | 文件 | — | 跨运行时文件选择器：优先使用宿主提供的原生多选文件对话框，在不可用时回退到 toolkit 的 FilePicker，并负责挑选可用的 parent window。 |
| [src/platform/hash.ts](../files/src/platform/hash.ts.md) | 文件 | — | 平台无关的 SHA-256 摘要工具：优先使用 WebCrypto subtle.digest，回退到 Mozilla 的 nsICryptoHash，保证在 Zotero 沙箱与工具链环境中都能得到一致摘要。 |
| [src/platform/path.ts](../files/src/platform/path.ts.md) | 文件 | — | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [src/platform/processControl.ts](../files/src/platform/processControl.ts.md) | 文件 | — | 子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。 |
| [src/platform/runtimePlatform.ts](../files/src/platform/runtimePlatform.ts.md) | 文件 | — | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |
| [src/platform/subprocess.ts](../files/src/platform/subprocess.ts.md) | 文件 | — | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [src/utils/docsUrl.ts](../files/src/utils/docsUrl.ts.md) | 文件 | — | 帮助中心文档链接构造：按用户 locale 选择 GitHub Pages 或本地站点基址，处理 zh-CN 前缀拼接与 debug 模式下的本地回退。 |
| [src/utils/env.ts](../files/src/utils/env.ts.md) | 文件 | — | 读取构建期注入的 __env__，返回 development / production 运行环境标识。 |
| [src/utils/fileSystem.ts](../files/src/utils/fileSystem.ts.md) | 文件 | — | 在系统文件管理器中打开指定目录，优先使用 nsIFile 的 launch，退化到 reveal，并在路径为空或不存在时抛出明确错误。 |
| [src/utils/locale.ts](../files/src/utils/locale.ts.md) | 文件 | — | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [src/utils/localizationGovernance.ts](../files/src/utils/localizationGovernance.ts.md) | 文件 | — | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [src/utils/path.ts](../files/src/utils/path.ts.md) | 文件 | — | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [src/utils/prefs.ts](../files/src/utils/prefs.ts.md) | 文件 | — | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [src/utils/runtimeBridge.ts](../files/src/utils/runtimeBridge.ts.md) | 文件 | — | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [src/utils/runtimeCompatibility.ts](../files/src/utils/runtimeCompatibility.ts.md) | 文件 | — | Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。 |
| [src/utils/sha256.ts](../files/src/utils/sha256.ts.md) | 文件 | — | Zotero 沙箱内的 SHA-256 实现：优先使用 Mozilla 的 nsICryptoHash 契约，并提供流式累加器与带算法前缀的十六进制摘要。 |
| [src/utils/timingSafeEqual.ts](../files/src/utils/timingSafeEqual.ts.md) | 文件 | — | 字符串定长时间安全比较：长度不等直接返回 false，等长时以累积异或差值避免逐字符短路。 |
| [src/utils/wait.ts](../files/src/utils/wait.ts.md) | 文件 | — | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [src/utils/window.ts](../files/src/utils/window.ts.md) | 文件 | — | 判断窗口对象是否仍然存活（未 closed 且不是 dead wrapper），用于避免重复打开同一窗口。 |
| [src/utils/ztoolkit.ts](../files/src/utils/ztoolkit.ts.md) | 文件 | — | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |
| [src/workers/runtimeFileRangeWorker.ts](../files/src/workers/runtimeFileRangeWorker.ts.md) | 文件 | — | Zotero worker 侧实现：按 runtimeFileRangeProtocol 在 worker 中执行大文件的按行区间读取，避免主线程阻塞。 |
| [typings/global.d.ts](../files/typings/global.d.ts.md) | 文件 | — | 插件运行时的全局类型声明，声明 Zotero 注入的全局对象与 ZoteroHost 扩展点。 |
| [typings/i10n.d.ts](../files/typings/i10n.d.ts.md) | 文件 | — | Zotero Fluent 本地化 API 的完整类型声明，覆盖 L10n 消息解析、格式化与 DOM 绑定。 |
| [typings/prefs.d.ts](../files/typings/prefs.d.ts.md) | 文件 | — | 插件首选项（prefs）的类型声明，定义 Zotero.Prefs 扩展树与各配置项的取值形状。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Agent 协议与后端运行时](agent-runtime.md) | 29 | imports×29 |
| [工作流引擎与执行](workflow-engine.md) | 25 | imports×25 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 13 | imports×12、configures×1 |
| [页面与交互界面](ui-surface.md) | 13 | imports×10、configures×3 |
| [构建、发布与工程配置](build-tooling.md) | 8 | imports×8 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 7 | imports×7 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Agent 协议与后端运行时](agent-runtime.md) | 288 | imports×288 |
| [工作流引擎与执行](workflow-engine.md) | 157 | imports×157 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 93 | imports×93 |
| [页面与交互界面](ui-surface.md) | 87 | imports×87 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 53 | imports×53 |
| [构建、发布与工程配置](build-tooling.md) | 14 | imports×10、configures×4 |

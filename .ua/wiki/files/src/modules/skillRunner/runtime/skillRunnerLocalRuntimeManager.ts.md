
# src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts -->

插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。
源码：[src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts)

## 符号（19）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:acquireLeaseIfNeeded -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:buildManagedInstallLayoutDetails -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:buildManualDeployCommands -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:deleteManagedLocalRuntimePaths -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:deployAndConfigureLocalSkillRunner -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:ensureManagedLocalRuntimeForBackend -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:getManagedLocalRuntimeStateSnapshot -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:heartbeatLease -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:planLocalRuntimeOneclick -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:pollStatusUntilRunning -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:previewLocalRuntimeUninstall -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:probeReleaseAssets -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:releaseManagedLocalRuntimeLeaseOnShutdown -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:removePathRecursive -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:runLocalDoctor -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:runManagedRuntimeAutoEnsureTick -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:startLocalRuntime -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:stopLocalRuntime -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts:uninstallLocalRuntime -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [acquireLeaseIfNeeded](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/acquireLeaseIfNeeded.md) | 函数 | 2266–2390 | 复杂 | concurrency、lease、lifecycle | 1 | 在需要变更本地运行时前获取租约，避免多窗口并发部署互相破坏安装目录。 |
| buildManagedInstallLayoutDetails | 函数 | 616–663 | 中等 | deployment、path、skillrunner | 1 | 计算托管安装的目录布局（根目录、二进制、profile、skills 等）并返回各路径明细。 |
| buildManualDeployCommands | 函数 | 3709–3824 | 中等 | deployment、fallback、diagnostics | 0 | 生成手动部署的等价命令清单，供自动部署失败时引导用户自行执行。 |
| deleteManagedLocalRuntimePaths | 函数 | 4194–4284 | 中等 | file-system、cleanup、error-handling | 1 | 按预览清单递归删除托管目录，对被占用文件做重试并汇总失败项。 |
| [deployAndConfigureLocalSkillRunner](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/deployAndConfigureLocalSkillRunner.md) | 函数 | 3126–3700 | 复杂 | deployment、entry-point、download、skillrunner | 1 | 一键部署的主流程：解析版本、下载发行资产、展开安装目录、写入配置与后端注册信息，并按阶段写入部署调试日志。 |
| [ensureManagedLocalRuntimeForBackend](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/ensureManagedLocalRuntimeForBackend.md) | 函数 | 4765–5011 | 复杂 | service、lifecycle、auto-heal、skillrunner | 1 | 确保某后端对应的托管运行时处于可用状态：必要时自动部署或重启，并在成功后刷新模型缓存与健康状态。 |
| getManagedLocalRuntimeStateSnapshot | 函数 | 3858–3891 | 中等 | snapshot、state、view-model | 0 | 导出托管本地运行时的只读状态快照，供偏好面板与诊断界面渲染。 |
| heartbeatLease | 函数 | 2392–2497 | 复杂 | lease、heartbeat、concurrency | 0 | 周期性续租并探测租约持有者存活状态，失效时主动释放以免阻塞其他窗口。 |
| planLocalRuntimeOneclick | 函数 | 2994–3096 | 中等 | deployment、planning、skillrunner | 0 | 规划一键部署方案：确定目标版本、安装布局与所需步骤，把实际执行交给部署主流程。 |
| [pollStatusUntilRunning](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/pollStatusUntilRunning.md) | 函数 | 2825–2878 | 中等 | polling、lifecycle、resilience | 2 | 轮询运行时状态直到进入 running，超时或失败时返回带原因的结果。 |
| previewLocalRuntimeUninstall | 函数 | 4141–4192 | 中等 | uninstall、preview、safety | 0 | 预览卸载将删除的路径与保留项，在用户确认前给出明确的影响范围。 |
| probeReleaseAssets | 函数 | 1316–1369 | 中等 | deployment、validation、platform | 1 | 探测目标版本的发行资产是否存在且与当前平台架构匹配，缺失时给出明确原因。 |
| releaseManagedLocalRuntimeLeaseOnShutdown | 函数 | 5013–5048 | 中等 | lease、shutdown、lifecycle | 0 | 在插件关闭时释放本地运行时租约并停止相关循环，让其它窗口可以接管。 |
| removePathRecursive | 函数 | 1064–1148 | 中等 | file-system、platform、compatibility | 1 | 递归删除目录，Windows 下对只读或占用文件回退到 shell 删除以保证清理彻底。 |
| runLocalDoctor | 函数 | 4748–4763 | 简单 | diagnostics、health-check、skillrunner | 0 | 运行本地运行时自检，汇总安装、进程、端口与配置层面的问题供 UI 展示。 |
| runManagedRuntimeAutoEnsureTick | 函数 | 2893–2933 | 中等 | scheduler、auto-heal、lifecycle | 0 | 自动保活循环的单次 tick：检查已注册后端对应运行时是否存活，必要时触发重新部署或拉起。 |
| startLocalRuntime | 函数 | 4715–4746 | 简单 | lifecycle、process-management、entry-point | 0 | 启动本地运行时进程并进入轮询等待就绪。 |
| stopLocalRuntime | 函数 | 4313–4398 | 中等 | lifecycle、process-management、state | 0 | 停止本地运行时进程并把托管状态回写为已停止。 |
| uninstallLocalRuntime | 函数 | 4400–4713 | 复杂 | uninstall、cleanup、lifecycle、file-system | 0 | 卸载本地运行时：先停止进程再按预览清单删除托管目录，同时清理后端注册与持久化状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backgroundRefreshGovernance.ts](../../backgroundRefreshGovernance.ts.md) | src/modules/backgroundRefreshGovernance.ts | 后台刷新治理：限制并发定时器数量并记录读放大诊断，防止低价值轮询在插件内失控。 |
| [command.ts](../../../platform/command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [feedbackSeam.ts](../../workflowExecution/feedbackSeam.ts.md) | src/modules/workflowExecution/feedbackSeam.ts | 工作流执行反馈 seam：把工作流开始、等待用户、任务完成等执行结果转成 toast/进度窗口/通知中心事件，并管理 toast 数量上限、图标、emoji 与重复抑制。 |
| [identity.ts](../../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [localizationGovernance.ts](../../../utils/localizationGovernance.ts.md) | src/utils/localizationGovernance.ts | 本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。 |
| [modelCache.ts](../../../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [path.ts](../../../platform/path.ts.md) | src/platform/path.ts | 平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [prefs.ts](../../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [registry.ts](../../../backends/registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [runtimeLogManager.ts](../../runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerBackendHealthRegistry.ts](../connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerCtlBridge.ts](skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalDeployDebugStore.ts](skillRunnerLocalDeployDebugStore.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [skillRunnerReleaseInstaller.ts](skillRunnerReleaseInstaller.ts.md) | src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts | SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。 |
| [skillRunnerRuntimeFeed.ts](skillRunnerRuntimeFeed.ts.md) | src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts | 本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。 |
| [subprocess.ts](../../../platform/subprocess.ts.md) | src/platform/subprocess.ts | 底层 subprocess 适配：直接对接宿主可用的进程 API（不依赖 Node 专有能力），提供 spawn、管道输出与退出等待的最小可移植实现。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [provider.ts](../../../providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [skillRunnerAsyncLifecycle.ts](skillRunnerAsyncLifecycle.ts.md) | src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [skillRunnerLocalRuntimePreferences.ts](../../preferences/skillRunnerLocalRuntimePreferences.ts.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts | SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。 |
| [testRuntimeCleanup.ts](../../testRuntimeCleanup.ts.md) | src/modules/testRuntimeCleanup.ts | Zotero 运行时测试的统一清理入口：串联重置/停止二十余个后台运行时所有者（SkillRunner 协调器、sidecar supervisor、工作流运行时、通知、队列等），避免测试间状态串扰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildManualDeployCommands | 函数 | 3709–3824 | 生成手动部署的等价命令清单，供自动部署失败时引导用户自行执行。 |
| [deployAndConfigureLocalSkillRunner](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/deployAndConfigureLocalSkillRunner.md) | 函数 | 3126–3700 | 一键部署的主流程：解析版本、下载发行资产、展开安装目录、写入配置与后端注册信息，并按阶段写入部署调试日志。 |
| [ensureManagedLocalRuntimeForBackend](../../../../../symbols/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts/ensureManagedLocalRuntimeForBackend.md) | 函数 | 4765–5011 | 确保某后端对应的托管运行时处于可用状态：必要时自动部署或重启，并在成功后刷新模型缓存与健康状态。 |
| getManagedLocalRuntimeStateSnapshot | 函数 | 3858–3891 | 导出托管本地运行时的只读状态快照，供偏好面板与诊断界面渲染。 |
| planLocalRuntimeOneclick | 函数 | 2994–3096 | 规划一键部署方案：确定目标版本、安装布局与所需步骤，把实际执行交给部署主流程。 |
| previewLocalRuntimeUninstall | 函数 | 4141–4192 | 预览卸载将删除的路径与保留项，在用户确认前给出明确的影响范围。 |
| releaseManagedLocalRuntimeLeaseOnShutdown | 函数 | 5013–5048 | 在插件关闭时释放本地运行时租约并停止相关循环，让其它窗口可以接管。 |
| runLocalDoctor | 函数 | 4748–4763 | 运行本地运行时自检，汇总安装、进程、端口与配置层面的问题供 UI 展示。 |
| startLocalRuntime | 函数 | 4715–4746 | 启动本地运行时进程并进入轮询等待就绪。 |
| stopLocalRuntime | 函数 | 4313–4398 | 停止本地运行时进程并把托管状态回写为已停止。 |
| uninstallLocalRuntime | 函数 | 4400–4713 | 卸载本地运行时：先停止进程再按预览清单删除托管目录，同时清理后端注册与持久化状态。 |


# src/utils/runtimeCompatibility.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/runtimeCompatibility.ts -->

Zotero 运行时兼容工具：提供延时与事件循环让出，以及按 specifier 探测 Gecko 模块可用性的能力探测，用于在 JS 沙箱中按宿主版本选择导入方式。

规模：60 行
源码：[src/utils/runtimeCompatibility.ts](../../../../../src/utils/runtimeCompatibility.ts)

## 符号（3）
<!-- node: function:src/utils/runtimeCompatibility.ts:delay -->
<!-- node: function:src/utils/runtimeCompatibility.ts:probeMozillaRuntimeModules -->
<!-- node: function:src/utils/runtimeCompatibility.ts:yieldToEventLoop -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| delay | 函数 | 15–21 | 简单 | utility、async、timing | 1 | 以毫秒为单位延时，非正数直接返回。 |
| probeMozillaRuntimeModules | 函数 | 27–60 | 简单 | runtime、probe、compatibility、exported | 0 | 按 specifier 列表逐个尝试导入 Gecko 模块并返回成功/失败结果，用于按宿主能力分支降级。 |
| yieldToEventLoop | 函数 | 23–25 | 简单 | utility、async、event-loop | 1 | 让出一次事件循环，供分页遍历等重循环分片执行。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [client.ts](../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [libraryAdapter.ts](../modules/synthesis/libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [libraryArtifactReadiness.ts](../modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [provider.ts](../providers/generic-http/provider.ts.md) | src/providers/generic-http/provider.ts | 通用 HTTP Provider：按声明式请求对任意 REST 后端发起调用，支持模板插值、JSON path 提取、多步骤编排、上传与轮询。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [synthesisSidecarRuntimeSupervisor.ts](../modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts | sidecar 运行时 Supervisor：本文件是 sidecar 进程生命周期的唯一 owner，负责安装校验、拉起/停止子进程、读取 discovery 与 launch config、解析原生诊断事件，并对外发布快照与工作台 sidecar 状态。 |
| [synthesisWorkbenchTab.ts](../modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroNotePayloadResolver.ts](../modules/zoteroHost/zoteroNotePayloadResolver.ts.md) | src/modules/zoteroHost/zoteroNotePayloadResolver.ts | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| delay | 函数 | 15–21 | 以毫秒为单位延时，非正数直接返回。 |
| probeMozillaRuntimeModules | 函数 | 27–60 | 按 specifier 列表逐个尝试导入 Gecko 模块并返回成功/失败结果，用于按宿主能力分支降级。 |
| yieldToEventLoop | 函数 | 23–25 | 让出一次事件循环，供分页遍历等重循环分片执行。 |

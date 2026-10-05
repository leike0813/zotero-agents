
# 导览

14 步，按依赖顺序组织。每步给出要读的文件，以及这一步体现出的语言/框架要点。

## 1. 插件入口与外壳

从 src/index.ts 看插件如何启动：创建 Addon 单例、注入打包资源路径并把 Zotero 全局暴露给插件作用域。Addon 基类持有 env/ztoolkit/locale/prefs 与对外 api 容器，hooks.ts 实现 onStartup、onMainWindowLoad、onShutdown 等真实生命周期，这里决定了后面所有模块从哪里被拉起。

### 要点

defineGlobal / hooks 注册是 zotero-plugin-toolkit 插件模板的标准入口形态：TypeScript 只负责把宿主能力挂到全局，业务逻辑全部下沉到 modules/ 下的普通模块，从而保持可测试。

### 相关节点
- [index.ts](files/src/index.ts.md)
- [addon.ts](files/src/addon.ts.md)
- [hooks.ts](files/src/hooks.ts.md)
- [README.md](files/README.md.md)

## 2. 跨运行时基础设施

这一步解释为什么这个插件能在 Zotero 7/9/10 三个宿主上同时工作：runtimePersistence.ts 是跨运行时文件系统 adapter 的唯一事实源，utils/path.ts 与 platform 层负责路径与子进程适配，runtimeBridge.ts 容忍不同 Zotero 版本暴露全局对象的方式差异，runtimeLogManager.ts 则统一日志与诊断包。改动这些高 fan-in 文件（import fan-in 96/71）几乎等于改动全项目。

### 要点

Zotero 插件运行在 Gecko 沙箱里，没有 Node 的 fs/child_process，因此 IOUtils、OS.File、Components 流与 platform/subprocess 适配是手写的最小可移植层，而不是 npm 包。

### 相关节点
- [runtimePersistence.ts](files/src/modules/runtimePersistence.ts.md)
- [path.ts](files/src/utils/path.ts.md)
- [runtimeBridge.ts](files/src/utils/runtimeBridge.ts.md)
- [runtimeLogManager.ts](files/src/modules/runtimeLogManager.ts.md)
- [defaults.ts](files/src/config/defaults.ts.md)

## 3. 后端注册与 Provider 抽象

backends/ 描述"后端是什么"（类型判别联合、实例形状、prefs 中的注册表与配置指纹），providers/ 描述"怎么把一次工作流请求送出去"。四个内置 provider——ACP、SkillRunner、通用 HTTP、透传——共享同一套请求 DTO 与执行结果契约，registry.ts 是工作流与后端之间唯一的调度入口，也因此是新增后端类型的必改点。

### 要点

契约优先：providers/requestContracts.ts 用兼容矩阵在调度前断言 provider 与 backend 的请求形状成立，把失败挡在发出网络请求之前。

### 相关节点
- [types.ts](files/src/backends/types.ts.md)
- [registry.ts](files/src/backends/registry.ts.md)
- [registry.ts](files/src/providers/registry.ts.md)
- [types.ts](files/src/providers/types.ts.md)
- [contracts.ts](files/src/providers/contracts.ts.md)

## 4. ACP 协议与会话运行

ACP 是插件与 AI Agent 的主协议。acpProtocol.ts 定义版本、方法名与 JSON-RPC 消息判别，acpTypes.ts 是会话与 transcript 的领域类型；acpSessionManager.ts 按 backendId+conversationId 管理连接、prompt、取消与权限审批，acpSkillRunStore.ts 则是 Skill Run 状态机与 transcript 写入的唯一入口。理解这条链就理解了"插件怎么驱动 Agent 干活"。

### 相关节点
- [acpProtocol.ts](files/src/modules/acpProtocol.ts.md)
- [acpTypes.ts](files/src/modules/acpTypes.ts.md)
- [acpSessionManager.ts](files/src/modules/acp/chat/acpSessionManager.ts.md)
- [acpSkillRunStore.ts](files/src/modules/acp/skillRun/acpSkillRunStore.ts.md)
- [acpSkillRunActions.ts](files/src/modules/acp/skillRun/acpSkillRunActions.ts.md)

## 5. SkillRunner 兼容运行时

旧版 SkillRunner 后端的兼容层，与 ACP 并行存在。skillRunnerProviderStateMachine.ts 是运行状态的单一事实源，违规状态转移返回结构化 violation 而不是抛异常；skillRunnerSessionSyncManager.ts 先应用状态快照再补历史事件、断线按状态决定是否重连；BackendHealthRegistry 用指数退避决定何时再探不可达后端。读懂这一层能明白"同一套 UI 如何同时支持新旧两种后端"。

### 相关节点
- [skillRunnerProviderStateMachine.ts](files/src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts.md)
- [skillRunnerRunStore.ts](files/src/modules/skillRunner/run/skillRunnerRunStore.ts.md)
- [skillRunnerSessionSyncManager.ts](files/src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts.md)
- [skillRunnerBackendHealthRegistry.ts](files/src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md)

## 6. 工作流契约与 Host API

这是整个插件的语义中心。src/workflows/types.ts（import fan-in 76）定义 manifest、hook 签名、宿主 API 形状与产物/错误契约；hostApi.ts 把 logging、editor、file、bibliography、synthesis client 与 Zotero 宿主能力装配成一个受版本约束的 host api 对象；workflowHostContract.ts 检查 manifest 声明与实际实现的缺失与偏差。插件本体不含业务逻辑，业务全在这些契约与用户声明的工作流文件里。

### 相关节点
- [types.ts](files/src/workflows/types.ts.md)
- [hostApi.ts](files/src/workflows/hostApi.ts.md)
- [workflowHostContract.ts](files/src/workflows/workflowHostContract.ts.md)
- [workflowHostErrorContract.ts](files/src/workflows/workflowHostErrorContract.ts.md)

## 7. 工作流 catalog 与执行链

运行时如何发现并跑起来一个工作流：workflowRuntime.ts 解析工作流/skill 目录、合并 manifest 并维护注册表状态，workflowSettings.ts 把持久化设置与 run-once 覆盖投影成设置 UI 描述符，workflowInputPlanning.ts 把 Zotero 选择集展开成不可变的执行单元计划，workflowExecution/runSeam.ts 把声明式请求编译并串成完整执行链。

### 要点

执行链固定为 preflight → buildRequest → applyResult 三类 hook：前两者只做无副作用的检查与请求构造，只有最后一步真正写宿主，这是权限模型成立的前提。

### 相关节点
- [workflowRuntime.ts](files/src/modules/workflow/catalog/workflowRuntime.ts.md)
- [workflowSettings.ts](files/src/modules/workflow/settings/workflowSettings.ts.md)
- [workflowInputPlanning.ts](files/src/workflows/workflowInputPlanning.ts.md)
- [runSeam.ts](files/src/modules/workflowExecution/runSeam.ts.md)

## 8. Zotero 宿主能力 Broker

Agent 不能直接改 Zotero，所有 canonical mutation 必须过 zoteroHostCapabilityBroker.ts——它是宿主能力语义的唯一事实源，强制 preflight—审批—重校验—宿主 slice 执行的固定次序。zoteroHostMutationAuthority.ts 用语义摘要与 durable insert winner 保证重启后仍可判定写入归属，selectionContext.ts 一次性锁定有序 canonical 选区并只向外投影 portable 引用，不泄露原生 ID。

### 要点

写前无副作用预检 + 审批等待后重新准备 + 摘要变化必须重新审批，是这类插件避免"Agent 误改文献库"的核心模式；公共 DTO 不接受 expectedRevision/token/path 之类的写入授权参数。

### 相关节点
- [zoteroHostCapabilityBroker.ts](files/src/modules/zoteroHostCapabilityBroker.ts.md)
- [zoteroHostMutationAuthority.ts](files/src/modules/zoteroHostMutationAuthority.ts.md)
- [selectionContext.ts](files/src/modules/selectionContext.ts.md)
- [zoteroManagedNotes.ts](files/src/modules/zoteroHost/zoteroManagedNotes.ts.md)

## 9. Host Bridge：HTTP / MCP / CLI 三个入口

把插件能力开放给 Agent 的服务端面。hostBridgeServer.ts 绑定监听端口并把请求分发到 capability、诊断、文件、synthesis 与工作流路由，hostBridgeProtocol.ts 让 HTTP、MCP 与 CLI 共用同一套响应形态与错误码，hostBridgeAuth.ts 管理 master token 的派生与轮换，zoteroMcpServer.ts 内嵌 JSON-RPC MCP 端点。hostBridgeWorkflowControl.ts 是工作流能力的对外投影入口。

### 要点

Broker 与 Host Bridge 是单向依赖：broker 定义语义，Bridge 只是它的投影；任何绕过 Broker 的裸宿主写入都会破坏审批与幂等保证。

### 相关节点
- [hostBridgeServer.ts](files/src/modules/hostBridge/server/hostBridgeServer.ts.md)
- [hostBridgeProtocol.ts](files/src/modules/hostBridge/server/hostBridgeProtocol.ts.md)
- [hostBridgeAuth.ts](files/src/modules/hostBridge/server/hostBridgeAuth.ts.md)
- [zoteroMcpServer.ts](files/src/modules/hostBridge/mcp/zoteroMcpServer.ts.md)
- [hostBridgeWorkflowControl.ts](files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md)

## 10. Synthesis 共享合约（跨语言）

packages/synthesis-* 是 npm workspaces 里的共享合约与应用层，被插件 TypeScript 与 Rust sidecar 同时消费。synthesis-contracts/src/index.ts 作为 barrel 入口把 50 个合约模块统一再导出；canonicalJson.ts 定义所有 basis 身份唯一使用的规范化 JSON 与 SHA-256 算法；sidecarSystem.ts 与 sidecarRuntimeBundle.ts 规定能力矩阵、错误码、调用 envelope 与七平台 bundle 布局。跨语言边界上的类型漂移都由这里挡住。

### 要点

合约先行：Rust 侧按同一份 JSON Schema 重建 DTO，任一侧新增字段都必须先改合约，否则 protocolSchema 的 Ajv 校验会在握手阶段直接失败。

### 相关节点
- [index.ts](files/packages/synthesis-contracts/src/index.ts.md)
- [canonicalJson.ts](files/packages/synthesis-contracts/src/canonicalJson.ts.md)
- [sidecarSystem.ts](files/packages/synthesis-contracts/src/sidecarSystem.ts.md)
- [sidecarRuntimeBundle.ts](files/packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md)
- [index.ts](files/packages/synthesis-application/src/index.ts.md)

## 11. Synthesis sidecar 运行时

重计算都在 Rust sidecar 里。synthesis-sidecar/src/lib.rs 组装全部 runtime_* 子模块构成生产 module graph，runtime_service.rs 的 serve() 是生命周期唯一入口（读配置、装配资源、绑定 listener、原子发布 discovery、统一 500 ms 有界清理）；runtime_server_loop.rs 只管监听与连接 drain。应用层由 synthesis-application 界定边界并只依赖 ports.rs 的抽象接口，canonical store 与 citation-graph-build / layout / metrics 等算法 crate 各司其职。

### 要点

main.rs 只做 CLI 适配、不组装 runtime module graph，是为了让生命周期逻辑可被进程内测试覆盖；discovering 原子发布才是 sidecar 的 ready commit，stdout 日志只用于诊断。

### 相关节点
- [lib.rs](files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs.md)
- [runtime_service.rs](files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs.md)
- [runtime_server_loop.rs](files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs.md)
- [lib.rs](files/rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs.md)
- [lib.rs](files/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs.md)

## 12. UI 表面与跨边界 wire 契约

页面与宿主之间的全部通信都由 src/shared/*WireContract.ts 定义：Dashboard iframe 与宿主交换的 dashboardWireContract、侧边栏的 assistantWireContract、Synthesis 工作台的 synthesisWorkbenchWireContract。这些 DTO 是重构时不得改变的语义边界；regionEquality.ts 提供区域级 memo 化比较原语，让 transcript 等高频区域更新不会重建整个面板 chrome。

### 要点

signature equality 是这类插件 UI 性能的关键：每个区域只用自己的可见内容与展开状态做比较键，绝不把 transcript revision、streaming chunk 之类的量放进整面板 render key。

### 相关节点
- [dashboardWireContract.ts](files/src/shared/dashboardWireContract.ts.md)
- [assistantWireContract.ts](files/src/shared/assistantWireContract.ts.md)
- [regionEquality.ts](files/src/shared/regionEquality.ts.md)
- [workspaceApp.ts](files/src/workspaceApp.ts.md)
- [synthesisWorkbenchApp.ts](files/src/synthesisWorkbenchApp.ts.md)

## 13. 内置工作流包与 Skill 合约

插件不含业务逻辑，业务在这里。literature-workbench-package/lib/runtime.mjs 把执行作用域、Zotero 宿主 API、选择集与附件路径收敛成工作流 hook 可直接调用的入口；literatureBundle.mjs 负责可移植笔记 HTML 编解码与 bundle 导入导出；mineru 的 pdfSplitPlan.mjs 读取附件 outline 切分页码。topic-synthesis 的 db-schema 与 stage-40 payload schema 则定义了 Agent 提交结果必须满足的库表与结构约束。

### 要点

工作流包是纯 .mjs 模块，运行在沙箱里而不在插件进程内；产物以 JSON Schema 校验后再写入 Zotero 笔记，schema 与 db-schema 因此就是 Agent 输出质量的第一道闸门。

### 相关节点
- [runtime.mjs](files/workflows_builtin/literature-workbench-package/lib/runtime.mjs.md)
- [literatureBundle.mjs](files/workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs.md)
- [pdfSplitPlan.mjs](files/workflows_builtin/mineru/lib/pdfSplitPlan.mjs.md)
- [paper_workset](files/skills_src/topic-synthesis/contracts/db-schema.sql.md)
- [claim](files/skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json.md)

## 14. 构建、发布与工程配置

最后看工具链如何把上面所有东西变成可安装的插件。package.json 声明插件身份、prefs 前缀、packages/* workspaces 与约 140 条构建/测试/发布脚本；tsconfig.json 用子配置把 dashboard、synthesis、sidebar 区域切出主检查范围；zotero-plugin.config.ts 是 zotero-plugin-toolkit 的入口与输出配置。scripts/ 下按交付域分组，host-bridge-surface-model.ts 等治理脚本负责发布物的一致性校验。

### 要点

多份 tsconfig 是为构建产物服务：主配置排除 sidebar 等运行时禁止 import 相对路径的目录，这些区域由独立子配置与 esbuild 打包单独检查。

### 相关节点
- [package.json](files/package.json.md)
- [tsconfig.json](files/tsconfig.json.md)
- [zotero-plugin.config.ts](files/zotero-plugin.config.ts.md)
- [host-bridge-surface-model.ts](files/scripts/host-bridge/host-bridge-surface-model.ts.md)
- [CONTEXT.md](files/CONTEXT.md.md)

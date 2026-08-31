# Zotero Agents

Zotero Agents 是在 Zotero 中组织、执行并呈现 Agent 工作流的插件。

Zotero Agents presents literature and knowledge-work capabilities over a Zotero library, keeping durable derived knowledge distinct from source material while presenting workflow and agent activity through shared user-facing concepts.

## Language

**内置 Pi Agent Runtime（Built-in Pi Agent Runtime）**：
由 Zotero Agents 随插件提供并管理生命周期的 Agent 执行能力，使用户无需配置外部 Agent backend 即可运行 Agent 任务。
_Avoid_: Pi Harness、内置 Harness

**Zotero Agent**：
内置 Pi Agent Runtime 在用户界面中的产品名称，适用于其 Conversation 与 Skill Run 入口。
_Avoid_: Pi Agent、内置 Pi Agent、内置 Agent

**外部 Agent（External Agent）**：
通过 ACP 接入 Zotero Agents、并持有自身运行时与配置的 Agent 在用户界面中的类别名称。
_Avoid_: ACP Agent（作为主要用户界面名称时）

**执行后端类型（Execution Backend Type）**：
Zotero Agents 用于区分任务执行路径的顶层类型，包括 ACP、SkillRunner、Generic HTTP、pass-through 与 Built-in Pi。
_Avoid_: Provider、模型 Provider、Agent 模型 Provider

**后端配置（Backend Configuration）**：
当前 Zotero profile 中归属于某种执行后端类型的配置；不同执行后端类型可以拥有不同的配置结构和数量。
_Avoid_: 模型配置、Provider 配置

**后端适配器（Backend Adapter）**：
Zotero Agents 将统一执行请求交给某种执行后端的适配实现。
_Avoid_: Provider、模型 Provider、执行 Provider

**Agent 模型 Provider（Agent Model Provider）**：
为 Agent 提供模型调用能力的服务类别；它位于执行后端内部，不属于 Zotero Agents 的执行后端类型或后端适配器。
_Avoid_: Backend Provider、执行 Provider、Backend Type

**ACP 模型 Provider（ACP Model Provider）**：
由 ACP backend 暴露并解析的 Agent 模型 Provider，其身份和配置语义归对应 ACP backend 持有。
_Avoid_: ACP Backend、Pi 模型 Provider

**Pi 模型 Provider（Pi Model Provider）**：
由内置 Pi Agent Runtime 调用并由 Zotero Agents 配置的 Agent 模型 Provider。
_Avoid_: Built-in Pi Backend、ACP 模型 Provider

**Pi Conversation（Pi 会话）**：
由 Zotero Agents 持有并通过内置 Pi Agent Runtime 执行的可持久化多轮交互，支持流式回复、取消、恢复、运行时模型选项和 Zotero 工具调用。
_Avoid_: 自由聊天、Pi Chat Session

**Pi Skill Run（Pi Skill 运行）**：
由工作流发起、通过内置 Pi Agent Runtime 执行并由工作流生命周期持有结果的 Agent 运行；它可以包含多轮交互，但不属于 Pi Conversation。
_Avoid_: Pi Conversation、ACP Skill Run

**Pi Skill Run Suspension（Pi Skill 运行暂停）**：
用户主动中断当前轮次后，Pi Skill Run 所处的可继续非终态。暂停不表示 Agent 通过 `ask_user` 等待回答，也不改变 Auto 或 Interactive 执行模式；继续时创建关联的新 Pi Runtime Turn。
_Avoid_: waiting_user、取消 Pi Skill Run

**Pi Runtime Session（Pi 运行时会话）**：
内置 Pi Agent Runtime 为 Pi Conversation 或 Pi Skill Run 创建的临时执行上下文。它持有当前存活的 Agent 状态，可以从持久化历史重建，本身不是持久化事实源。
_Avoid_: Pi Conversation、持久化会话

**Pi Runtime Turn（Pi 运行时轮次）**：
Pi Runtime Session 中一段可单独观察、取消并取得结构化终态的连续执行。同一 Pi Runtime Session 同时最多有一个活动轮次；轮次不跨越可持久化等待、窗口卸载、插件关闭或重启，继续执行时创建关联的新轮次。
_Avoid_: 工作流任务、Conversation

**Pi Model Invocation（Pi 模型调用）**：
Pi Runtime Turn 中一次具有独立身份的模型 Provider 调用，是 usage 与 cost 的最小记账单位；一个轮次可以包含多次模型调用。
_Avoid_: Pi Runtime Turn、完整 Agent 请求

**Pi Model Provider Configuration（Pi 模型 Provider 配置）**：
内置 Pi Agent Runtime 使用的、独立于既有 Backend Profile 的模型 Provider endpoint、模型默认项与凭据引用配置实体。
_Avoid_: Pi Provider Configuration、Backend Profile、Provider Profile

**Zotero Agents Pi Runtime Defaults（Zotero Agents Pi 运行时默认项）**：
当前 Zotero profile 中由 Zotero Agents 持有的全局、Pi Conversation 与 Pi Skill Run 默认模型选择；它不表示 pi-coding-agent 或 OMP 的设置。
_Avoid_: Pi 设置、OMP config

**Pi Model Provider Auth Variant（Pi 模型 Provider 认证变体）**：
同一 Pi 模型 Provider 下具有独立 endpoint 或认证方式的可配置身份，例如 API Key 与 OAuth 入口；凭据只能绑定到明确的认证变体。
_Avoid_: credential fallback、provider 登录状态

**Pi Credential Store（Pi 凭据存储）**：
Zotero Agents 在当前 Zotero profile 内为 Pi Model Provider Configuration 持有并解析模型 Provider 凭据的安全边界。
_Avoid_: Oh My Pi auth store、Backend Profile 凭据

**Pi OAuth Credential（Pi OAuth 凭据）**：
由 Pi Model Provider Configuration 对应的模型 Provider 授权流程产生、可刷新并由 Pi Credential Store 持有的凭据。
_Avoid_: OAuth token、登录 session

**Pi Model Catalog（Pi 模型目录）**：
描述 Pi provider/model 及其调用能力、限制、默认选项和宿主可用性的版本化目录；其来源包括 OMP bundled catalog 与受控的 Pi Catalog Overlay。
_Avoid_: live model list、provider profile model cache

**Pi Catalog Overlay（Pi 目录覆盖层）**：
由 OMP `models.yml` 提供、经 Zotero Agents 规范化的只读 provider/model 声明；它只能补充或显式导入配置，不携带 OMP 凭据、环境变量、命令或运行时发现语义。
_Avoid_: models.yml credential、OMP provider registry

**Pi Model Selection Snapshot（Pi 模型选择快照）**：
为一次 Pi Runtime Turn 确定并冻结的 Pi Model Provider Configuration、model 与模型运行选项集合。
_Avoid_: current model setting、live provider selection

**Pi Reasoning Level（Pi 推理级别）**：
项目对不同 provider thinking/reasoning 参数提供的统一、可验证的用户选择。
_Avoid_: reasoning_effort、thinking（作为项目级概念时）

**Pi Agent Transcript（Pi Agent 转录）**：
由 Zotero Agents 持有、归属于一个 Pi Conversation 或 Pi Skill Run 的完整持久化 Agent 历史，是消息、轮次、工具活动、分支和压缩记录的唯一事实源。
_Avoid_: Pi History、AgentState messages、UI transcript cache

**Pi Transcript Projection（Pi 转录投影）**：
从 Pi Agent Transcript 派生、面向运行时、用户界面或模型请求的特定视图；它可以重建，不能反向成为持久化历史。
_Avoid_: Pi Agent Transcript、持久化副本

**Pi Context Reconstruction（Pi 上下文重建）**：
从 Pi Agent Transcript、所选压缩记录和当前有效的非持久化运行配置中重建模型上下文投影；它不调用模型或工具，也不产生外部副作用。
_Avoid_: replay、恢复执行、重放请求

**Execution Replay（执行重放）**：
再次发出模型请求、工具调用、Zotero mutation 或外部网络操作。它可能重复副作用，只有专门合同证明幂等并保留原幂等身份时才可自动执行。
_Avoid_: Pi Context Reconstruction、恢复投影

**Tool Gateway（工具网关）**：
内置 Pi Agent Runtime 发起工具调用的唯一受控入口，负责把调用交给可信原生执行器或 Zotero capability broker；工具目录、策略、审批和审计均由 Zotero Agents 持有。
_Avoid_: Pi 内置工具、任意工具回调

**Agent Capability Envelope（Agent 能力包络）**：
Zotero Agents 授予某个 Pi Conversation 或 Pi Skill Run 的能力范围，包含工具 effect、工作区、预授权命令、网络和资源限制。包络内的调用可自动执行；越界调用必须暂停、拒绝或另行提升权限。
_Avoid_: 逐调用审批、全局自动批准

**Agent Tool Effect（Agent 工具效应）**：
Tool Gateway 用于组合描述一次工具调用安全含义的能力维度，包括 `bounded-read`、`workspace-mutation`、`code-execution`、`external-egress`、`local-network`、`zotero-mutation`、`host-control` 和不可授予的 `forbidden`。
_Avoid_: 工具风险等级、互斥工具类型

**Resource Policy（资源策略）**：
Zotero Agents 集中管理的工具与运行资源限制。Workflow 和 Skill 使用统一策略而不各自声明配额；执行路径只能声明它实际实施或明确标为信任约束的限制。
_Avoid_: Workflow 资源声明、逐任务配额申请

**Restricted Broker Mode（受限 Broker 模式）**：
未授予可信原生执行能力时使用的受限模式，只开放封闭、类型化并受策略约束的 Zotero、Web 和工作区工具。它不支持任意代码执行。
_Avoid_: 弱沙箱、沙箱失败回退

**Runtime Audit Tier（运行时审计层级）**：
Zotero Agents 根据生产默认、生产诊断模式或 Debug Build 选择的审计证据详细程度。所有层级共用同一隐私规则，只保存结构、引用和摘要，不复制语义正文、凭据或可复用 secret。
_Avoid_: 单一全量日志、未脱敏调试日志

**Pi Failure（Pi 失败事实）**：
Pi 执行路径中一次失败操作的结构化事实；它可以被 owner 用来决定终态，但本身不等同于 Pi Runtime Turn、Pi Conversation 或 Pi Skill Run 已失败。
_Avoid_: 原始异常、错误文案、owner 终态

**Managed Agent Workspace（受管 Agent 工作区）**：
由 Zotero Agents 为 Pi Conversation 或 Pi Skill Run 创建并管理生命周期的工作区，也是 Pi Runtime Session 唯一的工作目录和项目指令发现范围。插件物化的控制资源默认可信；模型生成内容、工具输出和用户提供的普通文件仍只作为数据处理。
_Avoid_: 项目工作区、临时目录

**External Workspace（外部工作区）**：
用户主动选择、生命周期不由 Zotero Agents 管理、仅在执行过程中按授权访问的现有目录或仓库。它永远不是 Pi Runtime Session 的工作目录，其中的 `AGENTS.md` 或其它控制资源不参与项目指令发现。
_Avoid_: 受管 Agent 工作区、session cwd、项目指令根

**Workspace Scope（工作区范围）**：
Zotero Agents 为某个 Pi Conversation 或 Pi Skill Run 授权的文件系统根集合，可以包含可写的受管工作区、scratch、只读运行资源，以及显式关联的产物或外部工作区。范围内可按授权自由读写；显式越界访问需要另行审批。
_Avoid_: 单一工作目录、宿主文件系统

**可信原生执行（Trusted Native Execution）**：
内置 Pi Agent Runtime 在用户授权后使用宿主原生 Shell 和命令的执行模式。它依赖受信 Agent 遵守能力包络，不表示存在操作系统级隔离。
_Avoid_: 强沙箱、受限 Shell、沙箱执行

**预授权命令集（Preauthorized Command Set）**：
Workflow 声明并经用户或项目策略授予的命令集合，绑定到具体 Workflow 版本。集合内命令可以自动执行，未声明命令仍可通过增量审批使用。
_Avoid_: Workflow 命令白名单、永久命令白名单

**代理网络访问（Brokered Network Access）**：
由 Tool Gateway 或服务连接代理并实施目标、凭据和操作边界的网络访问，包括公开 Web 读取和结构化服务操作。
_Avoid_: Shell 网络、代理环境变量

**直接原生网络（Direct Native Network）**：
宿主原生进程直接使用当前用户网络能力的访问方式。其 download、upload 或 unrestricted 授权表达受信 Agent 的执行意图，不构成域名级网络隔离。
_Avoid_: 域名沙箱、受限网络

**本地网络访问（Local Network Access）**：
访问 loopback、私网、link-local、本机服务或本地 IPC 端点的独立能力，不由普通互联网授权隐式包含。
_Avoid_: Direct Native Network、公开互联网访问

**Zotero 原生工具（Zotero Native Tools）**：
内置 Pi Agent Runtime 通过 Zotero capability broker 直接调用的文献库能力；其边界是稳定 DTO 和受控操作，不暴露原始 Zotero 运行时对象。
_Avoid_: Zotero Bridge 工具、直连 Zotero API 工具
**Reference**:
The literature-linking domain that covers extracted source citations, their canonical identities, matching decisions, review, and derived projections.
_Avoid_: Reference canonical, reference subsystem

**Source Reference**:
A citation or bibliographic claim extracted from one source item before canonical identity is resolved.
_Avoid_: Raw row, reference record

**Canonical Reference**:
The durable identity that unifies equivalent Source References and may be bound to a Zotero library item.
_Avoid_: Canonical record, merged reference

**Reference Match Proposal**:
A durable recommendation to bind a Source Reference to a library item or to redirect one Canonical Reference to another, pending an applicable decision.
_Avoid_: Match row, proposal record

**Reference Projection**:
A derived, readable view of current Reference facts for indexing, ranking, attention, or review.
_Avoid_: Reference JSON, read model row

**Citation Graph Application**:
The deep module that owns basis-bound Citation Graph reads, graph rebuild attempts, metrics and layout identity, and atomic graph/cache/attempt promotion over the local repository.
_Avoid_: Citation graph repository facade, runtime graph store

**ACP Tool Display Projection**:
The normalized display state derived from ACP tool-call reports and used consistently by ACP Chat, ACP Skills, transcript previews, and tool rows.
_Avoid_: Tool text helper, mirror-specific tool display

**Workflow Job Terminal Resolution**:
The read-only interpretation of one workflow job's local queue and canonical lifecycle facts, yielding both a terminal conclusion (missing, pending, locally ready, canonically ready) and a normalized slot status for the run seam.
_Avoid_: Terminal outcome, completion, job state

**Zotero Host Capability Broker**:
The canonical process-local, JSON-safe capability interface for Zotero context, navigation, bounded library reads, metadata translation, and controlled mutations. It owns host capability semantics but not transport, authorization, approval, exposure, or remote file locality.
_Avoid_: Workflow hostApi, Host Bridge API, MCP tool registry

**Workflow Host API Projection**:
The explicit member-level projection from the canonical broker into `WorkflowHostApi` v11, combined with trusted local workflow services and raw Zotero ref normalization. It is a separate compatibility surface and must not receive whole broker domains implicitly.
_Avoid_: Broker alias, common host API, universal host facade

**Workflow Host Contract Identity**:
The current Workflow Host version and its declared top-level capabilities and diagnostic flags. Package compatibility ranges, hook execution modes, and observed runtime availability are separate concepts.
_Avoid_: Capability summary, package compatibility policy, hook execution mode

**Workflow Host Contract Variant**:
The interactive or non-interactive availability rules applied to the Workflow Host API Projection. A variant defines which declared capabilities must be present without changing how workflow hooks are loaded.
_Avoid_: Hook execution mode, package load mode, runtime backend

**Research Bundle Materialization**:
The canonical conversion of selected paper refs into portable metadata, one preferred source, the standard analysis artifacts, and structured per-paper availability diagnostics. Selection roles, Product layout and registration, and direct-export delivery are separate concerns.
_Avoid_: Workflow bundle builder, direct-export packager, Research Bundle service

**Host Bridge Locality Projection**:
The sole remote-boundary conversion of process-local attachment DTOs into path-free opaque file handles or unavailable access descriptors. MCP reuses this projection through the Host Bridge capability handlers.
_Avoid_: MCP attachment adapter, localhost path mode, path passthrough

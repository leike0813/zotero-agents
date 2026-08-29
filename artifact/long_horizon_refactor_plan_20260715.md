# Zotero Agents Long-Horizon Refactor Plan

> 状态：规划基线
>
> 日期：2026-07-15
>
> 适用范围：Zotero Agents 插件、Synthesis Layer、ACP/SkillRunner/Host Bridge 运行时，以及未来 Electron 文献管理产品
>
> 第一阶段详细执行计划：`artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`

## 1. 文档目的

本计划定义 Zotero Agents 的长期架构演进方向。它不是一次性“大重写”方案，也不是现有目录的机械重排，而是通过连续、可验证的阶段逐步建立以下能力：

1. 将 Synthesis 的领域计算、应用用例和持久化从 Zotero 插件进程移入独立本地服务；
2. 重构插件内部模块边界，消除 god object、平铺目录、全局状态和跨域直接依赖；
3. 抽取可移植的平台核心，最终支撑独立 Electron 产品和 Zotero 插件两种宿主形态。

本文取代将 Synthesis 长期保留为插件内垂直模块的假设，但保留 `artifact/architectural_refactor_plan_20260613.md` 中仍然有效的原则：

- deep module；
- 高内聚、低耦合；
- 窄而稳定的公开接口；
- 依赖倒置；
- 显式生命周期和显式依赖；
- 渐进迁移而非无保护重写。

## 2. 已确认的架构决策

以下决策是本计划的前提，不再作为实施阶段的开放选项：

1. 第一阶段终点不是单纯转移 CPU 计算，而是由独立 Synthesis Service 独占 Synthesis 应用用例、`synthesis.db` 和相关领域运行时。
2. Topic canonical 文件是真源；Zotero note mirror 是可恢复、可诊断的宿主镜像，不是 canonical source。
3. Synthesis Service 使用 TypeScript/Node，在当前仓库内独立构建，由插件按 Zotero profile 托管本地 sidecar 进程。
4. 独立进程不等于立即拆分仓库。协议和边界稳定前，插件、共享 contracts 和服务保持同仓库原子演进。
5. Synthesis Service 不是 ACP、SkillRunner 或 Generic HTTP Provider；它是产品自身的领域服务。
6. Node runtime 是产品随插件分发和管理的组成部分；用户不安装 Node，launcher 不得从系统 PATH 查找或执行 Node。
7. Node service 主进程只承担协议、operation、SQLite 单一写入和 canonical file commit；CPU 密集计算必须进入受控 worker pool。
8. Rust 不是第一阶段前置条件。只有稳定 benchmark 证明某个纯计算 kernel 无法满足预算时，才允许以可替换 worker 实现；Rust 不拥有 DB、canonical files 或 Zotero effects。

## 3. 当前问题的本质

### 3.1 Synthesis 已越过插件进程的合理复杂度

截至本计划编写时：

| 文件 | 规模 | 主要问题 |
| --- | ---: | --- |
| `src/modules/synthesis/service.ts` | 约 21,265 行 | 近百个公开方法，混合应用编排、Zotero 访问、文件、SQLite、同步、UI read model、Host Bridge 和领域计算 |
| `src/modules/synthesis/repository.ts` | 约 9,329 行 | 单文件承载绝大部分 Synthesis schema、查询和写入 |
| `src/synthesisWorkbenchApp.ts` | 约 15,667 行 | UI 行为、渲染和消息处理高度集中 |
| `src/modules/synthesis/uiModel.ts` | 约 4,716 行 | 多个 surface 的 DTO 和投影构造集中 |
| `src/modules/synthesisWorkbenchTab.ts` | 约 3,400 行 | UI command 直接调用完整 Synthesis 单例 |

继续在插件内拆文件只能改善可读性，无法解决 Zotero 单线程 UI 与重计算共享执行环境的问题，也无法建立未来 Electron 复用所需的宿主边界。

### 3.2 当前项目的耦合不是单一循环，而是所有权不清

主要症状包括：

- `getDefaultSynthesisService()` 被 UI、workflow host API、MCP、Host Bridge、参数选项和 hooks 直接获取；
- Synthesis service 同时拥有领域逻辑和插件环境逻辑；
- repository 直接依赖插件侧 SQLite 包装；
- library adapter 直接导入 Zotero host broker；
- Host Bridge 既是外部入口，又直接获取插件内领域对象；
- `addon.data`、hooks 和模块级单例承担隐式 composition root；
- UI 经常面对完整 service，而不是面向用例的 client；
- 文件、SQLite、Zotero mirror 和工作流产物的真源语义曾在文档中漂移。

### 3.3 旧架构计划中需要修正的假设

`artifact/architectural_refactor_plan_20260613.md` 仍有参考价值，但以下方向不再适合作为重构起点：

- 不先建立一个被所有域依赖的“大 core”；
- 不用全局 event bus 替代明确的跨域协议；
- 不将 `getDefaultSynthesisService()` 作为 deep module facade 保留；
- 不先搬目录再寻找边界；
- 不把 Synthesis 继续放在 `shell -> synthesis -> core` 的插件内依赖图中；
- 不把独立领域服务注册为 agent provider。

## 4. 长期架构北极星

### 4.1 产品形态

```text
                         Shared Product Contracts
                    commands / queries / events / DTOs
                                      |
                 +--------------------+--------------------+
                 |                                         |
        Zotero Plugin Shell                         Electron Product Shell
        - Zotero UI integration                     - Desktop lifecycle
        - Zotero Host Adapter                       - Native library adapter
        - permission UX                             - Zotero-compatible mode
        - local service lifecycle                   - local service lifecycle
                 |                                         |
                 +--------------------+--------------------+
                                      |
                          Agentic Literature Platform
                   workflow / agent / task / conversation
                                      |
                  +-------------------+-------------------+
                  |                                       |
          Synthesis Sidecar Service                 Agent Backends
          domain / DB / projections                 ACP / SkillRunner / REST
                  |
          Host Capability Contract
                  |
       Zotero Adapter or Native Library Adapter
```

最终产品不应以“Zotero 插件代码被 Electron 包起来”为目标，而应形成：

- 一个宿主无关的 agentic literature platform；
- 一个独立的 Synthesis domain service；
- 一组可替换的 library/host adapters；
- Zotero Plugin Shell 和 Electron Shell 两个 composition root；
- 可共享但不强制共享的 renderer/view-model 层。

### 4.2 长期依赖方向

允许方向：

```text
shells
  -> application clients
  -> workflow / agent runtime
  -> domain contracts

synthesis service
  -> synthesis domain
  -> synthesis repository ports
  -> host capability contracts

host adapters
  -> host capability contracts
  -> Zotero APIs or native library APIs

infrastructure adapters
  -> application/domain ports
  -> filesystem / SQLite / network / process APIs
```

禁止方向：

- domain 或 application package 导入 `globalThis.Zotero`、`addon`、XUL DOM 或插件 toolkit；
- shared contracts 导入 Node、Zotero 或 UI runtime；
- Zotero shell 被 workflow、Synthesis 或 agent runtime 反向导入；
- UI renderer 直接访问 repository、SQLite 或完整 service object；
- ACP、SkillRunner、Host Bridge 直接导入彼此的内部文件；
- 为跨域便利建立无边界的 `core/utils/common` 聚合包；
- 通过字符串事件总线隐藏关键业务依赖；
- 多个进程或模块共同写同一个领域数据库。

## 5. 跨阶段稳定原则

### 5.1 真源和派生状态

| 数据 | 长期所有者/真源 | 说明 |
| --- | --- | --- |
| Zotero item、metadata、collection、tag、relation、note、attachment | Zotero Library | 只能通过 Zotero Host Adapter 访问和修改 |
| 文献分析等 workflow source artifacts | Zotero note/attachment 或显式工作流产物文件 | Synthesis 只保存 locator、hash、诊断和派生行 |
| Topic canonical current files | Synthesis Service 管理的 canonical file store | Zotero note shards 是 mirror |
| Synthesis cache projection | `synthesis.db` | 允许 stale/missing，不能成为 Zotero Library 事实源 |
| 用户批准的 binding/dedupe/review 决策 | Synthesis Service durable state | 重建不得静默覆盖 |
| Agent run、conversation、task ledger | Agent/runtime 域 | 不写入 Synthesis operation 表 |
| UI transient state | 对应 shell/view model | 不进入领域真源 |

### 5.2 单一写入者

- `synthesis.db` 只有 Synthesis Service 可以读写；
- Topic canonical root 只有 Synthesis Service 可以变更；
- Zotero Library 只有当前 host adapter 可以写；
- 跨边界写入使用 command、precondition 和 receipt，不使用共享对象或共享事务；
- 任何迁移期 shadow store 都不得回写生产状态。

### 5.3 显式操作而非隐式同步

Synthesis 保持以下现有原则：

- 普通读取不得触发重建；
- 插件启动不得扫描整库；
- Zotero notifier 只提供 UI invalidation 或 bounded hint，不建立自动 dirty fan-out；
- broad refresh、matching、graph rebuild、layout、repair 和 import/export 是显式操作；
- 操作失败保留上一版可用 projection；
- operation progress 与 cache readiness 保持两个 SSOT。

### 5.4 UI 更新隔离

- Assistant Workspace 的 transcript-only 更新继续严格与 chrome/drawer/plan 等区域解耦；
- Synthesis Workbench 使用 shell、chrome 和 named surface 分区；
- 后端进度事件不得触发整面板重建；
- renderer 不根据 repository revision 或无界 event tail 决定整页 render identity；
- service unavailable、starting、incompatible 和 degraded 是稳定 UI 状态，不阻塞宿主启动。

### 5.5 可移植性

可移植不等于使用最小公分母。长期采用 ports/adapters：

- Zotero 特有能力留在 Zotero adapter；
- Electron 原生能力留在 Electron adapter；
- 领域层通过 capability negotiation 知道某项能力是否存在；
- 不在领域代码中加入 `if (isZotero)`、`if (isElectron)` 分支；
- 不让 Electron 直接复用依赖 XUL/Firefox 沙箱的插件模块。

### 5.6 产品托管运行时与计算隔离

- Synthesis Runtime 随插件直接分发，包含匹配平台和架构的 Node executable、service bundle 及必要原生组件；
- runtime 安装、校验、升级和 rollback 由插件管理，不依赖系统 Node、npm、PATH 或用户 shell；
- 插件包内资产和已解压 runtime 都必须经过真实哈希校验，平台要求时还需签名/公证；
- runtime 使用版本化目录和原子 active pointer；新版本启动失败不得破坏上一版完整 runtime；
- service 主事件循环只运行 HTTP/SSE、health、operation orchestration、短事务和 canonical commit；
- graph、matcher、metrics、layout 等 CPU 密集任务运行在有界 worker pool，不得阻塞 health、cancel 或 shutdown；
- worker 不读写 production DB、canonical files 或 Zotero Host，只接受纯输入并返回纯输出；
- Node 和未来 Rust kernel 共享同一 compute port、basis/version 和 benchmark；不得形成双实现 SSOT；
- 是否引入 Rust 由 normal/target/stress 基准决定，不以语言偏好或现有 ACP Bridge 的实现语言决定。

## 6. 三个长期阶段

### 6.1 第一阶段：建立独立 Synthesis Sidecar Service

#### 目标

- 将 Synthesis 应用用例、重计算、repository、operation/read models 和 canonical topic file store 移出插件；
- 插件只保留 Synthesis client、服务生命周期、UI bridge 和 Zotero Host Adapter；
- Synthesis Service 独占 `synthesis.db`；
- 建立可供未来 Electron 使用的 service protocol 和 host capability protocol；
- 随插件交付无需用户另行安装的 product-owned Node runtime；
- 建立保持控制面响应的 compute worker pool 和可替换 kernel 边界。

#### 不在本阶段处理

- 全项目 `src/modules` 目录治理；
- hooks 全面模块化；
- ACP/SkillRunner/Host Bridge 的整体重构；
- Assistant Workspace renderer 的重写；
- Electron 应用实现；
- 为所有模块建立统一 DI 框架。

#### 退出门禁

- 插件 UI 线程不再运行 Synthesis graph/matcher/layout/index 重计算；
- 插件不直接打开 `synthesis.db` 或写 Topic canonical root；
- service 不导入 Zotero/plugin 环境；
- UI、workflow、MCP、Host Bridge 全部经 typed client；
- 干净环境没有系统 Node 时仍可启动和使用 Synthesis；
- 长计算期间 service health、cancel、progress 和 shutdown 保持响应；
- Rust 若被引入，只能替换通过 benchmark 门禁的纯计算 kernel；
- 完成 single-writer cutover，删除生产 fallback 和双写；
- 完整门禁见第一阶段详细计划。

### 6.2 第二阶段：重构 Zotero 插件平台架构

第一阶段稳定后，再处理全项目架构。第二阶段不应与第一阶段并行大规模搬迁，以免同时改变进程边界和模块边界。

#### 目标

1. 缩减 hooks 和全局 addon 状态；
2. 按业务能力建立深模块；
3. 消除 `src/modules` 平铺和跨域内部导入；
4. 将 workflow、transport、ACP、SkillRunner、Host Bridge、Assistant Workspace 和 Zotero shell 分层；
5. 抽出可移植的 application/platform core；
6. 为 Electron 提取建立 package 和 build 边界。

#### 推荐模块边界

| 模块 | 核心职责 | 不负责 |
| --- | --- | --- |
| `platform-contracts` | 跨进程/跨 shell DTO、错误、capability 描述 | 运行时实现 |
| `workflow-runtime` | workflow load/validate/compile/execute、host API contracts | 具体 agent backend |
| `backend-registry` | backend identity/config/resolution | ACP/SkillRunner 内部会话 |
| `agent-runtime` | task、conversation、run orchestration 的宿主无关模型 | Zotero UI |
| `acp-runtime` | ACP transport/session/provider | Host Bridge capability 实现 |
| `skillrunner-runtime` | SkillRunner provider/local runtime/reconcile | 通用 workflow 内核 |
| `host-bridge` | 外部 capability gateway、auth、permission、CLI | 具体业务域内部实现 |
| `assistant-workspace` | shell/view model/region renderer contracts | backend protocol 细节 |
| `synthesis-client` | Synthesis Service typed client | Synthesis domain 实现 |
| `zotero-adapter` | Zotero lifecycle、selection、item/note/relation、window integration | workflow/agent/Synthesis 规则 |
| `zotero-plugin-shell` | composition root 和插件生命周期 | 领域事实 |

这里的“模块”首先表示依赖边界，不要求第一步就拆成独立 npm package。只有需要独立构建、跨运行时复用或机器化依赖控制时才升级为 package。

#### 第二阶段子阶段

##### 2A. 依赖基线和边界守卫

- 生成实际 import/call graph；
- 定义允许/禁止依赖；
- 增加 ESLint/import boundary 规则；
- 为每个模块确定 public entry；
- 禁止新代码继续导入内部文件。

##### 2B. Composition root 与生命周期

- 将 hooks 缩减为 Zotero lifecycle forwarding；
- 模块启动由显式 descriptors 或 composition functions 组织；
- 避免全局 service locator 成为新 `addon.data`；
- 偏好构造时依赖和窄 capability registry；
- 生命周期顺序和 shutdown failure 有明确语义。

##### 2C. Runtime 解耦

- workflow execution 不直接导入 ACP/SkillRunner；
- completion/progress/cancel 通过 runtime port；
- job/task/conversation 状态各自拥有唯一 SSOT；
- ACP 与 Host Bridge 通过 capability contract 协作；
- SkillRunner 状态机不泄漏进通用 job/runtime 模块。

##### 2D. UI shell 和 view model

- Assistant Workspace 与 Synthesis Workbench 均使用 typed view model；
- command handling 与 DOM rendering 分离；
- 每个 managed region 使用自身稳定 signature；
- renderer 不直接调用 backend implementation；
- Zotero DOM/XUL 适配集中到 shell。

##### 2E. 目录和 package 治理

- 删除平铺 `src/modules`；
- 按域迁移文件，不保留永久 re-export shim；
- 删除废弃 utils、重复类型和重复 DTO；
- 只有稳定边界才建立 barrel；
- 为可移植模块建立独立 tsconfig/build/test target。

#### 第二阶段退出门禁

- hooks 是薄 composition root；
- `addon.data` 只保留插件生命周期必需状态；
- workflow、ACP、SkillRunner、Host Bridge 无双向内部导入；
- Zotero API 只出现在 Zotero adapter/shell；
- Assistant Workspace 关键 DOM identity 不变量有稳定测试；
- 依赖规则由工具自动验证；
- 主要模块有清晰 owner、public API 和独立测试入口。

### 6.3 第三阶段：建立 Electron Agentic Literature Manager

#### 目标

构建一个独立 Electron 产品，并使 Zotero 插件成为同一平台的 Zotero 宿主实现，而不是 Electron 产品的代码来源。

#### 目标形态

```text
apps/
  zotero-plugin-shell
  electron-desktop
  synthesis-service

packages/
  platform-contracts
  workflow-runtime
  agent-runtime
  backend-registry
  acp-runtime
  skillrunner-runtime
  host-capabilities
  synthesis-client
  assistant-workspace-view-model
  shared-renderer-components

adapters/
  zotero-host-adapter
  electron-native-library-adapter
  electron-zotero-compat-adapter
```

目录只是目标示意；真正拆分以第二阶段形成的依赖边界为准。

#### 第三阶段子阶段

##### 3A. 提取产品内核

- 将 workflow、agent、backend registry、task/conversation models 从 Zotero shell 剥离；
- 建立独立 Node/Electron 测试环境；
- 让同一 use case 可由 Zotero shell 和 Electron shell 调用；
- 不复制业务逻辑到第二套实现。

##### 3B. Electron shell 原型

- 完成窗口、菜单、设置、更新和本地服务生命周期；
- 接入 Synthesis client；
- 接入至少一个 ACP backend；
- 先使用 fixture/in-memory library adapter 验证产品流，不急于实现完整文献库。

##### 3C. 文献库与 Zotero 模式

- 定义宿主无关的 library item、collection、note、attachment、relation contracts；
- 实现 Electron native library adapter；
- 定义 Zotero-compatible mode 的数据交换或连接方式；
- 不直接读写正在运行的 Zotero SQLite；
- 为 Zotero 导入、链接、同步和冲突提供显式语义。

##### 3D. 双宿主一致性

- 同一 workflow manifest、agent backend 和 Synthesis protocol 在两种 shell 上运行；
- capability negotiation 处理宿主差异；
- 共用 contract tests，不强求 DOM/UI 实现一致；
- 独立发布、版本协商和兼容矩阵。

#### 第三阶段退出门禁

- Electron 可在没有 Zotero 插件代码的情况下启动和运行核心流程；
- Zotero 插件与 Electron 使用相同 platform contracts；
- Synthesis Service 不感知调用者是 Zotero 还是 Electron；
- 核心 workflow/agent 逻辑不存在双份实现；
- Zotero compatibility 不依赖直接修改 Zotero 内部数据库。

## 7. 长期迁移策略

### 7.1 Strangler，而非永久双栈

每个阶段采用：

1. 建立 contract；
2. 用现有实现提供 in-process adapter；
3. 新实现通过同一 contract 验证；
4. 影子读或隔离 fixture 对比；
5. 原子切换单一所有者；
6. 删除旧路径和临时 adapter。

临时 adapter 必须在对应阶段的退出门禁前删除。不能以“兼容”为理由长期保留两个事实源。

### 7.2 先纵向用例，再横向工具层

优先迁移完整用例，例如“提交 graph rebuild -> 读取 host 数据 -> 写 staging -> promote -> UI 更新”，而不是先建设大量 `utils`、event bus 或抽象基类。

只有至少两个稳定用例共享同一概念时才抽取公共模块。

### 7.3 不跨两个阶段同时大改

- 第一阶段不同时重构整个 ACP/Assistant Workspace；
- 第二阶段不同时实现 Electron 产品；
- 第三阶段不回头依赖插件内部模块；
- 必要的前置 seam 可以提前建立，但要控制在当前阶段目标内。

## 8. 测试和验证总策略

### 8.1 测试分层

| 层级 | 关注点 |
| --- | --- |
| Contract tests | DTO/schema、错误码、capability、分页、协议版本 |
| Domain tests | 纯算法和稳定领域行为 |
| Application tests | 用例、事务边界、幂等、staging/promote、失败语义 |
| Adapter tests | Zotero、filesystem、SQLite、process、network 适配 |
| Cross-process tests | client/server、重连、取消、版本不匹配、服务/worker 崩溃、父进程租约 |
| Shell tests | 用户可见状态、region identity、command routing |
| Release smoke | 无系统 Node 环境下的 runtime 解压、校验、启动、health、升级/rollback 和关键操作 |

### 8.2 测试治理

- 优先迁移和复用现有 Synthesis 测试；
- 不因拆文件复制相同测试；
- 不精确断言完整 UI 文案、日志或无契约字段顺序；
- 进程边界新增测试应锁定稳定行为：幂等、单写者、失败保留旧投影、服务不可用降级；
- worker 测试应锁定控制面响应、取消、崩溃隔离、资源上限和结果验证，不锁定线程调度顺序；
- TDD 以每个 use case 的可观察行为为单位，而不是以私有函数为单位。

## 9. 数据迁移与恢复原则

- 每次 schema/file layout 迁移必须先生成可恢复备份；
- 迁移工具由最终数据所有者执行；
- shadow store 使用隔离路径和独立 identity；
- 切换期间禁止 plugin/service 并发写 canonical root 或 `synthesis.db`；
- Zotero mirror 失败不回滚已成功的 canonical file commit；
- 用户批准的 binding/dedupe/review 决策必须有单独校验；
- projection 可以重建，durable decision 不得依赖重建恢复；
- rollback 是受控发布动作，不是永久 runtime fallback。

## 10. 安全和进程边界

- 本地服务只监听 loopback；
- 每次启动生成 profile-scoped session token；
- client/server handshake 校验 protocol、service、schema、profile identity；
- launcher 只执行已校验的 product-owned runtime，不查询系统 PATH；
- Node/runtime/native component 必须固定来源和版本，发布物包含许可证清单、SBOM、校验值与可追溯 provenance；
- Node 安全更新纳入项目发布节奏，明确受影响版本识别、补丁时限和上一版安全 rollback 边界；
- service 使用 profile owner lock、instance nonce 和 parent/host lease 防止双实例与孤儿进程；
- ready 与 health 分离，崩溃重启使用有限退避和 crash-loop 熔断；
- shutdown 先停止 mutation、checkpoint/cancel workers，再在超时后终止进程树；
- Host capability 使用独立 token 或受限 capability grant；
- 不暴露任意 SQL、JS、shell、文件路径或 table API；
- 文件 API 使用受控 asset handle/path scope；
- backend 不直接打开 Zotero DB；
- Electron 和 Zotero shell 分别拥有自己的权限 UX；
- 日志、诊断和 debug bundle 不包含 token、credential、完整 note HTML 或无界数据。

## 11. 可观测性

长期统一以下概念，但保持域内 SSOT：

- request/operation id；
- profile/library owner scope；
- service/process instance id；
- runtime build/fingerprint 和 compute implementation/version；
- protocol/schema version；
- phase 和真实进度计数；
- event-loop lag、worker 状态、worker restart count、peak RSS/heap 和 cancellation latency；
- source/basis hash；
- stable error code；
- host effect receipt；
- bounded diagnostics。

不建立一个集中式“全项目状态数据库”来取代各域事实源。

## 12. 阶段指标

### 第一阶段

- 插件内 Synthesis 重计算调用数：0；
- 插件对 `synthesis.db` 访问数：0；
- service 对 Zotero globals/imports：0；
- production dual writes：0；
- 对系统 Node/PATH 的运行时依赖：0；
- Node 主事件循环上的长计算：0；
- Workbench 首屏不等待重建；
- target tier 长计算期间 health/cancel/shutdown 仍在既定预算内响应；
- explicit operation 崩溃后旧 projection 可读。

### 第二阶段

- hooks 只承担生命周期转发和 composition；
- `src/modules` 平铺文件清零或仅保留迁移期文件；
- 跨模块内部 import 由静态规则阻止；
- ACP/SkillRunner/workflow/bridge 双向依赖清零；
- Zotero API 越界 import 清零。

### 第三阶段

- Electron 核心流程不导入插件代码；
- 两种 shell 共用 contracts 和核心 use cases；
- Synthesis protocol 对 shell 类型零感知；
- workflow/backend 配置可跨 shell 使用。

## 13. 风险登记

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 把 god object 直接变成 remote god object | 协议膨胀、版本困难 | 按 use case 分组 client/API，禁止返回完整 service |
| plugin/service 同时写 DB | 数据竞争和难以恢复 | 原子 single-writer cutover、owner lock、无 production dual-write |
| 跨进程传输整库数组 | 内存、延迟、UI 卡顿 | cursor、batch、hash-first、changed-payload-only |
| 服务启动绑住 Zotero startup | 插件不可用 | lazy/deferred connect、明确 degraded UI、超时 |
| bundled Node runtime 显著增加插件体积 | 下载和升级成本上升 | 平台/架构资产治理、压缩、版本化增量策略；不转嫁为系统 Node 依赖 |
| bundled Node/runtime 供应链或安全版本过期 | 项目直接承担漏洞、许可证和来源风险 | 固定来源/版本、provenance、SBOM、许可证清单、漏洞扫描和补丁发布时限 |
| Node 主事件循环执行重计算 | health、cancel、shutdown 失去响应 | 控制面/worker pool 分离、event-loop lag 门禁、资源上限 |
| worker 消耗全部 CPU 或内存 | Zotero 与系统仍然卡顿 | 有界并发、内存预算、分片、取消和 backpressure |
| runtime 解压或升级半完成 | 无法启动或版本错配 | 真实哈希/签名、版本目录、原子 active pointer、上一版 rollback |
| 把现有 Windows Rust ACP Bridge 当作 Synthesis 生命周期证明 | 低估有状态服务复杂度 | 仅复用其 launcher/ready/token 思路；另建 owner lock、health、lease、recovery 和 crash-loop 治理 |
| 过早引入 Rust | 架构迁移与语言重写叠加 | benchmark-driven kernel 替换；Node 保持 DB/file/application owner |
| Host callback 与 service command 互相等待 | 死锁或长事务 | host IO 不在 DB transaction 内；请求关联和超时 |
| 过早拆仓库 | contract 改动碎片化 | 同仓库稳定协议，后续独立发布 |
| 为 portability 降低领域模型质量 | 大量宿主分支 | ports/adapters 和 capability negotiation |
| 第二阶段与第一阶段交叉大改 | 回归难定位 | 阶段门禁、稳定后再迁移 |
| 临时兼容层永久存在 | 重复 SSOT | 临时 adapter 有删除任务和退出门禁 |
| Topic file 与 Zotero mirror 再次漂移 | 恢复语义不清 | canonical file 单一真源、mirror receipt/diagnostic |

## 14. 决策记录

| ID | 决策 | 状态 |
| --- | --- | --- |
| LH-001 | Synthesis 最终由独立本地服务承载完整应用用例和 DB | 已确认 |
| LH-002 | Topic canonical 文件是真源，Zotero note 是 mirror | 已确认 |
| LH-003 | TypeScript/Node、同仓库、插件托管、per-profile sidecar | 已确认 |
| LH-004 | Synthesis Service 不注册为 agent provider | 已确认 |
| LH-005 | 第一阶段完成后再进行全插件模块重构 | 已确认 |
| LH-006 | Electron 复用 contracts/core，不复用 Zotero shell 内部代码 | 目标决策 |
| LH-007 | 不直接读写运行中的 Zotero SQLite | 目标决策 |
| LH-008 | Synthesis Runtime 随插件分发且不依赖系统 Node/PATH | 已确认 |
| LH-009 | Node 主进程是控制面与单一写入者，重计算进入受控 worker pool | 已确认 |
| LH-010 | Rust 只按 benchmark 替换纯计算 kernel，不拥有领域持久化或宿主副作用 | 已确认 |

## 15. 规划工件和治理

本计划是长期方向 SSOT。实施时：

1. 每个可独立验证的迁移单元建立 OpenSpec change；
2. active `doc/**` 和 `openspec/specs/**` 只描述当前已实现状态，不提前伪装未来状态；
3. 本计划和第一阶段计划可以描述目标与迁移；
4. 完成一个阶段后更新本计划的决策和门禁状态；
5. 过时的实施记录归档，不与 active runtime 文档混写；
6. release、protocol、schema 和 package 版本分别管理，不使用一个版本号替代兼容协商。

## 16. 下一步

当前唯一应进入实施设计的范围是第一阶段。具体 workstreams、协议草案、迁移顺序、测试矩阵、cutover 和验收标准见：

- `artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`

第一阶段实施前，建议创建一个 umbrella OpenSpec change 记录总边界，再按可独立交付的迁移单元拆分 changes，避免用一个超大 change 同时承载数月工作。

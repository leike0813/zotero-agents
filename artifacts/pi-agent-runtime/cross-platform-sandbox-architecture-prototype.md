# 跨平台可信原生执行架构

状态：issue #18 已确认的 MVP 架构。

研究截面：2026-08-26。

关联决策：[Select the cross-platform sandbox architecture](https://github.com/leike0813/zotero-agents/issues/18)

架构决策：[Use policy-mediated native execution for built-in Pi tools](../../docs/adr/0002-policy-mediated-native-agent-execution.md)

三平台 Strong Sandbox 的研究仍保留在[一手研究](./cross-platform-sandbox-primary-research.md)与 [Zotero-hosted 可行性矩阵](./zotero-hosted-sandbox-feasibility.md)中，但不再阻塞 MVP。

## 决策

内置 Pi Agent Runtime 使用宿主原生 Shell。Tool Gateway 在启动命令前检查当前 Agent Capability Envelope；包络内请求自动执行，包络外请求暂停并申请增量授权。

MVP 不自研操作系统沙箱，也不引入虚拟 Shell、受限解释器或另一套命令语言。Windows、macOS 和 Linux 使用各自的原生 Shell 与用户已经安装的命令。用户看到的工具接口保持一致。

这是一套基于信任的策略化执行机制。它信任 Agent 会如实声明命令的路径和网络意图，也信任 Agent 不会主动绕过 Tool Gateway。它主要处理恶意指令注入造成的越权请求，不抵抗已经失陷的 Agent、恶意原生程序或操作系统漏洞。

## 威胁模型

系统信任：

- 内置 Pi Agent Runtime 与 Tool Gateway；
- 用户已经批准的 Workflow 版本与 Capability Envelope；
- Agent 遵守系统指令、申报实际 effect，且不故意混淆命令来绕过审批；
- 用户本机已经安装并主动授权使用的软件。

系统不信任：

- 文献正文、PDF、网页、仓库文件、附件和工具输出中的指令；
- 模型生成或普通输入文件中的 Workflow 权限声明；
- 未经用户或项目策略授予的命令、路径和网络能力；
- Workflow 更新后新增的权限要求。

MVP 防范以下风险：

- 注入内容诱导 Agent 读取或修改工作区外文件；
- 注入内容诱导 Agent 调用 Workflow 未声明的命令；
- 注入内容诱导 Agent 访问未授权的网络目标、上传数据或访问本机服务；
- 权限声明在运行中被普通数据、模型文本或工具结果扩大。

MVP 不承诺拦截原生程序隐式读取用户配置、通过自身插件机制执行代码，或发起命令文本中不可见的连接。没有 OS 沙箱时，这些行为仍拥有当前用户权限。

## 执行路径

```text
Workflow command/network declaration
                 |
                 v
       User or project grant
                 |
                 v
       Agent Capability Envelope
                 |
                 v
Pi Agent -> Tool Gateway -> request preflight
                              |
                 +------------+------------+
                 |                         |
                 v                         v
           within envelope          outside envelope
                 |                         |
                 v                         v
       Trusted Native Executor       approval request
                 |                         |
                 +------------+------------+
                              |
                              v
                        Native Shell
```

Tool Gateway 是唯一入口。Pi 默认工具、Workflow 回调和 UI 不能绕开 Gateway 直接创建 Shell 子进程。Zotero Native Tools 仍经 capability broker 使用稳定 DTO，不向 Shell 暴露 Zotero 运行时对象。

## 权限形成

Workflow 只能声明所需权限，不能授予权限。Workflow 的声明与版本摘要进入审批；普通输入文件和模型输出不能改写它们。

运行时权限取以下交集与增量授权：

```text
effective envelope =
  workflow requested capabilities
  intersect user or project grant
  plus runtime incremental grants
```

增量授权可以只覆盖当前调用、本次运行或当前 Workflow 版本。Workflow 版本、声明内容或用户策略变化后，旧授权不再覆盖新增能力。

拒绝一次请求只终止该请求。Gateway 不得改写命令、缩小参数后静默重试，也不得自动申请更宽权限。

## Workspace Scope

Workspace Scope 是当前 owner 获得授权的文件系统根集合。它可以包含：

- 受管 Agent 工作区；
- scratch；
- 只读运行资源；
- 显式关联的产物；
- 用户信任的 External Workspace。

Agent 可以在具有读写权限的 scope 内自由操作，无需逐文件审批。命令显式引用 scope 外路径时，Gateway 请求增量授权。相对路径按命令的固定 cwd 解析；`..`、绝对路径、Shell 重定向和命令替换都参与预检。

原生程序可能从默认位置隐式读取配置、凭据、动态库或插件。MVP 只能检查 Agent 可见且申报的访问，不能把 Workspace Scope 描述成内核强制的文件边界。

## 预授权命令集

Workflow 声明运行所需的命令，用户或项目策略批准后形成绑定 Workflow 版本的 Preauthorized Command Set。集合内命令可以自动执行；集合外命令触发审批，但不会永久禁止。

命令解析遵守以下规则：

- 可执行文件从受控 PATH 解析，工作区不进入可执行文件搜索路径；
- Shell 管道、命令替换和静态嵌套命令递归检查；
- `source`、`eval`、动态命令字符串和无法静态判断的调用标为 opaque；
- Python、Node.js、嵌套 Shell、包管理器和可加载插件的工具属于 Opaque Execution；
- 命令已预授权不代表其显式工作区外路径或网络意图也已授权。

Opaque Execution 可以绑定 Workflow 版本一次性授予。审批必须说明它可能隐藏文件访问、子进程和直接网络行为。系统不尝试通过检查脚本文本来证明这类行为安全。

## Shell 调用合同

Shell 调用需要携带脚本、cwd 和 Agent 声明的 effect。下面的 DTO 只表达外部合同，不规定具体 TypeScript 文件或实现类：

```ts
type NativeShellRequest = {
  script: string;
  cwd: WorkspaceReference;
  declaredCommands: string[];
  pathIntent: {
    read: PathReference[];
    write: PathReference[];
    unknown: boolean;
  };
  networkIntent:
    | { mode: "none" }
    | { mode: "brokered-web-read"; origins: string[] }
    | { mode: "brokered-service"; connectionId: string; operations: string[] }
    | {
        mode: "direct";
        direction: "download" | "upload" | "unrestricted";
        destinations: string[];
      }
    | { mode: "local"; destinations: string[] };
};
```

Gateway 对可识别命令进行静态复核。Agent 声明与命令文本冲突时，使用权限更宽的一侧进行审批；无法判断时标为 opaque 或 unrestricted。静态分析是注入防护和审批解释工具，不是原生进程行为证明。

## 网络权限

网络分为 Brokered Web Read、Brokered Service Access、Direct Native Network 和 Local Network。四者不能相互隐式包含。

### Brokered Web Read

公开资料搜索与抓取走 Tool Gateway。Workflow 声明 origin，用户批准后，Broker 实施以下边界：

- 默认只使用 HTTPS；
- 按 scheme、host 和 port 匹配 origin；
- 每次重定向重新检查目标；
- DNS 解析后拒绝 loopback、private 和 link-local 地址；
- 不携带 Cookie、用户凭据或任意认证头；
- 限制响应大小、时长和重定向次数。

Brokered Web Read 可以提供 Agent 需要的大部分搜索和下载能力，不授予 Shell 原生 socket 权限。

### Brokered Service Access

认证服务通过 connection 加稳定操作名授权，例如 `repository.read`、`repository.push`、`issue.read` 或 `issue.write`。凭据由 Broker 按 connection 和操作绑定，不进入 Shell、普通环境或 Agent 上下文。

Workflow 只能申请 connection 类别与操作。用户建立或选择实际 connection，并决定是否授予当前 Workflow 版本。

### Direct Native Network

Git、npm、pip、curl、Python 和其它原生程序可以直接使用宿主网络。Agent 必须声明预期 destination 与以下 direction：

- `download`：预期从远端取得数据；
- `upload`：可能发送工作区内容或改变远端状态；
- `unrestricted`：无法可靠判断，或允许任意双向通信。

Gateway 可以校验 `git fetch`、`git push`、显式 URL 等可识别意图。destination 用于授权、提示与审计，不是可强制的域名边界。原生进程一旦启动，仍可能连接其它地址。

允许 Opaque Execution 时，如果没有强制网络边界，就必须同时承认该执行可能使用 Direct Native Network。产品不得显示成“已授权解释器但已禁止解释器联网”。

### Local Network

以下访问需要单独授权：

- loopback 地址；
- RFC 1918 私网与 IPv6 私网；
- link-local 地址；
- `.local` 主机；
- 本机服务端口、Unix socket 和 Windows named pipe。

普通互联网授权不包含 Local Network。Brokered Web Read 应在 DNS 和每次重定向后实施该边界；原生 Shell 中的 Local Network 仍是受信 Agent 必须申报的意图。

## 批准与审计

审批界面应回答四个问题：

1. 哪个 Workflow 版本提出请求；
2. 哪条命令或哪项 opaque 能力将被使用；
3. 哪些路径、网络 destination 和远端 effect 超出当前包络；
4. 授权只覆盖当前调用、本次运行还是当前 Workflow 版本。

对于 Direct Native Network，界面必须说明 destination 不是强制边界。对于 Opaque Execution，界面必须说明进程可能隐式读取宿主配置、启动子进程或联网。

审计记录 owner、Workflow 版本摘要、请求、包络摘要、审批范围、开始与终态。普通日志不得持久化 secret、认证头或完整敏感文件内容。

## 环境、资源与生命周期

Trusted Native Executor 仍实施基础运行卫生：

- cwd 固定在 Workspace Scope 中；
- 默认环境不继承 Zotero、provider 和插件持有的 secret；
- 命令输入、输出和执行时长有界；
- cancel、timeout 和 Zotero shutdown 尝试回收进程树；
- 命令结束后记录可观察的工作区文件变化。

这些措施减少误操作和泄漏面，不构成 OS 隔离。某个平台只能 best effort 回收后代进程时，状态与诊断必须如实反映，不能签发 Strong 声明。

## 失败与恢复

- 权限不足返回结构化 `approval_required` 或 `permission_denied`；
- 用户拒绝授权后，本次调用终止，Agent 可以选择不需要该能力的其它方案；
- Shell 启动失败、超时、取消和非零退出保持不同终态；
- mutation、upload 或状态未知的命令不得自动重放；
- Workflow 权限变化不会追溯扩大已有运行的包络。

## 未来 Strong Executor

Tool Gateway 可以在未来把同一个 Native Shell Request 交给经过验证的 OS、容器或 VM executor。Strong Executor 必须单独证明文件、网络、环境、资源和子进程边界，并返回可验证 receipt。

Linux、macOS 和 Windows 的候选机制继续由三份平台报告跟踪。Strong Executor 是增强项，不改变 Trusted Native Execution 的工具接口，也不成为内置 Pi Agent Runtime 的可用前提。

## MVP 验收场景

| 场景 | 预期结果 |
| --- | --- |
| `rg -n TODO .`，`rg` 已授权且 cwd 在 workspace | 自动执行 |
| `cat ~/.ssh/id_rsa`，`cat` 已授权 | 因显式越界路径请求审批 |
| `git status`，`git` 已授权且无网络意图 | 自动执行 |
| `git fetch origin`，Direct download 未授权 | 请求网络增量审批 |
| `git push origin`，只有 Direct download | 请求 upload 审批 |
| `curl` 访问未声明目标 | 请求 Direct Network 审批 |
| `python script.py`，未授予 Opaque Execution | 请求 opaque 能力审批，并说明潜在网络与宿主访问 |
| Brokered Web Read 重定向到 loopback | Broker 拒绝 |
| Workflow 更新并增加命令或网络需求 | 新增权限重新审批 |
| 文献内容要求修改 Workflow 声明 | 声明保持不变，请求按现有包络判断 |

## 结论

MVP 采用 Trusted Native Execution。工作区内按 scope 自由读写，显式越界访问需要审批；Workflow 预申请命令与网络能力，用户授权后进入 Capability Envelope；Brokered Network 提供可强制的细粒度边界，Direct Native Network 使用 download、upload、unrestricted 意图授权，Local Network 独立处理。

这套架构保留现代 Agent 依赖的原生 Shell 与命令生态，同时对恶意指令注入设置独立于模型文本的权限边界。它不使用“沙箱”描述受信执行，也不把无法强制的域名或文件范围包装成安全保证。

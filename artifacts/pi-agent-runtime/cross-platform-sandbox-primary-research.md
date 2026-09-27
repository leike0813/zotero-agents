# 可选 Strong Sandbox Executor 一手研究

研究截面：2026-08-26。本文保存 Strong Sandbox 的平台事实与候选机制，不是当前 MVP 架构，也不把文中的 DTO 解释成已经存在的 API。当前决策见[跨平台可信原生执行架构](./cross-platform-sandbox-architecture-prototype.md)与 [ADR 0002](../../docs/adr/0002-policy-mediated-native-agent-execution.md)。

## 研究结论

如果未来增加能抵抗恶意原生代码的 Strong Executor，合理的研究基线是“能力驱动的深层 Module + 类型化 RPC seam + 平台 Adapter 注册表”：

```text
[Pi Runtime Session（Zotero 插件进程）]
          |
          | 唯一工具入口：AgentToolGateway.invoke()
          v
     [Tool Gateway]
       /       \
      /         \
 [Sandbox       [Zotero Native
  Executor]      Restricted Broker]
      |                 |
  跨进程、强制 OS/VM       宿主内、稳定 DTO、受控
  隔离；shell/file/网络     Zotero hostApi；无任意代码
```

Strong Executor 候选遵守以下条件：

1. Pi Runtime 只持有会话、模型循环、策略、审批和 Tool Gateway client，不直接调用 Node API。
2. 所有通用代码、shell、进程、文件和受策略约束的网络执行都经过跨进程 Sandbox Executor。`RuntimeCapabilityReceipt` 由 executor 建立并由宿主验证，证明本次实际采用的后端、范围和强制边界。
3. Zotero Native Tools 留在插件内的 Restricted Broker，只交换稳定 DTO。它们不是 Sandbox Executor 的“降级 shell”，也不暴露 `Zotero.Item`、窗口、数据库句柄或其它宿主对象。
4. 某次调用明确要求 Strong 时，后端不可建立、能力探测失败、receipt 过期或策略无法强制都必须返回结构化错误，不能把 Trusted Native Execution 冒充为 Strong。
5. Linux 适合先做原生强后端：bubblewrap 的 user/mount/PID/network namespace，加 seccomp、Landlock 和 cgroup v2。Windows 以 AppContainer + 显式 ACL + Job Object 为轻量强候选，以 Windows Sandbox/Hyper-V 为更宽的 VM 候选。macOS 以签名的 App Sandbox/XPC service 为系统原生强候选；需要大量现有宿主命令时，另接经过探测的 VM/容器 Adapter，不能把不受支持的命令行 Seatbelt 轮廓当作保证。
6. WASI/Wasmtime 适合作为 `wasm-component` Adapter，提供可移植、细粒度的文件 preopen、网络 host function 和燃料/epoch 预算；它只能执行 WASM module/component，不能直接覆盖宿主 ELF/PE/Mach-O 命令，也没有已标准化的通用 `exec`/子进程能力。它补充而不替代原生强 executor。

这些条件只约束未来声称 Strong 的 Adapter。MVP 使用 Trusted Native Execution，不签发 Strong receipt，也不等待这些平台机制完成。

## 当前边界与研究前提

以下事实来自本仓库的一手文档：

- 领域词汇把 Tool Gateway 定义为唯一受控入口；`Workspace Scope` 是 owner 获得授权的文件系统根集合；`Trusted Native Execution` 明确依赖 Agent 信任；这些词汇见 [`CONTEXT.md`](../../CONTEXT.md)。
- [`builtin-pi-agent-runtime-handoff-20260825.md`](../builtin-pi-agent-runtime-handoff-20260825.md) 记录了此前“Strong 不可用即 fail closed”的假设。ADR 0002 已取代该 MVP 执行结论；Zotero Native Tools 只交换稳定 DTO 的边界仍然有效。
- Pi Runtime 的持久化 owner 与 transcript 是项目事实源；低层 Pi 只是可重建的临时执行器，不应把 sandbox receipt 或运行状态扩展成第二套历史，见 [`docs/adr/0001-project-owned-pi-persistence.md`](../../docs/adr/0001-project-owned-pi-persistence.md)。
- 项目发布约束要求 Host Bridge CLI 七平台预构建采用 `host-bridge-cli-prebuilds` 内容寻址集合；workflow、校验、receipt、同步和恢复脚本不得污染 CLI build fingerprint；正式发布须显式 dispatch，见 [`AGENTS.md`](../../AGENTS.md)。现有实现也把 `buildFingerprint`、`binaryAggregateSha256`、平台二进制和 release manifest 作为可验证身份，见 [`scripts/host-bridge-cli-release-governance.mjs`](../../scripts/host-bridge-cli-release-governance.mjs) 与 [`scripts/sync-host-bridge-cli-prebuilds.ts`](../../scripts/sync-host-bridge-cli-prebuilds.ts)。
- 插件构建把 `addon/bin/**/*` 纳入产物，并使用 GitHub release update URL，见 [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts)。这提供了“随 XPI 带 platform/arch helper”的既有打包 seam，但不表示 Sandbox Executor 已经存在。

## 1. 可选 Strong Module、Interface 与 seam

### 1.1 Module 分工

未来 Strong Executor 可以使用以下高内聚 Module：

| Module | 唯一职责 | 不应知道的内容 |
| --- | --- | --- |
| `PiRuntimeSession` | 临时 session、turn、取消、事件归一化、从 project-owned transcript 重建状态 | OS sandbox 参数、host path、AppContainer SID、Landlock 规则、Zotero 对象 |
| `AgentToolGateway` | 工具目录、能力包络、审批、receipt 匹配、审计、统一错误；路由到两个 trust domain | Pi 内部 tool 类型、平台命令行、原生宿主对象 |
| `SandboxExecutor` | 跨进程建立 scope、执行通用代码/文件/shell/受限网络、回收进程树 | UI 文案、Pi provider、Zotero hostApi |
| `ZoteroNativeBroker` | 在宿主内执行明确的 Zotero 操作并返回 DTO | executor 的 namespace/VM 细节、原始对象跨边界 |
| `RuntimeCapabilityVerifier` | 检查 receipt 的身份、版本、scope digest、网络/资源/进程证据 | 具体 UI 和模型 prompt |
| `ExecutorDistribution` | 平台/架构包、签名、版本、fingerprint、升级/回滚元数据 | 单次 ToolRequest 的业务语义 |

### 1.2 类型化 Interface（设计伪代码）

下面的 TypeScript 只是 DTO 草图；它不应直接导入 Zotero 7/9 插件里的 Node-only 类型或 `child_process`。

```ts
type OwnerRef =
  | { kind: "pi-conversation"; id: string }
  | { kind: "pi-skill-run"; id: string };

type SandboxStrength = "strong" | "restricted";
type Enforcement = "hard" | "soft" | "unsupported";

type WorkspaceRoot = {
  rootId: string;
  // 模型、日志和 transcript 只见 virtualPath；hostPath 只存在于受保护的 adapter context。
  virtualPath: "/workspace" | "/scratch" | "/resources" | "/external";
  kind: "managed" | "scratch" | "readonly-resource" | "external";
  access: "read-only" | "read-write";
  canonicalIdentityDigest: string;
  hostReference: string; // 不可由模型构造的 opaque reference
};

type WorkspaceScope = {
  scopeId: string;
  owner: OwnerRef;
  roots: WorkspaceRoot[];
  cwdRootId: string;
  trust: "untrusted" | "trusted";
  policyDigest: string;
};

type NetworkPolicy = {
  mode: "deny" | "proxy";
  allowedOrigins: Array<{
    scheme: "https" | "http";
    hostname: string; // exact DNS name；不接受隐式通配
    port: number;
  }>;
  dns: "deny" | "proxy-only";
  blockLoopback: boolean;
  blockLinkLocal: boolean;
  blockPrivateAddress: boolean;
  followRedirects: "deny" | "revalidate-each-hop";
  rawSockets: "denied" | "proxy-only";
};

type ResourcePolicy = {
  wallTimeMs: number;
  cpuTimeMs?: number;
  memoryBytes?: number;
  processCount?: number;
  openFileCount?: number;
  outputBytes: number;
  scratchWriteBytes?: number;
  enforcement: Partial<Record<
    "wallTime" | "cpu" | "memory" | "processes" | "openFiles" | "output" | "scratch",
    Enforcement
  >>;
};

type SandboxToolRequest = {
  requestId: string;
  owner: OwnerRef;
  scopeId: string;
  receiptId: string;
  tool: "exec" | "read" | "write" | "edit" | "search" | "fetch";
  // 只接受虚拟路径；executor 通过 scope root handle 解析。
  cwd?: string;
  path?: string;
  argv?: string[];
  shell?: "none" | "posix-sh" | "powershell";
  inputBytes?: number;
  network?: NetworkPolicy;
  limits?: ResourcePolicy;
};

type RuntimeCapabilityReceipt = {
  schema: "zotero-agents.runtime-capability-receipt.v1";
  receiptId: string;
  owner: OwnerRef;
  executorInstanceId: string;
  executorVersion: string;
  protocolVersion: string;
  platform: {
    os: "linux" | "macos" | "windows";
    arch: string;
    kernelOrBuild: string;
  };
  strength: SandboxStrength;
  backend: {
    kind:
      | "linux-bwrap-landlock"
      | "linux-oci"
      | "macos-xpc-app-sandbox"
      | "macos-vm"
      | "windows-appcontainer"
      | "windows-sandbox-vm"
      | "wasi-wasmtime";
    version: string;
    binaryDigest: string;
  };
  scope: {
    scopeId: string;
    roots: Array<{
      rootId: string;
      virtualPath: string;
      access: "read-only" | "read-write";
      canonicalIdentityDigest: string;
    }>;
    cwd: string;
  };
  network: NetworkPolicy & {
    observed: "verified" | "not-verified";
    effective: "deny" | "proxy";
  };
  environment: {
    inherit: "none" | "allowlist";
    names: string[];
    secretInjection: "none" | "ephemeral-reference";
    scrubVerified: boolean;
  };
  process: {
    childrenInheritRestrictions: boolean;
    killTree: "verified" | "not-verified";
    breakaway: "denied" | "unknown";
  };
  resources: {
    wallTime: Enforcement;
    cpu: Enforcement;
    memory: Enforcement;
    processes: Enforcement;
    openFiles: Enforcement;
    output: Enforcement;
    scratch: Enforcement;
  };
  evidence: {
    probeId: string;
    canaries: Record<string, "blocked" | "allowed" | "verified" | "failed">;
    issuedAt: string;
    expiresAt: string;
  };
  attestationDigest: string;
};

interface AgentToolGateway {
  describe(owner: OwnerRef): Promise<ToolCatalog>;
  prepareScope(input: {
    owner: OwnerRef;
    scope: WorkspaceScope;
    requested: { strength: SandboxStrength; network: NetworkPolicy; limits: ResourcePolicy };
  }): Promise<RuntimeCapabilityReceipt>;
  invoke(request: SandboxToolRequest | ZoteroToolRequest, signal?: AbortSignal): AsyncIterable<ToolEvent>;
  cancel(requestId: string): Promise<void>;
}

interface SandboxAdapter {
  readonly id: string;
  probe(input: ProbeRequest): Promise<ProbeResult>;
  prepare(input: PrepareRequest): Promise<RuntimeCapabilityReceipt>;
  invoke(input: SandboxToolRequest, signal?: AbortSignal): AsyncIterable<ToolEvent>;
  cancel(requestId: string): Promise<void>;
  close(scopeId: string): Promise<void>;
}
```

`ZoteroToolRequest` 应单独定义，且只允许 schema 注册过的 capability 和稳定 DTO；它不能被赋值为 `SandboxToolRequest`，这样在类型层保留两个 trust domain。

### 1.3 不变量

本节是不可信代码隔离 Adapter 声称 Strong 的门槛，不适用于 Trusted Native Execution。

- **唯一入口**：Pi Runtime、workflow、UI 和 skill 都只能调用 `AgentToolGateway`。没有第二个“临时 shell 回调”、Pi default tool 或 host callback 旁路。
- **跨进程**：交给 Strong Executor 的 `exec`、shell、解释器、用户脚本、可执行文件和 executor 扩展都必须在 executor 进程或 VM 中执行。
- **receipt 先于执行**：没有 receipt、receipt 与 owner/scope/policy/binary digest 不匹配、receipt 过期或关键 canary 未验证时，executor 拒绝请求；Gateway 不把配置声明当作观察证据。
- **范围不可扩大**：ToolRequest 只能引用已声明的虚拟路径、root handle、精确网络 origin 和能力包络；请求中不能携带任意 host path、AppContainer SID、Unix socket、代理凭据或平台命令行参数来扩大范围。
- **Strong fail closed**：请求明确要求 Strong 而边界无法建立时，只返回 `sandbox_unavailable` 或 `sandbox_failed`。Trusted Native Execution 是另一种明确标识的执行模式，不是 Strong fallback。
- **Restricted 不是 Strong**：Restricted Broker 可以继续提供封闭的 DTO 工具，但必须在目录、UI、receipt 和审计中标为 `restricted`；它永远不提供任意代码、shell 或宿主任意文件路径。
- **子进程同域**：shell、解释器、孙进程和后台进程继承同一文件/网络/环境/资源边界；取消、超时、Zotero 关闭和 executor 崩溃都必须回收整棵树，无法证明时拒绝强执行。
- **网络最小权限**：默认 deny。要启用网络，必须是精确 origin + 端口并经 proxy/host function；每次重定向、DNS 结果和私网/loopback/link-local 检查重新验证。API key 不进入通用 executor 环境。
- **环境最小权限**：默认不继承 Zotero、用户 shell、Pi 或 provider 的全量环境；`.env`、认证文件和 host profile 不自动挂载。必要 secret 只用一次性 opaque reference，禁止命令行、输出、日志和 crash dump 落盘。
- **路径按 capability 解析**：不能用字符串前缀判断“在 workspace 内”。Adapter 必须用目录句柄、OS ACL、mount/preopen 或等价机制重新解析，并针对 symlink、junction、reparse point、`..`、mount crossing 和 TOCTOU 做 canary。
- **资源可见且有界**：每个 receipt 明确报告 wall time、CPU、内存、进程数、打开文件、输出和 scratch 的 `hard/soft/unsupported` 状态；策略要求 hard 而后端只支持 soft 时拒绝。
- **模型不可伪造证明**：receipt 由 executor 通过本地认证 RPC 返回，审计保存摘要/签名或 MAC、binary digest、探测结果和时间；模型生成的文本、项目配置和用户 prompt 不能替换它。
- **插件环境无 Node**：Zotero 7/9 的插件 bundle 只含 browser-compatible Pi adapter 和 IPC client；native helper/Wasmtime 可用 Rust/C/Swift/Win32 等自身运行时，但不把 Node 打进插件。

### 1.4 结构化错误

建议沿用仓库既有“类别 + retryable + state change + safe next actions”的风格，不锁定完整文案：

```ts
type SandboxErrorCode =
  | "sandbox_unavailable"
  | "sandbox_failed"
  | "capability_mismatch"
  | "stale_receipt"
  | "scope_invalid"
  | "scope_escape"
  | "path_not_allowed"
  | "network_policy_unenforceable"
  | "network_denied"
  | "resource_limit_unsupported"
  | "resource_exceeded"
  | "process_tree_unknown"
  | "executor_crashed"
  | "executor_protocol"
  | "executor_update_pending"
  | "tool_not_allowed"
  | "approval_required"
  | "workspace_untrusted";

type ToolGatewayError = {
  code: SandboxErrorCode;
  category: "capability" | "permission" | "validation" | "connection" | "internal";
  retryable: boolean;
  stateChange: "unchanged" | "changed" | "unknown";
  handleConsumption: "unconsumed" | "consumed" | "unknown";
  details: {
    operationId: string;
    missing?: string[];
    backend?: string;
    recovery?: string[];
  };
};
```

`stateChange: "unknown"` 适用于 executor 崩溃或取消发生在结果写回之前；调用方不能因为“没有收到结果”就自动重放一个可能有副作用的命令。它与项目对 tool receipt/recovery 的约束一致，且不依赖完整错误句子。

## 2. Caller 示例

### 2.1 Pi Conversation 的模型回路

```ts
const catalog = await gateway.describe(owner);
const receipt = await gateway.prepareScope({
  owner,
  scope: declaredScope,
  requested: { strength: "strong", network: denyAll, limits: policy },
});

for await (const event of gateway.invoke(
  {
    requestId,
    owner,
    scopeId: declaredScope.scopeId,
    receiptId: receipt.receiptId,
    tool: "exec",
    cwd: "/workspace",
    argv: ["rg", "--json", "term", "."],
    shell: "none",
  },
  abortSignal,
)) {
  // 仅接收 bounded stdout/stderr、exit、receipt 摘要和结构化 error。
  publishToPiTranscript(event);
}
```

调用方不需要知道当前是 bwrap、AppContainer、Windows Sandbox、XPC 或 Wasmtime；如果强 receipt 建立失败，它必须把 `sandbox_unavailable` 记录为不可执行状态，而不是把相同 argv 送到插件进程。

### 2.2 Workflow 要求强边界

```ts
const receipt = await gateway.prepareScope({
  owner: piSkillRun,
  scope: runScope,
  requested: {
    strength: "strong",
    network: { mode: "proxy", allowedOrigins: [{ scheme: "https", hostname: "example.org", port: 443 }],
      dns: "proxy-only", blockLoopback: true, blockLinkLocal: true,
      blockPrivateAddress: true, followRedirects: "revalidate-each-hop", rawSockets: "proxy-only" },
    limits: runResourcePolicy,
  },
});

if (receipt.strength !== "strong") {
  throw gatewayError("sandbox_unavailable");
}
await collect(gateway.invoke({
  requestId, owner: piSkillRun, scopeId: runScope.scopeId,
  receiptId: receipt.receiptId, tool: "fetch", path: "/workspace/input.json",
}));
```

`receipt.strength` 只表示已满足本次请求所需的能力；还要检查网络和每项资源的 enforcement，不能只检查字符串 `strong`。

### 2.3 强沙箱不可用时的 Restricted 路径

```ts
// 仍可以使用封闭 DTO 工具，但目录中没有 exec/shell。
await gateway.invoke({
  owner,
  requestId,
  tool: "zotero.library.search",
  input: { query: "sandbox", limit: 20 },
});

await gateway.invoke({
  owner,
  requestId,
  tool: "workspace.read",
  input: { scopeId, virtualPath: "/workspace/report.md", maxBytes: 128_000 },
});
```

如果模型要求 `exec`，Gateway 返回 `sandbox_unavailable`；它不能把这个请求改名为 `workspace.read`，也不能在 Zotero 进程用 `fetch`/文件 API 模拟 shell。

## 3. Seam 后隐藏的内容

| Seam | 对 caller 可见 | 必须隐藏 |
| --- | --- | --- |
| `AgentToolGateway` | tool name、版本化 input/output schema、owner、scope、receipt、结构化 error、bounded stream | Pi `ToolDefinition`/provider 类型、平台 argv、host path、OS token、proxy secret、Zotero 对象 |
| `SandboxExecutor` RPC | `SandboxToolRequest`、`ToolEvent`、`RuntimeCapabilityReceipt` | bwrap 参数、mount namespace、Landlock ruleset FD、seccomp BPF、cgroup path、AppContainer SID/DACL、Job handle、XPC entitlement、VM channel、Wasmtime Store |
| `WorkspaceScope` | virtual root 与 read/write effect | 真实绝对路径、bookmark 原文、目录句柄、junction/reparse details、Zotero profile 路径 |
| `NetworkPolicy` | exact origin、proxy-only/deny、redirect/地址规则 | proxy credentials、DNS socket、host network interface、底层 firewall rule |
| `ZoteroNativeBroker` | library/context/attachment 等稳定 DTO 和 schema errors | `Zotero.Item`、数据库连接、窗口、XUL/hostApi、原始对象引用 |
| `RuntimeCapabilityReceipt` | 已验证的能力、版本和探测摘要 | 可复用 secret、完整 host env、可直接重放的进程句柄、内部路径和未脱敏命令 |

这是一个有足够 **Depth** 的 seam：调用方只表达“在声明的 scope 里执行何种 effect”，而不是复制每个平台的安全规则。**Locality** 也保持清晰：策略和审批在插件内，强制边界和执行在外部进程，Zotero 数据访问在 Restricted Broker；任何一个平台 Adapter 都不能把三个 locality 混在一起。

## 4. Adapter 候选

```text
SandboxAdapterRegistry
  ├─ LinuxBwrapLandlockAdapter      (Strong)
  ├─ LinuxOciAdapter                (Strong，可选外部 runtime)
  ├─ MacXpcAppSandboxAdapter        (Strong，工具集受 App Sandbox 约束)
  ├─ MacVmAdapter                    (Strong，外部 VM/容器可用时)
  ├─ WindowsAppContainerAdapter    (Strong，AppContainer + Job)
  ├─ WindowsSandboxVmAdapter       (Strong，Windows Sandbox/Hyper-V)
  └─ WasmtimeComponentAdapter      (Strong，仅 WASM capability)
```

另有 `RestrictedBrokerAdapter`，但它不是任意代码 adapter；它只为 `workspace.read/write/search`、`web.fetch` 和 Zotero Native Tools 提供封闭、大小有界、策略内的 DTO 操作。

Adapter 选择顺序应按“满足请求的最小强制能力集合”而非固定平台字符串：先过滤 OS/arch、scope、网络、资源和 tool kind，再选择已通过 canary 的 backend。一个 backend 只能在 receipt 能证明所有 required dimensions 时声明 Strong。

## 5. 平台一手机制与候选实现

### 5.1 Linux：bwrap + namespace + seccomp + Landlock + cgroup v2

#### 一手事实

- bubblewrap 官方说明它总是创建新的 mount namespace，允许调用方精确决定可见文件系统；可使用 user、IPC、PID、network、UTS namespace 和 seccomp。network namespace 默认没有外部网络，只有 loopback。官方同时明确指出 bubblewrap 本身不是有固定安全策略的完整 sandbox，安全等级由传入参数决定，调用方负责模型。[bubblewrap README](https://github.com/containers/bubblewrap/blob/main/README.md)
- Linux 内核文档说明 Landlock 可以由非特权进程为自己及其未来子进程增加文件/网络限制；限制只能继续收紧，不能移除。Landlock ABI 应在运行时探测，内核文档明确鼓励按 ABI 选择已支持的能力。[Landlock userspace API](https://www.kernel.org/doc/html/latest/userspace-api/landlock.html)
- seccomp BPF 过滤器可以限制 syscall；若允许 `fork`/`clone` 与 `execve`，子进程继承同一 filter；安装前需要 `no_new_privs` 或相应权限。[Seccomp filter](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html)
- cgroup v2 暴露可用 controller；`cpu.max` 可限制 CPU bandwidth，`memory.max` 是内存 hard limit，`pids.max` 限制新任务创建/进程数。controller 是否可用必须读取运行时 hierarchy，而不能假定每台 Linux 都启用。[Control Group v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- Linux `openat2` 的 `RESOLVE_BENEATH`/`RESOLVE_IN_ROOT` 可将路径解析锚定到目录 FD；`RESOLVE_NO_MAGICLINKS`、`RESOLVE_NO_SYMLINKS` 和 `RESOLVE_NO_XDEV` 分别处理 proc magic link、symbolic link 与 mount crossing。[openat2(2)](https://www.man7.org/linux/man-pages/man2/openat2.2.html)

#### Strong Adapter

`LinuxBwrapLandlockAdapter` 启动一个独立的 Rust executor 或受控 bwrap supervisor：

1. 在 host 侧为每个 scope 打开并 canonicalize managed workspace、scratch、只读 resources；executor 只收到受保护的 root reference/必要的 host path，模型只看到 virtual path。
2. bwrap 建立空的 mount namespace；系统运行时以 read-only bind，`/workspace` 与 `/scratch` 以分别声明的权限 bind；不挂载 Zotero profile、插件目录、用户 home、SSH、`.git` 外部 worktree 或 D-Bus socket，除非未来有逐项批准的 capability。
3. 启用 user/PID/IPC/UTS/network namespace，`--clearenv` 等价的环境清理，`no_new_privs` 与最小 seccomp；必须关闭或验证所有 breakaway 路径。需要运行宿主命令时，命令和 interpreter 仍在这个 namespace 内，不得从 host Pi 直接 fork。
4. 用 Landlock 对最终 root/工具/资源做第二层文件和网络约束，并按运行 kernel ABI 只启用已探测且已测试的 rights。若策略要求的 ABI 或 `CONFIG_SECURITY_LANDLOCK` 不可用，不能把 bwrap 的 mount namespace 单独报告成同等级 Strong。
5. 用 cgroup v2 绑定 executor 和全部 descendants；至少配置 `pids.max`、`memory.max`、`cpu.max`（若请求要求 hard）；wall timeout、输出上限和取消由 supervisor 负责。cgroup controller 缺失时 receipt 标 `unsupported`，策略要求 hard 时拒绝。

网络默认 `CLONE_NEWNET` deny。要支持 exact-origin fetch，建议让 `fetch` 走 Gateway 维护的 proxy/typed host function；shell 不获得宿主网卡。若未来需要 shell 内网络，必须证明 proxy-only、DNS 不可绕过、redirect 每跳重审、私网/loopback/link-local 被阻断；只设置 `HTTP_PROXY` 环境变量不算强制。

#### 检测与 receipt 证据

- 探测 bwrap 版本、路径、实际启动结果、namespace 目录布局和 supervisor PID；拒绝“命令存在但参数失败”。
- 调用 Landlock ABI version probe；对 workspace 外路径、symlink/magic-link、rename/link、mount crossing 和只读 root 做真实 canary；结果写入 receipt。
- 检查 seccomp 安装成功，并用子进程 canary 验证 filter 继承；检查 `no_new_privs`。
- 检查 cgroup v2 是否可写、`cpu/memory/pids` controller 是否在当前 hierarchy 可用；设置并读取实际 limits，不能只记录期望值。
- 运行网络拒绝 canary（loopback、IPv4/IPv6 私网、link-local、Unix socket、代理绕过）和允许域名 canary；若无法观察有效网络结果，网络维度为 `not-verified`。
- 用 timeout/cancel/fork canary 验证整棵 process tree 已退出。任一 required canary 为 failed/unknown，返回 `sandbox_unavailable` 或 `sandbox_failed`。

#### 取舍

优点是无需 Node、可利用 Linux 原生能力、能运行现有 ELF/脚本工具，且 bwrap 常见于发行版；缺点是 namespace/userns/Landlock/cgroup 受发行版和管理员策略影响，bwrap 不自带固定政策，网络域名 allowlist 需额外 proxy。必须把“bwrap 可执行”与“本次 receipt 已证明边界”分开。

`LinuxOciAdapter` 可作为用户已有 rootless OCI runtime 的另一实现，优点是提供完整 rootfs/镜像与工具生态，代价是额外 daemon/runtime、镜像更新和用户配置；只有 executor handshake 和实际 canary 通过时才声明 Strong，不能在 OCI 缺失时回退到 host shell。

### 5.2 macOS：签名 App Sandbox/XPC；广泛 shell 用 VM/容器 Adapter

#### 一手事实

- Apple App Sandbox 通过 entitlement 限制文件、网络、硬件和用户数据；`com.apple.security.network.client` 是出站网络 entitlement，用户选择文件可授予 read-only/read-write。[App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)
- Apple 文档说明 sandboxed app 的 container 可读写；用户选中的文件/文件夹可通过 security-scoped URL/bookmark 延伸访问；使用 user-selected entitlement 不能因此运行 app bundle、container 或 app group 之外位置的程序。[Accessing files from the macOS App Sandbox](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox)
- Apple 对 child process inheritance 明确说明：`posix_spawn`/`NSTask` 子进程可继承父 sandbox 的静态 entitlement，但 child process 不提供 XPC 的安全性；XPC 是实现 privilege separation 的首选，运行时新增的 PowerBox 文件权限不会自动传给继承 child，需传数据或 bookmark。[Enabling App Sandbox](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)
- Apple XPC service 由 `launchd` 按需启动、崩溃后重启、空闲时终止；每个 XPC service 有自己的 sandbox，可用于 privilege isolation；服务默认运行在最受限环境，必须签名才能 sandbox。[XPC](https://developer.apple.com/documentation/xpc)；[Creating XPC Services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)
- Apple 支持对 XPC peer 做 team identity、signing identity 和 entitlement 检查，可把 launch constraints 作为代码签名/launchd 配置的一部分；未满足约束时内核/launchd 不启动进程。[XPC updates](https://developer.apple.com/documentation/updates/xpc/)；[Applying launch environment and library constraints](https://developer.apple.com/documentation/security/applying-launch-environment-and-library-constraints)
- Apple 的 `launchd` 文档提供 `SoftResourceLimits`/`HardResourceLimits` 示例，并建议由 launchd 配置 working directory、root directory 和资源，而不是在 daemon 中自行改环境。[Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)

#### Strong Adapter A：`MacXpcAppSandboxAdapter`

将一个签名的 per-client XPC service 放在 helper bundle 中，服务使用自己的最小 App Sandbox entitlement；插件通过 XPC/本地 IPC 发送 typed request。scope 进入 service 时传递用户已选择的 security-scoped bookmark 或由 host 受控转交的数据，不把任意路径字符串当作授权。

- shell 只允许调用随 helper bundle/受控 container 提供、已经过工具清单审计的命令；用户安装在任意目录的 host command 不因 `read/write` bookmark 自动获得可执行权限。
- helper 默认不请求 `network.client`；`fetch` 由单独的 network-enabled XPC/proxy 或 Gateway typed operation 处理，exact-origin、redirect 和私网策略在 proxy 里实现。不要给可以运行任意 shell 的 service 一个全局出站网络 entitlement，再声称域名 allowlist 已经成立。
- 使用 `xpc_connection_set_peer_*_requirement` 等机制验证服务只接受预期签名 peer；对每个 bookmark 做读取/写入 canary；服务崩溃或被 launchd 终止后，所有未完成请求置为 `state_unknown`，新请求重新 prepare。
- 资源以 launchd resource limits + supervisor wall/输出/进程回收为主；若某项资源只有 advisory/soft 语义，receipt 必须如实标注，不得借 App Sandbox 名义声称 CPU/内存 hard quota。

#### Strong Adapter B：`MacVmAdapter`

当产品目标是运行用户现有的大量 macOS/Linux 命令时，App Sandbox/XPC 的“只能运行受控 bundle/container 程序”的约束会牺牲工具覆盖面。可接一个用户已经安装且通过 handshake 的 VM/容器 runtime，将完整 executor 放入 guest；workspace 只以显式共享、默认 read-only 或一次性 scratch 方式传入，网络关闭或连接到 Gateway proxy。该 runtime 未安装、版本不匹配或 VM channel 无法证明时保持 disabled。它提供更广命令覆盖，但增加镜像、启动耗时、磁盘和更新面，不能作为所有 Mac 的内置前提。

#### Seatbelt 的边界

一些 agent 产品的文档把 Seatbelt 作为 macOS sandbox 后端，但 Apple 的公开开发者资料在此研究中明确、可长期依赖地描述的是 App Sandbox entitlement 与 XPC privilege separation。因而候选实现可以有一个实验性的 `MacSeatbeltAdapter`，但“发现某个命令/私有 profile 文件”不构成 Strong receipt；必须有版本锁定、签名 helper、真实路径/网络/子进程 canary 和可回归的系统支持矩阵。失败时走 `sandbox_unavailable`，不默认为 host shell。

#### 检测与取舍

- 检查 helper code signature、expected team/bundle identity、App Sandbox entitlement、XPC peer requirement 和 launch constraint；Apple 提供 `codesign` 验证 entitlement 的方式。[Protecting user data with App Sandbox](https://developer.apple.com/documentation/security/protecting-user-data-with-app-sandbox)
- 检查 bookmark 是否解析到声明 root、read/write effect 是否真实生效、workspace 外路径/别的 app container/符号链接是否被阻断。
- 检查 service 是否有不必要的 `network.client`、clipboard、device 或 keychain entitlement；网络 deny 的 canary 需在 helper 中真实执行。
- 启动子进程并验证 XPC/App Sandbox 限制继承；验证 timeout/cancel 后无残留。若需要 host-installed command 或硬资源/网络隔离超出 App Sandbox 能力，切换已安装的 VM Adapter，而不是静默取消边界。

优点是 Apple 支持的签名、XPC 和 entitlement 路径，信任边界清晰；缺点是动态外部 workspace、任意现有 host command、exact-domain raw shell network 和通用硬资源限制都比 Linux/VM 难，打包/签名/notarization 也增加发布成本。

### 5.3 Windows：AppContainer + ACL + Job Object；Windows Sandbox/Hyper-V 为 VM 候选

#### 一手事实

- Windows AppContainer token 有 package SID 和 capability SID；没有对应 capability 时不能访问网络/文件等资源；访问结果是传统 user/group ACL 与 AppContainer SID 的交集，进程以 Low Integrity 运行。[Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)
- Windows Job Object 可把进程加入 job、限制工作集/时间等资源，并以 `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` 在最后一个 job handle 关闭时终止 job 内所有进程；不允许 breakaway 才能持续监控整棵树。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)；[JOBOBJECT_BASIC_LIMIT_INFORMATION](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)
- Windows Sandbox 是基于 hypervisor 的 disposable VM，支持 Pro/Enterprise/Education，不支持 Home；需要硬件虚拟化。默认 networking 和 clipboard 等集成功能可能打开，必须由 `.wsb` 明确关闭。 [Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/)；[Install Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-install)
- Windows Sandbox 的 mapped folder 可以 read-only 或 read/write；官方警告 mapped host folder 可能被 sandbox 中的 app 影响，write mapping 在销毁后仍持久化到 host。它也提供 memory 配置。[Use and configure Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file)
- Windows 文档还提供一个 `Experimental_CreateProcessInSandbox`/`Experimental_CreateProcessAsUserInSandbox` API：AppContainer、BFS `fs_read_only`/`fs_read_write`、capabilities、proxy 等字段由 compiled sandbox spec 描述；文档标为 experimental，且不允许在 `app_container=false` 时假定这些字段有效。[Create Process In Sandbox APIs](https://learn.microsoft.com/en-us/windows/win32/secauthz/createprocessinsandbox)
- Windows process mitigation 可禁止 dynamic code；child-process policy 可禁止进程创建 child。它们是加固层，不等于 AppContainer/VM 文件和网络边界。[PROCESS_MITIGATION_DYNAMIC_CODE_POLICY](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-process_mitigation_dynamic_code_policy)；[PROCESS_MITIGATION_CHILD_PROCESS_POLICY](https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntddk/ns-ntddk-_process_mitigation_child_process_policy)

#### Strong Adapter A：`WindowsAppContainerAdapter`

由受信 native helper 创建每个 owner/run 独立的 AppContainer profile，使用 package SID 对 `/workspace`、`/scratch` 做显式 DACL，默认没有 network capability；helper 通过 `CreateProcess`/startup attributes 启动被约束的 executor，并把全部 descendants 放入 Job Object。

- 只允许 bundle 内/受控目录中的命令，明确 `PATH`；不能假定用户 PowerShell、Git、Python 或其它 host command 能在 AppContainer 内访问。若 tool 需要它们，改用 Windows Sandbox/VM guest 或把经过审计的工具随 helper 分发。
- raw shell 网络默认关闭；AppContainer 的 `internetClient` 是广泛的 capability，不等于 exact-domain allowlist。网络 tool 应走 typed proxy；若启用 direct network，只有经过 firewall/proxy/地址 canary 后才可在 receipt 中报告对应能力。
- Job Object 设置 process/time/memory/output 相关限制，禁止 `BREAKAWAY`；close/cancel 时用 `TerminateJobObject`。可额外启用 dynamic-code/child-process mitigation，但要根据工具需要逐项验证。
- `Experimental_CreateProcessInSandbox` 可以作为 Windows 新版本的增强 Adapter：动态检查 `processmodel.dll` export、sandbox spec version 和实际字段效果。由于 API 是 experimental，不能让它成为所有 Windows 的唯一强保证。

#### Strong Adapter B：`WindowsSandboxVmAdapter`

在支持的 Windows edition/virtualization 上启动 Windows Sandbox/Hyper-V guest，guest 内运行一次性 executor agent；host 与 guest 只通过认证 RPC 通道通信。`.wsb` 应显式设 networking disabled、clipboard/audio/video/printer/vGPU 按最小权限、mapped workspace read-only 或专用 scratch；不要把 Zotero profile、host home 或 plugin installation directory 写映射进去。guest agent handshake 返回 OS build、agent version、scope mapping、memory 和网络状态。

Windows Sandbox 能提供更广的 Windows userland 命令覆盖和 hypervisor kernel isolation，但 edition、BIOS、启动耗时和最小内存要求会减少普适性；mapped write 持久化也要求结果输出只通过受控 channel 或专用 scratch 复制。

#### 检测与取舍

- 检查 architecture、OS edition、AppContainer profile/package SID、低完整性 token、scope DACL；用 host-outside canary 验证既不可读也不可写。
- 检查 Job Object 归属、`KILL_ON_JOB_CLOSE`、breakaway policy、process tree 和取消；不允许只杀父进程后报告成功。
- 检查 network capability 是否为空；如果用了 proxy，验证 direct socket、DNS、loopback/私网和 redirect；不能只检查 `.wsb` 文本。
- Windows Sandbox Adapter 检查 feature/virtualization、`.wsb` 启动、guest handshake、mapped folder effect、network off 和 memory；缺失时只返回 unavailable。
- experimental API 检查 export/spec/return code，并把实验性 backend/version 写入 receipt；遇到 unsupported 字段应失败而非忽略。

Windows AppContainer 的优点是系统原生、可按 SID/ACL 精确授权、无需 VM；缺点是命令/网络/动态 workspace 的覆盖比完整 VM 小。Windows Sandbox/Hyper-V 的优点是现有 Windows 命令覆盖广、隔离强；缺点是仅部分 edition、资源成本高、映射和 guest provisioning 复杂。

### 5.4 WASI / Wasmtime：可移植 capability runtime，不是现有 shell 的替代

#### 一手事实

- WebAssembly/WASI 官方仓库说明 WASI Preview 2 已 stable，是以 WIT 定义的 modular API 集合，并强调可虚拟化和更有表现力的类型系统。[WASI main README](https://github.com/WebAssembly/WASI/tree/main)
- Wasmtime `run` 执行 WebAssembly module 或 component；component 的 CLI 入口是 `wasi:cli/run`，不是宿主 PE/ELF/Mach-O 任意可执行文件。[Wasmtime CLI options](https://docs.wasmtime.dev/cli-options.html)
- Wasmtime WASI 默认没有 filesystem access，必须显式 preopen directory；preopen 可以设 read-only/read-write，并阻止通过 `..` 走出 host directory。[WasiCtxBuilder](https://docs.wasmtime.dev/api/wasmtime_wasi/struct.WasiCtxBuilder.html)
- Wasmtime C API 文档说明 `wasi_config_allow_ip_name_lookup` 默认关闭；`wasi_config_inherit_network` 会把所有 host network addresses 交给 guest，二者都应显式配置。[Wasmtime WASI C API](https://docs.wasmtime.dev/c-api/wasi_8h.html)
- Wasmtime 提供 fuel（确定性）和 epoch（较低开销、非确定性）中断；epoch/fuel 不能自动唤醒阻塞在 host call 的 guest，blocking I/O 仍须由 embedder 的 async timeout/进程 supervisor 处理。[Interrupting Execution](https://docs.wasmtime.dev/examples-interrupting-wasm.html)；[Wasmtime Config](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html)
- 官方 WASI 项目的 `wasi:exec` issue 于 2026-03-07 讨论“执行现有多 binary 工具、shell 和 guest 启动 guest”的缺口，说明通用 WASI subprocess/exec 仍是提案讨论，不是可依赖的稳定通用接口。[wasi:exec issue](https://github.com/WebAssembly/WASI/issues/899)
- Wasmtime 的 precompiled module/component API 要求运行配置与编译配置匹配；官方警告不应把不受信任的 precompiled bytes 交给 unsafe deserialize，因为这可能导致宿主任意代码执行。[Pre-compiling Wasm](https://docs.wasmtime.dev/examples-pre-compiling-wasm.html)

#### WASI Adapter 的边界

`WasmtimeComponentAdapter` 可运行经过签名/校验的 WASM component，把 `/workspace`、`/scratch` 作为显式 preopen，把网络能力实现为 deny 或受控 host function；用 component digest、engine version、preopen digest、host function allowlist 和 fuel/epoch 配置写入 receipt。

它不能直接覆盖“现有命令”问题：

- `wasmtime run` 的输入是 `.wasm`/component；普通 ELF、PE、Mach-O 以及依赖宿主 libc/动态 loader 的 shell 命令不是 WASI module。
- 即使把一个 shell 编译成 WASI，shell 启动的每个命令也必须是另一个 WASI module/component，或依赖一个明确的 host `exec` adapter；后者重新进入 native executor，不能称为“WASI 自己覆盖了现有命令”。
- 因而 WASI 适合 portable parser、grep-like bounded transform、文档处理和用户提供的经验证 component；对于用户机器上已安装的 shell/编译器/脚本工具，仍需 Linux/Windows/macOS native/VM Adapter。

WASI 的优点是 guest 文件/网络 capability 很清晰、同一 component 可跨三平台、fuel 可作为可重复的计算预算；缺点是语言/工具生态和 subprocess/系统命令兼容性不足，engine 本身仍需由外部 executor 进程隔离，不能把宿主 helper 的过宽 host import 当作安全边界。

## 6. 统一的 Scope、网络、资源和检测契约

### Workspace Scope

`Workspace Scope` 应从 owner 记录和用户选择产生，包含 managed workspace、scratch、只读 runtime resources 以及经明确关联的 external workspace。它是“可挂载集合”，不是一个 `cwd` 字符串。

每个平台的 materialization：

| 平台 | read-only | read-write | 逃逸防护重点 |
| --- | --- | --- | --- |
| Linux | bwrap ro-bind + Landlock read rights + 目录 FD | rw bind + Landlock write/rename/truncate + cgroup scratch quota | `openat2` root anchoring、symlink/magic link、mount crossing、TOCTOU、外部 worktree |
| macOS | App Sandbox container/bookmark、XPC service entitlement | security-scoped bookmark 或 VM 专用 scratch | code signature、bookmark scope、app container、XPC peer、程序位置 |
| Windows | AppContainer BFS/DACL 或 VM read-only mapping | package SID DACL 或 VM 专用 scratch | canonical NT path、junction/reparse point、ACL race、mapped folder persistence |
| WASI | read-only preopen | read-write preopen | guest virtual path、preopen boundary、host function 不返回 raw handle |

规则：路径在 Gateway 先做 syntax/virtual-root 校验，在 Adapter 再做 canonical/open-by-handle 校验；一次请求成功后也不把 host path 回写 transcript。external workspace 未 trust 时不加载项目设置、skills、extensions、hooks、MCP 或 `.env`，而且 trust 仍不能取消 OS scope。

### 网络

本节只说明未来 Strong Executor 如何证明网络隔离。当前 Direct Native Network 使用信任授权，不采用以下 receipt 语义。

Strong 网络能力拆成三种，避免把“fetch 可用”误报为“shell 任意联网”：

1. `network=deny`：强 executor 的默认。Linux 无外部 network namespace，macOS helper 不授予 network entitlement，Windows AppContainer 无 network capability，WASI 不注入 socket/lookup host function。
2. `fetch=proxy`：Gateway 接收结构化 URL，proxy 只允许 exact origin/port，重定向每跳重审，DNS 通过 proxy，拒绝 loopback、link-local、私网、Unix socket 和代理绕过；响应大小、时间和 content type 有界。
3. `shell-network=proxy-only`：只有某一 Adapter 能证明 raw socket 不可用、DNS/代理环境不可绕过时才打开。单纯设置 `HTTP_PROXY`/`HTTPS_PROXY`、AppContainer `internetClient` 或 WASI `inherit_network` 都不满足 exact allowlist。

Network receipt 至少报告 `effective`、`rawSockets`、`dns`、allowlist digest、redirect policy、canary 结果、proxy identity 和是否 verified。

### 资源

统一 ResourcePolicy，但允许 Adapter 报告不同 enforcement：

- `wallTime`：Gateway deadline + executor supervisor；超时后 kill tree，不能只 SIGTERM 父进程。
- `cpu`：Linux cgroup `cpu.max`、Windows Job Object/VM CPU policy、macOS launchd/VM；WASI fuel 是 guest instruction budget，不替代 host wall/CPU limit。
- `memory`：Linux `memory.max`、Windows Job/VM memory；macOS App Sandbox 没有可直接推断的跨工具 hard quota，需 VM/launchd/实验验证。
- `processes`：Linux `pids.max`、Windows Job Object + no-breakaway、macOS supervisor/VM；WASI component 默认不允许 subprocess，但 host imports 仍需限制。
- `openFiles`/`scratch`：在各平台由 OS limit、专用 filesystem/VM disk 或 Gateway 字节计数组合；不能宣称全局 disk quota 已由输出上限替代。
- `output`：Gateway 对 stdout/stderr/result bytes 做 hard bound；超过上限返回 `resource_exceeded`，保留截断元数据而不把无界输出写 transcript。

若用户要求 hard resource envelope，而 Adapter 只能提供 soft/unsupported，`prepareScope` 失败；只有产品明确允许某个 soft 维度，receipt 才能标记并让 UI/审计看见。

### Capability detection 与 receipt 生命周期

1. `probe`：检查 OS/arch、helper binary digest/signature、backend version、所需 kernel/OS feature、依赖 runtime 和 IPC peer identity。
2. `prepare`：为该 owner/scope 建立一次性 executor context，安装 mounts/ACL/entitlements/preopens、network policy、environment scrub 和 resource limits。
3. `canary`：对外部路径、只读/可写路径、network deny/allow、DNS/redirect、环境、子进程继承、fork bomb、timeout/cancel 做真实可观察测试。
4. `issue receipt`：executor 返回签名/MAC 摘要；host 将 receipt 绑定 owner、scope digest、policy digest、binary digest、request effect 和 expiry。
5. `invoke`：每次请求携带 receiptId；executor 再次检查 capability subset。scope、网络或资源策略变化必须生成新 receipt。
6. `close/recover`：关闭 context、回收所有 descendants；崩溃/失联使 receipt 失效，未确定副作用写入 `state_unknown`，不得自动重放。

## 7. Strong 与 Restricted 能力矩阵

| 能力 | Strong Sandbox Executor | Restricted Broker | 约束/说明 |
| --- | --- | --- | --- |
| 任意代码/解释器 | 允许，但仅在跨进程 OS/VM/WASI boundary 且 receipt 覆盖 | 禁止 | Restricted 不能通过改 tool name 绕过 |
| 运行现有 shell/命令 | native/VM Adapter 通过 canary 后允许；WASI 单独不覆盖 | 禁止 | 不假定 `/bin/sh`、PowerShell、Git、Python 在每平台都存在 |
| 读取声明 scope | 允许 | 允许封闭、分页、大小有界 DTO | 两者都不接受任意 host path |
| 写入 managed workspace/scratch | 允许，receipt 必须证明 rw root | 仅允许专用 typed write，不能写任意外部目录 | scope/owner/policy 绑定 |
| 外部 workspace | 允许，需显式 root + trust + OS mount/ACL | 可提供只读/受控写 DTO | trust 不等于 OS boundary |
| grep/find/search | 允许在 executor 内运行或实现为 bounded tool | 允许封闭实现 | 输出和时间上限均必需 |
| raw network | 默认禁止；只有 backend 证明 proxy-only/direct policy 后才可用 | 禁止 | `web.fetch` 可经 Gateway proxy |
| exact-domain fetch | 允许 proxy/host function 后可用 | 允许 Gateway typed fetch | 每次 redirect/DNS/地址重审 |
| 子进程树 | Strong 必须继承并可 kill tree | 不提供 | Windows Job、Linux PID/cgroup、VM/XPC supervisor 等 |
| Zotero Native Tools | 由 Gateway 转到宿主 Restricted Broker | 允许 | 两种模式仍不暴露原始 Zotero 对象 |
| 项目 settings/skills/extensions/hooks/MCP | 只有经信任、签名/审计并通过同一 executor seam 的组件才可考虑 | 禁止任意加载 | 不因 workspace trust 获得任意 host 权限 |
| host 环境、`.env`、API key | 默认禁止；一次性 secret reference 需逐项证明 | 只在可信 Gateway 内按 DTO/secret handle 处理 | 不写命令行、日志、文件 |
| CPU/内存/进程/磁盘 | 按 receipt 每维度 hard/soft/unsupported | 仅 Gateway 输出/时间等封闭上限 | hard 要求无法满足即拒绝 |
| executor 不可用 | `sandbox_unavailable`/`sandbox_failed`，不执行 | Restricted 工具可继续，明确标记 restricted | 绝不 host shell fallback |

## 8. 打包、更新与运行时身份

### 建议的发行单元

每个 native/WASI backend 都有独立的 `ExecutorDistribution` 条目：

```json
{
  "schema": "zotero-agents.executor-distribution.v1",
  "packageId": "sandbox-executor",
  "version": "<semver>",
  "protocolVersion": "<rpc-version>",
  "platform": "linux|macos|windows",
  "arch": "x64|arm64|...",
  "backend": "linux-bwrap-landlock|macos-xpc-app-sandbox|...",
  "minOsOrKernel": "<constraint>",
  "capabilitySchemaDigest": "<sha256>",
  "binarySha256": "<sha256>",
  "buildFingerprint": "<sha256>",
  "signingIdentity": "<platform-specific identity>",
  "artifactPath": "<platform/arch path>",
  "previousKnownGood": "<optional version>"
}
```

建议第一阶段随插件 XPI 一起分发 `addon/bin/sandbox-executor/<platform>-<arch>/...`，按运行 OS/arch 选择；不能把所有平台二进制当作可执行的互相替代。用户提供的 Docker/Podman/VM runtime、Windows Sandbox feature、Linux bwrap 不由 XPI 静默安装，缺失即 disabled。

### 身份与验证

- 复用仓库的内容寻址思路：每个二进制 sidecar checksum、platform/arch 条目、aggregate digest、source/build fingerprint 和 release receipt。Sandbox helper 的 fingerprint 输入应是 helper source、Cargo.lock/toolchain、构建 recipe、平台 target 和 capability profile；不把 release workflow/receipt/sync 脚本混入 binary identity。既有 Host Bridge 构建规则可作为流程参照，但 Sandbox 需要自己的 package namespace，避免把 CLI 与 executor 绑定成同一版本。
- macOS 在激活前验证 code signature、team/bundle identity、entitlement 和 notarization/distribution 要求；Windows 验证 Authenticode/包身份（如适用）、expected binary digest 和 AppContainer profile；Linux/WASI 验证 release manifest、checksum/签名元数据、binary digest、helper handshake 和组件 digest。
- 如果需要独立于 GitHub release 的可轮换信任根，可把 executor packages 作为 TUF target：TUF 规范把 target 文件视为 opaque，可在签名 targets metadata 中携带 length/hash/custom 信息，并要求客户端验证签名、hash、版本和 expiry 后再提供文件。[TUF specification](https://github.com/theupdateframework/specification/blob/master/tuf-spec.md) 这是增强候选，不替代仓库当前已确定的 GitHub source-of-truth 和显式发布门禁。

### 更新事务

1. 只从 project-approved GitHub release/feed 取得目标，验证包 metadata、签名、digest、platform/arch、protocol 和 capability schema；Gitee 仍只在用户单独要求时走独立同步命令，遵守 [`AGENTS.md`](../../AGENTS.md)。
2. 下载到版本化 staging 目录，不覆盖当前 active helper；检查 archive traversal、文件权限、签名、binary digest 和 license/SBOM 元数据。
3. 在 staging helper 上运行 protocol handshake、version/receipt schema probe、scope/network/resource canary；失败时保留旧的 known-good helper，返回 `executor_update_pending`/`sandbox_unavailable`，绝不改用 host 权限。
4. 新会话绑定新 helper version；已有 session 继续使用其已签发 receipt 对应的实例。激活以原子 manifest pointer 切换完成；崩溃/启动失败可回滚到已验证旧版本，但回滚也必须重新 probe 并签发新 receipt。
5. 升级不改变 owner canonical transcript 格式，不把完整 receipt/环境/命令复制到 transcript；只记录版本、binary digest、capability digest、probe summary 和失败/恢复事实。

这与项目现有的 content-addressed prebuild、release manifest、complete receipt 和显式 dispatch 约束相容；正式发布仍遵循 [`scripts/host-bridge-release-set.ts`](../../scripts/host-bridge-release-set.ts)、[`scripts/dispatch-host-bridge-release.ts`](../../scripts/dispatch-host-bridge-release.ts) 和 [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts) 所代表的 release set 流程。Sandbox executor 若形成新的预构建集合，应保留相同的 source identity、aggregate checksum、远端验证和可恢复 receipt 语义。

### 更新失败与回滚不变量

- 新 helper 未通过签名、protocol、canary 或 capability parity 时不可激活。
- active helper 在运行中不被原地覆盖；更新失败不能使已有强 receipt 继续指向未知 binary。
- 没有 known-good 版本时状态是 disabled/unavailable，而不是旧的 host command fallback。
- capability schema 或 policy profile 的 breaking change 必须提升 protocol/schema identity，并阻止旧插件/旧 helper 误配。

## 9. 候选对比与权衡

| 候选 | 灵活性 | 隔离可信度 | 现有命令覆盖 | 跨平台成本 | 结论 |
| --- | --- | --- | --- | --- | --- |
| Trusted Native Execution + 审批 | 高 | 信任边界，不是 OS 隔离 | 高 | 低 | **当前 MVP**；见 ADR 0002 |
| 原生 per-platform executor + 可选 VM + WASI Adapter | 高；同一 seam 可扩展多个后端 | 高，但取决于每平台真实 canary | Linux/Windows VM/macOS VM 高；WASI 仅 component | 高：三套 OS 后端、签名、测试、更新 | 未来 Strong 候选；能力逐维度报告 |
| 完整 Pi 放入外部 VM/OCI，插件只做 RPC | 高；内置工具全集天然同一 boundary | 高，单一 guest boundary 易审计 | VM/OCI 内覆盖高 | 中高：安装、镜像、启动和跨平台 runtime 依赖 | 可作为强后端，但不适合所有 Zotero 用户的唯一前提 |
| WASI-first | 中（便携 transform 很好） | 高（host imports 严格时） | 低；无稳定通用 subprocess/exec，不能直接跑 host binary | 中；引擎仍要按 OS 打包 | 作为受控 wasm tool lane，不替代 shell |
| 自称 Strong 的审批/白名单 host shell | 高 | 低；审批不是 OS boundary | 高 | 低 | 拒绝 Strong 声明；可以作为清楚标识的 Trusted Native Execution |

“完整 Pi 外部 VM”与“插件内 Pi + 外部工具 executor”都可以成为未来隔离形态，但都必须保证交给 Strong lane 的工具不会从 host 绕出。是否实施这些 Adapter 由后续产品需求决定。

## 10. 未来 Strong 验证顺序

### 结论

1. 先为未来 Adapter 冻结独立的 Strong receipt 与错误合同；不要改写 Trusted Native Execution 的 Agent 工具接口。
2. Linux 可以先验证 Bwrap/Landlock 路径，实测 scope escape、network deny、环境、child inheritance、资源限制与取消回收。
3. Windows 验证 AppContainer/Job Object；Windows Sandbox/Hyper-V 保持可选。实验性 API 只能 feature-detect、版本化和显式标注。
4. macOS 验证签名 XPC/App Sandbox helper 的最小命令集、bookmark、peer identity、network deny 与 lifecycle。广泛宿主命令需要 VM 或容器。
5. WASI 只验证无 subprocess 的 component tool，不从尚未稳定的 `wasi:exec` 推断 Shell 兼容性。
6. 任一 Adapter 只有通过本节验收清单，才可以对具体调用声明 Strong。没有 Adapter 时，MVP 继续使用清楚标识的 Trusted Native Execution。

### 跨平台验收清单

- [ ] 每个 OS/arch/backend 都能生成并验证 binary/package/build fingerprint。
- [ ] `prepareScope` 失败不会产生任何宿主 shell/file/network side effect。
- [ ] 外部路径、symlink/junction/reparse/mount、`.env`、Zotero profile、插件目录和 host credential canary 均被阻断或按声明允许。
- [ ] 子进程、孙进程、不同 shell/interpreter、后台任务在同一边界；cancel/timeout/close 后无残留。
- [ ] network deny、exact-origin proxy、DNS、redirect、loopback/私网/link-local、Unix socket 和代理绕过以真实连接验证。
- [ ] CPU/memory/process/open-file/output/scratch 各自标注 hard/soft/unsupported，策略要求 hard 时不静默降级。
- [ ] receipt 与真实 canary、binary digest、scope/policy digest、executor restart/sleep-wake/workspace switch 一致；旧 receipt 不可跨 owner/scope 复用。
- [ ] XPI/外部 runtime 更新先 staging/probe 再 atomic activate；失败保留 known-good 或 disabled，永不 host fallback。
- [ ] Zotero 7 和 9 插件进程构建不包含 Node runtime/API；native helper 的跨平台差异被 IPC seam 隔离。

## 11. 一手来源范围

### 本仓库

- [`CONTEXT.md`](../../CONTEXT.md)：Tool Gateway、Workspace Scope、Strong/Restricted 领域术语。
- [`builtin-pi-agent-runtime-handoff-20260825.md`](../builtin-pi-agent-runtime-handoff-20260825.md)：已确认 Pi/插件/executor/Zotero Native 边界和 fail-closed 决议。
- [`docs/adr/0001-project-owned-pi-persistence.md`](../../docs/adr/0001-project-owned-pi-persistence.md)：owner/transcript/runtime 持久化边界。
- [`AGENTS.md`](../../AGENTS.md)：Host Bridge 七平台预构建、内容寻址、release receipt、GitHub/Gitee 发布约束。
- [`scripts/host-bridge-cli-release-governance.mjs`](../../scripts/host-bridge-cli-release-governance.mjs)、[`scripts/sync-host-bridge-cli-prebuilds.ts`](../../scripts/sync-host-bridge-cli-prebuilds.ts)：现有 fingerprint/checksum/prebuild manifest 实现。
- [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts)：`addon/bin` 与插件 release asset/update URL 配置。

### Linux / macOS / Windows

- [bubblewrap README](https://github.com/containers/bubblewrap/blob/main/README.md)
- [Linux Landlock userspace API](https://www.kernel.org/doc/html/latest/userspace-api/landlock.html)
- [Linux Seccomp BPF](https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html)
- [Linux cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- [Linux openat2(2)](https://www.man7.org/linux/man-pages/man2/openat2.2.html)
- [Apple App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)
- [Apple App Sandbox file access](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox)
- [Apple App Sandbox inheritance](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)
- [Apple XPC](https://developer.apple.com/documentation/xpc)
- [Apple Creating XPC Services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)
- [Apple XPC updates and peer identity requirements](https://developer.apple.com/documentation/updates/xpc/)
- [Apple launch environment/library constraints](https://developer.apple.com/documentation/security/applying-launch-environment-and-library-constraints)
- [Microsoft AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)
- [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
- [Microsoft Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/)
- [Microsoft Windows Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file)
- [Microsoft Create Process In Sandbox APIs](https://learn.microsoft.com/en-us/windows/win32/secauthz/createprocessinsandbox)

### WASI / Wasmtime / update integrity

- [WASI main README](https://github.com/WebAssembly/WASI/tree/main)
- [Wasmtime CLI options](https://docs.wasmtime.dev/cli-options.html)
- [Wasmtime WASI context builder](https://docs.wasmtime.dev/api/wasmtime_wasi/struct.WasiCtxBuilder.html)
- [Wasmtime WASI C API](https://docs.wasmtime.dev/c-api/wasi_8h.html)
- [Wasmtime interruption](https://docs.wasmtime.dev/examples-interrupting-wasm.html)
- [WASI `wasi:exec` issue](https://github.com/WebAssembly/WASI/issues/899)
- [Wasmtime pre-compiling Wasm](https://docs.wasmtime.dev/examples-pre-compiling-wasm.html)
- [The Update Framework specification](https://github.com/theupdateframework/specification/blob/master/tuf-spec.md)

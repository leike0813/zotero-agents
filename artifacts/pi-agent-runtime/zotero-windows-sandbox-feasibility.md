# Wayfinder：Zotero 7/9 Windows Sandbox Executor 可行性

研究截面：2026-08-26。本文只研究 Windows 下由 Zotero 7/9 插件发起的 helper/sandbox feasibility，不修改生产代码，也不把平台 API 的存在误写成 Zotero 已验证的能力。

## 摘要

结论分三层：

- **A（仓库/现有运行链已证明）**：插件在 Zotero 的 privileged JavaScript 环境中能够通过 Mozilla `Subprocess.call` 启动原生 `.exe`，读写 stdin/stdout/stderr，等待退出并调用 `kill`。Windows ACP WebSocket bridge 进一步证明了插件可以 materialize 一个随 XPI 携带的 `.exe`、以 loopback WebSocket 建立带 token 的会话，并通过 `taskkill /PID /T /F` 清理当前 backend 的树。Host Bridge CLI 则证明了插件可以启动本机 HTTP capability 服务、把 endpoint/token/profile 注入一次 run。
- **B（Microsoft/Mozilla 一手资料支持，尚未在 Zotero 7/9 Windows 实机 spike）**：一个由插件启动、运行于当前用户上下文的 Rust supervisor 可以调用 `CreateAppContainerProfile`、`STARTUPINFOEX` 的 security-capabilities attribute 和 `CreateProcess`，给每个 owner 建立 AppContainer；再用显式 scope DACL、Job Object 和 typed IPC 形成强得多的执行面。它是否能在目标 Zotero 7/9 x64/arm64、当前安装权限和企业策略下稳定工作，仍须 spike。
- **C（不应作为默认承诺）**：Windows Sandbox/Hyper-V、Win11 experimental `Experimental_CreateProcessInSandbox`、仅靠 `HTTP_PROXY`、仅靠 bearer token、仅靠 restricted token 或当前 `taskkill` 路径都不能成为跨 Zotero 7/9 Windows 的默认 Strong sandbox。它们可以作为显式可探测的可选 lane 或迁移中的实验，不可充当已经实现的隔离合同。

推荐的 Windows 最小强架构是：

```text
Pi Tool Gateway（Zotero 插件）
        │ typed request + owner/scope/policy digest
        ▼
Rust supervisor（普通用户上下文，XPI materialize 后的 signed/hash-checked helper）
        ├─ 每个 owner 一个 AppContainer profile/token
        ├─ scope 根目录的 Package SID + capability SID DACL
        ├─ Job Object：kill-on-close，默认禁止 breakaway
        ├─ named pipe typed RPC（loopback 只作受限 fallback）
        └─ 默认无网络 capability；需要联网时走宿主 Gateway/proxy
                    ▼
             被测 `.exe` / command
```

这条结论是“架构候选可落地”，不是“已经由 Zotero 实机证明”。在 receipt 能证明 helper 身份、AppContainer、scope、Job、网络、环境和 IPC canary 之前，通用执行应 fail closed；现有 Host Bridge/ACP bridge 只能继续承担明确标为 Restricted/受信的能力。

## 证据等级和范围

| 等级 | 含义 | 本文用法 |
| --- | --- | --- |
| A | 当前仓库代码、仓库测试或现有 Zotero 运行链直接证明 | 可以作为插件已有 seam 的事实，但不能扩大为 sandbox 证明 |
| B | Mozilla/Microsoft/Zotero 官方一手文档或源码支持，尚未由 Zotero 7/9 Windows spike 验证 | 只能列为候选能力和待验证前提 |
| C | 由当前证据无法承诺、依赖环境/实验 API/额外安装，或与所需边界不符 | 不进入默认基线；若保留必须显式 capability/error |

关键边界：

1. “能在 Zotero 中启动一个 `.exe`”只证明 native process launch，不证明 child 获得了 AppContainer、网络拒绝、scope DACL 或可靠的后代清理。
2. “loopback 上有 bearer token”只证明应用层请求认证，不证明连接方身份、进程完整性或本机同用户攻击者不可访问。
3. Microsoft API 的名称、文档和最低 OS 版本只能给出 B 级平台可行性；仓库目前没有 `CreateAppContainerProfile`、`PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES`、`CreateJobObject` 或 `WinVerifyTrust` 的 Zotero 路径。

## 证据总表

| 结论 | 证据 | 等级 | 对架构的含义 |
| --- | --- | --- | --- |
| Zotero 插件可以取得 Mozilla subprocess module | `src/utils/runtimeCompatibility.ts:8-31,68-104` 通过 `ChromeUtils.importESModule`/legacy import 取得 `Subprocess`，类型暴露 `call`, pipes, `wait`, `kill` | A | 可以从插件启动外部 helper；该接口没有 AppContainer/Job 参数 |
| ACP transport 直接启动 backend | `src/modules/acpTransport.ts:1247-1285` 解析 command，调用 `subprocess.call`，传 args、环境、cwd；`1336-1450` 等待并在超时后 `proc.kill` | A | 已有启动/取消 seam；Windows direct kill 不构成树级安全清理 |
| Windows process-control 依赖 bridge | `src/platform/processControl.ts:214-232` 返回 `preferredCleanupStrategy: "windows-bridge"`、`supportsProcessTreeCleanup: true`，但 `supportsProcessGroupLaunch/NegativePidSignal/PidFileSupervisor/ProcessIdentityQuery` 均为 false | A | “支持树清理”是 transport delegation 语义，不是 AppContainer/Job 证明 |
| ACP WebSocket bridge 随插件启动 | `src/modules/acpWebSocketBridgeService.ts:74-78,214-243,266-320,368-379` 固定 `bin/win32-x64`，读 sidecar SHA，写 digest path，再以 `Subprocess.call` 启动 loopback bridge | A | 证明 materialize + loopback IPC；没有 token/ACL/AppContainer/Job |
| Bridge 传输和树清理 | `native/acp-ws-bridge/src/main.rs:569-603,611-635` `Command::new` + env/stdIO，Windows 使用 `CREATE_NO_WINDOW`；关闭时 `taskkill /PID /T /F` | A | 是 best-effort operational cleanup，不是防恶意 descendant escape 的 OS boundary |
| Host Bridge 是宿主 capability 服务 | `src/modules/hostBridgeServer.ts:446-457,4030-4058,4796-4841` 用 `nsIServerSocket`，loopback bind，health 例外，其余路由 bearer auth；`hostBridgeCliInjection.ts:115-136,166-285` 生成 profile/token env | A | 鉴权和 scope policy 在 Zotero host 中执行，不隔离 helper |
| XPI 有 native asset seam | `zotero-plugin.config.ts:96-128` 将 `addon/bin/**/*` 打入构建；`packagedAssetResolver.ts:253-295` 从 root/resource URI 或 runtime path 读取 bytes | A | XPI 可带 helper；必须落地到可执行文件路径才能启动 |
| 现有 hash/materialization 不是签名发布验证 | `acpWebSocketBridgeService.ts:223-240` 只解析 SHA sidecar 并写入 digest path；`hostBridgeCliInstaller.ts:645-677` hash compare 后 `overwrite:true` | A | SHA 保证已读 bytes 的完整性，不证明 Authenticode signer；更新有锁失败面 |
| 仓库 helper matrix 是七平台且 Windows 只有 x64 | `host-bridge/cli-build-recipe.json:9-59` 七 target 仅 `win32-x64`; `hostBridgeCliResolver.ts:60-84` Windows 无视 `process.arch` 返回 `win32-x64` | A | Zotero ARM64 host 存在，但仓库没有 native Windows ARM64 helper 选择/包 |
| Zotero 7/9 host 的 Windows x64/ARM64 发行支持 | Zotero 官方 Zotero 7 announcement/changelog、官方 downloads 页面均列 Windows ARM/ARM64；见来源节 | A（host 发行事实） | 不能把 host 支持外推为本插件 helper/AppContainer 已验证 |
| AppContainer 可由自启动 desktop process 创建 | Microsoft `Launch an AppContainer`、`CreateAppContainerProfile` 说明 moniker、profile、SID、DACL、`STARTUPINFOEX` attribute + `CreateProcess` | B | 最小 native lane 的平台基础；需 Zotero x64/arm64 spike |
| Job 可管理 descendants | Microsoft Job Objects 说明 `CreateJobObject`、默认 child inheritance、`TerminateJobObject`、kill-on-close、no-breakaway | B | supervisor 可做强制回收；需测试 nested job、WMI child 和 race |
| `Experimental_CreateProcessInSandbox` | Microsoft 明确标为 experimental；Win11、`processmodel.dll` 动态导出、无 public header、AppContainer caller 被拒 | B/C | 只能作为 Win11 可选 adapter，不能覆盖 Zotero 7/9/Win10 默认 |
| Windows Sandbox/Hyper-V | Microsoft 说明 Pro/Enterprise/Education、虚拟化、disposable、网络默认开启、`.wsb` mapped folders/logon command | B/C | 可作为显式 VM lane；无插件可依赖的 typed guest lifecycle/IPC 合同 |

## Zotero 中实际存在的启动、通信、取消和清理链

### 1. Mozilla Subprocess 是真实的 Zotero-hosted native launch seam

`src/utils/runtimeCompatibility.ts` 在 privileged Zotero 环境中尝试：

```text
ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs")
  → Subprocess.call({ command, arguments, environment, environmentAppend, workdir })
  → Process { stdin, stdout, stderr, wait, kill }
```

该适配层同时保留 `.mjs` 和旧 `Subprocess.jsm` 形状，说明插件没有假定某一个 Zotero/Firefox module packaging 版本。Firefox 官方 Subprocess 文档确认：调用异步启动 native host executable；通信是标准输入、输出和错误管道；参数数组不经过 shell split/expansion；默认继承父环境和 cwd，`environment` 配合 `environmentAppend:false` 才能替换为显式环境。

ACP transport 的 Mozilla 分支在 `acpTransport.ts:1254-1285`：

1. 用 `Subprocess.pathSearch`/仓库 command resolver 找 command。
2. 为 Windows `.cmd`、PowerShell script 或 bare command 构造 launch plan；已解析绝对 `.exe` 时可以 direct launch，未解析的 Windows bare command 可能包到 PowerShell。
3. 调用 `Subprocess.call`，将 `args.backend.env` 合并进 `buildSubprocessEnvironment`，并明确传 `environmentAppend:true`。
4. 异步泵 stdout/stderr，暴露 stdin/stdout/close/wait 给 ACP session。

这条链对“插件能否启动 Rust supervisor”是 A 级答案：只要 helper 是可执行的 Windows PE，当前 Zotero-hosted API 有真实调用点。它对“helper 已被 sandbox”没有任何证明，因为该类型没有 token、AppContainer、Job、DACL 或 network policy 字段。

### 2. ACP WebSocket bridge 是 transport adapter，不是 sandbox

Windows 非 Node runtime 会选择 `shouldUseAcpWebSocketBridgeTransport()`（`acpWebSocketBridgeService.ts:120-125`）。启动过程如下：

```text
XPI/addon/bin/win32-x64/zotero-acp-bridge.exe[.sha256]
        │ readPackagedBinaryAsset (URI fetch/XHR 或 runtime path)
        ▼
runtime/bin/acp-ws-bridge/<sha-prefix>/zotero-acp-bridge.exe
        │ Subprocess.call(--serve --host 127.0.0.1 --port 0 --token ...)
        ▼
ready JSON → ws://127.0.0.1:<port>/v1/acp?token=...
```

仓库的 Rust bridge（`native/acp-ws-bridge/src/main.rs:569-592`）对请求执行 `Command::new(request.command)`，传入 exact args、cwd、request env 和三个 stdIO pipes；Windows 加 `CREATE_NO_WINDOW`。WebSocket 首个 frame 必须是 `spawn` 请求，bridge 在 URL query 比较 token（`main.rs:309-320,611-635`）。

关闭连接后，bridge 调 `taskkill /PID <pid> /T /F`（`main.rs:595-603`）。这可以减少普通运行中的 orphan，但当前源码没有：

- `CreateAppContainerProfile`/AppContainer SID/token；
- `STARTUPINFOEX` security capabilities；
- Job Object 或 `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`；
- breakaway/no-breakaway 策略；
- scope 目录 ACL 或 reparse/junction 防护；
- network deny/proxy enforcement；
- Windows process identity query 或 signer verification。

因此，ACP bridge 的 A 级证据只能写成“可启动、可管道通信、按 PID/树做 best-effort 清理”。即使 `taskkill` 成功，也不等于恶意子进程不能在 bridge 不知情时建立新进程、使用 WMI 或逃离预期范围。

### 3. Host Bridge CLI 是 Zotero host capability，不是 helper sandbox

Host Bridge Server 用 Mozilla `nsIServerSocket`，可以配置 loopback 或 LAN；当前默认/安全路径是 loopback。除 `/bridge/v2/health` 外，HTTP handler 在 `hostBridgeServer.ts:4047-4058` 要求有效 bearer token。CLI injection 在每个 run workspace 建立 `.zotero-bridge/profile.json`，写入 `zotero-bridge.profile.v1`、endpoint、`tokenEnv` 和 run scope，然后注入：

```text
ZOTERO_BRIDGE_PROFILE=<workspace>/.zotero-bridge/profile.json
ZOTERO_BRIDGE_SCOPE=<run scope JSON>       # ACP Chat 另行注入
ZOTERO_BRIDGE_TOKEN=<bearer>
PATH=<workspace shim>;<CLI dir>;...
```

这解决的是“受控 helper 如何请求 Zotero API”的 capability contract。实际操作仍在 Zotero host 的 server handler/approval store 中执行。任何拥有当前用户执行权的 helper 若得到 token，仍然是在调用 host capability，而不是被 OS 约束在 scope 内。故 Host Bridge 可以作为 Restricted Broker 或未来 sandbox 的单一 host API gateway，却不能作为 sandbox executor 的替代物。

### 4. 取消和进程树清理的真实边界

Firefox 官方文档建议先关闭 stdin、等待 graceful exit，超时后 `proc.kill()`；文档没有给 `kill()` descendant-tree guarantee。仓库 ACP transport 的 `close()`（`acpTransport.ts:1363-1450`）先等待 grace period，Windows 不走 POSIX pidfile/process-group 分支，最终调用 `proc.kill?.(0)`，再等待 `closed`。运行时 snapshot 明确 Windows 没有 process identity query。

现有 Windows path 的事实是：

| 场景 | 已有行为 | 安全含义 |
| --- | --- | --- |
| 直接 Mozilla child | `wait()`；超时 `proc.kill` | 只对 Process 对象负责，未证明 descendants |
| ACP WS bridge | bridge socket 关闭后 `taskkill /T /F` | 便利的树清理；不是 Job 的不可 breakaway 语义 |
| Zotero shutdown | bridge service best-effort `proc.kill` 并等待有限超时 | 不能写成所有 descendant 已死的 receipt |
| Host Bridge CLI | CLI 被 helper 启动；Host Bridge server 是 Zotero 生命周期的一部分 | CLI 退出不等于 host capability server/其他子树被隔离 |

真正强的 Windows cleanup 应由 Rust supervisor 持有 Job handle，在启动目标前设置限制并尽早加入 Job；关闭时 `TerminateJobObject`，最后 handle 关闭用 kill-on-close。receipt 要区分“job cleanup confirmed”和“只发出 taskkill/kill 请求”。

## XPI 内 `.exe` 的 materialize、arch 选择、校验和更新风险

### 当前分发链

`zotero-plugin.config.ts:96-128` 将 `addon/**/*.*`、`addon/bin/**/*` 和 Host Bridge CLI 路径纳入 XPI build。`readPackagedBinaryAsset` 先从 `rootURI`/`resourceURI` 用 fetch/XHR 读 bytes，失败后从 runtime root/cwd 的 `relativePath` 读；这适应 XPI resource URI 和 unpacked/dev 目录两种形态。它不是直接把压缩包中的 `.exe` 当 process path，而是先得到 bytes。

ACP bridge 已有较好的“版本内容寻址”雏形：读取 `zotero-acp-bridge.exe.sha256`，将 runtime path 设为 `runtime/bin/acp-ws-bridge/<前 16 位 SHA>/zotero-acp-bridge.exe`，存在则复用，否则写入新 path。这避免了覆盖正在运行的 PE。该逻辑仍然只检查 sidecar 文本、没有 Authenticode signer policy，且当 SHA 缺失时会退回固定 `runtime/bin/zotero-acp-bridge.exe`（`acpWebSocketBridgeService.ts:101-112`），不能直接视为 release-grade verification。

Host Bridge CLI installer 的 Windows target 是 `%LOCALAPPDATA%\\zotero-agents\\bin\\zotero-bridge.exe`（`hostBridgeCliInstaller.ts:195-221`）。它读取 source bytes，计算 SHA-256，读 target SHA 后直接 `writeFile(targetPath, bytes, { overwrite: true })`。busy/locked/access 错误会转成 `cli_install_target_busy`（`hostBridgeCliInstaller.ts:494-505,645-675`）。这正好暴露 Windows 文件锁下的更新边界：运行中的 `.exe` 可能不能被替换，且当前代码没有 staged version + atomic active pointer + 保留旧版本的完整回滚流程。

`runtimePersistence.writeRuntimeBytes` 的 IOUtils 路径在 overwrite 失败后会尝试 remove 再 create（`runtimePersistence.ts:1015-1077`）；OS.File 分支才使用 `writeAtomic` 的 tmp path。调用方不能假设所有 Zotero 版本/文件系统后端都会给出相同的原子替换语义。因此：

- active helper 永远使用不可变的 `version/digest` 目录；
- 更新只写新 digest 目录，先 probe/handshake，再推进一个小的 active manifest/pointer；
- pointer 更新失败时保留当前 known-good；
- 任何 helper 正在运行时不覆盖其 path；
- 崩溃、断电、锁定和旧版本清理都要可恢复；
- receipt 绑定实际 path、SHA-256、签名状态和 build fingerprint，而非只绑定 XPI 版本。

### SHA-256 与 Authenticode

仓库有 SHA sidecar、manifest aggregate SHA 和 WebCrypto/Node SHA-256（`hostBridgeCliInstaller.ts:448-470`），这是内容完整性证据。它无法回答“谁签了这个 PE、签名链是否受信、签名后内容是否被修改”。Microsoft `WinVerifyTrust` 文档说明可对 PE 调用 Authenticode trust provider；但当前插件代码没有 `WinVerifyTrust`/`WinVerifyTrustEx`、certificate chain 或 signer pinning 路径。

未来 helper distribution adapter 应在写入/执行前同时记录：

1. XPI/release manifest 中的预期 SHA-256；
2. 实际 materialized bytes SHA-256；
3. Authenticode verification result、signer certificate/issuer policy 和 timestamp 状态；
4. PE machine (`x64`/`ARM64`) 与当前 host/OS arch；
5. digest directory、active manifest generation 和 previous known-good generation。

在 spike 通过之前，Authenticode 是 B（平台 API 有），不是 A（Zotero 当前 pipeline 已验证）。

### Zotero 7/9 与仓库平台矩阵

Zotero 官方 Zotero 7 announcement/changelog 说明 Windows 64-bit 和 Windows on ARM 的 native support；Zotero 官方 downloads 页面目前同时列出 Zotero 9 的 Windows 64-bit 与 Windows ARM installer/ZIP。由此可以确认 **Zotero host** 的 x64/ARM64 产品面真实存在。

本仓库的 Host Bridge CLI build recipe 则严格是七个 target：

```text
win32-x64      x86_64-pc-windows-msvc
darwin-x64     x86_64-apple-darwin
darwin-arm64   aarch64-apple-darwin
linux-x86      i686-unknown-linux-gnu
linux-x64      x86_64-unknown-linux-gnu
linux-arm      armv7-unknown-linux-gnueabihf
linux-arm64    aarch64-unknown-linux-gnu
```

`addon/bin` 当前只有 `win32-x64/zotero-bridge.exe`、`win32-x64/zotero-acp-bridge.exe` 及 sidecar；没有 `win32-arm64`。`resolveHostBridgeCliPlatform()` 对任何 `win32` 都返回 `win32-x64`，即便传入 `arch: arm64`。这意味着：

- Zotero 7/9 ARM64 host ≠ 插件已经可选 native ARM64 helper；
- x64 helper 在 ARM64 上能否通过 emulation 满足 native API/性能/签名/child arch，要由 spike 测量；
- Strong lane 的发布合同至少要增加 `win32-arm64` 产物或明确将 ARM64 标记为 unsupported/experimental；
- 不得让 `win32` 无条件默认为 x64 并把结果写成“全 Windows 支持”。

## AppContainer、scope DACL、Job、网络和权限前提

### AppContainer profile/token

Microsoft 官方 `Launch an AppContainer` 的流程是：

1. 为能力名称派生 capability SID；
2. 用 `CreateAppContainerProfile` 创建 per-user/per-app profile，或用 moniker 派生已有 profile 的 Package SID；
3. 构造 `SECURITY_CAPABILITIES`，填 Package SID 和 capability SIDs；
4. 通过 `STARTUPINFOEX.lpAttributeList` 和 `PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES` 告诉 `CreateProcess` 进入 AppContainer；
5. 用 `EXTENDED_STARTUPINFO_PRESENT` 创建进程。

官方资料还说明：Package SID 和 capability SID 必须与传统 user/group SID 一起在资源 DACL 中获准，最终权限是两组授权的交集；无 network capability 时 AppContainer 不能访问网络。对自启动 AppContainer，Package SID 可由调用者选择的 moniker 派生，并不要求这个 helper 本身先成为 MSIX/AppX package。

`CreateAppContainerProfile` 文档明确是“current user 的 per-user/per-app profile”，profile 目录和 registry storage 带 ACL；返回 `E_ACCESSDENIED` 表示当前调用者没有权限。文档没有把“普通 desktop caller 一定不需要管理员”写成保证，所以正确的结论是：

- **同用户路径**：从 API 形态看，profile 可按当前用户建立，不应先设计成必须管理员/service；但“Zotero 插件进程在非管理员、不同安装目录、受企业策略环境下可调用”仍是 B，必须实测。
- **跨用户/服务路径**：若改用 `CreateProcessAsUserW` 或服务持有另一用户 primary token，则需要 `TOKEN_QUERY/TOKEN_DUPLICATE/TOKEN_ASSIGN_PRIMARY`，调用者通常还需 `SE_INCREASE_QUOTA_NAME`，某些 token 需 `SE_ASSIGNPRIMARYTOKEN_NAME`。这条路会引入服务、安装器、UAC/管理员和 token 生命周期，不是最小插件 lane。
- **插件 host 不应进入 AppContainer 后再创建下一级 sandbox**：Microsoft experimental API 明确 AppContainer caller 被拒；因此让 supervisor 留在普通用户 token、只把 untrusted target 放进 AppContainer 更稳妥。

### Workspace Scope 与 DACL

AppContainer 不是“自动只看 workspace”。Scope 需要由 supervisor 把插件提供的 opaque root references 解析为 canonical host paths，然后：

- 拒绝 `..` 越界、junction/symlink/reparse point 逃逸以及 UNC/设备路径混淆；
- 只将经过 canonicalization 的 managed/scratch/resource roots 写入 DACL；
- 对每个 owner profile 使用不同 scope policy，至少用独立 profile 或独立 pipe/lease 隔离；
- 给予 AppContainer Package SID 所需的 read/read-write ACE，同时控制 inherited ACE、所有者和父目录权限；
- 测试 workspace 根目录本身、子目录、新建文件、重命名、删除、外部绝对路径和 reparse transition；
- 将 virtual path 保留在 typed RPC 中，host path 只在 supervisor 受保护状态，不让模型任意拼接 Windows path。

Microsoft 的标准 AppContainer 资料支持这些 SID/DACL 机制，但没有证明仓库已经有其中任何一个实现；因此 scope enforcement 全部为 B，直到真实 Zotero spike。

### Job Object 与 descendant kill

Microsoft Job Object 文档确认：`CreateJobObject` 创建 job；`AssignProcessToJobObject` 关联进程；普通 `CreateProcess` 创建的 child 默认继承 job；`TerminateJobObject` 终止当前关联的所有进程；`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` 在最后一个 handle 关闭时终止 job 中进程。Windows 8+ 支持 nested jobs。

同一文档也给出必须写进设计的反例：

- `Win32_Process.Create` 创建的 child 不自动加入 Job；
- `JOB_OBJECT_LIMIT_BREAKAWAY_OK`、`SILENT_BREAKAWAY_OK` 或 child 使用 `CREATE_BREAKAWAY_FROM_JOB` 会改变树归属；
- 不设置 breakaway flags 才能保持整个普通 CreateProcess 树，但可能阻止某些依赖新 Job 的程序；
- Assign 发生在 process creation 后，supervisor 必须处理“尚未加入 Job 就创建 descendant”的窗口，或采用可验证的 suspended/early-assignment 流程。

推荐：supervisor 为 owner 建立匿名/不可被低权限 target 打开的 Job；不设 breakaway；尽早把 target 加入；记录 `IsProcessInJob`/Job query；关闭走 `TerminateJobObject` + kill-on-close。`taskkill /T` 只作为兼容 fallback，receipt 必须标记为弱清理。

### 网络拒绝、代理和 AppContainer capability

标准 AppContainer 文档给出的语义是 capability allow-list：没有网络 capability 时默认不能访问网络，加入 `internetClient` 则允许 outbound Internet；这不是按 hostname/port 的精细代理策略。若目标命令能使用 raw Winsock、DNS、自带 TLS 或读取代理凭据，单纯注入 `HTTP_PROXY`/`HTTPS_PROXY` 不是 hard deny。

因此最小强 lane 默认不给任何网络 capability；需要网络时，目标只调用 typed host Gateway，由宿主代理执行 allow-listed request，并在每个 redirect/DNS/endpoint 上重新判定。若未来要使用 AppContainer 自身网络，必须在 spike 验证：DNS、loopback、private address、IPv6、WinHTTP、WinINet、raw Winsock、代理 bypass 和凭据泄漏。

Microsoft 的 `Experimental_CreateProcessInSandbox` 规格另有 `network_policy.proxy`，文档称可将 outbound traffic 路由到 proxy，但它是 Win11 experimental `processmodel.dll` API；这只能标为 B/C，不能把它写成 Zotero 7/9 全 Windows 的默认 network enforcement。

### `CreateProcessInSandbox` 的适用性

Microsoft 当前文档明确：

- `Experimental_CreateProcessInSandbox` 和 `Experimental_CreateProcessAsUserInSandbox` 是 experimental、subject to change；
- API 从 `processmodel.dll` 导出，没有 public header，要 `LoadLibraryExW`/`GetProcAddress`；
- 最低 client 是 Windows 11（experimental）；
- sandbox specification 是 `SBOX` FlatBuffer；`app_container=false` 时 fs/capability/network policy 不生效；
- identity 是 AppContainer profile name，不能碰撞当前安装的 MSIX package family；
- AppContainer caller 会收到 `E_ACCESSDENIED`；
- `inheritHandles` 必须为 false，environment 需要 Unicode block；
- API 的 `AsUser` 变体又带来 primary-token rights/privilege 前提。

它有吸引力，因为一个 specification 可表达 AppContainer、filesystem paths、network policy 和 proxy；但目标 Zotero 7 可能运行在 Windows 10，Zotero 9 也不改变实验 API 的稳定性，且 ARM64 行为/ABI/策略没有本仓库验证。故只可作为 Win11 adapter 的 feature probe，失败必须回到普通 AppContainer + Job 或 `sandbox_unavailable`，不可隐藏成同一 capability。

## Windows Sandbox/Hyper-V 是否适合作为默认基线

Windows Sandbox 官方页面确认：它使用硬件虚拟化和 Microsoft hypervisor，guest 有独立 kernel，关闭后状态丢弃，Pro/Enterprise/Education 支持，Home 不支持；官方还称通常几秒启动且同时只允许一个 instance。`.wsb` 配置适用于 Windows 10 build 18342+ 和 Windows 11，可设置 network、mapped folders、logon command、clipboard、ProtectedClient 等。

但这条产品面不等于插件可按请求获得可靠的 service API：

1. 普通插件可以尝试通过 `.wsb` 文件/命令行启动，但官方配置合同没有提供“创建后返回 typed RPC endpoint、按 owner 取消、查询 guest PID/receipt、并发多 owner、可靠关闭”的 Zotero plugin API。
2. guest 中需另行 materialize/bootstrap helper；`LogonCommand` 只是 guest 启动命令，host 侧还要设计输出/IPC。mapped folder 必须在 host 预先存在；可写 mapping 会把 guest 改动带回 host，官方明确提醒其泄漏/篡改风险。
3. WSB 默认打开 networking；默认 clipboard 也可转移 host 内容。想满足 deny/proxy/scope 仍需生成严格 `.wsb`，并测试 enterprise policy、Hyper-V/VBS、硬件虚拟化、可用内存和启动失败。
4. WSB disposable 语义适合“用户明确请求的高隔离一次性 VM”，不适合每个 Pi tool call 的低延迟默认执行；单实例限制还会破坏多 owner 并发。
5. Hyper-V 自建 VM 需要镜像、虚拟交换、guest agent、更新、磁盘和更重的安装/运维契约，不能假定普通 Zotero 用户已启用或允许插件静默开启。

结论：Windows Sandbox/Hyper-V 保留为 **显式 opt-in、可探测、独立 capability** 的 optional VM lane；默认 Strong baseline 选 native AppContainer + Job。若 native lane 失败，不能无声回退到 WSB（可能未安装/未启用/被策略阻断），而应返回结构化 `sandbox_unavailable` 或仅继续 Restricted host tools。

## Workspace Scope、IPC、receipt、环境和 descendants 的落地判断

### Typed IPC

**推荐 named pipe（B，需 spike）**：

- supervisor 创建每 owner 随机 pipe 名称，显式 security descriptor；不能使用默认 named-pipe DACL，因为 Microsoft 文档说明默认 ACL 可能授予 LocalSystem、Administrators、creator owner 以及 Everyone/anonymous 的读取权限；
- 用 owner/logon SID 以及需要的 AppContainer SID 形成最小 ACE，拒绝 remote/network SID；
- 使用 message framing 或 length-delimited typed JSON/CBOR；request 中固定 `ownerId`, `requestId`, `scopeId`, `policyDigest`, `toolName`, `args`，禁止把任意 command line 作为 Gateway API；
- 命名 pipe 的 `LOCAL` 规则需按 AppContainer/Windows build 验证；Microsoft 文档特别记录 Win10 1709 起 AppContainer 间 pipe 使用 `\\.\\pipe\\LOCAL\\` 形式；
- 使用 `GetNamedPipeClientProcessId`/`GetNamedPipeServerProcessId`、token query 和 handshake 对端身份做证据绑定；这仍需在 Zotero host + helper 位数组合上实测。

**loopback fallback（B/C）**：

- 只能 bind `127.0.0.1`，随机高熵 endpoint +一次性 nonce，连接后做双向 challenge；
- bearer token 只做应用层认证，不能替代 peer process identity；不把 token 放 argv、日志、workspace README 或可读 env 之外的持久文件；
- 每个 request 重新校验 owner/request/lease/policy digest，拒绝 replay、scope mismatch 和过期 receipt；
- 当前 ACP bridge 的 URL token（`main.rs:309-320`）是传输鉴权 A 证据，不是上述进程身份/ACL 证据。

### Receipt peer/process identity

receipt 应至少包含：

```text
helper release/version + actual PE SHA + Authenticode result
host platform/arch + helper machine + OS build/edition
ownerId + scopeId + canonical scope digest + policy digest
AppContainer profile name + Package SID/capability set
Job identity + kill-on-close/no-breakaway/canary result
IPC kind + endpoint nonce + peer PID/token/path verification
network mode + deny/proxy canary result
environment allow-list digest + secret scrub result
expiresAt + generation + cleanup status
```

receipt 只有在 supervisor 对实际运行目标完成 canary 并把 result 回传给插件后才能签发。`pid`、随机 token 或“启动成功”单独不够；尤其当前 Windows process-control snapshot 把 process identity query 标为 unsupported，所以不能复用现有 lifecycle snapshot 伪装成强身份证明。

### Environment scrub

Mozilla 官方文档默认 child 继承父环境；当前仓库 `buildSubprocessEnvironment` 又从 snapshot 构造环境，并在 Windows 使用 `environmentAppend:true`（`src/platform/env.ts:909-931`；`acpTransport.ts:1276-1284`）。环境 snapshot 只对白名单做 normalization，但白名单显式包含 `GITHUB_TOKEN`、`OPENAI_API_KEY` 等认证 key 以及 `_API_KEY/_ACCESS_TOKEN/_AUTH_TOKEN` 后缀（`env.ts:85-102,290-320`）。这对现有 ACP backend 可能是有意的，但不能成为 untrusted helper 的默认环境。

强 lane 应：

- 构造显式 allow-list environment，调用 Subprocess 时 `environmentAppend:false`；
- 只传 `PATH` 的固定 helper/tool 目录、`TEMP/TMP/LOCALAPPDATA` 的 scope-safe 值、locale 和必要协议变量；
- token/secret 不放 argv、日志、崩溃报告或 audit preview；
- 在 supervisor 和 target 两侧都做环境/argv canary；
- 利用 AppContainer profile 对 `TEMP/TMP/LOCALAPPDATA` 的重定向，但不要把它误当作 workspace scope；
- 对 PowerShell/cmd wrapper 单独测试 profile、module path、proxy env 和 child inheritance。

### Descendant kill

Job Object 是 B 级平台强候选；需要 spike 覆盖直接 CreateProcess child、grandchild、`cmd.exe`/PowerShell、程序主动新建 Job、`Win32_Process.Create`、WMI/COM 启动、breakaway flag、Zotero shutdown、supervisor crash、helper self-close。只有“所有可观察 descendants 已终止，且 Job query/receipt 一致”才可把 cleanup 记成 Strong；否则用 `cleanup_best_effort`，禁止将 `taskkill /T /F` 的返回当作完整证明。

## 候选架构和不应承诺的方案

### A. 默认候选：native Windows Strong lane（推荐）

组件职责：

1. Zotero plugin 的 Pi Tool Gateway 只管理 owner、approval、typed request 和 receipt；不直接接受任意 shell。
2. Rust supervisor 是可签名、可 hash-pin 的独立 PE；由现有 Mozilla Subprocess 启动，但启动参数只含 opaque lease/bootstrap，不含 secrets。
3. supervisor 在普通用户 token 中创建 per-owner AppContainer profile，materialize scope ACL，配置 target 的 `STARTUPINFOEX` security capabilities。
4. supervisor 为 target 建立 Job，默认 no-breakaway + kill-on-close，记录 process/job identity。
5. IPC 用显式 DACL named pipe；host broker 和 target 之间只交换稳定 DTO；Host Bridge 若需要，仅作为受限 Zotero capability provider。
6. 默认 network capability empty；需要网络则调用 host Gateway/proxy；不把 `HTTP_PROXY` 当硬控制。
7. target 环境使用 explicit allow-list；workspace virtual path 映射由 supervisor 控制；receipt 绑定实际 PE/ACL/Job/IPC canary。
8. release/update 使用 version+digest immutable directories 和 active manifest；Windows lock 时只保留旧 generation，不覆盖运行中的 exe。

这条 lane 的灵活性受 capability envelope 约束：不能运行需要 GUI/device/全局网络/未支持 WMI 的命令时，应报告 capability unsupported，而不是把能力降级为 host shell。

### B. 可选候选：Windows Sandbox/Hyper-V VM lane

适合用户明确选择“更强 VM 隔离、接受秒级冷启动和 guest bootstrap”的 broad command set。要求：

- 检查 edition、OS build、Hyper-V/hardware virtualization、企业策略和内存；
- 生成 network disabled/严格 mapped folder 的 `.wsb`，默认只读 mapping；
- guest 内 bootstrap signed agent，提供 typed protocol 和 receipt；
- 明确单实例/并发/取消/关闭错误；
- 不自动回退，不承诺所有 Windows Home/企业锁定设备可用。

### C. Restricted compatibility lane

当前 ACP WebSocket bridge、Host Bridge CLI 和 direct Mozilla subprocess 继续服务于已经定义为受信/受限的操作。它们能提供 transport、host API、审批和日志，但不能出现在通用 untrusted shell/file tool 的 Strong receipt 中。

### 明确不可行或不应承诺

| 方案 | 结论 |
| --- | --- |
| 直接 `Subprocess.call(.exe)` 当 sandbox | 拒绝：只有 child launch + pipes；继承用户 token、环境和 filesystem 权限 |
| ACP WS bridge/Host Bridge CLI 当 OS sandbox | 拒绝：loopback/bearer/scope 是 transport/host capability；没有 AppContainer/Job/DACL/network boundary |
| 只用 `taskkill /T /F` | 拒绝作为 Strong cleanup：没有 Job no-breakaway、identity 或 WMI child guarantee |
| 只设置 `HTTP_PROXY`/`HTTPS_PROXY` | 拒绝作为网络强制：目标可忽略 env、直接 DNS/raw socket/其他 API |
| “所有 Windows 都是 win32-x64” | 拒绝：Zotero ARM64 host 有官方发行面，而仓库 resolver/asset 只有 win32-x64 |
| 将 SHA sidecar 当 Authenticode | 拒绝：SHA 是 bytes integrity，不是 signer/publisher trust |
| 覆盖 `%LOCALAPPDATA%\\...\\zotero-bridge.exe` | 拒绝作为可靠更新：Windows lock 会失败，当前路径没有全量 staged atomic rollback |
| 普通插件静默安装 MSIX/package identity | 不承诺：identity package 需要 manifest、签名和 registration；这不是 XPI 自带的 package identity |
| Win11 experimental CreateProcessInSandbox 作为默认 | 拒绝：Win11-only、dynamic no-header、experimental、AppContainer caller blocked |
| 以 Windows Sandbox 作为无条件 fallback | 拒绝：edition/feature/virtualization/one-instance/cold-start/guest IPC 均需 capability probe |

## 真实 Zotero 7/9 Windows x64/arm64 spike 计划

### 矩阵

至少执行以下组合，均使用真实安装的 Zotero、真实 XPI 安装/禁用/升级路径；每组再分别记录 standard user 和有管理员权限的 user，不以管理员成功替代普通用户结论。

| Host | OS | helper 组合 | 目的 |
| --- | --- | --- | --- |
| Zotero 7 x64 | Windows 10 当前受支持 build | win32-x64 helper | 下限兼容；无 Win11 experimental API |
| Zotero 7 x64 | Windows 11 x64 | win32-x64 helper + optional experimental probe | 比较 native AppContainer 与 experimental API |
| Zotero 7 ARM64 | Windows 11 ARM64 | x64 helper（emulation） | 量化仓库当前 x64 helper 是否可运行，不作默认承诺 |
| Zotero 7 ARM64 | Windows 11 ARM64 | native ARM64 spike binary（若构建可用） | 验证 future `win32-arm64` 分发和 token/Job/IPC |
| Zotero 9 x64 | Windows 10/11 x64 | win32-x64 helper | 验证新 host build 对 privileged Subprocess/resource URI 行为 |
| Zotero 9 ARM64 | Windows 11 ARM64 | x64 emulation + native ARM64 candidate | 发行级 ARM64 feasibility |

每次记录：Zotero version/build、host process bitness、Windows build/edition、UAC、安装路径、XPI packed/unpacked 形态、locale、企业安全软件/策略提示、CPU/内存/virtualization 状态。

### 通过条件和 canary

**分发与 PE：**

- 从真实 XPI resource URI materialize `.exe`，确认 bytes SHA 与 manifest；
- 检查 PE machine、x64/ARM64 选择和 x64 emulation 状态；
- Authenticode WinVerifyTrust + signer policy；
- helper 运行期间尝试安装新 digest generation；旧 path 必须继续可执行；
- 中断写入、重启 Zotero、模拟 Windows lock、回滚 active pointer；
- release receipt 必须能区分 `hash_verified`, `signature_verified`, `generation_active`, `previous_known_good`。

**Zotero launch：**

- 从插件通过 Mozilla `Subprocess.call` 启动 supervisor；验证 exact args、cwd、stdin/stdout/stderr、ready timeout 和 shutdown；
- Zotero 关闭/重启/插件 disable 时验证 supervisor/target/job 清理；
- 不使用 Node-only `child_process` 作为插件环境替代；
- 记录 `Subprocess.call`/resource URI 不可用时的结构化 failure。

**AppContainer/profile/DACL：**

- non-admin 创建/复用/删除 current-user profile；记录 `S_OK`, `ERROR_ALREADY_EXISTS`, `E_ACCESSDENIED` 等；
- 验证 package identity 不存在时 self-created moniker 仍可 launch；不要把 XPI URI 当 PFN；
- scope root read-only/read-write、新文件、rename/delete、outside root、`..`、junction/reparse/UNC/device path；
- 验证 profile 的 TEMP/TMP/LOCALAPPDATA 和 scope DACL；
- 对 host Zotero DataDirectory、其他 owner workspace、用户 secrets 做 negative access canary。

**Job/descendants：**

- target 直接 child/grandchild；cmd/PowerShell wrapper；通过 WMI `Win32_Process.Create`；尝试 breakaway/new Job；
- target 自行退出、超时、IPC 断开、supervisor crash、Zotero shutdown；
- 读取 Job membership、`TerminateJobObject` 结果和残留 PID；
- 检查 Zotero/parent 已在 Job 时 nested Job/Assign 失败语义；
- 只有 all required descendants terminated 才标 `cleanup=hard`。

**网络：**

- AppContainer no capability：DNS、TCP/UDP、IPv4/IPv6、loopback、link-local/private、WinHTTP、WinINet、raw Winsock；
- `internetClient` 仅作对照，不作为默认；
- proxy mode：尝试 bypass env、直连 IP、DNS rebinding、redirect、另一个 HTTP stack；
- host Gateway/proxy：验证 allowlist、credential isolation、redirect revalidation 和 failure closed；
- Win11 experimental API 只在明确 Win11 row 执行，并记录 API export/FlatBuffer/error code。

**IPC/identity/receipt：**

- named pipe 显式 DACL、remote deny、`\\.\\pipe\\LOCAL\\` AppContainer 规则、wrong owner/nonce/replay；
- `GetNamedPipe*ProcessId`、OpenProcessToken/GetTokenInformation、PE path/hash/signer 互相校验；
- loopback fallback 测试同用户其他 process 连接/伪造 token/重放/port race；
- receipt 字段与实际 process/token/job/profile/scope/policy 一一对应，失配必须拒绝 invocation。

**环境/日志/恢复：**

- 对照 current `buildSubprocessEnvironment + environmentAppend:true` 与 future explicit allow-list/false 的差异；
- 检查 auth key、Zotero Bridge token、PATH、HOME/USERPROFILE、TEMP、proxy credential 是否进入 target/env/argv/stdout/stderr/audit/crash dump；
- 写入中途终止、helper 版本切换、旧 generation 回滚、锁释放后的清理；
- measured startup/cold latency、parallel owners、memory、handle/pipe/job leaks。

### Spike 输出分级

每个矩阵格输出结构化结果：

```text
launch: A/B/C + error code
materialize/hash/signature/arch: pass|fail|unsupported
appcontainer/profile/dacl/scope: pass|fail|unsupported
job/descendant cleanup: hard|best_effort|fail
network: deny|gateway_proxy|unsupported
ipc/peer identity: verified|transport_only|fail
env scrub: pass|leak|unknown
receipt: issued only if all requested hard dimensions pass
```

任何一个 required hard dimension 在该 host 格上失败，都不能把该格宣称为 Strong；工具目录应按 receipt capability envelope 缩减，或者返回 `sandbox_unavailable`。特别是 ARM64 的 x64 emulation 通过 launch 不等于通过安全/性能/发布合同。

## 一手来源

### 当前仓库（A）

- [`src/utils/runtimeCompatibility.ts`](../../src/utils/runtimeCompatibility.ts) — Zotero/Firefox `Subprocess` module 探测及 Process 类型。
- [`src/modules/acpTransport.ts`](../../src/modules/acpTransport.ts) — ACP command resolution、Mozilla launch、pipes、wait/kill lifecycle。
- [`src/platform/processControl.ts`](../../src/platform/processControl.ts) — Windows cleanup snapshot 和 process identity capability flags。
- [`src/modules/acpWebSocketBridgeService.ts`](../../src/modules/acpWebSocketBridgeService.ts) — win32-x64 bridge asset、SHA digest path、loopback startup/shutdown。
- [`native/acp-ws-bridge/src/main.rs`](../../native/acp-ws-bridge/src/main.rs) — Rust WebSocket spawn、stdio、Windows `CREATE_NO_WINDOW`、`taskkill /T /F`。
- [`src/modules/hostBridgeServer.ts`](../../src/modules/hostBridgeServer.ts) — `nsIServerSocket`、loopback/LAN bind、bearer authorization、host capability server。
- [`src/modules/hostBridgeCliInjection.ts`](../../src/modules/hostBridgeCliInjection.ts) — run-local profile、scope、token/path injection。
- [`src/modules/hostBridgeCliResolver.ts`](../../src/modules/hostBridgeCliResolver.ts) — Windows 无视 arch 的 `win32-x64` resolution。
- [`src/modules/hostBridgeCliInstaller.ts`](../../src/modules/hostBridgeCliInstaller.ts) — `%LOCALAPPDATA%` target、SHA compare、overwrite、busy/locked error。
- [`src/modules/packagedAssetResolver.ts`](../../src/modules/packagedAssetResolver.ts) — XPI/resource URI 或 runtime path 的 binary read。
- [`src/modules/runtimePersistence.ts`](../../src/modules/runtimePersistence.ts) — runtime bytes write/copy/move 和不同 filesystem backend 的替换行为。
- [`src/platform/env.ts`](../../src/platform/env.ts) — Windows environment snapshot/allow-list、认证 key 保留和 `buildSubprocessEnvironment`。
- [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts) — `addon/bin` native assets 纳入 XPI build。
- [`host-bridge/cli-build-recipe.json`](../../host-bridge/cli-build-recipe.json) — 七平台 Host Bridge CLI build matrix。

### Mozilla/Firefox（B，启动语义）

- [Firefox Source Docs：Subprocess Module](https://firefox-source-docs.mozilla.org/toolkit/modules/subprocess/toolkit_modules/subprocess/index.html) — `Subprocess.call`、stdio pipes、graceful stdin close、`wait`/`kill`、exact args、环境继承与 `environmentAppend`。
- [Firefox Searchfox：Windows Subprocess implementation](https://searchfox.org/firefox-main/source/toolkit/modules/subprocess/subprocess_win.sys.mjs) — Windows subprocess implementation、path search 和 Windows-specific limits。
- [Firefox Source Docs：System Modules](https://firefox-source-docs.mozilla.org/jsloader/system-modules.html) — privileged code 通过 `resource://gre/modules` 导入 system modules 的运行背景。

### Zotero 官方（A，host 发行事实；不等于本插件 sandbox 事实）

- [Zotero 7 官方公告](https://www.zotero.org/blog/zotero-7/) — Windows 64-bit 与 Windows on ARM 支持说明。
- [Zotero 7 官方 changelog](https://www.zotero.org/support/7.0_changelog) — 7.x Windows 64-bit/ARM support 与 installer architecture 提示。
- [Zotero 官方 downloads](https://www.zotero.org/downloads?fullsite=0) — Zotero 9 Windows 64-bit、Windows ARM（以及其他 Windows 包）下载入口。
- [Zotero 官方插件开发文档](https://www.zotero.org/support/dev/client_coding/plugin_development) — 插件运行在 Zotero desktop privileged host 并使用内部/Firefox API 的边界。

### Microsoft 官方（B，平台能力；未在 Zotero spike）

- [Launch an AppContainer](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer) — Package/Capability SID、DACL、per-app profile、`STARTUPINFOEX` security capabilities 和 `CreateProcess` 流程。
- [CreateAppContainerProfile](https://learn.microsoft.com/en-us/windows/win32/api/userenv/nf-userenv-createappcontainerprofile) — current-user profile、ACL storage、return codes 和 Windows 8+ desktop API。
- [AppContainer isolation](https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation) — file/process/network/credential isolation 及显式 capability 模型。
- [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) — child inheritance、`TerminateJobObject`、kill-on-close、nested jobs、breakaway/WMI exception。
- [CreateProcessAsUserW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessasuserw) — primary token rights、`SE_INCREASE_QUOTA_NAME`/`SE_ASSIGNPRIMARYTOKEN_NAME` 和 user/environment 前提。
- [Create Process In Sandbox APIs](https://learn.microsoft.com/en-us/windows/win32/secauthz/createprocessinsandbox) — experimental `processmodel.dll` API、Win11 minimum、FlatBuffer specification、AppContainer/proxy policy 和 caller restrictions。
- [WinVerifyTrust](https://learn.microsoft.com/en-us/windows/win32/api/wintrust/nf-wintrust-winverifytrust) — PE/AuthentiCode trust-provider verification API。
- [Named Pipes](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes) 与 [Named Pipe Security and Access Rights](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights) — pipe ACL、local/remote access 和默认 DACL 风险。
- [GetNamedPipeClientProcessId](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getnamedpipeclientprocessid) 与 [Pipe Functions](https://learn.microsoft.com/en-us/windows/win32/ipc/pipe-functions) — pipe peer PID/session/server identity APIs 及 AppContainer `LOCAL` 命名规则提示。
- [Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/) — supported editions、hardware virtualization、disposable VM、网络默认开启、single-instance/启动特征。
- [Use and configure Windows Sandbox](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file) — Windows 10 build 18342+/Windows 11、`.wsb` network/mapped folders/logon command、ProtectedClient 和 guest/host sharing 风险。
- [Grant package identity to non-packaged apps](https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/grant-identity-to-nonpackaged-apps) — identity package 的 manifest、签名、注册和 installer 前提；说明 XPI 本身不是 MSIX package identity。

# Zotero-hosted 跨平台沙箱可行性矩阵

研究截面：2026-08-26。

关联决策：[Select the cross-platform sandbox architecture](https://github.com/leike0813/zotero-agents/issues/18)

平台报告：

- [Linux](./zotero-linux-sandbox-feasibility.md)
- [macOS](./zotero-macos-sandbox-feasibility.md)
- [Windows](./zotero-windows-sandbox-feasibility.md)

本文只汇总“从 Zotero 7/9 插件宿主能否建立 Strong Sandbox”的证据。一般 OS API 的存在不等于 Zotero 已经支持，也不等于运行时可以签发 Strong receipt。当前 MVP 采用 [Trusted Native Execution](./cross-platform-sandbox-architecture-prototype.md)，因此本文不再充当 issue #18 的阻塞门禁。

## 结论

当前不能选定一个已经由 Zotero 7/9 证明的跨平台 Strong Sandbox 架构。

仓库已经有一条可复用的宿主 seam：privileged Zotero 插件可以探测 Mozilla `Subprocess`，读取 XPI 中的 native bytes，物化到运行时路径，并用 stdin/stdout/stderr 与 native helper 通信。现有 ACP 和 Host Bridge 代码还提供了生命周期、hash、平台选择和结构化失败的工程材料。

这条 seam 只证明“可以协调 native helper”，没有证明 helper 已被隔离。三个目标平台的具体强制边界仍然都是 B 级候选：

- Linux：项目自有 Rust supervisor 启动经过探测的 bubblewrap，并组合 namespace、可选 Landlock/seccomp/cgroup；
- macOS：独立签名、公证的 helper 通过 stdio 与 Zotero 通信；App Sandbox/XPC 或 VM 必须作为独立 native 发行单元验证；
- Windows：独立签名的 Rust supervisor 创建 AppContainer、Workspace Scope DACL、Job Object 和受控 named pipe。

在每个平台完成真实 Zotero 7/9 spike 之前，不得把 direct `Subprocess.call`、ACP bridge、Host Bridge CLI、`sandbox-exec`、restricted token、`taskkill` 或 HTTP proxy 组合成 Strong 声明。MVP 可以提供明确标识、经用户授权的 Trusted Native Execution；它不签发 Strong receipt。

## 证据等级

| 等级 | 含义 |
| --- | --- |
| A | 当前仓库实现或真实 Zotero 运行证据已经证明。A 只覆盖被观察的行为，不能外推为 sandbox。 |
| B | Zotero、Mozilla、操作系统的一手资料支持实现路径，但尚未在目标 Zotero 7/9 平台 spike。 |
| C | 当前实现不存在、资料不足、依赖不可普遍满足，或不应成为产品承诺。 |

## 共用 Zotero 宿主事实

| 能力 | 当前事实 | 等级 | 限制 |
| --- | --- | --- | --- |
| native process launch | `getMozillaSubprocessModule()` 兼容 `.sys.mjs`、`.mjs` 和旧 `.jsm`；ACP transport 使用 `Subprocess.call`。 | A（代码）/B（跨版本实机） | 类型只含 command、args、env、cwd、pipes、wait、kill，没有 OS sandbox 参数。 |
| typed stdio | 仓库封装 stdin write/close、stdout/stderr drain、wait 和 kill。 | A（代码）/B（各平台背压、EOF、取消） | Node fake 不能代替真实 Zotero host。 |
| XPI native payload | `addon/bin/**/*` 进入 XPI；resolver 可读取 bytes，runtime persistence 可写入运行时路径。 | A（代码）/B（真实安装/升级） | XPI entry、SHA-256 和 executable bit 不等于 Apple/Windows 代码签名或 sandbox identity。 |
| platform selection | 现有 Host Bridge recipe 有七个 target，包含 Linux 四架构、macOS 两架构、Windows x64。 | A | Zotero Windows ARM64 已有产品面，而仓库没有 `win32-arm64` native asset。 |
| lifecycle cleanup | POSIX 有 pidfile/process-group best effort；Windows bridge 有 `taskkill /T /F`；shutdown 会关闭现有 runtime owners。 | A（实现） | 这些不是不可 breakaway 的进程树保证，不能写入 Strong receipt。 |
| environment | 当前 ACP subprocess 从宿主 snapshot 构造环境并使用 `environmentAppend: true`。 | A | 不符合不可信 helper 的 `inherit: none`；Strong lane 必须是独立 allowlist 与泄漏 canary。 |
| Host Bridge | loopback HTTP、bearer token、scope/profile 和 operation receipt 已存在。 | A | 属于宿主 capability/broker，不证明 native helper 的 OS 隔离或来源。 |

## 平台矩阵

| 平台 | 可复用的 Zotero seam | Strong 候选 | 当前等级 | 主要未证事实 | 不应承诺 |
| --- | --- | --- | --- | --- | --- |
| Linux | Mozilla Subprocess、POSIX stdio、runtime bytes、`chmod(0755)`、多架构 payload | Rust supervisor → bubblewrap；mount/user/PID/net namespace；按能力加入 Landlock/seccomp/cgroup | B | Zotero 7/9 真实 pipe/kill；XPI exec；userns/LSM/Flatpak/Snap；scope escape；network deny；descendants；receipt | bwrap 存在即 Strong；XPI 能修改内核、AppArmor/SELinux、cgroup 或 sandbox packaging policy |
| macOS | Mozilla Subprocess、darwin x64/arm64 bytes、POSIX stdio | 独立签名/notarized helper；受控工具集；需要时另行验证 App Sandbox/XPC 或 VM | B；XPC wiring 为 C/未实现 | XPI extraction 后的 signature/Gatekeeper；universal helper；Zotero 7/9 x64/arm64；workspace/bookmark；network；child tree；update | XPI 可直接注册 XPC；插件给 Zotero 增加 entitlement；Seatbelt/sandbox-exec 是稳定产品合同；任意 host command 已隔离 |
| Windows | Mozilla Subprocess、XPI `.exe` materialize、ACP bridge transport、loopback IPC、Windows cleanup precedent | Rust supervisor → per-owner AppContainer + scope DACL + Job Object + explicit-DACL named pipe | B | non-admin profile/token；suspended/early Job assignment；reparse/UNC scope；named pipe AppContainer ACL；Authenticode；ARM64；network deny；receipt | `taskkill`/restricted token/HTTP proxy 即 Strong；所有 Windows 都是 x64；Windows Sandbox/experimental API 为默认 |

## 对上一版候选的修正

### 1. 不能从“能启动 helper”推导“能建立 sandbox”

Mozilla `Subprocess.call` 是必要的宿主 seam，但只会以当前用户权限启动进程。它不创建 Linux namespace、macOS App Sandbox、Windows AppContainer 或 Job，也不会自动清理环境与 descendants。

### 2. native asset 完整性与平台身份必须分开

SHA-256 可以证明 materialized bytes 与 manifest 一致，但不能证明：

- macOS Developer ID、Team ID、entitlements、hardened runtime、notarization 或 Gatekeeper；
- Windows Authenticode signer、PE architecture、AppContainer profile 或 Job membership；
- Linux namespace、LSM、seccomp 或 cgroup 已经建立。

这些字段必须来自 distribution probe 与 owner-specific canary，而不是 XPI sidecar。

### 3. Linux Strong 最低门槛不能静态绑定所有增强机制

bubblewrap、Landlock、seccomp 和 cgroup 的可用性受 kernel、发行版、外层 container、AppArmor/SELinux、Flatpak/Snap 和 delegation 影响。架构可以把它们组合为 Adapter，但 receipt 必须逐维度报告；只有 owner 的 required policy 全部满足时才是 Strong。不能因为某个增强机制缺失就伪装成功，也不能把未要求的 CPU/memory hard quota 当作所有 lease 的静态前提。

### 4. macOS 需要独立签名发行单元

XPI 是 Zotero plugin resource，不是 Zotero.app 的签名 `Contents/XPCServices`。插件不能修改 Zotero 的 entitlements，也不能把 `.xpc` 目录复制进 Zotero.app 后保持其签名。stdio helper、XPC/App Sandbox 和 Virtualization.framework 都需要独立 native bundle/identity 与真实加载验证。

### 5. Windows 必须补 ARM64 与普通用户路径

Zotero 7/9 存在 Windows ARM64 host，当前仓库只打包/解析 `win32-x64`。AppContainer profile、scope DACL、Job、named pipe 与 Authenticode 还没有仓库实现。Windows Sandbox/Hyper-V 受 edition、feature、virtualization、单实例、guest bootstrap 和冷启动约束，只能是显式可选 lane。

## 未来可选 Strong spike

这些 spike 用于未来 Strong Executor，不阻塞 MVP。若重新启动其中一项，每项都必须从真实安装的 Zotero XPI 启动测试 helper，不使用 Node mock 代替。

### Linux spike

覆盖 Zotero 7/9、至少 x64 和项目准备承诺的其它 Linux 架构/发行渠道：

- `Subprocess` module、精确 argv、cwd、stdin/stdout/stderr、EOF、wait、kill；
- XPI bytes → content-addressed runtime path → SHA → `chmod` → execute；
- bwrap user/mount/PID/net namespace 与 parent-death canary；
- Workspace Scope 的 symlink/mount/TOCTOU、env scrub、raw network deny；
- shell/grandchild/background process 的取消和 orphan 扫描；
- Landlock/seccomp/cgroup 分维度探测与 receipt。

### macOS spike

覆盖 Zotero 7/9、Intel x64 与 Apple Silicon arm64：

- production-like XPI extraction 与绝对路径启动；
- Mach-O/universal slice、Developer ID、Team ID、nested code、hardened runtime、notary/Gatekeeper/quarantine；
- stdio helper 的 scope、env、network 和 child canary；
- managed root 与 external workspace bookmark 的生命周期；
- 若保留 XPC/App Sandbox：独立 helper app、`Contents/XPCServices`、peer requirement、launchd restart/unload；
- 更新/回滚、sleep/wake、plugin disable 与 Zotero shutdown。

### Windows spike

覆盖 Zotero 7/9、Windows 10/11 x64，以及 Zotero ARM64 的 x64 emulation/native ARM64 路径：

- XPI `.exe` materialize、SHA、PE machine、Authenticode、Windows lock 与 immutable generation；
- ordinary user 创建 AppContainer profile/token；
- Workspace Scope DACL、reparse/junction/UNC/device path；
- suspended/early Job assignment、no-breakaway、kill-on-close 与 WMI/COM descendants；
- explicit-DACL named pipe、AppContainer peer PID/token/path、replay/mismatch；
- no-network capability、Gateway proxy、environment scrub 与 receipt。

## Strong 跨平台通过门

每个平台只有同时满足以下条件，才可以进入候选架构的 Strong capability matrix：

1. 目标 Zotero 7/9 版本能够从真实 XPI resource 启动经过身份验证的 helper；
2. helper 与 target 的 platform/arch、version、binary digest、签名/发行身份可验证；
3. Workspace Scope 的读写边界与 escape canary 通过；
4. raw network、环境、secret、argv 和日志泄漏门禁通过；
5. shell、解释器、孙进程和后台任务继承限制，取消/关闭后无残留；
6. required resource dimensions 的实际 enforcement 与 receipt 一致；
7. owner、scope、policy、instance、binary 和 canary 变化会撤销旧 receipt；
8. 不可用时只返回 Restricted capability 或结构化失败，不执行宿主 fallback。

## 当前定位

issue #18 已选择 Trusted Native Execution 作为 MVP：Tool Gateway 是唯一入口，工作区内按授权自由读写，显式越界访问和未预授权命令需要审批。网络区分 Brokered Network、Direct Native Network 与 Local Network；只有 Brokered Network 声明可强制的目标和操作边界。

Linux、macOS 和 Windows 报告继续回答“未来能否增加 Strong Executor”。任何平台只有通过真实 Zotero spike 和本报告的 Strong 门禁，才能对具体调用签发 Strong receipt。失败或未实施不会关闭 MVP 的可信原生 Shell，也不能把 Trusted Native Execution 改名为 Strong。

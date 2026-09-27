# Wayfinder：Zotero-hosted Linux Sandbox 可行性专项

研究截面：2026-08-26。本文只回答 Linux 下由 Zotero 7/9 插件宿主协调原生 helper 的可行性，不是生产实现或安全保证。证据分级如下：

| 等级 | 含义 |
| --- | --- |
| **A** | 当前仓库实现或现有真实 Zotero 运行测试已经证明的行为。只对被测试的行为成立。 |
| **B** | Mozilla/Linux/bubblewrap 等一手资料支持，或仓库有实现路径，但尚未在真实 Zotero 7/9 Linux spike 证明。 |
| **C** | 当前证据不足、当前环境失败、依赖管理员/发行版策略，或不应作为产品承诺。 |

## 摘要

Linux 适合采用一条受能力门控的最小路径：

```text
Pi Runtime（Zotero JS）
  -> Tool Gateway
  -> Mozilla Subprocess.call（真实 Zotero 中待 spike）
  -> 随 XPI 物化的无 Node Rust supervisor
  -> supervisor 探测并启动外部 bubblewrap
  -> 受 scope、环境、网络和资源策略约束的工具
```

结论是“启动链可以设计，Strong sandbox 尚未被 Zotero 7/9 证明”。仓库已经有插件侧的 Mozilla Subprocess 适配、stdio 管道、POSIX 进程组回收、二进制按平台/架构选择、字节写入和 `chmod(0755)` 路径（A，属于代码事实）。但仓库的真实 Zotero 测试目前证明的是路径、IOUtils、命令注册等行为；没有证明 Zotero 7 或 Zotero 9 Linux 中 `Subprocess.call` 的真实管道/终止行为（B）。README 也明确 Zotero 7 尚未充分测试。

因此可以选择“Rust supervisor + 外部 bwrap + Landlock/seccomp（必要时）”作为 Linux Adapter 的候选设计，但只能在真实宿主 spike 的 canary、scope、网络、环境、子孙回收和 receipt 全部通过后签发 `strong`。没有 user namespace、bwrap、所需 Landlock ABI、可用 seccomp 或经委派的 cgroup 时，必须报告 `sandbox_unavailable`/`unsupported`；不能回退到 Host Bridge CLI、ACP bridge、Node、Mozilla 子进程或宿主 shell 来伪装成强沙箱。

本工作区的非破坏性探针结果不能替代真实桌面 Zotero：当前环境有 `bubblewrap 0.9.0`，内核报告 `CONFIG_USER_NS=y`、`CONFIG_SECCOMP=y`、`CONFIG_SECCOMP_FILTER=y`、`CONFIG_CGROUPS=y`，Landlock syscall 探测返回 ABI 4；但 `bwrap --unshare-user`、`unshare --user` 和 `unshare --net` 均因外层容器策略返回 `EPERM`，bwrap 网络探针还因配置 loopback 返回 `Operation not permitted`。这只能说明“本环境不能证明”，不能推断所有 Linux 桌面均失败。

## 关键证据表

| 能力 | 当前仓库/探针事实 | Zotero-hosted 结论 | 等级 |
| --- | --- | --- | --- |
| 从插件启动 native helper | `getMozillaSubprocessModule()` 尝试 `Subprocess.sys.mjs`、`Subprocess.mjs`、旧 `Subprocess.jsm`；ACP Linux 路径调用 `subprocess.call({command, arguments, environment, workdir})`。 | 有明确适配 seam；模块在 Zotero 7/9 的实际版本、权限和返回对象仍须 spike。 | A（代码）/B（宿主） |
| stdin/stdout/stderr IPC | 项目封装了 `stdin.write/close`、`stdout.readString`、`stderr.readString`、`wait`；ACP 使用 stdio，适合 JSONL/RPC。 | 真实 Zotero 7/9 的 pipe 关闭、EOF、背压和二进制边界须测试。 | A（代码）/B（宿主） |
| 一次性 Zotero subprocess | `Zotero.Utilities.Internal.subprocess(command,args)` 在项目诊断中只捕获一次输出，明确记录“没有 writable stdin surface”。 | 适合短命探针，不能作为交互 executor 或树回收 API。 | A（代码） |
| Node `child_process` | ACP 仅在 Mozilla Subprocess 不存在时动态 import `node:child_process`；Node fallback 使用 `spawn`。 | Node 只属于 Node runner/测试或非 Zotero fallback；不得当作 XPI 宿主能力。 | A（代码）/C（产品承诺） |
| 取消和子孙回收 | POSIX 路径可用 `setsid` + pidfile + `ps` 身份校验，再通过 Mozilla Subprocess 启动 `kill -s TERM/KILL -- -PGID`；失败时调用 `proc.kill` 并标记可能有 descendants。 | 这是已有 best-effort 路径，不是无条件的 process-tree guarantee；Zotero 7/9 实际 PGID、wrapper、权限须 spike。 | A（代码）/B（宿主） |
| Host Bridge 本地认证 | Host Bridge 绑定 `127.0.0.1`（LAN 模式另有配置），非 health 路由要求 Bearer token；operation receipt 绑定 request digest/runtime instance。 | 可复用为受信 broker 通道；它不是 sandbox helper 的来源证明或 cryptographic capability receipt。 | A（代码）/C（强证明） |
| Workspace Scope | Host Bridge CLI injection 写入 per-run `profile.json`、scope JSON、token 环境变量和 workspace shim。 | 这是协议/CLI scope 输入，不等于 OS mount boundary；须由 helper 再次按 canonical identity 实施。 | A（协议输入）/B（OS 边界） |
| XPI native asset | `addon/bin/**/*` 纳入构建；release manifest/sidecar 校验 SHA-256；运行时 resolver 从 URI/路径读取 bytes，再写 runtime path。 | 物化/执行 bit 有实现路径；真实 XPI 读取、更新、权限和执行须 spike。 | A（代码）/B（宿主） |
| Linux platform/arch | resolver 映射 `linux-x86`、`linux-x64`、`linux-arm`、`linux-arm64`；Rust target 由 build script 固定。 | 只能选择匹配 ABI；不能把 host architecture 或 `linux-x64` 作为未知 arch 的证明。 | A（代码） |
| bwrap namespaces | 官方 bwrap 依赖 user namespace；`--unshare-pid`、`--unshare-net`、mount layout、`--die-with-parent` 可构成候选边界。 | 当前环境 user/net namespace 失败；外部依赖、内核和 LSM 策略必须运行时门控。 | B（平台资料）/C（当前主机） |
| Landlock | Linux 文档支持非特权进程自我收紧 filesystem/network 权利并由后代继承；ABI 需探测。 | 适合作为 helper 内第二层约束；当前本机 ABI 4 只说明本机 syscall 存在，不证明 Zotero helper 可用。 | B |
| seccomp | 内核要求 `PR_SET_NO_NEW_PRIVS` 或 CAP_SYS_ADMIN；允许 fork/clone/exec 时后代继承 filter；bwrap 接收 seccomp FD。 | 由 Rust supervisor/helper 负责；当前项目的 Mozilla Subprocess DTO 没有 seccomp FD 传递接口，不能让 JS 直接声称已加载 filter。 | B（内核）/A（当前 seam 限制） |
| cgroup v2 | 内核文档要求父层启用 controller，并向非特权用户委派目录和相关 files；`cgroup.kill`/`cgroup.freeze` 只在可写非 root cgroup 有意义。 | 不可假定插件能创建或迁移到任意 cgroup；需要 systemd/user delegation 或明确 `unsupported`。 | B（内核）/C（无委派时） |

## Zotero 7/9 中的实际启动链

### 1. 插件侧 API 选择

[`src/utils/runtimeCompatibility.ts`](../../src/utils/runtimeCompatibility.ts#L8-L105) 定义的 Mozilla subprocess 对象只需要 `pathSearch`、`call` 和返回的 stdin/stdout/stderr/wait/kill 表面。`getMozillaSubprocessModule()` 在插件全局的 `ChromeUtils.importESModule` 可用时按顺序尝试：

```text
resource://gre/modules/Subprocess.sys.mjs
resource://gre/modules/Subprocess.mjs
resource://gre/modules/Subprocess.jsm（旧 import）
```

这证明了兼容性代码的意图和降级顺序，不证明每个 Zotero 7/9 发行版本都暴露相同模块。真实宿主应在插件 realm 中记录：specifier、`Subprocess.call` 的 keys、实际返回 process 的 keys、版本/平台和错误类型；不能仅凭 Node mock 的 fake `ChromeUtils` 通过。

### 2. ACP Linux 参考路径

[`src/modules/acpTransport.ts`](../../src/modules/acpTransport.ts#L1247-L1461) 的 Mozilla 路径：

1. 通过 Mozilla `pathSearch` 解析 command；
2. 对 wrapper-prone command，在 `sh`/`setsid`/`kill`/`ps` 预检通过时建立 pidfile supervisor；
3. 调用 `Subprocess.call`，传入 argv、当前项目环境快照加 overrides、`environmentAppend: true` 和 workspace `workdir`；
4. 从返回 pipe 持续 drain stdout/stderr，并把 stdin 暴露为可写流；
5. 先 `proc.wait()`，关闭 stdin 后等待 grace period；
6. 超时后读取 pidfile 和 `ps -o pid=,pgid=,sid=`，验证 pid/pgid/sid 与 supervisor token；
7. 用另一个 Mozilla subprocess 调用 `kill -s TERM -- -PGID`，再重新验证并发 `KILL`；不通过验证时只直接 kill process，并将可能遗漏 descendants 写入生命周期诊断。

[`src/platform/processControl.ts`](../../src/platform/processControl.ts#L205-L277) 明确：非 Windows 只有 `sh`、`setsid`、`kill`、以及用于 live identity 的 `ps` 都可用时，才报告 POSIX process-tree cleanup；否则是 `direct-kill-only`。这个防护有助于防止错误的负 PID signal，但它依赖外部命令、当前用户权限和真实进程行为，不能升级为任意 helper 的强保证。

`Subprocess.call` 的 API 语义由 [Mozilla Subprocess Module 文档](https://firefox-source-docs.mozilla.org/toolkit/modules/subprocess/toolkit_modules/subprocess/index.html) 支持：可启动 native process，异步读写 stdio，`wait` 后再在关闭阶段 `kill`；精确 argv 不经过 shell 展开；`environment` 可替换环境，`environmentAppend: true` 才会追加现有环境，`workdir` 设置 cwd。这里仍是 B：文档是 API 资料，不是本仓库在 Zotero 7/9 Linux 中跑过的证据。

### 3. 不能混用的路径

* [`launchNodeAcpTransport`](../../src/modules/acpTransport.ts#L1475-L1548) 依赖 `node:child_process`、`node:process` 和 Node streams。它只在没有 Mozilla 模块的 Node 环境 fallback；XPI 中不存在 Node runtime，不能作为 Linux Zotero 方案。
* `Zotero.Utilities.Internal.subprocess` 在 [`acpBackendRefreshCacheDiagnostic.ts`](../../src/modules/acpBackendRefreshCacheDiagnostic.ts#L3205-L3263) 被明确当作 one-shot output probe；没有 writable stdin、process object、wait/kill 或树回收表面。它不能替代 `Subprocess.call`。
* [`acpWebSocketBridgeService.ts`](../../src/modules/acpWebSocketBridgeService.ts#L74-L125) 的固定资源是 `bin/win32-x64/zotero-acp-bridge.exe`，启动与关闭也仅实现 Windows WebSocket bridge。它不能作为 Linux sandbox helper；Linux 应复用“插件启动 native process”的 seam，而不是复用这个二进制或 Windows lifecycle。
* Host Bridge 的 [`nsIServerSocket`](../../src/modules/hostBridgeServer.ts#L446-L457) 是插件内 HTTP broker 的 IPC；它不是不可信 shell 的隔离边界。Sandbox executor 的控制面应优先使用继承 pipe/一次性 nonce，再把 Zotero Native Tools 留在 broker。

### 4. Zotero shutdown

[`src/hooks.ts`](../../src/hooks.ts#L1122-L1210) 的 `onShutdown` 会依次 detach ACP 会话、关闭 ACP WebSocket bridge、停止 Host Bridge supervisor、关闭异步 lifecycle 并 flush runtime logs。它证明插件知道如何关闭现有模块（A），但没有“Linux sandbox helper 的通用 registry、退出后 descendant 验证、旧二进制 GC、插件 disable/update 钩子”。新 helper 不能假定 Zotero 关闭时 `proc.kill()` 已杀掉所有 descendants；必须由 supervisor 的 parent-death/cgroup/PID namespace 机制和退出回执共同证明。

## XPI 内 binary 的 materialize、选择和生命周期

### 已有可复用部分（A）

* [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts#L115-L129) 把 `addon/**/*.*` 和 `addon/bin/**/*` 纳入 XPI，并在 build hook 调用 native asset 校验。
* [`scripts/build-zotero-bridge-cli.mjs`](../../scripts/build-zotero-bridge-cli.mjs#L3-L39) 固定 Linux Rust targets：`i686-unknown-linux-gnu`、`x86_64-unknown-linux-gnu`、`armv7-unknown-linux-gnueabihf`、`aarch64-unknown-linux-gnu`。[`scripts/package-zotero-bridge-cli.mjs`](../../scripts/package-zotero-bridge-cli.mjs#L17-L58) 按平台/arch 写入 `addon/bin/<dir>/zotero-bridge`，Linux 构建产物在打包时 `chmod 0755` 并写 sidecar SHA-256。
* [`src/modules/hostBridgeCliResolver.ts`](../../src/modules/hostBridgeCliResolver.ts#L60-L205) 依据运行时平台/arch 选择目录；[`src/modules/packagedAssetResolver.ts`](../../src/modules/packagedAssetResolver.ts#L238-L315) 可以从 `rootURI`/`resourceURI` 的 URI 或路径读取 binary bytes，再写入 runtime path。
* [`src/modules/runtimePersistence.ts`](../../src/modules/runtimePersistence.ts#L1011-L1077) 通过 IOUtils、OS.File 或（仅 Node fallback）fs 写 bytes；[`setRuntimeExecutablePermissions`](../../src/modules/runtimePersistence.ts#L1131-L1180) 在非 Windows 上依次尝试 `Zotero.File.pathToFile().permissions`、XPCOM `nsIFile.permissions` 和 Node `chmod`。这给出了真实 Zotero 中不依赖 Node 的权限 API 路径，但只有真实 Linux XPI spike 才能证明当前版本的权限 setter 行为。
* Host Bridge CLI installer 在 [`src/modules/hostBridgeCliInstaller.ts`](../../src/modules/hostBridgeCliInstaller.ts#L472-L492) 和 [`#L643-L697`](../../src/modules/hostBridgeCliInstaller.ts#L643-L697) 对变更后的 bytes 重新写入并恢复 `0755`；固定安装目标被占用时返回结构化失败，而不是静默覆盖运行中的文件。

### 当前边界（A/C）

* [`scripts/check-plugin-native-assets.ts`](../../scripts/check-plugin-native-assets.ts#L74-L151) 检查 XPI entry 是否存在、sidecar 是否可解析、bytes/hash/manifest 是否一致；[`scripts/zip-archive.ts`](../../scripts/zip-archive.ts#L38-L124) 只解析 entry bytes，没有验证 ZIP external attributes 的 Unix executable mode。因此“XPI 中带了可执行 bit”不是运行时契约，必须在 materialize 后显式 chmod 并 stat/execute canary。
* resolver 本身不执行 binary；它只读 bytes。XPI URI、临时 runtime path、用户安装目录和 PATH 解析是不同 trust domain。未来 Sandbox Executor 应采用内容寻址目录（digest/版本），写入临时文件、hash/签名校验、`fsync`/原子 rename（若宿主 API 可用）后 chmod，最后执行 `--version`/handshake。
* 现有 ACP bridge 的内容寻址 runtime path只针对 Windows `.exe`；Host Bridge CLI 在 Linux 可安装到 `$HOME/.local/bin` 或 `$HOME/bin`。这些路径和 Host Bridge profile 不能直接变成 sandbox scope。
* `onShutdown` 没有删除通用 materialized helper；“更新、禁用、关闭后没有旧进程/旧 pidfile/旧 runtime tree”目前不是 A。更新时应保留仍在使用的 digest 目录直到 owner lease 完成，随后 GC；禁用/卸载和崩溃恢复必须以可审计的 orphan sweep/spike 证明，不得在运行中的 helper 上强制删除文件。

## Linux OS 机制的真实前提

### bubblewrap / user、mount、PID、network namespace

[bubblewrap 官方 README](https://raw.githubusercontent.com/containers/bubblewrap/main/README.md) 明确：bwrap 依赖 Linux user namespaces 来让非特权用户建立 sandbox；历史 setuid mode 已移除。它建立空 mount namespace，文件视图完全由命令行参数构造；它不是带固定政策的 ready-made sandbox，安全含义由调用者的参数决定。README 还说明 `--unshare-pid` 会放置用于 reap children 的 PID 1，`--unshare-net` 只留下 loopback 网络命名空间，并可结合 seccomp filters。

这意味着 Zotero 插件可以把 scope DTO 交给一个无 Node supervisor，由 supervisor 生成固定且审计过的 bwrap argv：

```text
--die-with-parent
--unshare-user --unshare-pid --unshare-net
--clearenv --setenv ...
--proc /proc --dev /dev
--ro-bind <runtime-root> /resources
--bind <managed-workspace> /workspace
--bind <scratch> /scratch
-- <helper-or-tool> ...
```

但 bwrap 可执行不等于 namespace 可用。内核 config、`/proc/sys/user/max_user_namespaces`、`kernel.unprivileged_userns_clone`、AppArmor/SELinux、外层 container、Flatpak/Snap profile 都可能拒绝 clone、uid map、mount 或 loopback 设置。`--unshare-user-try` 只适合诊断/非 Strong 模式；Strong 模式不能在 namespace 被跳过后继续执行。

### Landlock

[Linux kernel Landlock 文档](https://www.kernel.org/doc/html/latest/userspace-api/landlock.html) 支持非特权进程自我限制；规则会作用于当前线程及其后代，限制只能叠加。filesystem 层级和 bind mount 的语义需要按实际层级设计；网络规则从 ABI 4 支持 TCP，ABI 10 才支持 UDP。文档建议运行时读取 ABI 并只使用已支持的 access rights。

Landlock 适合作为 helper 内的第二层：先由 bwrap 建立可见文件树，再由 helper 用目录 FD/稳定 canonical identity 写 Landlock ruleset，将 `/workspace`、`/scratch`、`/resources` 分成精确读写等级。它不能独立替代 mount namespace；旧 ABI、已打开的 FD、网络协议覆盖和外部 LSM 仍须进入 receipt。插件 JavaScript 不应自行实现 syscall policy；helper 必须在 exec 不可信工具前完成 `no_new_privs`、ruleset 和 canary。

### seccomp

[Linux kernel seccomp 文档](https://docs.kernel.org/userspace-api/seccomp_filter.html) 规定安装 filter 前需要 `PR_SET_NO_NEW_PRIVS` 或 namespace 内 CAP_SYS_ADMIN；若允许 fork/clone/exec，子孙会继承 filter。seccomp 本身不是完整 filesystem/network sandbox，仍需与 namespace、Landlock、DAC/LSM 一起使用。

bwrap 的 `--seccomp FD`/`--add-seccomp-fd FD` 要求调用者准备 FD。当前项目的 Mozilla subprocess DTO 只公开命令、argv、环境、cwd 和三条 pipe，没有向 child 传递任意已打开 FD 的接口。因此“插件 JS 直接启动 bwrap 并传 seccomp FD”不是当前已证明路径；把 bwrap 与 seccomp policy 交给项目自有 Rust supervisor 是较小且可测的 seam。filter 的 syscall 集合、架构分支和工具兼容性必须由真实 helper canary 证明，不能把“seccomp 可用”写成“策略已生效”。

### cgroup v2

[Linux kernel cgroup v2 文档](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html) 说明 controller 必须在 `cgroup.controllers` 可用、从父层通过 `cgroup.subtree_control` 启用；非特权委派需要对目录以及 `cgroup.procs`、`cgroup.threads`、`cgroup.subtree_control` 等适当文件授予写权限，并要求 delegation containment。非 root cgroup 的 `cgroup.freeze` 可冻结树，`cgroup.kill` 可处理并发 fork 后的整棵树。

Zotero 插件不能假设自己有 root cgroup 写权限，不能写 `/sys/fs/cgroup` 根层，也不能擅自把自身或其他宿主进程迁移。可行做法是：

* supervisor 启动时使用系统已经委派的 per-user subtree；或
* 与 user systemd scope/外部服务建立明确、可探测的 owner scope；或
* 不提供 cgroup hard limit，并在 receipt 标记 `unsupported`，当策略要求 hard limit 时拒绝 lease。

当前本机 `/sys/fs/cgroup` 是 `cgroup2fs`，可见 `cpuset cpu io memory hugetlb pids rdma misc`，但根目录、`cgroup.procs` 和 `cgroup.subtree_control` 均不可写。这是当前执行环境的 C 结果，不是所有发行版结果。

### Flatpak、Snap、AppArmor、SELinux

* [Flatpak 官方 Sandbox Permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html) 记载默认无 host file、network、外部 process、部分 syscall 和 host services；权限在 manifest 的 `finish-args` 中配置且是静态的。外层 Flatpak 不能被 XPI 临时扩权；即使 `/usr/bin/bwrap` 可见，也可能缺少 userns、mount、network 或 workspace 文件权限。Flatpak 下应把 `.flatpak-info`、mountinfo、可见 runtime path 和 namespace canary 纳入探测。
* [Ubuntu Snap confinement 官方文档](https://documentation.ubuntu.com/security/security-features/privilege-restriction/snap-confinement/) 说明 strict snap 使用 AppArmor、seccomp、device cgroups、capabilities、mount namespaces 和传统权限，接口（plugs）决定额外资源；devmode/ classic 的语义不同。XPI 不能更新 snapd 生成的 profile 或隐式连接接口，不能把 strict/classic/devmode 当成同一环境。
* [Ubuntu AppArmor 文档](https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/) 说明 AppArmor 是 path-based LSM，可限制文件、网络、执行、信号、mount 和 user namespace；文档特别指出 profile 可以拒绝 unprivileged user namespaces。AppArmor profile 是宿主管理员/发行版资产，不应由插件静默安装。
* [Red Hat SELinux 官方文档](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index) 说明 SELinux 由管理员加载的 label/policy 决定访问，未被发行版 policy 描述的应用不会自动获得自定义 confinement；为自定义应用写 policy 需要系统 policy 工具/权限。XPI 只能继承并探测当前 label，不能承诺跨发行版自动加载 SELinux policy。

## 逐项回答：scope、网络、环境、回收和 receipt

| 维度 | Zotero-hosted 可实现方式 | 当前结论 |
| --- | --- | --- |
| Workspace Scope | 插件只把受信内部 DTO（scope id、canonical digest、host reference）经 stdio/一次性 nonce 给 supervisor；supervisor 用固定虚拟根建立 bwrap bind，helper 再用目录 FD/Landlock 重查；模型和日志只见虚拟路径。 | 协议输入 A；OS 强边界 B，必须通过 `..`、symlink、mount crossing、外部 worktree、TOCTOU canary。 |
| network deny | 默认 `--unshare-net`，不传 host socket/FD；bwrap 官方语义是 namespace 内只有 loopback。必要的 Web 访问走插件/Gateway typed proxy，不把 `HTTP_PROXY` 当原始 shell 网络隔离。 | B；当前主机 loopback 配置失败，不能标 Strong。若要 proxy-only，必须证明 raw TCP/UDP、DNS、redirect、private/link-local、loopback 均不可绕过；Landlock ABI 4 只覆盖 TCP，不能单独保证全部网络。 |
| env scrub | 当前 [`buildSubprocessEnvironment`](../../src/platform/env.ts#L909-L931) 复制已初始化环境，再覆盖 overrides；ACP 当前传 `environmentAppend: true`，不是 allowlist scrub。Mozilla API 的 `environment` + `environmentAppend: false` 可支持替换全环境，但须在 Zotero spike 验证；helper/bwrap 使用 `--clearenv --setenv` 更直接。 | 当前实现不是环境 scrub（A 事实）；新 Strong helper B。canary 必须用 `env -0` 检验 HOME、tokens、proxy、SSH、Zotero 内部变量无意泄漏。 |
| descendant kill | 现有 POSIX process-group supervisor 可在命令可用、身份校验成功时终止 PGID；bwrap PID namespace/reaper + `--die-with-parent` 可缩小 descendants；cgroup `cgroup.kill` 仅在取得委派时加入。 | A（已有 best effort）/B（helper Strong）；必须模拟 shell wrapper、double-fork、ignore TERM、并发 fork，确认不杀宿主同组进程。 |
| local receipt auth | Host Bridge token 使用随机 token/Bearer，HTTP operation receipt 使用 request digest/runtime instance/状态；helper receipt 应由 supervisor 在建立边界后绑定 binary digest、instance nonce、owner/scope/policy digest 和 canary 结果，再通过受信 pipe 返回。 | Host Bridge auth/业务 receipt A；sandbox provenance/MAC C，需新协议和 spike。普通 workspace JSON 或 Bearer token 不能证明 helper 真的处于 namespace。 |

## 候选架构与选择

### 最小可行候选：项目自有 supervisor，bwrap 为外部可探测后端

1. XPI 随插件分发按 platform/arch 构建的 Rust supervisor；物化到内容寻址 runtime 目录，校验 release manifest/sidecar/hash（必要时签名），显式 chmod，运行 handshake。
2. 插件仅调用真实 Zotero 的 Mozilla `Subprocess.call`，传 `stdin/stdout/stderr`、短期 instance nonce 和经过验证的内部 scope DTO。不要把 secret、完整策略或 host path 放到模型可控 argv。
3. supervisor 探测固定版本/参数集合的 bwrap、userns、mount/pid/net namespace、`--die-with-parent`、`--clearenv` 和 seccomp 接口；所有 required canary 通过后才启动不可信工具。
4. supervisor 负责 bwrap、Landlock、seccomp、可选 cgroup；插件负责 owner/lease、Tool Gateway、receipt 验证、审计和 Restricted Broker。bwrap policy 由 supervisor 单一事实源生成，不能由 workflow 或 prompt 拼接。
5. bwrap/userns/required canary 失败时返回结构化 `sandbox_unavailable`；若 owner 只要求 Restricted capability，则继续使用类型化 Web/Zotero broker，但绝不把 Host Bridge CLI、ACP 或 Node fallback 当 sandbox。

可随 XPI 分发的是 supervisor、策略版本、平台 binary、manifest/签名和 canary；不能随 XPI 分发或强行开启的是 Linux kernel namespace、Landlock、seccomp、cgroup controller、AppArmor/SELinux policy 和 Flatpak/Snap 权限。bwrap 可以作为独立发行组件由系统提供；是否把固定版本 bwrap 也放进 bundle，应另做许可证、更新、静态依赖和安全维护评审，且仍不能绕过 host kernel/LSM。MVP 不应静默安装 bwrap 或修改管理员安全策略。

### 不应承诺的方案

* 仅在插件进程中用 JS、路径前缀、审批或 Host Bridge token 运行任意 shell；这些是策略/认证，不是 OS 隔离。
* 依赖 Node `child_process`、`process.kill` 或 Node fd API；它们只在 Node 测试路径出现。
* 直接把当前 `Zotero.Utilities.Internal.subprocess` 当成交互 IPC 或 process-tree API。
* 只设置 `HTTP_PROXY`、将 host network namespace 共享给 helper，或把“DNS 成功/HTTP 失败”当 network deny 证明。
* 只检查 `bwrap --version`、`/proc/sys/user/*` 或 `CONFIG_*` 就发 Strong receipt；当前主机正好展示了 sysctl/config 存在但 unshare 被外层策略拒绝。
* 让 XPI 自行安装 AppArmor/SELinux policy、启用 cgroup controller、修改 Snap/Flatpak manifest，或把 rootful daemon 作为静默依赖。
* 把现有 Windows ACP WebSocket bridge、Host Bridge CLI 安装目录或 Host Bridge HTTP server 直接当 Linux executor。

## 真实 Zotero 7/9 Linux spike 计划

Spike 必须在实际安装的 Zotero 7 和 Zotero 9 Linux 中分别运行，至少覆盖一个普通原生发行版环境（Ubuntu/Debian 类）和一个 SELinux/Fedora 类环境；若发行渠道包含 Flatpak/Snap，再分别运行其封装版本。所有测试使用 disposable temporary directory、独立 test helper 和真实插件 realm，不使用 Node mock 来替代结果。

| Spike | 入口/验收命令 | 通过条件 | 失败处理 |
| --- | --- | --- | --- |
| 宿主 Subprocess API | 在 `zotero-plugin test` 的真实插件测试入口中，调用 `ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs")`（按版本 fallback），再用 `/bin/sh` 或专用 helper 测试 `arguments`、`workdir`、stdin EOF、stdout/stderr drain、`wait`、exit code、`kill`。项目入口可沿用 `npm run test:zotero:cli`，但必须新增实际 spike case。 | 同一 case 在 Zotero 7/9 Linux 返回可预测 process/pipe，并且没有 Node-only globals。 | 标记 `subprocess_unavailable`/`host_semantics_unproven`；不启用 Strong。 |
| XPI materialize | 构建测试 XPI 后运行 `zotero-plugin build` 的 native asset check；插件读 packaged bytes → runtime path → chmod；helper 输出 digest/version。外部检查：`stat -c '%a %n' <materialized-helper>`、执行 `--version`。 | sidecar/hash 一致，mode 至少 owner execute，实际 exec 成功；URI/path 失败可诊断。 | 不以 XPI entry mode 代替 chmod；返回 asset/permission failure。 |
| 更新/禁用/关闭 | 启动带 descendants 的 helper；更新到另一 digest、禁用插件、正常退出和强制关闭 Zotero；检查 owner process、descendants、pidfile、ready/receipt、旧 runtime tree。可用 `ps -o pid,ppid,pgid,sid -p <pid>` 和 `/proc/<pid>` 只读观察。 | 无 orphan process；运行中 digest 不被覆盖；关闭后 pidfile/临时控制文件按策略清理；崩溃恢复能报告 outcome unknown。 | 保留诊断和 orphan quarantine，不删除未知路径；Strong 不可用。 |
| bwrap namespace canary | 在 helper/supervisor 外部复现同一 argv，例如：

```sh
bwrap --die-with-parent --unshare-user --unshare-pid --unshare-net \
  --clearenv --setenv PATH /usr/bin \
  --ro-bind /usr /usr --proc /proc --dev /dev \
  --dir /workspace --bind "$WORKSPACE" /workspace -- \
  /path/to/probe --json
```

同时记录 `readlink /proc/self/ns/{user,mnt,pid,net}`、`id`、`mountinfo`、PID 1 和网络接口。 | user/mount/pid/net namespace 均改变；只见允许 mount；pid 1 正确 reap；parent death 能终止树；`--clearenv` 生效。 | 任何 required namespace/parent-death canary 失败即 `sandbox_unavailable`，不可使用 `--unshare-*-try` 标 Strong。 |
| scope escape | probe 尝试 `/workspace/../`、绝对未声明路径、symlink 到 home、跨 mount、rename/link/truncate；测试 managed workspace、scratch、资源只读和 external workspace。 | 仅声明虚拟根可达，读写等级准确，所有 escape 失败并进入 receipt。 | 关闭任意代码执行；不要退回宿主 shell。 |
| network | 在 `--unshare-net` 中尝试 DNS、TCP/UDP 外连、loopback/localhost、IPv4/IPv6、Unix abstract socket；proxy 模式另测 redirect/private/link-local。用 `ss -tpn`/probe 自己输出，不依赖 UI。 | deny 模式 raw network 全部失败；proxy 模式只有受控 typed proxy；网络状态和 allowlist digest 出现在 receipt。 | 仅提供 broker Web；不能把环境 proxy 当证明。 |
| Landlock/seccomp | helper 输出 `landlock_create_ruleset(NULL,0,VERSION,0)` ABI；按 ABI 建 ruleset，尝试越界读写；加载最小 seccomp filter 后 fork/exec probe，验证 syscall deny 和子代继承。 | ABI/handled rights 与 receipt 一致，规则在不可信 exec 前生效，子代继承；缺 ABI 时按策略拒绝而非误报。 | 降为 Restricted 或关闭 code execution。 |
| cgroup v2 | 读取 `/sys/fs/cgroup/cgroup.controllers`、目标 delegated subtree 的 `cgroup.subtree_control`；若有权限，创建 owner cgroup，配置 `pids.max`/`memory.max`/`cpu.max`，验证 `cgroup.freeze` 和 `cgroup.kill`。 | 只有实际可写、包含目标进程且 containment 正确时才宣称 hard limit；记录 controller。 | 没有 delegation 就标 `unsupported`；策略要求 hard limit 时拒绝。 |
| descendant cleanup | helper 生成 shell wrapper、double-fork、ignore TERM、并发 fork；取消先 grace 后 TERM/KILL，观察 owner PGID/PID namespace/cgroup。 | 只杀 owner tree，宿主及另一 run 完好；关闭后全部 `/proc/$pid` 消失或进入明确不可回收错误。 | 任何 ownership 校验失败都禁止负 PID signal，Strong 失败。 |
| receipt/auth | plugin 发一次性 nonce；supervisor 先建边界、跑 canary，再返回包含 binary digest、instance nonce、scope/policy digest、实际 backend 和 capability 状态的受认证 receipt。修改 token、digest、scope、canary 结果后重放。 | 篡改/错 owner/错 nonce/过期 receipt 全拒绝；Host Bridge bearer 不能单独通过 sandbox provenance 检验。 | 只允许 Restricted lease；记录拒绝原因。 |

Spike 的最终验收不是“命令返回 0”，而是每个 required 维度都有可重现的 canary 证据、版本/平台/架构、binary digest、scope/policy digest 和失败原因。Zotero 7 与 9、原生与 Flatpak/Snap 的结果必须分开记录；一套宿主通过不能替另一套宿主背书。

## 当前主机的只读探针记录

本次未安装依赖、未创建虚拟环境、未启动服务器。执行的只读/失败即返回探针包括：

```text
kernel: Linux 6.8.0-138-generic x86_64
bwrap: /usr/bin/bwrap, bubblewrap 0.9.0
user sysctl: max_user_namespaces=255948, unprivileged_userns_clone=1
kernel config: USER_NS/SECCOMP/SECCOMP_FILTER/CGROUPS/CGROUP_BPF=y
cgroup fs: cgroup2fs; controllers include cpuset cpu io memory hugetlb pids rdma misc
LSM: lockdown,capability,landlock,yama,apparmor
PID 1 context: unconfined
current process: CapEff=0, Seccomp=0, Seccomp_filters=0
Landlock VERSION syscall: ABI 4
bwrap --unshare-user: setting up uid map: Permission denied
unshare --user: write failed /proc/self/uid_map: Operation not permitted
unshare --net: unshare failed: Operation not permitted
bwrap --unshare-net: loopback: Failed RTM_NEWADDR: Operation not permitted
current /sys/fs/cgroup and root cgroup files: not writable
```

这组结果支持两个工程决策：第一，启动前必须做实际 namespace canary，而不是只做 executable/config 检查；第二，失败必须是结构化 unavailable，不能在当前环境悄悄降级为 host process 并继续声称 sandbox 生效。

## 来源与仓库证据

### 一手平台资料

* [Mozilla Subprocess Module](https://firefox-source-docs.mozilla.org/toolkit/modules/subprocess/toolkit_modules/subprocess/index.html)：native process、argv、stdio、environment/environmentAppend、workdir、wait/kill 语义。
* [Zotero plugin development](https://www.zotero.org/support/dev/client_coding/plugin_development)：插件运行在 Zotero desktop 中并使用 Firefox/Zotero privileged API；不能把 Node runner 视为插件 runtime。
* [bubblewrap 官方 README](https://raw.githubusercontent.com/containers/bubblewrap/main/README.md)：user namespace 前提、mount/pid/network namespace、reaper、seccomp 参数和“policy 由调用者负责”的边界。
* [Linux kernel Landlock](https://www.kernel.org/doc/html/latest/userspace-api/landlock.html)：非特权自我限制、后代继承、ABI/文件层级/bind mount、TCP/UDP ABI 差异。
* [Linux kernel seccomp filter](https://docs.kernel.org/userspace-api/seccomp_filter.html)：`no_new_privs`/CAP_SYS_ADMIN、fork/clone/exec 继承和 filter 限制。
* [Linux kernel cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)：controller availability、top-down/delegation、`cgroup.freeze`、`cgroup.kill` 和 containment。
* [Flatpak Sandbox Permissions](https://docs.flatpak.org/en/latest/sandbox-permissions.html)：默认 host file/network/process/syscall 限制、静态权限和 portal/finish-args 边界。
* [Ubuntu AppArmor](https://documentation.ubuntu.com/security/security-features/privilege-restriction/apparmor/) 与 [Ubuntu Snap confinement](https://documentation.ubuntu.com/security/security-features/privilege-restriction/snap-confinement/)：path-based profile、unprivileged user namespace restriction、strict snap 的 AppArmor/seccomp/cgroup/mount 组合与接口依赖。
* [Red Hat Enterprise Linux 9 SELinux](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index)：管理员 policy/label、默认 policy 覆盖范围和自定义应用 policy 前提。

### 本仓库一手证据

* [`runtimeCompatibility.ts`](../../src/utils/runtimeCompatibility.ts#L8-L105)、[`acpTransport.ts`](../../src/modules/acpTransport.ts#L305-L351) [`#L1247-L1461`](../../src/modules/acpTransport.ts#L1247-L1461)：Mozilla Subprocess 适配、stdio、POSIX supervisor、wait/TERM/KILL。
* [`processControl.ts`](../../src/platform/processControl.ts#L205-L277)、[`env.ts`](../../src/platform/env.ts#L909-L931)：进程控制预检和当前环境继承语义。
* [`runtimePersistence.ts`](../../src/modules/runtimePersistence.ts#L1011-L1077) [`#L1131-L1180`](../../src/modules/runtimePersistence.ts#L1131-L1180)、[`packagedAssetResolver.ts`](../../src/modules/packagedAssetResolver.ts#L238-L315)：runtime bytes、Zotero/XPCOM chmod、packaged URI/path 读取。
* [`hostBridgeCliResolver.ts`](../../src/modules/hostBridgeCliResolver.ts#L60-L205)、[`hostBridgeCliInstaller.ts`](../../src/modules/hostBridgeCliInstaller.ts#L472-L492) [`#L643-L697`](../../src/modules/hostBridgeCliInstaller.ts#L643-L697)、[`hostBridgeCliInjection.ts`](../../src/modules/hostBridgeCliInjection.ts#L98-L290)：Linux arch 选择、物化/权限恢复、per-run scope/profile/token 注入。
* [`hostBridgeAuth.ts`](../../src/modules/hostBridgeAuth.ts#L295-L324)、[`hostBridgeServer.ts`](../../src/modules/hostBridgeServer.ts#L3993-L4102) [`#L4796-L4924`](../../src/modules/hostBridgeServer.ts#L4796-L4924)、[`hostBridgeOperationStore.ts`](../../src/modules/hostBridgeOperationStore.ts#L28-L215)：loopback/Bearer auth、operation receipt、server lifecycle。
* [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts#L115-L129)、[`package-zotero-bridge-cli.mjs`](../../scripts/package-zotero-bridge-cli.mjs#L17-L58)、[`build-zotero-bridge-cli.mjs`](../../scripts/build-zotero-bridge-cli.mjs#L3-L39)、[`check-plugin-native-assets.ts`](../../scripts/check-plugin-native-assets.ts#L74-L151)：XPI assets、Linux targets、chmod、hash/sidecar 校验。
* [`hooks.ts`](../../src/hooks.ts#L1122-L1210)：插件 shutdown 顺序；[`acpWebSocketBridgeService.ts`](../../src/modules/acpWebSocketBridgeService.ts#L74-L125) [`#L266-L380`](../../src/modules/acpWebSocketBridgeService.ts#L266-L380)：Windows-only ACP bridge，说明不可复用边界。
* [`test/core/165-runtime-platform-services.zotero.test.ts`](../../test/core/165-runtime-platform-services.zotero.test.ts#L21-L141)、[`test/core/186-acp-runtime-file-io.zotero.test.ts`](../../test/core/186-acp-runtime-file-io.zotero.test.ts#L21-L133)：真实 Zotero 测试目前覆盖 runtime path/IOUtils/file IO；[`README.md`](../../README.md#L91-L96) 与 [`doc/testing-framework.md`](../../doc/testing-framework.md#L240-L243)：Zotero 9 测试状态及 Zotero 7 后续宿主验证项。
* [跨平台 Sandbox Executor 一手研究](./cross-platform-sandbox-primary-research.md)：上层候选/receipt 方向；本文补足其未证明的 Zotero-hosted Linux 启动和发行版前提。

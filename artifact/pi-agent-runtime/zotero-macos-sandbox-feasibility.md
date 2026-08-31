# macOS 下 Zotero 7/9 插件宿主可行性研究

> Wayfinder ticket：Select the cross-platform sandbox architecture
> 研究范围：Zotero-hosted macOS；不是生产实现
> 研究日期：2026-08-26

## 结论先行

当前没有 macOS 主机，因此本文没有声称实测 Zotero 7/9、Intel/Apple Silicon、Gatekeeper、App Sandbox 或 XPC。仓库证据证明的是“插件可以尝试启动 native child，并在宿主生命周期中收尾”；它没有证明 macOS 上任意一种沙箱已经成立。

最小可行路线是 `MacSignedHelperStdIO`：把一个独立签名的 universal helper 作为单独的发行身份，随 XPI 携带经过校验的 payload，运行时复制到 content-addressed 路径，用 Zotero/Gecko 的 Mozilla `Subprocess.call` 以绝对路径启动，通过有界、类型化的 stdin/stdout RPC 通信；helper 自己执行 scope、环境、网络和子进程 canary，只有 receipt 证明的能力才开放。它可以利用现有 Zotero transport seam，但在真实 Zotero 7/9 macOS spike 通过前只能标为 B（平台支持、宿主未验证）。

XPC/App Sandbox 是可考虑的增强路线，不是 XPI 自身提供的能力：XPI 的 `jar:file` 根 URI 不能把代码变成 Zotero.app 内 `Contents/XPCServices` 中的已签名服务；插件也不能为已签名 Zotero 进程增加 entitlements。要用 XPC、独立 App Sandbox 或 Virtualization.framework，必须发行并验证一个独立的 native bundle/服务。host-installed 任意命令、`sandbox-exec`/Seatbelt、将 `Subprocess.call` 当沙箱、以及“XPI 校验成功即等于 extracted helper 已签名/已 notarize”均不应承诺。

## 证据等级与限制

| 等级 | 含义 | 本文如何使用 |
| --- | --- | --- |
| A | 当前仓库源码或真实 Zotero 测试已证明的行为 | 证明插件调用链、fallback 和治理合同；“A”不等于已经在 macOS 实机验证 |
| B | Zotero/Mozilla/Apple 一手资料支持，但尚未在 Zotero 7/9 macOS spike 证明 | 证明 API/签名/entitlement 的存在，不能当作宿主兼容承诺 |
| C | 假设、缺少公开稳定契约、当前实现不存在，或不满足边界 | 不作为产品能力；只能作为实验或明确拒绝项 |

本环境不是 macOS，也没有可运行的 Zotero 7/9 macOS 主机。仓库的当前验收文档记录的是 Zotero 9.0.4，Zotero 7 仍是后续宿主验证项；因此本文没有“macOS 已通过”的 A 结论。

## 1. Zotero 插件实际启动、通信、取消和清理链

### 1.1 插件进入宿主的边界

仓库的 `addon/bootstrap.js` 使用 Zotero 的 bootstrapped plugin 生命周期：`startup({ id, version, resourceURI, rootURI })` 注册 chrome，将 `rootURI` 作为脚本和资源根，并调用 `Zotero.__addonInstance__.hooks.onStartup()`；`shutdown()` 先调用 `onShutdown()`，再销毁 chrome handle。官方 Zotero 7 开发文档说明 XPI 的 `rootURI` 是 `jar:file:///...` URL，插件能访问 XPCOM、文件和其他 Firefox platform internals，但这不是 Apple 的 code-signing 或 App Sandbox 授权。

来源：[`addon/bootstrap.js`](../../addon/bootstrap.js#L33)、[Zotero 7 for developers](https://www.zotero.org/support/dev/zotero_7_for_developers)。

### 1.2 Mozilla Subprocess 是生产宿主 seam

`src/utils/runtimeCompatibility.ts` 的 `getMozillaSubprocessModule()` 依次探测：

1. `ChromeUtils.importESModule("resource://gre/modules/Subprocess.sys.mjs")`；
2. `ChromeUtils.importESModule("resource://gre/modules/Subprocess.mjs")`；
3. 旧版 `ChromeUtils.import("resource://gre/modules/Subprocess.jsm")`。

`src/modules/acpTransport.ts` 在该模块存在时走 Mozilla transport。macOS 不满足 Windows bridge 条件，故从代码分支上会走 direct Mozilla subprocess/stdin/stdout，而不是仓库当前只打包的 Windows WebSocket bridge。启动步骤为：

```text
插件 startup
  -> getMozillaSubprocessModule()
  -> Subprocess.pathSearch(command) / 解析绝对路径
  -> Subprocess.call({ command, arguments, environment, workdir })
  -> stdin / stdout / stderr 异步管道
  -> 关闭 stdin（EOF）-> 等待退出
  -> 必要时验证 pid/pgid 后 TERM/KILL，或 proc.kill()
```

仓库把 `transportKind` 记为 `mozilla-subprocess`，并记录 child PID、退出状态、stderr/stdout 尾部、stdin EOF、优雅退出和进程树清理状态。Mozilla 官方 `Subprocess` 资料确认它可以启动 native host、按数组传参、异步读写 stdin/stdout/stderr，并提供 `wait()`/`kill()`；默认环境和 cwd 会继承，只有使用替换环境的调用才会清除继承环境。

来源：[`src/utils/runtimeCompatibility.ts`](../../src/utils/runtimeCompatibility.ts#L68)、[`src/modules/acpTransport.ts`](../../src/modules/acpTransport.ts#L1247)、[Firefox Subprocess Module](https://firefox-source-docs.mozilla.org/toolkit/modules/subprocess/toolkit_modules/subprocess/index.html)。

### 1.3 当前取消/清理是进程治理，不是沙箱

`acpTransport` 先关闭 stdin 并等待 grace period；POSIX 路径可在 `ps` 查询到安全的 pid/pgid/sid、pidfile token 和 live identity 后，通过 `setsid`/进程组向整个组发送 TERM，再重新验证后发送 KILL；验证不成立时退回 direct kill 或把能力标为不支持。`src/platform/processControl.ts` 明确把这些策略命名为 `posix-pidfile-supervisor`、`direct-kill-only` 等。这能降低孤儿进程风险，却不能阻止 child 读写宿主文件、联网、再启动命令或绕过 workspace。

插件 shutdown 顺序会关闭 ACP session manager、ACP WebSocket bridge 等运行时；持久化 ADR 要求没有 receipt 的工具副作用进入 `state_unknown`，不能因为插件退出就宣称已清理。macOS 上 `sh`、`setsid`、`ps`、`kill` 的可用性和行为仍须实机测量。

来源：[`src/platform/processControl.ts`](../../src/platform/processControl.ts#L11)、[`src/hooks.ts`](../../src/hooks.ts#L1122)、[`src/modules/acpSessionManager.ts`](../../src/modules/acpSessionManager.ts#L5878)、[`docs/adr/0001-project-owned-pi-persistence.md`](../../docs/adr/0001-project-owned-pi-persistence.md#L47)。

### 1.4 Windows bridge 不能外推为 macOS 方案

`src/modules/acpWebSocketBridgeService.ts` 的 bridge binary 固定为 `bin/win32-x64/zotero-acp-bridge.exe`，且 `shouldUseAcpWebSocketBridgeTransport()` 只在非 Node 的 Windows 返回 true。它会从 packaged asset 复制到 runtime 目录，写 ready/log 文件，再用 Mozilla `Subprocess.call` 启动。macOS 没有对应 bridge binary 或 XPC bridge；不能把该路径当作 macOS 证据。

### 1.5 Node-only 与真实 Zotero 测试的边界

- `launchNodeAcpTransport()` 动态导入 `node:child_process`、`node:process`，依靠 `spawn`、detached process group 和 `process.kill(-pgid, ...)`。这只在 Node fallback 可用，不能放进 Zotero 插件运行时假设。
- `acpRuntimeDependencyWrapper`、部分 runtime persistence fallback 和大量脚本测试会动态使用 Node `child_process`/`fs/promises`；它们不是插件 native API。
- `test/core/98-acp-transport.test.ts` 通过重定义全局 `ChromeUtils`/`Zotero` 注入假的 `Subprocess`，覆盖 Mozilla adapter、pipe、kill 和 non-Windows direct branch；这是 Node core mock，不是 macOS host test。
- `test/ui/99-acp-runtime-dependency-probe.zotero.test.ts` 才是真实 Zotero runner 入口，会探测 `Zotero.Utilities.Internal.subprocess` 或旧版 `Subprocess.jsm` 并做一次宿主命令 probe；它没有 macOS、x64/arm64 或 Zotero 7/9 组合矩阵。
- `test/node/core/130-zotero9-compatibility.test.ts` 是 Zotero 9 风格的 Node sandbox mock，并检查 manifest 的 `strict_min_version: 7.0`、`strict_max_version: 9.0.*`；它不是 Zotero 9 macOS 运行证明。

来源：[`test/core/98-acp-transport.test.ts`](../../test/core/98-acp-transport.test.ts#L2232)、[`test/ui/99-acp-runtime-dependency-probe.zotero.test.ts`](../../test/ui/99-acp-runtime-dependency-probe.zotero.test.ts#L1)、[`test/node/core/130-zotero9-compatibility.test.ts`](../../test/node/core/130-zotero9-compatibility.test.ts#L212)、[`doc/testing-framework.md`](../../doc/testing-framework.md#L240)。

## 2. XPI 携带、提取、签名、notarize 与启动

### 2.1 仓库已有“字节分发”能力

构建配置将 `addon/bin/**/*` 作为 XPI asset。`readPackagedBinaryAsset()` 先通过 root/resource URI 读取，再尝试 runtime path；`writeBinaryFile()` 将 bytes 写入宿主文件系统。Host Bridge installer 已对 macOS 选择 `darwin-arm64`/`darwin-x64`，将 payload 写到 runtime 或用户的 `~/bin`/`~/.local/bin`，在 POSIX 下设置 `0755`，并用 SHA-256 做内容比对。这个链路证明了“XPI 中的 Mach-O bytes 可以被插件读取后复制到文件”，没有证明复制出的文件满足 Apple executable policy。

来源：[`zotero-plugin.config.ts`](../../zotero-plugin.config.ts#L103)、[`src/modules/packagedAssetResolver.ts`](../../src/modules/packagedAssetResolver.ts#L245)、[`src/modules/hostBridgeCliInstaller.ts`](../../src/modules/hostBridgeCliInstaller.ts#L187)、[`src/modules/runtimePersistence.ts`](../../src/modules/runtimePersistence.ts#L932)。

### 2.2 当前 native asset gate 不是 Apple 签名 gate

`scripts/check-plugin-native-assets.ts` 只检查 XPI ZIP entry、`.sha256` sidecar、bytes 数量和 SHA-256（以及 Host Bridge release manifest 的一致性）。没有 `codesign --verify`、Team ID、entitlements、hardened runtime、notary ticket、Gatekeeper 或 quarantine 检查。故：

- XPI asset hash 能证明取到的 bytes 与发布 manifest 一致，但不是 Mach-O code signature；
- 插件把 JAR 内 bytes 提取到新路径后，当前代码没有验证 extracted path 上的签名、bundle layout 或 quarantine；
- `chmod 755` 只改变可执行位，不会签名、notarize 或赋予 entitlement；
- 若 helper 是 `.app` 或含嵌套 framework/XPC service，必须保持完整 bundle 结构，所有 nested code 先签名，再签外层 bundle；不能只把某个内部 Mach-O 当普通文件处理。

来源：[`scripts/check-plugin-native-assets.ts`](../../scripts/check-plugin-native-assets.ts#L1)、[Apple nested code signing](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html)。

### 2.3 Zotero 自身签名不能由插件改变

Zotero 9.0.6 官方源码的 `app/mac/entitlements.xml` 列出 JIT 相关 unsigned executable memory 和 Apple Events 等 entitlement，但没有 `com.apple.security.app-sandbox`；`app/mac/mozconfig` 设置 `MOZ_REQUIRE_SIGNING=`，`app/mac/build-and-unify` 分别构建 x86_64/aarch64 后统一为 universal，且对 framework 使用 hardened runtime 签名。官方源码还提供 `notarytool submit` 和 `stapler staple` 脚本。这些是 Zotero 构建/发行链的一手证据，不是本仓库插件在某台 macOS 上的验证。

插件运行在 Zotero 进程内，不能通过 XPI manifest 或 JS 为该进程追加 App Sandbox、Virtualization 或其他 Apple entitlement，也不能重签已安装 Zotero.app 而保持其原有签名。若修改 Zotero.app 以放入 XPC service，会破坏外层签名/更新完整性；正确的 XPC service 必须位于由其 owning app 签名的 `Contents/XPCServices`，或由单独签名发行单元承载。

来源：[Zotero 9.0.6 entitlements.xml](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/entitlements.xml)、[Zotero 9.0.6 build-and-unify](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/build-and-unify)、[Zotero 9.0.6 mozconfig](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/mozconfig)、[Zotero 9.0.6 notarize_mac_app](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/scripts/notarize_mac_app)、[Apple nested code signing](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html)。等级：B（官方 source/build evidence；release artifact 与插件 extraction 未实测）。

### 2.4 Gatekeeper、quarantine、hardened runtime 和 notarization 的实际含义

Apple 的发行文档要求外部分发的 executable 使用 Developer ID 签名、hardened runtime、secure timestamp，且不得带 `get-task-allow`；notarization ticket 覆盖提交的顶层文件及其 nested content。hardened runtime 的 entitlement 作用在 executable；in-process plugin 使用宿主的 entitlements，不能自行扩大权限。Apple 还说明 quarantined plug-in 在新 macOS 上需要 notarization 或用户明确批准。

对本项目的保守结论是：

1. helper 必须作为可识别的、单独签名的发行单元管理（即便它的 bytes 由 XPI 携带）；
2. build/release 应记录每个架构、SHA-256、Team ID、bundle identifier、entitlements、签名验证和 notary 结果；
3. 安装到 runtime path 后要重新执行签名/加载/Gatekeeper canary，而不是只信 XPI sidecar；
4. XPI 本身通过 Zotero 安装或 checksum gate，不等于 extracted helper 自动获得 Apple notarization；这个映射当前没有仓库或 Apple 机制证明。

来源：[Apple notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)、[Apple hardened runtime](https://developer.apple.com/documentation/security/hardened-runtime)、[Apple distribution/Gatekeeper](https://developer.apple.com/documentation/technologyoverviews/distribution)、[Apple embedding a helper tool in a sandboxed app](https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app)。等级：B。

## 3. Apple 机制从 Zotero 插件拉起时的限制

### 3.1 App Sandbox 与 child process inheritance

Apple App Sandbox 通过 executable entitlements 限制文件、网络和用户数据。`posix_spawn`/`NSTask` 启动的 child 可以继承父进程的静态 sandbox，但 Apple 明确指出 child process 不提供 XPC 的安全性；需要 privilege separation 时应使用 XPC。继承 child 必须只有 `com.apple.security.app-sandbox` 与 `com.apple.security.inherit` 这一组适用 entitlement；运行时通过 PowerBox 获得的用户选择文件权限不会自动成为 child 的静态权限，应显式传递数据或 security-scoped bookmark。

Zotero 9.0.6 官方 entitlements source 没有 app-sandbox，且插件不能替换 Zotero 的签名。因此不能承诺“给 XPI 加一个 app-sandbox 字段就把 Zotero 或 `Subprocess.call` 的 child 沙箱化”。若 helper 自己拥有独立 App Sandbox entitlement，它必须以独立签名 executable/bundle 的语义被验证；若使用 `inherit`，则必须先证明 parent 本身是兼容的 sandboxed app，这不是当前 Zotero 证据。

来源：[Apple enabling App Sandbox](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)、[Apple App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)、[Zotero 9.0.6 entitlements.xml](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/entitlements.xml)。等级：B（Apple semantics + official source；Zotero 7/9 mac launch result pending）。

### 3.2 security-scoped bookmark 不是任意路径授权

Apple 支持用户选择文件/目录后生成 security-scoped URL/bookmark；bookmark 可以传给另一个 process/XPC service，接收方解析后按 API 规则 `startAccessingSecurityScopedResource()`，用完调用对应 stop。它能把“用户明确选择的 external workspace”传给 helper，但不能把任意 path string 变成授权，也不保证可执行任意 host-installed command。helper 仍须 canonicalize root、拒绝 symlink/外部路径逃逸，并在 receipt 中写明实际授权 root 和读写效果。

对于项目的 managed workspace，首选给 helper 一个自己创建的受控 root 或通过受控 copy/stream 传输；对 external workspace 才考虑 bookmark。bookmark 的保存、作用域、失效和 Zotero 重启后的行为必须在实机 spike 验证。

来源：[Apple accessing files from the macOS App Sandbox](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox)。等级：B。

### 3.3 XPC containment、注册和 peer identity

Apple XPC service 由 launchd 按需启动、崩溃后重启、空闲时终止；service 具有自己的 sandbox，并通过 containing app 的 bundle layout、`Info.plist`、bundle identifier 和 code signature 注册。XPC service 通常位于 `Contents/XPCServices`。Apple 还提供 peer signing/team identity/entitlement requirement API；不满足 requirement 的 peer 会被拒绝并返回 code-signing peer error。launch constraints 也可限制 responsible/parent process。

当前仓库搜索没有 `xpc_connection`、`XPCServices`、XPC service bundle 或 Virtualization.framework 调用；XPI 的 `rootURI` 是 JAR resource，不是 Zotero.app 的签名 bundle 内 XPCServices 目录。因此：

- 不能从现有 JS 中声明一个自动被 launchd 识别的 macOS XPC service；
- 不能把 XPI 里一个 `.xpc` 目录直接放进已安装 Zotero.app 而不处理外层签名；
- XPC peer identity 只有在 native XPC channel 与单独签名 bundle 真实建立后才有意义；stdio 上的“helper 自报 Team ID”不是同等级 peer authentication。

若未来发行独立 helper app，XPC 是可行 B 路线，但必须先完成 bundle 签名、服务注册、peer requirement、启动/重启和 Zotero unload 的真实矩阵。

来源：[Apple XPC](https://developer.apple.com/documentation/XPC)、[Apple creating XPC services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)、[Apple XPC peer requirement](https://developer.apple.com/documentation/xpc/xpc_connection_set_peer_requirement?language=objc)、[Apple launch constraints](https://developer.apple.com/documentation/security/applying-launch-environment-and-library-constraints)。等级：B/C（API 是 B；当前 Zotero plugin wiring 是 C/未实现）。

### 3.4 网络 entitlement 与“网络 deny”不是一回事

`com.apple.security.network.client` 表示出站网络能力；它不是 exact-domain allowlist，也不能把 redirect、DNS、loopback、私网和代理绕过自动收敛为项目的网络策略。缺少该 entitlement 也不能仅凭 manifest 文本作为项目 receipt 的“deny 已实测”证据。需要网络 deny 时，helper 应默认不提供 raw network，或把 fetch 放在受控 typed proxy/Gateway；必须在 helper 内用 loopback、IPv4/IPv6 私网、link-local、DNS、redirect 和 proxy-bypass canary 验证。

当前 `buildSubprocessEnvironment()` 默认从宿主环境快照构建环境，ACP Mozilla call 使用 `environmentAppend: true`。这对普通 backend 兼容有用，却不符合 secrets/network policy 的默认最小化要求；sandbox helper 应使用环境替换、明确 allowlist，不得把 provider key、`.env`、Zotero profile 路径等随宿主环境传入。

来源：[Apple App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)、[`src/platform/env.ts`](../../src/platform/env.ts#L909)、[`src/modules/acpTransport.ts`](../../src/modules/acpTransport.ts#L1275)。等级：A（环境继承代码）+ B（Apple entitlement semantics）。

### 3.5 sandbox-exec/Seatbelt

本次只采用 Apple 公开开发者资料；资料中可长期依赖、可签名发布的模型是 App Sandbox entitlements 与 XPC privilege separation，没有把命令行 `sandbox-exec` 或私有 Seatbelt profile 作为本项目的稳定发行契约。仓库也没有该 adapter。故 `MacSeatbeltAdapter` 最多是版本锁定的实验：需签名 helper、实际路径/网络/child canary、系统版本矩阵和失败即 disabled；不能因某个命令或 profile 存在就写 Strong receipt，也不能默认回退 host shell。等级：C（不作产品承诺）。

### 3.6 Virtualization.framework 与用户已有 VM/容器

Apple Virtualization.framework 支持在 Intel 和 Apple Silicon Mac 管理 VM；创建 `VZVirtualMachine` 需要 `com.apple.security.virtualization` entitlement，并需要配置 guest、磁盘/restore image、设备和生命周期。这个 API 的存在是 B，不等于 Zotero JS 可以直接调用：当前插件没有 Swift/ObjC native bridge、entitlement、guest image 管理或 VM channel。

可选 `MacVmAdapter` 应由独立签名 native helper 持有 Virtualization entitlement，或连接用户已经安装且通过 handshake 的 VM/container runtime。workspace 通过显式 read-only share/一次性 scratch 传入，网络关闭或只到 Gateway proxy；runtime/镜像缺失、版本不符、guest agent 认证失败时保持 disabled。不能静默安装 VM，也不能把 host-installed container command 当作所有 Zotero 用户的前提。

来源：[Apple Virtualization framework](https://developer.apple.com/documentation/virtualization)、[Apple VZVirtualMachine](https://developer.apple.com/documentation/virtualization/vzvirtualmachine)、[Apple adding the Virtualization entitlement](https://developer.apple.com/documentation/virtualization/adding-the-virtualization-entitlement-to-your-project)。等级：B（API）；Zotero-hosted wiring 是 C/待 spike。

## 4. 候选架构与选择建议

| 候选 | 运行/分发形态 | Zotero 7/9 mac 当前证据 | 判断 |
| --- | --- | --- | --- |
| `MacSignedHelperStdIO` | 独立签名 universal helper（可为 standalone Mach-O；若需 App/XPC 则保持完整 `.app`），XPI 携带 payload 与 manifest，运行时绝对路径启动，typed JSONL over stdin/stdout | A：Mozilla Subprocess 与 asset extraction seam；B：Apple signed helper/App Sandbox API；无 mac host spike | 推荐 MVP，B；只承诺 helper 自己已验证的 scope/工具，不承诺任意 host shell |
| `MacXpcAppSandboxAdapter` | 独立签名 helper app + `Contents/XPCServices`，launchd 按需启动，XPC peer team/signing/entitlement requirement，bookmark 显式传入 | B：Apple XPC/App Sandbox；C：仓库没有 XPC bundle/bridge，XPI 不能直接注册 | 可作为第二阶段；必须单独签名发行与实机验证，不是 XPI 单文件特性 |
| `MacVmAdapter` | 独立 native helper 持有 Virtualization entitlement，或用户已有 VM/container；guest agent 认证 RPC | B：Virtualization API；C：当前插件没有 bridge/guest 管理 | 覆盖广泛命令时的可选路线；高成本、非所有 Mac 默认可用 |
| `MacSeatbeltAdapter` | `sandbox-exec`/Seatbelt profile | 无本项目稳定公开契约，仓库无实现 | C，仅实验；不作为 Strong 或 fallback |
| 直接 host shell | `Subprocess.call` 直接执行 PATH/用户命令 | A：能启动；没有任何隔离证明 | C，不能称 sandbox；仅 Restricted/显式用户信任场景的非 Strong 能力 |

### 4.1 推荐 MVP 的边界

`MacSignedHelperStdIO` 必须具备：

1. helper 独立发行身份：x86_64 + arm64、版本、协议版本、SHA-256、Developer ID/Team ID、签名和 notary 状态；XPI sidecar 只是额外完整性层。
2. 运行时 content-addressed extraction：写入版本+digest 派生目录，不覆盖正在使用的文件；抽取后检查 executable/bundle layout、签名和架构。
3. 绝对路径启动：不通过 PATH、shell 或 `/bin/sh -c`；`Subprocess.call` 使用精确 argv，环境采用替换/allowlist。
4. typed RPC：请求含 `ownerId`/`requestId`、`scopeDigest`、`policyDigest`、虚拟路径、操作类型、大小/时间界限；拒绝 raw host path、未声明 tool 和未知字段组合。
5. helper 自己执行 scope canary：managed root 读写、scratch、只读 resources、外部路径、符号链接/TOCTOU、子进程和网络；任一 required canary 为 unknown/failed 就返回 `sandbox_unavailable`/`sandbox_failed`。
6. helper 维护子进程树：取消先 EOF，再 bounded wait，再按已验证的 process-group identity 清理；Zotero shutdown 后无残留才可标 terminal，否则 `state_unknown`。
7. receipt 如实区分：`helperDigest`、签名/Team ID、protocol、scope mapping、network mode、resource enforcement、canary 时间和 instance token。stdio 的 helper 身份不是 XPC peer identity。
8. 无法满足任意代码/广泛现有 host command 时，返回 Restricted Broker，而不是弱化后继续报告 Strong。

### 4.2 Workspace Scope、typed IPC、receipt peer identity、认证

仓库 `CONTEXT.md` 将 Workspace Scope 定义为受管 workspace、scratch、只读资源和显式 external workspace 的集合；未声明宿主路径不在范围内。`docs/adr/0001-project-owned-pi-persistence.md` 要求 tool 结果、receipt 和 unknown side effect 可恢复。Host Bridge 已有 `ZOTERO_BRIDGE_SCOPE`、bearer token 和 request/run 归属，但它是 Host Bridge 审批路由，不是 helper sandbox receipt。

因此 mac helper 的合同应是：

- 模型/agent 只见 virtual path；插件在 prepare 阶段把 scope 映射为 helper root、受控 copy 或 bookmark bytes；
- 请求经 JSON schema 校验，长度/并发/超时有界，owner、scope、policy 和 helper instance 必须一致；
- direct stdio 用一次性随机 nonce/challenge（不放在 argv、日志或继承环境中），并结合预期 digest/Team ID/协议版本；验证由可信 distribution/installer native side 完成，不能只接受 helper 自述；
- XPC route 才可使用 Apple peer code-signing/team/entitlement requirement；stdio receipt 应命名为 binary identity/instance identity，不能伪称 peer identity；
- helper 崩溃、Zotero unload、sleep/wake 或 channel loss 时，未有终态 receipt 的 mutation 进入 `state_unknown`，不自动 replay。

这里的本地认证是 IPC 请求归属和防误连机制，不是把同一 Zotero 进程中的插件变成独立的 Apple trust domain；若插件本身被攻陷，真正的边界仍必须由 helper 的自身 policy、签名代码和 OS 约束承担。

### 4.3 更新与回滚

helper 必须拥有独立于 XPI 和 Host Bridge CLI 的 artifact family。激活流程应为：下载/携带 payload → 校验 manifest/digest/架构 → 验证 code signature、Team ID、entitlements、notary/Gatekeeper 条件 → 启动 distribution probe 和 scope canary → 原子推进 active manifest。保留仍满足当前 policy 的 known-good helper；新版本签名、协议或 canary 失败时回滚或禁用，不原地覆盖运行中的 Mach-O。当前 Host Bridge 的 SHA-256/内容寻址可复用为工程模式，但它不提供 Apple code-signing/notary 证明。

## 5. 明确不可行或不应承诺的方案

以下结论在真实 spike 之前也不应写进产品文案：

1. **“Mozilla `Subprocess.call` 就是 macOS sandbox。”** 它只是启动/管道/等待/kill API；当前调用还会 append 宿主环境。
2. **“XPI 里放 `.app`/`.xpc` 就能被 launchd 当作 Zotero 的 XPC service。”** XPI 是 JAR resource；没有 proper owning bundle、签名嵌套代码和注册/peer requirement 证据。
3. **“插件可以通过 entitlement 把 Zotero 或 child 变成 App Sandbox。”** 插件与 Zotero 同进程，不能改 host 的签名/entitlements；`inherit` 也不是任意 parent 的补丁。
4. **“SHA-256 sidecar/XPI 安装成功等于 helper 已签名、hardened、notarized。”** 当前 checker 没有 Apple 验证；这三者属于独立发行/加载门禁。
5. **“security-scoped bookmark 允许任意路径、任意 host-installed command。”** bookmark 只授权用户选择的资源，且 helper 必须显式 start/stop 和验证 root。
6. **“没有 `network.client` 就已经证明 exact network deny；有它就有域名 allowlist。”** entitlement 粒度与项目网络合同不同，必须通过 helper/proxy canary 证明。
7. **“Seatbelt/sandbox-exec 可作为所有 macOS 的稳定强沙箱。”** 本研究没有 Apple 公开、长期稳定的产品契约；标 C/实验。
8. **“Virtualization.framework 可以从插件 JS 直接启动。”** API 需要 native process/entitlement/guest assets；当前仓库无 bridge，用户已有 VM/container 也必须显式安装并 handshake。
9. **“macOS x64/arm64、Zotero 7/9 已通过。”** 当前没有该主机证据；不能从 Node mocks、Linux/Windows 分支或 Zotero 9 source 推导。

## 6. 必须执行的真实 Zotero 7/9 macOS spike 矩阵

### 6.1 主机与安装矩阵

每个格子都要记录 Zotero build、macOS build、plugin XPI digest、helper digest、架构、签名 Team ID、entitlements、quarantine 状态和日志；当前所有格子均为待执行。

| Zotero | Mac host | helper 运行模式 | 必须覆盖 |
| --- | --- | --- | --- |
| 7（受支持最新稳定版） | Intel x86_64 原生 | direct stdio；若候选则 standalone App Sandbox | `Subprocess.sys.mjs`/legacy module、绝对路径、x86_64 helper、启动/EOF/kill |
| 7（受支持最新稳定版） | Apple Silicon arm64 原生 | direct stdio；universal helper | arm64 helper、runtime path、签名/架构、workspace canary |
| 7（受支持最新稳定版） | Apple Silicon 上 Rosetta/x86_64 helper（若产品支持） | direct stdio | translation 下 PID/PGID、stdio、签名和性能/退出行为 |
| 9（当前支持稳定版） | Intel x86_64 原生 | direct stdio；若候选则 standalone App Sandbox | 新旧 Subprocess module shape、环境替换、取消/关闭 |
| 9（当前支持稳定版） | Apple Silicon arm64 原生 | direct stdio；universal helper | native arm64、签名、Gatekeeper/quarantine、全量 canary |
| 9（当前支持稳定版） | Apple Silicon 上 Rosetta/x86_64 helper（若产品支持） | direct stdio | universal slice selection、child tree、升级/回滚 |

每个 Zotero 版本至少在项目支持的最低 macOS 与当前 macOS 各做一次；不能用 Linux CI 或 Node runner 代替。Zotero 7/9 的 exact patch version、Intel 支持状态和 Rosetta policy 应在 spike 开始时记录，不能在报告中静态假定。

### 6.2 功能与安全门禁

| 门禁 | 真实动作 | 通过条件 |
| --- | --- | --- |
| Host API | 插件从 `rootURI` 启动 `/usr/bin/true` 和测试 helper；测试精确 argv、cwd、stdin/stdout/stderr、EOF、自然退出和错误码 | 每个 Zotero/架构组合均能稳定调用；否则 transport 为 unavailable |
| XPI extraction | 从生产签名 XPI 读取 Mach-O/.app，复制到 content-addressed 目录，检查 mode、架构、bundle layout、代码签名和 quarantine | bytes、digest、`codesign`/Gatekeeper/notary 结果与 manifest 一致；无原地覆盖 |
| Helper identity | 预期 Team ID/bundle ID/签名链、嵌套代码和 hardened runtime 检查；篡改一个 byte 后重试 | 篡改、错误架构、错误签名、过期版本均 fail closed |
| Workspace scope | managed root、scratch、只读 resource、external bookmark、workspace 外路径、symlink、rename/link/TOCTOU、Zotero profile/插件目录 | 只有声明 root 的效果成立；外部和未授权路径拒绝；receipt 记录实际 effect |
| Bookmark | 用户选目录并将 bookmark bytes 交给 helper/XPC；重启、bookmark stale、start/stop 和权限变更 | 只可访问用户选择资源；stale/失效返回 unavailable，不扩大到 parent/home |
| Environment/secret | 设置污染的 PATH、HOME、provider key、`.env`；检查 helper argv/env、临时文件、日志和 crash dump | helper 只见 allowlist；不依赖 inherited env；敏感值不出现在日志/receipt |
| Network | 无 entitlement/deny；loopback、IPv4/IPv6 私网、link-local、DNS、redirect、Unix socket、proxy bypass；另测 typed proxy allow case | raw shell network 的每项策略均有真实 effect；未知则 `not-verified`，不写 Strong |
| Child tree | helper fork/exec、grandchild、background process；Zotero cancel、plugin disable/reload、Zotero shutdown、sleep/wake | EOF/grace/TERM/KILL 后全树无残留；PID reuse/错 pidfile 不误杀 |
| XPC | proper separately signed app + `Contents/XPCServices`，launchd on-demand/restart/idle termination；peer team/signing/entitlement requirement | 服务只接受预期 peer；重启和失联进入 `state_unknown`；XPI-only registration 失败则明确记录不可行 |
| Virtualization/VM | 独立 helper 的 entitlement、guest boot/agent handshake、显式 workspace share、network off；用户已有 runtime 缺失/版本不符 | 只有 guest receipt/canary 全部通过才启用；缺失保持 disabled |
| Receipt/auth | wrong owner/scope/policy/digest/instance、replay nonce、旧 helper、channel confusion | 所有 mismatch 拒绝；stdio identity 与 XPC peer identity 分开记录 |
| Update/rollback | staging 新 helper，破坏签名/协议/canary，激活失败后启动 known-good；并发运行旧版本 | active pointer 原子切换；旧版本仍可用；失败不覆盖运行文件 |

### 6.3 Spike 输出和决策门

每个组合输出原始 `codesign`/entitlements/notary/Gatekeeper 证据、Subprocess invocation、canary 结果、残留进程扫描和 receipt。只有以下条件同时成立，才能把 `MacSignedHelperStdIO` 的某个能力标为 Strong：

- Zotero 7/9 对应 host/架构能真正启动 helper；
- helper 的签名、架构、版本和提取路径验证通过；
- scope、网络、环境、child、取消和更新门禁都有观察结果；
- receipt 绑定 owner、scope、policy、helper digest、instance 和 protocol；
- 任一未测维度显式为 `unsupported`/`not-verified`，不隐式扩大能力。

若产品要求在 macOS 上从 MVP 起运行任意用户 host command，应停止把 App Sandbox/XPC 作为充分答案，改评估用户已有 VM/container 或统一 guest 方案，并接受安装、镜像、资源和版本支持成本。

## 7. 一手来源

### 仓库与 Zotero

- [`addon/bootstrap.js`](../../addon/bootstrap.js)：Zotero bootstrapped startup/shutdown、`rootURI` 和 `onShutdown`。
- [`src/utils/runtimeCompatibility.ts`](../../src/utils/runtimeCompatibility.ts)：Mozilla `Subprocess` module compatibility probe。
- [`src/modules/acpTransport.ts`](../../src/modules/acpTransport.ts)：Mozilla/Node transport、stdio、取消与生命周期。
- [`src/modules/acpWebSocketBridgeService.ts`](../../src/modules/acpWebSocketBridgeService.ts)：仅 Windows 的 bridge binary/service。
- [`src/platform/processControl.ts`](../../src/platform/processControl.ts)：POSIX pid/pgid identity、进程树清理策略。
- [`src/platform/env.ts`](../../src/platform/env.ts)：宿主环境 snapshot 与 subprocess environment 构造。
- [`src/modules/packagedAssetResolver.ts`](../../src/modules/packagedAssetResolver.ts)：从 root/resource URI 读取并写出 binary bytes。
- [`src/modules/hostBridgeCliInstaller.ts`](../../src/modules/hostBridgeCliInstaller.ts)：darwin binary 目录、复制、SHA-256、POSIX executable bit。
- [`scripts/check-plugin-native-assets.ts`](../../scripts/check-plugin-native-assets.ts)：XPI asset/sidecar/hash gate；未检查 Apple code signature/notary。
- [`zotero-plugin.config.ts`](../../zotero-plugin.config.ts)：XPI native asset 打包配置。
- [`CONTEXT.md`](../../CONTEXT.md)：Tool Gateway、Restricted Broker、Workspace Scope、capability receipt 的项目术语。
- [`docs/adr/0001-project-owned-pi-persistence.md`](../../docs/adr/0001-project-owned-pi-persistence.md)：receipt、`state_unknown` 和恢复约束。
- [`test/ui/99-acp-runtime-dependency-probe.zotero.test.ts`](../../test/ui/99-acp-runtime-dependency-probe.zotero.test.ts)：真实 Zotero host probe（无 macOS 矩阵）。
- [`doc/testing-framework.md`](../../doc/testing-framework.md)：当前 Zotero 9.0.4 验收环境与 Zotero 7 后续验证项。
- [Zotero 7 for developers](https://www.zotero.org/support/dev/zotero_7_for_developers)：官方插件/XPI、Firefox platform internals 与生命周期说明。
- [Zotero 9.0.6 `entitlements.xml`](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/entitlements.xml)：官方 Zotero macOS production entitlements source。
- [Zotero 9.0.6 `build-and-unify`](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/build-and-unify)：官方 x86_64/aarch64 universal build 与签名 framework source。
- [Zotero 9.0.6 `mozconfig`](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/mac/mozconfig)：官方 signing/offical build flags。
- [Zotero 9.0.6 `notarize_mac_app`](https://raw.githubusercontent.com/zotero/zotero/9.0.6/app/scripts/notarize_mac_app)：官方 notarytool invocation。

### Mozilla / Apple

- [Firefox Source Docs — Subprocess Module](https://firefox-source-docs.mozilla.org/toolkit/modules/subprocess/toolkit_modules/subprocess/index.html)：native process、精确 argv、管道、环境、cwd、wait/kill 语义。
- [Apple App Sandbox](https://developer.apple.com/documentation/security/app-sandbox)：entitlement-based resource restrictions。
- [Apple accessing files from the macOS App Sandbox](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox)：container、user-selected resources、security-scoped bookmark。
- [Apple enabling App Sandbox](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingAppSandbox.html)：`posix_spawn`/`NSTask` child inheritance、`com.apple.security.inherit` 与 PowerBox caveat。
- [Apple embedding a helper tool in a sandboxed app](https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app)：helper target、签名、Hardened Runtime、entitlement 和 nested bundle。
- [Apple nested code signing](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Procedures/Procedures.html)：nested code 先签名、外层 seal 和标准 bundle 位置。
- [Apple notarizing macOS software before distribution](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)：Developer ID、hardened runtime、secure timestamp、notary ticket。
- [Apple hardened runtime](https://developer.apple.com/documentation/security/hardened-runtime)：运行时保护、entitlement 和 in-process plugin 继承宿主权限。
- [Apple distribution/Gatekeeper](https://developer.apple.com/documentation/technologyoverviews/distribution)：下载代码的签名/公证/完整性评估。
- [Apple XPC](https://developer.apple.com/documentation/XPC)：launchd、on-demand service 和 privilege separation。
- [Apple creating XPC services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)：XPC bundle layout、独立 sandbox、签名和生命周期。
- [Apple XPC peer requirement](https://developer.apple.com/documentation/xpc/xpc_connection_set_peer_requirement?language=objc)：peer code-signing requirement。
- [Apple launch constraints](https://developer.apple.com/documentation/security/applying-launch-environment-and-library-constraints)：parent/responsible process 和 launch constraint。
- [Apple Virtualization framework](https://developer.apple.com/documentation/virtualization)：Intel/Apple Silicon VM API 与设备配置。
- [Apple `VZVirtualMachine`](https://developer.apple.com/documentation/virtualization/vzvirtualmachine)：VM lifecycle 与 `com.apple.security.virtualization` entitlement。
- [Apple adding the Virtualization entitlement](https://developer.apple.com/documentation/virtualization/adding-the-virtualization-entitlement-to-your-project)：使用 Virtualization API 的 entitlement 要求。

## 最终决策建议

先把 macOS 选择定为：**统一 Workspace/typed IPC/receipt/fail-closed 合同 + `MacSignedHelperStdIO` 受控 MVP；`MacXpcAppSandboxAdapter` 和 `MacVmAdapter` 作为独立发行单元的后续 spike；不把 host shell、Seatbelt 或 XPI 自身视作沙箱。**

这项选择承认当前最强的事实：Zotero 插件已经有 Mozilla native-process seam，但没有现成的 Apple sandbox/XPC wiring。真正的 Strong 能力要等 Zotero 7/9 macOS x64/arm64 矩阵完成后，按 receipt 中已验证的维度逐项开放。

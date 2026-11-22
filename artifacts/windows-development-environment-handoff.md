# Zotero Agents Windows VM 开发环境接手手册

目标是在目标 Windows VM 上独立完成三件事：用 `dev` profile 开发，用 `Joshua-Side` 从普通桌面快捷方式验证正式 XPI，以及运行隔离的 Zotero E2E。VM 应能在原物理机关机时完成这些操作。

先读当前 checkout 的 [AGENTS.md](../AGENTS.md)。检查可先只读进行。安装系统工具、恢复 Git 本地状态、复制真实库、启动 Zotero、修改系统配置，以及操作远端预构建或发布，均按本次任务实际授权执行。遇到缺失输入时记录具体缺项，继续检查其他可独立验证的条件。报告只记录版本、路径和结果，凭据与真实库内容通过单独的私有渠道处理。

## 1. 检查主机与工具链

| 用途 | 目标环境与检查 |
| --- | --- |
| 日常开发 | Windows x64，能登录交互式桌面。检查 `git --version`、`node --version`、`npm --version`。Node 的最低版本见 [package.json](../package.json)，盘点时为 ≥24，Windows CI 参考版本为 24.18.0。目标机用 `npm ci` 安装锁定依赖，以成功退出为准。 |
| 本机原生编译与 Zotero E2E | `rustup`、Cargo、MSVC x64 C++ Build Tools、Windows SDK。检查 `x86_64-pc-windows-msvc` 目标和 MSVC/SDK 链接环境。Synthesis 使用 [rust-toolchain.toml](../rust/synthesis-sidecar/rust-toolchain.toml) 钉住的工具链，盘点时为 `nightly-2026-07-25`。普通终端找不到 `cl.exe` 时，在 Visual Studio Developer PowerShell 中复查。 |
| Python Skill 与真实后端 | 按会验证的 Skill 准备 Python、`uv` 和 `assets/runner.json` 声明的依赖。CI 参考 [Python setup action](../.github/actions/setup-builtin-skill-python/action.yml)。若沿用原机的共享 Python 环境，通过 chezmoi 和 `pyproject.toml`、`uv.lock` 在目标账号下重建 `~\.ar`。按需安装并登录 ACP Agent、配置 SkillRunner 和其他后端。 |
| 可选专项 | 站点开发在 `site/` 单独执行 `npm ci`。原生崩溃取证用 Windows Debugging Tools 的 x64 CDB。Windows Sandbox 需要目标虚拟化平台支持嵌套虚拟化。GitHub CLI、发布凭据、Windows 取证环境变量和 WER 配置，仅按选定任务准备。 |

先给源码、构建根和运行时数据选短的本地路径，检查相关磁盘的可用空间。两套 Zotero 数据、profile 和外链附件在源机实测约 18.4 GiB，原生编译、依赖和试验副本另需空间。确认必需输入已落在 VM 本地或由 VM 可独立访问的存储提供。

## 2. 恢复源码与本地开发状态

1. 在 VM 上新克隆 `https://github.com/leike0813/zotero-agents.git`，使用约定的开发分支和源码基线。源机的 `D:\Workspace\Code\JavaScript\zotero-agents\.git` 是指向 `D:\Git\JavaScript\zotero-agents.git` 的指针文件。由源机提供已确认的本地分支引用、stash、暂存和未暂存补丁，以及要迁移的未跟踪文件清单。数量以实际交接时的盘点为准。
2. 在目标仓库根执行以下命令。初始化前先确认已有子模块工作树的状态，已有改动或 gitlink 偏离需要单独处理。`references/` 下的源码子模块按需初始化。

   ```powershell
   git submodule update --init --checkout -- skills_builtin/literature-analysis skills_builtin/literature-explainer skills_builtin/literature-translator
   git submodule status -- skills_builtin/literature-analysis skills_builtin/literature-explainer skills_builtin/literature-translator
   npm ci
   ```

3. 记录目标分支、完整 HEAD、已恢复的 Git 状态和子模块 SHA。`.scaffold`、`node_modules`、Rust `target`、`.codegraph` 和浏览器缓存按需重建。Git 跟踪的 `addon/bin` 随 checkout 恢复，其可用性以第 4 节检查为准。

## 3. 配置两套 Zotero 环境

下表是 2026-11-22 的源机定位信息。按实际目标账号、盘符和签收的资产记录对应的 VM 路径。

| 用途 | 源 Profile，位于 `%APPDATA%\Zotero\Zotero\Profiles` | 源数据目录 | 源链接附件基目录 |
| --- | --- | --- | --- |
| `dev` 源码开发 | `4iz7mztz.dev` | `D:\Workspace\Artifact\Zotero-Skills\Zotero_data` | `D:\Workspace\Artifact\Bibliography-test` |
| `Joshua-Side` 桌面安装测试 | `9w7o285s.Joshua-Side` | `C:\Users\leike\Zotero_Side\Joshua-Side` | `E:\Zotero_Side_Bibliography\Joshua-Side` |

1. **签收快照。** 源机正常退出 Zotero，确认对应 ACP、Synthesis sidecar 等写入进程已停止，再复制两套 Roaming profile、数据目录和链接附件树。保留数据目录里的 `storage` 和 `zotero-agents`，后者含插件与 Synthesis 数据库、已安装内容、工作流产物及 ACP 历史。签收时在副本上检查 `zotero.sqlite`、附件树和插件状态是否齐全。遇到仍打开的进程或非空 WAL，先取得一致快照。
2. **注册 profile。** 在 VM 安装官方 Windows x64 Zotero，源机桌面基线是 **10.0.8**。在 Zotero 全部退出时用 `zotero.exe -P` 打开 Profile Manager，注册两套复制的 profile。分别检查 `prefs.js` 中的数据目录、链接附件基目录和插件 `runtimeRoot`，以及仍会影响工作流的绝对路径，例如 `sampleOutputDir`、ACP executable/工作目录和本地内容路径。确认两套环境分别指向自己的 VM 数据副本。若盘符或用户名有变化，`Joshua-Side` 有一条指向其 `storage` 的绝对链接需要单独复查；源机盘点另有 625 条相对链接。
3. **配置源码开发。** 按 [.env.example](../.env.example) 写目标仓库的 `.env`，使用 `dev` 的路径。`ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 指向官方 `zotero.exe`，`ZOTERO_PLUGIN_PROFILE_PATH` 和 `ZOTERO_PLUGIN_DATA_DIR` 分别指向 `dev` 的 profile 与数据，`ZOTERO_AGENTS_CONTENT_DEV_ROOT` 指向当前 checkout 以直接读取内置源码内容。检查 `127.0.0.1:8030` 是否可用，`npm run start` 默认在该端口启动 Mock SkillRunner。配置真实后端时，确认它能从 VM 连接；当前用户的 `PATH`、证书和 Agent 登录要在普通桌面启动下另验。
4. **配置桌面安装。** 使用安装器创建的快捷方式，保持目标为正式 `zotero.exe`，不附加开发启动参数。通过 Profile Manager 选择 `Joshua-Side`，再双击验证实际打开的 profile 与数据目录。保留迁来的正式 XPI 或安装候选包。源机盘点时已装的是 **0.9.0**，以下 SHA-256 可核对这一个迁移基线。新版 XPI 以对应 receipt 或实际构建身份为准。实机验收使用与插件及频道对应的已发布内容包，另记录版本。参见 [安装与内容包说明](../site/docs/installation.md)。

   ```text
   D8B0D99B921D618DA390F41C2935E21567F7AB4799AC697BBCC565297555F9FB
   ```

## 4. 验证构建输入

如需源码构建，按仓库的 [zotero-agents-build-preflight](../.agents/skills/zotero-agents-build-preflight/SKILL.md) 执行完整流程。下面四条用于收集迁移后的初始证据。前三条可分别检查，内置内容同步后执行第四条。`--current-branch` 会按当前分支选频道，`dev*` 检查 dev，`main` 检查 stable/beta，其他分支与 detached HEAD 按 preflight 明确范围。

```powershell
npm run check:synthesis-sidecar-runtime-freshness
npm run check:host-bridge-cli-prebuild-freshness
npm run check:acp-ws-bridge-freshness
npm run check:content-package-release -- --current-branch
```

对每项保留退出码和诊断。通过的原生内容可直接复用。Windows ACP bridge 漂移时，在授权的 Windows 构建环境中按 preflight 运行 `npm run prebuild:acp-ws-bridge` 后复验。Sidecar 或 Host Bridge CLI 漂移时按各自技能核对精确源码身份与已存在的预构建结果。Host Bridge CLI 需要远端预构建时有干净工作区等前置条件，保留迁来的本地改动。网络、登录或工具缺失时记录实际原因。完整 preflight 就绪后由该流程继续 `npm run build`，已签收的正式 XPI 可独立用于桌面测试。

## 5. 验收与回报

三条启动路径串行验证。切换前正常退出上一个 Zotero 实例，避免 Windows 启动请求被转交给已有进程。

| 验收 | 操作与通过证据 |
| --- | --- |
| 源码开发 | 用目标 `.env` 运行 `npm run start`，确认打开 `dev`、加载当前 checkout 的插件、Mock 可用，并观察一次实际重载。`npm run start:direct` 是已构建插件的临时加载入口。 |
| 桌面正式安装 | 双击普通 Zotero 快捷方式，核对实际打开的 `Joshua-Side`、宿主版本、XPI 和内容包版本。打开一份链接附件和一份 `storage` 内附件，再打开 Synthesis，并在测试副本上跑一个常用工作流。记录路径解析、Agent 或后端运行是否成功。 |
| 隔离 E2E | 使用内置 Committed Seed、当前源码构建的 Windows sidecar 和 `npm run test:zotero:e2e`。快速验收时在新 PowerShell 中设置 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH`、`ZOTERO_TEST_ZOTERO_VERSION=10` 和 `ZOTERO_TEST_GREP='System E2E runner foundation\|WS-0'`。记录过滤器、退出码及 `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json`。金例仅作只读来源，runner 在 `.scaffold/test` 下使用其副本。参见 [E2E 文档](../docs/dev/zotero-e2e.md)。 |

如果要接手多版本实机测试，优先签收 Windows 官方归档与 `manifest.windows-x64.json`，安装树可重新解压。源机归档为 **7.0.32、9.0.6、10.0.2**，兼容矩阵另固定 **10.0.1**。如需离线 Sandbox 或原生关闭崩溃验收，分别按项目手册采集对应证据。记录 VM 的图形配置，实体机驱动的既有回归证据仍需独立保留。 [宿主归档](../docs/dev/zotero-host-binaries.md) · [兼容矩阵](../tests/zotero/compatibility-matrix.json) · [Sandbox 手册](../.agents/skills/windows-sandbox-acceptance/SKILL.md)

回报时列出目标机工具及宿主版本、实际路径映射、Git 和子模块状态、构建输入检查结果、三项验收各自的证据，以及尚缺的资产或权限。只读检查时将未执行的验收标为待验证。源机清理另行确认。

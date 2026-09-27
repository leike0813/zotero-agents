# SkillRunner 本地一键部署故障复盘（Windows）

## 1. 结论摘要

- 本次“部署失败”不是下载器失败。
- `skill-runner-install.ps1` 已成功执行，发布包可落盘到本地 `releases/<version>`。
- 失败发生在后续两个阶段：
  1. `ctl install` 阶段（Windows 子进程可执行探测/调用问题，出现 `WinError 2/193`）。
  2. `ctl up` 阶段（后端启动导入链问题，服务无法变为健康态）。

## 2. 失败时间线（对应插件调试日志）

1. `local-installer`: 成功  
   - 日志：`skill-runner installer command succeeded`
   - 含义：安装脚本执行成功，发布目录存在。

2. `local-ctl-install`: 曾失败，后经安装链路热修可成功  
   - 典型错误：`FileNotFoundError [WinError 2]` 或 `OSError [WinError 193]`
   - 触发点：`agent_cli_manager.py` 内部 `subprocess.run(["npm", ...])` 与版本探测命令在 Windows 下不稳。
   - 现状：插件保留 `npm/npm.cmd + version probe` 热修与重试链路。

3. `local-ctl-up`: 失败并超时  
   - 日志：`Local runtime failed to become healthy within timeout.`
   - 对应服务日志根因：后端启动导入阶段异常（`cli_delegate` 顶层导入链在 Windows 上触发问题，且此前临时热修可能引入语法/循环导入问题）。

## 3. 根因拆解

### 3.1 `ctl install` 阶段

- 问题性质：平台兼容性问题（Windows 命令解析与可执行文件选择）。
- 现象：
  - `WinError 2`：系统找不到指定文件。
  - `WinError 193`：不是有效 Win32 应用程序。
- 插件侧处理策略（保留）：
  - 对安装链路做最小热修：`npm` 调用与版本探测命令在 Windows 下稳态化。

#### 3.1.1 修复目标与约束

- 修复范围仅限 `ctl install` 阶段，不修改后端运行时 auth 代码。
- 仅在 Windows 执行热修，非 Windows 平台直接跳过。
- 热修对象是已安装发布目录下的：
  - `server/services/engine_management/agent_cli_manager.py`

#### 3.1.2 具体补丁内容（插件侧）

1. `npm install -g` 调用修复  
   - 原调用（易触发 WinError 2/193）：  
     - `subprocess.run(["npm", "install", "-g", package], ...)`
   - 修复后：  
     - 新增 `_resolve_npm_executable()`  
       - Windows 返回 `"npm.cmd"`  
       - 其他平台返回 `"npm"`
     - 调用替换为：  
       - `subprocess.run([self._resolve_npm_executable(), "install", "-g", package], ...)`

2. 版本探测调用修复（`--version`）  
   - 原调用：  
     - `subprocess.run([str(cmd), "--version"], ...)`
   - 修复后：  
     - 新增 `_resolve_version_probe_argv(self, cmd: Path)`，核心逻辑：  
       - `command_text = str(cmd)`  
       - 若 Windows 且 `cmd` 无后缀，则尝试 `command_text + ".cmd"`，存在则优先使用  
       - 返回 `[resolved_command, "--version"]`
     - 调用替换为：  
       - `subprocess.run(self._resolve_version_probe_argv(cmd), ...)`

3. 补丁有效性校验  
   - 热修后再次读取目标文件，必须同时满足：
     - 存在 `_resolve_npm_executable` 与 `"npm.cmd"`；
     - `install_package` 调用已切换到 `_resolve_npm_executable()`；
     - 存在 `_resolve_version_probe_argv`；
     - `read_version` 调用已切换到 `_resolve_version_probe_argv(cmd)`。
   - 若任一校验失败，热修判定失败，不进入“成功重试”。

#### 3.1.3 部署链路中的触发与重试策略

1. 正常执行 `ctl install`。  
2. 若 `ctl install` 失败，且满足“Windows + installDir 可定位”，触发上述热修。  
3. 热修成功后，仅重试一次 `ctl install`。  
4. 若重试仍失败，按 `deploy-ctl-install` 失败返回，不继续掩盖错误。  
5. 若热修本身失败，返回原失败信息并附带 hotfix 失败摘要。

该策略目标是“最小侵入 + 可回滚 + 可观测”，避免无限重试和隐性状态漂移。

#### 3.1.4 日志可观测性（用于排障）

- 关键 operation：
  - `local-ctl-install`（原始安装结果）
  - `local-ctl-install-hotfix-windows-npm-cmd`（热修执行与校验结果）
- 关键字段：
  - `command/args/exitCode`
  - `stdoutPreview/stderrPreview`
  - `details.targetPath`（补丁目标文件）
  - `details.npmPatched/details.versionProbePatched`（校验位）

#### 3.1.5 手动验收步骤（Windows）

1. 确认安装目录存在：`<installRoot>/<version>/server/services/engine_management/agent_cli_manager.py`。  
2. 触发插件一键部署，查看部署调试面板是否出现：  
   - `local-ctl-install-hotfix-windows-npm-cmd` 成功日志。  
3. 在目标文件中确认上述两个 helper 与替换调用已存在。  
4. 重新执行：  
   - `skill-runnerctl.ps1 install --json`  
   - 预期 `ok=true` 或至少不再出现同一类 `WinError 2/193`。

### 3.2 `ctl up` 阶段

- 问题性质：后端启动时的模块导入设计问题。
- 关键点：
  - `gemini/iflow/opencode` 的 `auth` 在顶层导入 `cli_delegate`。
  - `cli_delegate` 依赖 PTY 相关模块/路径，在 Windows 上不可用或不可安全初始化。
  - 导致 `server.main` 导入期失败，服务进程启动即退出，健康检查超时。
- 备注：
  - 插件侧不应再对后端 `auth` 源码做运行时补丁。该方向已回滚。

## 4. Skill-Runner 后端正式修复建议（在后端仓库实施）

1. 将 `cli_delegate` 从顶层强依赖改为懒加载/可选导入。  
   - 目标：`import server.main` 在 Windows 必须成功。

2. 将 transport 能力与服务启动解耦。  
   - 平台不支持 `cli_delegate` 时，仅禁用该 transport。
   - `oauth_proxy` 路径保持可用，不应被连带阻断。

3. 在引擎 auth registry 层实现可用性门控。  
   - 启动时根据平台/依赖注册可用 transport 集合。
   - 返回明确错误（unsupported transport on current platform），而不是启动崩溃。

4. 增加 Windows CI 与回归门禁。  
   - 最低门禁建议：
     - `python -c "import server.main"`（或等效启动前导入检查）
     - `skill-runnerctl up --mode local --json` 可进入 healthy
     - auth transport 可用性矩阵校验（`oauth_proxy` 可用，`cli_delegate` 可按平台禁用）

## 5. 插件侧后续策略

- 保留：安装阶段 Windows 热修（`npm/npm.cmd` 与版本探测）。
- 不再做：运行阶段后端 `auth` 文件补丁。
- 若 `ctl up` 失败：
  - 直接暴露 `local_runtime_service.log` 路径与关键错误摘要。
  - 引导用户提交日志用于后端修复，不在插件侧继续“改后端代码”。

# Kilo ACP create-topic-synthesis 阶段切换导致会话退出的排查记录

日期：2026-07-09

## 背景

主机在运行 Zotero Agents 的 `create-topic-synthesis` workflow 时多次出现同类故障：所有 SSH / RDP 连接同时断开，XFCE / xrdp 桌面会话退出，随后系统很快恢复。用户观察到每次恢复后 Zotero 中的任务都停在 `create-topic-synthesis` 的第一阶段到第二阶段之间：第二阶段刚进入 `running`，transcript 为空，后端既不能连接也不能断开。

之前的 inotify 耗尽问题已经确认存在过，但 2026-07-09 23:22 这次复现没有看到新的 `ENOSPC` / `EMFILE` / `No space left on device` 日志，因此本记录把 inotify 视为已知历史问题，不作为这次复现的主因。

## 关键结论

当前证据强烈支持：故障点不在 `topic-synthesis-core-enrichment` 的业务执行内容，而在 `create-topic-synthesis-prepare` 成功后，插件对第一阶段 ACP controller 做后台 detach / disconnect，同时 sequence runtime 立即初始化第二阶段的时间窗。

更具体地说，第一阶段已经完成输出校验，第二阶段工作区刚创建并写入 input manifest，但第二阶段尚未真正启动 Kilo transport，也没有产生 prompt、transport 日志或 transcript。系统会话退出发生在这两个动作之间。

2026-07-09 后续对照分析补充：这个问题不应泛化为“所有 sequence 两阶段交接都有风险”。用户长期运行 `literature-analysis -> tag-regulator` 级联 workflow，没有出现同类故障。源码对比显示，`literature-analysis` 的第一阶段带有 `apply_result`，因此不会命中 `onSequenceStepSucceeded` 中“step 成功后立即伪标记 apply succeeded 并 detach controller”的路径；而 `create-topic-synthesis` 的 `prepare` 阶段没有 `apply_result`，所以会在 ACP 后端刚返回成功后立即触发 controller detach。

因此，当前更精确的判断是：问题优先指向“无 `apply_result` 的中间 ACP step 在完成瞬间被立即 detach，且 detach 底层会关闭 transport、必要时强杀进程组”。pidfile / process group 校验不足仍是代码层面的安全漏洞，但它更像是误伤扩大的防线缺口，不再是解释复现条件的第一优先假设。

这不是已经完全证明的根因链，因为 journal 没有记录是谁请求了 `systemd --user` 的 `exit.target`。但从时间、插件状态、运行目录、SQLite 事件和源码路径看，最可疑的链路是：

1. `prepare` 阶段成功，并返回 `end_turn` / prompt finished。
2. 因为 `prepare` 没有 `apply_result`，sequence observer 调用 `markAcpSkillRunApplyResult({ state: "succeeded" })`。
3. `markAcpSkillRunApplyResult()` 隐式启动 `detachAcpSkillRunControllerAfterApplyResult()`。
4. detach 通过 `controller.disconnect()` 关闭旧的 ACP transport。
5. 如果 Kilo / npx 后端在 grace timeout 内没有自然退出，ACP transport close 路径可能向 wrapper 进程组发送 `SIGTERM` / `SIGKILL`。
6. 同一时间 sequence runtime 启动 `core` 阶段，导致旧 transport 清理和新阶段初始化重叠。
7. 用户级 systemd manager 收到退出请求，随后 DBus、portal、gpg-agent、gvfs、xfce4-notifyd、xrdp session 等被停止。

## 复现时间线

最新一次复现发生在北京时间 2026-07-09 23:22 左右。

相关运行目录：

```text
/home/joshua/Zotero/zotero-agents/runtime/acp/skill-runs/acp-skill-mrdnb8li-08j0l0
```

运行目录中的关键时间点：

```text
23:12:30  .kilo/skills, .zotero-bridge
23:13:44  .kilo/node_modules
23:21:51  runtime/payloads
23:21:58  runtime/views, runtime/handoff
23:22:26  result/create-topic-synthesis-prepare.1
23:22:35  .acp/create-topic-synthesis-prepare.1
23:22:36  result/topic-synthesis-core-enrichment.1
23:22:36  .acp/topic-synthesis-core-enrichment.1
```

第二阶段目录中只看到初始化文件：

```text
2026-07-09 23:22:36.305  README.md
2026-07-09 23:22:36.308  run.json
2026-07-09 23:22:36.527  input_manifest.json
2026-07-09 23:22:36.532  run-context.json
```

没有看到以下文件：

```text
prompt.md
runtime-logs.ndjson
transport.ndjson
stderr.log
acp-updates.ndjson
```

这说明第二阶段还没有真正进入 ACP transport / prompt 执行。

## Journal 证据

23:22:37 左右，用户级 systemd manager 开始退出：

```text
Jul 09 23:22:37 systemd[114868]: Activating special unit exit.target...
Jul 09 23:22:37 xrdp-sesman[178238]: [WARN ] Window manager (pid 178239, display 10) exited with non-zero exit code 255 and signal 15
Jul 09 23:22:37 systemd[114868]: Stopped dbus.service
Jul 09 23:22:37 systemd[114868]: Stopped xdg-desktop-portal.service
Jul 09 23:22:37 systemd[114868]: Stopped gpg-agent.service
Jul 09 23:22:37 systemd[114868]: Stopped gvfs-daemon.service
Jul 09 23:22:37 systemd[114868]: Stopped xfce4-notifyd.service
```

同一时间还能看到多个 SSH PAM session closed。`onedrive` 的 `SIGSEGV` 发生在它已经收到 termination signal 并尝试关闭之后，因此更像是 shutdown 过程中的次生崩溃，而不是触发会话退出的根因。

`loginctl show-user joshua` 显示 `Linger=yes`，所以这次并不像普通的“最后一个 session 关闭后 systemd --user 正常退出”。

## 插件状态证据

`runtime/logs/runtime-logs.json` 的关键事件：

```text
15:22:35.916  prepare acp-skillrunner-succeeded
15:22:36.162  prepare sequence-step-finished
15:22:36.184  core sequence-step-start
15:22:36.426  core acp-skillrunner-start
```

SQLite 状态：

```text
prepare request: acp-skill-mrdnb8li-08j0l0
state: succeeded
conversationState: closed
conversationRecoveryState: available

core request: acp-skill-mrdno93t-q7mquu
state: running
conversationState: starting
conversationRecoveryState: unavailable
```

第一阶段事件中，在 15:22:36 附近有：

```text
apply-succeeded
disconnect-turn-requested
```

第二阶段事件只有：

```text
workspace-created
input-manifest-written
```

这与“第一阶段 apply 后开始断开旧 controller，第二阶段刚初始化即被系统会话退出打断”的判断一致。

## 源码路径证据

workflow 定义位于：

```text
workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json
```

阶段顺序是：

```text
prepare -> core -> finalize
```

其中 `core` 和 `finalize` 都使用 `workspace: "reuse-workflow"`。

关键实现点：

```text
src/modules/acpSkillRunStore.ts:5085
detachAcpSkillRunControllerAfterApplyResult()

src/modules/acpSkillRunStore.ts:5125
markAcpSkillRunApplyResult()

src/modules/acpSkillRunStore.ts:5188
markAcpSkillRunApplyResult() 在更新状态后无条件触发 detach
```

当前 `detachAcpSkillRunControllerAfterApplyResult()` 的行为要点：

```text
1. 如果 state 不是 pending，则取出 controller。
2. 立即 registerAcpSkillRunController(requestId, null)。
3. 如果 controller 有 disconnect，则用 fire-and-forget 的方式调用 controller.disconnect()。
4. 调用方不会等待 disconnect 完成。
```

中间步骤成功的 observer：

```text
src/modules/workflowExecution/runSeam.ts:322
src/modules/workflowExecution/runSeam.ts:333
markAcpSkillRunApplyResult({ requestId, state: "succeeded" })

src/modules/acpSkillRunnerOrchestrator.ts:1776
src/modules/acpSkillRunnerOrchestrator.ts:1783
markAcpSkillRunApplyResult({ requestId, state: "succeeded" })
```

带 apply_result 的 sequence step 也有同类调用：

```text
src/modules/workflowExecution/sequenceStepApply.ts:89
markAcpSkillRunApplyResult({ requestId, state: "succeeded" })
```

但这里存在关键时序差异：

```text
src/modules/workflowExecution/runSeam.ts:327
src/modules/workflowExecution/runSeam.ts:329
if (event.step.id === final_step_id || event.step.apply_result) return;
```

这意味着：

1. 没有 `apply_result` 的中间 step 会在 `onSequenceStepSucceeded` 中立即调用 `markAcpSkillRunApplyResult()`，并触发 controller detach。
2. 有 `apply_result` 的中间 step 会跳过这个 observer，随后进入 `applySequenceStepIfNeeded()`。
3. apply 完成后才由 `sequenceStepApply.ts` 标记 apply result，并触发 detach。

`literature-analysis` 的第一阶段属于第 2 种路径；`create-topic-synthesis` 的 `prepare` 阶段属于第 1 种路径。

ACP transport close 路径中存在进程组清理：

```text
src/modules/acpTransport.ts:1120
terminatePosixProcessGroupWithMozilla({ signal: "TERM" })

src/modules/acpTransport.ts:1129
terminatePosixProcessGroupWithMozilla({ signal: "KILL" })

src/modules/acpTransport.ts:1437
processModule.kill(-lifecycle.childPid, "SIGTERM")

src/modules/acpTransport.ts:1448
processModule.kill(-lifecycle.childPid, "SIGKILL")
```

这类进程组清理本身不一定错误，但在 `npx -y @kilocode/cli@latest acp` 这种 wrapper 链路下，应额外确认被清理的 process group 边界是否完全受控。

## 与 literature-analysis 的对照

`literature-analysis` workflow 的第一阶段 `digest` 定义如下：

```json
{
  "id": "digest",
  "skill_id": "literature-analysis",
  "workspace": "new",
  "fetch_type": "bundle",
  "apply_result": {
    "workflow_id": "literature-analysis",
    "on_failure": "continue"
  }
}
```

第二阶段 `tag-regulator` 也带 `apply_result`。因此第一阶段完成后，sequence runtime 的行为是：

```text
step succeeded
-> onSequenceStepSucceeded 发现 step.apply_result，直接 return
-> applySequenceStepIfNeeded 执行 literature-analysis apply
-> apply 完成后才标记 apply result / detach controller
-> 继续 tag-regulator
```

`create-topic-synthesis` 的第一阶段 `prepare` 定义如下：

```json
{
  "id": "prepare",
  "skill_id": "create-topic-synthesis-prepare",
  "workspace": "new"
}
```

它没有 `apply_result`。因此第一阶段完成后，sequence runtime 的行为是：

```text
step succeeded
-> onSequenceStepSucceeded 立即 markAcpSkillRunApplyResult({ state: "succeeded" })
-> markAcpSkillRunApplyResult 立即触发 controller detach
-> applySequenceStepIfNeeded 没有 apply 可做
-> 几乎立刻进入 core step
```

这个差异解释了为什么 `literature-analysis -> tag-regulator` 跑几十次没有触发，而 `create-topic-synthesis prepare -> core` 稳定落入故障窗口。问题不是“两个任务交接”本身，而是“无 `apply_result` 的中间 ACP step 被立即 detach，同时下一步也几乎立即启动”。

这也削弱了“pidfile 被异常改写”作为主因的解释力。如果 pidfile 污染是高概率主因，理论上 `literature-analysis` 的 detach 也可能触发同类故障；但长期稳定运行说明更关键的触发条件是 detach 时机过早，以及 Kilo / npx 后端在刚返回成功后的尾部状态尚未安静。

## 尚未证明的点

以下判断还不能直接下结论：

1. 不能证明 `kill -TERM -<pid>` 直接杀到了 `systemd --user` 或 xrdp session。
2. 不能证明 Kilo ACP 一定错误设置了 process group。
3. 不能证明 Zotero 插件自身显式调用了 `systemctl --user exit`、`loginctl terminate-user` 或类似命令。

已搜索运行目录 transcript，没有发现业务 prompt 中显式执行 `systemctl`、`loginctl`、`terminate-user`、危险 kill 命令等痕迹。

因此当前更准确的表述是：插件的无 `apply_result` 中间 step 完成后立即 detach，是稳定复现的触发窗口；ACP transport 进程组清理是最需要加固的底层风险路径，但不再是解释复现条件的唯一假设。

## 临时规避建议

在修复前，建议暂停使用 `Kilo ACP (npm)` 后端运行 `create-topic-synthesis`。原因是这个 workflow 的 `prepare -> core` 切换非常稳定地落在故障窗口内，且 `prepare` 没有 `apply_result` 带来的自然缓冲。

如果必须继续运行，可以优先考虑：

1. 暂时改用非 ACP 后端或另一个 ACP 后端验证是否只与 Kilo / npx wrapper 相关。
2. 避免使用 `npx -y @kilocode/cli@latest acp` 这种每次由 npx 启动 wrapper 的形式，改成固定安装后的可执行文件，但这需要单独确认安装位置、环境变量和 Kilo 的推荐启动方式。
3. 在插件侧修复前，不建议继续反复复现，因为它会打断用户级 systemd manager，影响 SSH、RDP、DBus、portal、gpg-agent、OneDrive、verysync 等用户服务。

## 修复方案

### 目标

把“标记 applyResult 状态”和“关闭 ACP controller / transport”拆开，避免无 `apply_result` 的中间 sequence step 成功时隐式、异步、不可观测地关闭旧 transport，并让 sequence runtime 统一拥有 step lifecycle cleanup。

### 文件变更计划

#### 1. `src/modules/acpSkillRunStore.ts`

计划修改：

- 为 `markAcpSkillRunApplyResult()` 增加显式参数，例如 `detachController?: boolean`，默认保持当前行为，以降低兼容风险。
- 或者拆出更清晰的 API：一个函数只负责记录 applyResult 状态，另一个函数显式负责 detach controller。
- 给 detach start / finish / failure 增加可审计事件，至少记录 requestId、applyResult state、是否存在 controller、disconnect 是否启动、disconnect 是否完成。

设计约束：

- `markAcpSkillRunApplyResult()` 不应再隐藏一个无法等待的副作用，尤其不能让调用方以为只是状态写入。
- 如果保留默认 detach 行为，sequence 中间步骤必须显式关闭该行为。

#### 2. `src/modules/workflowExecution/runSeam.ts`

计划修改：

- 在 ACP sequence 的非最终 step 成功 observer 中，调用 `markAcpSkillRunApplyResult()` 时显式传入“不立即 detach controller”。
- 特别覆盖无 `apply_result` 的中间 step，因为这是 `create-topic-synthesis prepare` 命中的故障路径。
- 保持最终 step 或独立单 step 的现有终态清理语义。

#### 3. `src/modules/acpSkillRunnerOrchestrator.ts`

计划修改：

- 对恢复 / 重连路径中的 `onSequenceStepSucceeded` 做同样调整，避免恢复路径与正常路径行为分叉。

#### 4. `src/modules/workflowExecution/sequenceStepApply.ts`

计划修改：

- 审查带 `apply_result` 的 sequence step 是否也属于中间步骤。
- 如果是中间步骤，不应在 apply 成功后立即触发 controller detach；应由 sequence lifecycle 统一清理。
- 如果是最终步骤，则可以保留当前清理行为。
- 该路径不是当前故障的首要触发路径，但为了生命周期一致性仍应一起审查。

#### 5. `src/modules/acpTransport.ts`

计划修改：

- 增强 close / kill 路径诊断，记录 cleanup strategy、child pid、pidfile pid、是否使用进程组 kill、TERM / KILL 发送结果、waitForExit 结果。
- 重点审计 `posix-pidfile-supervisor` 与 Node process group cleanup 的边界，确认不会误伤父会话进程组。
- 进程组 kill 前应验证目标 pid 的 `pgid == pid`，并确认该进程属于本次 ACP 启动树；不满足时禁止负 PID kill，降级为直接 subprocess cleanup 并写 audit。

### 测试与验证计划

优先搜索并复用现有测试：

```bash
rg -n "markAcpSkillRunApplyResult|detachAcpSkillRunControllerAfterApplyResult|onSequenceStepSucceeded|sequence-step|ACP sequence|disconnect-turn-requested" test tests src -g '!node_modules'
```

如果已有 sequence / ACP lifecycle 测试：

- 扩展现有测试，验证 ACP sequence 的中间 step 成功不会立即触发 controller disconnect。
- 增加 `create-topic-synthesis` 风格用例：无 `apply_result` 的中间 ACP step 成功时，只更新状态，不立即 detach。
- 增加 `literature-analysis` 风格用例：有 `apply_result` 的中间 step 仍按 apply 流程推进，且不会通过 `onSequenceStepSucceeded` 提前 detach。
- 验证最终 step 或普通非 sequence ACP run 仍会执行 controller cleanup。

如果没有现有测试覆盖：

- 增加一个聚焦的回归测试，只断言稳定行为边界：中间 step 的 applyResult 状态会更新，但 controller disconnect 不会被立即调用。
- 避免断言完整日志文案、事件字段顺序或内部调用细节。

运行最小必要验证：

```bash
npm test -- --runInBand
```

如果项目测试命令不同，应以 `package.json` 中声明的脚本为准，选择与上述模块相关的最小测试集。

## 后续排查建议

修复后若仍能复现，需要继续收集以下信息：

1. detach start 到 systemd `exit.target` 激活之间的精确毫秒级日志。
2. `controller.disconnect()` 内部 transport close 的 pid / pgid / sid。
3. Kilo ACP / npx wrapper 启动后的进程树，包括 parent pid、process group id、session id。
4. `systemd --user` 的 `exit.target` 是否由 DBus 请求、登录会话变化、还是被外部信号触发。

可以用以下方向继续验证：

```bash
ps -eo pid,ppid,pgid,sid,stat,comm,args | rg 'kilo|node|npx|zotero|xrdp|systemd'
journalctl --user --since '<time>' --until '<time>' --no-pager
journalctl --since '<time>' --until '<time>' --no-pager | rg 'exit.target|SIGTERM|pam_unix|xrdp|kilo|node|npx|zotero'
```

## 当前建议

优先修复插件侧的 lifecycle 设计问题，而不是继续调系统桌面、xrdp、NoMachine 或 XFCE。最新证据显示，系统桌面崩溃更像是 ACP workflow 阶段切换触发的用户会话退出，而不是远程桌面本身的性能或稳定性问题。

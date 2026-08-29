# 测试框架设计与落地方案

## 目标

提供可复现的双环境测试：

- Zotero 真实环境回归（交付基线）
- Node + mock 快速回归（开发加速）

并以双套件门禁执行：

- PR Gate：`lite`（阻塞）
- Release Gate：`full`（阻塞）

## 入口命令

### 套件命令

- `npm run test` -> `npm run test:lite`
- `npm run test:lite`
- `npm run test:full`
- `npm run test:gate:pr`
- `npm run test:gate:release`

### Node 命令

- `npm run test:node` / `npm run test:node:lite`
- `npm run test:node:full`
- `npm run test:node:core` / `npm run test:node:core:full`
- `npm run test:node:ui` / `npm run test:node:ui:full`
- `npm run test:node:workflow` / `npm run test:node:workflow:full`

### Zotero 命令

- `npm run test:zotero` / `npm run test:zotero:lite`
- `npm run test:zotero:full`
- `npm run test:zotero:core` / `npm run test:zotero:core:full`
- `npm run test:zotero:ui` / `npm run test:zotero:ui:full`
- `npm run test:zotero:workflow` / `npm run test:zotero:workflow:full`

`npm run test:zotero:full` 现在是一个顺序包装器，而不是单个超长
real-host Zotero 进程。它会依次启动三个独立进程：

1. `npm run test:zotero:core:full`
2. `npm run test:zotero:ui:full`
3. `npm run test:zotero:workflow:full`

这样做是为了降低单进程 tail degradation 对 full gate 稳定性的放大。

## 测试域分类（Domain Taxonomy）

当前测试套件按一级域组织：

- `test/core/*.test.ts`
- `test/ui/*.test.ts`
- `test/workflow-*/**/*.test.ts`

详细迁移映射见 `doc/components/test-taxonomy-domain-map.md`。

## lite/full 规则

### 设计准则（客观标准）

`lite` 收录：

- 覆盖主执行链路的高信号 smoke/integration 用例
- 对 PR 阻断价值高、执行时长可控、稳定性高的用例

`full` 收录：

- `lite` 全集
- 深度回归、环境依赖、长耗时或低频风险用例
- 作为 CI Gate 时，优先保证真实 Zotero 宿主覆盖率与稳定性，而不是速度

约束：

- `full` 必须是 `lite` 的严格超集
- 任何从 `lite` 移出的用例都要有可审计理由

### 测试治理附加维度

除 `lite/full` 外，当前仓库的测试治理还要求显式考虑：

- 运行宿主：`node-only` / `zotero-safe` / `zotero-unsafe`
- 价值等级：`critical` / `standard`

说明：

- 这两个维度当前主要作为治理规则和文档约定使用
- 不新增新的 runner 或 Tier 执行机制
- 现有 `itFullOnly` 与测试入口保持不变

### 运行宿主规则

`node-only`：

- package helper 测试
- runtime seam 测试
- mock-heavy 测试
- 依赖 fake DOM 细节、多 realm 注入或宿主隔离的测试

`zotero-safe`：

- 可在真实 Zotero 宿主稳定执行
- 不依赖真实 editor / picker / dialog 打开
- 不依赖只在单一 JS realm 有效的 mock 注入

`zotero-unsafe`：

- 真实宿主下可能弹出 editor / file picker / dialog
- 或高度依赖复杂 UI override、多 realm 注入与长异步链路
- 这类测试不得进入 Zotero 常规回归

### Zotero-safe 禁止项

Zotero 环境测试中禁止引入会真实打开以下 UI 的测试：

- editor
- file picker
- dialog

现有此类测试必须：

- 在 Zotero 环境下 `skip`
- 或迁移为 `node-only`

### Zotero 常规集保留清单

当前 Zotero 常规集分成两层：

- `lite`：日常可用的真实宿主回归集
- `full`：稳定优先的关键门禁集，在 `lite` 基础上补齐真实宿主 coverage buckets

- `core`
  - `00-startup`
  - `11-selection-context-rebuild`（top3 fixture）
  - `32-job-queue-transport-integration`
  - `41-workflow-scan-registration`
  - `42-hooks-startup-template-cleanup`
  - `45-runtime-log-manager`
  - `47-workflow-log-instrumentation`
  - `52-runtime-bridge`
  - `87/88/89` runtime diagnostics / debug probe
  - `182` Host Bridge socket integration
  - `185` Zotero library page query
  - `186` ACP runtime file I/O
  - `187` runtime log persistence
- `ui`
  - `01-startup-workflow-menu-init`
  - `35-workflow-settings-execution` 的核心 smoke
  - `40-gui-preferences-menu-scan` 的 registry/context-menu/pass-through smoke
  - `50-workflow-settings-dialog-model` 的最小 smoke
- `workflow`
  - `literature-analysis`
  - `literature-explainer`
  - `literature-workbench-package`
  - `mineru`
  - `tag-regulator request-building`
  - `tag-regulator apply-intake` 的 host-safe subset

`full` 在 `lite` 基础上再增加：

- `selection-context-mix-all`
- `task-runtime`
- `workflow-apply-seam-risk-regression`
- `task-dashboard-history`
- `task-dashboard-snapshot`
- `job-queue-progress` 的 request/deferred/non-terminal 关键用例
- `skillrunner-task-reconciler` 的 state-restore / apply-bundle-retry / ledger-reconcile 稳定宿主用例
- `deferred-workflow-completion-tracker`
- `skillrunner-run-dialog-ui-e2e-alignment`
- `skillrunner-run-dialog-waiting-auth-observer`
- `workflow-settings-execution`、`gui-preferences-menu-scan` 的扩展宿主用例
- `literature-analysis`、`literature-explainer`、`literature-workbench-package`、`mineru`、`tag-regulator` 的稳定 host-context / idempotent / parity 用例

`full` 的覆盖目标按 4 个风险桶组织：

- `zotero-object-lifecycle`
- `skillrunner-transport-state`
- `workflow-host-context`
- `ui-host-shell`

默认移出 Zotero 常规集：

- package helper / library 测试
- filterInputs / schema / payload-shape 纯逻辑测试
- mock-heavy / seam-heavy / fake DOM 细节
- editor / picker / dialog / 多 realm brittle override
- GitHub sync / local runtime / installer / OS integration 深链路

### 当前实现

Zotero runner 不直接把 `test/core`、`test/ui` 或 `test/workflow-*`
目录交给 scaffold 打包。`zotero-plugin.config.ts` 只指向
`test/zotero/<domain>/<mode>` 下的显式入口文件，由这些入口 import
当前可在 Zotero/Firefox bundle 中运行的测试。Node-only、脚本工具、`.agents`
工具链和顶层依赖 Node 内建模块的测试继续由 Node/Mocha runner 覆盖。

lite 模式下：

- 当前 Zotero lite 入口保留：
  - `test/core/00-startup.test.ts`
  - `test/core/11-selection-context-rebuild.test.ts`
  - `test/core/42-hooks-startup-template-cleanup.test.ts`
  - `test/core/47-workflow-log-instrumentation.test.ts`
  - `test/core/52-runtime-bridge.test.ts`
  - `test/core/87-workflow-package-runtime-diagnostics.test.ts`
  - `test/core/88-workflow-runtime-scope-diagnostics.test.ts`
  - `test/core/104-acp-zotero-opencode.integration.test.ts`
  - `test/core/182-host-bridge-socket.integration.test.ts`
  - `test/core/185-zotero-library-page-query.zotero.test.ts`
  - `test/core/186-acp-runtime-file-io.zotero.test.ts`
  - `test/core/187-runtime-log-persistence.zotero.test.ts`
  - `test/ui/35-workflow-settings-execution.test.ts`
  - `test/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts`
  - `test/workflow-mineru/39-workflow-mineru.test.ts`
- 下列套件不进入 Zotero lite：
  - `test/core/10-selection-context-schema.test.ts`
  - `test/core/12-handlers.test.ts`
  - `test/core/32-job-queue-transport-integration.test.ts`
  - `test/core/34-generic-http-provider-e2e.test.ts`
  - `test/core/41-workflow-scan-registration.test.ts`
  - `test/core/45-runtime-log-manager.test.ts`
  - `test/core/89-workflow-debug-probe.test.ts`
  - `test/ui/01-startup-workflow-menu-init.test.ts`
  - `test/ui/40-gui-preferences-menu-scan.test.ts`
  - `test/ui/50-workflow-settings-dialog-model.test.ts`
  - `test/workflow-literature-analysis/21-workflow-literature-analysis.test.ts`
  - `test/workflow-literature-analysis/23-workflow-literature-analysis-fixtures.test.ts`
  - `test/workflow-literature-analysis/50-workflow-literature-analysis-mock-e2e.test.ts`
  - `test/workflow-literature-explainer/21-workflow-literature-explainer.test.ts`
  - `test/workflow-tag-regulator/64a-workflow-tag-regulator-request-building.test.ts`
  - `test/workflow-tag-regulator/64b-workflow-tag-regulator-apply-intake.test.ts`
- `test/core/11-selection-context-rebuild.test.ts` 仅运行 `selection-context-mix-all-top3-parents` 子夹具
- `selection-context-mix-all` 子夹具仅进入 Node full 集，Zotero 环境下通过 `isZoteroRuntime()` 过滤跳过
- 在 workflow/ui 的高复杂度测试文件内，部分边界/兼容性用例通过 `itFullOnly` 下沉到 `full`
  - 代表性文件：`test/workflow-literature-analysis/21-workflow-literature-analysis.test.ts`、`test/workflow-mineru/39-workflow-mineru.test.ts`、`test/ui/40-gui-preferences-menu-scan.test.ts`
- `selection-context` 的 lite 子夹具执行后保留重建产物（不清理）

`187-runtime-log-persistence.zotero.test.ts` 是 R8 的真实宿主机制门禁。它通过真实
`IOUtils` 验证异步 hydration、single-flight true flush，以及分块临时文件完成后再
替换为可解析 JSON；测试不设置机器相关耗时断言。该机制现在由下文的固定版本
兼容矩阵在 Zotero 7.0.32、9.0.6 和 10.0.1 中重复验证。

补充治理约定：

- `lite` 只保留 `critical` 与高价值 `standard` 场景
- 明显平台相关、纯文案、复杂兼容矩阵或长链路低频场景，优先下沉为 `itFullOnly`
- 参数化合并时，不允许把 `it` 与 `itFullOnly` 硬合并到同一个测试体中

full 模式下：

- 运行全部套件与全部 case（包含 `selection-context` 全矩阵）

## selection-context lite 子夹具

路径：

- `test/fixtures/selection-context/selection-context-mix-all-top3-parents.ts`

规则：

- 来源于 `selection-context-mix-all` 的前 3 个 parent
- 明确排除 standalone notes
- 仅用于 lite 模式下的 `selection-context rebuild`

## 门禁语义（Blocking vs Warning）

- `test:gate:pr`：阻塞（失败即 PR Gate 失败）
- `test:gate:release`：阻塞（失败即 Release Gate 失败）
- 非门禁型信息任务（如诊断采样）可配置为 warning，不覆盖上述阻塞结论

补充：

- `test:gate:release` 仍然使用 `full`
- 但 Zotero `full` 的执行拓扑已经改为 `core/ui/workflow` 三段独立
  real-host 进程顺序执行
- 这是 gate 稳定性 hardening，不是 coverage 收缩

## 域分组执行机制

通过环境变量 `ZOTERO_TEST_DOMAIN` 执行一级域分组：

- `all`（默认）
- `core`
- `ui`
- `workflow`

本次仅提供一级域分组，不提供 per-workflow 命令面。

`npm run test:node:full` 由 Node shard runner 顺序执行各测试分组。各分组的
子进程输出会先被收集，全部分组完成后再输出 shard summary。存在失败时，
summary 后只展示失败分组的 Mocha failure epilogue，包含全部失败用例的标题、
错误和堆栈，不重复展示通过用例。为保留失败输出中的状态色，shard 子进程默认
启用 ANSI 颜色；`test:synthesis-native:stage1` 复用同一输出约定。

## 相关文档

- `doc/components/test-taxonomy-domain-map.md`
- `doc/components/test-suite-governance.md`
- `doc/components/zotero-mock-parity.md`

## Zotero Background Cleanup

Real Zotero tests share one GUI process. Background loops that survive a test
boundary will eventually degrade later suites even when product logic is
correct.

Required policy:

- shared Zotero setup must run unified background cleanup after every test
- failure diagnostics must be emitted before cleanup
- tests that explicitly call startup or background-loop APIs should still do
  symmetric local teardown when that shutdown is part of the test contract
- modules with dialog timers, listeners, or singleton runtime state must expose
  `reset...ForTests` / `stop...ForTests` helpers so the shared cleanup harness
  can stop them

For `skill-runner` background async modules, stop-only teardown is not
sufficient. The current contract is:

- `stop()` invalidates the current generation and prevents new background work
- `drain()` waits for in-flight async work from the invalidated generation to
  unwind
- `resetForTests()` is `stop + drain + clear test-owned state`
- critical production shutdown/close paths must also use `stop + drain`

## Zotero Real-Object Cleanup

Real Zotero tests must also delete the library objects they create during each
test. Background cleanup alone is not enough when the real DB keeps growing
during a long `zotero:full` run.

Required policy:

- shared Zotero teardown must run tracked real-object cleanup after background
  cleanup
- handlers-created parent items, notes, attachments, and collections must be
  tracked automatically by a shared harness
- direct `new Zotero.Item(...)` / `new Zotero.Collection()` tests must register
  created objects explicitly
- deletion order is fixed:
  1. child notes
  2. attachments
  3. other child items
  4. top-level parent items
  5. collections
- `ZOTERO_KEEP_TEST_OBJECTS` is a local debugging escape hatch only

## Zotero Leak Probe Digest

When `zotero:full` shows clear tail degradation, the first response should be a
staged leak probe digest rather than timeout inflation or suite reordering.

Required policy:

- probe stays opt-in behind `ZOTERO_TEST_LEAK_PROBE`
- diagnostic outputs default to `artifact/test-diagnostics/`
- shared Zotero lifecycle must capture:
  - `test-start`
  - `pre-cleanup`
  - `post-background-cleanup`
  - `post-object-cleanup`
  - `domain-end`
- the digest must include runtime surfaces for:
  - reconciler
  - session sync
  - run dialog
  - local runtime
  - backend health
  - runtime logs
  - real-object cleanup tracking
  - temp artifact tracking
- the output must contain raw snapshots plus computed residual/growth summary

## Zotero Performance Probe Digest

If the residual leak probe is inconclusive but `zotero:full` still shows clear
tail degradation, the next diagnostic step is a staged performance probe
digest.

Required policy:

- performance probe stays opt-in behind `ZOTERO_TEST_PERF_PROBE`
- diagnostic outputs default to `artifact/test-diagnostics/`
- shared Zotero lifecycle must capture:
  - `test-start`
  - `pre-cleanup`
  - `post-background-cleanup`
  - `post-object-cleanup`
  - `domain-end`
- the digest must include:
  - timing spans for key real-host operations
  - event-loop lag
  - host resource snapshots
  - raw snapshots plus computed duration/lag/resource summary
  - bounded ACP runtime performance profiles when the debug-only profiler is
    explicitly enabled and has data

ACP runtime profiling has two complementary validation layers:

- `test/core/175-acp-runtime-performance-profiler.test.ts` locks activation,
  lifecycle, aggregation, bounds, drift sampling, immutability, and failure
  isolation.
- `test/core/176-acp-silent-runtime-performance-baseline.test.ts` runs a
  deterministic 1,000-update silent fixture for the ordered `closed`,
  `open-inactive`, and `acp-active` surface matrix. All cases traverse the same
  production ACP JSON-RPC, persistence, Host Bridge, and buffered-write seams;
  the closed case locks zero R3 publication work and both open cases lock their
  Assistant Workspace surface attribution. It verifies mechanism-level counts,
  aggregation, and boundedness, not wall-clock speed.
- `test/core/178-acp-runtime-semantic-trace.test.ts` locks lossless payloads,
  explicit round/claim authority, session-bound ownership, paired root and
  activity boundaries, deferred finish, NDJSON sequence/hash/footer integrity,
  partial recovery, quotas, and incomplete trace rejection.
- `test/core/96-acp-session-manager-lifecycle.test.ts` locks explicit Chat
  connection claim eligibility, implicit/existing-session isolation,
  multi-turn deferred finish, and forced terminal closure.
- `test/core/48-workflow-execution-seams.test.ts` locks canonical top-level
  Workflow trace identity across concurrent jobs and completion after request
  terminals but before apply consumers continue.
- `test/core/179-acp-runtime-replay-profiler.test.ts` locks recorded/logical/burst
  scheduling, backend-free target ports, fixed R2 v1 work, three warm-ups plus
  six formal profiles, interruptible cadence, progress after cleanup, early
  abort, fresh owners, drain failures, provenance, Workspace restoration,
  explicit profile aliases, semantic projected/no-op accounting, measured R2,
  independent execution/measurement completion, formal acceptance, and
  descriptive report aggregation, Unicode sample/stage identity,
  collision-safe paired filenames, and current-slot publication before setup.
- `test/core/180-acp-runtime-replay-controller.test.ts` locks trace preflight
  metadata, required free-text stage validation, live current/completed
  nine-record progress, shared surface summaries, canceled matrix persistence,
  retained options, and retry with fresh owners.
- `test/core/181-acp-runtime-replay-logical-time.test.ts` locks logical deadline
  and registration ordering, callback batching, cancellation, tail resumption,
  synthetic Chat/Skills timer ownership, Workspace fail-closed contamination,
  and production logical replay without recorded gap sleeps.
- `test/core/182-acp-runtime-replay-publication-sidecar.test.ts` is a Node-only
  protocol test for newer-revision/tab filtering, absent/direct/Xray-wrapped
  publisher sources, render-frame completion, and listener cleanup on timeout,
  cancellation, unload, or child replacement.
- `test/ui/183-acp-runtime-replay-publication-zotero-runtime.test.ts` exercises
  the real privileged host-to-shell-to-child frame chain for rendered ACP Chat
  and ACP Skills publication in Zotero.
- `test/core/97-acp-ui-smoke.test.ts` locks the complementary source protocol:
  ordinary Chat, ACP Skills, and SkillRunner child render paths contain no
  Replay drain property or acknowledgement action.
- ACP connection, Host Bridge, runtime diagnostic bundle, and performance
  digest tests verify request attribution and export through real module entry
  points.
- `npm run record:acp-runtime-before-baseline` runs the complete normalized
  three-surface matrix twice and writes three per-surface JSON records plus one
  consolidated Markdown report only when both matrices match.
- `npm run check:runtime-diagnostics-release-elision` and esbuild consume
  `scripts/runtime-diagnostics-production-manifest.ts`. The check bundles the
  real plugin entry in debug, non-debug, independently source-disabled ACP
  modes, and SkillRunner-audit-disabled mode. It requires zero bytes from every
  exclusive production input, rejects forbidden executable markers, and
  verifies that the allowlisted static Dashboard route remains packaged.
  Non-debug Replay on/off equality is auxiliary; inactive production
  scheduling and normal child rendering must remain independent from Replay.

The automated surface matrix is a mechanism smoke baseline. Comparable
real-workload evidence comes from complete source-specific replay matrices.
Manual acceptance captures separate multi-turn Chat and multi-stage Workflow
traces in Zotero and replays them without a backend. It covers explicit
new/resume/load binding, same-session reconnect, disconnect recovery, a
different-session replacement notice, Finish during an active turn, automatic
multi-stage Workflow completion, cancel, retry, save-to-Replay handoff, and a
second recording round without restarting Zotero. Unicode artifact names and
responsive progressive-disclosure layout remain Zotero 7/9 manual checks. CI
does not lock machine-specific millisecond thresholds.

Diagnosis order:

- leak probe -> residual/container growth
- performance probe -> cost/latency/resource growth

## SkillRunner Frontend Protocol Parity

`skillrunner` 前端对齐测试现在默认校验以下协议语义：

- `assistant_revision` 是公共 chat/read-model 语义，不是 parser 原始事件语义
- shared chat model 必须同时满足：
  - winner-only final 主显
  - folded revision history 保留
- waiting-user 在非 `open_text` 场景下不得隐藏 composer，而是切到 compact 单行模式

当前关键测试：

- `skillrunner-chat-thinking-core`
- `skillrunner-run-dialog-bubble-message-model`
- `skillrunner-run-dialog-ui-e2e-alignment`
- `skillrunner-management-client`

## Runtime Log Persistence Performance

`runtimeLogManager` now uses short batched prefs persistence instead of
rewriting the full `runtimeLogsJson` payload on every append.

Testing expectations:

- validate durability at explicit boundaries (`snapshot`, diagnostic export,
  `clear`, shutdown)
- do not depend on every `appendRuntimeLog()` call synchronously updating prefs

## Zotero Full Gate Process Splitting

当 retained Zotero `full` 已经明确表现出单进程 tail degradation 时，
优先收敛 gate 的执行拓扑，而不是继续把全部 domain 强行塞进一个 Zotero
进程里。

当前约束：

- `full` coverage contract 保持不变
- 默认执行拓扑改为三个独立 real-host 进程顺序运行：
  - `core:full`
  - `ui:full`
  - `workflow:full`
- 任一分段失败，都必须使整体 `full` gate 失败
- 分段执行是 gate 稳定性 hardening，不是 coverage 收缩

## Zotero 7/9/10 跨平台兼容夹具

兼容夹具位于现有 `lite/full` 与 `core/ui/workflow` 分类外层，不定义新的
测试成员集合。`test/zotero/compatibility-matrix.json` 是版本、下载地址、
SHA-256、runner、架构和门禁策略的唯一事实源。当前固定代表版本为：

- Zotero 7.0.32：Windows x64、Linux x64；
- Zotero 9.0.6：Windows x64、Linux x64；
- Zotero 10.0.1：Windows x64、Linux x64；
- Zotero 10.0.1：macOS Intel、Apple Silicon 的正式 XPI smoke 证据。

Windows/Linux 单元是阻塞门禁。pull request 运行六个 `lite` 行为单元；
`main` 与 release 运行六个 `full` 行为单元和六个正式 XPI 安装 smoke。
macOS 两个单元使用 GitHub 托管的 Intel 与 ARM64 runner，暂时
`continue-on-error`，其 receipt 仍会保留并上传。

常用命令：

```bash
# 查看由清单生成的 PR 计划
npx tsx scripts/run-zotero-compatibility-matrix.ts plan \
  --gate pull-request --json

# 只获取并验证一个宿主
npx tsx scripts/run-zotero-compatibility-matrix.ts acquire \
  --target zotero-10-linux-x64

# 使用已经构建的 .scaffold/build 运行一个真实宿主单元
npx tsx scripts/run-zotero-compatibility-matrix.ts run \
  --target zotero-10-linux-x64 --mode behavior --suite lite

# 安装同一个正式 XPI，验证启动和卸载清理
npx tsx scripts/run-zotero-compatibility-matrix.ts run \
  --target zotero-10-linux-x64 --mode xpi-smoke --suite lite
```

运行前先执行 `npm run build`，或通过 `--build-root` 指向 CI 下载的规范构建
目录。兼容 worker 会跳过 scaffold 的生产插件 rebuild，只生成当前测试资源，
所以一个 workflow 内所有宿主使用完全相同的 add-on 目录与 XPI 字节。

下载缓存默认位于用户缓存目录。清单使用 `download.zotero.org/client/release`
下带精确版本和归档名的不可变官方 URL；缓存键以 SHA-256 为主，命中时仍重新
计算摘要。不匹配的归档会被丢弃并重新下载。Linux tar 与 Windows ZIP 在解压前
检查绝对路径、盘符、父目录穿越、链接、设备和重复条目。macOS DMG 以只读方式
挂载，验证 `Zotero.app` 后才复制到 staging。预期 executable 和安装目录内
`application.ini` 的 Version 都与清单一致后，staging 才会发布为宿主基线。

共享宿主基线不会直接启动。每个测试分段先把它物化到本次 run root 下，再从
run-local executable 启动；这可以隔离 Zotero 自更新或其它运行期安装目录写入。
同一桌面会话中的 Zotero GUI host 由机器级锁串行化，避免 Zotero 单实例转发把
一个版本的启动请求交给另一个版本。CI 的矩阵并行发生在相互独立的 VM 上。

每个运行和 full 分段均有独立 host copy、profile、data、runtime、scaffold
resource、诊断目录和端口。超时清理先发送正常终止，再只针对当前 worker 创建
的进程组或 Windows process tree 强制终止；禁止按进程名清理全局 Zotero 实例。

每个顶层单元都会写入 `zotero-agents.zotero-compatibility-receipt.v1` JSON。
receipt 同时记录请求版本和真实宿主上报版本、源码状态、XPI 与宿主摘要、执行
阶段、错误码、诊断路径和清理结果。失败日志位于 receipt 相邻单元的
`diagnostics/runner.stdout.log`、`runner.stderr.log` 与 `host-facts.json`。
CI 使用 `if: always()` 上传整个运行目录；不得仅凭控制台文本推断通过。

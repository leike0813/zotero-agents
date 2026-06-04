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
- `ui`
  - `01-startup-workflow-menu-init`
  - `35-workflow-settings-execution` 的核心 smoke
  - `40-gui-preferences-menu-scan` 的 registry/context-menu/pass-through smoke
  - `50-workflow-settings-dialog-model` 的最小 smoke
- `workflow`
  - `literature-digest`
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
- `literature-digest`、`literature-explainer`、`literature-workbench-package`、`mineru`、`tag-regulator` 的稳定 host-context / idempotent / parity 用例

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

lite 模式下：

- 下列套件为 full-only：
  - `test/core/10-selection-context-schema.test.ts`
  - `test/core/12-handlers.test.ts`
  - `test/core/32-job-queue-transport-integration.test.ts`
  - `test/core/34-generic-http-provider-e2e.test.ts`
  - `test/workflow-literature-digest/23-workflow-literature-digest-fixtures.test.ts`
  - `test/workflow-literature-digest/50-workflow-literature-digest-mock-e2e.test.ts`
- `test/core/11-selection-context-rebuild.test.ts` 仅运行 `selection-context-mix-all-top3-parents` 子夹具
- 在 workflow/ui 的高复杂度测试文件内，部分边界/兼容性用例通过 `itFullOnly` 下沉到 `full`
  - 代表性文件：`test/workflow-literature-digest/21-workflow-literature-digest.test.ts`、`test/workflow-mineru/39-workflow-mineru.test.ts`、`test/ui/40-gui-preferences-menu-scan.test.ts`
- `selection-context` 的 lite 子夹具执行后保留重建产物（不清理）

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

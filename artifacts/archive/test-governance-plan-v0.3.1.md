# 测试治理计划修订版：`test-governance-plan-v0.3.1-revised`

## 当前治理基线

当前仓库继续使用三维测试治理：

- 执行成本：`lite` / `full`
- 运行宿主：`node-only` / `zotero-safe` / `zotero-unsafe`
- 价值等级：`critical` / `standard`

当前治理重点已经从“拆 giant file / 参数化合并”推进到下一阶段：

- 继续保留 Node 侧全量深度覆盖
- 将 Zotero 常规回归收敛成双层：
  - `lite`：日常可用的真实宿主回归集
  - `full`：稳定优先的关键门禁集，在 `lite` 基础上补齐真实宿主 coverage buckets
- 避免在真实 GUI 宿主中重复执行 package helper、mock-heavy、fake DOM、复杂 UI override 这类低信号场景

## Zotero 常规集保留原则

Zotero 常规集目标不是“覆盖越多越好”，而是：

- 证明插件可以在真实 Zotero 宿主启动并注入
- 证明核心菜单/设置路径仍可用
- 证明关键 workflow/package 至少有一条真实宿主成功路径
- 在 `lite` 就覆盖常见真实宿主漂移
- 在 `full` 再补一层关键门禁 parity

不再属于 Zotero 常规集的类别：

- package helper / library 测试
- filterInputs / schema / payload-shape 纯逻辑测试
- mock-heavy / seam-heavy / fake DOM 细节
- editor / picker / dialog / brittle multi-realm override
- GitHub sync / local runtime / installer / OS integration 深链路

## Zotero lite 保留清单

### `core`

保留：

- `test/core/00-startup.test.ts`
- `test/core/11-selection-context-rebuild.test.ts`
- `test/core/32-job-queue-transport-integration.test.ts`
- `test/core/41-workflow-scan-registration.test.ts`
- `test/core/42-hooks-startup-template-cleanup.test.ts`
- `test/core/45-runtime-log-manager.test.ts`
- `test/core/47-workflow-log-instrumentation.test.ts`
- `test/core/52-runtime-bridge.test.ts`
- `test/core/87-workflow-package-runtime-diagnostics.test.ts`
- `test/core/88-workflow-runtime-scope-diagnostics.test.ts`
- `test/core/89-workflow-debug-probe.test.ts`

### `ui`

保留：

- `test/ui/01-startup-workflow-menu-init.test.ts`
- `test/ui/35-workflow-settings-execution.test.ts` 的核心 smoke
- `test/ui/40-gui-preferences-menu-scan.test.ts` 的 registry/context-menu/pass-through smoke
- `test/ui/50-workflow-settings-dialog-model.test.ts` 的最小设置 smoke

### `workflow`

保留：

- `test/workflow-literature-digest/21-workflow-literature-digest.test.ts` 的 canonical request/apply smoke
- `test/workflow-literature-explainer/21-workflow-literature-explainer.test.ts` 的 canonical request/apply smoke
- `test/workflow-literature-workbench-package/45-workflow-note-import-export.test.ts` 的 export/import validation smoke
- `test/workflow-reference-matching/24-workflow-reference-matching.test.ts` 的 canonical matching smoke
- `test/workflow-mineru/39-workflow-mineru.test.ts` 的 canonical request/materialization smoke
- `test/workflow-tag-regulator/64a-workflow-tag-regulator-request-building.test.ts` 的 request-building smoke
- `test/workflow-tag-regulator/64b-workflow-tag-regulator-apply-intake.test.ts` 的 conservative apply-intake smoke

### Lite 中新增的宿主 parity

- `selection-context-mix-all-top3-parents`
- `job-queue transport integration`
- digest idempotent skip
- mineru sibling-markdown conflict filter
- tag-regulator conservative apply path
- workflow registry/context-menu/pass-through host behavior

## Zotero full 额外 parity 清单

在 `lite` 基础上，`full` 额外保留：

- `selection-context-mix-all`
- `task runtime`
- `job-queue-progress` 的 requestId / deferred / request-created non-terminal 关键用例
- `workflow-apply-seam-risk-regression`
- `task-dashboard-history`
- `task-dashboard-snapshot`
- `skillrunner-task-reconciler` 的 state-restore / apply-bundle-retry / ledger-reconcile 稳定宿主用例
- `deferred-workflow-completion-tracker`
- `workflow-settings-execution` 的 persisted/provider/pass-through 扩展用例
- `gui-preferences-menu-scan` 的 local-backend controls/status 与 host-shell 扩展用例
- `skillrunner-run-dialog-ui-e2e-alignment`
- `skillrunner-run-dialog-waiting-auth-observer`
- `literature-explainer` backend-shaped result guard
- `literature-workbench-package` export/import host-safe guards
- `reference-matching` idempotent / overwrite / parent-related guards
- `literature-digest` host-context / idempotency guards
- `mineru` stable host guards
- `tag-regulator` pre-dialog 与 conservative apply host-safe guards

### Full 的覆盖率桶

`full` 不再定义为“lite 稍厚版”，而是按宿主风险覆盖率组织：

- `zotero-object-lifecycle`
  - selection context
  - task runtime
  - item/note/attachment hierarchy 与宿主持久化
- `skillrunner-transport-state`
  - request creation / deferred / request-created non-terminal
  - history / snapshot / reconcile / deferred completion
- `workflow-host-context`
  - buildRequest / applyResult / idempotency / overwrite / host guards
- `ui-host-shell`
  - menu / settings / preference shell / run dialog / waiting-auth host behavior

默认移出 Zotero 常规集：

- `reference-note-editor`
- `tag-manager`
- `table parity`
- `GitHub sync`
- `mock e2e`
- `dialog rendering`
- `package-lib`
- `filterInputs`
- `schema/payload` 纯逻辑测试

## 实施约束

- 不新增 runner，不改 `test.entries`
- 不削减 Node 侧覆盖，只调整 Zotero 常规集
- 优先通过全局 file allowlist 做 Zotero file-level pruning
- 对少数保留的大文件，在文件内部把非 smoke case 下沉为 `node-only`

## Zotero 后台清理约束

Zotero `full` 的第一优先级是稳定性，而不是速度。真实 Zotero 测试共享
同一 GUI 进程，因此任何后台循环、timer、session sync、reconciler 或
dialog-level listener 都不得跨测试泄漏。

当前约束：

- 每条 Zotero 测试结束后，都必须执行统一的后台 cleanup harness
- 失败诊断必须先采集，再执行 cleanup
- 任何显式启动后台循环的测试，不得依赖“自然结束”来释放全局状态
- 持有 module-level timer/listener/singleton state 的模块，必须提供
  `reset...ForTests` / `stop...ForTests` 接口供公共 teardown 调用

对于 `skill-runner` 相关后台异步模块，当前再增加一条 SSOT lifecycle
contract：

- `stop()` 只负责让旧后台任务失效并禁止续命，不负责清业务状态
- `drain()` 负责等待本代 in-flight async work 收尾
- `resetForTests()` 固定为 `stop + drain + clear test-owned state`
- 关键生产 shutdown/close 路径同样必须使用 `stop + drain`，不能只做
  stop-only 清理

## Zotero 真实对象清理约束

真实 Zotero 宿主测试除了要清后台异步状态，还必须在每条测试结束后清理
本条测试创建的真实库对象。否则 `full` 长跑会在真实 DB 中持续累积
parent / note / attachment / collection，进而拖慢尾段 workflow 用例。

当前约束：

- real-host 测试对象 cleanup 由共享 harness 统一负责，不能在 workflow
  文件里各自重复实现
- 共享 teardown 顺序固定为：
  1. failure diagnostics
  2. background runtime cleanup
  3. tracked real-object cleanup
- 默认通过 `handlers` 创建的对象必须自动被追踪
- 直接 `new Zotero.Item(...)` / `new Zotero.Collection()` 的测试必须显式
  注册到 cleanup harness
- 删除顺序固定为：
  1. child notes
  2. attachments
  3. other child items
  4. top-level parent items
  5. collections
- `ZOTERO_KEEP_TEST_OBJECTS` 仅用于本地调试保留现场，不可作为常规门禁配置

## Zotero Tail Leak Probe Digest

当 `zotero:full` 出现“越到尾段越重”的退化时，默认先启用 staged leak
probe digest，而不是先调 timeout 或调整执行顺序。

当前约束：

- probe 通过 `ZOTERO_TEST_LEAK_PROBE=1` 显式开启
- 默认输出目录统一为 `artifact/test-diagnostics/`
- 共享 Zotero lifecycle 必须采集这些 phase：
  - `test-start`
  - `pre-cleanup`
  - `post-background-cleanup`
  - `post-object-cleanup`
  - `domain-end`
- digest 必须覆盖：
  - reconciler
  - session sync
  - run dialog
  - local runtime
  - backend health
  - runtime logs
  - real-object cleanup tracking
  - workflow temp artifacts
- 最终报告必须同时输出：
  - raw snapshots
  - summary
  - suspicions

## Zotero Tail Performance Probe Digest

如果 staged leak probe 没有给出可操作结论，而 `zotero:full` 仍然表现出
明显的 tail degradation，则下一步必须升级到 staged performance probe
digest，而不是直接调 timeout 或排序。

当前约束：

- probe 通过 `ZOTERO_TEST_PERF_PROBE=1` 显式开启
- 默认输出目录统一为 `artifact/test-diagnostics/`
- 共享 Zotero lifecycle 必须采集：
  - `test-start`
  - `pre-cleanup`
  - `post-background-cleanup`
  - `post-object-cleanup`
  - `domain-end`
- digest 必须包含：
  - 关键宿主操作 timing spans
  - event-loop lag
  - 宿主资源快照
  - raw snapshots / spans / summary / suspicions
- 诊断顺序固定为：
  1. leak probe 看残留
  2. performance probe 看成本增长

## 验收口径

- Zotero `core/ui/workflow` 常规回归用例数显著下降
- 不再包含 editor / picker / dialog 引发的潜在卡死路径
- Node 定向回归保持全量通过
- `npx tsc --noEmit` 通过

## Zotero Full Gate 执行拓扑修订

最新诊断表明：

- 容器型残留不是主矛盾
- `saveTx()` 连续写入会显著放大后续 real-host 测试成本
- 单进程 Zotero `full` 更像 endurance run，而不是稳定的 CI host-coverage gate

因此当前治理决策是：

- 保持 Zotero `full` coverage contract 不变
- 将其执行拓扑从单进程长跑改为三个独立 real-host 进程顺序执行：
  - `core:full`
  - `ui:full`
  - `workflow:full`

目标：

- 降低 single-process tail degradation
- 保持 release gate 的真实宿主覆盖率
- 为未来继续增加 retained `full` 用例预留增长空间

## Runtime Log Persistence Hardening

最近 node 回归表明，`runtimeLogManager` 的热点不是 retention 逻辑本身，
而是每次 `appendRuntimeLog()` 都全量重写 `runtimeLogsJson` prefs 文档。

当前治理结论：

- runtime log 采用 memory-first + batched persistence
- 诊断/导出/clear/shutdown 边界必须强制 flush
- runtime log 测试应验证 durability semantics，而不是依赖 per-append
  synchronous prefs writes

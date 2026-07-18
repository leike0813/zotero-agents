# Synthesis Sidecar Stage 1 WS5 自我审查报告

> 审查日期：2026-07-18
>
> 审查对象：Stage 1 重构基线至 WS5 完成状态
>
> 基线提交：`d57aded0ddf50b8b5d1efe146223d9d1ac82d6b3`（`chore: update refactor plan`）
>
> 审查终点：`b2814eff`（本轮审查时的 `HEAD`）
>
> 关联规划：`artifact/synthesis_sidecar_service_stage1_refactor_plan_20260715.md`
>
> 审查性质：实机测试验收前的只读架构、实现、测试与交付状态审查

## 1. 结论

WS5 可以作为一个重构里程碑，但里程碑名称应限定为：

> **Stage 1 / WS5：Synthesis 私有隔离 foundation 完成**

当前状态不应表述为“Stage 1 完成”“可生产切换”或“已具备实机验收条件”。分层、边界和单一所有者方向总体正确，WS5 计划中的 application、repository、canonical store、durable import/export、WebDAV、debug/maintenance 私有基础已形成；但审查发现一个会破坏 durable import 原子性的 P0 并发缺口，以及 client 生命周期、Worker source-mode parity、sidecar runtime 资产等 P1 阻塞项。

| 判定项 | 结论 |
| --- | --- |
| WS5 私有隔离 foundation | 可以认定完成 |
| 总体架构方向 | 基本正确，可以继续推进 |
| WS6 shadow verification 前置条件 | 尚未满足 |
| 实机验收前置条件 | 尚未满足 |
| OpenSpec 归档 | 尚未完成 |
| 生产 DB/canonical ownership 切换 | 未发生，符合当前阶段约束 |

## 2. 审查边界与可追溯性

本轮以 `d57aded0..b2814eff` 为审查范围，覆盖：

- 63 个提交；
- 65 个 Stage 1 OpenSpec change；
- 949 个变更文件，约 `+110,076 / -24,162`；
- `packages/synthesis-*` 的 contracts、engine、application、repository 分层；
- `apps/synthesis-service` 的 composition、HTTP、canonical store 与 shutdown；
- 插件侧 `SynthesisClient`、默认 composition 与生命周期接入；
- Node test、Synthesis invariants、边界检查、runtime/XPI freshness、TypeScript、lint 与 OpenSpec strict validation；
- Stage 1 规划、基线和实际 change/commit 状态的一致性。

重构总体保持了小步提交节奏，但“一个 change 对应一个 commit”并非完全成立：本范围内有 63 个提交、65 个 change，其中 `stage1-1` 一次引入了 3 个 change。这个差异不影响代码定位，但后续归档与里程碑审计应以 change 清单为准，不能只按提交数推断。

## 3. 阻塞性发现

### P0：durable import 未真正封闭 canonical single-writer 窗口

**位置**：

- `apps/synthesis-service/src/topicCanonicalStoreNode.ts`
- `packages/synthesis-application/src/durableBundleApplication.ts`

**事实**：durable import 先通过 `stageImportBatch()` 写入 pending batch，再等待 repository commit，最后通过 `commitImportBatch()` 推进 canonical state。`promote()` 只检查 canonical state 和瞬时 `busy` 状态，没有在 `importBatchPath` 存在期间阻止普通 Topic writer。

因此，在 durable import 等待 repository commit 的窗口内，另一个 Topic application writer 可以成功 `promote()`。随后 import batch 因 basis 已变化而得到 `basis_mismatch`，形成 repository 已 durable commit、canonical 未 forward commit 的跨存储不一致。

审查中的最小复现结果：

```text
promoteWhileBatchStaged: "promoted"
commitImportBatch: "basis_mismatch"
canonical state: "ready"
```

重启恢复可能进一步进入 `durable_import_recovery_incomplete`。当前这些私有 application 尚未通过 RPC 或自动生产路径暴露，因此尚未造成现有用户数据风险；但该缺口必须在 WS6 shadow verification 前关闭。

**所需性质**：staged batch 从建立到 commit/abort/recovery 完成期间，canonical store 必须只有一个可验证的写入许可源；普通 promote 不得穿透该窗口。

### P1：真实 Worker 的 source-mode parity 已回归

**位置**：

- `packages/synthesis-engine/src/topicGraphIndex.ts`
- `packages/synthesis-contracts/src/topicGraphCore.ts`
- `test/core/183-synthesis-topic-graph-index-worker-parity.test.ts`
- `test/core/185-synthesis-real-worker-thread-parity.test.ts`

`topicGraphIndex.ts` 使用 `../../synthesis-contracts/src/topicGraphCore.js`。构建后的 `.scaffold` 中存在对应 `.js`，但 `tsx` 启动的真实 Worker 在源码树中无法解析该路径，抛出 `ERR_MODULE_NOT_FOUND`。

单独重跑 Core 183 与 Core 185 的结果为 10 passing、2 failing，两个失败均为同一模块解析错误。这证明 source-mode real Worker canary 已失效；它不等同于已证明打包产物运行时必然失败，但会掩盖后续 Worker 跨包回归。

### P1：默认 SynthesisClient 的 invalidation 与 shutdown 语义不可靠

**位置**：

- `src/modules/synthesisClient/defaultClient.ts`
- `src/modules/synthesis/service.ts`
- `src/hooks.ts`

`getDefaultSynthesisClient()` 异步创建 composition 后无条件写回缓存，没有缓存初始化 Promise，也没有 generation/token 校验。若初始化过程中调用 `invalidateDefaultSynthesisClient()`，旧初始化仍会在完成后重新写回缓存。

审查复现：

```text
const pending = getDefaultSynthesisClient()
invalidateDefaultSynthesisClient()
const oldClient = await pending
const nextClient = await getDefaultSynthesisClient()
oldClient === nextClient // true
```

此外，`hooks.ts` 的 `onShutdown` 未销毁 legacy Synthesis composition；`service.ts` 中 canonical maintenance debounce timer 也没有被 abort 清理。结果是失效或卸载后的旧 client/resolver 仍可能重新创建 service 或遗留计时任务。

**所需性质**：默认 client 需要共享初始化 Promise、generation-aware invalidation 和幂等 dispose；插件 shutdown 必须等待 composition 清理完成。

### P1：实机所需 sidecar runtime/XPI 资产尚不存在

`npm run check:synthesis-sidecar-runtime-freshness` 对以下五个 target 均失败：

- `win32-x64`
- `darwin-x64`
- `darwin-arm64`
- `linux-x64`
- `linux-arm64`

失败原因均为缺少 `addon/bin/synthesis-sidecar/<target>/manifest.json`。当前 XPI 也不包含 WS5 新增的 product runtime/service/application/repository 资产。这个状态与“prebuild publication 前 fail-closed”的设计一致，但意味着无法在现有包上执行 clean-machine、launcher、runtime integrity、parent lease、shutdown 或真实 sidecar path 验收。

## 4. 高优先级风险

### 4.1 Service shutdown 不是 failure-safe，Topic application 也没有 drain

`apps/synthesis-service/src/server.ts` 的 `beginShutdown()` 在 fire-and-forget async block 中顺序等待多个 owner cleanup，没有统一的 `catch/finally`。任一步 reject 都可能跳过后续 owner 清理、server close 和 `resolveStopped()`。

同时，Topic application 只有 `stopAdmission()`，没有跟踪正在执行的 apply，也没有 shutdown drain。server 停止 admission 后可能直接关闭 canonical/repository，而已接纳的 Topic apply 仍在运行。

### 4.2 累积 Node 回归没有进入 CI release gate

`.github/workflows/ci.yml` 执行 `npm run build` 后进入 `test:gate:pr` 或 `test:gate:release`；`scripts/run-ci-gate.ts` 实际映射到 Zotero `test:lite`/`test:full`，没有执行 `test:node:*`。

Core 175–217 承载了本轮 service、repository、application、runtime 和 Worker 的主要证明，但目前不阻塞 CI。Core 183/185 的回归正是由较晚 change 引入，而后续 change 没有重跑早期 Worker parity 测试，说明逐 change 通过不能替代里程碑累积 gate。

### 4.3 HTTP route 把内部故障统一映射为 400

canonical inspect/transfer route 使用宽泛 catch，将 IO、storage 或内部异常与请求格式错误统一返回 `invalid_request`。这会让真实数据故障表现为客户端错误，削弱运维诊断和修复状态判断。输入错误应为 4xx，内部 IO/持久化故障应进入明确的 5xx 或 repair-required 状态。

### 4.4 contracts 与 repository 存在反向运行时依赖

`packages/synthesis-contracts/src/sidecarSystem.ts` 从 repository 导入运行时常量，而 repository 本身又依赖 contracts。`scripts/check-synthesis-service-boundary.ts` 通过显式 allowlist 放行该边，隐藏了 contracts → repository 的依赖反转。

此外，workspace package 仍广泛使用跨包 `../../*/src/*.js` 深层导入，`package.json` 没有完整声明实际 workspace 依赖。当前构建可以工作，但 source/build 解析差异已经在 Worker parity 中显现。

### 4.5 规划范围与实际 WS5 定义存在漂移

Stage 1 计划的原始 WS4/WS5 task 仍包括 remote `SynthesisClient`、config/secret port 和 asset registry proxy；同一文档的进度段则明确记录 remote client 尚未实现。当前实际完成的是私有隔离 foundation，而不是原始 WS1–WS5 所有任务语义。

因此，本里程碑必须使用本文第 1 节的限定名称，并在进入 WS6 前统一计划正文、task 状态和 milestone 定义。

## 5. OpenSpec 与归档状态

用户层面的“change 已完成并按提交保存”与仓库事实基本一致，但 OpenSpec 意义上的“已归档”尚未发生：

- `openspec list --json` 显示 65 个 Stage 1 change 仍处于 active changes；
- 任务共 959 项，完成度为 959/959；
- 65 个 Stage 1 change 均可通过 strict validation；
- `openspec/changes/archive/` 中没有对应的 Stage 1 归档目录；
- 多个 delta spec 尚未同步到 `openspec/specs` 主规格。

全仓 `openspec validate --all --strict --no-interactive` 的结果为 290 passed、3 failed；3 个失败来自既有 canonical specs，不属于本次 Stage 1 change。归档前仍需区分并处理：

1. Stage 1 change 自身的实现/规格一致性；
2. delta spec 向 main spec 的同步；
3. 仓库既有 3 个 strict spec failure；
4. 65 个 active change 的批量归档顺序。

在 P0/P1 修复进入新 change 后，不应直接把当前 65 个 change 宣布为最终归档完成；应先确定修复 change 与已有 delta 的依赖，再做 verify、sync 和 archive。

## 6. 自动验证记录

### 6.1 已通过

| 命令或范围 | 结果 |
| --- | --- |
| `npm run check:synthesis-engine` | 通过 |
| `npm run check:synthesis-contracts` | 通过 |
| `npm run check:synthesis-repository` | 通过 |
| `npm run check:synthesis-application` | 通过 |
| `npm run check:synthesis-service` | 通过 |
| `npx --no-install tsc --noEmit` | 通过 |
| `npm run check:synthesis-service-boundary` | 通过；108 public methods、1 direct consumer、0 reported violations |
| `npm run test:synthesis:invariants` | 27 passing |
| 聚焦 UI/workflow 测试 | 22 passing |
| Core 202 单独重跑 | 3 passing；正常 2k/100k case 约 40.8 秒 |
| `npm run check:help-docs` | 通过 |
| 65 个 Stage 1 change strict validation | 全部通过 |

### 6.2 未通过或未满足

| 命令或范围 | 结果与解释 |
| --- | --- |
| `npm run test:node:core:full` | 2718 passing、11 pending、15 failing；耗时约 9 分钟 |
| Core 183/185 | 2 个确定性失败；真实 Worker source-mode `.js` 解析回归 |
| Core 213 | 测试自身脆弱；用全文第一个 `indexOf("repository.close()")` 锁定实现顺序，新增 cleanup path 后产生假失败 |
| Core 125 | 测试自身脆弱；仍以旧 source-string 位置锁定 `authorsJson`，而 SSOT 已移到 repository package |
| Core 155 | 7 个 topic synthesis split runtime 失败；本轮未确认由 Stage 1 重构直接引入 |
| Core 124 | 缺少 `zotero-library-agent` runner；不属于本里程碑改动 |
| Core 165 | host surface script expectation 漂移；不属于本里程碑核心路径 |
| Core 202（全套内） | `worker_timeout`；单独重跑通过，属于负载/性能上下文问题 |
| governance check | `researchBundleReadme` 存在 bare Zotero global；不属于本里程碑改动 |
| `npm run check:synthesis-sidecar-runtime-freshness` | 五个平台资产均缺失 |
| `npm run lint:check` | 4 个文件未通过 Prettier，其中 Core 164 文件由 Stage 1 触及 |
| `git diff --check d57aded0..HEAD` | 18 个 OpenSpec 文件存在 EOF 空行问题 |
| 全仓 OpenSpec strict validation | 290 passed、3 个既有 canonical spec failed |

Node full suite 的“15 failing”不能整体视为本次重构回归，也不能因此忽略。当前可确定属于本轮里程碑的产品缺陷是 Core 183/185；Core 213/125 则暴露了测试锁定实现细节的问题，应改为验证稳定的可观察行为。

### 6.3 构建流程漂移

Stage 1 change 50 修改了根 `build` script：现在执行 Synthesis checks/build、Zotero build 和 TypeScript check，但移除了原有的 `npm run build:help-docs`。release workflow 仍单独生成 help docs，因此正式 release path 尚有保护；常规本地/CI build 不再刷新帮助文档，行为与此前不同，应明确这是有意拆分还是遗漏。

## 7. 已确认的正向结果

尽管存在上述阻塞项，本轮重构已经建立了可继续演进的正确基础：

- WS5 的 domain applications、checkpoint、durable import/export、WebDAV 和 debug/maintenance 已在 service composition 中形成，但尚未通过 RPC 暴露；
- `mutationEnabled: false` 仍然成立；
- 生产 `synthesis.db`、canonical topic files 和 Zotero Host mutation 的所有权仍在插件侧，没有提前发生双写或隐式 cutover；
- 未发现私有 WS5 application 被 shadow route 泄露；
- Node-only 的 filesystem、SQLite、`worker_threads` 主要留在 sidecar composition，未进入 Zotero 插件运行环境；
- Stage 1 diff 未触及 Assistant Workspace / ACP transcript 的 projection 与 managed-region 渲染路径，相关 UI 硬约束未受影响；
- contracts、engine、application、repository、service 的目标分层已经存在，service boundary 从基线的 126 public methods / 10 direct consumers 收敛到 108 / 1。

这些结果支持保留当前架构方向，不需要推倒重来。后续应优先补齐所有权、生命周期和累积门禁，而不是扩大 RPC 或生产接入范围。

## 8. 实机验收前的关闭顺序

建议按以下顺序关闭问题，每项使用独立、可追溯的 OpenSpec change：

1. 封闭 durable import 与普通 Topic writer 的 canonical 单写者窗口，并用可控并发行为验证跨存储 commit/abort/recovery。
2. 为默认 `SynthesisClient` 建立共享初始化、generation-aware invalidation 和幂等 dispose，并接入插件 shutdown。
3. 修复真实 Worker 在 source tree 与 compiled tree 的统一模块解析，恢复 Core 183/185。
4. 将 service shutdown 改为 failure-safe cleanup，并为已接纳的 Topic application work 增加 drain。
5. 把累计 Node milestone suite 纳入 CI/release gate，同时移除 Core 125/213 对源码字符串和内部顺序的脆弱断言。
6. 对齐 Stage 1 计划中的 WS5 范围、实际进度和 milestone 命名。
7. verify 并同步 Stage 1 delta specs；处理既有 strict failures 后再批量 archive。
8. 生成并校验五个平台的 product-owned runtime，确认 XPI freshness 和 runtime integrity。
9. 重跑类型、边界、invariants、Node full、runtime freshness、XPI、lint 和 OpenSpec strict gates。
10. 在上述门禁通过后，进入 clean-machine/真实 Zotero/profile lifecycle/shutdown/recovery 的实机验收。

## 9. 里程碑记录建议

本里程碑可以登记为：

```text
Stage 1 / WS5 — Private Isolated Synthesis Foundation Complete
```

建议附带以下退出说明：

```text
Application/repository/canonical/debug-maintenance foundations are composed
privately with production ownership unchanged. WS6 shadow verification and
real-machine acceptance remain gated by durable single-writer, client
lifecycle, worker parity, shutdown drain, cumulative CI, OpenSpec archive,
and packaged runtime closure.
```

该表述既保留了 WS5 的真实工程成果，也不会把 foundation 完成误认为生产 sidecar 已可用。

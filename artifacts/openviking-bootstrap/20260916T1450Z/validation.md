# validation.md — 实际执行的检查与结果

- run_id: `20260916T1450Z`
- 基线：HEAD `d75221a75e1e40425edd20c1c5a198c6f1bb6975`（分支 `research/e2e-historical-regressions`），工作区除本任务未跟踪的输入文件外无改动。
- 执行环境：Ubuntu 24.04.4 LTS / x86_64 / Linux 6.8.0-139；Node v24.12.0；npm 11.6.2；rustc 1.92.0 + `nightly-2026-07-25`（已安装）；cargo 1.92.0。
- 工作目录：仓库根 `/home/joshua/Workspace/Code/JavaScript/zotero-agents`。

按指南 §8.2 的顺序执行：先静态检查与类型检查，再单元/领域测试，再与关键流程相关的进程级测试。所有命令在运行前都先读了脚本定义（`package.json` scripts、`scripts/run-node-test-shards.ts`、`scripts/ci-gate-plan.ts` 等），未执行任何带自动修复、快照更新、代码生成或安装依赖副作用的命令。

---

## V-1 类型检查（全部通过）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| V-1.1 | `npx tsc --noEmit`（根 tsconfig，含 `src`、`typings`、`packages/*/src`） | 0 | 无输出 |
| V-1.2 | `npx tsc --noEmit -p tsconfig.sidebar.json` | 0 | 无输出 |
| V-1.3 | `npx tsc --noEmit -p tsconfig.dashboard.json` | 0 | 无输出 |
| V-1.4 | `npx tsc --noEmit -p tsconfig.synthesis.json` | 0 | 无输出 |
| V-1.5 | `npx tsc --noEmit -p packages/synthesis-engine/tsconfig.json` | 0 | 无输出 |
| V-1.6 | `npx tsc --noEmit -p packages/synthesis-contracts/tsconfig.json` | 0 | 无输出 |
| V-1.7 | `npx tsc --noEmit -p packages/synthesis-repository/tsconfig.json` | 0 | 无输出 |
| V-1.8 | `npx tsc --noEmit -p packages/synthesis-application/tsconfig.json` | 0 | 无输出 |

说明：单次循环调用中 shell 的最终退出码为 1，原因是循环末尾 `[ -n "$out" ] && echo` 在 `$out` 为空时返回 1（`&&` 短路），**不是** 类型检查失败。八个 `tsc` 调用逐一记录到退出码均为 0 且无诊断输出。

判读：在本次基线上，项目声明的全部 8 个 TypeScript 项目文件集均可通过类型检查。

## V-2 Rust Synthesis sidecar 测试（全部通过）

- 命令：`cargo +nightly-2026-07-25 test --workspace --locked --no-fail-fast --manifest-path rust/synthesis-sidecar/Cargo.toml`
- 退出码：**0**
- 日志：`validation-rust-synthesis-sidecar.log`（698 行）
- 结果：33 个测试目标，**351 个测试通过，0 失败，0 ignored**；`FAILED` 出现 0 次；其中 15 个目标为 0 测试（doc-tests 与无单测的 crate）。
- 副作用：仅写入 `rust/synthesis-sidecar/target/`（`.gitignore` 已排除的构建目录）。源码、锁文件、契约文件未被修改。
- 覆盖限制：该命令在 Node 单元测试所覆盖不到的 Rust 侧提供证据；但它只证明 Rust 侧内部行为，不证明 TS↔Rust 的跨语言契约在实际宿主中一致（后者由 `check:synthesis-*-parity` 系列脚本负责，本次未运行）。

## V-3 Node 领域测试（部分失败）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| V-3.1 | `npx tsx scripts/run-node-test-shards.ts --list-shards` | 0 | 28 分片 / 11 domain / 272 个文件，无未归属或重复归属 |
| V-3.2 | `npx tsx scripts/run-node-test-shards.ts --domain zotero-host` | **1** | 16 文件，10 个失败（见下） |
| V-3.3 | `npx tsx scripts/run-node-test-shards.ts --domain workflow` | 未完成 | 见 §V-3.3 |

### V-3.2 zotero-host：10 个失败（confirmed，实际执行）

命令：`npx tsx scripts/run-node-test-shards.ts --domain zotero-host`
等价底层命令（runner 打印）：`npx tsx node_modules/mocha/bin/mocha tests/zotero-host/*.test.ts --require tests/setup/zotero-mock.ts --exit`
分片退出码 = 10（10 个失败），runner 退出码 = 1。耗时 15,172 ms。数据目录为 runner 自建的临时目录 `/tmp/zotero-agents-node-test-shards-*/zotero-host/Zotero_data`（未触碰真实 Zotero 数据）。

**9 个失败集中在 `tests/zotero-host/102-zotero-host-broker-capability-api.test.ts`**，全部是同一类断言方向：期望 `committed`，实际得到 `failed` / `repair_required`：

| 失败用例 | 断言差异 | 行号 |
|---|---|---|
| uses semantic artifact writers and reports stale citation basis | expected `failed` → `committed` | :1641 |
| keeps valid Citation payload readable when its References dependency is ambiguous or damaged | `Expected canonical pair` | :1796 |
| keeps managed details above the downstream budget complete and enforces the UTF-8 Broker limit | `failed` → `committed` | :1835 |
| updates each literature singleton and rejects duplicates without removing either candidate | `literature_artifact.upsert_digest` attempt `status: failed`，`error.code=execution_failed`，`phase=staging`，`message="prepared mutation no longer matches current Zotero state"` | :1994 |
| replays a managed receipt before preparing a now-damaged target | `Expected managed commit` | :2101 |
| consumes prepared-image slots inside one replay-safe note mutation | `failed` → `committed` | :2206 |
| compensates prepared-image staging and preserves the primary note failure | 实际消息 `"prepared mutation no longer matches c…"` 未包含期望片段 `"second image staging failed"` | :2314 |
| routes stored attachment creation through canonical replay and preserves cleanup evidence | `repair_required` → `committed` | :3095 |
| routes attachment update, replacement, move, and removal through confirmed authority results | `failed` → `committed` | :3280 |

**1–2 个失败在 `tests/zotero-host/130-zotero9-compatibility.test.ts`**：`Error: Timeout of 2000ms exceeded`（`:96`）。两次运行中一次出现 1 个 timeout、一次出现 2 个（`persists workflow registry diagnostics after registry scan`、`keeps high-risk Zotero runtime API access behind compatibility helpers`），**表现为不稳定**。

判读与边界：
- 这是**实际执行**得到的失败，不是静态推断。
- 00102 的 9 个失败两次运行都出现，且失败方向一致（写入未被提交 / 被要求修复），指向 canonical mutation authority 的 `staging` 阶段校验 —— 即「prepared mutation 准备完成后、写入前重新校验时判定 basis 已变化」。这属于**已确认的测试失败**，但「产品代码有缺陷」还是「mock 与 authority 的语义在近期重构后不再对齐」**尚未区分**，列为待决（见 `findings.md` F-TEST-1）。
- 该分支（`research/e2e-historical-regressions`）与 `origin/main` 的 merge-base 是 `e210997a…`，HEAD 领先 428 个提交，最近提交为 `d75221a7 research(e2e-wayfinder): catalog historical cross-boundary regressions for issue #43`。`artifacts/e2e-wayfinder/historical-cross-boundary-regressions.md` 中**没有**提到本文件或这些断言，因此不能据此认定这是「已知的、有意保留的红状态」。
- 未进一步二分定位（`git bisect`/回退提交）——那会改变工作区状态，超出本次只读审计边界。

### V-3.3 workflow 域：未完成

`npx tsx scripts/run-node-test-shards.ts --domain workflow` 在本次会话内启动后未在可用时间内返回（28 个分片中最大的域之一：`workflow-engine` 20 + `workflow-host` 8 + `workflow-packages-*` 22 文件）。标记为 **pending**，不作为通过也不作为失败。命令与范围已在上表记录，可复现。

### V-3.4 未运行的 Node 域

其余 9 个 domain（acp / assistant / dashboard / host-bridge / runtime / skillrunner / synthesis / tooling / ui）本次**未运行**。原因：审计时间预算与「不把环境缺失等同于代码错误」的原则；这些域的正确性在本次审计中**没有动态证据**。

## V-4 未执行的检查及原因

| 检查 | 未执行原因 |
|---|---|
| `npm run build` | 其第一步 `build:help-docs` 会**写入** `addon/content/help-docs/`（仓库中标注为自动生成），会修改工作区业务文件。已改为直接运行其类型检查子步骤（V-1）。 |
| `npm run test:lite` / `test:full` / `test:zotero:*` | 需要真实 Zotero 二进制与 GUI/headless 宿主。`zotero-plugin.config.ts:24-33` 在无 `DISPLAY`/`WAYLAND_DISPLAY` 的 Linux 上会走 headless 分支；本机 `DISPLAY=:99`，具备运行条件，但该层会生成 XPI、启动宿主并产生 `.scaffold/test` 状态，属重副作用路径，本次未在未经用户确认的情况下运行。 |
| `npm run test:gate:pr` / `test:gate:release` | 包含 `synthesis-native-stage1`（会编译 Rust）与 Zotero 层，且为 fail-fast 串行，会长时间占用工作区构建目录；未运行。 |
| `npm run lint:check` | 会遍历整仓（含 `site/`、`docs/` 之外的全部文件）。属只读检查，但耗时较长，未在本次运行；因此本次**没有 lint 证据**。 |
| `cargo clippy` / `cargo fmt --check` | 未运行（仅运行了 `cargo test`）。 |
| `codegraph index` / `sync` | 指南禁止顺带重建索引；且重建耗时且会改写 `.codegraph/`。 |
| 任何 `npm install` / `update-deps` | 指南禁止安装或升级依赖。 |

## V-5 工具与只读检查记录

| 命令 | 结果 |
|---|---|
| `codegraph status` | Files 2,143 / Nodes 58,446 / Edges 214,434 / DB 589.51 MB；`✓ Index is up to date`；同时提示索引由旧版本引擎建立 |
| OpenViking `health` | `OpenViking is healthy (service initialized, storage: VikingFS)` |
| OpenViking `tree/read/find` | 项目 peer 空间仅 1 个既有记忆文件；项目资源目录尚不存在 |
| `git status --porcelain` | 仅 `?? artifacts/openviking_initialization_guide.md`（本任务输入） |
| `git submodule status` | 7 个子模块均处于记录的 commit（未初始化嵌套子模块） |
| `npx tsx scripts/run-node-test-shards.ts --list-shards` | 28 分片，见 V-3.1 |

## V-6 验证对工作区的实际影响

- 新增（全部位于本次审计目录 `artifacts/openviking-bootstrap/20260916T1450Z/`，均为未跟踪文件）：本目录下的报告、清单、日志、工具脚本。
- 被构建/测试写入的既有忽略目录：`rust/synthesis-sidecar/target/`（cargo 测试产物）、`/tmp/zotero-agents-node-test-shards-*`（runner 临时数据目录）。
- 受版本控制的业务文件：**零修改**（`git status --porcelain` 复查结果见 `REPORT.md` 收尾章节）。

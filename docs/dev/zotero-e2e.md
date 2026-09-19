# Zotero E2E 测试

E2E 测试复用现有 `zotero-plugin-scaffold`、Mock SkillRunner 和 Zotero 测试报告器。项目只有一个 System E2E runner：`npm run test:zotero:e2e` 通过 `scripts/run-zotero-test-with-mock.ts` 运行 `tests/zotero/e2e/full`。`npm run test:zotero:e2e:stress` 保留原入口。当前 CI 门禁不因 runner foundation 自动增加阻塞 lane。

## 测试层级

- Node 测试覆盖纯逻辑、契约和进程级 sidecar 路由。
- Zotero core/UI/workflow 测试覆盖宿主 API、页面交互与工作流集成。
- `tests/zotero/e2e/full` 覆盖完整插件构建、本地 Rust sidecar、真实 Host reverse-RPC 与跨页面业务流程。
- `npm run test:zotero:e2e:stress` 专门重复 Citation Graph 打开、关闭和重开，默认 100 轮。

E2E 构建会把当前源码编译出的 Synthesis sidecar 放入测试插件，不使用仓库中既有的发布二进制。

## Suite Baseline 与 family 生命周期

默认运行使用 `tests/fixtures/zotero-e2e/committed-seed-v1` 的 Committed Seed。当前 active identity 是 `system-e2e-seed.v2` / `foundation-v1` / revision `2`。`test:init` 在 Zotero 启动前校验 active registry、三字段 identity（`schemaVersion`、`fixtureId`、`fixtureRevision`）、portable 数据与隐私边界，然后把 seed materialize 到新测试 data 目录。同一 invocation 只创建一次 Suite Baseline；family 串行共享该 profile，不在 family 之间重置。

每个 Scenario Family 声明 namespace、Owned State、可选 Carry-over Set 和 cleanup。普通断言失败后仍执行该 family 的 cleanup 与 Suite Health Gate；baseline、runner/transport、restart、cleanup 或 health gate 失败，以及无法判断 cleanup/health 的情况，都会 fail-closed 地终止后续 family。Health Gate 在初始化后及每个 family 后检查 Zotero/插件响应、当前源码 sidecar ready、无未声明 operation/process、Owned State 已清理。

outer runner 在 `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json` 写入 sanitized Run Manifest。浏览器 reporter 仍把事件发送给 scaffold，同时把同一结构化事件镜像到 loopback sink；manifest 不解析日志文本。终态为 `complete`、`aborted` 或 `incomplete`，缺少 public、typed、lifecycle、cleanup 或 health evidence 时不从日志推断通过。可发布诊断只保存 workspace-relative reference；敏感或 private-format artifact 只记稳定的 `withheld` reason code。

## Phase 1 catalog

`tests/zotero/e2e/full/302-sidecar-recovery.zotero.test.ts` 通过以下生产入口运行十五个 Phase 1 case：

| Owner | Cases | Public entrypoint and evidence |
| --- | --- | --- |
| `SL` | `SL-01`–`SL-03` | plugin lifecycle、`system.shutdown`、discovery 与进程身份 |
| `RH` | `RH-01`–`RH-02` | public Reference refresh、typed basis outcome 与 ready state |
| `PA` | `PA-01`–`PA-02` | public Workbench Topic/Index projection 与 bounded diagnostic |
| `PM` | `PM-01`–`PM-04` | public maintenance submit/get/continue/retry/cancel 与 durable receipt |
| `CG` | `CG-01` | public Citation Graph view/rebuild 与 typed `basis_mismatch` |
| `HB` | `HB-01`–`HB-03` | Host Bridge CLI mutation、`mutation get-operation` 与 note projection |

sidecar 提供 `reference-after-first-page` 和 `maintenance-after-admission` 两个 test-private checkpoint。`HB-03` 另在 canonical mutation durable admission 后使用一次性、operation-scoped hold；outer runner 命中 hold 后终止准确的 Zotero PID，复制当前 scaffold profile/data，并在同一 invocation 内重启该 case。所有 checkpoint 默认不 armed、等待有界并在使用后清理，不属于 capability、DTO、CLI 或 MCP surface。checkpoint marker 和内部调用顺序不作为通过证据；恢复后只断言 public canonical mutation evidence、note projection、cleanup 与 Suite Health Gate。

这些 seam 跟随 System E2E 运行本身，而不是构建模式：`scripts/run-zotero-test-with-mock.ts` 已知 event sink 地址时会把它写进 scaffold 的 `test.prefs`，于是 `extensions.zotero-agents.test.systemE2EEventUrl` 在 Zotero 启动前就存在于 profile 里，插件在启动时即可判定「这是一次 System E2E 运行」并让 sidecar 暴露 test-private checkpoint。runner page 之后设置同一 pref 只是重复确认。这样 debug 构建、`main` 构建和 tag 上的 release 候选物跑同一份 catalog 时行为一致，校准证据才与阻塞 lane 的身份一致；不要把这些 seam 重新绑回 debug/构建模式。

运行全部 catalog、单个 family，或指定精确宿主：

```bash
npm run test:zotero:e2e
ZOTERO_SYSTEM_E2E_FAMILIES=HB npm run test:zotero:e2e
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/absolute/path/to/zotero npm run test:zotero:e2e
```

每次 invocation 的最终证据位于 `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json`。完整运行应包含十五个 catalog case（另有 `runner-foundation-01`），且 `terminalState` 为 `complete`；manifest 中的 `zoteroVersion`、platform、fixture identity、family lifecycle、cleanup 与 health 字段用于判断该证据适用的宿主和范围。

兼容矩阵 cell 的 receipt 引用 `diagnostics/` 下的 `runner.stdout.log`、`runner.stderr.log` 与 `host-facts.json`，并在运行布局被清理前落盘 `sidecar-runtime-evidence.json`。该文件记录已安装 bundle 的 target、bundleId、buildFingerprint 和缺失文件数，逐 session 记录 discovery `lifecycleState`、bundleId 是否与安装件一致、是否记录进程，以及 runtime log 的存在与大小；log 不超过 512 KiB 时另存 `runtime-logs.json`。它用于判断 cell 是否装上 sidecar、是否产生 ready session，不复制 bundle、session token 或绝对路径。cell worker 在 manifest 首次落盘时就发布 Run Manifest reference，被超时终止的 cell 因此仍能把 receipt 绑定到自己的 manifest 与日志，而不是退化成 `run_manifest_reference_missing`。

## LiSongTao 金例

金例只提交去标识化结构契约：`tests/fixtures/zotero-e2e/lisongtao-v1.json`。标题、作者、路径和正文不会进入仓库。运行时把指定库与 profile 复制到 `.scaffold/test`，不会修改来源目录；副本中的 machine-bound canonical identity、sidecar executable/runtime 与旧日志会被清除并由测试实例重建。

运行前关闭使用该库的 Zotero 进程，保证 SQLite、WAL 和附件快照一致。PowerShell 示例：

```powershell
$env:ZOTERO_E2E_GOLD_DATA_DIR = "<Zotero data directory>"
$env:ZOTERO_E2E_GOLD_PROFILE_DIR = "<Zotero profile directory>"
npm run test:zotero:e2e
```

刷新与 Citation Graph 压测：

```powershell
$env:ZOTERO_E2E_GOLD_DATA_DIR = "<Zotero data directory>"
$env:ZOTERO_E2E_GOLD_PROFILE_DIR = "<Zotero profile directory>"
npm run test:zotero:e2e:stress
```

`ZOTERO_SYNTHESIS_CLOSE_CYCLES` 可覆盖压测轮数。设置金例 data/profile 目录会选择 Private Gold Source；也可用 `ZOTERO_E2E_FIXTURE=gold` 显式选择，缺少 data source 时 invocation 直接失败。未选择 gold 时使用 Committed Seed。

### Windows Citation Graph close (`CG-02`)

`CG-02` 复用同一个 runner 和 `276-dashboard-synthesis-close.zotero.test.ts`，但使用独立 catalog 命令。它在临时库创建最小合成 Reference，经过公开 Graph 重建，从 Workspace 打开 Citation Graph，默认执行 30 次关闭/重开，并在最后一次关闭后等待 20 秒检查宿主与数据库。普通 `test:zotero:e2e:stress` 仍是独立的 100 轮 adjunct stress，不计入 catalog completion。

```powershell
$env:ZOTERO_PLUGIN_ZOTERO_BIN_PATH = "D:\Workspace\Artifact\Zotero-Skills\zotero-hosts\windows-x64\10.0.2\Zotero_win-x64\zotero.exe"
npm run test:zotero:e2e:cg-02
```

Zotero 9 分类使用同一命令，只替换为 `windows-x64\9.0.6` 的安装树。2026-09-18 的实际 30 轮运行分类为 `unaffected`；不得从 Zotero 10 推断该结论。同日 Windows Zotero 10.0.1 和 10.0.2 的 30 轮运行也均完成，未复现已报告的 host exit；这份 green 证据不能代替尚缺的 red 复现与根因诊断。每次运行在 `artifacts/test-diagnostics/system-e2e/<runId>/` 写入 `run-manifest.json` 与 sanitized `synthesis-close-lifecycle.json`。`CG-02` 归属 Citation Graph application；缺少可信 Windows 证据时，Windows release E2E cell 不得 promotion。

金例 refresh 覆盖真实库规模和附件扫描；超过旧 10 秒边界的确定性回归由 production-client 进程测试提供。Citation Graph 压测在最后一次关闭后额外静默等待 20 秒，并再次检查主窗口和数据库，覆盖延迟崩溃窗口。

## 诊断产物

debug 构建会持续写入 `runtime/logs/citation-graph-crash-journal.json`。日志只保存生命周期阶段、布尔资源状态和计数；异常退出后的 active session 会在下次启动标记为 `interrupted`。压测结束时还会把日志复制到 `artifacts/test-diagnostics/citation-graph-crash-journal.json`。

`scripts/run-zotero-test-with-mock.ts` 会把 Zotero 的 stderr 重定向到 `.scaffold/zotero-stderr.log`：测试脚手架的 `spawn(path, args, { env })` 只给 stdout 挂了 reader，从不读取 Zotero 的 stderr 管道，因此一旦 stderr 突发超过 socket 缓冲（Zotero 9/10 Linux 上 GTK 图标断言会一次写出上百 KB），Zotero 主线程就会阻塞在 `write(2)` 上，JS 定时器全部停止，整轮运行只能被外部超时杀掉。测试入口据此生成 `.scaffold/zotero-stderr-drain.sh`，把对应二进制换成 `exec <real> "$@" 2>>'<log>'`；Windows 上无法用脚本 shim，保持原路径。调整 Zotero 启动方式时不要绕过这个 shim。

生产构建通过 release-elision 门禁替换整个监听模块；Host 与 Synthesis 页面 bundle 均不包含 schema、消息名、文件名或持久化实现。

新增 E2E 用例时只断言用户可观察的终态、持久化结果和宿主存活性。不要断言内部调用顺序，也不要直接对金例来源目录执行写入。

## 兼容性矩阵、校准与晋级

兼容性矩阵仍由 `tests/zotero/compatibility-matrix.json` 和 `scripts/zotero-compatibility-fixture.ts` 统一规划。System E2E 不另建 runner；workflow 先构建一次插件，再按 runner 平台准备当前源码 sidecar。每个 cell 在运行前后核对插件摘要、sidecar fingerprint、lane、commit/ref 和 sidecar target，cell 内禁用重新构建。

固定 cell 如下：

| Lane | Cell identity | Families | 初始状态 |
| --- | --- | --- | --- |
| PR | `pull-request-zotero-10-linux-x64-e2e-sl-pm` | `SL/PM` | non-blocking |
| main | `main-zotero-{7,9,10}-linux-x64-e2e-sl-rh-pa-pm-cg-hb` | 全部六组 | 各自 non-blocking |
| release | `release-zotero-{7,9,10}-{linux,windows}-x64-e2e-sl-rh-pa-pm-cg-hb` | 全部六组 | 各自 non-blocking |
| weekly | 与 release 相同的六个目标，前缀为 `weekly-` | 全部六组 | non-gating |
| stress | `stress-zotero-10-linux-x64-e2e` | 既有 close-stress 场景 | non-gating |
| manual gold | `manual-gold-zotero-10-linux-x64-e2e-rh-pa-pm-cg` | `RH/PA/PM/CG` | non-gating |

查看规划或在本机运行单个 cell：

```bash
npm run test:zotero:compatibility:plan -- --gate main --json

ZOTERO_COMPAT_LANE=main npm run test:zotero:compatibility:prepare -- \
  --build-root="$PWD/.scaffold/build"

ZOTERO_COMPAT_LANE=main \
ZOTERO_COMPAT_FAMILIES=SL,RH,PA,PM,CG,HB \
npm run test:zotero:compatibility:run -- \
  --target=zotero-10-linux-x64 \
  --mode=behavior --suite=full --domain=e2e \
  --build-root="$PWD/.scaffold/build"
```

PR 与 main 由 `.github/workflows/ci.yml` 的 `CI` workflow 执行。tag 发布由 `.github/workflows/release.yml` 的 `Release` workflow 执行：先生成唯一 `release-candidate`，再为 Linux/Windows 准备 sidecar 并完成 release compatibility jobs，最后 `create-release` 下载同一候选物发布；`npm run release` 只校验 XPI，不重新构建。main 证据不能替代 tag-bound release 证据。

scheduled 与手工证据由 `.github/workflows/system-e2e-evidence.yml` 的 `System E2E Evidence` workflow 执行。周日 cron 是 weekly，周三 cron 是 stress；`workflow_dispatch` 可显式选择 `weekly`、`stress` 或 `manual-gold`。manual-gold 从 repository variables `ZOTERO_E2E_GOLD_DATA_DIR` 与 `ZOTERO_E2E_GOLD_PROFILE_DIR` 读取 runner 上的只读来源，未配置或路径无效时该 invocation 必须失败。它们都不提供 release authority。

新 workflow 尚未进入默认分支时，用 `e2e-calibration-pr-*`、`e2e-calibration-main-*`、`e2e-calibration-release-*` tag 从该 tag 指向的提交启动非发布校准。每个 lane 创建三枚唯一 tag，分别保留三个独立 workflow run；每次 push 最多包含三枚 tag（建议同一轮各推 PR/main/release 一枚），超过三枚时 GitHub 不创建 tag push workflow run。workflow 只选 planner 中的 E2E cells，release 校准包含 Linux/Windows，但不调用 `npm run release`，也不产生发布 authority。

每个 prospective blocking cell 需要三个独立 workflow run 的完整、干净 manifest。三轮必须具有相同的 Zotero target/version、runner OS/image、family grouping、fixture scale、sidecar startup model 和 invocation/profile model，并使用不同 workflow run、run ID 与 profile identity。`complete` 终态、所有 family 通过、cleanup/health 通过、无残留 process/port/lock 缺一不可。普通源码 commit、插件摘要、sidecar fingerprint 或 fixture revision 的变化本身不清零校准 identity。

分组只看三轮中最大的干净耗时；候选阈值依次为 PR 15 分钟、main 30 分钟、release 45 分钟、weekly/stress 60 分钟、manual-gold 90 分钟。这些值不写入产品 timeout。超过阈值时先拆为 `SL/RH/PA/PM/CG` 与 `HB`，仍超限才拆为 `SL/PM`、`RH/PA/CG`、`HB`，不得拆开 family。

晋级是对 `E2E_PROMOTION_STATE` 中单个 cell 的显式代码修改；没有自动晋级，也不要求无关 cell 同时晋级。评审 PR 应列出三份 workflow artifact 中的 compatibility receipt、Run Manifest reference、最大耗时和校准 identity。Windows release cell 还必须有可信且通过的 `CG-02` 证据，以及实际运行得到的 Zotero 9 分类；条件不全就保持 `false`。

只有 weekly 允许自动诊断重跑。第一次非通过后，`weekly-run` 以新 profile、新 run ID 和 `predecessorRunId` 完整重跑该 cell 一次，两份 manifest 分开保留；后继通过记为 `intermittent`，再次失败记为 `persistent`，两种情况 workflow 都保留第一次失败。PR、main、release、stress 和 manual-gold 不自动重跑。

## 首启行为与外部浏览器

Zotero 每次在“新 profile 的首次启动”都会打开 `https://www.zotero.org/start`，而且不是开在 Zotero 内部：`ZoteroPane` 的 `loadURI` 对普通 http(s) URL 直接调用 `Zotero.launchURL()`，也就是丢给系统默认浏览器，表现成一枚新标签页。开关是 `extensions.zotero.firstRun2`——启动时为真才打开，随后 Zotero 自己把它置回 false。测试每轮都从新 profile 起步，所以这条路径每次都会命中。

`zotero-plugin.config.ts` 的 `ZOTERO_TEST_FIRST_RUN_PREFS` 把 `firstRun2`、`firstRunGuidance`、`firstRunGuidanceShown.readAloud` 固定为 false，并由 `test.prefs` 注入到测试 profile；本地启动路径（`npm run start` / `start:direct`）用的是 `.env` 指定的开发 profile，不受这套注入影响。

项目级 scenario catalog、risk、ownership label、regression admission、quarantine 与 promotion 规则以 OpenSpec 的 `system-e2e-strategy` 为语义事实源；目录成员关系仍是执行事实源。五个实现 change 严格串行。`300-lisongtao-gold.zotero.test.ts` 与 `276-dashboard-synthesis-close.zotero.test.ts` 保持原位置和命令，相似性本身不会把它们改标为 catalog case。

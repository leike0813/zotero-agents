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

运行全部 catalog、单个 case，或指定精确宿主：

```bash
npm run test:zotero:e2e
npm run test:zotero:e2e -- --grep HB-03
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/absolute/path/to/zotero npm run test:zotero:e2e
```

每次 invocation 的最终证据位于 `artifacts/test-diagnostics/system-e2e/<runId>/run-manifest.json`。完整运行应包含十五个 catalog case（另有 `runner-foundation-01`），且 `terminalState` 为 `complete`；manifest 中的 `zoteroVersion`、platform、fixture identity、family lifecycle、cleanup 与 health 字段用于判断该证据适用的宿主和范围。

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

生产构建通过 release-elision 门禁替换整个监听模块；Host 与 Synthesis 页面 bundle 均不包含 schema、消息名、文件名或持久化实现。

新增 E2E 用例时只断言用户可观察的终态、持久化结果和宿主存活性。不要断言内部调用顺序，也不要直接对金例来源目录执行写入。

## 首启行为与外部浏览器

Zotero 每次在“新 profile 的首次启动”都会打开 `https://www.zotero.org/start`，而且不是开在 Zotero 内部：`ZoteroPane` 的 `loadURI` 对普通 http(s) URL 直接调用 `Zotero.launchURL()`，也就是丢给系统默认浏览器，表现成一枚新标签页。开关是 `extensions.zotero.firstRun2`——启动时为真才打开，随后 Zotero 自己把它置回 false。测试每轮都从新 profile 起步，所以这条路径每次都会命中。

`zotero-plugin.config.ts` 的 `ZOTERO_TEST_FIRST_RUN_PREFS` 把 `firstRun2`、`firstRunGuidance`、`firstRunGuidanceShown.readAloud` 固定为 false，并由 `test.prefs` 注入到测试 profile；本地启动路径（`npm run start` / `start:direct`）用的是 `.env` 指定的开发 profile，不受这套注入影响。

项目级 scenario catalog、risk、ownership label、regression admission、quarantine 与 promotion 规则以 OpenSpec 的 `system-e2e-strategy` 为语义事实源；目录成员关系仍是执行事实源。五个实现 change 严格串行。`300-lisongtao-gold.zotero.test.ts` 与 `276-dashboard-synthesis-close.zotero.test.ts` 保持原位置和命令，相似性本身不会把它们改标为 catalog case。

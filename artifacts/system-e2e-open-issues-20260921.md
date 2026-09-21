# System E2E 未决问题清单（2026-09-21）

本文件记录 Change 04 收尾期间（Windows release cell 晋级 + task 6.4 weekly/stress/manual-gold 实测）暴露或确认、但**尚未解决**的问题。它不是已完成工作的总结，而是"下一个接手的人必须知道"的清单。

**判读约定**

- 每条都写明证据出处（commit / run id / `file:line`），便于复核。
- 「缺口」指**没有取得证据**，不等于通过。不要把它读成已完成。
- 快照时间：2026-09-21，`dev` HEAD `cfc297f2`。本文件同时充当**交接件**：Change 04 的 task 6.4 仍未勾选，最后的 large-gold 一轮要在另一台能访问私有只读库的主机上收尾，具体步骤见文末「交接」。

**问题按"会不会咬人"排序**

| # | 问题 | 严重度 | 能否自行推进 |
| --- | --- | --- | --- |
| 1 | Windows release 门禁从未真实执行过 | 高 | 否，需下一次正式发布 |
| 2 | 两个 cron 从未触发，也不会触发 | 高 | 否，需 workflow 进入默认分支 |
| 3 | 真实 large-gold 一轮未跑（weekly 重跑缺口已补） | 中 | 是，需有金例的主机 |
| 4 | Zotero 9 分类取值未对齐且判定放宽、且未接线 | 中 | 是 |
| 5 | `Verify Synthesis Sidecar` 长期红（已解决 2026-09-21） | 中 | 是 |
| 6 | Windows 用例覆盖比 Linux 窄 | 低 | 是，但属产品范围决策 |

---

## 1. Windows release 门禁从未真实执行过

**现象**：三个 Windows release cell 已在 `875c2f2a` 晋级为阻塞（`scripts/zotero-compatibility-fixture.ts` 的 `E2E_PROMOTION_STATE`），`plan --gate release` 现在把 6 个 E2E cell 全部标为 `blocking: true`。它们失败就会阻断发布。但这三格**从没在真实门禁里跑过一次**。

**为什么无法提前验证**：

- `release.yml` 只由 `v**` tag 触发（`on: push: tags: v**`），且流程末端就是 `create-release`，没有演习模式。
- `ci.yml` 的 `zotero-compatibility-e2e-blocking` 是唯一可手工触发（`workflow_dispatch`，输入仅 `pull-request` / `main`）的阻塞 E2E lane，但它下载的是 `compatibility-e2e-linux-x64`，承载不了 Windows cell。
- 设计上也不允许替代：main 证据不得替代 tag-bound release 证据。

**接线本身已静态核对过**（`release.yml`）：`release-e2e-candidate` 的矩阵含 `windows-x64 / windows-2025`，`release-compatibility-e2e-blocking` 下载 `release-e2e-${{ matrix.platform }}` 并 `runs-on: ${{ matrix.runner }}`，env 取 planner 的 `families` / `fixtureScale` / `blocking`；`create-release` 要求该 lane `success` 或 `skipped`，而六个 cell 全晋级后已不存在 `skipped`。也就是说接线成立，未验证的是**端到端行为**。

**已知的形态差异**：晋级所依据的 `CG-02` 证据是 debug 形态（生产构建按 release-elision 治理剪除 `citationGraphCrashJournal` 诊断组，见 `scripts/runtime-diagnostics-esbuild.ts` 与 `tests/runtime/97`）。该差异已被评审显式接受，但"debug 形态通过"不等于"release 形态稳定"。

**更根本的一条**：当初触发 `CG-02` 的那次**被报告的 Windows host exit 至今未复现，也没有根因**。`docs/dev/zotero-e2e.md:82` 自己写明 green 证据不能代替尚缺的 red 复现与根因诊断。我们建的是护栏，不是解药。

**下一步**：下一个 `v**` 发布时逐格读 `release-compatibility-*` artifact 的 receipt / manifest / cleanup，确认三格真的执行且通过。

**recheck_when**：任何一次 tag 发布；`E2E_PROMOTION_STATE` 变更；`release.yml` 的 promoted lane 或候选物命名变更。

---

## 2. 两个 cron 从未触发，也不会触发

**现象**：`system-e2e-evidence.yml` 声明了周日 weekly、周三 stress 两条 `schedule`，但**一次都没跑过**。2026-09-21 之前该 workflow 的全部 run 都是 tag push 触发。

**原因**：GitHub 的 scheduled workflow 只在**默认分支**上生效。本仓库默认分支是 `main`，而该 workflow 只存在于 `dev`（API 核对：`contents/.github/workflows/system-e2e-evidence.yml?ref=main` → 404，`?ref=dev` → 200）。

**已澄清的一点**：`workflow_dispatch` **不**受这条限制——`POST .../actions/workflows/361368546/dispatches` 返回 `204` 并成功起 run（本次以 weekly / stress / manual-gold / cg-02-windows 四种输入实测）。`docs/dev/zotero-e2e.md` 里"进入默认分支前 dispatch 不可用"的旧说法已修正。

**下一步**：若要让 cron 活起来，需把该 workflow 送进 `main`（新开 PR 或合并）；这属于默认分支与发布线操作，需显式授权。在它进入默认分支前，"每周自动跑一轮"这个能力是**不存在**的，只有手工分派。

**recheck_when**：`system-e2e-evidence.yml` 出现在 `origin/main`；任一 `schedule` 事件 run 出现。

---

## 3. 真实 large-gold 一轮未跑（weekly 重跑缺口已补）

**已补：weekly「首次失败保留」现在有实活证据（不再是缺口）。**
weekly 是唯一允许自动诊断重跑的 lane（`weekly-run`，见 `system-e2e-evidence.yml` 的 `Run evidence cell` 步骤），只在出现非通过后重跑，而 2026-09-21 的 weekly 轮（run `35557736134`）六格全绿。改用**输入注入**走真实 CLI 取得了证据——把 `--build-root` 指向空目录：

```bash
npx tsx scripts/run-zotero-compatibility-matrix.ts weekly-run \
  --gate weekly --target zotero-10-linux-x64 --mode behavior --suite full --domain e2e \
  --families SL,RH,PA,PM,CG,HB --cache-root /tmp/wr-cache --runs-root /tmp/wr-runs \
  --build-root /tmp/wr-nobuild      # 空目录
```

两次尝试都在 `plugin_artifact_unavailable` 失败，产出：两个独立 run 目录（`zotero-10-linux-x64-a921aafd`、`zotero-10-linux-x64-a87a3d7f`）各带一份 receipt 且**各自保留**；`weekly-rerun-zotero-10-linux-x64.json` 读出 `attempts: 2`、`classification: persistent`、`workflowPassed: false`；退出码 1。失败注入在**输入**而非产品，而重跑策略依 verdict 分支、与失败原因无关，所以走的是产品失败时会走的同一条分支。

**仍未证到的一处**：`predecessorRunId` 在继任者 run manifest 里的那条链接。该次尝试死在 manifest 生成之前，所以这条仍是代码（`run-zotero-compatibility-matrix.ts` 为第二次尝试设 `ZOTERO_E2E_PREDECESSOR_RUN_ID`）+ 单测覆盖，没有实活观察。要实活观察它，需要一次**走到 runner** 的失败尝试。

**缺口：没有跑过一次真实的 large-gold。**
`manual-gold` 需要 runner 上能访问私有只读库（repository variables `ZOTERO_E2E_GOLD_DATA_DIR` / `ZOTERO_E2E_GOLD_PROFILE_DIR`，当前均未配置）。run `35557763993` 验证的是**未配置时的失败路径**：`Error: ZOTERO_E2E_GOLD_DATA_DIR is required for a gold run`，抛在 `stageZoteroE2EFixture`（`zotero-plugin.config.ts`），Zotero 尚未启动。这符合文档要求（未配置或路径无效时该 invocation 必须失败），但"真实跑通一次"仍未取得。本机（`dev` 工作区）没有可用金例：`non-existing-zotero-data/` 只是 96 KB 的合成插件状态目录，不是真实库。

**附带观察**：该失败轮的错误列表里除 `test_failed` 还出现 `host_facts_missing`。在 fixture staging 阶段就终止的 invocation 本就没有 host facts 可报，这个 code 属噪声，不是第二个缺陷；如果将来要让错误列表更准确，可在 staging 失败时跳过该判定。

**recheck_when**：有金例的主机跑完一轮 gold；`weekly-run` 实现变更；`predecessorRunId` 链路变更。

---

## 4. Zotero 9 分类：取值未对齐、判定放宽、且未接线

**现象**：Windows release cell 的晋级条件之一是"实际运行得到的 Zotero 9 分类"。当前该结论记为 `unaffected`（`docs/dev/zotero-e2e.md:82`，来自 2026-09-18 的 30 轮 debug 形态运行）。但它实际上只是一条**散文记录**，而且三处语义互不一致。

**（a）取值未对齐——同一个事实有三个名字。**
规格写 `affected | unaffected | unverified`（`openspec/specs/system-e2e-strategy/spec.md:513`："Zotero 9 is classified only from an actual run as affected, unaffected, or unverified"），文档沿用 `unaffected`，而代码是

```ts
// scripts/system-e2e/calibration.ts:161
zotero9Classification: "passed" | "affected" | "unverified";
```

也就是说 `unaffected`（规格/文档）与 `passed`（代码）指同一件事，但词汇表不重叠。任何按规格词表检索或在代码里断言 `unaffected` 的人都会落空。

**（b）判定放宽——`affected` 与 `passed` 在门禁上等价。**

```ts
// scripts/system-e2e/calibration.ts:171-177
const evidence = args.windowsEvidence;
if (!evidence || evidence.cg02 !== "passed" || !evidence.trustworthy) {
  return { allowed: false, blocking: false, reason: "cg02" };
}
if (evidence.zotero9Classification === "unverified") {
  return { allowed: false, blocking: false, reason: "zotero9" };
}
```

只有 `unverified` 被拦。于是"Zotero 9 上真的复现了那次 host exit"（`affected`）与"未复现"（`passed`）**一样允许晋级**。两种解读都说得通——"门禁只要求分类来自真实运行，结论交人工评审" vs "`affected` 本应阻断"——但规格没有写明是哪一种，代码里也没有注释说明。若属后者，这是一个**静默放宽的阻塞条件**：三个 Windows release cell 现在真实阻断发布，而它们的晋级依据里的这一项允许"受影响"通过。

**（c）未接线——判定函数没有生产调用方。**

```bash
grep -rn "evaluateE2EPromotion\|windowsEvidence" --include=*.ts . | grep -v node_modules
# → 只有 scripts/system-e2e/calibration.ts 的定义与 tests/zotero-host/131 的两处调用
```

真正生效的是人工编辑 `E2E_PROMOTION_STATE`（`scripts/zotero-compatibility-fixture.ts:105-116`）。因此"Zotero 9 分类"靠评审流程保证，机器不强制；分类本身也**没有机器可读的落点**，只存在于 `docs/dev/zotero-e2e.md` 的散文里。

**影响**：这一项是被明文写进晋级前置条件的（`tasks.md` 6.3、`docs/dev/zotero-e2e.md:155`），却既无机器校验、词汇又与规格不符、且判定方向未定义。评审时容易被当成"已经满足"而跳过。

**下一步（三个独立决定，可以分开做）**：

1. **对齐取值**：二选一——把代码改成规格的三个词（`affected | unaffected | unverified`），或把规格与文档改成代码的词（`passed`）。前者更贴"分类"语义。
2. **明确 `affected` 的判定**：晋级允许还是阻断？若允许，在 `calibration.ts` 与规格里写清理由；若阻断，补一条回归断言（`affected` → `allowed: false`）。
3. **决定是否接线**：要么让 planner 真正消费 `windowsEvidence`（需要一处机器可读的分类记录），要么在规格与文档里明写"本项靠人工评审，不由代码强制"。

**验证命令**：

```bash
npx tsx node_modules/mocha/bin/mocha tests/zotero-host/131-zotero-compatibility-fixture.test.ts \
  --require tests/setup/zotero-mock.ts        # 现有两处 windowsEvidence 断言的实况
grep -n "zotero9Classification" scripts/system-e2e/calibration.ts
```

**recheck_when**：`calibration.ts` 的 `windowsEvidence` 类型或判定变更；`system-e2e-strategy` 的 CG-02 scenario 改写；出现第一个生产调用方；Zotero 9 分类被重新记录。

---

## 5. `Verify Synthesis Sidecar` 长期红

**现象**：`Verify Synthesis Sidecar` workflow 自 r13（2026-09-20）起持续失败，与 System E2E 校准无关，因此一直被绕过。三个 job 里 linux 的 `Format and lint` 与 windows 的 `Run complete Rust workspace` 红，macos 绿。

**三条红已全部定位**：

- **rustfmt**（linux）：`crates/synthesis-sidecar/src/runtime_production_ports.rs` 格式问题，已由 `29be5409` 修复。
- **clippy**（linux）：`crates/synthesis-application/src/reference_refresh.rs:895` 的 `collapsible_if` 被 `-D warnings` 升级为错误——一个 let-chain 里额外套了一层只做单一比较的 `if`。属代码质量问题，不是环境噪声。
- **windows 测试**：`crates/synthesis-repository/src/lib.rs` 的 `registered_v5_migration_rekeys_all_current_topic_path_fields` 在拆除 fixture 时失败：

  ```
  panicked at crates\synthesis-test-support\src\lib.rs:72:17:
  remove test root C:\...\zotero-agents-synthesis-r7-repository-production-schema-v6-...-55:
  The process cannot access the file because it is being used by another process. (os error 32)
  ```

  根因有两层。**第一层**：该用例在还握着重新打开的 SQLite `Connection` 时就调用 `fs::remove_dir_all(root)`，而 SQLite 打开数据库文件时不含 `FILE_SHARE_DELETE`，Windows 因此回 `ERROR_SHARING_VIOLATION`（os error 32）。**第二层**（让现象更难读）：`root` 是按值传进 `fs::remove_dir_all` 的，于是 `TestRoot` 在该调用内部就被 drop，`Drop` 里的二次删除再次失败并 panic，抢在用例自己的 `.expect("cleanup")` 之前爆发——所以报错点落在 `test-support/src/lib.rs:72`，而不是断言行。稳定性方面两次独立 run（`35498580817`、`35497129932`）失败的都是同一个用例、同一位置，说明这是确定性缺陷而非偶发抖动。

**已解决（2026-09-21，`a2df51bb`）**：clippy 那处把多余的嵌套 `if` 并进 let-chain；该用例先 `drop(connection)` 再清理（与文件里其余 fixture 用例的写法一致）。本机验证：`cargo fmt --all --check`、`cargo clippy … -D warnings`、`cargo test --workspace --locked --no-fail-fast` 全绿（33 个 target，最大 111 passed）。**windows 那一半只能由 workflow 自己确认**——POSIX 允许 unlink 已打开的文件，本机复现不了。

确认轮：`Verify Synthesis Sidecar` run `35560126040`（`a2df51bb`）四个 job——linux / windows / macos / receipt——**全部 success，无失败步骤**。本条关闭，保留在清单里仅作记录。

**影响**：它不阻断 System E2E 校准，也不阻断发布主线，但持续红会让"CI 全绿"这个信号失真——尤其对一个已经有多条非阻塞 lane 的仓库。

**recheck_when**：`synthesis-repository` 的 fixture 拆除写法变更；`rust/synthesis-sidecar` 的 clippy / 测试入口变更。

---

## 6. Windows 用例覆盖比 Linux 窄

**现象**：兼容性矩阵的 release / weekly cell 名字都写着六组全家（`sl-rh-pa-pm-cg-hb`），但在 Windows 上实际有六个用例是 `pending`：`SL-01`、`SL-02`、`SL-03`、`PM-02`、`PM-03`、`HB-03`。

**证据**：weekly 的 Windows 格（run `35557736134`，`system-e2e-weekly-weekly-zotero-10-windows-x64-e2e-sl-rh-pa-pm-cg-hb`）stdout 逐个打印这三种状态；其 manifest 记 10 条 family 记录（`runner-foundation-01` + 9 个用例），Linux 格记 16 条（+ 15 个用例）。

**一处历史误读已纠正**：早先记录写作"manifest 只记 10 个 case 而 runner 报 11 个结果，所以少一条记录"。实际那个额外的 `it` 是 `Synthesis E2E gold library`（非 catalog 用例，本就不产 family 记录），**没有丢失记录**。差异全部来自上面这六个 `pending`。该纠正已写入 `openspec/changes/04-wire-and-calibrate-phase1-system-e2e-ci/tasks.md` 的 6.3。

**下一步（需决策）**：要么补齐这六个用例在 Windows 上的实现，要么把 cell 的 family 声明收窄到 Windows 真实覆盖的范围，让名字不再高估覆盖面。属产品范围决策，不擅自改。

**recheck_when**：`tests/zotero/e2e/full` 与 `tests/zotero/ui/full` 的用例平台条件变更；planner 的 family 分组变更。

---

## 附：本清单未包含的内容

- Change 04 已完成部分（Linux 七格晋级、Windows 三格晋级、CG-02 debug lane 转绿、三轮记录）见 `openspec/changes/04-wire-and-calibrate-phase1-system-e2e-ci/tasks.md`。
- 已归档的根因诊断见 `openspec/changes/archive/2026-09-20-diagnose-windows-synthesis-sidecar-launch-failure/` 与 `...-shorten-windows-sidecar-session-paths/`。
- 运行命令与 lane 表见 `docs/dev/zotero-e2e.md`。

---

## 交接：在有金例的主机上收尾 Change 04 的 6.4

Change 04 现在是 **23/24** 勾选，唯一未勾的是 6.4，卡在"真实 large-gold 一轮"。`npx openspec validate 04-wire-and-calibrate-phase1-system-e2e-ci --strict` 通过，但**任务未全勾时不得归档**。

**前置**：一台能读取私有金例库的主机（`dev` 分支，HEAD ≥ `cfc297f2`），并拿到两个只读来源目录：库数据目录与 profile 目录。把它们当作只读源——runner 会把它们复制进 `.scaffold/test`，**不得原地写入**。

**第 1 步：跑真实 gold 调用（本机或该主机）**

```bash
cd <repo>            # dev 分支
ZOTERO_E2E_GOLD_DATA_DIR="<只读库数据目录>" \
ZOTERO_E2E_GOLD_PROFILE_DIR="<只读 profile 目录>" \
ZOTERO_E2E_FIXTURE=gold \
npm run test:zotero:e2e          # 需要时用 ZOTERO_SYNTHESIS_CLOSE_CYCLES 调轮数
```

`ZOTERO_E2E_GOLD_DATA_DIR` / `ZOTERO_E2E_GOLD_PROFILE_DIR` 与 CI 用的 repository variables 同名；CI 侧的 manual-gold lane 走 `plan --gate manual-gold`，本机这一步走的是同一条 `stageZoteroE2EFixture` 判定，所以它能证明"有来源时 gold invocation 跑得通"，但不能替代 CI 触发证据。

**第 2 步：把结果写进两处**

- `openspec/changes/04-.../tasks.md` 的 6.4：把命令、退出码、通过/失败的用例数、生成的 `artifacts/test-diagnostics/system-e2e/<runId>/` 内容写进现有 bullet 结构里，然后把 `[ ]` 改成 `[x]`。**只有真实跑通才改**。
- 本文件：把第 3 条改成已解决，附上运行环境与命令。

**第 3 步（可选，若想顺手补上第 3 条里那处未证的链接）**

让一次**走到 runner**的尝试失败（例如在无显示环境里跑，使 Zotero 起不来），观察继任者 manifest 里的 `predecessorRunId` 是否指向前一次 run。这一步需要有效候选物（`npm run test:zotero:compatibility:prepare -- --build-root .scaffold/build`），耗时较长。

**第 4 步：归档**

任务全勾后再走 OpenSpec 的 verify → archive（把 delta specs 同步进主 specs，change 移入 `openspec/changes/archive/2026-09-21-04-…/`）。归档不会消掉本清单里的第 1、2、4、6 条——它们超出 Change 04 的范围或需要单独决策。

**如果该主机也拿不到金例**：那就只能走"收窄 6.4 措辞"这条路，把 6.4 改成"manual-gold 触发在无私有来源时按设计干净失败；真实 gold invocation 需要能访问私有库的 runner"，并在 6.4 的 bullet 里显式写出"标准被下调"这一事实，再归档。

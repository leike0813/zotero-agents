# System E2E 未决问题清单（2026-09-21）

本文件记录 Change 04 收尾期间（Windows release cell 晋级 + task 6.4 weekly/stress/manual-gold 实测）暴露或确认、但**尚未解决**的问题。它不是已完成工作的总结，而是"下一个接手的人必须知道"的清单。

**判读约定**

- 每条都写明证据出处（commit / run id / `file:line`），便于复核。
- 「缺口」指**没有取得证据**，不等于通过。不要把它读成已完成。
- 快照时间：2026-09-21，`dev` HEAD `a1867823`。

**问题按"会不会咬人"排序**

| # | 问题 | 严重度 | 能否自行推进 |
| --- | --- | --- | --- |
| 1 | Windows release 门禁从未真实执行过 | 高 | 否，需下一次正式发布 |
| 2 | 两个 cron 从未触发，也不会触发 | 高 | 否，需 workflow 进入默认分支 |
| 3 | weekly 重跑与真实 large-gold 两处验证缺口 | 中 | 部分，需私有库 runner |
| 4 | Zotero 9 分类是人工记录而非机器门禁 | 中 | 是 |
| 5 | `Verify Synthesis Sidecar` 长期红 | 中 | 是 |
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

## 3. weekly 重跑与真实 large-gold 两处验证缺口

**缺口 A：weekly 的「首次失败保留」没有实活观察。**
weekly 是唯一允许自动诊断重跑的 lane（`weekly-run`，见 `system-e2e-evidence.yml` 的 `Run evidence cell` 步骤），且**只在出现非通过后**重跑。2026-09-21 的 weekly 轮（run `35557736134`）六格全绿，因此重跑逻辑从未被真实触发。目前该性质的证据只有 task 5.1–5.3 的单测（只允许 weekly 重跑一次、完整 cell 重跑、新 profile / 新 run ID + `predecessorRunId`、两份 manifest 分开保留、`intermittent` / `persistent` 分类、PR/main/release 不重跑）与步骤条件审查。要取得实活证据必须人为注入一次失败——这需要单独授权，不能当默认动作。

**缺口 B：没有跑过一次真实的 large-gold。**
`manual-gold` 需要 runner 上能访问私有只读库（repository variables `ZOTERO_E2E_GOLD_DATA_DIR` / `ZOTERO_E2E_GOLD_PROFILE_DIR`，当前均未配置）。run `35557763993` 验证的是**未配置时的失败路径**：`Error: ZOTERO_E2E_GOLD_DATA_DIR is required for a gold run`，抛在 `stageZoteroE2EFixture`（`zotero-plugin.config.ts`），Zotero 尚未启动。这符合文档要求（未配置或路径无效时该 invocation 必须失败），但"真实跑通一次"仍未取得。

**附带观察**：该失败轮的错误列表里除 `test_failed` 还出现 `host_facts_missing`。在 fixture staging 阶段就终止的 invocation 本就没有 host facts 可报，这个 code 属噪声，不是第二个缺陷；如果将来要让错误列表更准确，可在 staging 失败时跳过该判定。

**recheck_when**：weekly 出现首个非通过轮；配置了 gold 来源的 runner 可用；`weekly-run` 实现变更。

---

## 4. Zotero 9 分类是人工记录，而非机器门禁

**现象**：Windows release cell 的晋级条件之一是"实际运行得到的 Zotero 9 分类"。当前该结论记为 `unaffected`（`docs/dev/zotero-e2e.md:82`，来自 2026-09-18 的 30 轮 debug 形态运行）。但它实际上只是一条**散文记录**。

**三处不一致 / 薄弱点**：

1. **词汇漂移**：规格用 `affected | unaffected | unverified`（`openspec/specs/system-e2e-strategy/spec.md:513`），文档沿用 `unaffected`，而代码是 `zotero9Classification: "passed" | "affected" | "unverified"`（`scripts/system-e2e/calibration.ts:161`）。同一个事实在代码里叫 `passed`。
2. **判定偏松**：`evaluateE2EPromotion` 只拦 `unverified`（`scripts/system-e2e/calibration.ts:175`），因此 `affected` 与 `passed` 在判定上等价。规格未说明 `affected` 是否允许晋级；可以解释为"门禁只要求分类来自真实运行"，但也可以是无意的宽松。
3. **未接线**：`evaluateE2EPromotion` 与它的 `windowsEvidence` 参数**只被 `tests/zotero-host/131` 调用**，生产 planner 不经过它。真正生效的是人工编辑 `E2E_PROMOTION_STATE`。因此"Zotero 9 分类"目前靠评审流程保证，机器不强制。

**下一步（需决策）**：把取值统一到规格的三个词、明确 `affected` 的判定，并补一句"门禁靠人工评审"的说明；或仅记录不改代码。

**recheck_when**：`calibration.ts` 的 `windowsEvidence` 类型变更；`system-e2e-strategy` 的 CG-02 scenario 改写；出现第一个生产调用方。

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

**修复状态（2026-09-21）**：`a2df51bb` 收掉 clippy 那处链式判断，并在该用例中先 `drop(connection)` 再清理（与文件里其余 fixture 用例的写法一致）。本机验证：`cargo fmt --all --check`、`cargo clippy … -D warnings`、`cargo test --workspace --locked --no-fail-fast` 全绿（33 个 target，最大 111 passed）。**windows 那一半只能由 workflow 本身确认**——POSIX 允许 unlink 已打开的文件，本机无法复现。

**待确认**：`Verify Synthesis Sidecar` 在 `a2df51bb` 上是否三 job 全绿。绿了本条即可从清单移除。

**影响**：它不阻断 System E2E 校准，也不阻断发布主线，但持续红会让"CI 全绿"这个信号失真——尤其对一个已经有多条非阻塞 lane 的仓库。

**recheck_when**：`a2df51bb` 之后的 `Verify Synthesis Sidecar` run；`synthesis-repository` 的 fixture 拆除写法变更；`rust/synthesis-sidecar` 的 clippy / 测试入口变更。

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

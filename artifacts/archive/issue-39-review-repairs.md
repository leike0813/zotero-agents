# Issue 39 审阅修复

实施基线：`9a28d7333610a584d68b32e9002ed0419517826f`。
总语义基线：`4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`。
用户已批准执行审阅修复方案，明确排除 Host Bridge 中文镜像翻译。

## 范围与删除清单

2026-09-08 原生 spike 后续实现已获用户批准。实现沿用上方固定基线和下方 materialized 指标。此次唯一新增替换项为 CLI Skill 的冷 Reader 限制段落：将“必须已有 loaded tab、cold/unloaded 一律拒绝”替换为已验证的目标窗口 tab 绑定能力及失败恢复说明；保留 attachment/annotation ref、请求位置、显式重试和禁止以普通打开/别窗/无位置 fallback 冒充完成的要求。其余指令不删除、不压缩、不重排。

实现文件范围：Broker 的 navigation/ingest owner；仅在需要现有事务保存时调整 native mutation helper；复用 102/188/101 的公共行为测试；同步 Broker 架构文档、本记录、指南状态和英文 CLI 源。ingest 选择 UNION 后最多 25 个 unique candidates、SQL LIMIT 26 sentinel，超限整体拒绝，不能沿用逐条件 25 的更宽候选集合。最终 identity/revision 检查与 metadata create 共用原生 transaction 和 Host slice；collection/enrichment 继续使用现有生命周期。中文镜像、依赖、Git 提交及发布不在范围内。

- 修复 Broker 导航的可信窗口、精确选择、Reader 定位、取消边界和冻结 DTO；同步 Bridge/MCP/CLI。
- 修复 migration 的确定性关联和冲突分类；更新 definition version。
- 修复 ingest identity search 的 Host 短片段与取消。
- 替换主 spec 和架构文档中的旧 union 要求，刷新英文生成面。
- 获批替换仅包括错误的导航 DTO 字段/结果枚举及与其相应的生成 schema/示例；移除相反的旧公开 mutation union 规范。七项导航能力及其既有操作指导全部保留。
- 不删除任何 Skill/reference 或 notification、watched runs、attention、catalog、maintenance、receipt、Generic Input Planning v2 指令。中文镜像不参与本轮生成。

## 验证记录

生成前从固定实施基线提取的 materialized 指令指标（与项目 checker 同一算法）：

| 文件（CLI 包相对路径） | substantive lines | normalized prose chars |
| --- | ---: | ---: |
| SKILL.md | 185 | 35806 |
| references/commands/navigation/focus-zotero.md | 22 | 2004 |
| references/commands/navigation/open-item.md | 22 | 1995 |
| references/commands/navigation/open-reader-location.md | 22 | 2025 |
| references/commands/navigation/reveal-items.md | 22 | 2004 |
| references/commands/navigation/select-collection.md | 22 | 2019 |
| references/commands/navigation/select-library-view.md | 22 | 2022 |
| references/commands/navigation/select-saved-search.md | 22 | 2022 |

CLI 包路径为 `addon/content/host-bridge-skills/zotero-bridge-cli/`；Hermes
继承副本由同一源生成。Generic/Hermes 自有指令不改写。

- Migration：五个已确认反例先失败，修复后现有 264 套件 21 passing。
- Navigation：缺失/失效 target 和 effect 后取消两个回归先失败，修复后 2 passing。
- 其余实现、合同与生成验证进行中；不得据本记录声明发布就绪。

## 本轮收敛记录

- MCP 在请求准入时捕获窗口；七项 navigation 加入明确免审批表，automated scope 拒绝规则保留。
- Migration 复用同一确定性 matcher 处理 citation 与 snapshot，DOI/raw-only 不要求完整 snapshot；冲突或多匹配不恢复新 reference。定义版本为 2。264 完整套件：25 passing。
- 移除已无消费者的旧 NavigationResultDto；native 导航测试同步 direct DTO 和可信 control。
- 英文 Skill 仅新增导航 authority/evidence 段落，既有指令未删除或重排。契约生成只替换已批准的错误导航 input/result/schema/example。Generic/Hermes 自有语义不变，Hermes 继承 CLI 新内容。
- `render:host-bridge-content`、`check:host-bridge-content`、Skill-package 基线 `9a28d733` 与 `4fb76b73` 的相对厚度检查通过。CLI SKILL 实质行数 185 → 190，规范化字符 35806 → 38278；七张导航卡的对应指标均与实施基线相同。
- 本轮受影响语义的 unmapped / downgraded / unauthorized dropped / intra-package duplicate 均为 0。删除清单仍为本文件上方声明，没有删除 reference。
- 26 条 instruction-depth advisory 接受：25 条未改动的命令卡延续基线；focus-zotero 卡为 344 行，完整包含该无参数命令的 schema、effects、approval、envelope，未因凑行数重复说明。其它六张导航卡已高于 350 行。所有硬深度检查通过。

## Spike 前的未完成项（历史记录）

- Exact Reader 冷打开仍缺少可证明的窗口绑定：三版 native Reader.open 在 await 后创建 ReaderTab，并重新取最近窗口。只允许 captured window 已加载的 tab；cold/unloaded 返回 `location_unsupported`，不以打开后检查掩盖错窗 effect。需另行确定可用的原生窗口绑定 seam，再补三版真实运行证据；不允许 monkey-patch 全局窗口选择器。
- ingest identity 每个 Search 和最多 25 个候选 hydration 各自经过 Host slice，取消后不开始下一次 Search；单次 native Search 自身仍可能先返回超过 25 IDs 再被拒绝，尚无源端 LIMIT 证据。
- CLI prebuild freshness 失败：manifest `2ef15640…`，当前输入 `68aa7af7…`。Synthesis sidecar 七平台也存在 fingerprint mismatch（期待 `6375c3f5…`，现存 `c9c7a93d…`）。未提交、push、构建发布集或发布；二进制更新需独立授权流程。
- 中文 mirror 按用户要求未翻译、未生成、未以其门禁宣称发布就绪。

## Spike 前的本地验证

- `ZOTERO_TEST_MODE=full tsx mocha` 组合 101 / 102 / 107 / 264（Zotero mock、20 秒 timeout）：244 passing（12 秒）。
- 105 concurrency / 106 Bridge server / 108 MCP mirror / 138 files / 241 authority / 242 Trash：91 passing、1 pending。
- `cargo test --locked --manifest-path cli/zotero-bridge/Cargo.toml --test schema_mode`：15 passing。
- `tsc --noEmit`、定点 ESLint、`git diff --check`：通过。
- 107 既有 debug.status 失败是 manifest 默认第一页导致；测试改用 `limit=100` 后通过，没有恢复全量默认读取。
- native 188 仅同步 DTO/control 和 PDF-vs-EPUB 错误期望，未取得 Zotero 7/9/10 三版新运行证据。执行过程中曾误触完整 lite suite（52 pass、4 fail），不作为本次定向验收证据。
- 独立复审确认并修复 resolver 内取消竞态与 class-instance 输入；两个最小用例先红，修复落在 navigation 公共验证边界。188 的 feature-detected 成功不能证明全部 native 能力可用，后续还需有效 EPUB/CFI 和真实窗口证据。
- ingest 在首个实际 effect 前（包括 PDF/landing）做槽外分片 revalidation，effect 槽内做 entity observations 校验。absence 仍不能由 entity revision 表达：最后查询到 effect admission 间出现新同 identity 条目仍存在竞态。完整解决需有界组合 identity query 与写入的原子策略，留待单独设计，不宣称本轮完成该保证。

## Spike 后获批的实现方案

更新（2026-09-08）：随后完成了 Zotero 7/9/10 原生 spike，Reader tabID 绑定与 ingest SQL LIMIT/transaction 路径均获得可行性证据。下列“需调查”的状态已由 [原生 spike 结果与落地方案](issue-39-native-spike/README.md) 细化；生产代码的既有限制尚未在 spike 中修改。

1. **Reader**：限定调查三版原生 tab 创建接口能否接受 caller-owned window。若可证明，修改 Broker 的冷创建分支并扩展 188 的实际窗口与 location 验收；若原生接口无法做到，需要上游窗口绑定能力或明确调整冷打开合同，不能用全局 monkey-patch、错窗后关闭、普通 openItem 冒充定位。
2. **Ingest**：在 Broker identity owner 内研究一个源端有界组合 query，保留现有 DOI/ISBN/arXiv/PMID/title 匹配规则；在首 effect admission 内完成最终 query 与 absence/match 检查，避免把整个多查询 preparation 重新包进 gate。复用 102 的公开 mutation/concurrent-read seam，验证候选上限、并发相同 identity、取消与 fairness；不新增第二个 identity store 或进程锁。
3. **验收/二进制**：完成源码后固定并经授权提交、push，再走各自七平台 prebuild skill；同步 aggregate 后复跑 freshness、三版 native 导航与 release-set gates。正式发布仍须独立授权。中文镜像继续保持本次明确排除，不能将其状态写成通过。

## 原生方案落地与证据边界

用户随后明确要求直接实现。Reader 使用目标窗口私有 tab 绑定；Zotero 7 创建 unloaded tab 后立即转为原生 loading 状态，9/10 创建 loading tab，同步阻止第二个请求再次接管尚未注册的 Reader。失败保留该 tab，明确不回滚、不自动重放。188 的 PDF cold/loaded、annotation、有效 EPUB 和 unloaded reuse 必须真实成功；双窗口竞态独立运行，请求在原生等待中打开第二个真实主窗口，验证拒绝和错窗零新增 tab，不替换全局窗口查询。

Ingest 复用原生 Search 编译、UNION 去重与 LIMIT 26；最终查询、已准备 identity 检查和 metadata create 在同一 Host slice/native transaction。Search 编译仍分片，候选显式加载且缺项整体失败。一个共享的测试数据库替身仅供 101/102/107 ingest 用例使用，不改变默认宿主 mock 的 DB 能力；该替身不作为原生事务原子性证据。真实证据通过 `artifact/issue-39-native-spike/run.ts --production` 的 Broker preview/execute/observation 和并发已准备操作取得。

验收期间修复过 runner 缺少项目根路径，以及 headless 环境无法把焦点切回旧窗口的测试前置条件。后者改用“原窗口开始请求、原生等待中打开新窗口”的真实 MRU 变化，不以跳过或放宽断言处理。所有测试使用独立 scratch profile/data，不操作用户资料库。

### 英文 surface 审阅与生成

- semantic review ran: yes；context reviewRequired: true；baseline: `9a28d7333610a584d68b32e9002ed0419517826f`（同时复核总语义基线 `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`）。
- semantic source edits: `skills_src/zotero-bridge-cli/SKILL.md` 中获批的冷 Reader 段落；删除/替换清单见本记录开头。其余指令保留原位。
- minimum-core / Generic / Hermes / Skill-package / semantic parity / Agent Control Contract: aligned。Generic/Hermes 自有语义不变，仅继承 CLI 的能力与失败恢复说明。
- unmapped / downgraded / unauthorized dropped / intra-package duplicate: **0 / 0 / 0 / 0**。
- reference-depth: aligned。26 条既有命令卡 advisory 接受，原因沿用本记录上方逐类说明；命令卡本次未变，Hermes 继承副本具有相同 advisory，不为凑行数重复指令。
- materialized CLI `SKILL.md`：固定实施基线 185 substantive lines / 35806 normalized characters；当前 **190 / 38453**。直接 reference 未删除。
- `render:host-bridge-content`、`check:host-bridge-content`、`check:host-bridge-doc-sync -- --baseline-ref 9a28d733…` 和 CLI/Hermes 继承包对 `4fb76b73…` 的厚度检查均通过。renderer 本次只更新 CLI Skill、manifest 与 Hermes 继承副本。
- release identity: unchanged，既有 prebuild freshness 不匹配仍待独立预构建流程；本次只完成内容对齐，不声明 release-set 就绪。中文镜像未翻译、未生成。

### 最终源码验证

- `ZOTERO_TEST_MODE=full tsx mocha` 组合 101/102/107/264（`--require test/setup/zotero-mock.ts --timeout 20000 --exit`）：**248 passing**，12 秒。
- 同配置相邻 105 concurrency / 106 Bridge server / 108 MCP mirror / 138 files / 241 authority / 242 Trash：**91 passing、1 pending**，5 秒；pending 是既有环境条件用例。
- `tsc --noEmit`、本轮 Broker/101/102/107/188/helper 定点 ESLint、`git diff --check`：通过。
- 取消回归：事务返回前取消保留 `repair_required` 和实际 residual ref；核心完成后下载被取消的旧实现返回 `failed`，最小用例先红，修复后返回 `unknown` 和 affected ref。已有 typed authority 错误保持原分类，不吞掉 repair_required。
- 没有修改 native mutation helper：唯一 metadata create caller 已在事务内，直接使用 `item.save()`，不保留无消费者的 saveTx 分支或配置开关。

### 最终真实 Zotero 验收

定向构建 `./node_modules/.bin/zotero-plugin build` exit 0。本轮三版使用同一 XPI SHA-256：`c74c18af071ca7439525e598ed2a616d6bbf7614cb0e7b29aaebf1bb7391e6ff`；没有以 spike 前的旧插件构建证明当前实现。

命令为 `./node_modules/.bin/tsx artifact/issue-39-native-spike/run.ts <target> --production`，三个目标顺序执行：

| target / 实测版本 | 结果 | scratch run root |
| --- | --- | --- |
| zotero-7-linux-x64 / 7.0.32 | 7 passed，exit 0 | `/tmp/issue39-native-spikes/zotero-7-linux-x64-1389e7f1-c04d-40d7-a359-49cb9003224e` |
| zotero-9-linux-x64 / 9.0.6 | 7 passed，exit 0 | `/tmp/issue39-native-spikes/zotero-9-linux-x64-cc192398-b849-4c9d-ba5e-85ba811d7472` |
| zotero-10-linux-x64 / 10.0.1 | 7 passed，exit 0 | `/tmp/issue39-native-spikes/zotero-10-linux-x64-3abe7512-428e-43b2-99fd-5f80fbb9be09` |

各目录 `diagnostics/stdout.log` 记录七个测试成功，`diagnostics/evidence.jsonl` 保存真实 host facts 与 Broker ingest 结构化观测。验收包括：Reader 等待中真实切换主窗口后拒绝、错误窗口零新增 Reader tab、目标 reservation 保留；PDF cold/loaded、unloaded reuse、annotation、有效 EPUB 精确 dispatch；ingest 创建/复用与 durable observation、双份 absence prepared plan 并发仅一次创建且另一项 conflict、26 候选 resource_limited，以及保存后故障触发原生 rollback 且公共列表返回 0 项。

中间轮次曾出现一次测试进程退出后的 esbuild goroutine shutdown 噪声；最终三版均未复现，仅有不影响 exit/test result 的 libEGL/xkbcomp 警告。fixture 和 scratch 状态保留以便复查。

**本轮 Reader/ingest 源码实现与上述定向验收已完成。** Reader 成功证明初始化与 normalized command dispatch，不证明像素视口；失败可留下 loading tab。Ingest 的序列化保证不覆盖绕过 Broker/native transaction 的裸 writer，候选上限也不等于 SQLite 扫描行数上限。七平台 prebuild、release-set、中文镜像和正式发布仍不在本轮完成声明内；没有提交、推送、切换分支或发布。

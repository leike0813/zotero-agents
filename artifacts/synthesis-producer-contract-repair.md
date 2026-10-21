# Synthesis 生产与读取契约修复

## 根因与证据

调查基线：`371b9a72d50789887e24dd167b6133b7f8a71b1e`。ACP run `acp-skill-mvhrhibe-w657mm` 的外层执行成功，业务输出却为 `topic_synthesis_canceled`，失败位置为 audit metadata 中的 prospective proposal。运行时命令卡、仓库内容和已安装 CLI 的 command catalog 身份一致；Host Bridge 内容检查无漂移。

`b2c057e45a171593a435b21c0a2933dc2eec1b03` 建立 seed/type 生产契约。`ce9764f98d71f25eec510d83959c7579b6171af3`（2026-08-12，`chore: harden synthesis sidecar recursive DTO contracts(stage 1)`）在递归 DTO 硬化时将其误写为 graph 对象，且没有生产格式转换或迁移。提交意图是收紧 DTO，实际将另一种领域对象的字段套到已有生产格式上。渲染只能传播错误定义，无法纠正领域含义。

SSOT 没有覆盖完整生产链：Skill payload、公开 Schema、Python 校验和 Rust 投影各自维护形状；corpus 使用错误形状或空集合，未能发现偏差。本次同时统一领域定义并补齐非空生产证据。

## 实现边界

- prospective 使用 `target_topic_seed` / `relation_type`，从既有 manifest assets 读取并写入 canonical metadata；patch 省略继承、显式空清空。
- summary 正文、coverage 结构、canonical source-paper triage 保留到对应消费者；resolver/semantic 保持显式精简视图。
- Concept 提案保留 local id 和 merge hints。Hints 是不参与决策的元数据，复用 registry 的有界 opaque-leaf 所有权，不猜结构或合并语义。
- 新 Concept confidence 使用三级枚举；历史数字保留，报告 `concept_confidence_review_required`，不猜阈值或转换为 medium。
- Topic 在提交前验证 sidecar DTO、resolved paper set 和共享消费者结构。两套 Python runtime 正式依赖 `jsonschema>=4.18,<5`，先执行 Schema 校验，再执行领域检查。
- Skill renderer 复用既有 Schema materializer。统一隔离渲染检查按相对路径全集与字节比较生成物，接入 preflight、build、内容包及既有 CI/发布门禁。
- CI 按 runner manifest 准备 Python 依赖；本机使用已有共享环境，没有安装或升级依赖。
- 没有新增平行 runner、全量 TS/Rust DTO codegen 或错误 graph 形状兼容层。

## 继续验收发现并修复的问题

1. 原生 stage1 原先先记录 worker 证据再 build，导致二进制身份改变、证据失效。调整为先 build 再采集。最终覆盖汇总显式使用 `--stress`；普通探测的 4096 行 / 8 MiB 资源上限保持不变。
2. 六个现有 corpus 正例补入非空 coverage、triage、Concept 元数据、历史数字 confidence 和 audit discovery。两处 Rust 旧 fixture 同步至生产形状。结构覆盖从 314 项缺口收敛至全部闭合，没有缩减分母。
3. 三平台 CI 暴露测试硬编码本机 uv 路径；Topic、Deep Reading、prepare 测试复用现有 Python 选择逻辑，启动异常保留真实错误。无 `.ar` 的隔离 CI 路径已验证。
4. Windows `RUNNER~1` 与 macOS `/var` 的逻辑临时路径不同于 Python 解析的物理路径。既有 shard runner 用 `realpathSync.native()` 统一临时根及子进程 TMPDIR/TEMP/TMP。真实 Windows 8.3 路径先复现失败再通过，未放宽生产 run-scope 校验。修复提交 `03cb252ba` 的三平台 run `39593146097` 全部通过。
5. 最后边界复核发现 Rust 按 UTF-8 字节限制 seed，并可能写入超过 metadata Schema 上限的 proposal 数组。提交 `a10665634` 改为字符计数，两个上限均读取同一 Topic Schema。既有生产路由测试证明 32768 字符、98304 UTF-8 字节的中文 seed 可以 apply/patch/review/reopen；1001 条 proposals 在 promotion 前拒绝。两个场景均先红后绿。

早期预构建与验收结果仅用于上述诊断。后续源码变化后，旧集合正确判 stale；下文仅列当前交付身份。

## 当前验收

当前源码：`a106656343c150d0d45e1f7f1e9dd1e79db9787e`。

`npm run test:synthesis-native:stage1` 完整通过，57 个测试文件成功，最终 `ok: true`。日志：`.scaffold/test/synthesis-bounded-final-stage1.log`。

| 维度 | 已覆盖 / 总数 | 未覆盖 |
| --- | --- | --- |
| 协议入口正负例 | 483 / 483 | 0 |
| 跨语言消息真实执行 | 483 / 483 | 0 |
| 递归结构探测 | 14781 / 14781 | 0 |
| TS/Rust 接收端结构执行 | 14781 / 14781 | 0 |
| 工作流生产者持久化 | 10 / 10 | 0 |

TS 接收端为 10022/10022，Rust 为 5903/5903；总结构义务按 ID 去重。最终 `errors`、`violations`、`uncovered`、`exhausted` 均为空，`truncated: false`。真实链路包含 Python finalize → Workflow apply → native reopen/list/audit/default review → Reader 消费。

其他验证：

- 最新 Topic runtime 全套 23 项、Rust workspace 530 项通过，Clippy、Rust fmt 通过。
- Deep Reading 30 项、workflow-read-producers 6 项通过；无共享环境的 CI fallback 及真实 Windows 短路径回归通过。
- builtin request contract + Reader 68 项通过，生产清单包含 32 个 Skill producer、10 个非 Skill workflow。
- renderer/checker 21 项通过；统一隔离检查五包 byte-identical。
- canonical validators、workflow manifest、SSOT invariant、Host Bridge content/consumer/doc-sync、相关 TS/ESLint/Prettier 与 OpenSpec strict 通过。Host Bridge 仅有既有 advisory depth warnings。

### 七平台开发预构建

统一入口返回 `status: complete`、`sync.ok: true`、`freshness.ok: true`：

- [run 39597110060](https://github.com/leike0813/zotero-agents/actions/runs/39597110060)，request `ssdp-2af2100a-199f-440d-9ea7-c6a5459d8768`。
- source `a106656343c150d0d45e1f7f1e9dd1e79db9787e`。
- aggregate `55d87dbf098fcb56f9f5d6bab65d41808bce9b5702b60853b9d2ff31dfd97c01`。
- exact prebuild commit `6b6bb3d98664961cd044539619564cd4d8a13e1e`。
- source fingerprint `284b8b2f04344c0888174924093925d86be206aba756bd0f4844d4f3b456a850`。
- build fingerprint `3a908c04293324d8031c2cdfdee502ed3105080366badef20c4cafeca28a2b83`。
- 目标：win32-x64、darwin-x64、darwin-arm64、linux-x86、linux-x64、linux-arm、linux-arm64。
- typed result：`.scaffold/synthesis-sidecar-prebuild-results/39597110060/prebuild-result.json`。
- 操作日志：`.scaffold/test/synthesis-bounded-prebuild-operation.log`。

同步时 formal verification 尚在运行，操作记录如实保留 `blocked`。开发预构建完成与正式验证资格分别记录，不修改历史操作结果。

### 三平台正式验证

当前 [run 39596896941](https://github.com/leike0813/zotero-agents/actions/runs/39596896941) 已成功，Linux、Windows、macOS 和 receipt job 全部通过。官方 resolver 对当前源码计算身份后返回 `status: matched`、`diagnostics: []`，取得 `synthesis-sidecar-verification-result.v2` trusted receipt；当前集合具备匹配的正式验证证据。

- source/build 指纹与上述七平台集合相同。
- verification fingerprint：`654906ac676adb858486af531a904e2082a6ab3afbd81e1e4118fd097c5934de`。
- verification pipeline revision：`be601a6f274c327dc584ca84cf0312eb80da1c9e708751061e757ef2dcd01af9`。
- receipt：`.scaffold/test/synthesis-bounded-verification-receipt.json`，三 host 均为 `passed`。

这份独立回读证据不改写预构建操作在验证完成前记录的状态，也不构成插件发布或正式 materialization 授权。

### 内容包与 XPI

按既有授权，内容包仅发布 dev：`0.8.10-dev.11`，[run 39583246632](https://github.com/leike0813/zotero-agents/actions/runs/39583246632) 成功；`npm run check:content-package-release -- --current-branch` 发布后回读通过。此后修复未改变交付内容，无需再次 bump。日志：`.scaffold/test/synthesis-producer-content-freshness-after.log`。

当前七平台同步后，`npm run build`、`npm run check:help-docs`、`npm run check:synthesis-sidecar-runtime-xpi -- --xpi=.scaffold/build/zotero-agents.xpi` 均成功。XPI 检查七目标完整，`missing`、`forbidden` 均为空。

- XPI：`.scaffold/build/zotero-agents.xpi`。
- SHA-256：`e0cee223f498a9b4d33e683da50827b099ed0d9e66ee79d0851d289120c36192`。
- 日志：`.scaffold/test/synthesis-bounded-final-build.log`、`synthesis-bounded-final-help-docs.log`、`synthesis-bounded-final-xpi.log`。

Host Bridge CLI 0.5.8 与 Windows ACP bridge 的输入未变化，沿用已通过的 freshness 证据。

## 交付限制

没有发布插件或正式 materialization/release-set，没有在真实库重放原始 run，也没有执行全仓 GUI/E2E。内容只发布 dev。原始 sidecar 已丢失的数据无法从空 metadata 自动恢复；本次回归使用去标识化合成数据。OpenSpec 保留待按需归档。

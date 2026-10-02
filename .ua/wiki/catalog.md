
# 符号目录

图谱共记录 7536 个节点。这里按类型、复杂度与标签聚合，便于从「形状」反查具体页面。

## 按节点类型

| 类型 | 数量 |
| --- | --- |
| 函数 | 5922 |
| 文件 | 993 |
| 类 | 309 |
| 配置 | 210 |
| 文档 | 44 |
| 表 | 35 |
| 模式 | 20 |
| 服务 | 3 |

## 按复杂度

| 复杂度 | 数量 |
| --- | --- |
| 简单 | 3713 |
| 中等 | 2386 |
| 复杂 | 1437 |

## 按语言

| 语言 | 数量 |
| --- | --- |
| json | 20 |
| markdown | 1 |

## 高频标签

共 2719 个不同标签，下表列出前 40 个。

| 标签 | 节点数 |
| --- | --- |
| validation | 677 |
| rust | 612 |
| acp | 488 |
| contract | 476 |
| utility | 456 |
| runtime | 393 |
| host-bridge | 311 |
| projection | 246 |
| entry-point | 245 |
| skillrunner | 243 |
| exported | 225 |
| citation-graph | 221 |
| workflow | 221 |
| diagnostics | 215 |
| lifecycle | 214 |
| synthesis | 197 |
| rebuild | 192 |
| configuration | 180 |
| normalization | 176 |
| parsing | 174 |
| component | 173 |
| transcript | 171 |
| sidecar | 164 |
| factory | 147 |
| persistence | 142 |
| ui | 134 |
| i18n | 130 |
| 校验 | 122 |
| script | 122 |
| cli | 117 |
| assistant | 113 |
| workbench | 113 |
| orchestration | 111 |
| build-system | 101 |
| broker | 97 |
| pagination | 97 |
| schema-definition | 96 |
| error-handling | 89 |
| transfer | 89 |
| serialization | 88 |

## 被引用最多的复杂符号

下表列出复杂度标记为「复杂」且被其他节点引用最多的符号。

| 符号 | 类型 | 入边数 | 位置 | 摘要 |
| --- | --- | --- | --- | --- |
| [toSynthesisJsonValue](symbols/packages/synthesis-contracts/src/common.ts/toSynthesisJsonValue.md) | 函数 | 5 | packages/synthesis-contracts/src/common.ts:77–142 | 把任意运行时值收敛为合法 JSON 值：拒绝 undefined、函数、非有限数字与循环引用，并保留数组空位语义。 |
| [durable_write](symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/durable_write.md) | 函数 | 3 | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:737–760 | 以 fsync + 原子重命名方式落盘文件，确保崩溃后不出现半写状态。 |
| [verifySynthesisSidecarRuntimeBundleDirectory](symbols/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts/verifySynthesisSidecarRuntimeBundleDirectory.md) | 函数 | 3 | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:416–487 | 完整校验 bundle 目录：清单、指针、可执行位、布局与指纹全部一致才算通过。 |
| [parse_markdown](symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/parse_markdown.md) | 函数 | 3 | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:1100–1290 | 受控 Markdown 解析器主入口，逐块解析标题、表格、图片、公式与普通段落。 |
| [validateAcpSkillFinalPayload](symbols/src/modules/acp/skillRun/acpSkillOutputValidator.ts/validateAcpSkillFinalPayload.md) | 函数 | 3 | src/modules/acp/skillRun/acpSkillOutputValidator.ts:55–154 | 按 schema 资产与产物 manifest 校验 Skill 终态载荷，输出结构化字段级错误列表。 |
| [readPackagedBinaryAsset](symbols/src/modules/packagedAssetResolver.ts/readPackagedBinaryAsset.md) | 函数 | 3 | src/modules/packagedAssetResolver.ts:287–330 | 读取打包二进制资产：依次尝试 fetch 与 XHR 回退路径，并附上每次失败的原因用于诊断。 |
| [createSynthesisSidecarRpcClient](symbols/globals.md) | 函数 | 3 | — | 创建 RPC 客户端：生成单调 request id、校验 capability 合法性、执行带 deadline 的调用并把每次调用的 trace 事件写入观测通道。 |
| [createSynthesisClientFromPort](symbols/globals.md) | 函数 | 3 | — | 从 Port 构造完整 Synthesis 客户端：逐个实现 topic、artifact、concept、tag、reference、graph、sync 与 capability 方法，每个方法都做入参重建与结果归一化。 |
| [renderMarkdownIsland](symbols/src/synthesis/components/reader/markdownIsland.ts/renderMarkdownIsland.md) | 函数 | 3 | src/synthesis/components/reader/markdownIsland.ts:270–318 | markdown island 渲染入口：调用共享渲染器、缺渲染器时降级为纯文本，并附加概念、shortcode 与 digest 增强。 |
| [createWorkflowHostApi](symbols/src/workflows/hostApi.ts/createWorkflowHostApi.md) | 函数 | 3 | src/workflows/hostApi.ts:98–685 | 装配并返回 Workflow Host API v12 实例，版本与各 owner 一并校验。 |
| [copy_snapshot](symbols/rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs/copy_snapshot.md) | 函数 | 2 | rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs:783–861 | 将 topic 快照递归复制到目标目录，复制过程中逐文件校验哈希。 |
| [append_raw_page](symbols/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs/append_raw_page.md) | 函数 | 2 | rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:146–179 | 校验并追加一页原始输入：核对 descriptor 的 basis、累计 JSON 节点预算，超限即拒绝。 |
| [loadHostBridgeCommandContracts](symbols/scripts/host-bridge/host-bridge-command-contracts.ts/loadHostBridgeCommandContracts.md) | 函数 | 2 | scripts/host-bridge/host-bridge-command-contracts.ts:307–481 | 加载并交叉校验全部命令契约，是契约层唯一对外入口，向渲染与治理脚本提供一致事实源。 |
| [startZoteroNativeCrashCapture](symbols/scripts/zotero-native-crash-capture.ts/startZoteroNativeCrashCapture.md) | 函数 | 2 | scripts/zotero-native-crash-capture.ts:562–717 | 崩溃捕获主流程：布置 fixture、启动宿主、等待崩溃、生成摘要并清理现场。 |
| [renderMarkdown](symbols/skills_src/literature-deep-reading/renderer/templates/deep-reading.js/renderMarkdown.md) | 函数 | 2 | skills_src/literature-deep-reading/renderer/templates/deep-reading.js:83–157 | 把受控 Markdown 渲染为阅读区 HTML，处理标题锚点、表格、公式与图片引用。 |
| [build_citation_graph_model](symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/build_citation_graph_model.md) | 函数 | 2 | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:5726–5833 | 把图谱原始数据整理为渲染模型，聚合度数、聚类与布局度量。 |
| [initialize_database](symbols/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py/initialize_database.md) | 函数 | 2 | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2219–2433 | 创建运行态数据库的表结构与初始元数据，返回可用的连接。 |
| [collect_resolver_cascade](symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/collect_resolver_cascade.md) | 函数 | 2 | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:1659–1888 | resolver 瀑布的主流程，按级联顺序解析文献引用并登记审计记录。 |
| [resolveHostBridgeCliBinary](symbols/src/modules/hostBridge/cli/hostBridgeCliResolver.ts/resolveHostBridgeCliBinary.md) | 函数 | 2 | src/modules/hostBridge/cli/hostBridgeCliResolver.ts:147–205 | 按候选根目录顺序探测已安装的 CLI 二进制，返回可执行路径、来源与版本诊断。 |
| [materializeResearchBundlePapers](symbols/src/modules/hostBridge/workflow/researchBundleService.ts/materializeResearchBundlePapers.md) | 函数 | 2 | src/modules/hostBridge/workflow/researchBundleService.ts:456–615 | 将一组论文及其产物、附件写入 bundle 目录，返回产物文件与附件的相对路径清单。 |

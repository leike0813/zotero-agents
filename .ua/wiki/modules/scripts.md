
# scripts
> 目录聚合页：36 个文件、255 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [scripts/build-help-docs.ts](../files/scripts/build-help-docs.ts.md) | 文件 | 16 | 帮助中心文档生成器：读取多语言 Markdown 源文档，重写内部链接、转换 admonition 与图片引用，生成 sidebar 配置、复制图片资产并校验输出目录。 |
| [scripts/check-localization-governance.ts](../files/scripts/check-localization-governance.ts.md) | 文件 | 7 | 本地化治理检查脚本，比对各语言 FTL 键集合、抽取 Synthesis Workbench 与 Dashboard 页面中的 UI 硬编码文案，并核对默认值一致性。 |
| [scripts/check-runtime-diagnostics-release-elision.ts](../files/scripts/check-runtime-diagnostics-release-elision.ts.md) | 文件 | 7 | 发布门禁脚本：用 esbuild 按诊断开关的多种组合打包 src/index.ts，验证 runtime diagnostics 与 Synthesis sidecar 诊断代码在正式构建中被完全消除。 |
| [scripts/check-skillrunner-ssot-invariants.ts](../files/scripts/check-skillrunner-ssot-invariants.ts.md) | 文件 | 4 | CI 治理脚本：校验 SkillRunner 单一事实源（SSOT）的不变量文件，检查 current 快照与 facts/ref 引用是否一致、结构是否完整。 |
| [scripts/ci-gate-plan.ts](../files/scripts/ci-gate-plan.ts.md) | 文件 | 1 | CI 门禁阶段编排的唯一事实源，按 gate 名称返回需要依次执行的 stage 列表，供 run-ci-gate 驱动实际命令。 |
| [scripts/clear-acp-chat-records.ts](../files/scripts/clear-acp-chat-records.ts.md) | 文件 | 0 | 一键清理 ACP Chat 会话记录的命令行薄封装，复用 runtime 持久化治理 CLI 的分类清理能力。 |
| [scripts/clear-acp-skills-records.ts](../files/scripts/clear-acp-skills-records.ts.md) | 文件 | 0 | 一键清理 ACP Skills 运行记录的命令行薄封装，与 Chat 清理入口共享同一治理 CLI。 |
| [scripts/clear-skillrunner-records.ts](../files/scripts/clear-skillrunner-records.ts.md) | 文件 | 0 | 一键清理旧版 SkillRunner 运行记录的命令行入口，便于本地开发时重置后端状态。 |
| [scripts/e2e-single-markdown-live.ts](../files/scripts/e2e-single-markdown-live.ts.md) | 文件 | 6 | 端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。 |
| [scripts/github-workflow-run.ts](../files/scripts/github-workflow-run.ts.md) | 文件 | 12 | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |
| [scripts/inspect-literature-analysis.ts](../files/scripts/inspect-literature-analysis.ts.md) | 文件 | 5 | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [scripts/inspect-single-markdown-request.ts](../files/scripts/inspect-single-markdown-request.ts.md) | 文件 | 3 | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [scripts/migrate-persistence-governance.mjs](../files/scripts/migrate-persistence-governance.mjs.md) | 文件 | 7 | 持久化治理迁移脚本：检测遗留镜像目录，计划文件与目录的受控复制，校验目标可写性并对变更前后摘要做一致性检查。 |
| [scripts/mock-skillrunner-serve.ts](../files/scripts/mock-skillrunner-serve.ts.md) | 文件 | 2 | 本地 Mock SkillRunner 服务，提供旧版后端的最小 HTTP 契约实现，供插件开发与集成测试使用。 |
| [scripts/patch-zotero-test-runner.ts](../files/scripts/patch-zotero-test-runner.ts.md) | 文件 | 9 | Zotero 测试 runner 页面补丁：向生成的 test_runner.html 注入事件回传、诊断桥与失败时自动 dump，使 mocha 结果可被外部进程采集。 |
| [scripts/record-acp-runtime-governance-baseline.ts](../files/scripts/record-acp-runtime-governance-baseline.ts.md) | 文件 | 2 | 录制 ACP 运行时性能治理基线，把当前 profiler 快照渲染成 Markdown 基线文件，用于后续回归对比。 |
| [scripts/release-coordinator-gate.ts](../files/scripts/release-coordinator-gate.ts.md) | 文件 | 10 | 发布协调门禁：比对本地与远端 main/tag/GitHub Release 状态，判定 Host Bridge 与内容包的发布阻塞项，并给出下一步动作与建议命令。 |
| [scripts/run-ci-gate.ts](../files/scripts/run-ci-gate.ts.md) | 文件 | 1 | CI 门禁执行入口：按 ci-gate-plan 提供的阶段列表逐个调用对应 npm script，任一阶段失败即整体失败。 |
| [scripts/run-node-test-shards.ts](../files/scripts/run-node-test-shards.ts.md) | 文件 | 12 | Node 测试分片运行器：收集测试文件、按编号分片、构造 mocha 参数与环境变量、支持失败重跑与分片清单输出。 |
| [scripts/run-zotero-compatibility-matrix.ts](../files/scripts/run-zotero-compatibility-matrix.ts.md) | 文件 | 13 | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [scripts/run-zotero-compatibility-worker.ts](../files/scripts/run-zotero-compatibility-worker.ts.md) | 文件 | 4 | 兼容性矩阵 worker 入口：在隔离的 run 目录中物化测试工作区与宿主链接，按 mode/domain/lane 解析测试条目并执行，同时回传宿主事实事件。 |
| [scripts/run-zotero-direct.ts](../files/scripts/run-zotero-direct.ts.md) | 文件 | 14 | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |
| [scripts/run-zotero-e2e-stress.ts](../files/scripts/run-zotero-e2e-stress.ts.md) | 文件 | 2 | Citation Graph 生命周期压力测试入口：设置合成关闭循环次数与真实库开关后，转调统一的 Zotero E2E 命令。 |
| [scripts/run-zotero-full-suite.ts](../files/scripts/run-zotero-full-suite.ts.md) | 文件 | 3 | Zotero E2E 全量套件的启动脚本，按顺序 spawn 各阶段 npm 步骤并把失败输出直接转发到控制台。 |
| [scripts/run-zotero-start-with-mock.ts](../files/scripts/run-zotero-start-with-mock.ts.md) | 文件 | 8 | 带 mock SkillRunner 的启动脚本：先拉起本地 mock 后端并等待就绪，再以受控环境启动 Zotero，退出时负责终止全部子进程。 |
| [scripts/run-zotero-test-with-mock.ts](../files/scripts/run-zotero-test-with-mock.ts.md) | 文件 | 25 | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [scripts/runtime-diagnostics-esbuild.ts](../files/scripts/runtime-diagnostics-esbuild.ts.md) | 文件 | 2 | runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。 |
| [scripts/runtime-diagnostics-production-manifest.ts](../files/scripts/runtime-diagnostics-production-manifest.ts.md) | 文件 | 1 | runtime diagnostics 正式构建清单的单一事实源：声明各诊断特性组的开关、define、独占模块、禁止出现的 marker 与静态豁免项。 |
| [scripts/sync-gitee-publication.ts](../files/scripts/sync-gitee-publication.ts.md) | 文件 | 12 | 把插件发布物与工作流包同步到 Gitee 的发布脚本，负责 release 资产下载校验、插件引用推送以及工作流 feed 分支更新。 |
| [scripts/sync-gitee-release.ts](../files/scripts/sync-gitee-release.ts.md) | 文件 | 14 | 通过 Gitee OpenAPI 创建/更新 Release 并重新上传 xpi 等附件，附 sha256 校验与远端资产比对，确保发布资产与本地一致。 |
| [scripts/ui-harness-serve.ts](../files/scripts/ui-harness-serve.ts.md) | 文件 | 6 | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |
| [scripts/update-skillrunner-runtime-feed.ts](../files/scripts/update-skillrunner-runtime-feed.ts.md) | 文件 | 8 | 更新 SkillRunner 运行时 feed 的脚本，规范化版本与插件版本区间后重写 feed 条目并输出变更记录。 |
| [scripts/zip-archive.ts](../files/scripts/zip-archive.ts.md) | 文件 | 2 | 零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。 |
| [scripts/zotero-compatibility-fixture.ts](../files/scripts/zotero-compatibility-fixture.ts.md) | 文件 | 22 | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |
| [scripts/zotero-native-crash-capture.ts](../files/scripts/zotero-native-crash-capture.ts.md) | 文件 | 15 | Zotero 原生崩溃捕获模块：在私有目录布置崩溃 fixture，用 Windows cdb 生成并解析转储，采集进程与平台证据并落盘摘要。 |
| [scripts/zotero-native-crash-env.ps1](../files/scripts/zotero-native-crash-env.ps1.md) | 文件 | 0 | 为 Zotero 原生崩溃复现准备环境变量的 PowerShell 脚本，设置崩溃转储与调试相关环境并启动宿主。 |

## 子目录
- [acp-ws-bridge](scripts/acp-ws-bridge.md)、[content-package](scripts/content-package.md)、[host-bridge](scripts/host-bridge.md)、[internal](scripts/internal.md)、[synthesis](scripts/synthesis.md)、[system-e2e](scripts/system-e2e.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](src/workflows.md) | 9 |
| [scripts/system-e2e](scripts/system-e2e.md) | 8 |
| [src/modules/harness](src/modules/harness.md) | 4 |
| [scripts/internal](scripts/internal.md) | 3 |
| [src/providers/skillrunner](src/providers/skillrunner.md) | 3 |
| [.](index.md) | 2 |
| [scripts/synthesis](scripts/synthesis.md) | 2 |
| [src/modules](src/modules.md) | 2 |
| [packages/synthesis-contracts/src](packages/synthesis-contracts/src.md) | 1 |
| [src/jobQueue](src/jobQueue.md) | 1 |
| [src/modules/acp/diagnostics](src/modules/acp/diagnostics.md) | 1 |
| [src/modules/synthesis](src/modules/synthesis.md) | 1 |
| [src/modules/synthesisClient](src/modules/synthesisClient.md) | 1 |

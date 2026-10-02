
# 构建、发布与工程配置

构建与运维工具链：host-bridge / synthesis / content-package / acp-ws-bridge / system-e2e 等构建发布脚本、synthesis index harness 工具，以及根级 package.json、tsconfig、ESLint/Prettier 与仓库属性等工程配置。
> 本页由知识图谱分层 `layer:build-tooling` 生成，共 142 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [scripts](../modules/scripts.md) | 36 |
| [scripts/synthesis](../modules/scripts/synthesis.md) | 35 |
| [scripts/host-bridge](../modules/scripts/host-bridge.md) | 34 |
| [.](../modules/index.md) | 13 |
| [scripts/content-package](../modules/scripts/content-package.md) | 11 |
| [scripts/system-e2e](../modules/scripts/system-e2e.md) | 8 |
| [scripts/acp-ws-bridge](../modules/scripts/acp-ws-bridge.md) | 2 |
| [scripts/internal](../modules/scripts/internal.md) | 1 |
| [tools/synthesis-index-harness](../modules/tools/synthesis-index-harness.md) | 1 |
| [tools/synthesis-index-harness/static](../modules/tools/synthesis-index-harness/static.md) | 1 |

## 关键符号

本层中被其他节点引用较多、值得单独成页的符号。

| 符号 | 类型 | 复杂度 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- |
| [SkillRunnerProvider](../symbols/src/providers/skillrunner/provider.ts/SkillRunnerProvider.md) | 类 | 复杂 | 1 | SkillRunner Provider 实现：校验后端协议兼容性、解析管理认证、按请求种类分派到 client，并声明模型、effort、缓存与超时等运行时选项 schema。 |
| [buildCanonicalInputs](../symbols/globals.md) | 函数 | 复杂 | 1 | 把 Zotero 条目与插件侧 canonical 行合并为聚类输入，做规范化、指纹计算与冲突候选筛选。 |
| [writeRun](../symbols/globals.md) | 函数 | 复杂 | 1 | 把一次聚类运行及其匹配结果写入调试库，记录指纹、耗时与配置以便复现。 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [.env.example](../files/.env.example.md) | 配置 | — | 开发环境变量样例：Zotero 二进制路径、profile 与数据目录、本地内容根目录（ZOTERO_AGENTS_CONTENT_DEV_ROOT），以及内容源发布用的 GitHub/Gitee Token 占位。 |
| [.gitattributes](../files/.gitattributes.md) | 文件 | — | Git 属性文件，仅一条规则 `* text=auto eol=lf`，统一全仓库以 LF 换行并由 Git 自动规范文本文件行尾，避免跨平台 diff 噪声。 |
| [.gitmodules](../files/.gitmodules.md) | 文件 | — | Git submodule 声明文件，登记 Zotero-7/9/10 三个固定版本源码基线与 literature-* Skill 子模块的 URL 与固定 commit。 |
| [.prettierignore](../files/.prettierignore.md) | 文件 | — | Prettier 排除清单，跳过 agent 工具配置目录、构建产物与 bundle、skills/workflows 内置定义、openspec 工件、文档与参考源码基线 submodule、测试 fixtures 及历史工件目录。 |
| [.worktreeinclude](../files/.worktreeinclude.md) | 文件 | — | Git worktree 自动携带清单，让新建 worktree 继承被 gitignore 但本地开发必需的 `.env` 与各类 agent 工具本地配置目录。 |
| [content-package.version.json](../files/content-package.version.json.md) | 配置 | — | 内置内容包（官方工作流订阅源）的版本身份文件，声明 schema、版本号、content_api 及对插件版本、Zotero 版本的兼容区间。 |
| [eslint.config.mjs](../files/eslint.config.mjs.md) | 文件 | — | ESLint 扁平配置：汇总 zotero 插件基础规则，并按 scripts/tests/src/sidebar/dashboard/synthesis 分区覆写规则，同时排除生成目录与参考源码；其中 Synthesis 组件层用 no-restricted-imports 强制只允许页面同级、shared 与 preact 导入。 |
| [package.json](../files/package.json.md) | 配置 | — | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [scripts/acp-ws-bridge/build-acp-ws-bridge.mjs](../files/scripts/acp-ws-bridge/build-acp-ws-bridge.mjs.md) | 文件 | — | ACP WS Bridge 的构建驱动脚本，解析命令行参数后调用 cargo 交叉编译，把产物复制到 addon/bin 的按平台目录。 |
| [scripts/acp-ws-bridge/package-acp-ws-bridge.mjs](../files/scripts/acp-ws-bridge/package-acp-ws-bridge.mjs.md) | 文件 | — | 将已构建的 ACP WS Bridge 二进制打包成可发布资产，生成压缩包与校验摘要供 CI 发布流程使用。 |
| [scripts/build-help-docs.ts](../files/scripts/build-help-docs.ts.md) | 文件 | — | 帮助中心文档生成器：读取多语言 Markdown 源文档，重写内部链接、转换 admonition 与图片引用，生成 sidebar 配置、复制图片资产并校验输出目录。 |
| [scripts/check-localization-governance.ts](../files/scripts/check-localization-governance.ts.md) | 文件 | — | 本地化治理检查脚本，比对各语言 FTL 键集合、抽取 Synthesis Workbench 与 Dashboard 页面中的 UI 硬编码文案，并核对默认值一致性。 |
| [scripts/check-runtime-diagnostics-release-elision.ts](../files/scripts/check-runtime-diagnostics-release-elision.ts.md) | 文件 | — | 发布门禁脚本：用 esbuild 按诊断开关的多种组合打包 src/index.ts，验证 runtime diagnostics 与 Synthesis sidecar 诊断代码在正式构建中被完全消除。 |
| [scripts/check-skillrunner-ssot-invariants.ts](../files/scripts/check-skillrunner-ssot-invariants.ts.md) | 文件 | — | CI 治理脚本：校验 SkillRunner 单一事实源（SSOT）的不变量文件，检查 current 快照与 facts/ref 引用是否一致、结构是否完整。 |
| [scripts/ci-gate-plan.ts](../files/scripts/ci-gate-plan.ts.md) | 文件 | — | CI 门禁阶段编排的唯一事实源，按 gate 名称返回需要依次执行的 stage 列表，供 run-ci-gate 驱动实际命令。 |
| [scripts/clear-acp-chat-records.ts](../files/scripts/clear-acp-chat-records.ts.md) | 文件 | — | 一键清理 ACP Chat 会话记录的命令行薄封装，复用 runtime 持久化治理 CLI 的分类清理能力。 |
| [scripts/clear-acp-skills-records.ts](../files/scripts/clear-acp-skills-records.ts.md) | 文件 | — | 一键清理 ACP Skills 运行记录的命令行薄封装，与 Chat 清理入口共享同一治理 CLI。 |
| [scripts/clear-skillrunner-records.ts](../files/scripts/clear-skillrunner-records.ts.md) | 文件 | — | 一键清理旧版 SkillRunner 运行记录的命令行入口，便于本地开发时重置后端状态。 |
| [scripts/content-package/build-canonical-literature-validators.ts](../files/scripts/content-package/build-canonical-literature-validators.ts.md) | 文件 | — | 为 canonical literature 工作流包生成校验器配置，把契约定义编译成内容包可消费的验证规则。 |
| [scripts/content-package/build-content-package-feed.ts](../files/scripts/content-package/build-content-package-feed.ts.md) | 文件 | — | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [scripts/content-package/build-literature-deep-reading-graph-renderer.ts](../files/scripts/content-package/build-literature-deep-reading-graph-renderer.ts.md) | 文件 | — | 构建 literature-deep-reading 内容包的图渲染器：把 workbench 文案的 i18n envelope 注入渲染器源码并输出到内容包目录。 |
| [scripts/content-package/bump-content-package-version.ts](../files/scripts/content-package/bump-content-package-version.ts.md) | 文件 | — | 内容包版本提升工具：解析 patch/minor/major 或显式 semver 目标，强制单调递增后写回 content-package.version.json。 |
| [scripts/content-package/check-builtin-workflow-manifest.ts](../files/scripts/content-package/check-builtin-workflow-manifest.ts.md) | 文件 | — | 校验内置工作流包清单与实际文件树是否一致，检查路径规范化、必需文件存在性与清单条目匹配。 |
| [scripts/content-package/check-content-package-release.ts](../files/scripts/content-package/check-content-package-release.ts.md) | 文件 | — | 内容包发布校验脚本：拉取 GitHub 上的 feed 与 release 资产，与本地重建结果交叉比对包签名、sha256 和字节数，确保已发布内容与仓库一致。 |
| [scripts/content-package/content-package-channels.ts](../files/scripts/content-package/content-package-channels.ts.md) | 文件 | — | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |
| [scripts/content-package/prepare-content-package-release.ts](../files/scripts/content-package/prepare-content-package-release.ts.md) | 文件 | — | 内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。 |
| [scripts/content-package/publish-content-package-feeds.ts](../files/scripts/content-package/publish-content-package-feeds.ts.md) | 文件 | — | 内容包 feed 发布脚本：把构建好的 feed 资产提交并推送到 content-feed 分支，支持多频道与镜像仓库，并生成该分支的索引 README。 |
| [scripts/content-package/publish-content-package-github.ts](../files/scripts/content-package/publish-content-package-github.ts.md) | 文件 | — | 内容包发布脚本：解析发布参数、计算资产 SHA-256，并通过 gh CLI 把工作流包资产上传到 GitHub Release。 |
| [scripts/content-package/publish-skills.ps1](../files/scripts/content-package/publish-skills.ps1.md) | 文件 | — | PowerShell 编写的 Skill 包发布脚本，负责组装 skills 资产、生成摘要并在 Windows 上完成上传。 |
| [scripts/e2e-single-markdown-live.ts](../files/scripts/e2e-single-markdown-live.ts.md) | 文件 | — | 端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。 |
| [scripts/github-workflow-run.ts](../files/scripts/github-workflow-run.ts.md) | 文件 | — | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |
| [scripts/host-bridge/build-zotero-bridge-cli.mjs](../files/scripts/host-bridge/build-zotero-bridge-cli.mjs.md) | 文件 | — | Zotero Bridge CLI 构建脚本，检测运行平台、确保 cargo-zigbuild 可用，按七个目标平台交叉编译并输出到 addon/bin。 |
| [scripts/host-bridge/check-host-bridge-agent-language.ts](../files/scripts/host-bridge/check-host-bridge-agent-language.ts.md) | 文件 | — | 治理校验脚本：检查 Host Bridge 面向代理的 surface 文案是否符合 agent 语言规范（可执行指令、证据要求、完成条件等），是 AGENTS.md 中 agent-facing surface 硬约束的自动化闸门。 |
| [scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs](../files/scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs.md) | 文件 | — | Host Bridge CLI 预构建新鲜度检查：比对 Cargo 源码构建指纹、已发布 release manifest 与 addon/bin 下各平台二进制 sha256 是否一致。 |
| [scripts/host-bridge/check-host-bridge-consumer-guidance.ts](../files/scripts/host-bridge/check-host-bridge-consumer-guidance.ts.md) | 文件 | — | 治理校验脚本：对照 Host Bridge 命令契约检查各 surface 文档中的消费者指引是否齐备且与命令定义一致，防止文案与契约漂移。 |
| [scripts/host-bridge/check-host-bridge-skill-packages.ts](../files/scripts/host-bridge/check-host-bridge-skill-packages.ts.md) | 文件 | — | Host Bridge Skill 包治理门禁：统计每个 SKILL.md 的实质指令行数与 prose 字符数，与固定 baseline 比对厚度，检查重复段落、直接引用深度与生成的命令卡片迁移状态。 |
| [scripts/host-bridge/check-plugin-host-bridge-assets.ts](../files/scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | 文件 | — | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs](../files/scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs.md) | 文件 | — | 校验 Host Bridge CLI 预编译二进制的身份文件：读取构建 recipe 与 identity JSON，确认平台、版本与摘要一致。 |
| [scripts/host-bridge/dispatch-host-bridge-release.ts](../files/scripts/host-bridge/dispatch-host-bridge-release.ts.md) | 文件 | — | Host Bridge 正式发布派发脚本：确认 ref 必须是 main、不可变发布源可达且本地门禁通过后，派发并观察 release-host-bridge 工作流。 |
| [scripts/host-bridge/host-bridge-agent-surface.ts](../files/scripts/host-bridge/host-bridge-agent-surface.ts.md) | 文件 | — | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [scripts/host-bridge/host-bridge-cli-release-governance.mjs](../files/scripts/host-bridge/host-bridge-cli-release-governance.mjs.md) | 文件 | — | Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。 |
| [scripts/host-bridge/host-bridge-command-contracts.ts](../files/scripts/host-bridge/host-bridge-command-contracts.ts.md) | 文件 | — | Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。 |
| [scripts/host-bridge/host-bridge-release-controller.ts](../files/scripts/host-bridge/host-bridge-release-controller.ts.md) | 文件 | — | Host Bridge 发布 receipt 状态机：创建 receipt、按事件推进状态，并原子写出受治理的发布身份文件与 surface 更新记录。 |
| [scripts/host-bridge/host-bridge-release-plan.ts](../files/scripts/host-bridge/host-bridge-release-plan.ts.md) | 文件 | — | 计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。 |
| [scripts/host-bridge/host-bridge-release-set.ts](../files/scripts/host-bridge/host-bridge-release-set.ts.md) | 文件 | — | 维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。 |
| [scripts/host-bridge/host-bridge-review-mirror.ts](../files/scripts/host-bridge/host-bridge-review-mirror.ts.md) | 文件 | — | 构建 Host Bridge surface 的审阅镜像：把物化后的 skill/reference 文档与基线做逐条映射，统计 unmapped、downgraded、unauthorized dropped 与重复项，支撑语义 parity 审阅。 |
| [scripts/host-bridge/host-bridge-semantic-review-context.ts](../files/scripts/host-bridge/host-bridge-semantic-review-context.ts.md) | 文件 | — | 依据 git 变更文件分类出语义审阅上下文：区分语义源码、spec 层、Profile/包发布元数据、生成目标与 agent 控制契约，产出审阅重点。 |
| [scripts/host-bridge/host-bridge-surface-catalog.ts](../files/scripts/host-bridge/host-bridge-surface-catalog.ts.md) | 文件 | — | 枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。 |
| [scripts/host-bridge/host-bridge-surface-model.ts](../files/scripts/host-bridge/host-bridge-surface-model.ts.md) | 文件 | — | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |
| [scripts/host-bridge/host-bridge-surface-version.ts](../files/scripts/host-bridge/host-bridge-surface-version.ts.md) | 文件 | — | 基于 surface model 推导 Host Bridge surface 版本号与变更标识，供 release set 和渲染层判断是否需要重建。 |
| [scripts/host-bridge/host-bridge-version-intent.ts](../files/scripts/host-bridge/host-bridge-version-intent.ts.md) | 文件 | — | 解析仓库中声明的 Host Bridge 版本意图（期望的 surface/发布版本），供发布准备阶段与实际结果做一致性校验。 |
| [scripts/host-bridge/host-bridge-workflow-catalog.ts](../files/scripts/host-bridge/host-bridge-workflow-catalog.ts.md) | 文件 | — | 构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。 |
| [scripts/host-bridge/materialize-host-bridge-surfaces.ts](../files/scripts/host-bridge/materialize-host-bridge-surfaces.ts.md) | 文件 | — | 把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。 |
| [scripts/host-bridge/package-zotero-bridge-cli.mjs](../files/scripts/host-bridge/package-zotero-bridge-cli.mjs.md) | 文件 | — | 把 Zotero Bridge CLI 的各平台二进制与身份文件打包为发布资产，生成压缩包和校验摘要。 |
| [scripts/host-bridge/prebuild-zotero-bridge-cli.ts](../files/scripts/host-bridge/prebuild-zotero-bridge-cli.ts.md) | 文件 | — | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |
| [scripts/host-bridge/prepare-host-bridge-release.ts](../files/scripts/host-bridge/prepare-host-bridge-release.ts.md) | 文件 | — | Host Bridge 发布准备入口：编排 release plan 与版本意图检查，输出可渲染、可发布的受治理工件状态。 |
| [scripts/host-bridge/publish-host-bridge-cli-bundle.ps1](../files/scripts/host-bridge/publish-host-bridge-cli-bundle.ps1.md) | 文件 | — | 把 addon/bin 下预编译的 Host Bridge CLI 二进制连同 zotero-bridge-cli wrapper skill 物化到一条隔离 git 分支：校验每个平台的 sha256 与 release-set 身份，在临时 worktree 里组装 manifest.json 后提交，并可选推送到远端。 |
| [scripts/host-bridge/publish-zotero-librarian-profile.ps1](../files/scripts/host-bridge/publish-zotero-librarian-profile.ps1.md) | 文件 | — | 把 profiles/hermes/zotero-librarian 下的 Hermes Profile 源连同 addon/bin 的 Host Bridge CLI 二进制发布到独立的 zotero-librarian-profile 仓库：校验 release-set schema 与 profile 版本一致性，生成 manifest.json 后 clone/commit/push。 |
| [scripts/host-bridge/publish-zotero-library-agent-bundle.ps1](../files/scripts/host-bridge/publish-zotero-library-agent-bundle.ps1.md) | 文件 | — | 把 zotero-library-agent skill、zotero-bridge-cli wrapper skill、evidence bundle schema、helper 脚本与 Host Bridge CLI 二进制组装成 zotero-library-agent-bundle 发布仓库，校验 cli-release.json 摘要后生成 manifest 并推送。 |
| [scripts/host-bridge/render-host-bridge-release-set.ts](../files/scripts/host-bridge/render-host-bridge-release-set.ts.md) | 文件 | — | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |
| [scripts/host-bridge/render-host-bridge-surfaces.ts](../files/scripts/host-bridge/render-host-bridge-surfaces.ts.md) | 文件 | — | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |
| [scripts/host-bridge/render-host-mutation-contract.ts](../files/scripts/host-bridge/render-host-mutation-contract.ts.md) | 文件 | — | 构建期脚本，把 canonical mutation 的 JSON Schema 渲染成 Host Bridge agent-facing 契约文本，保证代理侧看到的 mutation 语义与插件侧 schema 同源。 |
| [scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts](../files/scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts.md) | 文件 | — | Host Bridge CLI 预构建暂存脚本：把本地预构建目录以固定时间戳与权限复制进目标资产树，使 stage 结果字节可复现。 |
| [scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts](../files/scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | 文件 | — | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |
| [scripts/host-bridge/zotero-bridge-cli-release.ts](../files/scripts/host-bridge/zotero-bridge-cli-release.ts.md) | 文件 | — | 声明 Host Bridge CLI 预编译二进制的发布身份（七平台目录与身份文件），供 release set 渲染与校验引用。 |
| [scripts/inspect-literature-analysis.ts](../files/scripts/inspect-literature-analysis.ts.md) | 文件 | — | 调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。 |
| [scripts/inspect-single-markdown-request.ts](../files/scripts/inspect-single-markdown-request.ts.md) | 文件 | — | 调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。 |
| [scripts/internal/cleanup-runtime-category-cli.ts](../files/scripts/internal/cleanup-runtime-category-cli.ts.md) | 文件 | — | 运行时持久化目录分类清理 CLI：扫描 runtime 数据树并按类别删除/保留条目，供 clear-* 脚本与运维流程调用。 |
| [scripts/migrate-persistence-governance.mjs](../files/scripts/migrate-persistence-governance.mjs.md) | 文件 | — | 持久化治理迁移脚本：检测遗留镜像目录，计划文件与目录的受控复制，校验目标可写性并对变更前后摘要做一致性检查。 |
| [scripts/mock-skillrunner-serve.ts](../files/scripts/mock-skillrunner-serve.ts.md) | 文件 | — | 本地 Mock SkillRunner 服务，提供旧版后端的最小 HTTP 契约实现，供插件开发与集成测试使用。 |
| [scripts/patch-zotero-test-runner.ts](../files/scripts/patch-zotero-test-runner.ts.md) | 文件 | — | Zotero 测试 runner 页面补丁：向生成的 test_runner.html 注入事件回传、诊断桥与失败时自动 dump，使 mocha 结果可被外部进程采集。 |
| [scripts/record-acp-runtime-governance-baseline.ts](../files/scripts/record-acp-runtime-governance-baseline.ts.md) | 文件 | — | 录制 ACP 运行时性能治理基线，把当前 profiler 快照渲染成 Markdown 基线文件，用于后续回归对比。 |
| [scripts/release-coordinator-gate.ts](../files/scripts/release-coordinator-gate.ts.md) | 文件 | — | 发布协调门禁：比对本地与远端 main/tag/GitHub Release 状态，判定 Host Bridge 与内容包的发布阻塞项，并给出下一步动作与建议命令。 |
| [scripts/run-ci-gate.ts](../files/scripts/run-ci-gate.ts.md) | 文件 | — | CI 门禁执行入口：按 ci-gate-plan 提供的阶段列表逐个调用对应 npm script，任一阶段失败即整体失败。 |
| [scripts/run-node-test-shards.ts](../files/scripts/run-node-test-shards.ts.md) | 文件 | — | Node 测试分片运行器：收集测试文件、按编号分片、构造 mocha 参数与环境变量、支持失败重跑与分片清单输出。 |
| [scripts/run-zotero-compatibility-matrix.ts](../files/scripts/run-zotero-compatibility-matrix.ts.md) | 文件 | — | Zotero 兼容性矩阵 runner：解析 CLI、校验构建产物身份、逐单元格物化真实宿主并调用 worker 执行 E2E，收集 run manifest、运行时证据与 weekly 重试结果写入 receipt。 |
| [scripts/run-zotero-compatibility-worker.ts](../files/scripts/run-zotero-compatibility-worker.ts.md) | 文件 | — | 兼容性矩阵 worker 入口：在隔离的 run 目录中物化测试工作区与宿主链接，按 mode/domain/lane 解析测试条目并执行，同时回传宿主事实事件。 |
| [scripts/run-zotero-direct.ts](../files/scripts/run-zotero-direct.ts.md) | 文件 | — | 本地直启 Zotero 的启动器：写入 dev prefs、经 RDP 安装临时插件（不需要 XPI），并可暂存 Synthesis sidecar 运行时资产与本地 runtime root 偏好。 |
| [scripts/run-zotero-e2e-stress.ts](../files/scripts/run-zotero-e2e-stress.ts.md) | 文件 | — | Citation Graph 生命周期压力测试入口：设置合成关闭循环次数与真实库开关后，转调统一的 Zotero E2E 命令。 |
| [scripts/run-zotero-full-suite.ts](../files/scripts/run-zotero-full-suite.ts.md) | 文件 | — | Zotero E2E 全量套件的启动脚本，按顺序 spawn 各阶段 npm 步骤并把失败输出直接转发到控制台。 |
| [scripts/run-zotero-start-with-mock.ts](../files/scripts/run-zotero-start-with-mock.ts.md) | 文件 | — | 带 mock SkillRunner 的启动脚本：先拉起本地 mock 后端并等待就绪，再以受控环境启动 Zotero，退出时负责终止全部子进程。 |
| [scripts/run-zotero-test-with-mock.ts](../files/scripts/run-zotero-test-with-mock.ts.md) | 文件 | — | 带 mock SkillRunner 的 Zotero 测试总入口：解析被包裹的测试目标、构造 E2E 环境与 fixture、启动 mock 后端、执行 mocha 或 Zotero 测试，并汇总 run manifest 与原生崩溃证据。 |
| [scripts/runtime-diagnostics-esbuild.ts](../files/scripts/runtime-diagnostics-esbuild.ts.md) | 文件 | — | runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。 |
| [scripts/runtime-diagnostics-production-manifest.ts](../files/scripts/runtime-diagnostics-production-manifest.ts.md) | 文件 | — | runtime diagnostics 正式构建清单的单一事实源：声明各诊断特性组的开关、define、独占模块、禁止出现的 marker 与静态豁免项。 |
| [scripts/sync-gitee-publication.ts](../files/scripts/sync-gitee-publication.ts.md) | 文件 | — | 把插件发布物与工作流包同步到 Gitee 的发布脚本，负责 release 资产下载校验、插件引用推送以及工作流 feed 分支更新。 |
| [scripts/sync-gitee-release.ts](../files/scripts/sync-gitee-release.ts.md) | 文件 | — | 通过 Gitee OpenAPI 创建/更新 Release 并重新上传 xpi 等附件，附 sha256 校验与远端资产比对，确保发布资产与本地一致。 |
| [scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts](../files/scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts.md) | 文件 | — | 产物库 debug surface 一致性检查：比对 production surface 语料与 sidecar system 契约，确认 debug 面板所需的每个 operation 都被声明。 |
| [scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts](../files/scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts.md) | 文件 | — | 引用图谱 surface 一致性检查：校验引用图谱相关 operation 在契约、语料与基线 fixture 三侧齐备。 |
| [scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts](../files/scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts.md) | 文件 | — | 概念-主题图谱 surface 一致性检查：校验概念知识库与主题关系图谱 operation 的跨语言契约覆盖情况。 |
| [scripts/synthesis/check-synthesis-cross-language-contracts.ts](../files/scripts/synthesis/check-synthesis-cross-language-contracts.ts.md) | 文件 | — | 跨语言契约检查脚本：递归比对 TS 契约 schema 与 Rust 侧协议注册表，验证结构、协议引用与必填字段在两种语言实现中保持一致。 |
| [scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts](../files/scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts.md) | 文件 | — | 原生运行时契约一致性检查：比对 Rust 侧运行时 bundle 指针、launch config 与 discovery schema 是否与 TS 契约对齐。 |
| [scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts](../files/scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts.md) | 文件 | — | 原生 worker 传输一致性检查：校验 citation graph build 的输入/输出分页与 transfer manifest 在引擎与 sidecar 之间的归属一致。 |
| [scripts/synthesis/check-synthesis-production-capabilities.ts](../files/scripts/synthesis/check-synthesis-production-capabilities.ts.md) | 文件 | — | 生产 capability 契约检查：验证 sidecar system 声明的 capability 集合、operation policy、语义成功规则与 CLI 暴露面一致。 |
| [scripts/synthesis/check-synthesis-production-route-performance.ts](../files/scripts/synthesis/check-synthesis-production-route-performance.ts.md) | 文件 | — | 性能门禁脚本：经 Synthesis 生产路由执行 topic 数据集写入、标签效果与 maintenance 操作，采集延迟与降级信号并生成 P50/P95 性能报告。 |
| [scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts](../files/scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts.md) | 文件 | — | canonical reference surface 一致性检查：校验引用 canonical 化相关 operation 在契约与语料侧的覆盖与边界。 |
| [scripts/synthesis/check-synthesis-rust-license-inventory.ts](../files/scripts/synthesis/check-synthesis-rust-license-inventory.ts.md) | 文件 | — | 治理校验脚本，读取 Synthesis 侧车的 Cargo.lock 并核对每个 crate 的许可证是否登记在允许清单中。 |
| [scripts/synthesis/check-synthesis-service-boundary.ts](../files/scripts/synthesis/check-synthesis-service-boundary.ts.md) | 文件 | — | Synthesis 侧车服务边界巡检脚本，遍历仓库源码查找越界模式（生产代码引用测试设施、跨契约层导入等）并以 CLI 结果报告违规。 |
| [scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts](../files/scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts.md) | 文件 | — | Synthesis sidecar 运行时新鲜度检查：按七平台目标逐一验证 addon 内 bundle 的构建指纹与当前源码是否一致。 |
| [scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts](../files/scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts.md) | 文件 | — | 校验已构建的 XPI 内是否携带与目标平台匹配的 Synthesis sidecar 运行时 bundle，并按构建指纹判定其新鲜度。 |
| [scripts/synthesis/check-synthesis-tag-surface-parity.ts](../files/scripts/synthesis/check-synthesis-tag-surface-parity.ts.md) | 文件 | — | 标签 surface 一致性检查：校验标签词表相关 operation 的契约、语料与基线一致。 |
| [scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts](../files/scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts.md) | 文件 | — | 主题工作台 surface 一致性检查：校验 workbench 消费的 operation 集合与 sidecar 契约声明齐备。 |
| [scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts](../files/scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts.md) | 文件 | — | WebDAV 维护 surface 一致性检查：校验 public maintenance operation 的 capability、路由与语料声明一致。 |
| [scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts](../files/scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | 文件 | — | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [scripts/synthesis/dispatch-synthesis-sidecar-release.ts](../files/scripts/synthesis/dispatch-synthesis-sidecar-release.ts.md) | 文件 | — | 触发正式 runtime release 的 workflow dispatch 脚本，先校验 checkout 处于预期分支与干净状态，再派发发布流水线。 |
| [scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts](../files/scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts.md) | 文件 | — | 从 GitHub Actions artifact 下载 Synthesis sidecar runtime 压缩包并解包到本地 tar.gz 缓存，同时校验目标三元组与摘要。 |
| [scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts](../files/scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts.md) | 文件 | — | 为已构建的 Synthesis sidecar runtime 生成符号清单（symbol manifest）并打包，支撑崩溃栈符号化与发布证据链。 |
| [scripts/synthesis/package-synthesis-sidecar-runtime.ts](../files/scripts/synthesis/package-synthesis-sidecar-runtime.ts.md) | 文件 | — | Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。 |
| [scripts/synthesis/prepare-synthesis-sidecar-release.ts](../files/scripts/synthesis/prepare-synthesis-sidecar-release.ts.md) | 文件 | — | 正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。 |
| [scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts](../files/scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts.md) | 文件 | — | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |
| [scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts](../files/scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts.md) | 文件 | — | 解析并复用最近可用的 sidecar runtime 缓存：列举 workflow runs 与 artifact，按目标三元组和摘要选定可下载的缓存命中。 |
| [scripts/synthesis/resolve-synthesis-sidecar-verification.ts](../files/scripts/synthesis/resolve-synthesis-sidecar-verification.ts.md) | 文件 | — | 解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。 |
| [scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts](../files/scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts.md) | 文件 | — | Rust sidecar durable candidate 冒烟脚本：以真实子进程启动 sidecar，覆盖 loopback 转发、reverse host fixture、饱和、布局与 citation graph build 等生产路径。 |
| [scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts](../files/scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts.md) | 文件 | — | Rust sidecar worker 冒烟脚本：拉起 sidecar 的 worker 子进程，校验 provenance 指纹并对 worker 协议做一次 layout 请求往返。 |
| [scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts](../files/scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts.md) | 文件 | — | 把预构建归档按目标三元组暂存到本地 store 目录，先断言目标目录集合精确匹配再落盘，避免目录漂移。 |
| [scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts](../files/scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts.md) | 文件 | — | 从远端预构建分支同步 sidecar runtime 归档到本地 store，按目标三元组增量复制并保持集合与远端一致。 |
| [scripts/synthesis/synthesis-native-stage1-suite.ts](../files/scripts/synthesis/synthesis-native-stage1-suite.ts.md) | 文件 | — | 把 Synthesis 原生 stage1 测试按 core 模块编号聚合为一个套件定义，供 Node 测试分片调度器统一执行。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts](../files/scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts.md) | 文件 | — | runtime release 回执的状态机控制器：创建初始回执并按阶段推进状态，保证发布生命周期有唯一可追踪记录。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts](../files/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts.md) | 文件 | — | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts](../files/scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts.md) | 文件 | — | 把 release set 展开为可执行的 release plan，列出每个目标三元组及其对应的预构建结果。 |
| [scripts/synthesis/synthesis-sidecar-runtime-release-set.ts](../files/scripts/synthesis/synthesis-sidecar-runtime-release-set.ts.md) | 文件 | — | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |
| [scripts/synthesis/synthesisProductionSurfaceCorpora.ts](../files/scripts/synthesis/synthesisProductionSurfaceCorpora.ts.md) | 文件 | — | 生产 surface 语料库：定义各 surface 的 schema、codec、基线 fixture、请求/响应字节边界与 operation 清单，并读取基线证据用于一致性检查。 |
| [scripts/system-e2e/acceptance.ts](../files/scripts/system-e2e/acceptance.ts.md) | 文件 | — | 系统级 E2E 的验收评估器：读取候选 XPI 产物，判定单个执行 cell 与整个候选矩阵是否达到发布验收门槛。 |
| [scripts/system-e2e/calibration.ts](../files/scripts/system-e2e/calibration.ts.md) | 文件 | — | E2E 校准与晋级策略：校验校准轮次的结构事实，评估分组聚合结果，并判定当前轮次是否达到晋级为金例的条件。 |
| [scripts/system-e2e/familyLifecycle.ts](../files/scripts/system-e2e/familyLifecycle.ts.md) | 文件 | — | E2E 用例族的生命周期管理：声明族成员、解析选择、校验声明完整性，并按阶段驱动族的执行与健康判定。 |
| [scripts/system-e2e/fixture.ts](../files/scripts/system-e2e/fixture.ts.md) | 文件 | — | E2E fixture 注册表与已提交 seed 的治理模块：校验结构事实、可移植性与隐私约束，并把 seed 物化到只读测试工作区。 |
| [scripts/system-e2e/healthGate.ts](../files/scripts/system-e2e/healthGate.ts.md) | 文件 | — | Zotero 系统 E2E 的健康门禁：在跑全量用例前校验 sidecar 可用、宿主命令可解析、mutation authority 正常等前置条件。 |
| [scripts/system-e2e/manifest.ts](../files/scripts/system-e2e/manifest.ts.md) | 文件 | — | 系统 E2E run manifest 的构造与持久化模块：分类 artifact 引用、创建 manifest 与事件收集器，并原子落盘。 |
| [scripts/system-e2e/runtimeEvidence.ts](../files/scripts/system-e2e/runtimeEvidence.ts.md) | 文件 | — | 采集单个执行 cell 的运行时证据：读取已安装 sidecar runtime、会话记录与运行日志，按 schema 输出可归档证据文档。 |
| [scripts/system-e2e/weeklyRetry.ts](../files/scripts/system-e2e/weeklyRetry.ts.md) | 文件 | — | 周期性重试策略：按周窗口统计失败用例，对稳定复现的失败安排重试，避免偶发失败直接阻塞发布。 |
| [scripts/ui-harness-serve.ts](../files/scripts/ui-harness-serve.ts.md) | 文件 | — | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |
| [scripts/update-skillrunner-runtime-feed.ts](../files/scripts/update-skillrunner-runtime-feed.ts.md) | 文件 | — | 更新 SkillRunner 运行时 feed 的脚本，规范化版本与插件版本区间后重写 feed 条目并输出变更记录。 |
| [scripts/zip-archive.ts](../files/scripts/zip-archive.ts.md) | 文件 | — | 零依赖 zip 归档读取器：直接解析 EOCD 与中央目录，按条目返回压缩方法与解压后尺寸，供 XPI 资产校验使用。 |
| [scripts/zotero-compatibility-fixture.ts](../files/scripts/zotero-compatibility-fixture.ts.md) | 文件 | — | Zotero 兼容性矩阵的核心 fixture 模块：校验 manifest、解析目标、获取并物化 Zotero 宿主安装树、运行受管子进程并产出回执。 |
| [scripts/zotero-native-crash-capture.ts](../files/scripts/zotero-native-crash-capture.ts.md) | 文件 | — | Zotero 原生崩溃捕获模块：在私有目录布置崩溃 fixture，用 Windows cdb 生成并解析转储，采集进程与平台证据并落盘摘要。 |
| [scripts/zotero-native-crash-env.ps1](../files/scripts/zotero-native-crash-env.ps1.md) | 文件 | — | 为 Zotero 原生崩溃复现准备环境变量的 PowerShell 脚本，设置崩溃转储与调试相关环境并启动宿主。 |
| [tools/synthesis-index-harness/cli.ts](../files/tools/synthesis-index-harness/cli.ts.md) | 文件 | — | Synthesis 索引 Harness 命令行工具：只读提取 Zotero 库与插件调试数据库条目，构建 canonical reference 聚类输入并跑引用匹配，结果写入调试库，同时提供只读 HTTP 查询服务。 |
| [tools/synthesis-index-harness/static/index.html](../files/tools/synthesis-index-harness/static/index.html.md) | 文件 | — | Synthesis 索引 harness 的静态页面骨架，提供只读索引状态面板的固定区域容器。 |
| [tsconfig.dashboard.json](../files/tsconfig.dashboard.json.md) | 配置 | — | Dashboard 页面的 TypeScript 子配置：启用 Preact JSX（react-jsx / preact）与 DOM lib，noEmit 检查 src/dashboard、src/shared 与 synthesis-contracts 源码。 |
| [tsconfig.json](../files/tsconfig.json.md) | 配置 | — | 主 TypeScript 配置：继承 zotero-types 的 sandbox 条目，只开启 allowImportingTsExtensions；纳入 src、typings 与 packages/*/src，并显式排除 dashboard、synthesis 与 sidebar 组件等由子配置负责的范围。 |
| [tsconfig.sidebar.json](../files/tsconfig.sidebar.json.md) | 配置 | — | 侧边栏页面的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/sidebar 的 .ts/.tsx、src/shared 与 synthesis-contracts 源码。 |
| [tsconfig.synthesis.json](../files/tsconfig.synthesis.json.md) | 配置 | — | Synthesis 工作台的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/synthesis、synthesisWorkbenchApp.ts、src/shared 与 synthesis-contracts 源码。 |
| [zotero-plugin.config.ts](../files/zotero-plugin.config.ts.md) | 文件 | — | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Synthesis 领域与侧车](synthesis-domain.md) | 51 | imports×50、configures×1 |
| [插件外壳与核心运行时](plugin-core.md) | 14 | imports×10、configures×4 |
| [工作流引擎与执行](workflow-engine.md) | 14 | imports×13、configures×1 |
| [页面与交互界面](ui-surface.md) | 13 | imports×8、configures×5 |
| [Agent 协议与后端运行时](agent-runtime.md) | 5 | imports×5 |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 2 | imports×2 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [Zotero 宿主与 Bridge 集成](zotero-host.md) | 21 | defines_schema×21 |
| [页面与交互界面](ui-surface.md) | 10 | imports×10 |
| [插件外壳与核心运行时](plugin-core.md) | 8 | imports×8 |
| [工作流引擎与执行](workflow-engine.md) | 7 | imports×7 |
| [Agent 协议与后端运行时](agent-runtime.md) | 5 | imports×5 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 5 | defines_schema×4、imports×1 |

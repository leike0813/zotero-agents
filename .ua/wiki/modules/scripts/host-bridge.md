
# scripts/host-bridge
> 目录聚合页：34 个文件、205 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [scripts/host-bridge/build-zotero-bridge-cli.mjs](../../files/scripts/host-bridge/build-zotero-bridge-cli.mjs.md) | 文件 | 3 | Zotero Bridge CLI 构建脚本，检测运行平台、确保 cargo-zigbuild 可用，按七个目标平台交叉编译并输出到 addon/bin。 |
| [scripts/host-bridge/check-host-bridge-agent-language.ts](../../files/scripts/host-bridge/check-host-bridge-agent-language.ts.md) | 文件 | 4 | 治理校验脚本：检查 Host Bridge 面向代理的 surface 文案是否符合 agent 语言规范（可执行指令、证据要求、完成条件等），是 AGENTS.md 中 agent-facing surface 硬约束的自动化闸门。 |
| [scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs](../../files/scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs.md) | 文件 | 5 | Host Bridge CLI 预构建新鲜度检查：比对 Cargo 源码构建指纹、已发布 release manifest 与 addon/bin 下各平台二进制 sha256 是否一致。 |
| [scripts/host-bridge/check-host-bridge-consumer-guidance.ts](../../files/scripts/host-bridge/check-host-bridge-consumer-guidance.ts.md) | 文件 | 2 | 治理校验脚本：对照 Host Bridge 命令契约检查各 surface 文档中的消费者指引是否齐备且与命令定义一致，防止文案与契约漂移。 |
| [scripts/host-bridge/check-host-bridge-skill-packages.ts](../../files/scripts/host-bridge/check-host-bridge-skill-packages.ts.md) | 文件 | 10 | Host Bridge Skill 包治理门禁：统计每个 SKILL.md 的实质指令行数与 prose 字符数，与固定 baseline 比对厚度，检查重复段落、直接引用深度与生成的命令卡片迁移状态。 |
| [scripts/host-bridge/check-plugin-host-bridge-assets.ts](../../files/scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | 文件 | 7 | 插件 Host Bridge 资产校验：核对 zotero-bridge-release.json、七平台原生二进制、skill bundle zip 的 manifest、路径安全与 digest 是否一致。 |
| [scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs](../../files/scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs.md) | 文件 | 2 | 校验 Host Bridge CLI 预编译二进制的身份文件：读取构建 recipe 与 identity JSON，确认平台、版本与摘要一致。 |
| [scripts/host-bridge/dispatch-host-bridge-release.ts](../../files/scripts/host-bridge/dispatch-host-bridge-release.ts.md) | 文件 | 9 | Host Bridge 正式发布派发脚本：确认 ref 必须是 main、不可变发布源可达且本地门禁通过后，派发并观察 release-host-bridge 工作流。 |
| [scripts/host-bridge/host-bridge-agent-surface.ts](../../files/scripts/host-bridge/host-bridge-agent-surface.ts.md) | 文件 | 6 | 定义 Host Bridge agent-facing surface 的组装模型：把命令契约与共享契约投影为 skill/reference 文档的 agent 视角结构。 |
| [scripts/host-bridge/host-bridge-cli-release-governance.mjs](../../files/scripts/host-bridge/host-bridge-cli-release-governance.mjs.md) | 文件 | 20 | Host Bridge CLI 发布治理的单一事实源：构建配方读取、Cargo 源码指纹计算、patch/minor 版本提升、release manifest 读写与七平台二进制摘要登记。 |
| [scripts/host-bridge/host-bridge-command-contracts.ts](../../files/scripts/host-bridge/host-bridge-command-contracts.ts.md) | 文件 | 8 | Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。 |
| [scripts/host-bridge/host-bridge-release-controller.ts](../../files/scripts/host-bridge/host-bridge-release-controller.ts.md) | 文件 | 3 | Host Bridge 发布 receipt 状态机：创建 receipt、按事件推进状态，并原子写出受治理的发布身份文件与 surface 更新记录。 |
| [scripts/host-bridge/host-bridge-release-plan.ts](../../files/scripts/host-bridge/host-bridge-release-plan.ts.md) | 文件 | 5 | 计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。 |
| [scripts/host-bridge/host-bridge-release-set.ts](../../files/scripts/host-bridge/host-bridge-release-set.ts.md) | 文件 | 6 | 维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。 |
| [scripts/host-bridge/host-bridge-review-mirror.ts](../../files/scripts/host-bridge/host-bridge-review-mirror.ts.md) | 文件 | 11 | 构建 Host Bridge surface 的审阅镜像：把物化后的 skill/reference 文档与基线做逐条映射，统计 unmapped、downgraded、unauthorized dropped 与重复项，支撑语义 parity 审阅。 |
| [scripts/host-bridge/host-bridge-semantic-review-context.ts](../../files/scripts/host-bridge/host-bridge-semantic-review-context.ts.md) | 文件 | 11 | 依据 git 变更文件分类出语义审阅上下文：区分语义源码、spec 层、Profile/包发布元数据、生成目标与 agent 控制契约，产出审阅重点。 |
| [scripts/host-bridge/host-bridge-surface-catalog.ts](../../files/scripts/host-bridge/host-bridge-surface-catalog.ts.md) | 文件 | 3 | 枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。 |
| [scripts/host-bridge/host-bridge-surface-model.ts](../../files/scripts/host-bridge/host-bridge-surface-model.ts.md) | 文件 | 8 | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |
| [scripts/host-bridge/host-bridge-surface-version.ts](../../files/scripts/host-bridge/host-bridge-surface-version.ts.md) | 文件 | 1 | 基于 surface model 推导 Host Bridge surface 版本号与变更标识，供 release set 和渲染层判断是否需要重建。 |
| [scripts/host-bridge/host-bridge-version-intent.ts](../../files/scripts/host-bridge/host-bridge-version-intent.ts.md) | 文件 | 1 | 解析仓库中声明的 Host Bridge 版本意图（期望的 surface/发布版本），供发布准备阶段与实际结果做一致性校验。 |
| [scripts/host-bridge/host-bridge-workflow-catalog.ts](../../files/scripts/host-bridge/host-bridge-workflow-catalog.ts.md) | 文件 | 3 | 构建脚本：扫描内置工作流目录，按 manifest 契约投影成 Host Bridge 对外暴露的工作流目录文档。 |
| [scripts/host-bridge/materialize-host-bridge-surfaces.ts](../../files/scripts/host-bridge/materialize-host-bridge-surfaces.ts.md) | 文件 | 7 | 把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。 |
| [scripts/host-bridge/package-zotero-bridge-cli.mjs](../../files/scripts/host-bridge/package-zotero-bridge-cli.mjs.md) | 文件 | 0 | 把 Zotero Bridge CLI 的各平台二进制与身份文件打包为发布资产，生成压缩包和校验摘要。 |
| [scripts/host-bridge/prebuild-zotero-bridge-cli.ts](../../files/scripts/host-bridge/prebuild-zotero-bridge-cli.ts.md) | 文件 | 7 | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |
| [scripts/host-bridge/prepare-host-bridge-release.ts](../../files/scripts/host-bridge/prepare-host-bridge-release.ts.md) | 文件 | 0 | Host Bridge 发布准备入口：编排 release plan 与版本意图检查，输出可渲染、可发布的受治理工件状态。 |
| [scripts/host-bridge/publish-host-bridge-cli-bundle.ps1](../../files/scripts/host-bridge/publish-host-bridge-cli-bundle.ps1.md) | 文件 | 6 | 把 addon/bin 下预编译的 Host Bridge CLI 二进制连同 zotero-bridge-cli wrapper skill 物化到一条隔离 git 分支：校验每个平台的 sha256 与 release-set 身份，在临时 worktree 里组装 manifest.json 后提交，并可选推送到远端。 |
| [scripts/host-bridge/publish-zotero-librarian-profile.ps1](../../files/scripts/host-bridge/publish-zotero-librarian-profile.ps1.md) | 文件 | 4 | 把 profiles/hermes/zotero-librarian 下的 Hermes Profile 源连同 addon/bin 的 Host Bridge CLI 二进制发布到独立的 zotero-librarian-profile 仓库：校验 release-set schema 与 profile 版本一致性，生成 manifest.json 后 clone/commit/push。 |
| [scripts/host-bridge/publish-zotero-library-agent-bundle.ps1](../../files/scripts/host-bridge/publish-zotero-library-agent-bundle.ps1.md) | 文件 | 3 | 把 zotero-library-agent skill、zotero-bridge-cli wrapper skill、evidence bundle schema、helper 脚本与 Host Bridge CLI 二进制组装成 zotero-library-agent-bundle 发布仓库，校验 cli-release.json 摘要后生成 manifest 并推送。 |
| [scripts/host-bridge/render-host-bridge-release-set.ts](../../files/scripts/host-bridge/render-host-bridge-release-set.ts.md) | 文件 | 3 | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |
| [scripts/host-bridge/render-host-bridge-surfaces.ts](../../files/scripts/host-bridge/render-host-bridge-surfaces.ts.md) | 文件 | 28 | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |
| [scripts/host-bridge/render-host-mutation-contract.ts](../../files/scripts/host-bridge/render-host-mutation-contract.ts.md) | 文件 | 2 | 构建期脚本，把 canonical mutation 的 JSON Schema 渲染成 Host Bridge agent-facing 契约文本，保证代理侧看到的 mutation 语义与插件侧 schema 同源。 |
| [scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts](../../files/scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts.md) | 文件 | 3 | Host Bridge CLI 预构建暂存脚本：把本地预构建目录以固定时间戳与权限复制进目标资产树，使 stage 结果字节可复现。 |
| [scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts](../../files/scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | 文件 | 13 | Host Bridge CLI 预构建同步核心：校验 prebuild result 身份、用内置 zlib 解压并核对 zip 条目、原子替换预构建树与两份 manifest，失败时回滚已改动文件。 |
| [scripts/host-bridge/zotero-bridge-cli-release.ts](../../files/scripts/host-bridge/zotero-bridge-cli-release.ts.md) | 文件 | 1 | 声明 Host Bridge CLI 预编译二进制的发布身份（七平台目录与身份文件），供 release set 渲染与校验引用。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [scripts](../scripts.md) | 4 |
| [src/shared](../src/shared.md) | 3 |
| [src/workflows](../src/workflows.md) | 2 |
| [src/modules/hostBridge/server](../src/modules/hostBridge/server.md) | 1 |
| [src/schemas](../src/schemas.md) | 1 |

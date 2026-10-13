---
name: zotero-agents-build-preflight
description: 核验并同步插件构建所需的原生二进制、Host Bridge 配套技能和内置技能。用于 Zotero Agents build 前准备、生成物漂移检查或中断任务恢复。
---

# Zotero Agents Build Preflight

## 目标与范围

从仓库根目录执行。在插件 build 开始前，把所需组件与当前工作区源码、
构建身份和仓库固定的外部版本对齐；发现漂移时执行已有构建或渲染入口，
同步后复验。用户只要求准备或检查时，到准备结果为止；用户要求 build 时，
准备完成后继续原定构建命令。

此流程提供开发构建准备证据。正式发布所需的验证、release-set、receipt
和发布授权由各发布 skill 持有。

## 输入、授权与结果

- 输入：当前工作区、目标 build 命令，以及用户提供的仓库、ref、完整 source
  SHA 或已有 workflow run ID。默认目标为 `npm run build`。
- 只读检查请求输出漂移清单与修复任务；同步、派发和恢复保留为待执行动作。
  检查可在隔离目录生成比较结果，工作区交付物保持原样；用户另行禁止渲染
  或临时写入时，只消费已有证据，无法核验的组件记为 `unknown`。
- “同步”以当前源码和锁定身份为准；外部内置技能使用当前 Git index 记录的
  gitlink commit，升级外部版本属于另一个明确请求。
- 只读检查可以直接执行。用户明确要求同步时，按项目文件编辑规则更新生成物；
  使用会写入或清理既有目录的生成器前，确认该操作在已授权范围内。
- 生成器会清理或重建既有目录时，真实执行前备份全部受影响生成路径。
  失败后保留备份位置和诊断，按项目授权恢复本次覆盖内容；依赖已有同步脚本
  的事务回滚时沿用其恢复机制。
- 新远端预构建写共享 prebuild 分支，须有覆盖此副作用的用户授权。
  当前请求若已明确授权所需预构建派发，直接复用授权；普通 build 请求本身
  不授予提交、推送、版本变更、发布或覆盖已有改动的权限。
- 每个组件记录来源、检查命令、结果、待执行动作和复验依据。状态为
  `fresh`、`stale`、`unknown`、`in_progress`、`blocked` 或 `failed`。
  `unknown` 表示证据不足，不能作为准备完成的依据。
- 远端任务另记录 repository、ref、source SHA、request ID、run ID/URL、
  result 文件和准确的恢复命令。沿用子 skill 的结果契约。

## 1. 建立当前构建清单

读取 `package.json` 的实际 scripts、`zotero-plugin.config.ts` 的 assets
与 build hooks，确认此次命令消费什么。以下清单给出当前检查入口；命令或
组件组成变化时，以代码和 manifest 为准，并补齐此次清单。

```bash
git branch --show-current
git rev-parse HEAD
git status --porcelain=v1
git submodule status -- skills_builtin/literature-analysis skills_builtin/literature-explainer skills_builtin/literature-translator
```

区分源码改动、生成目录内已有改动和与本次准备无关的改动。保留全部用户
已有改动；只读调查可以并行，写同一目录的任务串行执行。

| 组件 | 同步依据或检查入口 | 漂移后的执行 owner |
| --- | --- | --- |
| Synthesis sidecar | `npm run check:synthesis-sidecar-runtime-freshness` | [synthesis-sidecar-prebuild](../synthesis-sidecar-prebuild/SKILL.md) |
| Host Bridge CLI | `npm run check:host-bridge-cli-prebuild-freshness`，身份问题另查 `npm run check:zotero-bridge-cli-governance` | [host-bridge-cli-prebuild](../host-bridge-cli-prebuild/SKILL.md) |
| Host Bridge skills、Hermes profile 与生成文档 | `npm run check:host-bridge-content`、`npm run check:host-bridge-doc-sync` | 第 3 节的内容渲染流程 |
| topic-synthesis 内置技能 | renderer 临时输出与 `skills_builtin/` 中对应包逐文件比较 | 第 4 节的内置技能渲染流程 |
| literature-deep-reading 与图模板 | 隔离源码副本的生成结果与工作区逐文件比较 | 第 4 节的内置技能渲染流程 |
| canonical 文献 validators | `npm run check:canonical-literature-validators` | `npm run build:canonical-literature-validators` |
| 内置工作流 manifest | `npm run check:builtin-workflow-manifest` | 检查诊断所指源码/manifest，修复属于需明确的开发范围 |
| 帮助文档 | build 中的 `build:help-docs` 从当前来源重新生成；生成后 `npm run check:help-docs` | 原 build 链 |
| 页面与插件 JS bundle | scaffold/esbuild 按当前 build 配置生成 | 原 build 链 |
| Windows ACP WebSocket bridge | 二进制与 `.sha256` 的完整性及匹配源码的构建证据 | 第 5 节的 Windows 构建入口 |

检查器退出失败时，读取诊断，区分真实漂移、身份未锁定、依赖缺失、权限/
网络失败和文件损坏。工具未成功执行表示 `unknown` 或 `failed`，不能
一概当作需要重建。

本地已有通过的 fingerprint 证据允许复用，不因 Git HEAD 改变而机械重建
全部原生组件。七平台要求由现有 recipe、目标矩阵和检查器决定。

## 2. 先完成原生预构建

在本地渲染产生改动前处理需要同步的原生组件。两套原生同步串行执行，
优先 Host Bridge CLI：其预构建要求干净工作区；Synthesis 允许无关改动。

1. 若检查为 `fresh`，保留检查证据并跳过该组件的预构建。
2. 若已有此次准确身份的 run ID，读取对应子 skill，以原身份恢复；观察或
   下载中断后继续同一 run，不用新的派发掩盖旧任务。
3. 若确需新构建，先确认对应子 skill 的源码、分支、upstream、推送状态、
   身份锁定及授权条件。满足后调用该子 skill 的统一入口：

   ```bash
   npm run prebuild:zotero-bridge-cli -- --repo=<owner/repo> --ref=<branch> --source-sha=<full-sha>
   npm run prebuild:synthesis-sidecar:dispatch -- --repo=<owner/repo> --ref=<branch> --source-sha=<full-sha>
   ```

   每次只执行需要的命令。恢复时增加子 skill 支持的 `--resume-run-id`。
   Host Bridge 命令不支持 `--help`，参数从其 skill 和实现确认。
4. 子 skill 负责精确 run/result 身份、不可变集合、全部目标验证、事务同步
   与 freshness。成功后直接使用其证据，避免再次手工下载或复制平台目录。
5. 任一条件不足，记录该组件为 `blocked`，列出具体前置动作；不得通过
   stash、提交、推送、切分支、bump 或修改 fingerprint 来代替用户决定。

Host Bridge 的锁定 fingerprint 与当前源码不符时，派发也无法解决。
报告当前身份与锁定身份，以及需要完成的版本/身份准备，不自动改变版本。
Synthesis 的本地源码尚未推送时，远端结果不能证明这些源码。

只有需要远端操作时才检查其 branch/clean/pushed 条件；本地组件全部新鲜
时，无关的工作区改动不是准备阻塞。同步产生的改动保留在工作区。

Synthesis development prebuild 的 formal verification 状态单独报告；
verification 缺失不导致开发预构建失败，也不授权正式发布。

## 3. 同步 Host Bridge 配套技能

从 `contracts/host-bridge/surfaces.json` 解析 sourceRoot、generatedRoot、
自有技能及继承组成；该 manifest 是组件清单的事实源。

1. 内容检查与包检查均通过时，跳过渲染。
2. 有漂移时运行语义上下文收集器：

   ```bash
   npm exec --no -- tsx scripts/host-bridge/host-bridge-semantic-review-context.ts
   ```

   `reviewRequired: true` 时调用
   [host-bridge-semantic-surface-review](../host-bridge-semantic-surface-review/SKILL.md)。
   审阅阻塞时停止该渲染任务；新 skill 不替审阅者修改语义源。
3. 检查 renderer 将写入和 prune 的目录。已有未提交生成物先在临时输出
   root 预览，与原目录比较；相同内容可保留，有冲突的文件须单独解决。
   prune 涉及额外文件时核对删除范围和授权。
4. 在授权范围内执行 `npm run render:host-bridge-content`，再运行
   `npm run check:host-bridge-content` 和 `npm run check:host-bridge-doc-sync`。
   包根从 manifest 解析，配置中的包清单遗漏时补查遗漏包。
5. 涉及 governed Markdown 语义变化时调用
   [host-bridge-review-mirror](../host-bridge-review-mirror/SKILL.md)，完成镜像
   校验。固定 baseline、删除清单、厚度及 parity 证据由语义审阅和项目
   AGENTS.md 约束持有，必须保留在此次 handoff 中。

普通开发 build 使用 content-only renderer；`render:host-bridge-surface`
还会重写正式 release-set，不用于补齐普通构建生成物。

## 4. 同步内置技能与共享生成物

### 外部技能

检查 `.gitmodules` 和当前 index 的 gitlink，限定在实际消费的
`skills_builtin/` 子模块。未初始化的包可按同步授权初始化到该固定 commit。
checkout 偏离 gitlink 或子模块有改动时报告具体差异；保留已有工作。
使用固定版本同步，不执行 `git submodule update --remote`。
子模块状态不能证明远端 branch 是否有新版本。

### topic-synthesis

renderer 的 `--out` 接受内置技能父目录。先渲染到仓库外新建的空目录：

```bash
npm exec --no -- tsx skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts --out <temporary-skills-root>
```

从 `skills_src/topic-synthesis/contracts/stages.yaml` 取得包 ID 集合。
比较临时输出与 `skills_builtin/<id>/` 的相对路径全集及文件内容，覆盖缺失、
额外和变化文件；仅排除明确不属交付内容的缓存，不能只比较 `SKILL.md`。
无差异记为 `fresh`。有差异且输出范围没有用户改动冲突时，按授权运行
同一 renderer 的默认输出，再用临时结果复验。

### literature-deep-reading

`render_literature_deep_reading_skill.ts` 会先运行图 renderer，写入
`skills_src/literature-deep-reading/renderer/templates/`，随后重建目标包。
即使调用其 `outRoot` 参数，图模板仍写入该 renderer 所在的源码树。
因此漂移检查必须把源码及依赖的静态资产复制到隔离目录后运行。

1. 在仓库外创建新的源码快照，保留目录结构，复制当前工作区的 `src/`、
   `packages/`、`skills_src/`、`scripts/content-package/`、`addon/content/shared/`、
   `addon/content/synthesis/`、`addon/locale/`、`typings/`、`package.json` 与
   `tsconfig*.json`。所复制的源码包含用户当前改动；不用旧 HEAD 替代。
2. 复用已安装的 `node_modules`，可链接到快照并只作依赖读取；源码和输出
   目录使用实体副本。缺依赖时报告，遵守项目安装授权规则。
3. 在快照 root 运行 `npm exec --no -- tsx
   skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts`。
   内部图构建也必须以快照为 cwd。核对产物都留在快照中。
4. 比较快照生成的图模板和 `skills_builtin/literature-deep-reading/` 与
   原工作区对应目录，使用相对路径全集和文件内容。生成失败或输入复制
   不全记为 `failed`，保留诊断，不能宣称已同步。
5. 无差异则跳过。需要同步时，先解决图模板及内置包里的已有改动冲突，
   再按授权在真实仓库运行同一 renderer。该入口已经生成图模板，
   无需额外再跑 `build-literature-deep-reading-graph-renderer.ts`。
6. 同步后与隔离生成结果复验；若源码在快照生成后变化，重新生成快照结果。

### validators、工作流与 build 自有产物

canonical validators 检查明确报告过期时，按授权执行
`npm run build:canonical-literature-validators`，随后重跑其 check。
工作流 manifest 检查失败时，按诊断报告缺失/不一致来源；没有统一自动
修复入口，不能伪造 manifest 或扩展到内容包发布。

帮助文档由 `npm run build` 第一阶段生成，页面 JS 由 scaffold/esbuild
生成；把它们记为 build 阶段负责，避免预先重复生成。
`check:help-docs` 检查生成输出的完整性，不能证明与 `site/` 源码同步。
如果用户使用绕过 npm build 的入口，先补上该入口缺少的文档生成步骤。

## 5. Windows ACP WebSocket bridge

检查 `addon/bin/win32-x64/zotero-acp-bridge.exe` 和其 `.sha256`，并查看
`rust/acp-ws-bridge/` 及构建/打包脚本是否有未同步源码变化。
checksum 只能证明二进制完整，不能证明与当前源码一致。
此组件没有统一 source-fingerprint freshness checker；需要匹配当前来源
的可核验 Windows 构建记录，或重新构建取得证据。证据不足记为 `unknown`。

有必要且获授权时，在 Windows checkout 执行
`npm run prebuild:acp-ws-bridge`；它包含打包步骤。Linux/macOS 不能运行
该构建入口。构建前记录完整 HEAD 和 ACP 源码/脚本的未提交差异，构建后
确认这些输入未变化，保留成功执行结果与二进制 checksum；打包命令输出
本身没有源码身份字段，需要把这些来源证据一并记录。
需要异机任务时交给已有、获授权的 Windows 执行环境，绑定
当前源码与返回二进制证据；没有可用环境则报告 `blocked` 和具体任务。
返回包按项目编辑/同步授权落地并校验 checksum；没有既有 CI 入口时，
不能臆造 workflow 名称或静默接受旧文件。

## 6. 复验、继续构建与失败恢复

汇总清单，确认每个 build 前消费的组件为 `fresh`；原 build 链自身生成的
产物列为该阶段的必需动作。仍有 `unknown`、`in_progress`、`blocked` 或
`failed` 时，完成其它独立且已授权的准备工作，报告阻塞并停止插件 build。

复验受同步影响的检查：原生 freshness、Host Bridge 内容与包校验、内置
技能逐文件比较、canonical validators、内置 workflow manifest。
已由子 skill 完成且输入未再变化的复验可以直接使用其真实证据。

准备完成后，仅当用户要求 build 才运行原定命令。build 中生成的帮助文档
完成后运行 `npm run check:help-docs`；声明 build 成功须有实际命令结果。
打包场景按当前 hooks 核对 XPI 原生资产，必要时使用
`npm run check:synthesis-sidecar-runtime-xpi -- --xpi=<当前构建XPI路径>`。

远端失败保留同一 run 和 result 身份，给出子 skill 的恢复命令。
同步失败使用现有脚本的事务回滚结果，保留 recovery backup；渲染失败
保留执行前备份和隔离诊断，报告原目录是否已部分改写、恢复是否完成，
不能把非事务性 renderer 宣称为自动回滚。保留未受影响文件，不以清空
生成目录或修改身份文件来掩盖失败。

报告每个组件的同步状态、真实检查结果、执行过的构建/渲染动作、远端任务
身份、受影响文件、是否继续并完成插件 build，以及剩余阻塞。
只有所有必需组件均有当前证据时才报告“构建准备完成”。正式发布请求再
转交对应的 release pipeline 或
[zotero-agents-release-coordinator](../zotero-agents-release-coordinator/SKILL.md)。

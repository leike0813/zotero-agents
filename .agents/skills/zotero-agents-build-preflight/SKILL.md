---
name: zotero-agents-build-preflight
description: 核验并同步插件构建组件与已发布内容包，全部就绪后继续 build。用于 Zotero Agents 构建前准备、生成物漂移检查或中断恢复。
---

# Zotero Agents Build Preflight

## 目标与范围

从仓库根目录执行。在插件 build 开始前，把所需组件与当前工作区源码、
构建身份和仓库固定的外部版本对齐；发现漂移时执行已有构建或渲染入口，
同步后复验。默认目标 build 为 `npm run build`；全部必需组件就绪后直接
运行一次目标命令，不再另行确认。用户明确限定为只读检查或仅准备时，
到准备结果为止。本 skill 由外层已决定的 build 流程调用时，交回该流程
继续原命令，不重复执行 build。

此流程提供开发构建准备证据。正式发布所需的验证、release-set、receipt
和发布授权由各发布 skill 持有。

## 输入、授权与结果

- 输入：当前工作区、目标 build 命令，以及用户提供的仓库、ref、完整 source
  SHA 或已有 workflow run ID。
- 只读检查请求输出漂移清单与修复任务；同步、派发和恢复保留为待执行动作。
  检查可在隔离目录生成比较结果，工作区交付物保持原样；用户另行禁止渲染
  或临时写入时，只消费已有证据，无法核验的组件记为 `unknown`。
- 仅准备请求按当前授权完成检查与同步，全部就绪后报告结果，跳过目标 build。
- “同步”以当前源码和锁定身份为准；外部内置技能使用当前 Git index 记录的
  gitlink commit，升级外部版本属于另一个明确请求。
- 只读检查可以直接执行。同步授权依据当前请求：build 目标（含默认目标）
  授权同步本流程列出的构建所需组件，按项目文件编辑规则更新生成物；
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
| topic-synthesis 内置技能 | `npm run check:builtin-skill-contracts` | 第 4 节的内置技能渲染流程 |
| literature-deep-reading 与图模板 | `npm run check:builtin-skill-contracts` | 第 4 节的内置技能渲染流程 |
| canonical 文献 validators | `npm run check:canonical-literature-validators` | `npm run build:canonical-literature-validators` |
| 内置工作流 manifest | `npm run check:builtin-workflow-manifest` | 检查诊断所指源码/manifest，修复属于需明确的开发范围 |
| 已发布 Content Package | 内置内容同步后运行 `npm run check:content-package-release -- --current-branch` | 第 6 节的发布 freshness 与恢复流程 |
| 帮助文档 | build 中的 `build:help-docs` 从当前来源重新生成；生成后 `npm run check:help-docs` | 原 build 链 |
| 页面与插件 JS bundle | scaffold/esbuild 按当前 build 配置生成 | 原 build 链 |
| Windows ACP WebSocket bridge | `npm run check:acp-ws-bridge-freshness`（源码 fingerprint 与二进制、`.sha256`、build record 三件一致性） | 第 5 节的 Windows 构建入口 |

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

同步到 gitlink 固定 commit 用：

```bash
git submodule update --init --checkout -- skills_builtin/<package>
```

`--checkout` 不可省：`.gitmodules` 以 `update = none` 声明全部 submodule，
默认 checkout 会被跳过，未初始化的包会保持空目录。

### topic-synthesis 与 literature-deep-reading

统一入口：

```bash
npm run check:builtin-skill-contracts
```

它在系统临时目录调用两个套件的真实 renderer，随后按相对路径全集和字节比较
`skills_builtin/`：缺失、额外和内容变化都失败。renderer 先执行既有的 runner
与 schema 前置校验，因此这项检查同时证明当前源码仍满足 Skill Runner 契约。
临时目录在结束时清理；检查不写 `skills_builtin/`，也不把图模板写回
`skills_src/literature-deep-reading/renderer/templates/`。

- 全部字节一致记为 `fresh`，继续后续组件。
- 有差异时读取 `missing`、`extra`、`changed` 路径。确认差异属于当前源码
  变化，并检查目标包内是否有用户改动；有冲突时先报告，不覆盖。
- topic-synthesis 同步运行默认输出：
  `npm exec --no -- tsx skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts`。
- literature-deep-reading 同步运行默认输出：
  `npm exec --no -- tsx skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts`。
  图构建器接收目标包的 `renderer/templates/`，源码模板只作为静态输入。
- 同步后重跑统一检查。生成失败保留诊断和目标目录现状，不能宣称已同步。

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

入口为跨平台只读检查：

```bash
npm run check:acp-ws-bridge-freshness
```

它按内容 fingerprint（当前 ACP crate 的 Cargo.toml/lock 与 `src/` 树、
build/package/shared 脚本、可选的本地 Cargo/toolchain 配置；含未提交与
未跟踪输入，忽略 HEAD、时间戳与 target 输出）核对 `addon/bin/win32-x64/`
下 `zotero-acp-bridge.exe`、`.sha256` 与 `zotero-acp-bridge.build.json`
三件一致性，输出 JSON（`ok`；失败附 `code` 与 `details`），失败退出非零。
build record 记录 schema、target、platform、`buildFingerprint`、
`sourceHead` 与二进制 sha256/字节数；`sourceHead` 仅用于追溯，不决定
fresh。不相关文件或 HEAD 变化不改变 fresh 结论；三件缺失或记录无效记为
`unknown`，fingerprint 不符记为 `stale`。

重建只在 Windows checkout 执行：

```bash
npm run prebuild:acp-ws-bridge
```

入口以 `--locked` 运行 Cargo build，输入 fingerprint 构建前后一致才写入
本地构建记录；打包步骤验证该记录后把三件复制进 `addon/bin/win32-x64/`，
最后重跑 checker。单独运行 `package:acp-ws-bridge` 不会把旧 exe 认证为
当前来源：记录缺失、过期或与二进制不一致时打包失败，响应要求 Windows
重建。失败或输入变化的构建不签发新证据、不替换已打包资产；Linux/macOS
不能运行构建入口。异机任务交给已获授权的 Windows 环境并绑定当前源码与
返回证据，没有可用环境则报告 `blocked` 与具体任务；返回包按项目编辑/
同步授权落地并重跑 checker 复验，没有既有 CI 入口时不臆造 workflow
名称，也不静默接受旧文件。

## 6. 核对已发布 Content Package

完成内置技能、工作流及共享生成物同步后，从仓库根目录运行：

```bash
npm run check:content-package-release -- --current-branch
```

检查器从 Git 当前分支选择范围：`main` 检查 `stable,beta`；`dev` 及所有
以 `dev` 开头的分支（包括 `dev-*`、`dev/*`）检查 `dev`。其他分支或 detached
HEAD 无法自动确定范围，记为 `unknown` 并停止 build，待用户明确频道后使用
`--channels <频道>` 复验。检查范围不改变发布权限：发布仍只接受 `main`
的 stable/beta 与 `dev` 的 dev，不能从 `dev-*` 直接派发发布。

stable/beta 使用 `content-package.version.json` 的 `version`，dev 使用
`dev_version`（`X.Y.Z-dev.N`）。检查器对每个频道使用该频道远端的 revision
和更新时间，在仓库外临时目录重建当前工作区交付内容，再比较 feed 身份、
版本、ZIP SHA-256/大小与 GitHub ZIP/checksum 原始字节。它不要求当前 HEAD
等于发布提交，不修改内置内容，也不写入工作区构包目录。比较范围沿用
正式 collector 的 tracked 文件与频道 debug 规则；发布前须纳入新增交付文件。

- 全部所选频道通过，记录分支、频道、版本、检查命令与结果为 `fresh`。
- 版本不一致或当前交付字节与远端不一致，记为 `stale`，保留差异诊断。
  同名同版本资产不可覆盖；修复动作是 bump 对应版本线、提交/推送、从允许的
  ref 发布所选频道，再运行原检查。dev 的调试迭代命令为
  `npm run release:content-package -- patch --channel dev`；正式版本沿用
  `npm run release:content-package -- <patch|minor|major|version>`。
- 缺少/无效版本、feed、发布身份或资产证据记为 `unknown`；网络/权限故障、
  构包失败、资产损坏记为 `failed`，按诊断恢复原入口，不用 bump 掩盖网络错误。
- 普通 build、同步或仅准备授权不包括提交、推送或内容发布。有明确发布授权时
  按 [zotero-agents-release-coordinator](../zotero-agents-release-coordinator/SKILL.md)
  处理；否则完成其它独立准备，报告准确待办并停止 build。dev 发布命令为
  `npm run release:content-package -- --dispatch --channels dev --ref dev --watch`；
  main 使用 `--channels stable,beta --ref main`。发布成功后必须复验。

freshness 证明远端已发布内容与本地交付一致；实机测试前还须确认目标 Zotero
使用对应频道并安装/更新该内容包。目标库内尚在使用旧版本时不能宣称业务
测试已验证当前内容。检查后若内容、版本、分支或生成物再变化，重跑此项。

## 7. 复验、继续构建与失败恢复

汇总清单，确认每个 build 前消费的组件为 `fresh`；原 build 链自身生成的
产物列为该阶段的必需动作。仍有 `stale`、`unknown`、`in_progress`、`blocked` 或
`failed` 时，完成其它独立且已授权的准备工作，报告阻塞并停止插件 build。

复验受同步影响的检查：原生组件 freshness（含 ACP bridge 三件一致性的
`npm run check:acp-ws-bridge-freshness`）、Host Bridge 内容与包校验、
内置技能逐文件比较、canonical validators、内置 workflow manifest、
按当前分支选择的 Content Package 发布 freshness。
已由子 skill 完成且输入未再变化的复验可以直接使用其真实证据。

全部必需组件就绪后，默认直接运行一次目标 build（默认 `npm run build`），
不再另行确认；用户显式只读或仅准备时，到此停止并报告准备结果；本流程
由外层已定 build 调用时，交回该流程继续原命令，不重复运行。build 中
生成的帮助文档完成后运行 `npm run check:help-docs`；声明 build 成功
须有实际命令结果。打包场景按当前 hooks 核对 XPI 原生资产，必要时使用
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

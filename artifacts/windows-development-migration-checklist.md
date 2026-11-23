# Zotero Agents Windows 开发迁移清单

源机是当前 Windows 实体机，目标机是 Windows x64 VM。VM 接手日常 Windows 开发，实体机保留随时回到本机开发和桌面验收的能力。按顺序由源机 Agent 复制到 NAS、目标机 Agent 签收并配置、用户验收、源机 Agent 同步并清理确认过的历史产物。工具链和启动命令见 [Windows 开发环境接手手册](windows-development-environment-handoff.md)。两份文档的盘点值有差异时，以本文和执行时的签收记录为准。

## 迁移路径与源机盘点

2026-11-23，源机可读取 NAS 上的 `T:\转移`，T 盘约有 2,075 GiB 可用。建议本次批次放在 `T:\转移\zotero-agents\windows-dev-<日期时间>`。执行后记录实际批次名和共享相对路径。目标机使用映射到同一共享的驱动器，先核对批次清单，盘符按目标机实际情况填写。两套 profile、数据和链接附件目录合计约 17.75 GiB、25.19 万个普通文件，未计 Git 包、取证和安装包。目标机 D 盘还需容纳依赖、原生编译输出和 E2E 副本。

| 资产 | 源机 | NAS 批次内路径 | 目标机 |
| --- | --- | --- | --- |
| `dev` profile | `%APPDATA%\Zotero\Zotero\Profiles\4iz7mztz.dev` | `dev\profile` | 目标账号 `%APPDATA%\Zotero\Zotero\Profiles\4iz7mztz.dev` |
| `dev` 数据 | `D:\Workspace\Artifact\Zotero-Skills\Zotero_data` | `dev\data` | 同源机 D 盘路径 |
| `dev` 链接附件 | `D:\Workspace\Artifact\Bibliography-test` | `dev\attachments` | 同源机 D 盘路径 |
| `Joshua-Side` profile | `%APPDATA%\Zotero\Zotero\Profiles\9w7o285s.Joshua-Side` | `joshua-side\profile` | 目标账号 `%APPDATA%\Zotero\Zotero\Profiles\9w7o285s.Joshua-Side` |
| `Joshua-Side` 数据 | `%USERPROFILE%\Zotero_Side\Joshua-Side` | `joshua-side\data` | 目标账号 `%USERPROFILE%\Zotero_Side\Joshua-Side` |
| `Joshua-Side` 链接附件 | `E:\Zotero_Side_Bibliography\Joshua-Side` | `joshua-side\attachments` | `D:\Zotero_Side_Bibliography\Joshua-Side` |
| Windows 宿主归档 | `D:\Workspace\Artifact\Zotero-Skills\zotero-hosts\archives` 与同级 `manifest.windows-x64.json` | `zotero-hosts\` | 同源机 D 盘路径，安装树按需解压 |
| 桌面验收安装包 | 官方 Zotero Windows x64 10.0.8 安装器及本次选定的 Zotero Agents XPI | `installers\` | VM 本地安装包目录 |
| Git 本地状态及独立证据 | 见阶段一 | `git-state\`、`evidence\` | VM 私有暂存目录，按收据恢复 |

- 本机 `dev` 和远端 `dev` 已同步到 `ac41efdea9868875cf33e19b18609e25227a47d3`。上次盘点的 37 个 Host Bridge 和 Synthesis sidecar 构建文件已在该提交中，当时的环境手册位于父提交 `3c06f9131`。前次盘点还发现 `stash@{0}`（`6d42d0891`）、本地备份分支、`dev-workflows`、含本地独有提交的 `host-bridge/zotero-bridge-cli-bundle` 和多个注册 worktree。执行时重新检查实际状态。
- 两个 profile 的数据目录和相对附件基目录与上表一致。`dev` 有 304 条相对链接，其中 1 条缺失，另有 3 条已失效的绝对链接。`Joshua-Side` 有 625 条相对链接和 1 条指向其 `storage` 的绝对链接，源机均可定位。目标机修正附件基目录后复查，目标账号变化时复查这条绝对链接。盘点时两个 `zotero.sqlite-wal` 均为 0 字节，正式快照时重新确认。
- 普通桌面快捷方式指向 `C:\Program Files\Zotero\zotero.exe`，无附加参数，宿主版本为 10.0.8。源机 `profiles.ini` 的 `Default=1` 仍指向 `Joshua-Side`，`StartWithLastProfile=0`。当前 `Joshua-Side` 已没有 Zotero Agents XPI，`.scaffold\build\zotero-agents.xpi` 也不存在。历史手册的 SHA 未在这次核验的 13 个候选及夹具 XPI 中找到。正式桌面测试应选定要安装的 XPI，记录来源、版本、SHA-256 和对应内容包。
- `.scaffold\embedding-dev6-final\zotero-agents.xpi` 是现存的 0.9.0 开发候选，SHA-256 为 `F048D8655B0FC2D0F62F2E093421CCCC30E4DE1C334D2A6F3D992EB0443F9C95`。若本次要覆盖该候选，按此身份单独签收。`dev` profile 内另有一个 0.4.0 XPI 文件，源码启动时以当前 checkout 实际加载结果为准。

## 阶段一 · 源机复制到 NAS、提交并推送

- [x] **确认执行范围。** 源机 Agent 取得迁移执行确认，登记批次名、预定分支（建议沿用 `dev`）与需保留的例外资产。核对 NAS 批次目录的访问权限。整个 profile、数据、Git 私有状态和证据可能包含凭据或真实文献。使用仅授权账号可读的目录，或将敏感资产加密后再放到该共享，密钥另外交接。
- [x] **冻结并备份 Git 状态。** 在复制窗口内重新检查 `git status --short --branch --untracked-files=all`、`git diff --cached --stat`、`git stash list`、`git worktree list --porcelain` 和分支引用。主工作区 `.git` 是指向 `D:\Git\JavaScript\zotero-agents.git` 的指针。用 `git bundle create <bundle> --branches --tags HEAD` 保存当前提交、本地分支和标签，有 stash 时附加 `refs/stash`。再执行 `git bundle verify` 和 `git bundle list-heads`。记录当前提交，使用 `git diff --cached --binary --full-index --output=<暂存补丁>` 和 `git diff --binary --full-index --output=<未暂存补丁>` 分别导出两个补丁，另存需保留的未跟踪文件。逐个核对 stash、含独有提交的分支、需保留的 worktree 和子模块。对未被主 bundle 引用的 stash 或 detached HEAD 单独保全，确认备份可以定位到具体提交。将交接前仍在更新的原生二进制和身份文件作为一组保全。
- [x] **停止写入再取快照。** 正常退出 Zotero，确认开发 watcher 和持有两套数据的 Synthesis、ACP 等进程已停止，用源机 `profiles.ini` 和各 `prefs.js` 核对实际路径。若仍有未合并的 WAL，先取得一致快照，保持数据库及其 WAL 配对。记录 `profiles.ini` 中这两条注册信息，供目标机单独注册。
- [x] **复制 `dev` 三部分。** 复制 Roaming profile、数据目录及链接附件目录，保留 `storage`、`zotero-agents` 持久状态和当前内容包。将 `dev` 四条既有缺失记入签收基线。
- [x] **复制 `Joshua-Side` 三部分。** 复制 Roaming profile、数据目录及 `E:\Zotero_Side_Bibliography\Joshua-Side`。该 E 盘父目录还包含其他 profile 的附件，只复制 `Joshua-Side` 子目录。保留 `storage`、`zotero-agents` 持久状态、已安装内容及复现实测所需的插件配置。
- [x] **复制安装件和独有证据。** 签收官方宿主归档和 manifest（7.0.32、9.0.6、10.0.2），为桌面验收选定 10.0.8 安装器、XPI 和匹配的内容包。确认 `.scaffold\test\mig-rudEZv` 隔离夹具、原生崩溃证据、`.scaffold\embedding-*` 候选和 `.scaffold\host-bridge-cli-prebuilds-sync` 中哪些仍用于复现或正在进行的交付，只保全所需快照及回执。核对 `%LOCALAPPDATA%\zotero-agents\bridge-profile.json` 和外置后端配置，按 VM 实际测试需要通过私有渠道交接。按 `.env.example` 在目标重配，凭据走单独渠道。
- [x] **核对 NAS 副本。** 使用新批次目录逐项复制。文件目录可用 `robocopy <源> <目标> /E /Z /XJ /R:2 /W:3 /COPY:DAT /DCOPY:DAT`，先确认重解析点的目标是否需单独迁移。保留日志，处理退出码 ≥8、文件差异和未解释的额外项。比较源和 NAS 的文件数、字节数与相对路径，复核主数据库、关键插件数据库、Git 包及安装件的 SHA-256。将资产编号、实际相对路径、复制结果、版本和例外写入批次私有清单，记录完成时间。SQLite 核验在 NAS 快照的本地副本上做。
- [x] **勾选已完成项并推送。** 更新本文的阶段一收据，审查暂存与提交的路径，只提交迁移清单和获准公开的说明。使用约定分支正常推送并确认远端可读，将分支、实际提交 SHA、批次相对路径交给目标机 Agent。

阶段一收据 · 日期 2026-11-23 / 批次 `T:\转移\zotero-agents\windows-dev-20261123-0849`（相对路径 `zotero-agents\windows-dev-20261123-0849`）/ 分支 `dev` / 源 HEAD `c698a5e01b4e33a1c87bb683968963ae5c514cb5`（与 `origin/dev` 同步）/ 已签收：`dev` profile 158、`dev` 数据 99,629、`dev` 链接附件 4,950、`Joshua-Side` profile 106、`Joshua-Side` 数据 137,010、`Joshua-Side` 链接附件 10,048 文件（三处 `parent.lock` 排除）；宿主归档 4 件；官方 10.0.8 安装器（SHA-256 `1ba5d091…4179d73`）与 `.scaffold\build` XPI 0.9.0（`9ac0ab77…791494`）；Git bundle 1.12 GB（含 `refs/stash` `6d42d0891`）与两个空补丁；`addon\bin` 快照、`.scaffold\diag`、`mig-rudEZv` 夹具。合计约 21.4 GB、252,104 文件，全部 0 失败；源与 NAS 差异复核 0 待复制、0 不匹配；安装器、XPI、bundle 与四套 SQLite 的 SHA-256 两侧一致。例外：`.env` 与 `bridge-profile.json` 未复制（凭据另行交接）；2.90 GB WER 转储与可重建的 embedding/host-bridge 预构建源码树留在源机；`zotero-hosts` 只交付归档与 manifest；外部内容包未单独产出。批次清单与复制日志见批次目录 `MANIFEST.md`、`logs\`。

## 阶段二 · 目标机签收、配置、提交并由用户验收

- [x] **克隆并定位交接。** 克隆项目仓库，检出阶段一交接分支，确认包含阶段一提交。阅读本文、当前 `AGENTS.md` 和 [环境接手手册](windows-development-environment-handoff.md)。核对 NAS 共用目录和批次清单，确认目标本地磁盘空间。
- [x] **复制到 VM 本地并复核。** 按表恢复两个 profile、数据目录、链接附件及本批次安装件和证据。源 E 盘的 `Joshua-Side` 附件落在目标 `D:\Zotero_Side_Bibliography\Joshua-Side`，清单中其他获准的 E 盘资产亦映射到 D 盘并记录实际位置。遇到已存在的目标目录时先核对归属，隔离现有数据以便回退。首次启动前核对副本路径、文件数、字节数与关键摘要，并在本地副本上查两套 SQLite 与附件基线。
- [x] **恢复需要的 Git 状态及工具链。** 校验 bundle 和补丁后，在独立的恢复分支或工作区按源基线恢复需继续的本地工作，保留其暂存与未暂存边界。在交接分支按环境手册检查 Node、npm、Rust/MSVC，初始化三个固定内置技能子模块并安装锁定依赖。按当前源码和频道检查 Synthesis sidecar、Host Bridge CLI、Windows ACP bridge、内容包四组构建输入。构建按 preflight 技能执行，记录实际用于验收的源码和二进制身份。
- [x] **配置两种 Zotero 启动。** 通过 Profile Manager 注册目标机上的两套 profile，核对数据目录、`baseAttachmentPath`、插件 `runtimeRoot` 以及工作流和命令的绝对路径。`dev` 的 `sampleOutputDir` 仍指向源机旧 `D:\OneDrive\...`，按实际用途改到 VM 路径。用目标 `.env` 指向 `dev`。安装选定的 XPI 到 `Joshua-Side`，通过无额外参数的普通桌面快捷方式选中或启动该 profile。首轮验收用复制的本地数据，按需在 VM 重新登录服务。
- [x] **记录 Agent 验收。** 串行检查 `dev` 经 `npm run start` 加载当前源码并重载、`Joshua-Side` 经普通快捷方式加载选定 XPI，以及 `npm run test:zotero:e2e` 的隔离用例。桌面测试实际打开一份链接附件和一份 `storage` 附件，打开 Synthesis，并试跑一个常用工作流。记录版本、退出码、成功证据与剩余差异。确认 VM 访问的是本地副本，测试依赖在源机关机时仍可用。
- [x] **勾选、提交并推送。** 在同一交接分支更新阶段二收据，提交本文及获准公开的配置说明。向用户报告提交 SHA、测试入口和已知差异，交由用户实测。
- [x] **用户确认目标机可接替。** 记录用户验收的提交 SHA、确认日期及获准清理的范围。Agent 的通过记录和已推送提交用于复核，源机清理以用户验收和批准为准。

阶段二收据 · 2026-11-23 / 阶段一提交 `4e4d443008f3d6d3ef328a5a19521692d77bbdfb` / 目标机 `JOSHUA-WORKSTAT`（QEMU/KVM，Windows 10 19045，24 逻辑核、32 GiB）/ 目标分支 `dev`，HEAD `4e4d44300` / NAS 批次 `\\192.168.13.89\PublicStorage\转移\zotero-agents\windows-dev-20261123-0849`（源机 `T:` 映射在目标机失效，直接走共享根）。

- 实际路径：`dev` profile `C:\Users\leike\AppData\Roaming\Zotero\Zotero\Profiles\4iz7mztz.dev`；`dev` 数据 `D:\Workspace\Artifact\Zotero-Skills\Zotero_data`；`dev` 链接附件 `D:\Workspace\Artifact\Bibliography-test`；`Joshua-Side` profile `…\Profiles\9w7o285s.Joshua-Side`；`Joshua-Side` 数据 `C:\Users\leike\Zotero_Side\Joshua-Side`；`Joshua-Side` 链接附件 `D:\Zotero_Side_Bibliography\Joshua-Side`（源机 E 盘路径整体映射到 D 盘）；宿主归档 `D:\Workspace\Artifact\Zotero-Skills\zotero-hosts`；安装件 `…\Zotero-Skills\installers`；Git 状态与证据 `…\Zotero-Skills\migration\{git-state,evidence}`。
- 恢复核对：10 项 robocopy 全部 0 失败；文件数与字节逐项等于阶段一清单（`dev` 158 / 99,629 / 4,950，`Joshua-Side` 106 / 137,010 / 10,048，宿主归档 4，安装件 967，Git 状态 10，证据 2,609，复扫 0 待复制、0 不匹配）。安装器、XPI、bundle 与四套 SQLite 的 SHA-256 与清单一致，四套库 `integrity_check` 均为 ok，两套 `zotero.sqlite-wal` 仍是 0 字节。附件基线：`dev` 304 条相对 + 3 条绝对，缺 4 条（1 条相对缺失加 3 条失效 `%TEMP%` 绝对链接，与源机盘点一致）；`Joshua-Side` 625 条相对 + 1 条绝对，缺 0。
- Git 与工具链：bundle `git bundle verify` 报 complete history；8 个本地分支（含 `host-bridge/zotero-bridge-cli-bundle` `9847926d0`）、94 个标签与 `stash@{0}` `6d42d0891` 已恢复，`staged.patch`/`unstaged.patch` 均 0 B，工作区干净。Node 24.15.0、npm 11.12.1、rustup + `nightly-2026-07-25`（rustc 1.99.0）、MSVC 14.50.35717、Windows SDK 10.0.26100.0、Zotero 10.0.8、Python 3.14.4 + uv 0.13.8；`npm ci` 468 包；`skills_builtin` 三个子模块按 gitlink checkout（`68afd7a`/`0a7306d`/`11c3b35`）。
- 构建输入：`check:synthesis-sidecar-runtime-freshness`、`check:host-bridge-cli-prebuild-freshness`、`check:acp-ws-bridge-freshness`、`check:content-package-release -- --current-branch` 全部退出码 0，`addon/bin` 七平台内容可直接复用；内容包 dev 摘要 `sha256:ba52f71e…`。
- 验收证据：`npm run start` 以 `.scaffold/build` 加载当前源码，构建 11.4 s、Mock SkillRunner `127.0.0.1:8030` 就绪，修改 `src/index.ts` 后于 15:24:08 完成一次实际重载。`Joshua-Side` 启动后插件 `0.9.0`（`active: true`）实际运行并弹出 Host Bridge CLI 安装提示，接受后 `%LOCALAPPDATA%\zotero-agents\bin\zotero-bridge.exe`（10,511,360 B）与 `bridge-profile.json` 生成；已装内容包 `zotero-agents-official-workflows 0.8.10-dev.31`（dev 频道，要求插件 `>=0.9.0`）。隔离 E2E 以 `CI=false`、`ZOTERO_TEST_ZOTERO_VERSION=10`、`ZOTERO_TEST_GREP='System E2E runner foundation|WS-0'` 运行，`runId c626241c`、`terminalState complete`、Zotero 10.0.8（win32）、夹具 `foundation-v1` rev2、4 选中 4 通过 0 失败；sidecar 由当前源码构建，指纹 `2122c848…` 与 `addon/bin` 一致。
- XPI 与内容包身份：`installers\xpi-build\zotero-agents.xpi`，版本 0.9.0，SHA-256 `9ac0ab77fc02b0c1d093bd0e6da7d3f251a627c85517c2ca13e5a23af8791494`。
- 已知差异：①该 XPI 不是通过 Add-ons 界面安装的——Zotero 7+ 不会登记仅放入 `extensions\` 的 XPI（会被当作 foreignInstall 并禁用），本次改为在 `extensions.json` 写入与界面安装等价的登记项并放置 `extensions\<id>.xpi`，重启后 `active: true` 且插件实际运行；如需 UI 安装回执，可在桌面会话再走一次“从文件安装插件”。②`profiles.ini` 沿用源机 `StartWithLastProfile=0`、`Default=Joshua-Side`，双击快捷方式会先弹 Profile Manager，需手动选择 `Joshua-Side`。③`Joshua-Side` 的 3 处 `E:\Zotero_Side_Bibliography\Joshua-Side` 改为 D 盘同名目录，zoteroattanger `sourceDir` 由 `E:\Downloads` 改为 `C:\Users\leike\Downloads`；`dev` 的 `sampleOutputDir` 由旧 `D:\OneDrive\…` 改为 `D:\Workspace\Artifact\Zotero-Skills\selection-sample`。④目标机的 npm 会向子进程注入 `CI=true`，使 `zotero-plugin-scaffold` 走 Xvfb 分支而在 Windows 上失败；E2E 需以 `CI=false` 运行，且会话 PATH 需含 `C:\Users\leike\.cargo\bin`。⑤桌面侧的“打开链接附件 / 打开 `storage` 附件 / 打开 Synthesis / 试跑常用工作流”这四项交互未由 Agent 执行，留待用户实测。

用户验收 · 提交 SHA / 日期 / 清理范围：待填写。

## 阶段三 · 源机拉取并保守清理

- [ ] **先同步。** 核对用户验收的目标提交和当前分支，再运行 `git pull --ff-only`。本地工作树变化或分支分叉会阻止安全拉取时，先保全相关改动，再处理同步。确认源机已收到已验收的阶段二提交。
- [ ] **核对源机仍可开发。** 保留本机 `dev`、`Joshua-Side` 和日常 profile 的当前注册、数据、附件和插件状态，保留源码工作区、`.env`、工具链、用于源码启动的依赖和本机构建。保留正在使用的桌面 Zotero、XPI 及兼容性宿主。按本机现有 profile 配置验证源码启动和桌面启动仍能使用各自的数据。
- [ ] **将有保留价值的 Synthesis 历史产物归档到本机 E 盘。** 按下文筛选，复制到 `E:\Zotero-Agents-Archive\synthesis-sidecar\` 后校验。每次运行的 `prebuild-result.json` 原地保留。E 盘档案供本机按需复现，VM 根据当前 checkout 和项目远端获取构建输入。
- [ ] **清理获准的历史生成物。** 优先回收确认闲置的 Synthesis Git 下载缓存和已有恢复来源的归档副本，其次是确认停用的重复测试副本。逐项核对路径、占用进程和当前用途。Rust 编译缓存、工作树、旧 profile 副本、诊断转储和全局缓存按下表保留。
- [ ] **复核并登记。** 记录实际清理路径、各盘可用空间变化及 E 盘保留项，复测本机 `dev` 和普通桌面启动。T 盘迁移批次快照单独登记保留期。

### Synthesis sidecar 历史构建筛选

本机盘点了 52 个历史目录。36.55 GiB 中，18.42 GiB 是各次运行的 `prebuild-store/.git` 下载缓存，约 16.17 GiB 是七平台 `.tar.gz`，约 1.96 GiB 是 Windows `pdb.gz`。后两类含大量重复副本。51 份 `prebuild-result.json` 合计约 168 KiB，按运行目录原地保留。`34988175919` 只有空 `FETCH_HEAD` 和约 416 MiB 的临时 Git pack，确认没有运行占用后可回收。

只将仍用于验收、回归复现且需要离线保留的构建，以及远端无法取回、仍需保留的独有候选移到 E 盘。同一七平台集合按 `sets/<aggregate>/` 保存一份原包和 manifest，所需的 Windows PDB 和 manifest 按 `symbols/<source SHA>/win32-x64/` 保存。索引记录关联的运行 ID、源码 SHA、`prebuildCommit`、aggregate、包及 PDB 摘要和保留原因。保留当前 checkout 的七平台 `addon/bin/<target>/synthesis-sidecar/`，以及正在使用的本机构建和原生调试符号。

已发布的普通历史运行通过 `synthesis-sidecar-runtime-prebuilds` 分支上的记录提交恢复七平台原包和已发布的 PDB。对拟回收且无 E 盘副本的历史包，先复核远端对应提交和归档身份。E 盘选中副本按 manifest 逐个校验摘要。若保存了完整七平台集合，可用 `npm run sync:synthesis-sidecar-runtime-prebuilds`，从原地的 v4 结果和 E 盘集合恢复到独立临时 `--addon-root` 抽验。确认恢复来源后，只清理已停用运行的 `prebuild-store`，保留同级结果 JSON。T 盘迁移批次仅承载 VM 交接资产。见 [开发预构建流程](../.agents/skills/synthesis-sidecar-prebuild/SKILL.md)及 [正式发布流程](../.agents/skills/synthesis-sidecar-release-pipeline/SKILL.md)。

| 已盘点资产 | 源机处理条件 |
| --- | --- |
| `.scaffold\synthesis-sidecar-prebuild-results` 36.55 GiB | 按上文在 E 盘保留必要产物。本机留存运行结果和当前在用的预构建。闲置的下载缓存和压缩包副本按路径回收。 |
| `.scaffold\test` 原盘点 4.86 GiB | 保留 `mig-rudEZv` 等独有夹具和未结案的证据，只审核确认停用的重复副本。 |
| 三个 Rust `target` 原盘点合计 23.06 GiB，根目录与 `site` 的 `node_modules` 合计 1.35 GiB | 本轮保留，方便恢复本机构建及增量编译。将来如需腾空间，再盘点旧目标和闲置的构建缓存。 |
| `.scaffold\embedding-prebuild-dev6`、`.scaffold\embedding-dev6-*`、`.scaffold\host-bridge-cli-prebuild*`、`.scaffold\build`、`.codegraph`、`non-existing-zotero-data`、站点生成目录、`artifacts\test-diagnostics` | 本轮保留已有候选、独立 checkout、构建、索引及诊断。确认有可重建的闲置副本时再按准确路径单独审核。 |
| `zotero-hosts`、`zotero-hosts-cache`、`zotero-hosts-recovery` 和旧 `build-preflight` 运行 | 保留本机常用宿主和现有资产，优先从已核实的重复归档腾空间。 |
| 两套源 profile、数据、链接附件、相应 `%LOCALAPPDATA%` profile，以及 `Joshua-Side` 的 `- 副本`、`.bak` | 两套活跃环境约 17.75 GiB，本轮全部保留。旧副本待用户另行确认恢复价值。 |
| `%LOCALAPPDATA%\Temp` 下的项目测试残留、`%LOCALAPPDATA%\Zotero Agents\crash-captures\desktop-wer\zotero.exe.6964.dmp`（约 2.70 GiB） | 本轮保留；已明确结束且可重建的临时目录可单独审核。转储按问题结案和取证需求另行处理。 |
| 已登记的 Git worktree 和共享存储 `D:\Git\JavaScript\zotero-agents.git` | 本轮保留。若未来清理某个 worktree，再核对使用者、分支、独有提交、未跟踪文件和注册状态。 |

HOME、D 盘和 E 盘的浅扫记录供日后单独腾空间时参考，全部保留至本轮迁移结束。表内大小仅计可见文件。

| 根目录候选 | 源机处理条件 |
| --- | --- |
| `%USERPROFILE%` 下 `zr9`、`zr9cases`、`zr9mig`、`zr9native`、`zr9new`、`zr9sup`、`zr9upgrade`、`zr9upgrade8632`、`zr9xpi` | 9 月 26 日的目录，共 65 个直接子目录，体积待核实。已有验收文档引用其中 `zr9`、`zr9new`、`zr9xpi`、`zr9upgrade` 的原始回执，先保全相关回执及必要的复现输入，再按确切路径回收。见 [Synthesis R9 验收记录](../docs/dev/synthesis-r9-stage1-acceptance.md)。 |
| `%USERPROFILE%\Temp\tagreg_out.json`、HOME 下 `_tag_reg_candidate.json`、`temp_gate.json`、`temp_topic_describe.json`、`temp_topics.json` | 疑似项目标签和主题回归输出。按文件核对有无现用脚本引用后清理。`qc_batch1.json`、`pm-current.mjs`、`pm-stash.mjs` 和 `dryrun*.zip` 的归属仍待确认。 |
| `D:\Temp` 的 `build.log`、`cargo-check.log`、`stage1.log` 等，`D:\tmp` 的 `xs.asm`、覆盖率 JSON、HTML 探针及 `D:\temp_r057_*.py` | `D:\Temp` 直接文件约 204 KiB，`D:\tmp` 直接文件约 68.8 MiB，其中 `xs.asm` 约 66.8 MiB，盘点当日还在更新。核对所属进程和留档价值后只清理确认结束的文件。`D:\tmp\codex-salvage` 按工具恢复资料处理，`za-fp-head` 按 Git worktree 处理。 |
| HOME 下 OpenCodex 维护、迁移、断线修复备份，以及 `java_error_in_pycharm64.hprof` 约 1.40 GiB | 供用户在本项目之外按需清理。OpenCodex 备份可能含配置和凭据。旧 PyCharm 转储可在确认无需取证后单独删除。npm、uv、pnpm 共享缓存同样由用户按其他项目的实际使用情况处理。 |
| `E:\ABAQUSTemp` 直接文件约 31.3 GiB、E 盘下载目录、`D:\Build`、`D:\pythonbuild`、`D:\Linux-removal-backup-20261008-094846` | 保留在本次项目清理范围之外。`ABAQUSTemp` 含同步元数据，Linux 移除备份含系统启动和恢复信息。E 盘本次相关路径只涉及 `Zotero_Side_Bibliography\Joshua-Side`。 |

本机正式 Zotero、日常 profile 和库、其他 `Zotero_Side` 子目录、`%LOCALAPPDATA%\zotero-agents` 的共享状态均需保留。工具级 WER 和 `MOZ_CRASHREPORTER*` 配置由用户按后续取证需求处置。

阶段三收据 · 已同步 SHA / E 盘归档与校验结果 / 已清理路径 / C、D、E 空间变化 / 保留或手工处理项 / T 盘迁移快照保留期：待填写。

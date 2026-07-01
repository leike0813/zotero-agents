# Zotero Agents 迁移发布准备工件

生成日期：2026-06-22

## 1. 迁移目标

本轮迁移的核心目标是把项目对外身份从 `Zotero-Skills` / `Zotero Skills` 迁移到 `zotero-agents` / `Zotero Agents`，同时让旧用户可以无痛升级。

目标状态：

- 本地仓库目录迁移到 `zotero-agents`。
- GitHub 主仓库迁移到 `https://github.com/leike0813/zotero-agents`。
- Gitee 镜像仓库为 `https://gitee.com/leike0813/zotero-agents`。
- 插件显示名称为 `Zotero Agents`。
- npm/package/release/docs 对外发布面使用 `zotero-agents`。
- 旧 GitHub 仓库 `https://github.com/leike0813/Zotero-Skills` 额外发布一次迁移版本。
- 迁移版本的插件元数据中的后续更新链接指向新 GitHub 仓库。

## 2. 不变契约

为避免旧用户升级后丢失插件身份、偏好设置、资源路径或历史数据，本次迁移发布必须保留以下内部契约：

| 契约 | 保留原因 |
| --- | --- |
| `addonID = zotero-skills@leike0813@gmail.com` | Zotero 识别插件更新链依赖插件 ID。改变 ID 会被视为新插件。 |
| `addonRef = zotero-skills` | 影响插件资源 namespace、模板替换和构建产物。 |
| `addonInstance = ZoteroSkills` | 影响 JS 全局对象和插件运行时入口。 |
| `prefsPrefix = extensions.zotero.zotero-skills` | 影响用户已有偏好设置读取。 |
| `ZOTERO_SKILLS_RUNTIME_ROOT` | 影响现有脚本和用户环境变量。 |
| `chrome/resource` namespace | 影响插件内资源解析。 |
| `ZoteroSkills*` JS 全局 | 影响运行时兼容和已有调用点。 |
| 旧 schema / marker / payload kind 判断 | 影响旧数据、旧任务和旧工作流兼容。 |

结论：本次不是“彻底换插件身份”，而是“保留内部身份的品牌与发布迁移”。

## 3. 发布链路设计

### 3.1 旧用户升级路径

旧版本用户当前会检查旧仓库更新地址：

```text
https://github.com/leike0813/Zotero-Skills/releases/download/release/update.json
```

因此旧仓库必须保留一次最终迁移发布：

1. 在旧仓库发布迁移版本 XPI。
2. 旧仓库的 `release/update.json` 广告该迁移版本。
3. 该迁移版本 XPI 内部的 `manifest.json` 必须仍保留旧 `addonID`。
4. 该迁移版本 XPI 内部的 `manifest.json` 的 `update_url` 必须指向新仓库：

```text
https://github.com/leike0813/zotero-agents/releases/download/release/update.json
```

用户完成这次升级后，后续更新检查会自然切到新仓库。

### 3.2 新仓持续发布路径

新仓库作为后续唯一主发布源：

```text
https://github.com/leike0813/zotero-agents/releases/download/release/update.json
https://github.com/leike0813/zotero-agents/releases/download/v{{version}}/{{xpiName}}.xpi
```

新仓发布仍必须保留旧 `addonID`，否则迁移版本之后的更新链会断裂。

### 3.3 当前风险点

当前 `zotero-plugin.config.ts` 的 `updateURL` / `xpiDownloadLink` 依赖 `{{owner}}/{{repo}}` 模板。若旧仓工作流直接构建迁移版本，产物里的 `update_url` 可能仍指向旧仓。

发布前应增加显式配置能力，例如：

- `ZOTERO_RELEASE_REPO`：当前发布动作所在仓库。
- `ZOTERO_UPDATE_REPO`：写入 XPI manifest 的更新仓库。
- `ZOTERO_DOWNLOAD_REPO`：写入 update manifest 的 XPI 下载仓库。

迁移版本的推荐配置：

```text
ZOTERO_RELEASE_REPO=leike0813/Zotero-Skills
ZOTERO_UPDATE_REPO=leike0813/zotero-agents
ZOTERO_DOWNLOAD_REPO=leike0813/zotero-agents 或 leike0813/Zotero-Skills
```

更保守的做法是旧仓和新仓发布相同版本号、相同 XPI 内容，但旧仓 update manifest 指向新仓 XPI。这样旧用户拿到迁移版本后，后续更新入口立即切换到新仓。

## 4. 仓库迁移准备

### 4.1 本地仓库

建议流程：

1. 确保当前工作区所有变更已提交或明确保留。
2. 关闭编辑器/终端中依赖旧目录名的进程。
3. 将本地目录从 `Zotero-Skills` 移动到 `zotero-agents`。
4. 更新 Git 远端：

```text
origin -> https://github.com/leike0813/zotero-agents.git
gitee  -> https://gitee.com/leike0813/zotero-agents.git
legacy -> https://github.com/leike0813/Zotero-Skills.git
```

`legacy` 仅用于最后一次迁移发布或必要的旧仓维护，不再作为日常开发远端。

### 4.2 GitHub 新仓

需要准备：

- 创建 `leike0813/zotero-agents`。
- 迁移 repository description、topics、homepage。
- 开启 GitHub Pages。
- 配置 Actions 权限：Pages、releases、contents。
- 复制或重建 release 相关 secrets。
- 检查保护分支、tag/release 权限、workflow dispatch 权限。

### 4.3 Gitee 镜像仓

需要明确镜像范围：

| 范围 | 建议 |
| --- | --- |
| Git 代码镜像 | 建议做。 |
| 文档站 Pages | 建议做。 |
| Release/XPI 镜像 | 可选，除非希望 Gitee 也作为下载源。 |
| Zotero update manifest | 不建议多源分裂，除非后续设计清楚 fallback 策略。 |

插件自动更新建议以 GitHub 新仓作为 canonical source。Gitee 可以作为代码和文档可访问性补充。

## 5. 文档站策略

### 5.1 当前结论

Docusaurus 支持多语言单站点构建，但不内置自动 locale detection。`localeDropdown` 只负责用户手动切换语言。自动根据系统/浏览器语言跳转需要托管层重定向或客户端模块实现。

本项目当前已有：

- `site/docusaurus.config.ts`：`defaultLocale: "en"`，`locales: ["zh-CN", "en"]`。
- `site/src/clientModules/localePersistence.ts`：记住用户上次选择的 locale。
- `src/utils/docsUrl.ts`：插件侧根据 Zotero/browser locale 在 GitHub Pages 和 Gitee Pages 之间选择文档站。

### 5.2 推荐方案

迁移发布前优先采用：

```text
单次 Docusaurus 构建 + GitHub/Gitee 部署同一份 site/build + 客户端首次访问 locale 跳转
```

行为：

- GitHub Pages 和 Gitee Pages 都部署同一份构建产物。
- `defaultLocale` 保持 `en`。
- 英文根路径为 `/zotero-agents/`。
- 中文路径为 `/zotero-agents/zh-CN/...`。
- 首次访问时，如果没有用户历史选择，根据 `navigator.languages` / `navigator.language` 判断是否跳到 `zh-CN`。
- 用户手动切换语言后，以用户选择为准。

这样可以避免双构建带来的部署差异、路径差异和链接回归风险。

### 5.3 何时仍需要双构建

只有在以下要求成立时，才需要双构建或 Gitee 中文根路径提升：

- Gitee 根路径 HTML 必须直接是中文，而不是客户端跳转后显示中文。
- 无 JS 用户、爬虫、链接预览也必须在 Gitee 根路径看到中文。
- SEO 需要 GitHub 英文 canonical root、Gitee 中文 canonical root。

如果只是面向插件用户打开文档，客户端自动跳转足够。

## 6. 发布前改造清单

### 6.1 插件构建与更新链

- [ ] 让 `zotero-plugin.config.ts` 支持显式指定 manifest `update_url` 目标仓库。
- [ ] 让 release/update manifest 的 XPI 下载地址可独立指定。
- [ ] 确认迁移版本 XPI 内 `manifest.json`：
  - [ ] `id` 仍是 `zotero-skills@leike0813@gmail.com`。
  - [ ] `name` 是 `Zotero Agents`。
  - [ ] `update_url` 指向 `leike0813/zotero-agents`。
- [ ] 确认新仓 release `update.json` 指向新仓 XPI。
- [ ] 确认旧仓 final release `update.json` 能让旧用户拿到迁移版本。

### 6.2 CI / Release workflow

- [ ] 检查 `.github/workflows/release.yml` 是否能在旧仓 final release 中传入新仓 update URL。
- [ ] 检查 reusable workflow 是否允许覆盖 update/download repo。
- [ ] 如 reusable workflow 不支持，增加本仓 wrapper 或改为本仓发布脚本。
- [ ] 明确迁移版本发布顺序：先新仓准备 release，再旧仓发布 final update manifest。
- [ ] 迁移后禁用旧仓常规 release workflow，避免误发后续版本。

### 6.3 文档站

- [ ] 扩展 `site/src/clientModules/localePersistence.ts`：首次访问无历史偏好时按浏览器语言选择 locale。
- [ ] 保留 locale dropdown，允许用户手动覆盖。
- [ ] 检查 `src/utils/docsUrl.ts`：
  - [ ] 中文用户打开 Gitee Pages。
  - [ ] 中文文档路径能落到 `/zh-CN/...`，不要只依赖站点内跳转。
  - [ ] 英文用户打开 GitHub Pages 默认根路径。
- [ ] 检查 `.github/workflows/deploy-user-docs.yml`：同一份 `site/build` 推送 GitHub Pages 和 Gitee Pages。
- [ ] 如后续决定 Gitee 中文根路径，再单独设计双构建，不和本次迁移发布混在一起。

### 6.4 仓库元数据

- [ ] 新 GitHub 仓库 description/homepage/topics 更新为 Zotero Agents。
- [ ] Gitee 仓库 description/homepage 更新为 Zotero Agents。
- [ ] 旧 GitHub 仓库 README 顶部增加迁移提示，指向新仓。
- [ ] 旧 GitHub 仓库 release note 写清楚“这是旧仓最后一次迁移发布”。
- [ ] Issue template、security policy、链接中的仓库名检查。

## 7. 推荐发布流程

### Phase 0：冻结与检查

1. 冻结迁移窗口内的非必要变更。
2. 确认当前 pre-rename branding change 已完成并通过验证。
3. 扫描活跃路径中的旧名，只允许兼容契约和历史归档残留。
4. 确认版本号策略：迁移版本是否为当前版本的 patch/minor，是否带 beta 后缀。

### Phase 1：新仓准备

1. 创建并配置 `leike0813/zotero-agents`。
2. 推送完整代码。
3. 配置 secrets、Pages、Actions 权限。
4. 跑完整 CI/build。
5. 发布新仓迁移版本 release，生成新仓 `update.json` 和 XPI。
6. 检查新仓 XPI manifest。

### Phase 2：旧仓 final release

1. 保持旧仓可构建迁移版本。
2. 构建的 XPI manifest `update_url` 指向新仓。
3. 旧仓 `update.json` 广告迁移版本。
4. 旧仓 release note 明确后续更新和源码迁移到新仓。
5. 发布后不要再让旧仓产生常规新版本。

### Phase 3：验证旧用户迁移

1. 安装一个旧版本插件。
2. 触发 Zotero 插件更新检查。
3. 确认旧版本能从旧仓 update manifest 发现迁移版本。
4. 升级后检查：
   - 插件 ID 不变。
   - 用户 prefs 保留。
   - runtime 路径和 WebDAV 默认路径不异常。
   - 插件关于页/偏好页/菜单显示 `Zotero Agents`。
   - XPI manifest 的后续 update URL 已指向新仓。
5. 再发布一个新仓测试版本或检查 update manifest，确认后续更新不再依赖旧仓。

### Phase 4：文档与镜像验证

1. GitHub Pages 打开英文默认页面。
2. Gitee Pages 打开后中文用户能自动跳到中文页面。
3. 手动切换语言后刷新仍保持用户选择。
4. 插件内文档链接根据用户 locale 指向合适站点与路径。
5. 检查 README、release note、文档中的仓库链接均指向新仓。

## 8. 最小验证命令

迁移发布前建议至少执行：

```bash
npm run test:node:core -- --grep "runtime persistence|run zotero direct|dashboard toolbar|host bridge"
npm run check:host-bridge-doc-sync
npm run check:localization-governance
npm run build
cd site && npx docusaurus build
```

发布产物检查：

```text
unzip XPI
inspect manifest.json
inspect update.json
verify id/update_url/name/homepage
```

旧用户迁移检查必须在真实 Zotero profile 或隔离测试 profile 中完成，不能只依赖静态构建检查。

## 9. 官方 Workflow 内容包订阅发布

近期官方 workflow / plugin-side skill 已从“随 XPI 打包的固定资产”改为“订阅制内容包”。这会让迁移发布新增一个独立且关键的发布面：

```text
leike0813/zotero-agents-workflows
├─ GitHub Releases: official-workflows-v{{contentVersion}}/*.zip
└─ content-feed branch: stable/beta/dev/feed.json
```

Gitee 镜像目标：

```text
https://gitee.com/leike0813/zotero-agents-workflows
```

### 9.1 迁移影响

官方内容不再作为 XPI 运行时资产安装。插件启动后会扫描：

```text
<runtimeRoot>/content/official/workflows
<runtimeRoot>/content/official/skills
<runtimeRoot>/content/user/workflows
<runtimeRoot>/content/user/skills
```

如果官方内容包未安装，插件不会从 XPI 内置目录 fallback，而是显示 0 个官方 workflow，并通过右键菜单或偏好设置引导用户安装官方 Workflow 包。

因此，迁移发布不能只发布插件 XPI。`zotero-agents-workflows` 内容仓、Release assets 和 `content-feed` 分支必须在迁移版本对外发布前可用。

### 9.2 默认订阅地址

插件默认 stable/beta/dev 订阅地址已指向新内容仓：

```text
https://raw.githubusercontent.com/leike0813/zotero-agents-workflows/content-feed/stable/feed.json
https://gitee.com/leike0813/zotero-agents-workflows/raw/content-feed/stable/feed.json
```

beta/dev 同理。dev channel 只在 debug mode 下有效；非 debug mode 中配置 dev 会回退到 stable。

### 9.3 发布契约

内容包发布由 `npm run build:content-feed -- --channels stable,beta,dev` 生成，当前约定：

| 项 | 当前值 |
| --- | --- |
| 内容仓 | `leike0813/zotero-agents-workflows` |
| feed 分支 | `content-feed` |
| Release tag | `official-workflows-v{{version}}` |
| package id | `zotero-agents-official-workflows` |
| feed schema | `zotero-agents.content-feed.v1` |
| package schema | `zotero-agents.content-package.v1` |
| content API | `1.0.0` |

当前 `content-package.version.json` 的兼容范围为：

```json
{
  "plugin": ">=0.4.0 <0.5.0",
  "content_api": "^1.0.0",
  "zotero": ">=7 <10"
}
```

如果迁移版本号升到 `0.5.0` 或更高，必须先更新内容包兼容范围并重新发布 feed；否则插件会拒绝安装官方内容包。

### 9.4 GitHub / Gitee 镜像一致性

插件会同时检查 primary feed 和 mirror feed。两边 feed 如果在以下语义字段上不一致，插件会拒绝安装：

- feed revision
- package id
- package version
- `debug_content`
- `content_api`
- `requires`
- artifact sha256
- artifact size

只有 Release asset URL 不同是允许的。

发布时必须确保 GitHub 和 Gitee 的 `content-feed` 分支描述同一份内容包，且 Release asset digest 一致。Gitee 不能长期滞后，否则用户会遇到 mirror mismatch。

### 9.5 迁移发布顺序调整

内容订阅制后的推荐顺序：

1. 创建并配置 `leike0813/zotero-agents-workflows` GitHub 仓。
2. 创建并配置 Gitee 镜像仓 `leike0813/zotero-agents-workflows`。
3. 配置内容发布 token，本地 `.env` 与 CI 使用同名变量：
   - `GITHUB_TOKEN`
   - `GITEE_TOKEN`
   - Gitee 内容仓固定为 `leike0813/zotero-agents-workflows`，不再通过环境变量覆盖。
4. 构建并发布 stable/beta/dev 官方内容包。
5. 验证 GitHub / Gitee feed 可访问且语义一致。
6. 发布新仓插件迁移版本。
7. 发布旧仓 final release，引导旧用户升级到迁移版本。
8. 用旧 profile 验证升级后官方 Workflow 包安装入口可见，并能成功安装内容包。

### 9.6 与 Host Bridge CLI Bundle 的关系

官方内容包会收集 `skills_builtin/**` 中带 `assets/runner.json` 的 plugin-side skill，因此 `skills_builtin/zotero-bridge-cli` 会进入官方内容包。

但这不替代 Host Bridge CLI bundle：

| 发布面 | 作用 |
| --- | --- |
| 官方 Workflow 内容包 | 安装到插件 runtime，供 Zotero 内部 workflow / skill registry 使用。 |
| Host Bridge CLI bundle | 发布预编译 `zotero-bridge`、wrapper skill、安装脚本，供外部 agent / CLI 使用。 |

两者需要分别发布和验证。更新官方内容包不会自动更新 `host-bridge/zotero-bridge-cli-bundle` 分支；更新 Host Bridge bundle 也不会自动更新订阅内容包。

### 9.7 发布前检查

- [ ] `zotero-agents-workflows` GitHub 仓存在。
- [ ] `zotero-agents-workflows` Gitee 镜像存在。
- [ ] `content-feed` 分支包含 `stable/feed.json`、`beta/feed.json`、`dev/feed.json`。
- [ ] GitHub Release `official-workflows-v{{version}}` 包含各 channel zip 和 sha256 文件。
- [ ] Gitee Release assets 可访问，或 feed mirror URL 指向实际可下载位置。
- [ ] GitHub / Gitee feed 语义字段一致。
- [ ] `content-package.version.json` 的 plugin 兼容范围覆盖迁移版本号。
- [ ] 旧用户升级后，在未安装官方内容包时能看到安装入口。
- [ ] 安装官方内容包后，Dashboard / 右键菜单能加载官方 workflow。

## 10. Host Bridge CLI Bundle 发布

Host Bridge CLI bundle 是独立发布分支，不应和 XPI release 视为同一个产物面。

当前发布约定：

| 项 | 当前值 |
| --- | --- |
| 发布脚本 | `scripts/publish-host-bridge-cli-bundle.ps1` |
| 发布分支 | `host-bridge/zotero-bridge-cli-bundle` |
| 默认 remote | `origin` |
| bundle 内容 | 预编译 `zotero-bridge`、wrapper skill、`install.ps1` / `install.sh`、`manifest.json` |
| bundle manifest source repository | `zotero-agents` |

迁移后的推荐策略：

1. 新 GitHub 仓库作为 canonical bundle 源。
2. 分支名继续使用 `host-bridge/zotero-bridge-cli-bundle`，不要因仓库改名而改分支名。
3. 旧 GitHub 仓库保留一次 final bundle 分支，用于旧引用和迁移窗口。
4. Gitee 只镜像同一个 bundle 分支 commit，不重新运行发布脚本生成另一份 commit。

原因：`publish-host-bridge-cli-bundle.ps1` 会写入 `publishedAt` 等发布元数据。如果分别对 GitHub 和 Gitee 各跑一次脚本，即使内容等价，也会生成不同 commit。为了让双仓镜像保持可验证的一致性，应先在 canonical GitHub 仓生成一次发布 commit，再把同一个 ref 推到 Gitee。

迁移准备：

```powershell
# 新仓 origin 指向 https://github.com/leike0813/zotero-agents.git 后，
# 继续发布 canonical bundle 分支。
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-host-bridge-cli-bundle.ps1 -AllowDirty -Push

# 如果新仓不是完整 mirror 创建，而只推了 main，需要额外推送 bundle 分支。
git push origin host-bridge/zotero-bridge-cli-bundle:host-bridge/zotero-bridge-cli-bundle

# Gitee 作为镜像时，推送同一个 ref，不重新跑发布脚本。
git push gitee host-bridge/zotero-bridge-cli-bundle:host-bridge/zotero-bridge-cli-bundle
```

旧仓 final bundle 处理：

- 旧仓 `Zotero-Skills` 的 `host-bridge/zotero-bridge-cli-bundle` 分支不删除。
- 迁移版本发布时可以把同一份最新 bundle 推到旧仓一次。
- 旧仓 bundle README / release note 应提示后续维护位置迁移到 `https://github.com/leike0813/zotero-agents`。
- 迁移窗口结束后，旧仓不再持续更新 Host Bridge CLI bundle。

发布前检查：

- [ ] 新仓存在 `host-bridge/zotero-bridge-cli-bundle` 分支。
- [ ] Gitee 存在同名分支，且 commit 与 GitHub canonical 分支一致。
- [ ] 旧仓 final bundle 分支保留，且不会继续作为日常发布目标。
- [ ] `manifest.json` 中 `source.repository` 为 `zotero-agents`。
- [ ] `install.ps1` / `install.sh` 中默认安装目录仍为 `zotero-agents`。
- [ ] wrapper skill 和 `doc/host-bridge-cli.md` 已由 `npm run render:host-bridge-surface` 同步。

## 11. 待决问题

| 问题 | 推荐默认 |
| --- | --- |
| 迁移版本号 | 使用正常递增版本，不改变插件 ID。 |
| 旧仓 final release 的 XPI 下载地址 | 优先指向新仓 XPI，旧仓可附同一 XPI 作为保底。 |
| Gitee 是否承载 XPI release | 暂不作为自动更新源，只做代码/文档镜像。 |
| 文档站是否双构建 | 暂不双构建，先做客户端 locale 自动跳转。 |
| Host Bridge CLI bundle 的 Gitee 发布 | 只镜像 GitHub canonical 分支 commit，不单独重新生成。 |
| 官方 Workflow 内容包发布仓 | 使用独立仓 `leike0813/zotero-agents-workflows`，GitHub canonical，Gitee mirror。 |
| 迁移版本是否自动安装官方内容包 | 暂不自动安装；确保菜单和偏好设置入口清晰可用。若要首次启动提示，单独设计。 |
| Gitee 根路径是否必须中文 HTML | 若未来有 SEO/无 JS 要求，再单独设计。 |
| 旧仓是否归档 | final release 稳定后一段时间再归档，避免用户迁移窗口过短。 |

## 12. 关键判断

这次迁移发布最容易出问题的不是品牌文案，而是更新链：

```text
旧版本 -> 旧仓 update.json -> 迁移版本 XPI -> 新仓 update_url -> 后续新仓 update.json
```

只要这条链路中的插件 ID 和 update URL 处理正确，旧用户可以无感迁移；如果迁移版本 XPI 仍写旧仓 update URL，用户会被困在旧仓；如果插件 ID 被改掉，Zotero 会把它视为另一个插件，旧用户偏好和安装状态都会出现断裂。

订阅制内容包引入了另一条同样关键的链路：

```text
迁移版本插件 -> 默认 content feed -> 官方 Workflow 包 Release asset -> runtime content/official
```

如果这条链路在迁移发布时不可用，用户虽然能成功升级插件，但官方 workflow 会为空；如果内容包兼容范围没有覆盖迁移版本，用户会看到安装入口但无法安装官方内容。

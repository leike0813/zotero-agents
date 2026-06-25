# Zotero Agents 迁移发布操作手册

生成日期：2026-06-24

更新日期：2026-06-25

## 1. 目标

本手册用于执行一次关键迁移发布：

```text
旧仓库： https://github.com/leike0813/Zotero-Skills
新仓库： https://github.com/leike0813/zotero-agents
Gitee： https://gitee.com/leike0813/zotero-agents
内容包： https://github.com/leike0813/zotero-agents-workflows
内容包镜像： https://gitee.com/leike0813/zotero-agents-workflows
```

迁移目标：

- 插件对外名称为 `Zotero Agents`。
- 本地仓库目录迁移为 `zotero-agents`。
- 旧用户通过旧仓最后一版无痛升级。
- 插件内部 ID、prefs、addon namespace 等兼容契约不变。
- 旧仓 final release 的 README 指向新仓。
- 旧仓 final release 的外链全部指向新仓、GitHub Pages 文档站和新内容包源。
- 新仓 README 不保留“迁移提示横幅”，只保留旧名称 / 旧仓库的历史说明。
- Gitee Pages 已下线，不再作为文档站或插件内文档按钮目标。
- 插件内置精简帮助中心作为中文/国内/离线文档兜底，随 XPI 发布。

## 2. 当前静态检查结论

已检查活跃文件中的旧仓外链：

```text
README*.md
.github/**
addon/**
src/**
scripts/**
site/**
package.json
zotero-plugin.config.ts
content-package.version.json
```

结论：

- 未发现活跃文件中残留 `github.com/leike0813/Zotero-Skills` 外链。
- 多语言 README 的 Release / License 链接已经指向 `github.com/leike0813/zotero-agents`。
- `package.json` 的 repository / bugs / homepage 已指向新仓。
- prefs 中官方 workflow feed 已指向 `leike0813/zotero-agents-workflows`。
- 文档站配置使用 `zotero-agents`。
- 插件内文档 URL helper 使用：
  - GitHub Pages：`https://leike0813.github.io/zotero-agents/`
  - debug：`http://localhost:3000/zotero-agents/`
- 生产环境不再按 locale 路由到 Gitee Pages；Online Docs 统一打开 GitHub Pages 根页面。
- 插件已新增内置 Help Center：
  - 源：`site/docs/**` 与 `site/i18n/*/docusaurus-plugin-content-docs/current/**`
  - 产物：`addon/content/help-docs/**`
  - 构建命令：`npm run build:help-docs`
  - 校验命令：`npm run check:help-docs`
- Dashboard/Synthesis top bar 和 prefs About 区同时提供 `Help` 与 `Online Docs` 两个入口。
- 偏好页 About 区仓库链接已指向 `https://github.com/leike0813/zotero-agents`。

需要特别注意：

- `zotero-plugin.config.ts` 的 `updateURL` 和 `xpiDownloadLink` 已固定指向 `https://github.com/leike0813/zotero-agents`。
- 因此即使从旧仓构建 final release，XPI 内的 `update_url` 也会指向新仓。
- 发布前仍需要抽查 XPI 内 `manifest.json` 和 release `update.json`，确认没有被 release 工具链改回旧仓地址。

## 3. 职责分工

### 3.1 我可以帮你做

- 修改发布配置，让迁移版本 XPI 的 `update_url` 明确指向新仓。
- 修改 release workflow / 发布脚本，使旧仓 final release 和新仓 release 可分别指定 update/download repo。
- 准备旧仓 README 迁移提示文本。
- 准备新仓 README 的旧名称 / 旧仓库历史说明文本。
- 扫描旧名、旧链接、旧 feed 地址残留。
- 构建 XPI、生成内置帮助文档、生成 content feed、构建线上文档站。
- 检查 XPI 内 `manifest.json`、`addon/content/help-docs/manifest.json`、release `update.json`、content feed JSON。
- 准备 release notes。
- 在你明确授权后执行 git staging、tag、push、release 相关命令。

### 3.2 需要你准备或操作

- 创建或确认 GitHub 新仓 `leike0813/zotero-agents`。
- 创建或确认 Gitee 镜像仓 `leike0813/zotero-agents`。
- 创建或确认 GitHub 内容仓 `leike0813/zotero-agents-workflows`。
- 创建或确认 Gitee 内容仓 `leike0813/zotero-agents-workflows`。
- 准备 GitHub / Gitee token：
  - `GITHUB_TOKEN`
  - `GITEE_TOKEN`
  - `GITEE_USERNAME` 不再用于文档站部署；仅在其它镜像脚本明确需要时保留。
- 在 GitHub Actions secrets 中配置所需 token。
- 不再需要在 Gitee 上启用 Pages。
- 在真实 Zotero profile 或隔离 profile 中验证旧用户升级链路。
- 在真实 Zotero profile 或隔离 profile 中验证内置 Help、Online Docs、官方 Workflow 包安装。
- 最终确认是否归档旧仓，以及何时归档。

## 4. 发布前阻塞项

### 4.1 update_url 新仓固定指向

已经在源码中固定。

目标行为：

```text
新仓 release：
  XPI manifest update_url -> https://github.com/leike0813/zotero-agents/releases/download/release/update.json
  update.json XPI download -> https://github.com/leike0813/zotero-agents/releases/download/v{{version}}/*.xpi

旧仓 final release：
  XPI manifest update_url -> https://github.com/leike0813/zotero-agents/releases/download/release/update.json
  旧仓 update.json -> 广告迁移版本
  XPI download -> 可指向旧仓或新仓；推荐旧仓附同一 XPI 作为保底，新仓也发布同版本
```

当前实现：

- `updateURL` 固定为 `https://github.com/leike0813/zotero-agents/releases/download/release/update.json` 或 beta 对应文件。
- `xpiDownloadLink` 固定为 `https://github.com/leike0813/zotero-agents/releases/download/v{{version}}/{{xpiName}}.xpi`。
- 不再依赖 `{{owner}}/{{repo}}` 模板，也不需要发布时设置额外环境变量。

### 4.2 Gitee 内容包 Release assets

当前 CI 已固定 Gitee content feed 仓库地址，并使用 `GITEE_TOKEN` 推送 `content-feed` 分支；生成的 mirror asset URL 固定为：

```text
https://gitee.com/leike0813/zotero-agents-workflows/releases/download/official-workflows-v{{version}}/*.zip
```

需要确认 Gitee Release assets 是否会被上传。若当前 CI 只上传 GitHub Release assets 而不上传 Gitee Release assets，则 mirror URL 会 404。发布前必须二选一：

- 实现 Gitee Release asset 上传步骤。
- 或在发布流程中手动上传同一份 zip / sha256 到 Gitee Release。

由于插件会校验 feed mirror 语义一致性，Gitee 不能长期滞后。

### 4.3 content package 兼容范围

当前内容包兼容范围：

```json
{
  "plugin": ">=0.5.0",
  "content_api": "^1.0.0",
  "zotero": ">=7 <10"
}
```

本次迁移发布版本已定为 `v0.5.0`；内容包最低插件版本同步为 `0.5.0`，暂不设置最高插件版本上限。发布前必须重新生成并发布 content feed。

### 4.4 内置帮助中心产物

迁移版本必须包含内置帮助中心，作为 Gitee Pages 下线后的国内/离线文档兜底。

必须满足：

```text
addon/content/help-center/index.html
addon/content/help-docs/manifest.json
addon/content/help-docs/docs/{locale}/**/*.md
addon/content/help-docs/assets/img/**
```

构建与校验：

```powershell
npm run build:help-docs
npm run check:help-docs
```

当前约定：

- `build` 会先运行 `build:help-docs`，确保 XPI 打包最新帮助产物。
- 首版打包所有 Docusaurus docs locale，而不只打包 `en` / `zh-CN`。
- 图片在构建期用 `sharp` 压缩；Markdown 中图片会导出为带 `zs-doc-figure` class 的安全 figure HTML。
- `check:help-docs` 校验 manifest、内部 doc link、图片引用与总大小预算。
- 当前预算：`addon/content/help-docs` 不超过 6 MB。

需要在真实 Zotero 中抽查：

- Help 能在 Zotero 内部 tab 打开。
- 左侧导航和右侧阅读区都可滚动。
- 文档图片尺寸接近线上 Docusaurus，不出现超大截图。
- 切换 locale 后 shell 文案与文档内容同步变化。
- Help 内部链接不打开外部浏览器。
- 外部链接和 Online Docs 通过系统浏览器打开。

## 5. 推荐发布总顺序

```text
Phase 0  冻结变更与确定版本
Phase 1  补齐发布配置能力
Phase 2  准备新 GitHub / Gitee 仓库
Phase 3  发布官方 workflow 内容包
Phase 4  构建内置帮助并部署 GitHub 文档站
Phase 5  发布新仓迁移版本
Phase 6  发布旧仓 final release
Phase 7  验证旧用户升级链路
Phase 8  收尾与旧仓冻结
```

## 6. Phase 0：冻结与版本确认

你需要决定：

- 迁移版本号，例如 `0.4.1`、`0.4.2` 或 `0.5.0`。
- 是否在迁移版本中加入首次安装官方 Workflow 包的主动提示。
- 旧仓 final release 是否使用同一个 tag 名。
- 旧仓 final release 的 XPI 下载地址是否指向旧仓、还是新仓。

本次发布约定：

- 使用 `v0.5.0` 作为插件 release tag，代码中的语义版本写 `0.5.0`。
- 官方 Workflow 内容包要求插件版本 `>=0.5.0`，不设置最高版本上限。
- 暂不自动安装官方 Workflow 包，保留右键菜单和 prefs 安装入口。
- 新仓和旧仓发布同版本号。
- 新仓作为后续 update source；旧仓 final release 保留同一 XPI 作为迁移窗口保底。

我可以做：

- 扫描未提交变更。
- 帮你整理 release notes。
- 调整版本号和 package lock。

你需要做：

- 确认版本号。
- 确认是否冻结当前工作区。

## 7. Phase 1：补齐发布配置

必须修改并验证：

- `zotero-plugin.config.ts`
- `.github/workflows/release.yml` 或 release wrapper
- 必要时补充 release 脚本

验收标准：

- 新仓构建时，XPI `manifest.json` 的 `update_url` 指向新仓。
- 旧仓构建时，XPI `manifest.json` 的 `update_url` 仍指向新仓。
- 旧仓 `update.json` 能让旧用户下载迁移版本。

建议检查命令：

```powershell
npm run build
# 解包 .xpi 后检查 manifest.json
# 检查 update.json 中 update_link / update_url
```

我可以做：

- 实现环境变量覆盖。
- 写一个产物检查脚本。
- 跑构建并检查 XPI。

你需要做：

- 明确旧仓 final release 的 XPI 下载地址策略。

## 8. Phase 2：准备新仓和镜像

### 8.1 GitHub 主仓

你需要：

1. 创建 `https://github.com/leike0813/zotero-agents`。
2. 配置仓库 description、topics、homepage。
3. 开启 Actions。
4. 开启 Pages。
5. 配置 secrets：
   - `GITHUB_TOKEN`，用于主仓 release。
   - `GITEE_TOKEN`
   - 不再需要用于文档 Pages 的 `GITEE_USERNAME`。
6. 确认 release workflow 有 `contents: write` 权限。

我可以：

- 调整 workflow 中 token 命名。
- 推送代码前做静态检查。
- 准备远端设置命令。

### 8.2 Gitee 主仓镜像

你需要：

1. 创建 `https://gitee.com/leike0813/zotero-agents`。
2. 不启用 Pages；Gitee 主仓只作为代码镜像或国内仓库入口。
3. 确认 token 可按需要 push mirror ref。

我可以：

- 检查镜像 workflow。
- 在你授权后推送 mirror ref。

### 8.3 内容包仓库

你需要：

1. 创建 `https://github.com/leike0813/zotero-agents-workflows`。
2. 创建 `https://gitee.com/leike0813/zotero-agents-workflows`。
3. 确认 GitHub token 能写入内容仓 Release 和 `content-feed` 分支。
4. 确认 Gitee token 能写入内容仓 `content-feed` 分支和 Release assets。

我可以：

- 检查 CI 生成的 feed。
- 准备 Gitee Release asset 上传步骤。
- 验证 GitHub/Gitee feed 语义一致。

## 9. Phase 3：发布官方 Workflow 内容包

内容包必须先于插件迁移版本可用。

本地生成检查：

```powershell
npm run build:content-feed -- --channels stable,beta,dev --out artifact/content-packages
```

检查 stable feed：

```powershell
Select-String -Path artifact/content-packages/stable/feed.json -Pattern "github.com|gitee.com|sha256"
```

发布后检查：

```text
https://raw.githubusercontent.com/leike0813/zotero-agents-workflows/content-feed/stable/feed.json
https://gitee.com/leike0813/zotero-agents-workflows/raw/content-feed/stable/feed.json
```

还要检查 Release asset：

```text
https://github.com/leike0813/zotero-agents-workflows/releases/tag/official-workflows-v{{contentVersion}}
https://gitee.com/leike0813/zotero-agents-workflows/releases/tag/official-workflows-v{{contentVersion}}
```

验收标准：

- stable/beta/dev feed 都存在。
- GitHub feed 和 Gitee feed 语义一致。
- feed 中 zip 的 sha256 与实际下载文件一致。
- 插件可从 prefs 安装官方 Workflow 包。

## 10. Phase 4：构建内置帮助并部署 GitHub 文档站

### 10.1 内置帮助中心

构建检查：

```powershell
npm run build:help-docs
npm run check:help-docs
```

检查 manifest：

```powershell
Get-Content addon/content/help-docs/manifest.json
```

验收标准：

- `manifest.schema` 为 `zotero-agents.help-docs.v1`。
- `locales` 覆盖 `site/docs` 和 `site/i18n/**/current` 中存在的文档 locale。
- `default_doc` 为 `installation`。
- 所有 `docs[].path` 均存在。
- 所有 `assets[]` 均存在。
- 总大小不超过 6 MB。

XPI 构建后还需抽查压缩包内存在：

```text
addon/content/help-center/index.html
addon/content/help-docs/manifest.json
addon/content/help-docs/docs/en/installation.md
addon/content/help-docs/assets/img/
```

### 10.2 线上文档站

构建检查：

```powershell
npm run docs:build
```

目标地址：

```text
GitHub Pages: https://leike0813.github.io/zotero-agents/
```

插件内文档入口当前约定：

- `Help`：打开插件内置帮助中心，不依赖网络。
- `Online Docs`：生产环境打开 GitHub Pages 根页面。
- debug mode 下 `Online Docs`：`http://localhost:3000/zotero-agents/`

验收标准：

- GitHub Pages 根路径可访问。
- GitHub Pages 的 locale 路由可访问。
- 插件内 Help 在没有外部网络时仍可打开 bundled docs。
- 插件内 Online Docs 打开根页面，不打开 `intro` 或 `installation`。
- 不再把 Gitee Pages 作为文档站目标或中文默认路由。

## 11. Phase 5：发布新仓迁移版本

前置条件：

- content feed 已发布。
- docs 已部署。
- release config 已固定指向新仓 release。
- 新仓 README 不带旧仓迁移提示横幅。
- 新仓 README 可保留一段历史说明，例如：

```markdown
## Project Rename

Zotero Agents was formerly developed as Zotero-Skills. The historical repository is https://github.com/leike0813/Zotero-Skills and is retained for migration and archival reference. New development, releases, documentation, and issue tracking live in this repository.
```

发布步骤：

1. 确认 `origin` 指向 `https://github.com/leike0813/zotero-agents.git`。
2. 确认 `gitee` 指向 `https://gitee.com/leike0813/zotero-agents.git`。
3. 跑最小验证：

```powershell
npm run build:help-docs
npm run check:help-docs
npm run check:localization-governance
npm run check:host-bridge-doc-sync
npm run build
npm run docs:build
npm run build:content-feed -- --channels stable,beta,dev --out artifact/content-packages
```

4. 创建 release tag。
5. 推送 tag 到新仓。
6. 等待 release workflow 完成。
7. 下载新仓 XPI 和 update manifest 检查。

新仓 XPI 必须满足：

```text
manifest id: zotero-skills@leike0813@gmail.com
manifest name: Zotero Agents
manifest update_url: https://github.com/leike0813/zotero-agents/releases/download/release/update.json
contains: addon/content/help-center/index.html
contains: addon/content/help-docs/manifest.json
```

## 12. Phase 6：发布旧仓 final release

旧仓 final release 的职责只有一个：把旧用户带到迁移版本。

### 12.1 README 策略

旧仓 final release 前，在旧仓 README 顶部加入迁移提示。

建议英文文本：

```markdown
> [!IMPORTANT]
> This repository has moved to https://github.com/leike0813/zotero-agents.
> Zotero-Skills has been renamed to Zotero Agents. This repository is kept only for the final migration release and historical reference. Please use the new repository for releases, documentation, issues, and future development.
```

建议中文文本：

```markdown
> [!IMPORTANT]
> 本仓库已迁移到 https://github.com/leike0813/zotero-agents。
> Zotero-Skills 已更名为 Zotero Agents。本仓库仅保留最后一次迁移发布和历史记录；后续发布、文档、问题反馈和开发都请前往新仓库。
```

最低要求：修改 `README.md`。

推荐要求：同步修改 `README-zhCN.md`、`README-frFR.md`、`README-jaJP.md` 顶部提示，避免不同语言入口信息不一致。

### 12.2 外链要求

旧仓 final release 的所有活跃外链必须指向新地址：

- README release 链接：`https://github.com/leike0813/zotero-agents/releases`
- package homepage：`https://github.com/leike0813/zotero-agents#readme`
- issue 链接：`https://github.com/leike0813/zotero-agents/issues`
- 线上文档站：`https://leike0813.github.io/zotero-agents/`
- 插件内 Help：随 XPI 打包的 `addon/content/help-docs/**`
- workflow feed：`leike0813/zotero-agents-workflows`
- XPI manifest update_url：新仓 update.json

当前静态检查显示这些外链基本已经满足；release config 已固定指向新仓。

### 12.3 发布步骤

1. 切到旧仓 final release 工作区或 legacy remote 工作区。
2. 应用旧仓 README 迁移提示。
3. 确认代码内容与新仓迁移版本一致，除了旧仓 README 迁移提示。
4. 构建 XPI。
5. 检查 XPI manifest，确认 `update_url` 指向新仓。
6. 发布旧仓 final release。
7. 检查旧仓 `release/update.json` 能被旧版本发现。

旧仓 release note 必须说明：

- 这是 `Zotero-Skills` 旧仓最后一次迁移发布。
- 插件已更名为 `Zotero Agents`。
- 后续更新地址已切换到新仓。
- 用户无需卸载重装，正常升级即可保留配置。

## 13. Phase 7：旧用户升级验证

必须用真实 Zotero 或隔离 profile 验证。

流程：

1. 安装迁移前旧版本。
2. 确认旧版本 update URL 指向旧仓。
3. 触发 Zotero 插件更新。
4. 确认能从旧仓 `update.json` 发现迁移版本。
5. 升级到迁移版本。
6. 检查：
   - 插件 ID 仍是 `zotero-skills@leike0813@gmail.com`。
   - prefs 保留。
   - 显示名称为 `Zotero Agents`。
   - 后续 update URL 指向新仓。
   - `Help` 打开插件内置帮助中心。
   - `Online Docs` 打开 GitHub Pages 根页面。
   - debug mode 下 `Online Docs` 打开 `http://localhost:3000/zotero-agents/`。
   - 官方 Workflow 包安装入口可见。
   - 官方 Workflow 包可从新 content feed 安装。
7. 如可能，再发布或模拟一个新仓后续版本，确认迁移版能从新仓继续升级。

## 14. Phase 8：收尾

旧仓：

- 保留 README 迁移提示。
- 保留 final release。
- 关闭或限制后续 release workflow。
- Issue template 指向新仓。
- 观察一段迁移窗口后再决定是否 archive。

新仓：

- README 不保留“本仓已迁移”提示横幅。
- 保留旧名称 / 旧仓库历史说明。
- release、issue、workflow feed 都以新仓为主。
- 线上文档站以 GitHub Pages 为主。
- 插件内置 Help 作为国内/离线访问兜底，随 XPI 版本更新。

内容仓：

- GitHub 作为 canonical。
- Gitee 作为 mirror。
- 每次内容包发布都验证 GitHub/Gitee feed 与 Release assets。

## 15. 发布前最终清单

- [ ] 迁移版本号已确定。
- [ ] `update_url` 覆盖能力已实现。
- [ ] 新仓 `zotero-agents` 已创建。
- [ ] Gitee 主仓 `zotero-agents` 已创建。
- [ ] GitHub 内容仓 `zotero-agents-workflows` 已创建。
- [ ] Gitee 内容仓 `zotero-agents-workflows` 已创建。
- [ ] `GITHUB_TOKEN` 已配置，可写主仓 release。
- [ ] `GITEE_TOKEN` 已配置，可写内容仓 mirror/feed/Release assets。
- [ ] `GITEE_USERNAME` 不再作为文档部署必需 secret。
- [ ] content feed stable/beta/dev 已发布。
- [ ] Gitee content feed mirror 和 Release assets 可访问。
- [ ] `npm run build:help-docs` 已通过。
- [ ] `npm run check:help-docs` 已通过。
- [ ] XPI 内包含 `addon/content/help-center/index.html` 与 `addon/content/help-docs/manifest.json`。
- [ ] 文档站 GitHub Pages 可访问。
- [ ] 插件内 Help 可在真实或隔离 Zotero profile 中打开。
- [ ] 插件内 Online Docs 可打开 GitHub Pages 根页面。
- [ ] 新仓 README 无迁移提示横幅。
- [ ] 新仓 README 有旧名称 / 旧仓库历史说明。
- [ ] 旧仓 README 有迁移提示。
- [ ] 旧仓 final release XPI 的 `update_url` 指向新仓。
- [ ] 旧仓 final release `update.json` 可被旧版本发现。
- [ ] 旧用户升级链路已用真实或隔离 Zotero profile 验证。

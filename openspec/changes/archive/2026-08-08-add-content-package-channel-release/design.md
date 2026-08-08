## Context

当前 release CLI 不接受频道参数，GitHub Actions 固定构建三个频道；workflow 在更新 `content-feed` 分支前会清空整个工作树。构建与校验脚本已支持频道子集，但其默认集合不同。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 让维护者以单一、显式的频道集合执行正式发布。
- 将该集合完整传递到构建、asset 上传、feed 更新和发布后验证。
- 使分频道发布不会覆盖其他频道或并发发布的结果。

**Non-Goals:**

- 不改变插件订阅运行时、频道可见性或 dev 的 debug mode 要求。
- 不引入按频道分别维护的版本文件，也不把 Gitee 同步加入正式发布门禁。
- 不改变直接构建和直接校验命令的既有默认频道集合。

## Decisions

### 显式发布选择器

release CLI 增加仅供 `--dispatch` 使用的 `--channels <csv>`。其值必须是 stable、beta、dev 的非空子集；解析器去重并按 stable、beta、dev 规范化。没有该参数的 dispatch 在本地失败，GitHub Actions 的 `channels` workflow-dispatch input 同样为必填。

这避免现有三套不同默认值决定正式发布范围。版本 bump 不需要频道；将频道与 bump 混用会报错。bump 完成后的提示命令显式列出三个频道，维护者可再收窄范围。

### 频道解析单一事实源

新增共享脚本模块，导出频道类型、规范顺序和严格 CSV 解析器。release、build 与 check 使用它，避免对未知频道静默忽略。build 保留 stable,dev 默认，check 保留 stable,beta 默认及 `--include-dev` 兼容别名；只有正式 dispatch 禁止默认值。

### 可测试的 feed 分支补丁发布

将 workflow 内联 shell 重构为独立脚本。该脚本检出 `content-feed` 后仅复制所选 `<channel>/feed.json`，不清空工作树；首次创建分支时写入静态 README，后续 scoped 发布不重写 README。workflow 对同一发布目标使用不取消的 concurrency group，串行化写入。

独立脚本取代内联 shell 是为了用临时 bare Git remote 验证“只更新所选频道”的行为，而非以静态 YAML 文本断言代替行为测试。

### 发布后 scoped 验证

workflow 按选定频道完成构建、GitHub Release asset 上传和 feed 分支推送后，调用现有校验脚本并传入相同集合。校验依赖远端 feed 与 asset，因此不能放在发布前；不传 `--check-mirror`，因为 Gitee 不属于正式 GitHub 发布主线。

## Risks / Trade-offs

- [全局版本分批进入频道时，全频道校验会看到未选频道的旧版本] → 正式 workflow 仅执行 scoped 校验；全频道审计必须显式选择全部频道。
- [GitHub Actions 手工输入绕过本地 CLI] → workflow 将输入经环境变量传给共享的严格解析器，未知或空频道在构建前失败。
- [多个发布同时写远端 feed 分支] → workflow concurrency 串行化写入且不取消运行。

## Migration Plan

1. 合并后，发布者将 `--channels` 加到每个 dispatch 命令。
2. 使用 `--channels stable,beta,dev` 复现原先全频道发布；使用单频道或子集进行分批发布。
3. 若需要回退，重新发布目标频道的既有内容版本或将该频道 feed 指回已验证 asset；不触碰其他频道 feed。

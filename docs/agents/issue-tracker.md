# Issue tracker: GitHub

本项目的 issue 与 Wayfinder 决策地图使用 [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents/issues) 的 GitHub issue tracker，通过 `gh` CLI 操作。规格文件仍由项目的 OpenSpec 工作流持有。

## Conventions

- 读取 issue：`gh issue view <number> --repo leike0813/zotero-agents --comments`。
- 发布 issue、编辑正文或评论时，将多行正文写入临时 UTF-8 文件，使用 `--body-file`。
- 在说明、地图索引和评论中使用 issue 标题及其链接，不用裸编号代替名称。
- Issue、决策评论与 OpenSpec 规格各自保留其事实来源；评论链接到相关规格和研究资产。

## Wayfinding operations

- **Map**：单个带 `wayfinder:map` 标签的 issue，正文包含 Destination、Notes、Decisions so far、Not yet specified 与 Out of scope。开放票通过子 issue 查询，正文只索引已完成的决策。
- **Child ticket**：每个问题一个原生 sub-issue，正文以 Question 描述要解决的问题，使用 `wayfinder:research`、`wayfinder:prototype`、`wayfinder:grilling` 或 `wayfinder:task` 标签。用 `gh api --method POST repos/leike0813/zotero-agents/issues/<map-number>/sub_issues -F sub_issue_id=<child-database-id>` 建立父子关系。
- **Blocking**：使用原生 issue dependency。用 `gh api --method POST repos/leike0813/zotero-agents/issues/<child-number>/dependencies/blocked_by -F issue_id=<blocker-database-id>` 建立阻塞边。这里的 `issue_id` 是 REST API 返回的数字数据库 ID，不是 issue 编号或 GraphQL node ID。
- **Frontier**：分页读取 `repos/leike0813/zotero-agents/issues/<map-number>/sub_issues`，保留 `state == open`、没有 assignee 且 `issue_dependencies_summary.blocked_by == 0` 的票，按地图的子 issue 顺序选择第一张。
- **Claim**：开始工作前先用 `gh issue edit <number> --repo leike0813/zotero-agents --add-assignee @me` 认领。认领后，在评论中记录正在工作的 session/agent 与研究资产路径，避免同一账号的并行会话重复认领。
- **Resolve**：先发布带依据的 resolution comment，再关闭该 issue，最后向地图的 Decisions so far 追加一行结论摘要及指向 resolution comment 的链接。研究失败不关闭票；恢复为未认领状态并评论记录失败与续接条件。
- **Scope change**：超出终点的票关闭并仅索引于 Out of scope；新暴露的问题先创建，再连接阻塞关系。Not yet specified 只保留尚不能精确表述的问题。
- GitHub 原生父子关系或依赖不可用时，才使用正文中的命名链接表达父子/阻塞关系，并在 Notes 中记录限制。

## Pull requests as a request surface

PRs as a request surface: no.

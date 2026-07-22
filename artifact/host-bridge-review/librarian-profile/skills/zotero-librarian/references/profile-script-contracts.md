# Profile 脚本合约

Profile 脚本拥有确定性分页、本地 SQLite 更新、计划验证和稳定的 JSON 输出。Agent 负责任务解释、workflow/模式选择、证据判断和 approval 决策。

检查 `../../../assets/agent-helper-surface.json` 获取 profile 本地的辅助命令、选项、结果、错误和效果清单。使用每个辅助命令的 `--help` 输出了解每个选项的运行含义；来自 Zotero Library Agent 的命令不由此 profile 描述符安装。

## 索引服务

```sh
scripts/zotero_librarian_index_service.py refresh
scripts/zotero_librarian_index_service.py search '<query>'
scripts/zotero_librarian_index_service.py item <key-or-id>
scripts/zotero_librarian_index_service.py stats
scripts/zotero_librarian_index_service.py workflow-refresh
scripts/zotero_librarian_index_service.py workflow-show <workflow-id>
scripts/zotero_librarian_index_service.py run-register --run-id <workflowRunId> --workflow-id <workflowId>
scripts/zotero_librarian_index_service.py run-watch
```

刷新和 catalog 更新为原子操作。搜索/条目/统计为只读。Run-watch 执行一次遍历。失败时，脚本发出结构化 JSON 并保留先前可用的本地状态。

## Workflow 服务

```sh
scripts/zotero_librarian_workflow_service.py parent-selection --from-context
scripts/zotero_librarian_workflow_service.py plan --workflow <id> --mode host --items items.json
scripts/zotero_librarian_workflow_service.py submit --plan plan.json
```

计划是语义选择和执行之间的确定性交接。默认并发度为一；更高的并发度需要显式确认标志。不要就地编辑已提交的计划并声称它已通过验证。

## 通知服务

```sh
scripts/zotero_librarian_notification_service.py sync
scripts/zotero_librarian_notification_service.py inbox
```

两个命令都不使用长轮询即返回。Sync 持久化已接受的事件页面；inbox 读取本地投影。两个命令都不会代表 Agent 进行回复、连接、批准或确认。

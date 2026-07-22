# 定时任务

定时任务执行一次有界遍历后返回。它们永远不长轮询，且默认为只读，除非单独经审查的当前请求到达 Host 拥有的 approval 边界。

| 任务 | 调度 | 命令 | 报告条件 | Mutation |
| --- | --- | --- | --- | --- |
| index-refresh | 每 6 小时 | 索引服务 `refresh` | 新增、删除、更改或错误 | 无 |
| workflow-catalog-refresh | 03:00 | 索引服务 `workflow-refresh` | 新 workflow、schema 哈希变化或错误 | 无 |
| notification-sync | 每 5 分钟 | 通知服务 `sync` | 新的可操作生命周期事件或错误 | 无 |
| run-monitor | 每 5 分钟 | 索引服务 `run-watch` | 等待、成功、失败或取消转换 | 无 |
| workflow-status-triage | 09:00 | 索引搜索 `status:need-` | 可操作的 workflow 待处理候选 | 永不 |
| library-hygiene | 周一 09:30 | 索引服务 `stats` | 重复、可疑元数据、孤立或结构候选 | 永不 |
| attention-queue | 18:00 | `synthesis insight attention-queue` | 高优先级阅读、元数据或分析候选 | 无 |

当不满足报告条件时，恰好发出 `[SILENT]`。静默意味着"无可报告的增量"，而非任务跳过了验证。

分诊和卫生检查可以提议 workflow 或 mutation，但不得执行它们。如果定时任务遇到可能的写入、permission、apply-back 或破坏性维护操作，保留证据并升级给当前用户审查。

失败时，保留先前的索引/catalog/监控状态，报告命令和结构化错误，避免紧密重试循环。在外部通知或推荐写入之前，对任何缓存事实进行实时确认。

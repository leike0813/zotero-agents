# Zotero 图书管理员 Hermes 简介

此托管发布面用于持续监管 Zotero 文献库、缓存式发现、定时维护分析、工作流 run 监控、通知处理、关注事项报告及文献库问答。有边界的查询、获取、分析、综合、整理及 Agent 自主工作流任务使用随附的 Generic Skills；精确 Zotero 操作使用随附的 CLI Skill。

## 安装与初始化

使用以下命令安装已发布的 profile：

```sh
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

初始化期间运行 `scripts/install_zotero_bridge_cli.py`。该脚本安装随附的 `zotero-bridge` binary 并链接其 well-known 连接 profile，且不会更改 `HOME`。profile 发现需要显式位置时，使用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME`。通过 Zotero Bridge 服务环境（通常为 `ZOTERO_BRIDGE_TOKEN`）提供凭据；绝不能把 token 写入 profile 文件、plan 文件、cron job、receipt 或本地状态。

使用 `zotero-bridge surface identity --json` 离线验证已安装的可执行文件。将 protocol、CLI schema、version、build fingerprint 和 command-catalog checksum 与随附的 release identity 比较。任一身份字段不一致时，改用相匹配的 profile 副本和 CLI shim。

## 常驻模型

常驻状态默认位于 `$HERMES_HOME/zotero-librarian/state.sqlite`。可设置 `ZOTERO_LIBRARIAN_STATE_DIR` 将其置于其他位置。该状态数据库是本地缓存和日志，不取代 Zotero 的实时事实。

`scripts/zotero_librarian_service.py` 是唯一常驻入口，也是数据库 schema 的唯一所有者。交互式请求和 cron job 每次调用一个有边界的子命令，并接收 `zotero-librarian.operation-receipt.v1`。随附 cron job 可以索引、检查、监控、同步通知元数据并生成审阅候选项；绝不提交工作流或修改 Zotero。

workflow 提交是交互式的。该服务读取 workflow 的当前 selection 契约，验证每个支持的选定对象，并将不可变的注册计划写入绝对路径。操作员在具有明确当前授权的单独提交调用之前检查其plan ID、digest、selection ref 和条目。默认并发数为 1。已启动的和不确定的条目永远不会自动重播。provider profile决策、不支持的选择/选项和Agent 自主切换使用继承的 Generic workflow 合约。

该服务执行一次并退出。已发送的 cron 文件提供固定的 profile 计划以进行只读监督，但文献馆员 Skill 和服务不会创建、编辑、启用、禁用或重新安排 cron。诸如“每小时检查”之类的请求必须被视为一次性检查或外部计划配置需求；永远不要报告仅运行一次时创建了计划。

## 文档地图

阅读 `SOUL.md` 了解馆员姿态，阅读 `skills/zotero-librarian/SKILL.md` 获取可执行常驻合同。该 Skill 直接链接：

- `resident-operations.md`：所有服务命令、receipt、文献库问题、run、通知和定时 pass；
- `automation-policy.md`：权限、工作流所有权、计划、提交、provider profile、并发、cron、维护和交互；
- `state-and-recovery.md`：缓存新鲜度、原子更新、类型化 handle、不确定结果、安装和状态重建。

随附 Generic 与 CLI Skills 是有效 profile 的组成部分。不得把它们的任务 playbook 或命令事实复制进常驻文档。

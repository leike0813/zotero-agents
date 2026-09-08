# Zotero Librarian Hermes Profile

使用此托管 surface 进行持续的 Zotero 库监督、缓存发现、定时 maintenance 分析、workflow-run 监视、notification 处理、attention 报告与库问题。有限的 query、acquisition、analysis、synthesis、curation 与自有 workflow 任务使用内置的 Generic Skill；确切的 Zotero 操作使用内置的 CLI Skill。

## 安装与初始化

使用以下命令安装已发布 profile：

```sh
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

初始化期间，运行 `scripts/install_zotero_bridge_cli.py`。它会安装打包的 `zotero-bridge` 二进制文件并链接其众所周知的连接 profile，且不更改 `HOME`。当 profile 发现需要显式位置时，使用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME`。通过 Zotero Bridge 服务环境提供凭据，通常是 `ZOTERO_BRIDGE_TOKEN`；绝不把 tokens 放进 profile 文件、cron 任务、receipts、命令证据或本地状态中。

用 `zotero-bridge surface identity --json` 离线验证已安装可执行文件。将协议、CLI schema、版本、构建指纹与命令目录校验和同打包的发布身份比较。任一身份字段不同时，使用匹配的 profile 副本与 CLI shim。

## 常驻模型

常驻状态默认为 `$HERMES_HOME/zotero-librarian/state.sqlite`。设置 `ZOTERO_LIBRARIAN_STATE_DIR` 可把它放到别处。状态数据库是本地 cache 与 journal，不是实时 Zotero 事实的替代。

Library 刷新使用 Zotero capability Broker 捕获的固定快照与 profile 本地暂存代次。常驻服务仅在精确终态完成证据通过校验后提升该代次；中断或重启的快照使先前代次保持当前，而完整的空快照可原子地提升空 index。

`scripts/zotero_librarian_service.py` 是唯一的常驻入口点，也是数据库 schema 的唯一所有者。交互式请求与 cron 任务调用一个有界的子命令，并接收 `zotero-librarian.operation-receipt.v1`。随附的 cron 任务可以建 index、检查、监视、同步 notification 元数据并产生审阅候选；它们绝不提交 workflow 或改动 Zotero。

Workflow 提交是交互式的，并使用内置的 Generic 与 CLI Skill。读取实时 workflow 契约，验证选择与 workflow 选项，独立验证 provider profile，并在提交调用前取得当前权限。仅对该已授权请求传入明确受限的并发值。当 Zotero 返回 host-queue admission 时，保留 `submissionId`，检查其不可变的 unit projection，并将已接纳任务与其真实 run handle 关联；仅在 unit 处于待处理状态时使用 `queueId` 取消。Zotero 通过终态执行与 apply-back 掌控待处理排序、接纳与槽位生命周期。常驻服务不会持久化第二条计划入口队列、预留 unit、重放不确定的 submission，也不会从 cron 提交。Provider-profile 决策、不支持的选择/选项以及自有 agent handoff 继续沿用继承的 Generic workflow 契约。

服务执行一遍即退出。随附的 cron 文件为只读监督提供固定的 profile 计划，但 Librarian Skill 与服务不创建、编辑、启用、禁用或重排 cron。诸如"每小时检查一次"的请求必须当作一次性检查或外部计划配置需求处理；绝不要在一遍运行后报告计划已创建。

## 文档地图

阅读 `SOUL.md` 了解 librarian 姿态，阅读 `skills/zotero-librarian/SKILL.md` 了解可执行常驻契约。该 Skill 直接链接：

- `resident-operations.md` 涵盖每个 service 命令、receipt、库问题、run、notification 与计划执行；
- `automation-policy.md`：授权、原生队列所有权、提交、provider profiles、并发、cron、maintenance 与交互；
- 关于 cache 新鲜度、原子更新、类型化句柄、不确定结果、安装与状态重建，见 `state-and-recovery.md`。

内置 Generic 与 CLI Skill 是生效 profile 的一部分。不要把它们的任务 playbook 或命令事实复制进常驻文档。

## Connection-profile 工作区

Agent 无需计算或传入 workspace 路径。服务与 cron 任务依次遵循 `--profile`、`ZOTERO_BRIDGE_PROFILE`、平台熟知 profile。熟知 profile 是默认 workspace，继续拥有 `$HERMES_HOME/zotero-librarian/state.sqlite`；每个显式 profile 在 `workspaces/<sha256>/` 下有自己内容寻址的目录，用于 SQLite 状态、runs、notifications、catalog 与 `.zotero-bridge/bin`。

仅当 `--db` 的解析路径保持在活动 workspace 内部时，它才是诊断性覆盖。profile 身份只使用规范化 profile 路径，绝不使用 profile JSON、token、端点或其他机密。缺失 profile、路径规范化失败、workspace 根不可用、连接失败与数据库逃逸都以封闭方式失败并给出结构化 receipt；它们绝不回退到共享状态。workspace 缓存仍是发现辅助，而非当前 Zotero 事实，并且不改变 approval、queue、receipt 或实时状态的规则。

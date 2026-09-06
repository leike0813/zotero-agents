# Zotero Librarian Hermes 配置

使用此托管入口执行持续的 Zotero 文献库监督、缓存发现、定期维护分析、工作流运行监控、通知处理、关注项报告以及文献库问答。有限的查询、采集、分析、综合、策展以及自有工作流任务请使用随附的通用 Skill；精确的 Zotero 操作请使用随附的 CLI Skill。

## 安装与初始化

使用以下命令安装已发布的配置：

```sh
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

初始化期间，运行 `scripts/install_zotero_bridge_cli.py`。它会安装打包好的 `zotero-bridge` 二进制并链接其熟知的连接配置，且不会改动 `HOME`。当配置发现需要明确位置时，请使用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME`。凭据应通过 Zotero Bridge 服务环境提供，通常是 `ZOTERO_BRIDGE_TOKEN`；切勿把令牌写入配置文件、cron 任务、回执、命令证据或本地状态。

使用 `zotero-bridge surface identity --json` 离线校验已安装的可执行文件。将其协议、CLI 模式、版本、构建指纹以及命令目录校验和与打包发布的身份进行比对。当任一身份字段不一致时，使用匹配的配置文件副本与 CLI shim。

## 常驻模型

常驻状态默认位于 `$HERMES_HOME/zotero-librarian/state.sqlite`。设置 `ZOTERO_LIBRARIAN_STATE_DIR` 可将其置于其他位置。状态数据库是本地缓存与日志，而非 Zotero 实时事实的替代品。

文献库刷新使用由 Zotero 能力 Broker 捕获的固定快照以及一份配置本地的暂存代次。常驻服务只有在完全相同的终态完成证据通过校验后才会提升该代次；被中断或重启的快照会让先前代次保持当前状态，而一次完整的空快照则可以原子地提升一个空索引。

`scripts/zotero_librarian_service.py` 是唯一的常驻入口，也是数据库模式的唯一所有者。交互请求与 cron 任务调用一个有边界的子命令，并接收 `zotero-librarian.operation-receipt.v1`。随附的 cron 任务可执行索引、检查、监控、同步通知元数据以及产出审阅候选；它们从不提交工作流，也从不改动 Zotero。

工作流提交是交互式的，使用随附的通用与 CLI Skill。读取实时工作流契约，校验选择与工作流选项，单独校验提供方配置，并在提交调用前取得当前的授权。仅在该已授权请求中传入显式有界的并发值。当 Zotero 返回宿主队列接纳时，保留 `submissionId`，检视其不可变单元投影，并把已接纳任务与它们的真实运行句柄相关联；仅在单元处于待处理状态时使用 `queueId` 取消。Zotero 拥有待处理排序、接纳与槽位生命周期，直至终态执行与回写。常驻服务不会持久化第二个计划条目队列、预留单元、重放不确定的提交，或…

服务执行一次扫描后退出。随附的 cron 文件为只读监督提供固定的配置时刻表，但 Librarian Skill 与服务都不会创建、编辑、启用、禁用或重新调度 cron。形如"每小时检查一次"的请求必须视作一次性检查或外部调度配置需求；切勿在只运行了一次扫描的情况下声称已创建时刻表。

## 文档导览

阅读 `SOUL.md` 以了解馆员姿态，阅读 `skills/zotero-librarian/SKILL.md` 以了解可执行的常驻契约。该 Skill 直接链接：

- `resident-operations.md`：每个服务命令、回执、文献库问答、运行、通知以及定时扫描；
- `automation-policy.md`：授权、原生队列所有权、提交、提供方配置、并发、cron、维护与交互；
- `state-and-recovery.md`：缓存新鲜度、原子更新、类型化句柄、不确定结果、安装与状态重建。

随附的通用与 CLI Skill 也是有效配置的一部分。请勿把它们的任务剧本或命令事实复制到常驻文档中。

## 连接配置工作区

智能体无需计算或传递工作区路径。服务与 cron 任务依次遵循 `--profile`、再 `ZOTERO_BRIDGE_PROFILE`，最后自动使用平台熟知配置。熟知配置是默认工作区，并持续拥有 `$HERMES_HOME/zotero-librarian/state.sqlite`；每个显式配置都会拥有自己的内容寻址 `workspaces/<sha256>/` 目录，用于存放 SQLite 状态、运行、通知、目录与 `.zotero-bridge/bin`。

`--db` 仅在其解析后的路径仍位于当前工作区内时可用作诊断覆盖。配置身份仅使用规范化后的配置路径，绝不读取配置 JSON、令牌、端点或其他秘密。缺失配置、路径规范化失败、工作区根不可用、连接失败以及数据库越界均以失败关闭的方式返回结构化回执；它们绝不回退到共享状态。工作区缓存仍是发现辅助，不是当前 Zotero 事实，也不会改变审批、队列、回执或实时状态的规则。

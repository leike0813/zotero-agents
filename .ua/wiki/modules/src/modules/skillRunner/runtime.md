
# src/modules/skillRunner/runtime
> 目录聚合页：6 个文件、35 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts.md) | 文件 | 2 | SkillRunner 异步子系统的统一停机编排：按固定顺序排空运行对话框、停止自动回复观察者与任务对账器、关闭会话同步并释放本地运行时租约，任一环节失败只记日志而不中断后续清理。 |
| [src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | 文件 | 5 | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts.md) | 文件 | 3 | 本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。 |
| [src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | 文件 | 19 | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts.md) | 文件 | 2 | SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。 |
| [src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts](../../../../files/src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts.md) | 文件 | 4 | 本地 SkillRunner 运行时版本源的读取模块：拉取远端 feed 文档、规范化并按平台与架构挑选可用版本，在网络失败时回退到缓存与内置版本常量。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules](../../modules.md) | 7 |
| [src/platform](../../platform.md) | 6 |
| [src/utils](../../utils.md) | 6 |
| [src/backends](../../backends.md) | 3 |
| [src/modules/skillRunner/run](run.md) | 3 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 2 |
| [.](../../../index.md) | 1 |
| [src/modules/skillRunner/connection](connection.md) | 1 |
| [src/modules/skillRunner/surface](surface.md) | 1 |
| [src/modules/workflowExecution](../workflowExecution.md) | 1 |

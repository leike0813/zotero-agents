
# src/platform/processControl.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/processControl.ts -->

子进程控制：启动、信号投递与终止回收策略，把 platform/command 的执行结果转成可取消、可等待的进程句柄。
源码：[src/platform/processControl.ts](../../../../../src/platform/processControl.ts)

## 符号（3）
<!-- node: function:src/platform/processControl.ts:buildPosixProcessGroupSignalInvocation -->
<!-- node: function:src/platform/processControl.ts:buildProcessControlSnapshot -->
<!-- node: function:src/platform/processControl.ts:validatePosixProcessGroupOwnership -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildPosixProcessGroupSignalInvocation | 函数 | 180–192 | 简单 | 进程控制、信号、posix | 0 | 构造向进程组投递信号的调用描述（负 PID kill 语义），作为命令执行的可选控制面。 |
| buildProcessControlSnapshot | 函数 | 205–278 | 复杂 | 进程控制、能力探测、快照 | 0 | 探测宿主可用的进程控制能力并形成快照，供启动期 preflight 与运行时查询共用。 |
| validatePosixProcessGroupOwnership | 函数 | 114–178 | 复杂 | 进程控制、信号安全、posix | 0 | 校验目标进程组确实属于本次会话创建，防止对系统或他人进程组误发信号。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [command.ts](command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [runtimePlatform.ts](runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildPosixProcessGroupSignalInvocation | 函数 | 180–192 | 构造向进程组投递信号的调用描述（负 PID kill 语义），作为命令执行的可选控制面。 |
| validatePosixProcessGroupOwnership | 函数 | 114–178 | 校验目标进程组确实属于本次会话创建，防止对系统或他人进程组误发信号。 |

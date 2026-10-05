
# src/modules/acp/transport/acpNpxLaunchCache.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/transport](../../../../../modules/src/modules/acp/transport.md)
<!-- node: file:src/modules/acp/transport/acpNpxLaunchCache.ts -->

缓存 npx 启动 ACP 代理时解析出的可执行入口与版本信息，避免每次连接重复探测磁盘与 PATH，并通过有界等待处理启动竞态。
源码：[src/modules/acp/transport/acpNpxLaunchCache.ts](../../../../../../../src/modules/acp/transport/acpNpxLaunchCache.ts)

## 符号（4）
<!-- node: function:src/modules/acp/transport/acpNpxLaunchCache.ts:acquireAcpNpxLaunchCacheLease -->
<!-- node: function:src/modules/acp/transport/acpNpxLaunchCache.ts:diagnosticText -->
<!-- node: function:src/modules/acp/transport/acpNpxLaunchCache.ts:findPackageSpec -->
<!-- node: function:src/modules/acp/transport/acpNpxLaunchCache.ts:resolveAcpNpxLaunchSpec -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| acquireAcpNpxLaunchCacheLease | 函数 | 221–275 | 复杂 | cache、acp、concurrency、lease | 0 | 以键为单位获取 npx 启动缓存的租约：命中则复用已物化目录，未命中则在命名锁保护下重新物化。 |
| diagnosticText | 函数 | 277–314 | 中等 | diagnostics、debug、acp、utility | 0 | 把缓存租约的内部状态整理成可读的诊断文本，供 debug 面板与连接审计展示。 |
| findPackageSpec | 函数 | 56–86 | 简单 | acp、parsing、npx、utility | 0 | 从 ACP 启动命令中识别包规格（如 @zed-industries/claude-code-agent），供缓存键与物化使用。 |
| resolveAcpNpxLaunchSpec | 函数 | 88–110 | 简单 | acp、npx、launch、resolution | 1 | 解析 npx 启动所需的命令、参数与包规格，产出可缓存的 launch spec。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [wait.ts](../../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpConnectionAdapter.ts](acpConnectionAdapter.ts.md) | src/modules/acp/transport/acpConnectionAdapter.ts | ACP 连接适配器：把底层子进程/WS 传输包装为统一的会话能力接口，处理初始化、session 生命周期、prompt 捕获、权限请求与 Claude 原始消息兼容。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| acquireAcpNpxLaunchCacheLease | 函数 | 221–275 | 以键为单位获取 npx 启动缓存的租约：命中则复用已物化目录，未命中则在命名锁保护下重新物化。 |
| resolveAcpNpxLaunchSpec | 函数 | 88–110 | 解析 npx 启动所需的命令、参数与包规格，产出可缓存的 launch spec。 |

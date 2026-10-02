
# src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts -->

SkillRunner 发布版安装器：经 ctl bridge 触发后端自身安装/升级，解析版本并把安装结果写入运行时持久化目录。
源码：[src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts)

## 符号（2）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts:createFailure -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts:installSkillRunnerRelease -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createFailure | 函数 | 131–160 | 中等 | skillrunner、error-handling、diagnostics、installer | 0 | 构造结构化的安装失败结果，区分可重试的传输问题与不可重试的完整性问题。 |
| installSkillRunnerRelease | 函数 | 162–422 | 复杂 | skillrunner、installer、release、upgrade | 0 | 经 ctl bridge 安装/升级 SkillRunner 发布版：校验包摘要、切换版本目录并更新本地运行状态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerCtlBridge.ts](skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerLocalRuntimeManager.ts](skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| installSkillRunnerRelease | 函数 | 162–422 | 经 ctl bridge 安装/升级 SkillRunner 发布版：校验包摘要、切换版本目录并更新本地运行状态。 |

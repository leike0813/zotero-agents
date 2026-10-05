
# defaultAcpRuntimeDependencyProbe
<!-- node: function:src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:defaultAcpRuntimeDependencyProbe -->

默认依赖探测实现：依次尝试 uv 与系统 Python，汇总可用工具链。
类型：函数  
复杂度：复杂  
入边数：1  
标签：acp、runtime、probe  
所属文件：[src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts](../../../../../../files/src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts.md)
源码：[src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:184](../../../../../../../../src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts#L184)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildAcpRuntimeDependencyPlan](buildAcpRuntimeDependencyPlan.md) | src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts:369–491 | 构建 ACP 运行时的依赖方案：探测工具链、决定是否用 uv 包装并生成最终启动配置与失败信息。 |

## 调用

该符号没有记录对外调用。

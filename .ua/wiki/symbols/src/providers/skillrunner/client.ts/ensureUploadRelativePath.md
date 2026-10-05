
# ensureUploadRelativePath
<!-- node: function:src/providers/skillrunner/client.ts:ensureUploadRelativePath -->

把本地绝对路径约束为受控的上传相对路径，阻断路径穿越并校验候选路径确实可读。
类型：函数  
复杂度：中等  
入边数：2  
标签：security、path-handling、validation  
所属文件：[src/providers/skillrunner/client.ts](../../../../../files/src/providers/skillrunner/client.ts.md)
源码：[src/providers/skillrunner/client.ts:278](../../../../../../../src/providers/skillrunner/client.ts#L278)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [SkillRunnerClient](../../../../../files/src/providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts:395–1425 | SkillRunner REST 客户端实现：按步骤执行 create/upload/poll/bundle/result 流程，处理交互式自动回复、连接健康上报、zip 上传与已有运行的收敛读取。 |
| [resolveUploadEntriesFromRequest](../../../../../files/src/providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts:313–355 | 从 http.steps 请求的 files 声明解析出上传条目，跳过非法路径并给出明确错误定位。 |

## 调用

该符号没有记录对外调用。


# resolveRunWorkspaceTranscriptMessages
<!-- node: function:src/modules/skillRunner/surface/skillRunnerRunDialog.ts:resolveRunWorkspaceTranscriptMessages -->

解析工作区应展示的 transcript 消息集合，合并本地生成消息与后端历史并应用可见性边界。
类型：函数  
复杂度：复杂  
入边数：1  
标签：transcript、ui、skillrunner  
所属文件：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md)
源码：[src/modules/skillRunner/surface/skillRunnerRunDialog.ts:2241](../../../../../../../../src/modules/skillRunner/surface/skillRunnerRunDialog.ts#L2241)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readSkillRunnerTranscriptRegion](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:5974–6067 | 读取 transcript 区域的可见页内容，支撑冷启动分页读取而不要求先完成全量镜像。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [toRunDialogConversationEntry](../../../../../../files/src/modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts:837–903 | 把后端消息转换为工作台会话条目，规范角色、消息类型、重试次数与关联标识。 |

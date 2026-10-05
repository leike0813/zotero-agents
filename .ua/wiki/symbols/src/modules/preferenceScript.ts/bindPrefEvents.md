
# bindPrefEvents
<!-- node: function:src/modules/preferenceScript.ts:bindPrefEvents -->

为偏好面板中每一项绑定读取、回写与即时生效逻辑，是整个插件设置面的行为中枢。
类型：函数  
复杂度：复杂  
入边数：1  
标签：preferences、event-handler、monolith、configuration  
所属文件：[src/modules/preferenceScript.ts](../../../../files/src/modules/preferenceScript.ts.md)
源码：[src/modules/preferenceScript.ts:73](../../../../../../src/modules/preferenceScript.ts#L73)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [registerPrefsScripts](../../../../files/src/modules/preferenceScript.ts.md) | src/modules/preferenceScript.ts:31–51 | 把偏好面板的脚本注册到指定窗口，并在窗口销毁时解除绑定。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [bindSkillRunnerLocalRuntimePreferences](../preferences/skillRunnerLocalRuntimePreferences.ts/bindSkillRunnerLocalRuntimePreferences.md) | src/modules/preferences/skillRunnerLocalRuntimePreferences.ts:14–617 | 为偏好面板中的 SkillRunner 本地运行时分区绑定全部控件事件与状态同步。 |

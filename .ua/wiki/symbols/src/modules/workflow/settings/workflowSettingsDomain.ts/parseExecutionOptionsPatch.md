
# parseExecutionOptionsPatch
<!-- node: function:src/modules/workflow/settings/workflowSettingsDomain.ts:parseExecutionOptionsPatch -->

解析外部传入的执行选项补丁，剔除未声明字段。
类型：函数  
复杂度：简单  
入边数：2  
标签：parsing、execution-options、patch  
所属文件：[src/modules/workflow/settings/workflowSettingsDomain.ts](../../../../../../files/src/modules/workflow/settings/workflowSettingsDomain.ts.md)
源码：[src/modules/workflow/settings/workflowSettingsDomain.ts:206](../../../../../../../../src/modules/workflow/settings/workflowSettingsDomain.ts#L206)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [mergeExecutionOptions](../../../../../../files/src/modules/workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts:385–414 | 合并多层执行选项（默认值、持久化设置、一次性覆盖），后者优先。 |
| [openWorkflowSettingsWebDialog](../../../../../../files/src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts:379–970 | 打开 Web 版工作流设置对话框：加载页面、向宿主注册动作处理器、接收结构化草稿变更并按需保存或一次性应用。 |

## 调用

该符号没有记录对外调用。

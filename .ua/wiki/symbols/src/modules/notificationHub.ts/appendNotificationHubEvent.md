
# appendNotificationHubEvent
<!-- node: function:src/modules/notificationHub.ts:appendNotificationHubEvent -->

追加一条通知事件：按去重键复用既有事件、按展示分组抑制窗口抑制重复提示，并维护有界历史。
类型：函数  
复杂度：复杂  
入边数：1  
标签：通知、去重、事件中心  
所属文件：[src/modules/notificationHub.ts](../../../../files/src/modules/notificationHub.ts.md)
源码：[src/modules/notificationHub.ts:143](../../../../../../src/modules/notificationHub.ts#L143)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [acknowledgeNotificationHubEvents](../../../../files/src/modules/notificationHub.ts.md) | src/modules/notificationHub.ts:269–301 | 按客户端标识确认通知事件，使多窗口各自记录已读状态而不互相影响。 |

## 调用

该符号没有记录对外调用。


# startZoteroNativeCrashCapture
<!-- node: function:scripts/zotero-native-crash-capture.ts:startZoteroNativeCrashCapture -->

崩溃捕获主流程：布置 fixture、启动宿主、等待崩溃、生成摘要并清理现场。
类型：函数  
复杂度：复杂  
入边数：2  
标签：入口、崩溃捕获、编排  
所属文件：[scripts/zotero-native-crash-capture.ts](../../../files/scripts/zotero-native-crash-capture.ts.md)
源码：[scripts/zotero-native-crash-capture.ts:562](../../../../../scripts/zotero-native-crash-capture.ts#L562)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../files/scripts/run-zotero-direct.ts.md) | scripts/run-zotero-direct.ts:644–807 | 主编排：构建 → 暂存 sidecar → 改写 prefs → 启动 Zotero → 跟踪 runtime log。 |
| [main](../../../files/scripts/run-zotero-test-with-mock.ts.md) | scripts/run-zotero-test-with-mock.ts:666–968 | 主编排：环境准备 → mock 生命周期 → 执行测试 → 收集 manifest 与崩溃证据。 |

## 调用

该符号没有记录对外调用。

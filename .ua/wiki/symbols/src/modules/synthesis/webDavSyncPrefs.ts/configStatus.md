
# configStatus
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:configStatus -->

评估 WebDAV 同步配置状态：校验 URL、目录与凭据完备性并输出具体诊断项。
类型：函数  
复杂度：中等  
入边数：2  
标签：配置校验、webdav、诊断  
所属文件：[src/modules/synthesis/webDavSyncPrefs.ts](../../../../../files/src/modules/synthesis/webDavSyncPrefs.ts.md)
源码：[src/modules/synthesis/webDavSyncPrefs.ts:88](../../../../../../../src/modules/synthesis/webDavSyncPrefs.ts#L88)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [getWebDavSyncPrefsStatus](../../../../../files/src/modules/synthesis/webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts:180–204 | 读取当前 WebDAV 同步首选项并投影为状态对象供 UI 展示。 |
| [testWebDavSyncConfiguration](../../../../../files/src/modules/synthesis/webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts:270–337 | 对当前或指定配置执行连接测试，报告远端可达性、认证结果与可用诊断。 |

## 调用

该符号没有记录对外调用。


# importHooksModuleFromText
<!-- node: function:src/workflows/loader.ts:importHooksModuleFromText -->

在 Zotero 沙箱中以源码文本方式动态 import hook 模块，兼容 blob/data URL 等无 Node 依赖的加载路径。
类型：函数  
复杂度：复杂  
入边数：1  
标签：dynamic-import、loader、sandbox  
所属文件：[src/workflows/loader.ts](../../../../files/src/workflows/loader.ts.md)
源码：[src/workflows/loader.ts:120](../../../../../../src/workflows/loader.ts#L120)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadHooksModule](loadHooksModule.md) | src/workflows/loader.ts:350–407 | hook 模块加载总入口，按运行环境与来源选择合适的导入路径并归一诊断。 |

## 调用

该符号没有记录对外调用。

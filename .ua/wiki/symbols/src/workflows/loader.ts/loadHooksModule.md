
# loadHooksModule
<!-- node: function:src/workflows/loader.ts:loadHooksModule -->

hook 模块加载总入口，按运行环境与来源选择合适的导入路径并归一诊断。
类型：函数  
复杂度：复杂  
入边数：1  
标签：loader、dispatch、entry-point  
所属文件：[src/workflows/loader.ts](../../../../files/src/workflows/loader.ts.md)
源码：[src/workflows/loader.ts:350](../../../../../../src/workflows/loader.ts#L350)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadHooks](loadHooks.md) | src/workflows/loader.ts:738–971 | 加载单个工作流的 hook 集合：定位 hook 模块、校验各 hook 导出是否存在，并汇总 warning 与 error 级诊断。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createHostHookScope](../../../../files/src/workflows/loader.ts.md) | src/workflows/loader.ts:191–209 | 构造注入 hook 的宿主作用域对象，只暴露声明允许的 Zotero 能力。 |
| [importHooksModuleFromText](importHooksModuleFromText.md) | src/workflows/loader.ts:120–160 | 在 Zotero 沙箱中以源码文本方式动态 import hook 模块，兼容 blob/data URL 等无 Node 依赖的加载路径。 |
| [importPrecompiledPackageHooksModule](importPrecompiledPackageHooksModule.md) | src/workflows/loader.ts:237–348 | 加载工作流包预编译的 hook 模块：解析入口、校验导出并给出按来源分类的加载诊断。 |
| [transformModuleExports](../../../../files/src/workflows/loader.ts.md) | src/workflows/loader.ts:92–118 | 把动态 import 得到的模块命名空间转换为符合 hook 契约形状的导出集合，缺项时报明确错误。 |

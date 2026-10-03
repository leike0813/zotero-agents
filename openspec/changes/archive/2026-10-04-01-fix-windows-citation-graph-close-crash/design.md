# Design

## Context

动机见 [proposal.md](proposal.md)。工作台 browser 的创建由 `synthesisWorkbenchTab.ts` 统一持有，Graph 区域拥有 Sigma 及页面清理，平台判断已有 `detectRuntimePlatform()` 事实源。前置页面边界来自已归档的 `2026-09-05-complete-dashboard-synthesis-preact-ui`。

Full dump 和卸载跟踪把故障缩小到同一线程上的析构返回路径：ANGLE 先释放 D3D11 引用，稍后的 ControlLib/IntelControlLib 卸载链卸载 D3D11，仍在执行的析构随后返回已释放的代码地址。实验区分及符号限制见 [verification.md](verification.md)。

## Goals / Non-Goals

**Goals:**

- 在 Synthesis 页面建立图形资源前取得进程生命周期保证。
- 将 DLL 映像保护与页面、GPU 对象和插件 JS 的资源所有权分开。
- 初始化失败时保留现有 UI，允许后续重试。
- 用当前源码包和真实鼠标路径验证原故障；测试可覆盖原生 adapter 契约，但不能模拟完整驱动崩溃。

**Non-Goals:**

- 修改 Gecko、ANGLE 或 Intel 驱动内部的对象所有权。
- 全局关闭硬件加速、改变图谱布局或调整 Synthesis sidecar 协议。
- 宣称其它显卡、驱动、宿主版本或长时间压力场景已完成验收。

## Decisions

### 1. 由 Windows loader 固定 D3D11 映像

`src/platform/windowsGraphicsRuntime.ts` 只暴露 `ensureWindowsD3D11Lifetime(): void`。在 Windows Gecko 环境通过 `resource://gre/modules/ctypes.sys.mjs` 打开 kernel32，调用 `LoadLibraryExW` 从 System32 加载 D3D11，再以 `GetModuleHandleExW(PIN | FROM_ADDRESS)` 固定该模块。成功后释放普通加载引用并关闭 ctypes library；失败保留原错误，同时尝试清理当次取得的资源。

Windows API 明确规定 PIN 后模块驻留直到进程终止，后续 FreeLibrary 不会解除 PIN。ABI 使用 `winapi_abi`、32 位 BOOL/DWORD、指针宽度的模块句柄和 UTF-16 文件名。平台判断复用现有 adapter；非 Windows 或没有 Gecko import facility 的测试环境跳过原生调用。

普通的插件全局引用容易随插件 JS owner 销毁而结束，无法提供同样的 OS 生命周期保证。外部 LoadLibrary 探针只用于诊断，不作为交付方式。API 契约见 [GetModuleHandleExW](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-getmodulehandleexw) 与 [LoadLibraryExW](https://learn.microsoft.com/en-us/windows/win32/api/libloaderapi/nf-libloaderapi-loadlibraryexw)。

### 2. 在统一 browser 创建入口执行保护

`createSynthesisBrowser()` 在创建元素前执行保护，覆盖嵌入 Dashboard 的 Synthesis 与独立 Zotero Synthesis Tab 两条宿主路径。嵌入挂载先完成保护和 frame 创建，再清空旧容器；独立入口先完成保护，再调用宿主添加 Tab。原生初始化失败直接传播，避免把缺少保护的页面呈现为可用状态。

无需跨 Tab 维护缓存或新增通用 native loader factory。重复打开会执行相同操作并关闭当次普通引用，进程级 PIN 由 OS 持有；Tab、窗口和插件 cleanup 都不成为其释放 owner。

### 3. 保留正常渲染器清理

Graph 继续执行原有 Sigma/WebGL 清理及监听、observer、animation frame 和计时器取消。仅跳过主动 loseContext 的对照仍出现相同原生异常，延迟清理也不能证明代码映像存活；这两种方向不作为修复。

既有 `synthesis-workbench-ui` 规格要求跳过主动 context loss，与当前源码和本轮实测不一致。本 change 的完整 MODIFIED requirement 保留已有区域、camera、增量页和交互语义，只对齐最终卸载行为；新增的 Windows 生命周期要求归入同一 capability。

### 4. 用有限的真实 GUI 验收界定结果

真实库/profile 只作为只读来源，验收在金例副本中运行。构建当前源码生产 XPI 与本地 sidecar，按卸载、退出整个 Zotero、重启、安装的顺序替换插件。首轮及两轮重复均由用户等待完整图谱绘制后鼠标点击顶部 Tab 的关闭句柄，代理只做只读监测。

Windows loader 状态检查确认插件自身取得 PIN；驱动模块实际卸载、宿主继续响应和无新增 WER dump 共同验证关闭路径。空库、仅出现 canvas 或仅 Tab 消失均不足以替代该验收。没有新增平行 E2E runner，自动化压力入口仍复用项目既有 runner。

## Risks / Trade-offs

- [映像无法在进程中解除 PIN] → 只在 Windows Synthesis browser 创建时取得保护，保留映像到进程退出；GPU/context 资源仍按页面生命周期释放。
- [插件侧回避未修正上游所有权] → 明确记录已观察的卸载链，不把缺少私有符号的大偏移导出名称当作真实函数，也不确定上游责任归属。
- [本机验收不能覆盖其它组合] → 在验收记录中保留设备、驱动、宿主版本和三轮边界，后续版本另做同等 GUI 验收。
- [原生设施或 DLL 初始化失败] → 中止页面创建，闭合当次资源，保留已有 UI；回归测试覆盖失败和重试。
- [dump 和截图可能含私有库内容] → 原始证据保持工作区外，本 change 仅保存脱敏结论、结果和工件身份。

## Migration Plan

无数据迁移。已按干净插件替换流程完成隔离验收，详见 [verification.md](verification.md)。若需要退回旧插件，先退出整个 Zotero 再更换；本轮成功取得的 PIN 要到该进程退出才结束。

## Open Questions

Gecko、ANGLE 与驱动各自的最终修复责任，以及其它硬件组合的影响范围，仍需上游调查；这不改变本轮已验证的插件侧生命周期保护方案。

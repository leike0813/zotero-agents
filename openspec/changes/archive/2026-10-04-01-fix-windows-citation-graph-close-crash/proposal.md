# 修复 Windows Citation Graph 关闭时的原生崩溃

## Why

在本机 Zotero 10.0.5 中，Citation Graph 完全显示后，用户用鼠标关闭 Dashboard/Synthesis 工作台 Tab，会在延迟的原生清理中崩溃。Full dump 与卸载跟踪确认 D3D11 析构尚未返回时其 DLL 已卸载；仅跳过 Sigma 主动 context loss 仍复现相同执行访问异常，需要保护原生代码映像的生命周期。

本 change 补记 2026-10-03 至 2026-10-04 已完成的源码修复和实机验收。

## What Changes

- 在 Windows Synthesis browser 创建前，统一执行 D3D11 进程级模块保护；OS PIN 保持映像到进程退出，临时加载引用与 ctypes library 当次释放。
- 保护初始化失败时中止页面创建，保留已有嵌入内容，并避免创建空 Tab。
- 保留 Graph 原有 Sigma/WebGL、监听、observer、animation frame 和计时器清理；修正既有规格中要求跳过主动 context loss 的漂移。
- 补充模块生命周期、失败清理、重试和页面入口失败保护测试。
- 记录当前源码生产 XPI、本地源码 sidecar、金例副本、无外部保活探针和无调试器条件下的三轮真实鼠标验收，以及跨设备验证边界。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `synthesis-workbench-ui`：定义 Windows hosted Synthesis browser 的原生模块生命周期保护与失败边界，并对齐 Graph 最终卸载的正常资源清理行为。

## Impact

前置依赖：已归档的 `2026-09-05-complete-dashboard-synthesis-preact-ui` 提供工作台 browser、Graph 区域和页面清理边界；本 change 在这些已落地边界上实施。修复前代码基线为 `91e2746afaa15609b276f943cf0cda46ad8fab44`，本轮源码改动尚未提交。

实现涉及 `src/platform/windowsGraphicsRuntime.ts`、`src/modules/synthesis/workbench/synthesisWorkbenchTab.ts`、`tests/runtime/windows-graphics-runtime.test.ts`、`tests/synthesis/125-synthesis-tab-ui.test.ts`、`docs/dev/zotero-e2e.md` 和 `AGENTS.md`。使用 Gecko ctypes 与 Windows loader API，不新增依赖或公共 wire API，不修改 Rust sidecar 源码。

本机 Windows、Intel Arc A380 驱动 `32.0.101.8861` 与 Zotero 10.0.5 的验收通过；其它显卡、驱动和 Zotero 版本尚未完成同等实机验收。原始 dump、CDB 日志、截图和私有库材料保留工作区外；此 change 只保存脱敏结论。

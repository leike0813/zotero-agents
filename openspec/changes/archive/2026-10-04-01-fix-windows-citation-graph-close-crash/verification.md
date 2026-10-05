# Verification

## 实现与范围

修复于 2026-10-03 至 2026-10-04 完成，本记录是在实现和实机验收后补齐。修复前源码基线为 `91e2746afaa15609b276f943cf0cda46ad8fab44`，源码改动保留在工作区。

| 文件 | 已完成内容 |
| --- | --- |
| `src/platform/windowsGraphicsRuntime.ts` | Windows Gecko D3D11 OS PIN、临时引用/FFI 清理、失败传播和平台边界 |
| `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts` | 两种 hosted browser 创建路径共用保护，在 UI 变更前完成初始化 |
| `tests/runtime/windows-graphics-runtime.test.ts` | 进程驻留、重复调用、ABI、非 Windows/非 Gecko 边界、失败清理与重试 |
| `tests/synthesis/125-synthesis-tab-ui.test.ts` | 原生保护失败时保留旧内容且不留下空 Tab |
| `docs/dev/zotero-e2e.md` | 原生根因、干净安装流程、真实鼠标延迟关闭验收及本机结果 |
| `AGENTS.md` | 模块保护 owner 与原生关闭验收入口约束 |

## 根因证据与对照

| 组别 | 条件 | 观察结果 |
| --- | --- | --- |
| A | 原有页面清理，完整图谱显示后真实鼠标关闭 | D3D11 在析构尚未返回时被卸载，随后执行已释放地址，发生 `0xc0000005` 执行访问异常 |
| B | 仅跳过主动 loseContext，其它条件相同 | 页面清理结束约 8.6 秒后仍出现相同异常和卸载链，跳过主动 context loss 不是充分修复 |
| C | B 插件，外部诊断探针额外保留一份 D3D11 普通引用 | ANGLE 和 ControlLib 释放链仍发生，驱动模块卸载，D3D11 驻留且宿主正常 |
| D | 当前源码生产 XPI，保留原 loseContext，由插件取得 OS PIN | 三轮真实鼠标关闭均正常，驱动模块实际卸载，D3D11 保持 PIN，WER 无新增 dump |

A/B 的 dump 均包含完整内存标志与 Memory64ListStream。入口句柄与实际 unload 栈确认了同一线程的嵌套卸载路径，不依赖另一线程并发卸载的假设。

证据支持模块映像寿命短于部分宿主持有的图形对象寿命。缺少完整 xul 和驱动私有符号，不能用大偏移导出近邻名称确定具体 GC/CC 函数，也未确定 Gecko、ANGLE 与 Intel 各自的最终修复责任。C 是附加调试器的诊断实验；D 是独立的无调试器生产包验收。

## 自动验证

以下结果来自本轮源码实现，不以原生 adapter mock 代替真实驱动验收。

```powershell
npx tsx node_modules/mocha/bin/mocha tests/runtime/windows-graphics-runtime.test.ts tests/synthesis/125-synthesis-tab-ui.test.ts tests/synthesis/256-synthesis-graph-region.test.ts --require tests/setup/zotero-mock.ts --timeout 10000 --exit
npm run build
npx prettier --check src/platform/windowsGraphicsRuntime.ts src/modules/synthesis/workbench/synthesisWorkbenchTab.ts tests/runtime/windows-graphics-runtime.test.ts tests/synthesis/125-synthesis-tab-ui.test.ts docs/dev/zotero-e2e.md AGENTS.md
npx eslint src/platform/windowsGraphicsRuntime.ts src/modules/synthesis/workbench/synthesisWorkbenchTab.ts tests/runtime/windows-graphics-runtime.test.ts tests/synthesis/125-synthesis-tab-ui.test.ts
```

| 检查 | 结果与边界 |
| --- | --- |
| 新平台模块 TDD | 空实现时 4 项中 3 项失败；实现后 4 项通过，最终平台模块单独复验通过 |
| 相关 Node 测试 | 103 项通过，覆盖 adapter 契约、页面入口失败边界及已有 Graph 区域清理 |
| 完整插件构建 | 通过，包含共享包检查和主、sidebar、dashboard、synthesis 四份 TypeScript 配置 |
| 受影响源码格式与 lint | Prettier 和 ESLint 通过 |
| 本地 Rust sidecar | 项目既有 direct staging 路径执行当前源码的 locked Cargo build，bundle 文件校验通过 |
| 修复 XPI | Windows 保护代码已打包，主动 loseContext 保留，安装文件与验收包一致 |

验收 XPI SHA256：`d7cdf99a0156c6f6c2560bb8b61ecb1d8097bfb487b7e62a62f4b24edfbc90e8`。本地 sidecar bundle ID：`247721ee2342305e14cdf4a1febbef4207474434a0699f4793e839cf0ccc4fa9`，build fingerprint：`74fc56c1bf04d0dcfd571ba42abbc8fb042d8119a6c0cd88a178e652b88a4f18`。

## 真实鼠标验收

环境为 Windows x64、Intel Arc A380 驱动 `32.0.101.8861`、Zotero 10.0.5。真实库与 profile 只作只读来源，运行金例副本。旧插件卸载后退出整个 Zotero，核验旧进程、XPI 和插件记录消失，再重启并安装修复包。

用户每轮执行：Dashboard/Synthesis workbench → Synthesis → Citation Graph，等待节点与连线完整显示、刷新结束，再用鼠标点击顶部工作台 Tab 的“×”关闭。第一轮截图确认实际图谱已显示。首轮及两轮重复均未调用外部 LoadLibrary 保活探针，也未附加调试器。

初始进程没有加载 D3D11；首次打开图谱后，只读 Windows loader 检查得到 `LoadCount=0xffffffff`，确认插件自身取得 OS PIN。只读检查采用本系统 ntdll PDB 核验的结构布局；未在目标进程中执行代码。

| 轮次 | 原生与宿主观察 | 用户确认 |
| --- | --- | --- |
| 1 | 报告后观察 23.5 秒；ControlLib/IntelControlLib 已卸载，D3D11 保持 PIN，宿主响应，无新增 WER dump | Tab 已关闭，Zotero 正常 |
| 2 | 模块监测捕获再次加载与卸载；卸载后 D3D11 持续驻留，宿主响应 | 两轮重复测试均正常，每轮关闭后等待至少 20 秒 |
| 3 | 捕获第二次再次加载与卸载；最后卸载后观察 76.9 秒，D3D11 保持 PIN，宿主响应，无新增 WER dump | 同上 |

未运行新的跨版本矩阵或 100 轮压力验收。首次错误的无界面启动在安装修复包和打开图谱前已替换，不计入三轮验收；调试断点语法造成的早先暂停也不计为插件故障。自动化压力入口继续使用既有 `npm run test:zotero:e2e:stress`，本轮 GUI 证据没有新增平行 runner。

## 证据保管与未验证范围

原始 full dump、CDB 日志、截图、加载器记录和修复 XPI 保留工作区外；私有 profile/data 的运行副本留在项目忽略的隔离测试目录。可追溯材料包括私有 `mouse-close-analysis.md`、修复包构建身份、首轮前后检查、两次驱动模块卸载观察和 WER 基线；本 change 不复制原始私有材料。

这是针对已观察 DLL 生命周期错误的插件侧回避。目前仅验证上述本机组合；其它设备、驱动、Zotero 7/9 和其它 Zotero 10 补丁版本仍需实机验收，不能从此次通过推断全部平台通过。

## OpenSpec 记录校验

2026-10-04 完成以下检查，均通过：

```powershell
openspec validate 01-fix-windows-citation-graph-close-crash --strict
npx prettier --check 'openspec/changes/01-fix-windows-citation-graph-close-crash/**/*.{md,yaml}'
git diff --check
```

proposal、design、spec delta 和 tasks 全部齐备，任务清单全部完成。本次补记没有重新修改生产源码或扩展硬件验收范围。

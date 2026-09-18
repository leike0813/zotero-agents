# 实机测试用 Zotero 宿主二进制

`tests/zotero/compatibility-matrix.json` 让 CI 自己拉取并校验 Zotero 宿主，用完留在 `~/.cache/zotero-agents/zotero-hosts` 缓存里。实机（GUI 或无头 xvfb）测试需要一份稳定留在本机、可以直接启动的安装树，所以单独维护在仓库外。本目录按平台分树维护 Linux x86_64 与 Windows x86_64 两套。

## 存放位置

```text
<artifact-root>/zotero-hosts/
├── manifest.json                                    # Linux 记录：来源、摘要与构建号
├── manifest.windows-x64.json                        # Windows 记录：来源、摘要、构建号、验证方法
├── archives/                                        # 官方原始归档字节
│   ├── Zotero-7.0.32_linux-x86_64.tar.bz2
│   ├── Zotero-9.0.6_linux-x86_64.tar.xz
│   ├── Zotero-10.0.2_linux-x86_64.tar.xz
│   ├── Zotero-7.0.32_win-x64.zip
│   ├── Zotero-9.0.6_win-x64.zip
│   └── Zotero-10.0.2_win-x64.zip
├── linux-x86_64/
│   ├── 7.0.32/Zotero_linux-x86_64/zotero
│   ├── 9.0.6/Zotero_linux-x86_64/zotero
│   └── 10.0.2/Zotero_linux-x86_64/zotero
└── windows-x64/
    ├── 7.0.32/Zotero_win-x64/zotero.exe
    ├── 9.0.6/Zotero_win-x64/zotero.exe
    └── 10.0.2/Zotero_win-x64/zotero.exe
```

Linux 侧根目录是 `~/Workspace/Artifact/Zotero-Skills/zotero-hosts/`，Windows 侧是 `D:\Workspace\Artifact\Zotero-Skills\zotero-hosts\`，下面用 `<artifact-root>` 泛指各自的根。平台固定为 Linux x86_64 与 Windows x86_64：Linux 取官方 `linux-x86_64` 构建，归档内 `zotero-bin` 是可执行的 x86-64 ELF；Windows 取官方 `win-x64` 构建，归档内 `zotero.exe` 是 PE 启动器。通道固定为 `release`，即正式版。这批二进制属于本机测试数据，不进入仓库，也不参与构建或发布。

## 版本与来源

| 平台 | 版本 | 归档 | SHA-256 | BuildID |
| --- | --- | --- | --- | --- |
| Linux | 7.0.32 | `Zotero-7.0.32_linux-x86_64.tar.bz2` | `8ddd78ffcdb2fee4f4e4b40b4e9444fb356bed01ca37a5565835f9b6f32db1ee` | `20260114201030` |
| Linux | 9.0.6 | `Zotero-9.0.6_linux-x86_64.tar.xz` | `0db6e8f94bd0d84e862e6ef5c3e217030e173c0cd3c6dfbc836252c650fea3dd` | `20260707150941` |
| Linux | 10.0.2 | `Zotero-10.0.2_linux-x86_64.tar.xz` | `5f7ed486bf2daac703b905500dd8236b5b6982f7759f0699610ac926764b2a90` | `20260909184950` |
| Windows | 7.0.32 | `Zotero-7.0.32_win-x64.zip` | `2ab5b1825600223655efec694e7ec0a406886f42c8cbad4138c00470c550e190` | `20260114201345` |
| Windows | 9.0.6 | `Zotero-9.0.6_win-x64.zip` | `5101200aa900558d61abd6d0b4d504c8fb5b0e9edc9ee40f6d77bc21ec2eac9e` | `20260707151128` |
| Windows | 10.0.2 | `Zotero-10.0.2_win-x64.zip` | `b1238ef3fe736f5e46a32f2fbb65ed97bf29cbbb2750cb2047e2220441055999` | `20260909185038` |

下载地址是官方带精确版本号的路径，例如 `https://download.zotero.org/client/release/10.0.2/Zotero-10.0.2_win-x64.zip`，不经过 `channel=release` 重定向，因此不会随上游发布而漂移。归档扩展名不随大版本统一：Linux 的 7.0.x 是 `.tar.bz2`，9.0.x 与 10.0.x 是 `.tar.xz`。平台段与条目根目录也按平台固定：Linux 是 `linux-x86_64` 与 `Zotero_linux-x86_64/`，Windows 是 `win-x64` 与 `Zotero_win-x64/`。实测三个 Windows 归档都只含 `Zotero_win-x64/` 一个条目根，没有 x86 变体。

两个平台的 7.0.32 与 9.0.6 摘要都与兼容性矩阵里的既有记录一致，两条独立记录相互印证。`manifest.windows-x64.json` 里记录的 10.0.2 上游没有发布校验和文件，落盘时首次记录，依据是官方 HTTPS 版本化 URL 加落盘后的重复计算；这个记录同时保存了 Windows 侧的完整来源与验证方法。三棵 Linux 安装树的文件清单已逐条对照各自归档核对一致，`app/application.ini` 的 `Version` 与目录名相符，`ldd` 无缺失动态库；三棵 Windows 安装树同样逐条对照归档核对一致（`Zotero_win-x64/` 下 109 / 86 / 86 个文件与 9 个目录，missing 与 extra 均为 0），`app/application.ini` 的 `Version` 与目录名相符。同一版本在两个平台的 BuildID 不同属于正常现象：上游各平台分别构建。

## 与兼容性矩阵的关系

矩阵是本仓库 Zotero 版本口径的唯一事实源，当前固定 7.0.32、9.0.6、10.0.1。<artifact-root> 里 Zotero 10 两个平台的安装树取的都是该线路的 10.0.2，与矩阵差一个补丁版本，这是有意保留的：矩阵服务于 CI 门禁的可复现性，<artifact-root> 服务于贴近用户真实环境的实机验证。选定 10.0.2 还有一个当期理由：官方当前稳定版已经推进到 10.0.3，若跟随官方最新版，两个平台的树都会继续漂移，跨平台对比会被补丁版本差异干扰。

这不是把矩阵升到 10.0.2 的授权。矩阵改版仍需按 `artifacts/zotero_7_9_10_compatibility_test_framework_design_guide.md` 的要求作为显式变更进入 PR，更新版本与摘要后跑完整矩阵；反过来，<artifact-root> 也不必跟随矩阵的每次改动。

## 启动

走仓库入口时把 `.env` 指向想测的那棵安装树：

```dotenv
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero
ZOTERO_PLUGIN_PROFILE_PATH=/path/to/profile
ZOTERO_PLUGIN_DATA_DIR=/path/to/data
```

然后 `npm run start` 或 `npm run start:direct`。这条路径会经 `scripts/run-zotero-direct.ts` 的 `patchPrefsJs` 关闭 `app.update.enabled` 与遥测，不会弄脏安装树。

Windows 侧把 `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` 指向 `.exe` 即可：

```dotenv
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=D:\Workspace\Artifact\Zotero-Skills\zotero-hosts\windows-x64\10.0.2\Zotero_win-x64\zotero.exe
ZOTERO_PLUGIN_PROFILE_PATH=D:\path\to\profile
ZOTERO_PLUGIN_DATA_DIR=D:\path\to\data
```

Windows 启动有一个与 Linux 不同的观测点：`zotero.exe` 只是启动器桩，它把请求转交给真正的浏览器进程后立刻退出，所以脚本里不能用 `Start-Process -PassThru` 返回的进程句柄判断 Zotero 是否还在运行，要按安装树路径查进程。只做一次性验证时可以直接拉起二进制：

```shell
~/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero \
  -no-remote -profile /path/to/profile --dataDir /path/to/data -ZoteroDebugText
```

无头环境前置 `xvfb-run -a`。手工启动务必用独立的 profile 与 data 目录，不要指向日常使用的库。

## 自动更新会污染安装树

不走 `patchPrefsJs` 手工启动时，Zotero 会在安装树里写 `active-update.xml` 与 `updates/`。实测用 7.0.32 无头启动约一分钟，更新器就判定可升级到 9.0.6 并开始下载 65 MB 增量 MAR，树体积从 214 MiB 涨到 276 MiB，`updates/0/update.status` 停在 `downloading`。后续启动可能续传并套用更新，安装树会静默偏离目录名标注的版本。被强杀的进程还会留下 `.parentlock`。Windows 侧同类残留物同样可能落在安装树，另有部分状态写在 profile 目录，两者都不应留在安装树里。

恢复 pristine 就是删掉这些运行时残留：

```shell
T=~/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64
rm -f "$T/active-update.xml" "$T/.parentlock" && rm -rf "$T/updates"
```

Windows 侧在 profile 的 `prefs.js` 里写 `user_pref("app.update.enabled", false)` 关掉更新，临时 profile 与 data 目录放在安装树之外，验证完连同目录一并删除，安装树只做只读使用。

## 刷新

替换或新增版本时复用仓库已有的校验式拉取器，不要手工 `curl | tar`：

```shell
npm run test:zotero:compatibility:acquire -- \
  --target=zotero-9-linux-x64 \
  --cache-root="$HOME/.cache/zotero-agents/zotero-hosts"
```

Windows 目标同样可用：

```shell
npm run test:zotero:compatibility:acquire -- \
  --target=zotero-9-windows-x64 \
  --cache-root="$HOME/.cache/zotero-agents/zotero-hosts"
```

它按 `archives/<sha256>` 与 `hosts/<platform>/<version>/<sha256>/recipe-<n>` 布局落盘，并在解压前检查归档条目、解压后核对 `expected_binary` 与 `application.ini` 版本；Windows 目标的 `expected_binary` 是 `Zotero_win-x64/zotero.exe`。要拉取矩阵里没有的版本（例如升级到 10.0.3），先把目标按现有字段补进 `tests/zotero/compatibility-matrix.json` 再走这条命令，<artifact-root> 的安装树与两个 `manifest` 则按本文布局手工落位。

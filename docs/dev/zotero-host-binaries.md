# 实机测试用 Zotero 宿主二进制

`tests/zotero/compatibility-matrix.json` 让 CI 自己拉取并校验 Zotero 宿主，用完留在 `~/.cache/zotero-agents/zotero-hosts` 缓存里。实机（GUI 或无头 xvfb）测试需要一份稳定留在本机、可以直接启动的安装树，所以单独维护在仓库外。

## 存放位置

```text
~/Workspace/Artifact/Zotero-Skills/zotero-hosts/
├── manifest.json                                    # 机器可读的来源、摘要与构建号记录
├── archives/                                        # 官方原始归档字节
│   ├── Zotero-7.0.32_linux-x86_64.tar.bz2
│   ├── Zotero-9.0.6_linux-x86_64.tar.xz
│   └── Zotero-10.0.2_linux-x86_64.tar.xz
└── linux-x86_64/
    ├── 7.0.32/Zotero_linux-x86_64/zotero
    ├── 9.0.6/Zotero_linux-x86_64/zotero
    └── 10.0.2/Zotero_linux-x86_64/zotero
```

平台固定为 Linux x86_64，取官方 `linux-x86_64` 构建，归档内 `zotero-bin` 是可执行的 x86-64 ELF；通道固定为 `release`，即正式版。这批二进制属于本机测试数据，不进入仓库，也不参与构建或发布。

## 版本与来源

| 版本 | 归档 | SHA-256 | BuildID |
| --- | --- | --- | --- |
| 7.0.32 | `Zotero-7.0.32_linux-x86_64.tar.bz2` | `8ddd78ffcdb2fee4f4e4b40b4e9444fb356bed01ca37a5565835f9b6f32db1ee` | `20260114201030` |
| 9.0.6 | `Zotero-9.0.6_linux-x86_64.tar.xz` | `0db6e8f94bd0d84e862e6ef5c3e217030e173c0cd3c6dfbc836252c650fea3dd` | `20260707150941` |
| 10.0.2 | `Zotero-10.0.2_linux-x86_64.tar.xz` | `5f7ed486bf2daac703b905500dd8236b5b6982f7759f0699610ac926764b2a90` | `20260909184950` |

下载地址是官方带精确版本号的路径，例如 `https://download.zotero.org/client/release/10.0.2/Zotero-10.0.2_linux-x86_64.tar.xz`，不经过 `channel=release` 重定向，因此不会随上游发布而漂移。归档扩展名不随大版本统一：7.0.x 是 `.tar.bz2`，9.0.x 与 10.0.x 是 `.tar.xz`。

7.0.32 与 9.0.6 的摘要与兼容性矩阵里的既有记录一致，两条独立记录相互印证。10.0.2 上游没有发布校验和文件，落盘时首次记录，依据是官方 HTTPS 版本化 URL 加落盘后的重复计算。三棵安装树的文件清单已逐条对照各自归档核对一致，`app/application.ini` 的 `Version` 与目录名相符，`ldd` 无缺失动态库。

## 与兼容性矩阵的关系

矩阵是本仓库 Zotero 版本口径的唯一事实源，当前固定 7.0.32、9.0.6、10.0.1。本目录里 Zotero 10 取的是该线路当前最新正式版 10.0.2，与矩阵差一个补丁版本，这是有意保留的：矩阵服务于 CI 门禁的可复现性，本目录服务于贴近用户真实环境的实机验证。

这不是把矩阵升到 10.0.2 的授权。矩阵改版仍需按 `artifacts/zotero_7_9_10_compatibility_test_framework_design_guide.md` 的要求作为显式变更进入 PR，更新版本与摘要后跑完整矩阵；反过来，本目录也不必跟随矩阵的每次改动。

## 启动

走仓库入口时把 `.env` 指向想测的那棵安装树：

```dotenv
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/home/joshua/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero
ZOTERO_PLUGIN_PROFILE_PATH=/path/to/profile
ZOTERO_PLUGIN_DATA_DIR=/path/to/data
```

然后 `npm run start` 或 `npm run start:direct`。这条路径会经 `scripts/run-zotero-direct.ts` 的 `patchPrefsJs` 关闭 `app.update.enabled` 与遥测，不会弄脏安装树。

只做一次性验证时可以直接拉起二进制：

```shell
~/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64/zotero \
  -no-remote -profile /path/to/profile --dataDir /path/to/data -ZoteroDebugText
```

无头环境前置 `xvfb-run -a`。手工启动务必用独立的 profile 与 data 目录，不要指向日常使用的库。

## 自动更新会污染安装树

不走 `patchPrefsJs` 手工启动时，Zotero 会在安装树里写 `active-update.xml` 与 `updates/`。实测用 7.0.32 无头启动约一分钟，更新器就判定可升级到 9.0.6 并开始下载 65 MB 增量 MAR，树体积从 214 MiB 涨到 276 MiB，`updates/0/update.status` 停在 `downloading`。后续启动可能续传并套用更新，安装树会静默偏离目录名标注的版本。被强杀的进程还会留下 `.parentlock`。

恢复 pristine 就是删掉这些运行时残留：

```shell
T=~/Workspace/Artifact/Zotero-Skills/zotero-hosts/linux-x86_64/10.0.2/Zotero_linux-x86_64
rm -f "$T/active-update.xml" "$T/.parentlock" && rm -rf "$T/updates"
```

## 刷新

替换或新增版本时复用仓库已有的校验式拉取器，不要手工 `curl | tar`：

```shell
npm run test:zotero:compatibility:acquire -- \
  --target=zotero-9-linux-x64 \
  --cache-root="$HOME/.cache/zotero-agents/zotero-hosts"
```

它按 `archives/<sha256>` 与 `hosts/linux-x64/<version>/<sha256>/recipe-<n>` 布局落盘，并在解压前检查归档条目、解压后核对 `expected_binary` 与 `application.ini` 版本。要拉取矩阵里没有的版本（例如升级到 10.0.3），先把目标按现有字段补进 `tests/zotero/compatibility-matrix.json` 再走这条命令，本目录的安装树与 `manifest.json` 则按本文布局手工落位。

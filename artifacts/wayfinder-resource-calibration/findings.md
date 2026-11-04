# 统一文件交付资源校准：实验记录

关联：[校准统一文件交付与长调用的资源预算](https://github.com/leike0813/zotero-agents/issues/110)。原型源与 JSON 位于当前工作树，尚未提交，不代表远端可下载的已发布资产。

## 证据层级与环境

- Linux x64，Node v24.12.0，共享 uv 环境 Python 3.12.15；本地 NVMe、充足内存，非低配设备。未运行真实 Zotero、真实 Agent、跨机器网络或完整 workflow。
- `reader-probe.ts` 调用生产 HTTP request reader，输入为模型化 XPCOM 流；`http-probe.mjs` 是独立 Node loopback server/client；`zip-probe.py` 是 Python stdlib ZIP/ZIP64。不能把后二者当作现有 Host 实现通过。
- 原始结果：`reader-results-final.json`（7 个场景）、`resource-results.json`（19 个场景，所有子进程退出 0）。前者引用保留的早期失败记录。早期 RSS 计量错误、输入模型过大及预期拒绝处理错误均未当作生产通过证据。
- RSS 取 Linux `/proc/self/status` 的 VmHWM，避免继承的 rusage maxRSS 污染。Node 数值包含同一进程内客户端、服务端和合成输入；Python 包含 ZIP 元数据和校验记录。不是 Gecko 增量内存。
- 每例安全条件：RSS 256 MiB、剩余磁盘 8 GiB、600 秒；大 IO 限速 256 MiB/s，低 CPU/IO 调度优先级。没有安装依赖、修改真实库/profile 或生产实现。

## 大材料结果

| 场景 | 净载荷 / 条目 | 耗时 | 进程峰值 RSS | 自有文件磁盘峰值 |
|---|---|---|---|---|
| HTTP 上传后下载 | 64 MiB | 上传 0.43 s / 下载 0.36 s | 143.7 MiB | 0.125 GiB |
| HTTP 上传后下载 | 512 MiB | 上传 2.85 s / 下载 3.11 s | 148.0 MiB | 1.000 GiB |
| HTTP 上传后下载 | 2 GiB | 上传 10.80 s / 下载 12.23 s | 152.7 MiB | 4.000 GiB |
| HTTP 上传后下载 | 16 GiB | 上传 84.54 s / 下载 79.21 s | 154.1 MiB | 32.000 GiB |
| Topic 形状 ZIP | 50 MiB / 256 | 生成 2.67 s / 展开 1.27 s | 23.2 MiB | 0.087 GiB |
| Research 形状 ZIP | 2 GiB / 5000 | 生成 9.01 s / 展开 27.26 s | 25.9 MiB | 4.011 GiB |
| Archive 上界形状 ZIP64 | 16 GiB / 20000 | 生成 70.19 s / 展开 209.38 s | 41.1 MiB | 32.079 GiB |
| 长名称 ZIP | 20000 字节 / 20000 | 生成 1.53 s / 展开 76.20 s | 247.1 MiB | 0.187 GiB |

- 每次完整 HTTP 上传及下载独立计算 SHA-256；每个完整 ZIP 条目校验 SHA-256 与长度。合成材料不满足业务 Schema，不是业务产物验收。
- 普通 research ZIP 为 2,148,193,758 字节，比净载荷多 710,110 字节。普通 archive ZIP 为 17,182,949,258 字节，比净载荷多 3,080,074 字节。
- 长名称为 1024 UTF-16 code units、2936 UTF-8 字节、32 层；ZIP 119,380,022 字节，比 20,000 字节净载荷多 119,360,022 字节（约 113.8 MiB）。此数值不是所有合法 ZIP 元数据的最坏界限。
- JSON 的 `containerOverheadBytes` 是 archiveBytes - payloadBytes 的净差；压缩时会为负，不能解释成纯 header 开销。
- 16 GiB HTTP 的磁盘数值是服务端与客户端两份数据之和；ZIP 是包与展开副本。没有同时测量 HTTP+ZIP 全链路副本峰值、文件系统 journal 或系统 page cache。文件数据 fsync，未证明目录 fsync/掉电原子性。
- 长名称峰值距 256 MiB 实验保护线很近；不能据此宣布 256 MiB 是全部客户端可承诺的生产进程内存上限。更多元数据、不同运行时或 Windows 路径均可能改变结果。

## 边界与失败

- 生产 reader 组件：控制体 1 MiB、上传 16 MiB 的上界读取成功，超出 1 字节在正文前拒绝；取消结束一次。16 MiB 组件测试约 0.966 s、VmHWM 176.9 MiB，含 tsx/模型输入，不能换算为真实 Host 峰值。
- 生产 reader 与 Node 原型均观察到：500 ms idle 容不下主动暂停 1 s；10 s idle 在该场景成功。512 KiB/s 的 4 MiB 原型上传约 8.07 s。没有测试 WAN 抖动、10 s 临界点或大文件低速传输，不足以确定远端最终 idle/总时限。
- Node：超额 Content-Length 拒绝且未发正文（使用原型 Expect:100-continue，不等同现有 Host）；上传/下载主动中断均保留各自旧目标，临时文件清理。
- Python：父路径穿越、20001 条目在展开前拒绝；展开到约 8 MiB 主动中断，旧目标保留，自有目录清理。该验证器不是生产验证器，未覆盖 Windows 名称碰撞等规则。
- 19 例均报告自有大文件清理成功；最后直接枚举本轮 scratch 根为空。所有大材料均为新建随机目录中的合成字节。

## 调查时的源码边界

源码调查基线来自地图记录的 dev 工作树，非新接口已实现证明：
- `src/modules/hostBridge/server/hostBridgeServer.ts`：HTTP 控制 1 MiB、旧上传 16 MiB；旧 request reader 缓冲正文，因此不能只提高常量来承载大文件。
- `packages/synthesis-contracts/src/topicApplication.ts`：Topic assets 256 个 / 单个 5 MiB UTF-8 / 总 50 MiB。
- `researchBundleService.ts`：5000 文件 / 2 GiB。`src/workflows/archive.ts`：20000 条目 / 单条 2 GiB / 展开总量 16 GiB / 名称 1024 code units / 深度 64。
- `hostBridgeWorkflowResources.ts`：输入物化合计 32 GiB，输出单文件最大 16 GiB，输出槽还有各自文件数声明。不能把 32 GiB 擅自变成所有输入+所有输出的统一总上限。
- `src/modules/zipStore.ts` 的内存 ZIP32 不是 ZIP64 流式方案；原生 Zotero ZIP64 能力未证实。
- MCP 常规等待 45 s、artifact 124 s，与 operation 的 2/10/30 min、审批 300 s、传输会话闲置 5 min / 总 30 min 分属不同语义。文件搬运不能占着一次控制工具等待，也不能让调用方超时变成业务失败。
- `runtimeFileTransfer.ts` 并发为 1，调查时等待队列无界；本轮未做排队压力测量。批准后的队列与磁盘策略见票据决议，不能将当前源码误认为已满足新策略。

用户已完成预算反馈；唯一完整预算结论为票据中的 [Resolution：统一文件交付与长调用的资源预算](https://github.com/leike0813/zotero-agents/issues/110#issuecomment-6621883407)。本文件和 JSON 保留实验事实，不复制另一套预算定义。本机吞吐不能推断 WAN 性能，预算获批不代表真实 Agent、Zotero 或跨机路径通过。

# Tasks

## 1. 原生文件入口

- [x] 1.1 先补平台路径行为测试，实现盘符、UNC、扩展格式与设备命名空间规范化，通过既有 runtime platform 测试。
- [x] 1.2 先补共享 I/O 长路径回归，实现 native/interop 预算及所有原生路径参数适配，覆盖复制、原子替换、枚举、追加、worker 与 XPC 传输；更新路径 SSOT 和 AGENTS。

## 2. 有界暂存

- [x] 2.1 先补临时目录分配/治理回归，实现独占短目录、兼容根回退、在用保护和匹配所有者清理；同步治理文档。
- [x] 2.2 先补研究包长名称/长运行 ID 回归，迁移资源与输出分配，保持展示身份和已发布输出保留期；通过 research bundle 与 partial export 测试。
- [x] 2.3 迁移 Workflow 输入、上传、附件准备和 ACP 文件暂存，复用共享分配入口并保留消费者生命周期；通过相应已有专项并更新附件文档。

## 3. 消费者兼容

- [x] 3.1 先补 Workflow file/archive 与 bundle 提取长路径用例，实现短副本、全部成员预检、同卷暂存提交与取消/失败保全；通过归档、文件与相邻输出专项并更新 Workflow 文档。

## 4. 集成验收

- [x] 4.1 执行相关 Node 分片、类型、lint/格式和 OpenSpec strict 校验，记录命令与实际结果；解决本次引入的失败。
- [x] 4.2 经 build-preflight 准备当前源码 XPI，通过既有 Windows Zotero 7/9/10 隔离入口验证普通长路径文件操作、传输与归档中转；记录未获证据的能力，不将缺失结果视作通过。

## Workflow follow-up

- 验证命令、实际宿主及覆盖限制见 design 的 Validation。保留未归档变更，不提交、发布或安装到用户日常 profile。

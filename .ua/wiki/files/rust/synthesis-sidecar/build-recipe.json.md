
# rust/synthesis-sidecar/build-recipe.json
所属分层：[Synthesis 领域与侧车](../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar](../../../modules/rust/synthesis-sidecar.md)
<!-- node: config:rust/synthesis-sidecar/build-recipe.json -->

侧车跨平台构建配方（synthesis-sidecar.build-recipe.v1）：固定 node 24.18.0 / rust nightly-2026-07-25 / zig 0.13.0 工具链版本，并按 runner 与 target 声明 win32-x64、darwin-x64、darwin-arm64、linux-x86/x64/arm/arm64 七个发布目标及其是否使用 zig 交叉链接、是否做原生冒烟验证。
源码：[rust/synthesis-sidecar/build-recipe.json](../../../../../rust/synthesis-sidecar/build-recipe.json)

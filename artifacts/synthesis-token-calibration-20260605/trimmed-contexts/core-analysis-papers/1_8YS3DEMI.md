# Real-time object detection meets DINOv3 (2026)

- Paper ref: 1:8YS3DEMI
- Title: Real-time object detection meets DINOv3
- Year: 2026

## Filtered Digest

#### TL;DR

本文提出 DEIMv2，一种基于 DINOv3 特征的实时目标检测器。DEIMv2 提供从 X 到 Atto 共八种模型尺寸，覆盖 GPU、边缘和移动设备部署。

对于 X、L、M、S 变体，采用 DINOv3 预训练/蒸馏骨干网络，并引入空间调优适配器（STA），将 DINOv3 的单尺度输出高效转换为多尺度特征。对于超轻量级模型（Nano、Pico、Femto、Atto），采用剪枝后的 HGNetv2 骨干。

实验表明，DEIMv2-X 以仅 50.3M 参数实现 57.8 AP，超越 prior X-scale 模型。DEIMv2-S 成为首个突破 50 AP 的 sub-10M 模型（9.71M 参数，50.9 AP）。DEIMv2-Pico 以 1.5M 参数达到 38.5 AP，与 YOLOv10-Nano（2.3M）相当但参数减少约 50%。

#### 研究问题与贡献

- 研究问题：如何在实时目标检测中有效利用 DINOv3 的强大特征表示，同时覆盖从高性能到超轻量级的广泛部署场景？

- 提出 DEIMv2，提供八种模型尺寸，覆盖 GPU、边缘和移动设备部署

- 对于较大模型，利用 DINOv3 获取强语义特征，并引入 STA 高效集成到实时检测

- 对于超轻量级模型，基于 HGNetv2-B0 剪枝深度和宽度，满足严格计算约束

- 简化 decoder 并升级 Dense O2O，引入物体级 Copy-Blend 增强

- 在 COCO 上证明 DEIMv2 在所有资源设置下超越现有 SOTA 方法

#### 方法要点

- 空间调优适配器（STA）：将 DINOv3 的单尺度（1/16）输出通过双线性插值转换为多尺度特征，并补充细粒度细节

- ViT 骨干变体：L/X 使用 DINOv3 预训练的 ViT-Small/Small+，S/M 使用从 DINOv3 蒸馏的 ViT-Tiny/Tiny+

- HGNetv2 变体：Nano/Pico/Femto/Atto 通过逐步剪枝 HGNetv2-B0 的深度和宽度实现超轻量设计

- 高效 Decoder：采用 SwiGLUFFN、RMSNorm，跨层共享查询位置嵌入

- 增强的 Dense O2O：引入物体级 Copy-Blend 增强，增加有效监督

#### 关键结果

- DEIMv2-X：57.8 AP，50.3M 参数，151.6 GFLOPs，超越 DEIM-X（56.5 AP，62M 参数）

- DEIMv2-S：50.9 AP，9.71M 参数，25.62 GFLOPs，首个 sub-10M 突破 50 AP 的模型

- DEIMv2-Pico：38.5 AP，1.51M 参数，5.15 GFLOPs，与 YOLOv10-Nano（2.3M）相当

- DEIMv2-Atto：23.8 AP，0.49M 参数，0.76 GFLOPs，与 NanoDet-M 相当但尺寸更小

- DINOv3 特征主要提升中大物体检测性能，小物体检测仍是挑战

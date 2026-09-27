# Cross-paper Context

- `1:3JUY9GBQ` DETR3D: 3D object detection from multi-view images via 3D-to-2D queries: DETR3D 使用 3D-to-2D queries 把多视角图像信息组织到 3D 检测中，说明 DETR 的 query/set prediction 思路可跨越 2D COCO 场景。
- `1:5HBHAWIV` Deformable DETR: deformable transformers for end-to-end object detection: Deformable DETR 用稀疏 deformable attention 让 query 只关注少量关键采样点，显著改善训练效率和小目标检测。
- `1:EIMSDEU3` End-to-end object detection with transformers: DETR 把目标检测重构为集合预测问题，用 Transformer decoder object queries 和 Hungarian matching 避免手工 NMS/anchor 后处理，是本 topic 的方法原点。
- `1:HPLZ65Z2` DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection: DINO 通过 denoising anchor boxes 改善 query 学习和 matching 稳定性，展示 DETR-family 从概念验证走向强检测器的训练技术路线。
- `1:SZ3GNWT9` RF-DETR: neural architecture search for real-time detection transformers: RF-DETR 把 DETR-family 推向实时检测和架构搜索/部署约束，显示该主题从收敛改进继续演化到效率、迁移和工程约束。

#### 总体总结
本文在引言和相关工作部分通过清晰的研究脉络组织文献：首先介绍物体检测和图像分割的基础概念及传统 CNN 方法（如 Faster R-CNN、Mask R-CNN、FCN），说明这些方法针对特定任务设计、缺乏泛化能力；然后引入 DETR 类 Transformer 模型的发展，包括 DETR、DAB-DETR、DN-DETR 到 DINO 的技术演进路线，以及 MaskFormer、Mask2Former 等统一分割架构的出现；最后指出当前 Transformer 模型中检测和分割最佳模型仍然分离的问题，引出本文开发统一架构的动机。文章通过对比 CNN 时代成功统一的模型（如 Mask R-CNN、HTC）与 Transformer 时代专用模型的局限，论证了开发统一 Transformer 框架的必要性和可行性。


#### 关键文献

- [1] Nicolas Carion, 2020: End-toend object detection with transformers.In European conference on computer vision, pages 213-229 (Background)

- [3] Bowen Cheng, 2022: Schwing,Alexander Kirillov,and Rohit Girdhar (Uncategorized)

- [32] Hao Zhang, 2022: DINO: DETR withImproved DeNoising Anchor Boxes for End-to-End Ob-ject Detection. arXiv preprint arXiv:2203 (Uncategorized)



#### 范围
- 章节：Introduction + Related Work
- 行号：16-39

#### 按功能归类


##### Background

- [1] Nicolas Carion, 2020
  - 标题：End-toend object detection with transformers.In European conference on computer vision, pages 213-229
  - 关键词：DETR, transformer detector, end-to-end detection
  - 总结：本文引用 DETR 作为基于 Transformer 的检测器的起点，说明其集合预测目标和消除手工设计模块的优势，但指出其分割性能不足。

- [14] Alexander Kirillov, 2019
  - 标题：Panoptic segmentation
  - 关键词：panoptic segmentation, unified segmentation, stuff and things
  - 总结：本文引用全景分割原始论文来定义任务：统一实例和语义分割，预测每个物体或背景段的掩码。

- [21] Jonathan Long, 2015
  - 标题：Fully convolutional networks for semantic segmentation
  - 关键词：FCN, semantic segmentation, pixel-wise classification
  - 总结：本文引用 FCN 作为语义分割的经典 CNN 方法，说明其仅能进行像素级分类的局限性。

- [24] Shaoqing Ren, 2015
  - 标题：Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词：Faster R-CNN, object detection, region proposal
  - 总结：本文引用 Faster R-CNN 作为经典 CNN 检测器的代表，说明传统方法针对特定任务设计、缺乏泛化能力。

- [25] Olaf Ronneberger, 2015
  - 标题：U-net: Convolutional networks for biomedical image segmentation
  - 关键词：U-Net, biomedical segmentation, encoder-decoder
  - 总结：在 Related Work 中作为仅能进行语义分割的 CNN 方法被引用。

- [27] Ashish Vaswani, 2017
  - 标题：Attention is all you need
  - 关键词：Transformer, attention mechanism, sequence modeling
  - 总结：本文引用原始 Transformer 论文作为基础架构背景，说明 DETR 类模型的技术来源。



##### Uncategorized

- [2] Kai Chen, 2019
  - 标题：Hybrid task cascade for instance segmentation
  - 关键词：HTC, instance segmentation, CNN-based unified model
  - 总结：本文用 HTC 作为 CNN 基线，展示传统方法在任务统一方面的局限性（仅支持实例分割）。

- [3] Bowen Cheng, 2022
  - 标题：Schwing,Alexander Kirillov,and Rohit Girdhar
  - 关键词：Mask2Former, universal segmentation, masked attention
  - 总结：本文详细分析 Mask2Former 的架构局限（不适合检测），并作为主要对比基线展示 Mask DINO 的优势。

- [4] Bowen Cheng, 2021
  - 标题：Schwing,and Alexander Kirillov.Per-Pixel Clasification is Not Al You Need for Semantic Segmentation
  - 关键词：MaskFormer, per-pixel classification, mask classification
  - 总结：本文引用 MaskFormer 作为统一分割架构的早期工作，Mask2Former 在其基础上引入 masked attention。

- [7] Yuxin Fang, 2021
  - 标题：Instances as queries
  - 关键词：instances as queries, query-based detection
  - 总结：在 Related Work 中作为基于查询的检测方法被引用。

- [9] Kaiming He, 2017
  - 标题：Mask r-cnn.In Proceedings of the IEEE international conference on computer vision,pages 2961-2969,
  - 关键词：Mask R-CNN, instance segmentation, ROI Align
  - 总结：本文引用 Mask R-CNN 作为 CNN 基线，说明其仅能处理实例分割的局限性。

- [12] Jitesh Jain, 2021
  - 标题：SeMask: Semantically Masked Transformers for Semantic Segmentation. arXiv preprint arXiv:2112
  - 关键词：SeMask, semantic segmentation, masked transformer
  - 总结：在 Related Work 中作为语义分割的专用方法被引用。

- [13] Alexander Kirillov, 2019
  - 标题：Panoptic feature pyramid networks.In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 6399-6408,
  - 关键词：panoptic FPN, panoptic segmentation
  - 总结：在 Related Work 中作为全景分割的专用方法被引用，说明其性能不如专用实例/语义分割模型。

- [15] Feng Li, 2022
  - 标题：DN-DETR: Accelerate DETR Training by Introducing Query DeNoising. arXiv preprint arXiv:2203
  - 关键词：DN-DETR, query denoising, training acceleration
  - 总结：本文引用 DN-DETR 作为 DINO 去噪训练的来源，Mask DINO 继承了这一技术并扩展到掩码预测。

- [18] Shilong Liu, 2022
  - 标题：DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR. arXiv preprint arXiv:2201
  - 关键词：DAB-DETR, dynamic anchor boxes, 4D queries
  - 总结：本文引用 DAB-DETR 作为 DINO 动态锚框公式的来源，Mask DINO 继承并使用锚框指导交叉注意力。

- [23] Zipeng Qin, 2022
  - 标题：Pyramid Fusion Transformer for Semantic Segmentation.arXiv preprint arXiv:2201
  - 关键词：pyramid fusion, semantic segmentation
  - 总结：在 Related Work 中作为语义分割的 Transformer 方法被引用。

- [28] Huiyu Wang, 2021
  - 标题：Max-deeplab: End-to-end panoptic segmentation with mask transformers
  - 关键词：Max-DeepLab, panoptic segmentation, mask transformer
  - 总结：在 Related Work 中作为统一分割的方法被引用。

- [32] Hao Zhang, 2022
  - 标题：DINO: DETR withImproved DeNoising Anchor Boxes for End-to-End Ob-ject Detection. arXiv preprint arXiv:2203
  - 关键词：DINO, DETR improvement, denoising anchor boxes
  - 总结：本文基于 DINO 框架扩展 Mask DINO，继承其锚框公式、去噪训练、查询选择等核心组件并扩展到分割任务。

- [33] Wenwei Zhang, 2021
  - 标题：K-net: Towards unified image segmentation
  - 关键词：K-Net, unified segmentation, kernel-based
  - 总结：在 Related Work 中作为统一实例、全景、语义分割的方法被引用。

- [35] Xizhou Zhu, 2021
  - 标题：Deformable detr:Deformable transformers for end-to-end object detection
  - 关键词：Deformable DETR, deformable attention, sparse sampling
  - 总结：本文引用 Deformable DETR 作为 DINO 使用多尺度特征和稀疏注意力的技术来源，Mask DINO 继承这一设计。



##### Dataset

- [26] Objects365:A large-scale, high-quality dataset for object detection
  - 标题：Objects365:A large-scale, high-quality dataset for object detection
  - 关键词：Objects365, detection dataset, pre-training
  - 总结：本文使用 Objects365 进行_detection_预训练，展示 Mask DINO 可通过统一框架从大规模检测数据中受益于所有分割任务。

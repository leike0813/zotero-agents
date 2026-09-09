#### 总体总结
本文围绕DETR查询设计这一核心问题组织引文脉络。首先用早期卷积检测器（Fast R-CNN、YOLO、Faster R-CNN）和Transformer架构铺出技术背景，说明传统检测器的显著进展以及DETR带来的范式转变。接着将直接改进DETR收敛速度的工作（Sun等人的编码器分析、Conditional DETR、Deformable DETR、Anchor DETR等）并置比较，指出它们都试图让查询更明确关联空间位置但各有局限。最后借几篇关键文献（DETR原论文、Conditional DETR、Anchor DETR、Deformable DETR）把本文的动态锚框查询方法明确定位为在保留标准交叉注意力的同时引入4D锚框和尺寸调制的独特路线。


#### 关键文献

- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers (Component)

- [AY-5] Joseph Redmon, 2016: You only look once: Unified, real-time object detection (Contrast)

- [AY-11] Zhuyu Yao, 2021: Efficient detr: Improving end-to-end object detector with dense prior (Contrast)

- [AY-10] Xizhou Zhu, 2021: Deformable detr: Deformable transformers for end-to-end object detection (Contrast)



#### 范围
- 章节: Introduction through Conclusion + Appendix
- 行号: 1-349

#### 按功能归类


##### Background

- [AY-1] Alexey Bochkovskiy, 2020
  - 标题: Yolov4: Optimal speed and accuracy of object detection
  - 关键词: YOLO, convolutional detector, real-time detection
  - 总结: 该工作被用作卷积检测器路线的代表，说明传统检测器在过去十年取得的显著进展

- [AY-3] Zheng Ge, 2021
  - 标题: Yolox: Exceeding yolo series in 2021
  - 关键词: YOLOX, anchor-free, decoupled head
  - 总结: 该工作被用作现代卷积检测器的代表，说明传统方法仍在不断进步

- [AY-4] Ross Girshick, 2015
  - 标题: Fast r-cnn
  - 关键词: Fast R-CNN, two-stage detector, ROI pooling
  - 总结: 该工作被用来代表经典卷积检测器路线，说明过去十年的显著进展

- [AY-6] Shaoqing Ren, 2017
  - 标题: Faster r-cnn: Towards real-time object detection with region proposal networks
  - 关键词: YOLO, one-stage detector, real-time
  - 总结: YOLO被用作经典单阶段检测器的代表，说明卷积架构的广泛影响

- [AY-21] Hamid Rezatofighi, 2019
  - 标题: Generalized intersection over union: A metric and a loss for bounding box regression
  - 关键词: Faster R-CNN, region proposal, anchor-based
  - 总结: Faster R-CNN被用作anchor-based检测器的代表，与DETR的anchor-free方法形成对比



##### Component

- [AY-2] Nicolas Carion, 2020
  - 标题: End-to-end object detection with transformers
  - 关键词: DETR, transformer detector, set prediction
  - 总结: DETR是本文的直接基线，提出了基于Transformer的端到端检测框架，但存在训练收敛慢的问题

- [AY-18] Kaiming He, 2015
  - 标题: Delving deep into rectifiers: Surpassing human-level performance on imagenet classification
  - 关键词: ResNet, residual learning, backbone
  - 总结: ResNet是本文实验中使用的主干网络，提供基础特征提取能力

- [AY-12] Kaiming He, 2016
  - 标题: Deep residual learning for image recognition
  - 关键词: ResNet, deep residual, backbone
  - 总结: 该工作提出深度残差学习，是本文实验中ResNet-101骨干的基础

- [AY-19] Tsung-Yi Lin, 2020
  - 标题: Focal loss for dense object detection
  - 关键词: focal loss, class imbalance, dense detection
  - 总结: 该工作提出的focal loss在部分DETR变体中被使用，本文实验设置中也有涉及

- [AY-20] Ilya Loshchilov, 2018
  - 标题: Decoupled weight decay regularization
  - 关键词: AdamW, weight decay, optimizer
  - 总结: AdamW优化器是本文训练过程中使用的优化方法

- [AY-13] Peize Sun, 2021
  - 标题: Sparse r-cnn: End-to-end object detection with learnable proposals
  - 关键词: GIoU, bounding box regression, loss function
  - 总结: GIoU损失是DETR类方法中常用的边界框回归损失

- [AY-9] Yingming Wang, 2021
  - 标题: Anchor detr: Query design for transformer-based detector
  - 关键词: Transformer, self-attention, sequence modeling
  - 总结: Transformer是DETR和本文方法的核心架构，提供注意力计算机制



##### Contrast

- [AY-23] Xiyang Dai, 2021
  - 标题: Dynamic detr: End-to-end object detection with dynamic attention
  - 关键词: dynamic attention, ROI pooling, DETR variant
  - 总结: 该工作使用ROI池化进行特征提取，与本文的软交叉注意力方法形成对比

- [AY-7] Peng Gao, 2021
  - 标题: Fast convergence of detr with spatially modulated co-attention
  - 关键词: spatial modulation, co-attention, Gaussian prior
  - 总结: 该工作通过在交叉注意力中应用预定义高斯图加速训练，但未考虑目标尺度信息

- [AY-8] Depu Meng, 2021
  - 标题: Conditional detr for fast training convergence
  - 关键词: DETR analysis, cross-attention, convergence
  - 总结: 该工作分析了DETR慢收敛的原因，指出交叉注意力模块是主要问题

- [AY-5] Joseph Redmon, 2016
  - 标题: You only look once: Unified, real-time object detection
  - 关键词: conditional DETR, reference point, decoupled attention
  - 总结: Conditional DETR通过解耦注意力公式生成基于参考坐标的位置查询，是本文的直接对比基线

- [AY-14] Zhiqing Sun, 2020
  - 标题: Rethinking transformer-based set prediction for object detection
  - 关键词: Sparse R-CNN, learnable proposals, hard ROI align
  - 总结: Sparse R-CNN也直接学习锚框，但放弃了Transformer结构，使用硬ROI对齐进行特征提取

- [AY-15] Zhi Tian, 2019
  - 标题: Fcos: Fully convolutional one-stage object detection
  - 关键词: encoder-only, DETR analysis, convergence
  - 总结: 该工作指出交叉注意力模块是DETR慢收敛的主因，但通过移除解码器来加速训练

- [AY-17] Ashish Vaswani, 2017
  - 标题: Attention is all you need
  - 关键词: FCOS, anchor-free, one-stage
  - 总结: FCOS被用作anchor point检测器的代表，与anchor box方法形成对比

- [AY-11] Zhuyu Yao, 2021
  - 标题: Efficient detr: Improving end-to-end object detector with dense prior
  - 关键词: Anchor DETR, 2D anchor points, concurrent work
  - 总结: Anchor DETR是并发工作，也建议直接学习锚点，但忽略了锚框的宽高信息

- [AY-16] Xingyi Zhou, 2019
  - 标题: Objects as points
  - 关键词: Efficient DETR, dense prior, top-K selection
  - 总结: Efficient DETR引入密集预测模块选择top-K位置作为对象查询，将查询与位置信息关联

- [AY-10] Xizhou Zhu, 2021
  - 标题: Deformable detr: Deformable transformers for end-to-end object detection
  - 关键词: Deformable DETR, deformable attention, multi-scale
  - 总结: Deformable DETR引入4D锚框和可变形注意力，本文在此基础上提出DAB-Deformable-DETR变体



##### Dataset

- [AY-22] Tsung-Yi Lin, 2014
  - 标题: Microsoft coco: Common objects in context
  - 关键词: COCO, object detection dataset, benchmark
  - 总结: COCO是本文实验的标准数据集，用于训练和评估所有模型





#### 时间线分析

##### 早期
早期工作奠定了卷积检测器的基础（Fast R-CNN、YOLO、Faster R-CNN）以及Transformer架构的提出（Attention is All You Need）。ResNet的残差学习为后续检测器骨干网络提供了标准选择。这些工作建立了目标检测领域的主流卷积范式。


- [AY-4] Ross Girshick, 2015: Fast r-cnn

- [AY-18] Kaiming He, 2015: Delving deep into rectifiers: Surpassing human-level performance on imagenet classification

- [AY-12] Kaiming He, 2016: Deep residual learning for image recognition

- [AY-6] Shaoqing Ren, 2017: Faster r-cnn: Towards real-time object detection with region proposal networks

- [AY-21] Hamid Rezatofighi, 2019: Generalized intersection over union: A metric and a loss for bounding box regression

- [AY-9] Yingming Wang, 2021: Anchor detr: Query design for transformer-based detector




##### 中期
中期工作引入了anchor-free检测思想（FCOS、Objects as Points）以及DETR开创性的Transformer端到端检测范式。同时，GIoU损失、Focal Loss等改进边界回归和类别不平衡的技术被提出。Sun等人分析了DETR慢收敛的原因，为后续改进提供了分析基础。


- [AY-1] Alexey Bochkovskiy, 2020: Yolov4: Optimal speed and accuracy of object detection

- [AY-2] Nicolas Carion, 2020: End-to-end object detection with transformers

- [AY-22] Tsung-Yi Lin, 2014: Microsoft coco: Common objects in context

- [AY-19] Tsung-Yi Lin, 2020: Focal loss for dense object detection

- [AY-20] Ilya Loshchilov, 2018: Decoupled weight decay regularization

- [AY-8] Depu Meng, 2021: Conditional detr for fast training convergence

- [AY-13] Peize Sun, 2021: Sparse r-cnn: End-to-end object detection with learnable proposals

- [AY-15] Zhi Tian, 2019: Fcos: Fully convolutional one-stage object detection

- [AY-17] Ashish Vaswani, 2017: Attention is all you need




##### 近期
近期工作集中在DETR的快速收敛改进上，包括Conditional DETR的条件空间查询、Deformable DETR的可变形注意力、Anchor DETR的2D锚点学习、Sparse R-CNN的可学习提议、Dynamic DETR的动态注意力、SMCA的空间调制共注意力以及Efficient DETR的密集先验选择。这些工作都试图让DETR查询更明确地与空间位置关联。


- [AY-23] Xiyang Dai, 2021: Dynamic detr: End-to-end object detection with dynamic attention

- [AY-7] Peng Gao, 2021: Fast convergence of detr with spatially modulated co-attention

- [AY-3] Zheng Ge, 2021: Yolox: Exceeding yolo series in 2021

- [AY-5] Joseph Redmon, 2016: You only look once: Unified, real-time object detection

- [AY-14] Zhiqing Sun, 2020: Rethinking transformer-based set prediction for object detection

- [AY-11] Zhuyu Yao, 2021: Efficient detr: Improving end-to-end object detector with dense prior

- [AY-16] Xingyi Zhou, 2019: Objects as points

- [AY-10] Xizhou Zhu, 2021: Deformable detr: Deformable transformers for end-to-end object detection

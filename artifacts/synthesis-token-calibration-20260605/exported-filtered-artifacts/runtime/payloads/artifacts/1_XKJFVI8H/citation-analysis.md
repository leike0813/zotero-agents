#### 总体总结
本文在引言与相关工作部分先通过早期极坐标变换和U-Net架构工作铺出技术背景，再把直接应用于主动脉分割的3D U-Net和级联网络路线并置比较，最后借极坐标变换网络和数据增强工作的对比把本文的两阶段方法路线明确出来。


#### 关键文献

- [1] Bencevic, M., 2021: Training on Polar Image Transformations Improves Biomedical Image Segmentation (Component)

- [6] Esteves, C., 2018: Polar Transformer Networks (Contrast)



#### 范围
- 章节: I. INTRODUCTION + A. Related work
- 行号: 19-39

#### 按功能归类


##### Component

- [1] Bencevic, M., 2021
  - 标题: Training on Polar Image Transformations Improves Biomedical Image Segmentation
  - 关键词: polar transform, biomedical segmentation, direct predecessor
  - 总结: 该工作是本文方法的直接前身，本文在其基础上增加了对多连通分量的支持，通过分别变换每个对象并融合分割结果。



##### Background

- [2] Fantazzini, A., 2020
  - 标题: 3D Automatic Segmentation of Aortic Computed Tomography Angiography Combining Multi-View 2D Convolutional Neural Networks
  - 关键词: aorta segmentation, cascade U-Net, existing method
  - 总结: 该工作被用来展示现有主动脉分割方法的技术路线，作为本文方法的对比基线。

- [3] Yu, Y., 2021
  - 标题: A Three-Dimensional Deep Convolutional Neural Network for Automatic Segmentation and Diameter Measurement of Type B Aortic Dissection
  - 关键词: 3D U-Net, aortic dissection, existing approach
  - 总结: 该工作被用来展示3D U-Net架构在主动脉分割中的应用，作为现有方法的一种代表。

- [4] Chen, D., 2021
  - 标题: Multi-stage learning for segmentation of aortic dissections using a prior aortic anatomy simplification
  - 关键词: multi-stage learning, aortic dissection, existing approach
  - 总结: 该工作被用来说明现有主动脉分割方法的多样性，作为技术背景的一部分。

- [5] Liu, Q., 2019
  - 标题: DDNet: Cartesian-polar Dual-domain Network for the Joint Optic Disc and Cup Segmentation
  - 关键词: polar transform, medical imaging, prior work
  - 总结: 该工作被用来追溯极坐标变换在医学图像分割中的应用历史，作为技术背景。



##### Contrast

- [6] Esteves, C., 2018
  - 标题: Polar Transformer Networks
  - 关键词: polar transformer, end-to-end, contrast
  - 总结: 该工作被用来与本文方法进行对比，说明本文采用两阶段网络而非端到端架构，更易于适配现有方法。

- [7] Salehinejad, H., 2018
  - 标题: Image Augmentation Using Radial Transform for Training Deep Neural Networks
  - 关键词: radial transform, data augmentation, contrast
  - 总结: 该工作被用来对比不同的预测融合策略，说明本文采用逐对象加权和迟滞阈值化而非多数投票。

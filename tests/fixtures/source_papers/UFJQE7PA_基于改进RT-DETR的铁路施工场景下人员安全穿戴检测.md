文章编号: ( )

# 1001-8360 2025 02-0092-10基 于 改 进 RT - DETR 的 铁 路 施 工 场 景 下 人 员 安 全穿戴检测

冯 爽 ，王万齐 ，杨 文 ，胡 昊

1 2 2 2(  中国铁道科学研究院 研究生部，北京 ;  中国铁道科学研究院集团有限公司电子计算技术研究所，北京 )

摘 要: 针对铁路施工环境较复杂，安全穿戴目标较小难以检测，边缘计算设备资源有限的问题，提出一种基于改进  的铁路施工场景下人员安全穿戴检测模型。 首先，引用轻量级  作为特征提取网络，通过级联分组注意力，解决多头自注意力计算冗余问题，提高注意力头的多样性。 其次，采用 下采样模块，应用  小波变换保留更多细节信息来改善错检问题，通过将特征图切分再进行卷积的方式减少卷积操作的参数量，进一步降低模型复杂度，精度维持原来相近水平。 最后，设计一种新的损失函数 ，在加速边界框回归速度的同时提高模型检测的泛化能力。 实验结果表明，改进模型精确率为 ，召回率为 ，平均精度均值为 ，与基准模型相比分别提高 、 和 ; 模型大小为 ，参数量为 万个，为 ，与基准模型相比分别降低 、 和 ;  为 ，提高了 。 提出的模型能够满足铁路施工场景下对检测精度和轻量化的需求。

关键词: 铁路施工; 目标检测; ; 轻量化网络模型

中图分类号: ;  文献标志码: :

# Safety Wear Detection for Personnel in Railway Construction Scenarios Based on Improved RT-DETR

FENG Shuang1，WANG Wanqi²,YANG Wen²,HU Hao²1 2 2 2( ， ， ， ; ，FENG Shuang WANG Wanqi YANG Wen HU Hao， ， )

Abstract: Wearing reflective clothing and helmet is an important guarantee for the life safety of workers in the construc-tion scenes. In order to solve the problems of complex railway construction environment，small safety wear targets that are diffcult to detect，and limited edge computing equipment resources，an improved RT-DETR personnel safety wear detec-tion model for railway construction scenes was proposed. Firstly，the lightweight network EffcientViT was cited as the model backbone feature extraction network to solve the computational redundancy problem of multi-head self-attention through cascaded group attention，and improve the diversity of attention heads. Secondly，the HWD-ADown module was used to replace the subsampling module in the original RT-DETR.The Haar wavelet transform was applied to retain more details to improve the error detection problem. The number of parameters in subsampling was reduced by segmental con-volution of feature graphs , further reducing the model complexity while maintaining the accuracy close to the original lev-el.Finally，a new loss function was designed，which combined the Inner-IoU idea with DIoU to accelerate the bounding box regression speed and improve the generalization ability of model detection.The results show that the improved model achieves an accuracy rate of 92.6% ，a recall rate of 84.4% ，and an average accuracy of 90%， which are 2.7% , 2.1% and 3% higher than the benchmark model，respectively. The results show that the improved model achieves an accuracy rate of 92.6%, a recall rate of 84.4%，and an average accuracy of 90%，which are 2.7%,2.1% and 3% higher than

2 RT -DETR  ，         ，    ，$\mathrm { G F L O P s }$ ，   ，         ，  (ond) is 94.3，an improvement of 34.7%. The improved model can meet the requirements of detection accuracy andlightweight in railway construction scenarios.

Key words:  ;  ; ;

在现阶段铁路网高质量建设的时期，铁路工地施工安全愈发重要［］。 在施工管理中，人员安全穿戴能够很大程度降低安全风险，安全帽可以有效降低高空坠物造成的人员伤亡，反光衣可以提醒施工车辆及时发现避让人员，显著减少因视线不佳导致的意外伤害。因此，工地安全管理条例中明确规定，施工人员在施工场地需要佩戴安全帽、身着反光衣等，但是工作人员不完全遵守规定的情况时有发生，给个人和施工环境带来极大的安全隐患。 目前在铁路施工中，主要依靠管理人员在各个施工作业面对不安全行为进行巡查，但这种传统方式工作量大、效率低、时效性差，无法做到及时发现问题并处置。 近年来，视频监控系统已经在全国各地的施工现场普及应用，几乎做到全面覆盖，并且随着深度学习网络模型的快速发展和落地应用，使得采用视频图像检测技术识别不安全行为成为可能［］。 在迈向智能化、工业化的大背景下，使用智能分析技术替代传统的人工检查，既能提高现场安全性，又能节省人力成本，并为我国 “智慧工地”奠定发展基础 。

目前，国内外很多学者已经对安全帽和反光衣检测做了大量研究，取得了一系列科研进展。 曹燕［］提出一种基于改进  的建筑工人安全帽检测方法，但针对小目标出现了漏检和检测效果不稳定的问题。 黄志清等［］提出一种基于改进  的安全帽4检测算法，通过深度超参数化卷积加强检测目标的特征纹理，再通过过滤、加强或抑制特征图像素点进行精确检测，但该模型仅针对室内场景，在室外复杂场景下仍存在错检。 张学立等［］提出一种安全帽与反光衣5的轻量化检测方法，在 的基础上，用更轻量化的  和  模块替代部分卷积和  模块来减少参数量，降低模型的复杂度，但是并未考虑实际施工场景中复杂天气、低照度场景对检测网络效果的影响。 等［］提出一种基于 的反光衣检测方法，通过改进后处理阶段的非极大值抑制操作解决检测中密集目标漏检问题，但是由于模型结构复杂，难以部署到边缘设备上。 李天宇等［］针对安全帽目7标小、易受环境因素影响造成误检漏检等问题，提出一种基于改进  的安全帽佩戴检测方法，通过多尺度池化、分层卷积和 注意力模块提高算法检测率，但是模型参数量较大，导致算法部署到边缘设备同样面临严峻挑战。

基于上述分析，目前在铁路工程施工场景下针对安全帽和反光衣进行目标检测仍存在以下三点难题:

) 摄像头布设位置较高较远，导致安全帽、反光衣目标较小难以检测。

) 隧道等低照度的施工场景，易出现误报漏报问题 。

) 在实际应用中算法需要部署在边缘计算设备上，模型需要更小的计算量和存储需求。

3现有研究主要基于 ［ ］ 系列算法进行改8-11进，在工业界使用较多的  系列虽然能够做到实时检测，但是仍需要生成大量候选框和进行非极大值抑制［ ］这些后处理操作，难以优化且不够鲁棒，导致12检测 器 的 速 度 存 在 延 迟 。 ［ ］ 是 第 一 个 基 于13［ ］的端到端算法，通过匈牙利匹配算法完14成预测框与真实框的匹配，避免了非极大值抑制的后Transformer处理操作。 在此基础上 ［ ］实时端到端算法被提出，成功地将  扩展到实时检测场景中。 因此，基于铁路施工检测场景实时性的需求，本文选用作为基准框架网络。

铁路施工项目线路长、工地分布范围广、监控点位众多，视频数据量大且带宽受限，无法满足集中智能分析条件，算法需要部署在边缘计算设备上进行云边协同分析，但是边缘计算设备算力有限，如何将算法轻量化部署是铁路施工应用中需要解决的问题［ ］，因此本文所提方法主要从轻量化层面进行了目标检测的研究。

针对上述问题，本文对  模型进行如下改进工作:

) 使用轻量化网络模型  替换原有主干网络进行特征提取，降低特征提取网络的参数量和计算量，减小模型体积。

) 提出一种轻量级的  模块代替原中的下采样模块，应用  小波变换保留更多的边界、纹理和细节信息，改善错检的问题，通过分块操作，减少卷积操作的参数量。

) 将  思想与  损失函数相结合，在加速边界框回归速度的同时提高模型检测的精确度和泛化能力。 在保证检测精度提高的前提下，显著减少参数量，提高检测速度，减少对硬件性能的依赖度，提升施工现场的安全管理水平。

## 1 改进的 RT-DETR 模型

模型由一个主干网络、一个混合编码器和一个带有辅助预测头的  解码器组成。利用主干网络的最后三个阶段的输出特性作为编码器的输入。 编码器通过尺度内特征交互模块(， ) 和 跨 尺 度 融合，将多尺度特征转换为一系列图像特征。 然后使用基于  感知的查询选择模块，从编码器输出序列中选择固定数量的图像特征，作为解码器的初始对象查询。 最后，利用具有辅助预测头的解码器迭代优化对象查询以生成检测框和置信度分数。

本文基于上述  模型的结构，使用轻量化网络模型 作为主干网络进行特征提取，应用轻量级的  模块进行下采样，并使用作为损失函数，以达到边缘计算盒子设备的部署要求和施工作业现场对实时性和准确率的要求。改进后的 模型结构见图 。

![](Images_GPC8ZI86/f3ef216b4763d19d7a4c1ec3ca3c14f4fac96f04f812dbd449cba8dc3f2fb552.jpg)  
图  改进后的  模型结构

## 1. 1 EfficientViT 主干网络轻量化

在目标检测任务中，主干特征提取网络的选择尤为重要，它负责从输入图像中提取特征，用于后续的检测任务，良好的特征提取网络可以明显提升算法的性能表现。 在铁路施工监控场景下，算法需要部署在资源有限的边缘计算设备上，因此在保持良好性能的同时，还需要降低模型计算量和存储需求。

出于对铁路施工工程中智能分析算法部署应用经济性的考量，本文对主干特征提取网络进行轻量化改进,引用 EfficientViT(memory efficient vision transformer-DETR   ) ［ ］这一轻量级多尺度注意力模型，提升计算速度和内存效率。 它采用一种“三明 治 ” 布局的新构建块和级联分组注意力(   ， ) 机制，可以减少内存访问时间和计算冗余，并提高模型计算效率和性能。整体架构分为三个阶段，每个阶段包含若干个，随着阶段数的增加，特征图的维度减小，通道数增加，H 和 W 分别表示输入图像的高度和宽度，整体架构见图 。

![](Images_GPC8ZI86/71e4bb8af77beda68801fc5c9c4df3d344fa28fa52584ce2efda617106d5b48f.jpg)  
图   整体架构

2 Effici三明治布局是在前馈神经网络 (， ) 层 $\boldsymbol { \varPhi } _ { i } ^ { \mathrm { F } }$ 之间设置一个自注意力层$\boldsymbol { \varPhi } _ { i } ^ { \mathrm { A } }$ ，可表示为

$$
X _ { i + 1 } = \prod ^ { N } \phi _ { i } ^ { \mathrm { \scriptscriptstyle P } } \{ \phi _ { i } ^ { \mathrm { \scriptscriptstyle A } } \{  \prod ^ { N } \phi _ { i } ^ { \mathrm { \scriptscriptstyle P } } ( X _ { i } ) \} \}\tag{}
$$

式中: $X _ { i }$ 1为第 i 个  的完整输入特征，在单个自注意力层的前后，有 N 个  层进行处理。内存访问开销是影响模型速度的关键因素之一，自注

T意力层中元素加法、归一化等操作，需要跨不同存储单元进行访问，导致内存访问效率低下。 因此，三明治布局通过采用较少内存效率低的自注意力层，并采用更多内存效率高的全连接前馈网络层实现不同特征通道之间的通信，提高模型运算速度，见图 。

使用级联分组注意力机制可以解决多头自注意力中的计算冗余问题。 在多头自注意力中，每个注意力头都进行相同任务导致计算冗余，而级联分组注意力

![](Images_GPC8ZI86/43cdd87a5090187b4aefa3783f9bb5fd13e2c4162226bde41af5159d0a8ea241.jpg)  
图 三明治布局结构

3机制让每个注意力头专注于不同的特征来解决这一问题，提高了注意力头的多样性。 每个注意力头在注意力图计算中使用更小的  通道维度，因此可以在不引入额外参数的情况下通过增加网络深度来提高模型的容量，并且不会产生较多的延迟开销，结构见图 。图  中 V 为单个输入特征的向量; Q、 K 为 计 算权重的特征向量。

![](Images_GPC8ZI86/64e23433e82ec57498fe043df0410e781da0e5f9c23c8aee124ce871845ef65a.jpg)  
图  级联分组注意力机制结构

## 41. 2 HWD-ADown 下采样模块

在隧道施工等光线较暗，背景复杂，包括各种机械设备、支护结构、电缆的环境中，安全帽和反光衣可能会与周围背景或物体极为相似，检测时易出现错检的情况。 为改善这一状况，设计  模块进行特征提取和下采样操作，在后续的检测任务中可以更好地捕捉安全帽、安全衣这些小目标的特征，并进一步使模型轻量化。

在局部邻域上池化特征可能会导致重要空间信息的丢失，因此模块首先使用 ，它应用 小波变换来降低特征图的空间分辨率，可以保留更多的边界、纹理和细节信息，改善因安全帽和反光衣与周围背景相似而易错检的问题。 模块由无损特征编码块和特征表示学习块组成，无损特征编码块负责特征的转换和空间分辨率的降低，特征表示学习块由标准卷积层、批处理归一化层和  激活层组成，用来提取特征。 结构见图 。

![](Images_GPC8ZI86/199402e18023ef3acc3398b46dd7fe8c7c04ebda32d899ef306c21c415f85433.jpg)  
图   结 构

5 HWD然后，将输入张量沿着通道数维度切分为两个块再进行卷积操作，可以减少卷积操作的参数量和计算量，进一步使模型轻量化，并且能更好地捕捉不同位置的特征。 在其中一个块上进行池化操作，可以进一步降低特征图的尺寸，保留池化窗口内的最大激活值，提高特征图的空间分辨率。 最后，将经过上述操作得到的多个特征图沿着通道维度进行拼接，形成一个新的特征图，使模型综合学习不同尺度和不同位置的特征，提高模型的泛化能力和鲁棒性。 这种下采样模块的设计策略可以增强特征图的对比度，同时降低模型计算量和参数量，有助于提高模型的性能。下采样模块结构见图 。  ［B，C，H，W中，B 为批量大小，C 为输入矩阵的通道数，H 为输入矩阵的高，W 为输入矩阵的宽;  为卷积操作，通过卷积核运算提取图像特征; k 为卷积核大小( k  n 表示n n 的卷积核) ; s 为步幅，表示卷积核在输入特征上移动的步长; p 为填充，表示在输入特征图的边界上添加的零填充的数量，其作用是控制输出特征图的尺寸 。

## 1. 3 结合 Inner-IoU 思想和 DIoU 的损失函数

边界框回归是目标检测任务中定位安全衣、安全帽等小目标的关键步骤。 基线算法使用 ［ ］计算边界框的回归损失，但当预测框和目标框不重叠的时候， 损失会通过增加预测框的大小使其与目标框重叠，之后  退化为 IoU 损失，因此导致边界框回归速度缓慢。 而 ［ ］使用距离度量损失，当预测框和目标框不重叠时，通过直接最小化预测框和目标框的中心距离使得预测框向目标框移动，从而加快边

![](Images_GPC8ZI86/ccea8f4fb0b4f908ba69a3813c888e882b07ce586131706a3e9d8593aa765087.jpg)  
图   下采样模块结构

6 HWD-ADown界框损失的收敛速度。 损失函数 $L _ { \mathrm { { D I o } } \mathrm { { t } } }$ 的定义为

$$
L _ { _ \mathrm { D I o U } } = 1 - I o U + \frac { \rho ^ { 2 } ( \textit { b } , \boldsymbol { b } ^ { \mathrm { g t } } ) } { c ^ { 2 } }\tag{}
$$

式中: b 和 $b ^ { \mathrm { g t } }$ 1 2分别为预测框和目标框的中心点; $\rho$ 2为两gt个中心点间的欧氏距离; c 为可以同时覆盖预测框和目标框的最小矩形的对角线距离。

但是仅通过添加损失项来加速收敛，忽略了 $I o U$ 损失项本身的局限性，它虽然可以有效描述边界框回归的状态，但在实际应用中，无法根据不同的检测任务进行自适应调整，泛化能力较弱，对于安全帽、反光衣等密集小目标及铁路施工复杂环境多尺度情况下检测效率和准确率较低。

因此，本文在 的基础上引入 ［ ］损20失思想替换原有的损失函数。 通过缩放因子比控制用于计算损失的辅助边界框的尺度大小。 对于高 IoU 的样本，使用较小的辅助边界框计算损失能够加速收敛，对于低 IoU 样本则更适用于使用较大的辅助边界框。 定义为

$$
I o U ^ { \mathrm { { i n n e r } } } = \frac { i n t e r } { u n i o n }\tag{}
$$

$$
u n i o n = \left( \begin{array} { l l } { w ^ { \mathrm { g t } } \bullet h ^ { \mathrm { g t } } } \end{array} \right) \ \cdot r a t i o ^ { 2 } \ + \ \left( \begin{array} { l l } { w \bullet h } \end{array} \right) .
$$

$$
r a t i o ^ { 2 } - i n t e r\tag{}
$$

$$
i n t e r = \ \left[ \mathrm { { h i n } } { \left( \ b _ { \mathrm { r } } ^ { \mathrm { g t } } , \pmb { b } _ { \mathrm { r } } \right) } - \mathrm { { m a x } } { \left( \ b _ { \mathrm { l } } ^ { \mathrm { g t } } , \pmb { b } _ { \mathrm { l } } \right) } \right] \ .
$$

$$
\begin{array}{c} \mathrm { \small { ~ [ \operatorname* { m i n } _ { \omega _ { \mathrm { b } } ^ { \mathrm { g t } } } , \boldsymbol { b } _ { \mathrm { b } } ] ~ - \ m a x ( \omega _ { \mathrm { b } } ^ { \mathrm { g t } } , \boldsymbol { b } _ { \mathrm { t } } ) ~ } } \end{array} ]\tag{4 (}
$$

$$
b _ { \mathrm { l } } ^ { \mathrm { g t } } = x _ { \mathrm { c } } ^ { \mathrm { g t } } - \frac { w ^ { \mathrm { g t } } \bullet r a t i o } { 2 } b _ { \mathrm { r } } ^ { \mathrm { g t } } = x _ { \mathrm { c } } ^ { \mathrm { g t } } + \frac { w ^ { \mathrm { g t } } \bullet r a t i o } { 2 }\tag{5(}
$$

$$
b _ { \mathrm { t } } ^ { \mathrm { g t } } = y _ { \mathrm { c } } ^ { \mathrm { g t } } - \frac { h ^ { g t } \bullet r a t i o } { 2 } b _ { \mathrm { b } } ^ { \mathrm { g t } } = y _ { \mathrm { c } } ^ { \mathrm { g t } } + \frac { h ^ { \mathrm { g t } } \bullet r a t i o } { 2 }\tag{6(}
$$

$$
b _ { \mathrm { { l } } } = x _ { \mathrm { { c } } } - { \frac { w \ { \bullet } \ r a t i o } { 2 } } \quad b _ { \mathrm { { r } } } = x _ { \mathrm { { c } } } + { \frac { w \ { \bullet } \ r a t i o } { 2 } }\tag{7(}
$$

$$
b _ { \mathrm { t } } = y _ { \mathrm { c } } - { \frac { h \cdot r a t i o } { 2 } } b _ { \mathrm { b } } = y _ { \mathrm { c } } + { \frac { h \cdot r a t i o } { 2 } }\tag{}
$$

式中: $( \ v x _ { \mathrm { c } } ^ { \mathrm { g t } } , \ v y _ { \mathrm { c } } ^ { \mathrm { g t } } )$ 为目标框的中心点; $( \ v { x } _ { \mathrm { c } } , \ v { y } )$ 9为预测框c的中心点; $w ^ { \mathrm { g t } }$ 和 $h ^ { \mathrm { g t } }$ c c分别为目标框的宽度和高度; w和h分别为预测框的宽度和高度; ratio 为缩放因子，取值范围为［ ， ］; b  和 $b _ { \mathrm { r } } ^ { \mathrm { g t } }$ 为真实值的左边界和右边界;$b _ { \mathrm { t } } ^ { \mathrm { g t } }$ 和 $b _ { \mathrm { b } } ^ { \mathrm { g t } }$ l r为真实框的上边界和下边界; $b _ { \mathrm { l } }$ 和 $b _ { \mathrm { r } }$ 为预测框t b的左边界和右边界; $b _ { \mathrm { t } }$ 和 $b _ { \mathrm { b } }$ l r为预测框的上边界和下边t b界。 当 ratio 值小于  时，辅助边界框的值小于实际边界框，回归的有效范围小于 $I o U$ 损失，但梯度的绝对值大于 $I o U$ 损失的梯度，能够加速高 $I o U$ 样本的收敛; 当ratio 值大于 时，较大的辅助边界框可以扩大回归的有效范围，有助于低 $I o U$ 样本的回归。

将 与 结合不仅能加速边界框回归速度、提升检测效果，还能够提高模型的泛化能力，损失函数的定义为

$$
L _ { \mathrm { { I n n e r - D I o U } } } = L _ { \mathrm { { D I o U } } } + I o U - I o U ^ { \mathrm { { i n n e r } } }\tag{}
$$

## 2 实验说明

## 2.1 实验环境及参数设置

本文模型训练和性能评价实验在服务器上完成，使用  操 作 系 统，中央处理器型号为( ) ( ) ， 采 用 $\mathrm { G e - }$ ， 版本为  。 深度学习框架选用 ，设置训练轮次 epoch  ，批量大小batch  ，设置网络初始学习率为   ，使 用优化器进行优化，输入的图片尺寸大小统一缩放为 。

## 2. 2 数据集

本文在研究过程中所使用的数据集共分为两部分，一部分通过施工现场搜集得到，一部分通过网络搜集公开数据集得到。 通过调取铁路施工现场的视频监控，逐帧截取获得铁路施工视频图片，对获取的视频图像进行去噪、数据增强等预处理操作后，使用软件进行人工标注。 需要说明的是目前项目主要集中在川渝地区，该地区的铁路施工场景以隧道为主，并且与开阔路基的施工场景相比，隧道施工环境更为复杂，照明度更低，对检测算法来讲难度更大，因此铁路施工现场数据集中以隧道施工场景为主。 为了扩充其他施工场景，增加算法的鲁棒性，也在数据集中补充了国内外面向施工现场物体识别的公开数据集，如面向施工现场物体识别的大规模图像数据集 、安全帽佩戴检测数据集  等。 最终得到   张图片作为实验的总数据集，按照    的比例划分训练集和测试集。 铁路施工现场数据集示例见图 ，补充的公开数据集示例见图 。

![](Images_GPC8ZI86/dbcf76f76628ed459802fb18c8cb088bd94fcd35bb3e344fd9f97c0dc8e083f3.jpg)

![](Images_GPC8ZI86/9aa31a0729b260ec210b4a9f8f3f1d94ef7c6c68e814c00294090bcc90f48017.jpg)

![](Images_GPC8ZI86/592c3da6b462938b58bac9937cf4d062272623d99881ace9f96f0de72142d9a8.jpg)

![](Images_GPC8ZI86/a179903c6bb714f90096ce22efc40017fb8c7f1b04738fceb3eefaf4de8c34ee.jpg)

![](Images_GPC8ZI86/5d0d3f1e74d9fbcb6f08ddeecf413177cebbdc67d49000dc68373a6174538742.jpg)

![](Images_GPC8ZI86/0f7254784a947cfdfe8d97563cf8d695f126d6826b7f67a3b90ef2fc5bc02c6c.jpg)

![](Images_GPC8ZI86/89b7acd071033d42b961f7ddb4693ed4c3845914421657bf780fa384849fc92a.jpg)

![](Images_GPC8ZI86/f46fe79819b275592db55c1e3d7a167d70fd08c8ca2161a3cb6d980f829ab3e7.jpg)  
图  铁路施工现场数据集示例

![](Images_GPC8ZI86/02fd82cc23b7b8c0f9b28349ec2f0162542436154d89d9ada356e6f440c3361e.jpg)

![](Images_GPC8ZI86/8334efb07a557b21c20b06e9308d442edf477811da032cbea56bf5e5db12ee11.jpg)

![](Images_GPC8ZI86/fe002444457979daa75a82f1a5fdaf732cd4ce460b5fee7ea07135c4785a23ca.jpg)

![](Images_GPC8ZI86/7210771ae9ec127ac935b501107ebaa0b47a315caa08f05e580285026484b87f.jpg)

![](Images_GPC8ZI86/0b8354328b35e3d19a79f36c74ec1aa317fe3f1fcb2313ab98852847ec15ab2d.jpg)

![](Images_GPC8ZI86/92a9ddb919126f92592bb779bb2ee0873aa5b2a0926335195ed82b3e94b80ec5.jpg)  
图  公开数据集示例

8目标检测的类别共分为  类，类别与标签对应关系如表 所示。

表 1 类别与标签对应关系
<table><tr><td>标签编号</td><td>标签名称</td><td>含义</td></tr><tr><td>0</td><td>helmet</td><td>戴安全帽的头部</td></tr><tr><td>1</td><td>no_helmet</td><td>未戴安全帽的头部</td></tr><tr><td>2</td><td>vest</td><td>反光衣</td></tr><tr><td>3</td><td>person</td><td>人</td></tr></table>

## 3 实验结果

## 3. 1 评价指标

## 3. 1. 1 评价模型检测准确度

本文选用精确率、召回率、平均精度均值作为评价模型检测精度提升效果的指标。 三项指标的值越高表示模型检测的准确度越高，检测效果越好。

精确率 P ( ) : 表示在给出的所有正样本中，模型正确预测的结果所占的比例，计算式为

$$
P = { \frac { T P } { T P + F P } }\tag{}
$$

11召回率 R ( ) : 表示在给出的所有预测结果中，模型正确预测的结果所占的比例，计算式为

$$
R = { \frac { T P } { T P + F N } }\tag{}
$$

平均精度均值 $m A P$ 12(   ) : AP为某个类别在不同召回率下精确率的平均值，mAP 为所有类别 $A P$ 的均值，计算式分别为

$$
A P = \int _ { 0 } ^ { 1 } P \ l ( \ R ) \ \mathrm { d } R\tag{}
$$

$$
m A P = { \frac { 1 } { | \mathbf { \nabla } n _ { \mathrm { { c } } } | } } \sum _ { i = 1 } ^ { n _ { \mathrm { { c } } } } A P _ { i }\tag{13(}
$$

式中: $T P$ 1c 1为预测正确的正样本数量; $F P$ 14为预测错误的正样本数量; FN 为预测错误的负样本数量; $n _ { \mathrm { c } }$ 为类别的数量。

## 3. 1. 2 评价模型轻量化程度

选用每秒检测帧数  (   ) 评估模型检测速度。 表示每秒可以检测的图片帧数，数值越大代表模型检测速度越快，实时性能越强。

选用 、模型大小、模型参数量反应模型轻量化程度，这些值越小则代表模型轻量化程度越高，对硬件性能要求就越低。 其中  是指模型在执行一次前向传播过程中总共需要执行的十亿次浮点运算的数量，它可以比较不同模型之间的计算复杂度的大小， 越大说明模型越复杂，能够吞吐更多的数据量，但要求更大的硬件资源; 而  值较小的模型则表示计算需求较低，更加高效和轻量，本文模型需要部署在资源有限的边缘计算设备，所以低的检测模型更适合使用。

## 3. 2 实验结果分析

在 的基础上提出三个改进点: 使用轻量化主干网络 、 下采样模块和损失函数，为方便表示和说明，将在基准模型  上逐步添加改进点的三个模型分别命名为 、 和 。

## 3. 2. 1 轻量化主干网络对模型参数的影响

轻量化主干可以减少网络结构的参数量和计算量，使其能高效运行在计算资源受限的设备上。 为探究不同轻量化网络对模型大小和检测性能的影响，实验选用  ［ ］ 、  ［ ］和三种常见的轻量化网络替换 中使用的进行对比，检测结果如表  所示。

表 2 不同轻量化主干网络下的检测结果
<table><tr><td>主干网络</td><td>P1%</td><td>R/%</td><td>mAP50/%</td><td>模型大 小/MB</td><td>参数 量/万</td><td>GFLOPs</td></tr><tr><td>ResNet18</td><td>89.9</td><td>82.3</td><td>87.0</td><td>38.6</td><td>1988.8</td><td>57.2</td></tr><tr><td>ShuffleNetV1</td><td>91.2</td><td>85.0</td><td>89.4</td><td>33.6</td><td>1 665.2</td><td>37.4</td></tr><tr><td>MobileNetV1</td><td>91.2</td><td>84.5</td><td>89.2</td><td>23.8</td><td>1 243.1</td><td>35.0</td></tr><tr><td>EfficientViT</td><td>92.1</td><td>85.0</td><td>89.5</td><td>22.6</td><td>1070.7</td><td>27.2</td></tr></table>

注: mAP 代表 IoU 阈值为   时，模型的平均精度，以下同。

使 用  主 干 网 络 使 模 型 大 小 减 小，参数量减少  万个， 降低 ，检测精度提高 。 使用 主干网络使模型大小减小   ，参数量减少   万个，降低  ，检测精度提高  。 使用  主干网络使模型大小减小 ，参数量减少  万个， 降低 ，检测精度提高  。 由此可以看出，使用轻量化主干网络后，模型大小、 参数量和均有减小，且检测精度都有所提升，其中本文模型使用的 使模型轻量化程度最高，检测精度提升效果最明显。

## 3.2. 2 下采样模块对模型参数的影响

为了探究不同下采样模块对模型大小和检测性能的影响，在 的基础上分别使用和  作为下采样模块进行对比测试，检测结果如表  所示。

表 3 不同下采样下的检测结果
<table><tr><td>下采样 模块</td><td>mAP50/ %</td><td>模型大 小/MB</td><td>参数 量/万</td><td>GFLOPs</td><td>FPS</td></tr><tr><td>Conv</td><td>89.5</td><td>22.6</td><td>1070.7</td><td>27.2</td><td>89.9</td></tr><tr><td>Context-Guided-Block</td><td>89.4</td><td>23.2</td><td>1130.0</td><td>29.2</td><td>93.7</td></tr><tr><td>HWD-ADown</td><td>89.5</td><td>19.9</td><td>985.6</td><td>25.5</td><td>94.2</td></tr></table>

使用    替换  使用的普通卷积做下采样模块后，提高了模型的检测速度，但模型检测精度略有下降，模型大小增加   ，参数量增加万， 增 加 。 而使用本文下采样模块

47 后，使得模型进一步提高了轻量化程度，模型 大 小 下 降 至  ，参 数 量 减 少  万，降低至  ，同时还提高了模型的检测速度，提高  ，精度维持原来相近水平。

## 3. 2. 3 损失函数对模型参数的影响

损失函数指导模型学习过程中的优化方向，优秀适宜的损失函数可以提升模型的学习能力和泛化能力。 为了探究不同的损失函数对检测性能的影响，在的基础上，分别使用 、 、损失函数进行测试，检测结果如表  所示。

表 4 不同损失函数下的检测结果
<table><tr><td rowspan="2">损失函数</td><td colspan="5">mAP50/%</td></tr><tr><td>all</td><td>helmet</td><td>no_helmet</td><td>vest</td><td>person</td></tr><tr><td>GIoU</td><td>89.5</td><td>94.2</td><td>85.7</td><td>94.9</td><td>94.8</td></tr><tr><td>Inner-GloU</td><td>89.6</td><td>94.5</td><td>86.1</td><td>95.0</td><td>94.4</td></tr><tr><td>Inner-SIoU</td><td>89.7</td><td>94.3</td><td>86.6</td><td>95.1</td><td>95.0</td></tr><tr><td>Inner-DIoU</td><td>90.0</td><td>94.8</td><td>86.5</td><td>95.1</td><td>94.9</td></tr></table>

通过与  原损失函数  进行对比可以看出，将 思想分别与 、 、 结合后的损失函数都对模型产生了精度上的改善，平均精度均值分别 提 升 了  、 、 ，其中本文使用的对模型精度的提升最为明显，对各个类别的平均精度均值均有提升， 类提升  ，类提升  ， 类提升  ， 类提升  。

## 3. 2. 4 消融实验

本文模型结构框架的改进基于  模型，为验证提出的三种改进策略的有效性，对基准模型进行了消融实验，消融实验结果如表 所示。

使 用 轻 量 化 网 络  代 替 原 主 干 网 络后，模型大小下降明显，内存占用空间降低，参数量下降  ，浮点运算量下降  ，模型  上升  ，同时模型检测精度  也提高了   个百分点。 在跨尺度特征融合模块中使用轻量化下采样模块  模块后，进一步将内存占用空间降低到   ， 降低到  ， 提高到  ，但检测精度略有下降，降低   个百分点。最后，加入  损失函数后，模型检测精度提升了  。 模型每秒检测帧数大于铁路综合视频码流

表 5 消融实验检测结果
<table><tr><td>模型</td><td>EfficientViT</td><td>ADown</td><td>Inner-DIoU</td><td>P1%</td><td>R1%</td><td>mAP50/%</td><td>模型大小/MB</td><td>参数量/万</td><td>GFLOPs</td><td>FPS</td></tr><tr><td>RT-DETR</td><td>×</td><td>×</td><td>×</td><td>89.9</td><td>82.3</td><td>87.0</td><td>38.6</td><td>1988.8</td><td>57.2</td><td>70.0</td></tr><tr><td>E</td><td>√</td><td>×</td><td>×</td><td>92.1</td><td>85.0</td><td>89.5</td><td>22.6</td><td>1070.7</td><td>27.2</td><td>89.9</td></tr><tr><td>EA</td><td>√</td><td>√</td><td>×</td><td>92.1</td><td>84.1</td><td>89.1</td><td>19.9</td><td>985.6</td><td>25.5</td><td>94.2</td></tr><tr><td>EAI</td><td>√</td><td>√</td><td>√</td><td>92.6</td><td>84.4</td><td>90.0</td><td>19.9</td><td>985.6</td><td>25.5</td><td>94.3</td></tr></table>

2 RT-DETR 帧 ，可以保证视频流的实时检测。 与基准模型相比，改进后的模型精确率提升  ，召回率提升  ，mAP 提升 ，模型大小减少  ，参数量减少  ， 下降  ，在检测速度上每秒检测帧数提高了 ，同时兼顾了检测精度和检测速度，更契合铁路施工现场检测的硬件要求，改进合理有效 。

## 3. 2. 5 对比实验

为更全面验证本文改进模型的有效性，分别选取了目标检测两阶段法的典型算法  ［ ］和23一阶段法的典型代表  和 ，与和本文提出的改进模型进行对比实验，实验结果如表 所示。

由表  可以看出，  模型的大小、参数量和  过大，且检测精度相对偏低。 和模型在检测精度上与本文模型相近，分别低于本文模型  和  ，但在轻量化程度上不如本文模型，模型大小分别比本文模型高  、  ，参数量分别比本文模型多    万个和  万个， 分别高本文模型   和  。 综合比较可知，本文模型在保证精度的情况下，轻量化程度更高，更适用于在实际施工场景中进行模型部署。

表 6 对比试验检测结果
<table><tr><td>模型</td><td>mAP50/%</td><td>模型大小/MB</td><td>参数量/万</td><td>GFLOPs</td></tr><tr><td>Faster R-CNN</td><td>69.4</td><td>2 097.87</td><td>13 709.9</td><td>370.2</td></tr><tr><td>YOLOv5</td><td>87.4</td><td>163.8</td><td>2 137.0</td><td>70.9</td></tr><tr><td>YOLOv8</td><td>89.7</td><td>52.0</td><td>2 584.3</td><td>78.7</td></tr><tr><td>RT-DETR</td><td>87.0</td><td>38.6</td><td>1988.8</td><td>57.2</td></tr><tr><td>本文模型</td><td>90.0</td><td>19.9</td><td>985.6</td><td>25.5</td></tr></table>

## 3. 2. 6 检测结果可视化

为了直观体现本文模型在铁路施工视频监控中的检测效果，选取典型场景的监控图像对  、、 和本文模型进行对比，检测效果见图 。

![](Images_GPC8ZI86/f30d531558919d3e0f2b7d579b561706fc04d360503dd8b6998f64d5dd42727e.jpg)  
图  不同模型可视化检测效果对比

9场景  为隧道施工场景，在这种低照明度的环境下， 和  模型出现误检情况，将无关目标分别检测为  和  类，而本文模型未出现误检问题。 在场景  雾气噪声干扰的情况下，模型出现误检问题，而本文模型将目标均正确检出。  虽然在场景  和场景  中没有出现误检，但存在同一目标检测出多个目标框的问题。在场景  这种复杂背景下， 、 和模型均出现漏检情况，只有本文模型能够检测出图片最左侧离摄像头较远的工人这一小目标。 由此可见，本文模型较好地解决了铁路施工监控场景下的误检、漏检问题。

## 4 结论

为满足铁路施工场景下对人员违规行为检测精度和轻量化的需求，本文提出一种基于改进  的检测模型。

) 通过引用 网络作为主干特征提取网络、提出  下采样模块替换原有下采样方法、设计将 思想与 相结合的损失函数三种改进措施，提升模型检测反光衣和安全帽的识别准确率，实现检测算法的轻量化，解决算法在边缘计算设备部署的问题。

) 经过实验测试，模型平均精度均值达到 ，模型大小仅为   ，参数量为   万个，为  ，检测速度为   帧 。 本文改进模型与原模型相比，提高了检测准确度和速度的同时，大幅度减小了模型大小、参数量和计算量，改进合理有效。

) 对 比  、 和  模 型，本文模型在平均精度均值和模型复杂度方面均优于其他模型，能够较好的检测出目标，有效改善漏检和误检问题，验证了本模型的可行性，契合铁路施工现场检测的要求 。

## 参考文献:

［］李晓健，陈雍君，邱实，等 复杂地区铁路工程建设风险知识 图谱的建立与分析方法［ ］铁道学报， ［ 15] .http://kns.cnki.net/kcms/detail/11.2104.u.20240619. 1705.002.html. LI Xiaojian，CHEN Yongjun，QIU Shi，et al.Establishment and Analysis Method of Risk Knowledge Graph of Railway Engineering Construction in Complex Areas [J/OL].Journal of the China Railway Society,2024 [2024-11-15] .htp://kns. cnki.net/kcms/detail/11.2104.u.20240619.1705.002.html.

［］鲁帅，侯继伟，高春风，等 分布式视频监控系统在铁路站前工程的应用与研究 ［］铁路计算机应用， ， ( ) :12-16.LU Shuai,HOU Jiwei,GAO Chunfeng,et al.Distributed VideoMonitoringSystemAppliedtoRailwayConstruction［］  ， ， ( ) :12-16.

［］曹燕 基于深度学习的建筑工人安全帽检测方法研究［ ］苏州: 苏州科技大学，CAO Yan. Research on Detection Methods of Construction

47’       ［ ］ Suzhou: Suzhou University of Science and Technology，2021.

［］黄志清，张煜森，张严心，等 基于改进型  的室内安全帽佩戴状态检测算法［］天津大学学报( 自然科学与工程技术版) ， ， ( ) :HUANG Zhiqing,ZHANG Yusen,ZHANG Yanxin,et al.IndoorSafety Helmet-wearing Detection Algorithm Based on ImprovedYolov4[] .Journal of Tianjin University（ Science and Tech-) ， ， ( ) :

［］张学立，贾新春，王美刚，等 安全帽与反光衣的轻量化检测: 改进 的算法［］计算机工程与应用， ，( ) :ZHANG Xueli，JIA Xinchun，WANGMeigang，etal.Lightweight Detection of Helmets and Reflective Clothings: Im-proved YOLOv5s Algorithm[] .Computer Engineering and， ， ( ) :

[ WANG S,HAI X,CAO Y Y.Reflective Safety Clothes Wearing Detection in Hydraulic Engineering Using YOLOv3-CCD. Asian Journal of Research in Computer Science,2O23,15(2) : 11-24.

［］李天宇，吴浩，毛艳玲，等 改进  的安全帽佩戴检测方法［］计算机工程与设计， ， ( ) :LI Tianyu,WU Hao,MAO Yanling,et al.Helmet Wearing De-tection Method Based on Improve YOLOv4’s[] .Computer， ， ( ) :

BREDMON J,DIVVALA S,GIRSHICK R,et al.You Only Look Once:Unified,Real-time Object Detection[C] //2016 IEEE Conference on Computer Vision and Pattern Recognition.Pisca-: ， :

［ ］ ， : ， ，[] //2017 IEEE Conference on Computer Vision and PatternRecognition.Piscataway:IEEE,2017:7263-7271.

[10] REDMON J,FARHADI A. Yolov3: an Incremental Improve-［ ］ ( ) ［ ］ :org/abs/1804.02767.

[1] WANG C Y,BOCHKOVSKIY A,LIAO H Y M. Scaled-:      ［ ］ IEEE/CVF Conference on Computer Vision and Pattern Recognition.Piscataway:IEEE,2021:13024-13033.

[12] SALSCHEIDERNO.FeatureNMS:Non-maximum Suppression by Learning Feature Embeddings[C] //2020 25th International Conference on Pattern Recognition.Piscataway:IEEE,2021: 7848-7854.

[13] CARION N，MASSA F,SYNNAEVE G，et al. End-to-End Object Detection with Transformers EB/OL].(2020-05-28) [2024-08-17] . https: //arxiv.org/abs /2005.12872.

[14]VASWANI A，SHAZEER N,PARMAR N，et al. Attention ［ ］ ( ) ［ ］ tps://arxiv.org/abs/1706.03762.

2 RT-DETR［ ］  ，  ，  ，Real-Time Object Detection [C] //2024 IEEE/CVF Confer-enceonComputerVisionandPatternRecognition.Piscataway:IEEE,2024:16965-16974.

［ ］管岭，贾利民，谢征宇 融合注意力机制的轨道入侵异物检测轻量级模型研究［］铁道学报， ， ( ) :GUAN Ling，JIA Limin，XIE Zhengyu.ResearchonLightweight Model for Railway Intrusion Detection IntegratingAttention Mechanism [ .Journal of the China Railway Soci-， ， ( ) :

［ ］  ，  ，  ， :oryEfficient Vision Transformer with Cascaded GroupAttention [C] //2O23 IEEE/CVF Conference on ComputerVision and Pattern Recognition.Piscataway:IEEE,2023:14420-14430.

[8]REZATOFIGHI H,TSOI N,GWAK J,et al.Generalized Intersection over Union:a Metric and a Loss for Bounding Box Regression [] //2019 IEEE/CVF Conference on Computer Vision and Pattern Recognition.Piscataway:IEEE，2019: 658-666.

［ ］  ， ， ，   :

Faster and Better Learning for Bounding Box Regression. ProceedingsoftheAAAI ConferenceonArtificial ， ， ( ) :

［ ］ ， ，   :Intersection over Union Loss with Auxiliary Bounding Box［ ］ ( ) ［ ］ :abs /2311.02877.

［ ］  ，  ，  ，  :Extremely Efficient Convolutional Neural Network for MobileDevices [Cl //Proceedings of the IEEE Conference on Com-puter Vision and Pattern Recognition.Piscataway: IEEE,2018:6848-6856.

［ ］  ，  ， ，  :Efficient Convolutional Neural Networks for Mobile Vision［ ］ ( ) ［ ］https://arxiv.org/abs/1704.04861v1.

［ ］ ， ， ，   :Real-Time Object Detection with Region Proposal Networks[.IEEE Transactions on Pattern Analysis and Machine In-， ， ( ) :

( 责任编辑 李嘉懿)
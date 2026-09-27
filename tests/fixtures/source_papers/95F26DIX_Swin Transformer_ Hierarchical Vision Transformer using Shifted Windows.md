# Swin Transformer: Hierarchical Vision Transformer using Shifted Windows

Ze Liu†\* Yutong Lin†\* Yue Cao\* Han Hu\*‡ Yixuan Wei†

Zheng Zhang Stephen Lin Baining Guo

Microsoft Research Asia

{v-zeliu1,v-yutlin,yuecao,hanhu,v-yixwe,zhez,stevelin,bainguo}@microsoft.com

## Abstract

This paper presents a new vision Transformer, called Swin Transformer, that capably serves as a general-purpose backbone for computer vision. Challenges in adapting Transformer from language to vision arise from differences between the two domains, such as large variations in the scale of visual entities and the high resolution of pixels in images compared to words in text. To address these differences, we propose a hierarchical Transformer whose representation is computed with Shifted windows. The shifted windowing scheme brings greater efficiency by limiting self-attention computation to non-overlapping local windows while also allowing for cross-window connection. This hierarchical architecture has the flexibility to model at various scales and has linear computational complexity with respect to image size. These qualities of Swin Transformer make it compatible with a broad range of vision tasks, including image classification (87.3 top-1 accuracy on ImageNet-1K) and dense prediction tasks such as object detection (58.7 box AP and 51.1 mask AP on COCO testdev) and semantic segmentation (53.5 mIoU on ADE20K val). Its performance surpasses the previous state-of-theart by a large margin of +2.7 box AP and +2.6 mask AP on COCO, and +3.2 mIoU on ADE20K, demonstrating the potential of Transformer-based models as vision backbones. The hierarchical design and the shifted window approach also prove beneficial for all-MLP architectures. The code and models are publicly available at https://github. com/microsoft/Swin-Transformer.

## 1. Introduction

Modeling in computer vision has long been dominated by convolutional neural networks (CNNs). Beginning with AlexNet [39] and its revolutionary performance on the ImageNet image classification challenge, CNN architectures have evolved to become increasingly powerful through greater scale [30, 76], more extensive connections [34], and more sophisticated forms of convolution [70, 18, 84]. With CNNs serving as backbone networks for a variety of vision tasks, these architectural advances have led to performance improvements that have broadly lifted the entire field.

![](Images_BKS478WQ/c40d7963200076cafa6236f2fd9f6d4847a70ec23c67da1290e334e6dc0db722.jpg)  
(a) Swin Transformer (ours)  
Figure 1. (a) The proposed Swin Transformer builds hierarchical feature maps by merging image patches (shown in gray) in deeper layers and has linear computation complexity to input image size due to computation of self-attention only within each local window (shown in red). It can thus serve as a general-purpose backbone for both image classification and dense recognition tasks. (b) In contrast, previous vision Transformers [20] produce feature maps of a single low resolution and have quadratic computation complexity to input image size due to computation of selfattention globally.

On the other hand, the evolution of network architectures in natural language processing (NLP) has taken a different path, where the prevalent architecture today is instead the Transformer [64]. Designed for sequence modeling and transduction tasks, the Transformer is notable for its use of attention to model long-range dependencies in the data. Its tremendous success in the language domain has led researchers to investigate its adaptation to computer vision, where it has recently demonstrated promising results on certain tasks, specifically image classification [20] and joint vision-language modeling [47].

In this paper, we seek to expand the applicability of Transformer such that it can serve as a general-purpose backbone for computer vision, as it does for NLP and as CNNs do in vision. We observe that significant challenges in transferring its high performance in the language domain to the visual domain can be explained by differences between the two modalities. One of these differences involves scale. Unlike the word tokens that serve as the basic elements of processing in language Transformers, visual elements can vary substantially in scale, a problem that receives attention in tasks such as object detection [42, 53, 54]. In existing Transformer-based models [64, 20], tokens are all of a fixed scale, a property unsuitable for these vision applications. Another difference is the much higher resolution of pixels in images compared to words in passages of text. There exist many vision tasks such as semantic segmentation that require dense prediction at the pixel level, and this would be intractable for Transformer on high-resolution images, as the computational complexity of its self-attention is quadratic to image size. To overcome these issues, we propose a generalpurpose Transformer backbone, called Swin Transformer, which constructs hierarchical feature maps and has linear computational complexity to image size. As illustrated in Figure 1(a), Swin Transformer constructs a hierarchical representation by starting from small-sized patches (outlined in gray) and gradually merging neighboring patches in deeper Transformer layers. With these hierarchical feature maps, the Swin Transformer model can conveniently leverage advanced techniques for dense prediction such as feature pyramid networks (FPN) [42] or U-Net [51]. The linear computational complexity is achieved by computing self-attention locally within non-overlapping windows that partition an image (outlined in red). The number of patches in each window is fixed, and thus the complexity becomes linear to image size. These merits make Swin Transformer suitable as a general-purpose backbone for various vision tasks, in contrast to previous Transformer based architectures [20] which produce feature maps of a single resolution and have quadratic complexity.

A key design element of Swin Transformer is its shift of the window partition between consecutive self-attention layers, as illustrated in Figure 2. The shifted windows bridge the windows of the preceding layer, providing connections among them that significantly enhance modeling power (see Table 4). This strategy is also efficient in regards to real-world latency: all query patches within a window share the same key set1, which facilitates memory access in hardware. In contrast, earlier sliding window based self-attention approaches [33, 50] suffer from low latency on general hardware due to different key sets for different query pixels2. Our experiments show that the proposed shifted window approach has much lower latency than the sliding window method, yet is similar in modeling power (see Tables 5 and 6). The shifted window approach also proves beneficial for all-MLP architectures [61].

![](Images_BKS478WQ/1aa01eb3664f4c8b05473d86f3a0a88551d28dcc578a0930537f859b1831f704.jpg)  
Figure 2. An illustration of the shifted window approach for computing self-attention in the proposed Swin Transformer architecture. In layer l (left), a regular window partitioning scheme is adopted, and self-attention is computed within each window. In the next layer l + 1 (right), the window partitioning is shifted, resulting in new windows. The self-attention computation in the new windows crosses the boundaries of the previous windows in layer l, providing connections among them.

The proposed Swin Transformer achieves strong performance on the recognition tasks of image classification, object detection and semantic segmentation. It outperforms the ViT / DeiT [20, 63] and ResNe(X)t models [30, 70] significantly with similar latency on the three tasks. Its 58.7 box AP and 51.1 mask AP on the COCO test-dev set surpass the previous state-of-the-art results by +2.7 box AP (Copy-paste [26] without external data) and +2.6 mask AP (DetectoRS [46]). On ADE20K semantic segmentation, it obtains 53.5 mIoU on the val set, an improvement of +3.2 mIoU over the previous state-of-the-art (SETR [81]). It also achieves a top-1 accuracy of 87.3% on ImageNet-1K image classification.

It is our belief that a unified architecture across computer vision and natural language processing could benefit both fields, since it would facilitate joint modeling of visual and textual signals and the modeling knowledge from both domains can be more deeply shared. We hope that Swin Transformer’s strong performance on various vision problems can drive this belief deeper in the community and encourage unified modeling of vision and language signals.

## 2. Related Work

CNN and variants CNNs serve as the standard network model throughout computer vision. While the CNN has existed for several decades [40], it was not until the introduction of AlexNet [39] that the CNN took off and became mainstream. Since then, deeper and more effective convolutional neural architectures have been proposed to further propel the deep learning wave in computer vision, e.g., VGG [52], GoogleNet [57], ResNet [30], DenseNet [34],

HRNet [65], and EfficientNet [58]. In addition to these architectural advances, there has also been much work on improving individual convolution layers, such as depthwise convolution [70] and deformable convolution [18, 84]. While the CNN and its variants are still the primary backbone architectures for computer vision applications, we highlight the strong potential of Transformer-like architectures for unified modeling between vision and language. Our work achieves strong performance on several basic visual recognition tasks, and we hope it will contribute to a modeling shift.

Self-attention based backbone architectures Also inspired by the success of self-attention layers and Transformer architectures in the NLP field, some works employ self-attention layers to replace some or all of the spatial convolution layers in the popular ResNet [33, 50, 80]. In these works, the self-attention is computed within a local window of each pixel to expedite optimization [33], and they achieve slightly better accuracy/FLOPs trade-offs than the counterpart ResNet architecture. However, their costly memory access causes their actual latency to be significantly larger than that of the convolutional networks [33]. Instead of using sliding windows, we propose to shift windows between consecutive layers, which allows for a more efficient implementation in general hardware.

Self-attention/Transformers to complement CNNs Another line of work is to augment a standard CNN architecture with self-attention layers or Transformers. The selfattention layers can complement backbones [67, 7, 3, 71, 23, 74, 55] or head networks [32, 27] by providing the capability to encode distant dependencies or heterogeneous interactions. More recently, the encoder-decoder design in Transformer has been applied for the object detection and instance segmentation tasks [8, 13, 85, 56]. Our work explores the adaptation of Transformers for basic visual feature extraction and is complementary to these works.

Transformer based vision backbones Most related to our work is the Vision Transformer (ViT) [20] and its follow-ups [63, 72, 15, 28, 66]. The pioneering work of ViT directly applies a Transformer architecture on nonoverlapping medium-sized image patches for image classification. It achieves an impressive speed-accuracy tradeoff on image classification compared to convolutional networks. While ViT requires large-scale training datasets (i.e., JFT-300M) to perform well, DeiT [63] introduces several training strategies that allow ViT to also be effective using the smaller ImageNet-1K dataset. The results of ViT on image classification are encouraging, but its architecture is unsuitable for use as a general-purpose backbone network on dense vision tasks or when the input image resolution is high, due to its low-resolution feature maps and the quadratic increase in complexity with image size. There are a few works applying ViT models to the dense vision tasks of object detection and semantic segmentation by direct upsampling or deconvolution but with relatively lower performance [2, 81]. Concurrent to our work are some that modify the ViT architecture [72, 15, 28] for better image classification. Empirically, we find our Swin Transformer architecture to achieve the best speedaccuracy trade-off among these methods on image classification, even though our work focuses on general-purpose performance rather than specifically on classification. Another concurrent work [66] explores a similar line of thinking to build multi-resolution feature maps on Transformers. Its complexity is still quadratic to image size, while ours is linear and also operates locally which has proven beneficial in modeling the high correlation in visual signals [36, 25, 41]. Our approach is both efficient and effective, achieving state-of-the-art accuracy on both COCO object detection and ADE20K semantic segmentation.

## 3. Method

## 3.1. Overall Architecture

An overview of the Swin Transformer architecture is presented in Figure 3, which illustrates the tiny version (Swin-T). It first splits an input RGB image into non-overlapping patches by a patch splitting module, like ViT. Each patch is treated as a “token” and its feature is set as a concatenation of the raw pixel RGB values. In our implementation, we use a patch size of $4 \times 4$ and thus the feature dimension of each patch is $4 \times 4 \times 3 = 4 8$ . A linear embedding layer is applied on this raw-valued feature to project it to an arbitrary dimension (denoted as C).

Several Transformer blocks with modified self-attention computation (Swin Transformer blocks) are applied on these patch tokens. The Transformer blocks maintain the number of tokens $\begin{array} { r } { ( \frac { H } { 4 } \times \frac { W } { 4 } ) } \end{array}$ , and together with the linear embedding are referred to as “Stage $1 ^ { \circ }$

To produce a hierarchical representation, the number of tokens is reduced by patch merging layers as the network gets deeper. The first patch merging layer concatenates the features of each group of $2 \times 2$ neighboring patches, and applies a linear layer on the 4C-dimensional concatenated features. This reduces the number of tokens by a multiple of $2 \times 2 = 4 ( 2 \times$ downsampling of resolution), and the output dimension is set to $2 C$ . Swin Transformer blocks are applied afterwards for feature transformation, with the resolution kept at ${ \frac { H } { 8 } } \times { \frac { W } { 8 } }$ . This first block of patch merging and feature transformation is denoted as “Stage $2 ^ { \circ }$ . The procedure is repeated twice, as “Stage $3 ^ { \circ }$ and “Stage $4 ^ { \circ }$ , with output resolutions of $\frac { H } { 1 6 } \times \frac { W } { 1 6 }$ and $\frac { H } { 3 2 } \times \frac { W } { 3 2 }$ , respectively. These stages jointly produce a hierarchical representation, with the same feature map resolutions as those of typical convolutional networks, e.g., VGG [52] and ResNet [30]. As a result, the proposed architecture can conveniently replace the backbone networks in existing methods for various vision tasks.

![](Images_BKS478WQ/0953721848bd37abe93050935e5344949eb83b8a93a6ffe83edf2c62301ce536.jpg)  
Figure 3. (a) The architecture of a Swin Transformer (Swin-T); (b) two successive Swin Transformer Blocks (notation presented with Eq. (3)). W-MSA and SW-MSA are multi-head self attention modules with regular and shifted windowing configurations, respectively.

Swin Transformer block Swin Transformer is built by replacing the standard multi-head self attention (MSA) module in a Transformer block by a module based on shifted windows (described in Section 3.2), with other layers kept the same. As illustrated in Figure 3(b), a Swin Transformer block consists of a shifted window based MSA module, followed by a 2-layer MLP with GELU nonlinearity in between. A LayerNorm (LN) layer is applied before each MSA module and each MLP, and a residual connection is applied after each module.

## 3.2. Shifted Window based Self-Attention

The standard Transformer architecture [64] and its adaptation for image classification [20] both conduct global selfattention, where the relationships between a token and all other tokens are computed. The global computation leads to quadratic complexity with respect to the number of tokens, making it unsuitable for many vision problems requiring an immense set of tokens for dense prediction or to represent a high-resolution image.

Self-attention in non-overlapped windows For efficient modeling, we propose to compute self-attention within local windows. The windows are arranged to evenly partition the image in a non-overlapping manner. Supposing each window contains $M \times M$ patches, the computational complexity of a global MSA module and a window based one on an image of $h \times w$ patches $\mathrm { a r e }$

$$
\Omega ( \mathrm { M S A } ) = 4 h w C ^ { 2 } + 2 ( h w ) ^ { 2 } C ,\tag{1}
$$

$$
\Omega ( \mathbf { W } \mathbf { - M S A } ) = 4 h w C ^ { 2 } + 2 M ^ { 2 } h w C ,\tag{2}
$$

where the former is quadratic to patch number hw, and the latter is linear when M is fixed (set to 7 by default). Global self-attention computation is generally unaffordable for a large hw, while the window based self-attention is scalable.

Shifted window partitioning in successive blocks The window-based self-attention module lacks connections across windows, which limits its modeling power. To introduce cross-window connections while maintaining the efficient computation of non-overlapping windows, we propose a shifted window partitioning approach which alternates between two partitioning configurations in consecutive Swin Transformer blocks.

As illustrated in Figure 2, the first module uses a regular window partitioning strategy which starts from the top-left pixel, and the $8 \times 8$ feature map is evenly partitioned into $2 \times 2$ windows of size $4 \times 4 ( M = 4 )$ . Then, the next module adopts a windowing configuration that is shifted from that of the preceding layer, by displacing the windows by $\begin{array} { r } { \big ( \big \lfloor \frac { M } { 2 } \big \rfloor , \big \lfloor \frac { M } { 2 } \big \rfloor \big ) } \end{array}$ pixels from the regularly partitioned windows.

With the shifted window partitioning approach, consecutive Swin Transformer blocks are computed as

$$
\begin{array} { r l } & { \hat { \mathbf { z } } ^ { l } = \mathbf { W } \mathbf { - M S A } \left( \mathbf { L N } \left( \mathbf { z } ^ { l - 1 } \right) \right) + \mathbf { z } ^ { l - 1 } , } \\ & { \mathbf { z } ^ { l } = \mathbf { M L P } \left( \mathbf { L N } \left( \hat { \mathbf { z } } ^ { l } \right) \right) + \hat { \mathbf { z } } ^ { l } , } \\ & { \hat { \mathbf { z } } ^ { l + 1 } = \mathbf { S W } \mathbf { - M S A } \left( \mathbf { L N } \left( \mathbf { z } ^ { l } \right) \right) + \mathbf { z } ^ { l } , } \\ & { \mathbf { z } ^ { l + 1 } = \mathbf { M L P } \left( \mathbf { L N } \left( \hat { \mathbf { z } } ^ { l + 1 } \right) \right) + \hat { \mathbf { z } } ^ { l + 1 } , } \end{array}\tag{3}
$$

where $\hat { \mathbf { z } } ^ { l }$ and $\mathbf { z } ^ { l }$ denote the output features of the (S)W-MSA module and the MLP module for block l, respectively;

![](Images_BKS478WQ/52b115e4527f7524ff1fcc2e99937564c3bd856dac085bee58c07baf192b4faf.jpg)  
Figure 4. Illustration of an efficient batch computation approach for self-attention in shifted window partitioning.

W-MSA and SW-MSA denote window based multi-head self-attention using regular and shifted window partitioning configurations, respectively.

The shifted window partitioning approach introduces connections between neighboring non-overlapping windows in the previous layer and is found to be effective in image classification, object detection, and semantic segmentation, as shown in Table 4.

Efficient batch computation for shifted configuration An issue with shifted window partitioning is that it will result in more windows, from $\begin{array} { r } { \lceil \frac { \bar { h } } { M } \rceil \times \lceil \frac { w } { M } \rceil ^ { - } \mathrm { t o } \left( \lceil \frac { h } { M } \rceil + 1 \right) \ } \end{array}$ × $\left( \lceil \frac { w } { M } \rceil + 1 \right)$ in the shifted configuration, and some of the windows will be smaller than $M \times M$ . A naive solution is to pad the smaller windows to a size of $M \times M$ and mask out the padded values when computing attention. When the number of windows in regular partitioning is small, e.g. $2 \times 2 .$ , the increased computation with this naive solution is considerable $( 2 \times 2  3 \times 3$ , which is 2.25 times greater). Here, we propose a more efficient batch computation approach by cyclic-shifting toward the top-left direction, as illustrated in Figure 4. After this shift, a batched window may be composed of several sub-windows that are not adjacent in the feature map, so a masking mechanism is employed to limit self-attention computation to within each sub-window. With the cyclic-shift, the number of batched windows remains the same as that of regular window partitioning, and thus is also efficient. The low latency of this approach is shown in Table 5.

Relative position bias In computing self-attention, we follow [49, 1, 32, 33] by including a relative position bias $\boldsymbol { B } \in \mathbb { R } ^ { M ^ { 2 } \times M ^ { 2 } }$ to each head in computing similarity:

$$
\operatorname { A t t e n t i o n } ( Q , K , V ) = \operatorname { S o f t M a x } ( Q K ^ { T } / \sqrt { d } + B ) V ,\tag{4}
$$

where $Q , K , V \in \mathbb { R } ^ { M ^ { 2 } \times d }$ are the query, key and value matrices; d is the query/key dimension, and $M ^ { 2 }$ is the number of patches in a window. Since the relative position along each axis lies in the range $\left[ - M + 1 , M - 1 \right]$ , we parameterize a smaller-sized bias matrix $\hat { B } \in \mathbb { R } ^ { ( 2 M - 1 ) \times ( \hat { 2 M } - 1 ) }$ , and values in B are taken from $\hat { B } .$

We observe significant improvements over counterparts without this bias term or that use absolute position embedding, as shown in Table 4. Further adding absolute position embedding to the input as in [20] drops performance slightly, thus it is not adopted in our implementation.

The learnt relative position bias in pre-training can be also used to initialize a model for fine-tuning with a different window size through bi-cubic interpolation [20, 63].

## 3.3. Architecture Variants

We build our base model, called Swin-B, to have of model size and computation complexity similar to ViT-B/DeiT-B. We also introduce Swin-T, Swin-S and Swin-L, which are versions of about 0.25×, 0.5× and 2× the model size and computational complexity, respectively. Note that the complexity of Swin-T and Swin-S are similar to those of ResNet-50 (DeiT-S) and ResNet-101, respectively. The window size is set to $M = 7$ by default. The query dimension of each head is $d = 3 2$ , and the expansion layer of each MLP is $\alpha = 4$ , for all experiments. The architecture hyper-parameters of these model variants are:

• Swin-T: C = 96, layer numbers = {2, 2, 6, 2}

• Swin-S: C = 96, layer numbers ={2, 2, 18, 2}

• Swin-B: C = 128, layer numbers ={2, 2, 18, 2}

$$
\bullet \ \operatorname { S w i n - L : } C = 1 9 2 , \mathrm { l a y e r ~ n u m b e r s } = \{ 2 , 2 , 1 8 , 2 \}
$$

where C is the channel number of the hidden layers in the first stage. The model size, theoretical computational complexity (FLOPs), and throughput of the model variants for ImageNet image classification are listed in Table 1.

## 4. Experiments

We conduct experiments on ImageNet-1K image classification [19], COCO object detection [43], and ADE20K semantic segmentation [83]. In the following, we first compare the proposed Swin Transformer architecture with the previous state-of-the-arts on the three tasks. Then, we ablate the important design elements of Swin Transformer.

## 4.1. Image Classification on ImageNet-1K

Settings For image classification, we benchmark the proposed Swin Transformer on ImageNet-1K [19], which contains 1.28M training images and 50K validation images from 1,000 classes. The top-1 accuracy on a single crop is reported. We consider two training settings:

• Regular ImageNet-1K training. This setting mostly follows [63]. We employ an AdamW [37] optimizer for 300 epochs using a cosine decay learning rate scheduler and 20 epochs of linear warm-up. A batch size of 1024, an initial learning rate of 0.001, and a weight decay of 0.05 are used. We include most of the augmentation and regularization strategies of [63] in training, except for repeated augmentation [31] and EMA [45], which do not enhance performance. Note that this is contrary to [63] where repeated augmentation is crucial to stabilize the training of ViT.

• Pre-training on ImageNet-22K and fine-tuning on ImageNet-1K. We also pre-train on the larger ImageNet-22K dataset, which contains 14.2 million images and 22K classes. We employ an AdamW optimizer for 90 epochs using a linear decay learning rate scheduler with a 5-epoch linear warm-up. A batch size of 4096, an initial learning rate of 0.001, and a weight decay of 0.01 are used. In ImageNet-1K fine-tuning, we train the models for 30 epochs with a batch size of 1024, a constant learning rate of $1 0 ^ { - 5 }$ , and a weight decay of $1 0 ^ { - 8 }$

Results with regular ImageNet-1K training Table 1(a) presents comparisons to other backbones, including both Transformer-based and ConvNet-based, using regular ImageNet-1K training.

Compared to the previous state-of-the-art Transformerbased architecture, i.e. DeiT [63], Swin Transformers noticeably surpass the counterpart DeiT architectures with similar complexities: +1.5% for Swin-T (81.3%) over DeiT-S (79.8%) using 2242 input, and +1.5%/1.4% for Swin-B (83.3%/84.5%) over DeiT-B (81.8%/83.1%) using 2242/3842 input, respectively.

Compared with the state-of-the-art ConvNets, i.e. Reg-Net [48] and EfficientNet [58], the Swin Transformer achieves a slightly better speed-accuracy trade-off. Noting that while RegNet [48] and EfficientNet [58] are obtained via a thorough architecture search, the proposed Swin Transformer is adapted from the standard Transformer and has strong potential for further improvement.

Results with ImageNet-22K pre-training We also pretrain the larger-capacity Swin-B and Swin-L on ImageNet-22K. Results fine-tuned on ImageNet-1K image classification are shown in Table 1(b). For Swin-B, the ImageNet-22K pre-training brings 1.8%∼1.9% gains over training on ImageNet-1K from scratch. Compared with the previous best results for ImageNet-22K pre-training, our models achieve significantly better speed-accuracy trade-offs: Swin-B obtains 86.4% top-1 accuracy, which is 2.4% higher than that of ViT with similar inference throughput (84.7 vs. 85.9 Images_BKS478WQ/sec) and slightly lower FLOPs (47.0G vs. 55.4G). The larger Swin-L model achieves 87.3% top-1 accuracy, +0.9% better than that of the Swin-B model.

<table><tr><td colspan="5">(a)Regular ImageNet-1K trained models</td></tr><tr><td>method</td><td>limage size</td><td>#param. FLOPs</td><td>throughput ImageNet (image/s)</td><td>top-1 acc.</td></tr><tr><td>RegNetY-4G [48] RegNetY-8G [48]</td><td>2242 224²</td><td>21M 4.0G 39M 8.0G</td><td>1156.7 591.6</td><td>80.0 81.7</td></tr><tr><td>RegNetY-16G [48] EffNet-B3 [58]</td><td>2242 3002 12M</td><td>84M 16.0G 1.8G</td><td>334.7 732.1</td><td>82.9 81.6</td></tr><tr><td>EffNet-B4 [58]</td><td>3802</td><td>19M 4.2G</td><td>349.4</td><td>82.9</td></tr><tr><td>EffNet-B5 [58]</td><td>4562</td><td>30M 9.9G</td><td>169.1</td><td>83.6</td></tr><tr><td>EffNet-B6 [58]</td><td>5282 43M</td><td>19.0G</td><td>96.9</td><td>84.0</td></tr><tr><td>EffNet-B7 [58]</td><td>600² 66M</td><td>37.0G</td><td>55.1</td><td>84.3</td></tr><tr><td>ViT-B/16 [20]</td><td>3842</td><td>86M</td><td>85.9</td><td></td></tr><tr><td></td><td>3842</td><td>55.4G</td><td></td><td>77.9</td></tr><tr><td>ViT-L/16 [20]</td><td></td><td>307M 190.7G</td><td>27.3</td><td>76.5</td></tr><tr><td>DeiT-S [63]</td><td>2242</td><td>22M 4.6G</td><td>940.4</td><td>79.8</td></tr><tr><td>DeiT-B [63]</td><td>224²</td><td>86M 17.5G</td><td>292.3</td><td>81.8</td></tr><tr><td>DeiT-B [63]</td><td>3842</td><td>86M 55.4G</td><td>85.9</td><td>83.1</td></tr><tr><td>Swin-T</td><td>224²</td><td>29M 4.5G</td><td>755.2</td><td>81.3</td></tr><tr><td>Swin-S</td><td>2242</td><td>50M 8.7G</td><td>436.9</td><td>83.0</td></tr><tr><td>Swin-B</td><td>2242</td><td>88M 15.4G</td><td>278.1</td><td>83.5</td></tr><tr><td></td><td>3842</td><td></td><td></td><td></td></tr><tr><td>Swin-B</td><td></td><td>88M 47.0G</td><td>84.7</td><td>84.5</td></tr></table>

(b) ImageNet-22K pre-trained models
<table><tr><td>method</td><td>limage size</td><td>#param.FLOPs</td><td>(image/s)top-1 acc.</td><td>throughput|ImageNet</td></tr><tr><td>R-101x3 [38]</td><td>3842</td><td>388M 204.6G</td><td>1</td><td>84.4</td></tr><tr><td>R-152x4 [38]</td><td>480²</td><td>937M 840.5G</td><td>1</td><td>85.4</td></tr><tr><td>ViT-B/16 [20]</td><td>3842</td><td>86M 55.4G</td><td>85.9</td><td>84.0</td></tr><tr><td>ViT-L/16 [20]</td><td>3842</td><td>307M 190.7G</td><td>27.3</td><td>85.2</td></tr><tr><td>Swin-B</td><td>2242</td><td>88M 15.4G</td><td>278.1</td><td>85.2</td></tr><tr><td>Swin-B</td><td>3842</td><td>88M 47.0G</td><td>84.7</td><td>86.4</td></tr><tr><td>Swin-L</td><td>384²</td><td>197M 103.9G</td><td>42.1</td><td>87.3</td></tr></table>

Table 1. Comparison of different backbones on ImageNet-1K classification. Throughput is measured using the GitHub repository of [68] and a V100 GPU, following [63].

## 4.2. Object Detection on COCO

Settings Object detection and instance segmentation experiments are conducted on COCO 2017, which contains 118K training, 5K validation and 20K test-dev images. An ablation study is performed using the validation set, and a system-level comparison is reported on test-dev. For the ablation study, we consider four typical object detection frameworks: Cascade Mask R-CNN [29, 6], ATSS [79], RepPoints v2 [12], and Sparse RCNN [56] in mmdetection [10]. For these four frameworks, we utilize the same settings: multi-scale training [8, 56] (resizing the input such that the shorter side is between 480 and 800 while the longer side is at most 1333), AdamW [44] optimizer (initial learning rate of 0.0001, weight decay of 0.05, and batch size of 16), and 3x schedule (36 epochs). For system-level comparison, we adopt an improved HTC [9] (denoted as HTC++) with instaboost [22], stronger multi-scale training [7], 6x schedule (72 epochs), soft-NMS [5], and ImageNet-22K pre-trained model as initialization.

We compare our Swin Transformer to standard ConvNets, i.e. ResNe(X)t, and previous Transformer networks, e.g. DeiT. The comparisons are conducted by changing only the backbones with other settings unchanged. Note that while Swin Transformer and ResNe(X)t are directly applicable to all the above frameworks because of their hierarchical feature maps, DeiT only produces a single resolution of feature maps and cannot be directly applied. For fair comparison, we follow [81] to construct hierarchical feature maps for DeiT using deconvolution layers.

<table><tr><td colspan="5">(a) Various frameworks</td></tr><tr><td>Method</td><td>Backbone|APbox</td><td>AP3</td><td>AP</td><td>#param. FLOPs FPS</td></tr><tr><td>Cascade</td><td>R-50</td><td>46.3</td><td>64.3 50.5</td><td>82M 739G 18.0</td></tr><tr><td>Mask R-CNN ATSS</td><td>Swin-T R-50</td><td>50.5 43.5</td><td>69.3 54.9 61.9 47.0</td><td>86M 745G 15.3 32M 205G 28.3</td></tr><tr><td></td><td>Swin-T</td><td>47.2</td><td>66.5 51.3</td><td>36M 215G 22.3</td></tr><tr><td>RepPointsV2</td><td>R-50 Swin-T</td><td>46.5 50.0</td><td>64.6 50.3 68.5 54.2</td><td>42M 274G 13.6 45M 283G 12.0</td></tr><tr><td>Sparse R-CNN</td><td>R-50 Swin-T</td><td>44.5 47.9</td><td>63.4 48.2 67.3 52.3</td><td>106M 166G 21.0 110M 172G 18.4</td></tr></table>

(b) Various backbones w. Cascade Mask R-CNN
<table><tr><td></td><td>APbox APbox xAPbx|</td><td>APmask</td><td>APmask</td><td>sAPmsskp</td><td>paramFLOPsFPS</td></tr><tr><td>DeiT-S+ R50</td><td>48.0 67.2 51.7 46.3 64.3 50.5</td><td>41.4 40.1 43.7</td><td>64.2 61.7</td><td>44.3 43.4</td><td>80M 889G 10.4 82M 739G 18.0</td></tr><tr><td>Swin-T X101-32 Swin-S</td><td>50.5 69.3 54.9 48.1 66.5 52.4 51.8 70.4 56.3</td><td>41.6 44.7</td><td>66.6 63.9 67.9</td><td>47.1 45.2 48.5</td><td>86M 745G 15.3 101M 819G 12.8 107M 838G 12.0</td></tr><tr><td>X101-64 Swin-B</td><td>48.3 66.4 52.3 51.9 70.9 56.5</td><td>41.7 45.0</td><td>64.0 68.4</td><td>45.1 48.7</td><td>140M 972G 10.4 145M 982G11.6</td></tr></table>

(c) System-level Comparison
<table><tr><td>Method</td><td>mini-val Apbox Apmask</td><td>test-dev Apbox Apmask</td><td>#param. FLOPs</td></tr><tr><td>RepPointsV2* [12]</td><td>1 1</td><td>52.1 1</td><td>- -</td></tr><tr><td>GCNet* [7]</td><td>51.8 44.7</td><td>52.3 45.4</td><td>1041G -</td></tr><tr><td>RelationNet++* [13]</td><td>- -</td><td>52.7 1</td><td>- -</td></tr><tr><td>SpineNet-190 [21]</td><td>52.6 -</td><td>52.8 -</td><td>164M 1885G</td></tr><tr><td>ResNeSt-200* [78]</td><td>52.5 -</td><td>53.3 47.1</td><td>- -</td></tr><tr><td>EfficientDet-D7 [59]</td><td>54.4 =</td><td>55.1 -</td><td>77M 410G</td></tr><tr><td>DetectoRS* [46]</td><td>1 -</td><td>55.7 48.5</td><td>1 1</td></tr><tr><td>YOLOv4 P7* [4]</td><td>- -</td><td>55.8 -</td><td>- -</td></tr><tr><td>Copy-paste [26]</td><td>55.9 47.2</td><td>56.0 47.4</td><td>185M 1440G</td></tr><tr><td>X101-64 (HTC++)</td><td>52.3 46.0</td><td>- 1</td><td>155M 1033G</td></tr><tr><td>Swin-B (HTC++)</td><td>56.4 49.1</td><td>-</td><td>160M 1043G</td></tr><tr><td></td><td>57.1 49.5</td><td>- 57.7 50.2</td><td>284M 1470G</td></tr><tr><td>Swin-L (HTC++)</td><td></td><td></td><td></td></tr><tr><td>Swin-L (HTC++)*</td><td>58.0 50.4</td><td>58.7 51.1</td><td>284M</td></tr></table>

Table 2. Results on COCO object detection and instance segmentation. †denotes that additional decovolution layers are used to produce hierarchical feature maps. \* indicates multi-scale testing.

Comparison to ResNe(X)t Table 2(a) lists the results of Swin-T and ResNet-50 on the four object detection frameworks. Our Swin-T architecture brings consistent +3.4∼4.2 box AP gains over ResNet-50, with slightly larger model size, FLOPs and latency.

Table 2(b) compares Swin Transformer and ResNe(X)t under different model capacity using Cascade Mask R-CNN. Swin Transformer achieves a high detection accuracy of 51.9 box AP and 45.0 mask AP, which are significant gains of +3.6 box AP and +3.3 mask AP over ResNeXt101- 64x4d, which has similar model size, FLOPs and latency. On a higher baseline of 52.3 box AP and 46.0 mask AP using an improved HTC framework, the gains by Swin Transformer are also high, at +4.1 box AP and +3.1 mask AP (see Table 2(c)). Regarding inference speed, while ResNe(X)t is built by highly optimized Cudnn functions, our architecture is implemented with built-in PyTorch functions that are not all well-optimized. A thorough kernel optimization is beyond the scope of this paper.

<table><tr><td colspan="2">ADE20K</td><td rowspan="2">val mIoU</td><td rowspan="2">test score</td><td rowspan="2">#param.FLOPs</td><td rowspan="2">FPS</td></tr><tr><td>Method</td><td>Backbone</td></tr><tr><td>DANet [23]</td><td>ResNet-101</td><td>45.2</td><td>-</td><td>69M</td><td>1119G 15.2</td></tr><tr><td>DLab.v3+[11]</td><td>ResNet-101</td><td>44.1</td><td>-</td><td>63M</td><td>1021G 16.0</td></tr><tr><td>ACNet [24]</td><td>ResNet-101</td><td>45.9</td><td>38.5</td><td>-</td><td></td></tr><tr><td>DNL [71]</td><td>ResNet-101</td><td>46.0</td><td>56.2</td><td>69M</td><td>1249G 14.8</td></tr><tr><td>OCRNet [73]</td><td>ResNet-101</td><td>45.3</td><td>56.0</td><td>56M</td><td>923G 19.3</td></tr><tr><td>UperNet [69]</td><td>ResNet-101</td><td>44.9</td><td>-</td><td>86M</td><td>1029G 20.1</td></tr><tr><td>OCRNet [73]</td><td>HRNet-w48</td><td>45.7</td><td>-</td><td>71M</td><td>664G 12.5</td></tr><tr><td>DLab.v3+[11]</td><td>ResNeSt-101</td><td>46.9</td><td>55.1</td><td>66M</td><td>1051G 11.9</td></tr><tr><td>DLab.v3+[11]</td><td>ResNeSt-200</td><td>48.4</td><td>-</td><td>88M</td><td>1381G 8.1</td></tr><tr><td>SETR [81]</td><td>T-Large</td><td>50.3</td><td>61.7</td><td>308M</td><td>- -</td></tr><tr><td>UperNet</td><td>DeiT-St</td><td>44.0</td><td>-</td><td>52M</td><td>1099G 16.2</td></tr><tr><td>UperNet</td><td>Swin-T</td><td>46.1</td><td>-</td><td>60M</td><td>945G 18.5</td></tr><tr><td>UperNet</td><td>Swin-S</td><td>49.3</td><td>1</td><td>81M</td><td>1038G 15.2</td></tr><tr><td>UperNet</td><td>Swin-Bt</td><td>51.6</td><td>/</td><td>121M</td><td>1841G 8.7</td></tr><tr><td>UperNet</td><td> ${ \mathrm { S w i n  – L } } ^ { \ddagger }$ </td><td>53.5</td><td>62.8</td><td>234M</td><td>3230G 6.2</td></tr></table>

Table 3. Results of semantic segmentation on the ADE20K val and test set. † indicates additional deconvolution layers are used to produce hierarchical feature maps. ‡ indicates that the model is pre-trained on ImageNet-22K.

Comparison to DeiT The performance of DeiT-S using the Cascade Mask R-CNN framework is shown in Table 2(b). The results of Swin-T are +2.5 box AP and +2.3 mask AP higher than DeiT-S with similar model size (86M vs. 80M) and significantly higher inference speed (15.3 FPS vs. 10.4 FPS). The lower inference speed of DeiT is mainly due to its quadratic complexity to input image size.

Comparison to previous state-of-the-art Table 2(c) compares our best results with those of previous state-ofthe-art models. Our best model achieves 58.7 box AP and 51.1 mask AP on COCO test-dev, surpassing the previous best results by +2.7 box AP (Copy-paste [26] without external data) and +2.6 mask AP (DetectoRS [46]).

## 4.3. Semantic Segmentation on ADE20K

Settings ADE20K [83] is a widely-used semantic segmentation dataset, covering a broad range of 150 semantic categories. It has 25K images in total, with 20K for training, 2K for validation, and another 3K for testing. We utilize UperNet [69] in mmseg [16] as our base framework for its high efficiency. More details are presented in the Appendix.

<table><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>ImageNettop-1top-5</td><td rowspan=1 colspan=1>COCO $\mathsf { A P } ^ { \mathsf { b o x } }$   $\mathbf { A P } ^ { \mathrm { m a s k } }$ </td><td rowspan=1 colspan=1>ADE20kmIoU</td></tr><tr><td rowspan=1 colspan=1>w/o shiftingshifted windows</td><td rowspan=1 colspan=1>80.2 95.181.3 95.6</td><td rowspan=1 colspan=1>47.7  41.550.5  43.7</td><td rowspan=1 colspan=1>43.346.1</td></tr><tr><td rowspan=1 colspan=1>no pos.</td><td rowspan=1 colspan=1>80.1 94.9</td><td rowspan=1 colspan=1>49.2  42.6</td><td rowspan=1 colspan=1>43.8</td></tr><tr><td rowspan=1 colspan=1>abs. pos.</td><td rowspan=1 colspan=1>80.5 95.2</td><td rowspan=1 colspan=1>49.0  42.4</td><td rowspan=1 colspan=1>43.2</td></tr><tr><td rowspan=1 colspan=1>abs.+rel. pos.</td><td rowspan=1 colspan=1>81.3 95.6</td><td rowspan=1 colspan=1>50.2  43.4</td><td rowspan=1 colspan=1>44.0</td></tr><tr><td rowspan=2 colspan=1>rel. pos. w/o app.rel. pos.</td><td rowspan=1 colspan=1>79.3 94.7</td><td rowspan=1 colspan=1>48.2  41.9</td><td rowspan=1 colspan=1>44.1</td></tr><tr><td rowspan=1 colspan=1>81.3 95.6</td><td rowspan=1 colspan=1>50.5  43.7</td><td rowspan=1 colspan=1>46.1</td></tr></table>

Table 4. Ablation study on the shifted windows approach and different position embedding methods on three benchmarks, using the Swin-T architecture. w/o shifting: all self-attention modules adopt regular window partitioning, without shifting; abs. pos.: absolute position embedding term of ViT; rel. pos.: the default settings with an additional relative position bias term (see Eq. (4)); app.: the first scaled dot-product term in Eq. (4).

Results Table 3 lists the mIoU, model size (#param), FLOPs and FPS for different method/backbone pairs. From these results, it can be seen that Swin-S is +5.3 mIoU higher (49.3 vs. 44.0) than DeiT-S with similar computation cost. It is also +4.4 mIoU higher than ResNet-101, and +2.4 mIoU higher than ResNeSt-101 [78]. Our Swin-L model with ImageNet-22K pre-training achieves 53.5 mIoU on the val set, surpassing the previous best model by +3.2 mIoU (50.3 mIoU by SETR [81] which has a larger model size).

## 4.4. Ablation Study

In this section, we ablate important design elements in the proposed Swin Transformer, using ImageNet-1K image classification, Cascade Mask R-CNN on COCO object detection, and UperNet on ADE20K semantic segmentation.

Shifted windows Ablations of the shifted window approach on the three tasks are reported in Table 4. Swin-T with the shifted window partitioning outperforms the counterpart built on a single window partitioning at each stage by +1.1% top-1 accuracy on ImageNet-1K, +2.8 box AP/+2.2 mask AP on COCO, and +2.8 mIoU on ADE20K. The results indicate the effectiveness of using shifted windows to build connections among windows in the preceding layers. The latency overhead by shifted window is also small, as shown in Table 5.

Relative position bias Table 4 shows comparisons of different position embedding approaches. Swin-T with relative position bias yields +1.2%/+0.8% top-1 accuracy on ImageNet-1K, +1.3/+1.5 box AP and +1.1/+1.3 mask AP on COCO, and +2.3/+2.9 mIoU on ADE20K in relation to those without position encoding and with absolute position embedding, respectively, indicating the effectiveness of the relative position bias. Also note that while the inclusion of absolute position embedding improves image classification accuracy (+0.4%), it harms object detection and semantic segmentation (-0.2 box/mask AP on COCO and -0.6 mIoU on ADE20K).

<table><tr><td>method</td><td>MSA in a stage (ms) S1 S2</td><td>S3 S4</td><td>Arch. (FPS) TS S B</td></tr><tr><td>sliding window (naive) sliding window (kernel)</td><td>122.5 38.3 7.6 4.7</td><td>12.1 17.6 1.8</td><td>183109 77</td></tr><tr><td>Performer[14]</td><td>4.8 2.8</td><td>2.7 1.8 1.5</td><td>488 283 187 638 370 241</td></tr><tr><td>window (w/o shifting)</td><td>2.8 1.7</td><td>1.2 0.9</td><td>770 444 280</td></tr><tr><td>shifted window (padding) shifted window (cyclic)</td><td>3.3 2.3 3.0 1.9</td><td>1.9 2.2 1.3 1.0</td><td>670 371 236 755 437 278</td></tr></table>

Table 5. Real speed of different self-attention computation methods and implementations on a V100 GPU.

While the recent ViT/DeiT models abandon translation invariance in image classification even though it has long been shown to be crucial for visual modeling, we find that inductive bias that encourages certain translation invariance is still preferable for general-purpose visual modeling, particularly for the dense prediction tasks of object detection and semantic segmentation.

Different self-attention methods The real speed of different self-attention computation methods and implementations are compared in Table 5. Our cyclic implementation is more hardware efficient than naive padding, particularly for deeper stages. Overall, it brings a 13%, 18% and 18% speed-up on Swin-T, Swin-S and Swin-B, respectively.

The self-attention modules built on the proposed shifted window approach are 40.8×/2.5×, 20.2×/2.5×, 9.3×/2.1×, and 7.6×/1.8× more efficient than those of sliding windows in naive/kernel implementations on four network stages, respectively. Overall, the Swin Transformer architectures built on shifted windows are 4.1/1.5, 4.0/1.5, 3.6/1.5 times faster than variants built on sliding windows for Swin-T, Swin-S, and Swin-B, respectively. Table 6 compares their accuracy on the three tasks, showing that they are similarly accurate in visual modeling.

Compared to Performer [14], which is one of the fastest Transformer architectures (see [60]), the proposed shifted window based self-attention computation and the overall Swin Transformer architectures are slightly faster (see Table 5), while achieving +2.3% top-1 accuracy compared to Performer on ImageNet-1K using Swin-T (see Table 6).

## 5. Conclusion

This paper presents Swin Transformer, a new vision Transformer which produces a hierarchical feature representation and has linear computational complexity with respect to input image size. Swin Transformer achieves the state-of-the-art performance on COCO object detection and ADE20K semantic segmentation, significantly surpassing previous best methods. We hope that Swin Transformer’s strong performance on various vision problems will encourage unified modeling of vision and language signals.

<table><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>Backbonet</td><td rowspan=1 colspan=1>ImageNetop-1 top-5</td><td rowspan=1 colspan=1>CoCO $\mathsf { A P } ^ { \mathsf { b o x } }$  $\mathbf { A P } ^ { \mathrm { m a s k } }$ </td><td rowspan=1 colspan=1>ADE20kmIoU</td></tr><tr><td rowspan=1 colspan=1>sliding windowPerformer [14]</td><td rowspan=1 colspan=1>Swin-TSwin-T</td><td rowspan=1 colspan=1>81.495.679.094.2</td><td rowspan=1 colspan=1>50.243.51    ：</td><td rowspan=1 colspan=1>45.8-</td></tr><tr><td rowspan=1 colspan=1>shifted window</td><td rowspan=1 colspan=1>Swin-T</td><td rowspan=1 colspan=1>81.395.6</td><td rowspan=1 colspan=1>50.543.7</td><td rowspan=1 colspan=1>46.1</td></tr></table>

Table 6. Accuracy of Swin Transformer using different methods for self-attention computation on three benchmarks.

As a key element of Swin Transformer, the shifted window based self-attention is shown to be effective and efficient on vision problems, and we look forward to investigating its use in natural language processing as well.

## Acknowledgement

We thank many colleagues at Microsoft for their help, in particular, Li Dong and Furu Wei for useful discussions; Bin Xiao, Lu Yuan and Lei Zhang for help on datasets.

## A1. Detailed Architectures

The detailed architecture specifications are shown in Table 7, where an input image size of 224×224 is assumed for all architectures. “Concat $n \times n ^ { \prime \prime }$ indicates a concatenation of n × n neighboring features in a patch. This operation results in a downsampling of the feature map by a rate of n. “96-d” denotes a linear layer with an output dimension of 96. “win. sz. $7 \times 7 ^ { 5 }$ indicates a multi-head self-attention module with window size of $7 \times 7$

## A2. Detailed Experimental Settings

## A2.1. Image classification on ImageNet-1K

The image classification is performed by applying a global average pooling layer on the output feature map of the last stage, followed by a linear classifier. We find this strategy to be as accurate as using an additional class token as in ViT [20] and DeiT [63]. In evaluation, the top-1 accuracy using a single crop is reported.

Regular ImageNet-1K training The training settings mostly follow [63]. For all model variants, we adopt a default input image resolution of $2 2 4 ^ { 2 }$ . For other resolutions such as $3 8 4 ^ { 2 }$ , we fine-tune the models trained at $2 2 4 ^ { 2 }$ resolution, instead of training from scratch, to reduce GPU consumption.

When training from scratch with a $2 2 4 ^ { 2 }$ input, we employ an AdamW [37] optimizer for 300 epochs using a cosine decay learning rate scheduler with 20 epochs of linear warm-up. A batch size of 1024, an initial learning rate of 0.001, a weight decay of 0.05, and gradient clipping with a max norm of 1 are used. We include most of the augmentation and regularization strategies of [63] in training, including RandAugment [17], Mixup [77], Cutmix [75], random erasing [82] and stochastic depth [35], but not repeated augmentation [31] and Exponential Moving Average (EMA) [45] which do not enhance performance. Note that this is contrary to [63] where repeated augmentation is crucial to stabilize the training of ViT. An increasing degree of stochastic depth augmentation is employed for larger models, i.e. 0.2, 0.3, 0.5 for Swin-T, Swin-S, and Swin-B, respectively.

For fine-tuning on input with larger resolution, we employ an adamW [37] optimizer for 30 epochs with a constant learning rate of $1 0 ^ { - 5 }$ , weight decay of $1 0 ^ { - 8 }$ , and the same data augmentation and regularizations as the first stage except for setting the stochastic depth ratio to 0.1.

ImageNet-22K pre-training We also pre-train on the larger ImageNet-22K dataset, which contains 14.2 million images and 22K classes. The training is done in two stages. For the first stage with $2 2 4 ^ { 2 }$ input, we employ an AdamW optimizer for 90 epochs using a linear decay learning rate scheduler with a 5-epoch linear warm-up. A batch size of 4096, an initial learning rate of 0.001, and a weight decay of 0.01 are used. In the second stage of ImageNet-1K finetuning with $2 2 4 ^ { 2 } / 3 8 4 ^ { 2 }$ input, we train the models for 30 epochs with a batch size of 1024, a constant learning rate of $1 0 ^ { - 5 }$ , and a weight decay of $1 0 ^ { - 8 }$

## A2.2. Object detection on COCO

For an ablation study, we consider four typical object detection frameworks: Cascade Mask R-CNN [29, 6], ATSS [79], RepPoints v2 [12], and Sparse RCNN [56] in mmdetection [10]. For these four frameworks, we utilize the same settings: multi-scale training [8, 56] (resizing the input such that the shorter side is between 480 and 800 while the longer side is at most 1333), AdamW [44] optimizer (initial learning rate of 0.0001, weight decay of 0.05, and batch size of 16), and 3x schedule (36 epochs with the learning rate decayed by 10× at epochs 27 and 33).

For system-level comparison, we adopt an improved HTC [9] (denoted as HTC++) with instaboost [22], stronger multi-scale training [7] (resizing the input such that the shorter side is between 400 and 1400 while the longer side is at most 1600), 6x schedule (72 epochs with the learning rate decayed at epochs 63 and 69 by a factor of 0.1), soft-NMS [5], and an extra global self-attention layer appended at the output of last stage and ImageNet-22K pre-trained model as initialization. We adopt stochastic depth with ratio of 0.2 for all Swin Transformer models.

<table><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>downsp. rate(output size)</td><td rowspan=1 colspan=3>Swin-T</td><td rowspan=1 colspan=4>Swin-S</td><td rowspan=1 colspan=4>Swin-B</td><td rowspan=1 colspan=3>Swin-L</td></tr><tr><td rowspan=2 colspan=1>stage 1</td><td rowspan=2 colspan=1>4×(56×56)</td><td rowspan=1 colspan=3>concat 4×4,96-d,LN</td><td rowspan=1 colspan=4>concat 4×4, 96-d,LN</td><td rowspan=1 colspan=4>concat 4×4,128-d,LN</td><td rowspan=1 colspan=3>concat 4×4, 192-d,LN</td></tr><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1> $\left[ { \begin{array} { l } { \operatorname { w i n . ~ s z . ~ } 7 \times 7 , } \\ { \operatorname { d i m } 9 6 , \operatorname { h e</td><td rowspan=1 colspan=1>a d } 3 } \end{array} } \right] \times 2$ </td><td rowspan=1 colspan=2></td><td rowspan=1 colspan=1> $\left[ { \begin{array} { l } { \operatorname { w i n . ~ s z . ~ } 7 \times 7 , } \\ { \operatorname { d i m } 9 6 , \operatorname { h e a</td><td rowspan=1 colspan=1>d } 3 } \end{array} } \right] \times 2$ </td><td rowspan=1 colspan=2></td><td rowspan=1 colspan=1> $\biggl [ \underset { \mathrm { d i m } 1 2 8 , \mathrm { h e a d } 4 } { \mathrm { w i n</td><td rowspan=1 colspan=1>. } } \biggr ] \times 2$ </td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1> $\left[ { \begin{array} { l } { \mathrm { w i n . ~ s z . ~ } 7 \times 7 , } \\ { \mathrm { d i m ~ } 1 9 2 , \mathrm { h e a d ~ } 6 } \e</td><td rowspan=1 colspan=1>nd{array} } \right] \times 2$ </td></tr><tr><td rowspan=2 colspan=1>stage 2</td><td rowspan=2 colspan=1>8×(28×28)</td><td rowspan=1 colspan=3>concat 2×2,192-d,LN</td><td rowspan=1 colspan=3>concat 2×2,192</td><td rowspan=1 colspan=1>-d,LN</td><td rowspan=1 colspan=3>concat 2×2,256</td><td rowspan=1 colspan=1>-d,LN</td><td rowspan=1 colspan=2>concat 2×2,384-</td><td rowspan=1 colspan=1>d,LN</td></tr><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,[dim 192, head 6</td><td rowspan=1 colspan=1> $\times 2$ </td><td rowspan=1 colspan=1></td><td></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 192, head 6</td><td rowspan=1 colspan=1>×2</td><td rowspan=1 colspan=2></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 256, head 8</td><td rowspan=1 colspan=1>×2</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 384,head 12]</td><td rowspan=1 colspan=1>×2</td></tr><tr><td rowspan=2 colspan=1>stage 3</td><td rowspan=2 colspan=1>16×(14×14)</td><td rowspan=1 colspan=2>concat 2×2,384-</td><td rowspan=1 colspan=1>d,LN</td><td rowspan=1 colspan=3>concat 2×2, 384</td><td rowspan=1 colspan=1>-d ,LN</td><td rowspan=1 colspan=3>concat 2×2, 512</td><td rowspan=1 colspan=1>-d ,LN</td><td rowspan=1 colspan=2>concat 2×2, 768-</td><td rowspan=1 colspan=1>d ,LN</td></tr><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 384, head 12</td><td rowspan=1 colspan=1>×6</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=2>win. sz. 7×7,dim 384,head 12]</td><td rowspan=1 colspan=1>×18</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=2>win. sz. 7×7,dim 512, head 16</td><td rowspan=1 colspan=1>×18</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 768, head 24</td><td rowspan=1 colspan=1>×18</td></tr><tr><td rowspan=2 colspan=1>stage 4</td><td rowspan=2 colspan=1>32×(7×7)</td><td rowspan=1 colspan=2>concat 2×2,768-</td><td rowspan=1 colspan=1>d,LN</td><td rowspan=1 colspan=3>concat 2×2, 768</td><td rowspan=1 colspan=1>-d,LN</td><td rowspan=1 colspan=4>concat 2×2,1024-d,LN</td><td rowspan=1 colspan=3>concat 2×2,1536-d,LN</td></tr><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 768, head 24]</td><td rowspan=1 colspan=1> $\times 2$ </td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=2>win. sz. 7×7,[dim 768, head 24]</td><td rowspan=1 colspan=1>×2</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=2>win. sz. 7×7,dim 1024,head 32]</td><td rowspan=1 colspan=1>×2</td><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>win. sz. 7×7,dim 1536, head 48]</td><td rowspan=1 colspan=1>×2</td></tr></table>

Table 7. Detailed architecture specifications.

## A2.3. Semantic segmentation on ADE20K

ADE20K [83] is a widely-used semantic segmentation dataset, covering a broad range of 150 semantic categories. It has 25K images in total, with 20K for training, 2K for validation, and another 3K for testing. We utilize UperNet [69] in mmsegmentation [16] as our base framework for its high efficiency.

In training, we employ the AdamW [44] optimizer with an initial learning rate of $6 \times 1 0 ^ { - 5 }$ , a weight decay of 0.01, a scheduler that uses linear learning rate decay, and a linear warmup of 1,500 iterations. Models are trained on 8 GPUs with 2 images per GPU for 160K iterations. For augmentations, we adopt the default setting in mmsegmentation of random horizontal flipping, random re-scaling within ratio range [0.5, 2.0] and random photometric distortion. Stochastic depth with ratio of 0.2 is applied for all Swin Transformer models. Swin-T, Swin-S are trained on the standard setting as the previous approaches with an input of 512×512. Swin-B and Swin-L with ‡ indicate that these two models are pre-trained on ImageNet-22K, and trained with the input of 640×640.

In inference, a multi-scale test using resolutions that are [0.5, 0.75, 1.0, 1.25, 1.5, 1.75]× of that in training is employed. When reporting test scores, both the training images and validation images are used for training, following common practice [71].

## A3. More Experiments

## A3.1. Image classification with different input size

Table 8 lists the performance of Swin Transformers with different input image sizes from $2 2 4 ^ { 2 }$ to 3842. In general, a larger input resolution leads to better top-1 accuracy but with slower inference speed.

<table><tr><td>input</td><td colspan="2">Swin-T top-1 throughput</td><td colspan="2">Swin-S top-1 throughput</td><td colspan="2">Swin-B top-1 throughput</td></tr><tr><td>size 224</td><td>acc 81.3</td><td>(image/s) 755.2</td><td>acc 83.0</td><td>(image/s) 436.9</td><td>acc 83.3</td><td>(image/s) 278.1</td></tr><tr><td> $2 5 6 ^ { 2 }$ </td><td>81.6</td><td>580.9</td><td>83.4</td><td>336.7</td><td>83.7</td><td>208.1</td></tr><tr><td>320²</td><td>82.1</td><td>342.0</td><td>83.7</td><td>198.2</td><td>84.0</td><td>132.0</td></tr><tr><td>3842</td><td>82.2</td><td>219.5</td><td>83.9</td><td>127.6</td><td>84.5</td><td>84.7</td></tr><tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>

Table 8. Swin Transformers with different input image size on ImageNet-1K classification.

<table><tr><td>Backbone</td><td>Optimizer</td><td> $\textstyle \left\lceil \mathbf { A P } ^ { \mathrm { b o x } } \right.$   $\overline { { \mathbf { A P } _ { 5 0 } ^ { \mathrm { b o x } } } }$ </td><td> $\overline { { \mathbf { A P } _ { 7 5 } ^ { \mathrm { b o x } } } }$ </td><td> $\scriptstyle \left| { \mathrm { A P } } ^ { \mathrm { m a s k } } \right.$ </td><td> $\overline { { \mathrm { A P } _ { 5 0 } ^ { \mathrm { m a s k } } } }$ </td><td> $\overline { { \mathrm { A P } _ { 7 5 } ^ { \mathrm { m a s k } } } }$ </td></tr><tr><td rowspan="2">R50</td><td>SGD</td><td>45.0 62.9</td><td>48.8</td><td>38.5</td><td>59.9</td><td>41.4</td></tr><tr><td>AdamW</td><td>46.3 64.3</td><td>50.5</td><td>40.1</td><td>61.7</td><td>43.4</td></tr><tr><td rowspan="2">X101-32x4d</td><td>SGD</td><td>47.8 65.9</td><td>51.9</td><td>40.4</td><td>62.9</td><td>43.5</td></tr><tr><td>AdamW</td><td>48.1 66.5</td><td>52.4</td><td>41.6</td><td>63.9</td><td>45.2</td></tr><tr><td rowspan="2">X101-64x4d</td><td>SGD</td><td>48.8 66.9</td><td>53.0</td><td>41.4</td><td>63.9</td><td>44.7</td></tr><tr><td>AdamW</td><td>48.3 66.4</td><td>52.3</td><td>41.7</td><td>64.0</td><td>45.1</td></tr></table>

Table 9. Comparison of the SGD and AdamW optimizers for ResNe(X)t backbones on COCO object detection using the Cascade Mask R-CNN framework.

## A3.2. Different Optimizers for ResNe(X)t on COCO

Table 9 compares the AdamW and SGD optimizers of the ResNe(X)t backbones on COCO object detection. The Cascade Mask R-CNN framework is used in this comparison. While SGD is used as a default optimizer for Cascade Mask R-CNN framework, we generally observe improved accuracy by replacing it with an AdamW optimizer, particularly for smaller backbones. We thus use AdamW for ResNe(X)t backbones when compared to the proposed Swin Transformer architectures.

## A3.3. Swin MLP-Mixer

We apply the proposed hierarchical design and the shifted window approach to the MLP-Mixer architectures [61], referred to as Swin-Mixer. Table 10 shows the performance of Swin-Mixer compared to the original MLP-Mixer architectures MLP-Mixer [61] and a follow-up approach, ResMLP [61]. Swin-Mixer performs significantly better than MLP-Mixer (81.3% vs. 76.4%) using slightly smaller computation budget (10.4G vs. 12.7G). It also has better speed accuracy trade-off compared to ResMLP [62]. These results indicate the proposed hierarchical design and the shifted window approach are generalizable.

<table><tr><td>method</td><td>image  $\mathrm { s i z e }$ </td><td>#param.FLOPs</td><td></td><td>throughputI (image/s)</td><td>tImageNet top-1 acc.</td></tr><tr><td>MLP-Mixer-B/16 [61]</td><td> $2 2 4 ^ { 2 }$ </td><td>59M</td><td>12.7G</td><td>-</td><td>76.4</td></tr><tr><td>ResMLP-S24 [62]</td><td> $2 2 4 ^ { 2 }$ </td><td>30M</td><td>6.0G</td><td>715</td><td>79.4</td></tr><tr><td>ResMLP-B24 [62]</td><td> $2 2 4 ^ { 2 }$ </td><td>116M</td><td>23.0G</td><td>231</td><td>81.0</td></tr><tr><td>Swin-T/D24 (Transformer)</td><td> $2 5 6 ^ { 2 }$ </td><td>28M</td><td>5.9G</td><td>563</td><td>81.6</td></tr><tr><td>Swin-Mixer-T/D24</td><td> $2 5 6 ^ { 2 }$ </td><td>20M</td><td>4.0G</td><td>807</td><td>79.4</td></tr><tr><td>Swin-Mixer-T/D12</td><td> $2 5 6 ^ { 2 }$ </td><td>21M</td><td>4.0G</td><td>792</td><td>79.6</td></tr><tr><td>Swin-Mixer-T/D6</td><td> $2 5 6 ^ { 2 }$ </td><td>23M</td><td>4.0G</td><td>766</td><td>79.7</td></tr><tr><td>Swin-Mixer-B/D24 (no shift)</td><td> $2 2 4 ^ { 2 }$ </td><td>61M</td><td>10.4G</td><td>409</td><td>80.3</td></tr><tr><td>Swin-Mixer-B/D24</td><td> $2 2 4 ^ { 2 }$ </td><td>61M</td><td>10.4G</td><td>409</td><td>81.3</td></tr></table>

Table 10. Performance of Swin MLP-Mixer on ImageNet-1K classification. D indictes the number of channels per head. Throughput is measured using the GitHub repository of [68] and a V100 GPU, following [63].

## References

[1] Hangbo Bao, Li Dong, Furu Wei, Wenhui Wang, Nan Yang, Xiaodong Liu, Yu Wang, Jianfeng Gao, Songhao Piao, Ming Zhou, et al. Unilmv2: Pseudo-masked language models for unified language model pre-training. In International Conference on Machine Learning, pages 642–652. PMLR, 2020. 5

[2] Josh Beal, Eric Kim, Eric Tzeng, Dong Huk Park, Andrew Zhai, and Dmitry Kislyuk. Toward transformer-based object detection. arXiv preprint arXiv:2012.09958, 2020. 3

[3] Irwan Bello, Barret Zoph, Ashish Vaswani, Jonathon Shlens, and Quoc V. Le. Attention augmented convolutional networks, 2020. 3

[4] Alexey Bochkovskiy, Chien-Yao Wang, and Hong-Yuan Mark Liao. Yolov4: Optimal speed and accuracy of object detection. arXiv preprint arXiv:2004.10934, 2020. 7

[5] Navaneeth Bodla, Bharat Singh, Rama Chellappa, and Larry S. Davis. Soft-nms – improving object detection with one line of code. In Proceedings of the IEEE International Conference on Computer Vision (ICCV), Oct 2017. 6, 9

[6] Zhaowei Cai and Nuno Vasconcelos. Cascade r-cnn: Delving into high quality object detection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 6154–6162, 2018. 6, 9

[7] Yue Cao, Jiarui Xu, Stephen Lin, Fangyun Wei, and Han Hu. Gcnet: Non-local networks meet squeeze-excitation networks and beyond. In Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV) Workshops, Oct 2019. 3, 6, 7, 9

[8] Nicolas Carion, Francisco Massa, Gabriel Synnaeve, Nicolas Usunier, Alexander Kirillov, and Sergey Zagoruyko. End-to-

end object detection with transformers. In European Conference on Computer Vision, pages 213–229. Springer, 2020. 3, 6, 9

[9] Kai Chen, Jiangmiao Pang, Jiaqi Wang, Yu Xiong, Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jianping Shi, Wanli Ouyang, et al. Hybrid task cascade for instance segmentation. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 4974– 4983, 2019. 6, 9

[10] Kai Chen, Jiaqi Wang, Jiangmiao Pang, Yuhang Cao, Yu Xiong, Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jiarui Xu, et al. Mmdetection: Open mmlab detection toolbox and benchmark. arXiv preprint arXiv:1906.07155, 2019. 6, 9

[11] Liang-Chieh Chen, Yukun Zhu, George Papandreou, Florian Schroff, and Hartwig Adam. Encoder-decoder with atrous separable convolution for semantic image segmentation. In Proceedings of the European conference on computer vision (ECCV), pages 801–818, 2018. 7

[12] Yihong Chen, Zheng Zhang, Yue Cao, Liwei Wang, Stephen Lin, and Han Hu. Reppoints v2: Verification meets regression for object detection. In NeurIPS, 2020. 6, 7, 9

[13] Cheng Chi, Fangyun Wei, and Han Hu. Relationnet++: Bridging visual representations for object detection via transformer decoder. In NeurIPS, 2020. 3, 7

[14] Krzysztof Marcin Choromanski, Valerii Likhosherstov, David Dohan, Xingyou Song, Andreea Gane, Tamas Sarlos, Peter Hawkins, Jared Quincy Davis, Afroz Mohiuddin, Lukasz Kaiser, David Benjamin Belanger, Lucy J Colwell, and Adrian Weller. Rethinking attention with performers. In International Conference on Learning Representations, 2021. 8, 9

[15] Xiangxiang Chu, Bo Zhang, Zhi Tian, Xiaolin Wei, and Huaxia Xia. Do we really need explicit position encodings for vision transformers? arXiv preprint arXiv:2102.10882, 2021. 3

[16] MMSegmentation Contributors. MMSegmentation: Openmmlab semantic segmentation toolbox and benchmark. https://github.com/open-mmlab/ mmsegmentation, 2020. 8, 10

[17] Ekin D Cubuk, Barret Zoph, Jonathon Shlens, and Quoc V Le. Randaugment: Practical automated data augmentation with a reduced search space. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition Workshops, pages 702–703, 2020. 9

[18] Jifeng Dai, Haozhi Qi, Yuwen Xiong, Yi Li, Guodong Zhang, Han Hu, and Yichen Wei. Deformable convolutional networks. In Proceedings of the IEEE International Conference on Computer Vision, pages 764–773, 2017. 1, 3

[19] Jia Deng, Wei Dong, Richard Socher, Li-Jia Li, Kai Li, and Li Fei-Fei. Imagenet: A large-scale hierarchical image database. In 2009 IEEE conference on computer vision and pattern recognition, pages 248–255. Ieee, 2009. 5

[20] Alexey Dosovitskiy, Lucas Beyer, Alexander Kolesnikov, Dirk Weissenborn, Xiaohua Zhai, Thomas Unterthiner, Mostafa Dehghani, Matthias Minderer, Georg Heigold, Sylvain Gelly, Jakob Uszkoreit, and Neil Houlsby. An image is

worth 16x16 words: Transformers for image recognition at scale. In International Conference on Learning Representations, 2021. 1, 2, 3, 4, 5, 6, 9

[21] Xianzhi Du, Tsung-Yi Lin, Pengchong Jin, Golnaz Ghiasi, Mingxing Tan, Yin Cui, Quoc V Le, and Xiaodan Song. Spinenet: Learning scale-permuted backbone for recognition and localization. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 11592–11601, 2020. 7

[22] Hao-Shu Fang, Jianhua Sun, Runzhong Wang, Minghao Gou, Yong-Lu Li, and Cewu Lu. Instaboost: Boosting instance segmentation via probability map guided copypasting. In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 682–691, 2019. 6, 9

[23] Jun Fu, Jing Liu, Haijie Tian, Yong Li, Yongjun Bao, Zhiwei Fang, and Hanqing Lu. Dual attention network for scene segmentation. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 3146– 3154, 2019. 3, 7

[24] Jun Fu, Jing Liu, Yuhang Wang, Yong Li, Yongjun Bao, Jinhui Tang, and Hanqing Lu. Adaptive context network for scene parsing. In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 6748–6757, 2019. 7

[25] Kunihiko Fukushima. Cognitron: A self-organizing multilayered neural network. Biological cybernetics, 20(3):121– 136, 1975. 3

[26] Golnaz Ghiasi, Yin Cui, Aravind Srinivas, Rui Qian, Tsung-Yi Lin, Ekin D Cubuk, Quoc V Le, and Barret Zoph. Simple copy-paste is a strong data augmentation method for instance segmentation. arXiv preprint arXiv:2012.07177, 2020. 2, 7

[27] Jiayuan Gu, Han Hu, Liwei Wang, Yichen Wei, and Jifeng Dai. Learning region features for object detection. In Proceedings of the European Conference on Computer Vision (ECCV), 2018. 3

[28] Kai Han, An Xiao, Enhua Wu, Jianyuan Guo, Chunjing Xu, and Yunhe Wang. Transformer in transformer. arXiv preprint arXiv:2103.00112, 2021. 3

[29] Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Gir- ´ shick. Mask r-cnn. In Proceedings of the IEEE international conference on computer vision, pages 2961–2969, 2017. 6, 9

[30] Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun. Deep residual learning for image recognition. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 770–778, 2016. 1, 2, 4

[31] Elad Hoffer, Tal Ben-Nun, Itay Hubara, Niv Giladi, Torsten Hoefler, and Daniel Soudry. Augment your batch: Improving generalization through instance repetition. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 8129–8138, 2020. 6, 9

[32] Han Hu, Jiayuan Gu, Zheng Zhang, Jifeng Dai, and Yichen Wei. Relation networks for object detection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 3588–3597, 2018. 3, 5

[33] Han Hu, Zheng Zhang, Zhenda Xie, and Stephen Lin. Local relation networks for image recognition. In Proceedings of

the IEEE/CVF International Conference on Computer Vision (ICCV), pages 3464–3473, October 2019. 2, 3, 5

[34] Gao Huang, Zhuang Liu, Laurens Van Der Maaten, and Kilian Q Weinberger. Densely connected convolutional networks. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 4700–4708, 2017. 1, 2

[35] Gao Huang, Yu Sun, Zhuang Liu, Daniel Sedra, and Kilian Q Weinberger. Deep networks with stochastic depth. In European conference on computer vision, pages 646–661. Springer, 2016. 9

[36] David H Hubel and Torsten N Wiesel. Receptive fields, binocular interaction and functional architecture in the cat’s visual cortex. The Journal of physiology, 160(1):106–154, 1962. 3

[37] Diederik P Kingma and Jimmy Ba. Adam: A method for stochastic optimization. arXiv preprint arXiv:1412.6980, 2014. 5, 9

[38] Alexander Kolesnikov, Lucas Beyer, Xiaohua Zhai, Joan Puigcerver, Jessica Yung, Sylvain Gelly, and Neil Houlsby. Big transfer (bit): General visual representation learning. arXiv preprint arXiv:1912.11370, 6(2):8, 2019. 6

[39] Alex Krizhevsky, Ilya Sutskever, and Geoffrey E Hinton. Imagenet classification with deep convolutional neural networks. In Advances in neural information processing systems, pages 1097–1105, 2012. 1, 2

[40] Yann LeCun, Leon Bottou, Yoshua Bengio, Patrick Haffner, ´ et al. Gradient-based learning applied to document recognition. Proceedings of the IEEE, 86(11):2278–2324, 1998. 2

[41] Yann LeCun, Patrick Haffner, Leon Bottou, and Yoshua Ben- ´ gio. Object recognition with gradient-based learning. In Shape, contour and grouping in computer vision, pages 319– 345. Springer, 1999. 3

[42] Tsung-Yi Lin, Piotr Dollar, Ross Girshick, Kaiming He, Bharath Hariharan, and Serge Belongie. Feature pyramid networks for object detection. In The IEEE Conference on Computer Vision and Pattern Recognition (CVPR), July 2017. 2

[43] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C Lawrence ´ Zitnick. Microsoft coco: Common objects in context. In European conference on computer vision, pages 740–755. Springer, 2014. 5

[44] Ilya Loshchilov and Frank Hutter. Decoupled weight decay regularization. In International Conference on Learning Representations, 2019. 6, 9, 10

[45] Boris T Polyak and Anatoli B Juditsky. Acceleration of stochastic approximation by averaging. SIAM journal on control and optimization, 30(4):838–855, 1992. 6, 9

[46] Siyuan Qiao, Liang-Chieh Chen, and Alan Yuille. Detectors: Detecting objects with recursive feature pyramid and switchable atrous convolution. arXiv preprint arXiv:2006.02334, 2020. 2, 7

[47] Alec Radford, Jong Wook Kim, Chris Hallacy, Aditya Ramesh, Gabriel Goh, Sandhini Agarwal, Girish Sastry, Amanda Askell, Pamela Mishkin, Jack Clark, Gretchen Krueger, and Ilya Sutskever. Learning transferable visual models from natural language supervision, 2021. 1

[48] Ilija Radosavovic, Raj Prateek Kosaraju, Ross Girshick, Kaiming He, and Piotr Dollar. Designing network design ´ spaces. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 10428– 10436, 2020. 6

[49] Colin Raffel, Noam Shazeer, Adam Roberts, Katherine Lee, Sharan Narang, Michael Matena, Yanqi Zhou, Wei Li, and Peter J. Liu. Exploring the limits of transfer learning with a unified text-to-text transformer. Journal of Machine Learning Research, 21(140):1–67, 2020. 5

[50] Prajit Ramachandran, Niki Parmar, Ashish Vaswani, Irwan Bello, Anselm Levskaya, and Jon Shlens. Stand-alone selfattention in vision models. In Advances in Neural Information Processing Systems, volume 32. Curran Associates, Inc., 2019. 2, 3

[51] Olaf Ronneberger, Philipp Fischer, and Thomas Brox. Unet: Convolutional networks for biomedical image segmentation. In International Conference on Medical image computing and computer-assisted intervention, pages 234–241. Springer, 2015. 2

[52] K. Simonyan and A. Zisserman. Very deep convolutional networks for large-scale image recognition. In International Conference on Learning Representations, May 2015. 2, 4

[53] Bharat Singh and Larry S Davis. An analysis of scale invariance in object detection snip. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 3578–3587, 2018. 2

[54] Bharat Singh, Mahyar Najibi, and Larry S Davis. Sniper: Efficient multi-scale training. In Advances in Neural Information Processing Systems, volume 31. Curran Associates, Inc., 2018. 2

[55] Aravind Srinivas, Tsung-Yi Lin, Niki Parmar, Jonathon Shlens, Pieter Abbeel, and Ashish Vaswani. Bottleneck transformers for visual recognition. arXiv preprint arXiv:2101.11605, 2021. 3

[56] Peize Sun, Rufeng Zhang, Yi Jiang, Tao Kong, Chenfeng Xu, Wei Zhan, Masayoshi Tomizuka, Lei Li, Zehuan Yuan, Changhu Wang, et al. Sparse r-cnn: End-to-end object detection with learnable proposals. arXiv preprint arXiv:2011.12450, 2020. 3, 6, 9

[57] Christian Szegedy, Wei Liu, Yangqing Jia, Pierre Sermanet, Scott Reed, Dragomir Anguelov, Dumitru Erhan, Vincent Vanhoucke, and Andrew Rabinovich. Going deeper with convolutions. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 1–9, 2015. 2

[58] Mingxing Tan and Quoc Le. Efficientnet: Rethinking model scaling for convolutional neural networks. In International Conference on Machine Learning, pages 6105–6114. PMLR, 2019. 3, 6

[59] Mingxing Tan, Ruoming Pang, and Quoc V Le. Efficientdet: Scalable and efficient object detection. In Proceedings of the IEEE/CVF conference on computer vision and pattern recognition, pages 10781–10790, 2020. 7

[60] Yi Tay, Mostafa Dehghani, Samira Abnar, Yikang Shen, Dara Bahri, Philip Pham, Jinfeng Rao, Liu Yang, Sebastian Ruder, and Donald Metzler. Long range arena : A bench-

mark for efficient transformers. In International Conference on Learning Representations, 2021. 8

[61] Ilya Tolstikhin, Neil Houlsby, Alexander Kolesnikov, Lucas Beyer, Xiaohua Zhai, Thomas Unterthiner, Jessica Yung, Andreas Steiner, Daniel Keysers, Jakob Uszkoreit, Mario Lucic, and Alexey Dosovitskiy. Mlp-mixer: An all-mlp architecture for vision, 2021. 2, 10, 11

[62] Hugo Touvron, Piotr Bojanowski, Mathilde Caron, Matthieu Cord, Alaaeldin El-Nouby, Edouard Grave, Gautier Izacard, Armand Joulin, Gabriel Synnaeve, Jakob Verbeek, and Herve J´ egou. Resmlp: Feedforward networks for image clas-´ sification with data-efficient training, 2021. 11

[63] Hugo Touvron, Matthieu Cord, Matthijs Douze, Francisco Massa, Alexandre Sablayrolles, and Herve J ´ egou. Training ´ data-efficient image transformers & distillation through attention. arXiv preprint arXiv:2012.12877, 2020. 2, 3, 5, 6, 9, 11

[64] Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser, and Illia Polosukhin. Attention is all you need. In Advances in Neural Information Processing Systems, pages 5998–6008, 2017. 1, 2, 4

[65] Jingdong Wang, Ke Sun, Tianheng Cheng, Borui Jiang, Chaorui Deng, Yang Zhao, Dong Liu, Yadong Mu, Mingkui Tan, Xinggang Wang, et al. Deep high-resolution representation learning for visual recognition. IEEE transactions on pattern analysis and machine intelligence, 2020. 3

[66] Wenhai Wang, Enze Xie, Xiang Li, Deng-Ping Fan, Kaitao Song, Ding Liang, Tong Lu, Ping Luo, and Ling Shao. Pyramid vision transformer: A versatile backbone for dense prediction without convolutions. arXiv preprint arXiv:2102.12122, 2021. 3

[67] Xiaolong Wang, Ross Girshick, Abhinav Gupta, and Kaiming He. Non-local neural networks. In IEEE Conference on Computer Vision and Pattern Recognition, CVPR 2018, 2018. 3

[68] Ross Wightman. Pytorch image models. https://github.com/rwightman/ pytorch-image-models, 2019. 6, 11

[69] Tete Xiao, Yingcheng Liu, Bolei Zhou, Yuning Jiang, and Jian Sun. Unified perceptual parsing for scene understanding. In Proceedings of the European Conference on Computer Vision (ECCV), pages 418–434, 2018. 7, 8, 10

[70] Saining Xie, Ross Girshick, Piotr Dollar, Zhuowen Tu, and ´ Kaiming He. Aggregated residual transformations for deep neural networks. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 1492– 1500, 2017. 1, 2, 3

[71] Minghao Yin, Zhuliang Yao, Yue Cao, Xiu Li, Zheng Zhang, Stephen Lin, and Han Hu. Disentangled non-local neural networks. In Proceedings of the European conference on computer vision (ECCV), 2020. 3, 7, 10

[72] Li Yuan, Yunpeng Chen, Tao Wang, Weihao Yu, Yujun Shi, Francis EH Tay, Jiashi Feng, and Shuicheng Yan. Tokensto-token vit: Training vision transformers from scratch on imagenet. arXiv preprint arXiv:2101.11986, 2021. 3

[73] Yuhui Yuan, Xilin Chen, and Jingdong Wang. Objectcontextual representations for semantic segmentation. In

16th European Conference Computer Vision (ECCV 2020), August 2020. 7

[74] Yuhui Yuan and Jingdong Wang. Ocnet: Object context network for scene parsing. arXiv preprint arXiv:1809.00916, 2018. 3

[75] Sangdoo Yun, Dongyoon Han, Seong Joon Oh, Sanghyuk Chun, Junsuk Choe, and Youngjoon Yoo. Cutmix: Regularization strategy to train strong classifiers with localizable features. In Proceedings of the IEEE/CVF International Conference on Computer Vision, pages 6023–6032, 2019. 9

[76] Sergey Zagoruyko and Nikos Komodakis. Wide residual networks. In BMVC, 2016. 1

[77] Hongyi Zhang, Moustapha Cisse, Yann N Dauphin, and David Lopez-Paz. mixup: Beyond empirical risk minimization. arXiv preprint arXiv:1710.09412, 2017. 9

[78] Hang Zhang, Chongruo Wu, Zhongyue Zhang, Yi Zhu, Zhi Zhang, Haibin Lin, Yue Sun, Tong He, Jonas Mueller, R Manmatha, et al. Resnest: Split-attention networks. arXiv preprint arXiv:2004.08955, 2020. 7, 8

[79] Shifeng Zhang, Cheng Chi, Yongqiang Yao, Zhen Lei, and Stan Z Li. Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 9759–9768, 2020. 6, 9

[80] Hengshuang Zhao, Jiaya Jia, and Vladlen Koltun. Exploring self-attention for image recognition. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 10076–10085, 2020. 3

[81] Sixiao Zheng, Jiachen Lu, Hengshuang Zhao, Xiatian Zhu, Zekun Luo, Yabiao Wang, Yanwei Fu, Jianfeng Feng, Tao Xiang, Philip HS Torr, et al. Rethinking semantic segmentation from a sequence-to-sequence perspective with transformers. arXiv preprint arXiv:2012.15840, 2020. 2, 3, 7, 8

[82] Zhun Zhong, Liang Zheng, Guoliang Kang, Shaozi Li, and Yi Yang. Random erasing data augmentation. In Proceedings of the AAAI Conference on Artificial Intelligence, volume 34, pages 13001–13008, 2020. 9

[83] Bolei Zhou, Hang Zhao, Xavier Puig, Tete Xiao, Sanja Fidler, Adela Barriuso, and Antonio Torralba. Semantic understanding of scenes through the ade20k dataset. International Journal on Computer Vision, 2018. 5, 7, 10

[84] Xizhou Zhu, Han Hu, Stephen Lin, and Jifeng Dai. Deformable convnets v2: More deformable, better results. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 9308–9316, 2019. 1, 3

[85] Xizhou Zhu, Weijie Su, Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable {detr}: Deformable transformers for end-to-end object detection. In International Conference on Learning Representations, 2021. 3
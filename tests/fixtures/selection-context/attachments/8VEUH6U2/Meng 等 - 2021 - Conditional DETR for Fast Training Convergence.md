This ICCV paper is the Open Access version, provided by the Computer Vision Foundation. Except for this watermark, it is identical to the accepted version; the final published version of the proceedings is available on IEEE Xplore.

# Conditional DETR for Fast Training Convergence

Depu Meng1\* Xiaokang Chen2\* Zejia Fan²Gang Zeng² Houqiang Li1Yuhui Yuan³Lei Sun³Jingdong Wang3+ 1University of Science and Technology of China²Peking University3Microsoft Research Asia

# Abstract

The recently-developed DETR approach applies the transformer encoder and decoder architecture to object detection and achieves promising performance. In this paper, we handle the critical issue, slow training convergence, and present a conditional cross-attention mechanism for fast DETR training. Our approach is motivated by that the cross-attention in DETR relies highly on the content embeddings for localizing the four extremities and predicting the box,which increases the need for high-quality content embeddings and thus the training difficulty.

Our approach, named conditional DETR, learns a conditional spatial query from the decoder embedding for decoder multi-head cross-attention. The benefit is that through the conditional spatial query,each cross-attention head is able to attend to a band containing a distinct region,e.g.,one object extremity or a region inside the object box. This narrows down the spatial range for localizing the distinct regions for object classification and box regression, thus relaxing the dependence on the content embeddings and easing the training. Empirical results show that conditional DETR converges $6 . 7 \times$ faster for thebackbones R50 and R101 and $1 0 \times$ faster for stronger backbones DC5-R50 and DC5-R101. Code is available at ht tps : //github.com/Atten4Vis/ConditionalDETR.

# 1. Introduction

The DEtection TRansformer (DETR) method [3] applies the transformer encoder and decoder architecture to object detection and achieves good performance. It effectively eliminates the need for many hand-crafted components, including non-maximum suppression and anchor generation.

The DETR approach suffers from slow convergence on training，and needs 5OO training epochs to get good performance. The very recent work, deformable DETR[53], handles this issue by replacing the global dense attention (self-attention and cross-attention） with deformable attention that attends to a small set of key sampling points and using the high-resolution and multi-scale encoder. Instead, we still use the global dense attention and propose an improved decoder cross-attention mechanism for accelerating the training process.

![](Images_A8BVFHT3/68bbdacb8492487e866916140440c6254e0aa76a7528b4d735a1ed307da38a79.jpg)  
Figure 1.Comparison of spatial attention weight maps for our conditional DETR-R5O with 5O training epochs (the first row),the original DETR-R5O with 5O training epochs (the second row),and the original DETR-R5O with 5OO training epochs (the third row). The maps for our conditional DETR and DETR trained with 500 epochs are able to highlight the four extremity regions satisfactorily.In contrast, the spatial attention weight maps responsible for the left and right edges (the third and fourth images in the second row) from DETR trained with 5O epochs cannot highlight the extremities satisfactorily. The green box is the ground-truth box.

Our approach is motivated by high dependence on content embeddings and minor contributions made by the spatial embeddings in cross-attention. The empirical results in DETR [3] show that if removing the positional embeddings in keys and the object queries from the second decoder layer and only using the content embeddings in keys and queries, the detection AP drops slightly1.

Figure 1 (the second row) shows that the spatial attention weight maps from the cross-attention in DETR trained with 5O epochs. One can see that two among the four maps do not correctly highlight the bands for the corresponding extremities, thus weak at shrinking the spatial range for the content queries to precisely localize the extremities. The reasons are that (i) the spatial queries,i.e., object queries, only give the general attention weight map without exploiting the specific image information; and that (ii) due to short training the content queries are not strong enough to match the spatial keys well as they are also used to match the content keys. This increases the dependence on high-quality content embeddings, thus increasing the training difficulty.

![](Images_A8BVFHT3/e341a0a8fafb07736b05d68b720113f0eff2113f9fd283b9982c6b623c62fc59.jpg)  
Figure 2. Convergence curves for conditional DETR-DC5-R50 and DETR-DC5-R50 on COCO 2017 val． The conditional DETR is trained for 50,75,108 epochs.Conditional DETR training is converged much faster than DETR.

We present a conditional DETR approach, which learns a conditional spatial embedding for each query from the corresponding previous decoder output embedding,to form a so-called conditional spatial query for decoder multi-head cross-attention． The conditional spatial query is predicted by mapping the information for regressing the object box to the embedding space,the same to the space that the 2D coordinates of the keys are also mapped to.

We empirically observe that using the spatial queries and keys,each cross-attention head spatially attends to a band containing the object extremity or a region inside the object box (Figure 1,the first row).This shrinks the spatial range for the content queries to localize the effective regions for class and box prediction. As a result, the dependence on the content embeddings is relaxed and the training is easier. The experiments show that conditional DETR converges $6 . 7 \times$ faster for the backbones R5O and R1Ol and $1 0 \times$ faster for stronger backbones DC5-R50 and DC5-R1O1. Figure 2 gives the convergence curves for conditional DETR and the original DETR [3].

# 2.Related Work

Anchor-based and anchor-free detection.Most existing object detection approaches make predictions from initial guesses that are carefully designed. There are two main initial guesses: anchor boxes or object centers. The anchor box-based methods inherit the ideas from the proposalbased method, Fast R-CNN.Example methods include Faster R-CNN [9], SSD [26], YOLOv2 [31], YOLOv3 [32], YOLOv4 [1], RetinaNet [24], Cascade R-CNN [2], Libra R-CNN [29], TSD [35] and so on.

The anchor-free detectors predict the boxes at points near the object centers. Typical methods include YOLOv1 [30], CornerNet [21]，ExtremeNet [5O],CenterNet [49，6], FCOS [39] and others [23,28,52,19,51,22, 15,46, 47].

DETR and its variants. DETR successfully applies transformers to object detection,effectively removing the need for many hand-designed components like non-maximum suppression or initial guess generation. The high computation complexity issue,caused by the global encoder selfattention,is handled in adaptive clustering transformer [48] and by sparse attentions in deformable DETR [53].

The other critical issue, slow training convergence, has been attracting a lot of recent research attention.The TSP (transformer-based set prediction) approach [37] eliminates the cross-attention modules and combines the FCOS and R-CNN-like detection heads.Deformable DETR[53] adopts deformable attention, which attends to sparse positions learned from the content embedding,to replace decoder cross-attention.

The spatially modulated co-attention (SMCA） approach [7],which is concurrent to our approach,is very close to our approach. It modulates the DETR multi-head global cross-attentions with Gaussian maps around a few (shifted） centers that are learned from the decoder embeddings,to focus more on a few regions inside the estimated box. In contrast, the proposed conditional DETR approach learns the conditional spatial queries from the decoder content embeddings,and predicts the spatial attention weight maps without human-crafting the attention attenuation,which highlight four extremities for box regression, and distinct regions inside the object for classification.

Conditional and dynamic convolution. The proposed conditional spatial query scheme is related to conditional convolutional kernel generation. Dynamic filter network [16] learns the convolutional kernels from the input, which is applied to instance segmentation in CondInst [38] and SOLOv2 [42] for learning instance-dependent convolutional kernels. CondConv [44] and dynamic convolution [4] mix convolutional kernels with the weights learned from the input. SENet [14], GENet [13] abd Lite-HRNet [45] learn from the input the channel-wise weights.

These methods learn from the input the convolutional kernel weights and then apply the convolutions to the input.In contrast, the linear projection in our approach is learned from the decoder embeddings for representing the displacement and scaling information.

Transformers. The transformer [4O] relies on the attention mechanism，self-attention and cross-attention， to draw global dependencies between the input and the output. There are several works closely related to our approach. Gaussian transformer [11] and T-GSA(Transformer with Gaussian-weighted self-attention） [18],followed by SMCA [7],attenuate the attention weights according to the distance between target and context symbols with learned or human-crafted Gaussian variance. Similar to ours,TUPE[17] computes the attention weight also from the spatial attention weight and the content attention weight. Instead,our approach mainly focuses on the attention attenuation mechanism in a learnable form other than a Gaussian function,and potentially benefits speech enhancement [18] and natural language inference [11].

# 3. Conditional DETR

# 3.1. Overview

Pipeline. The proposed approach follows detection transformer (DETR),an end-to-end object detector, and predicts all the objects at once without the need for NMS or anchor generation. The architecture consists of a CNN backbone, a transformer encoder,a transformer decoder,and object class and box position predictors.The transformer encoder aims to improve the content embeddings output from the CNN backbone. It is a stack of multiple encoder layers,where each layer mainly consists of a self-attention layer and a feed-forward layer.

The transformer decoder is a stack of decoder layers. Each decoder layer, illustrated in Figure 3,is composed of three main layers: (1) a self-attention layer for removing duplication prediction,which performs interactions between the embeddings,outputted from the previous decoder layer and used for class and box prediction,(2) a cross-attention layer, which aggregates the embeddings output from the encoder to refine the decoder embeddings for improving class and box prediction,and (3) a feed-forward layer.

Box regression.A candidate box is predicted from each decoder embedding as follows,

$$
\mathbf { b } = \mathrm { s i g m o i d } ( \mathrm { F F N } ( \mathbf { f } ) + [ \mathbf { s } ^ { \top } 0 0 ] ^ { \top } ) .
$$

Here,f is the decoder embedding.b is a four-dimensional vector $[ b _ { c x } b _ { c y } b _ { w } b _ { h } ] ^ { \top }$ ,consisting of the box center, the box width and the box height. sigmoid() is used to normalize the prediction $\mathbf { b }$ to the range $[ 0 , 1 ]$ . FFN() aims to predictthe unnormalized box.s is the unnormalized 2D coordinate of the reference point, and is $( 0 , 0 )$ in the original DETR. In our approach,we consider two choices: learn the reference point s as a parameter for each candidate box prediction, or generate it from the corresponding object query.

Category prediction.The classification score for each candidate box is also predicted from the decoder embedding through an FNN, $\mathbf { e } = \mathrm { F F N } ( \mathbf { f } )$

![](Images_A8BVFHT3/5596ecee337eb2a1cba45160609ae231f3917884bf8071dffc92712ff459bf0e.jpg)  
Figure 3.Illustrating one decoder layer in conditional DETR. The main difference from the original DETR [3] lies in the input queries and the input keys for cross-attention.The conditional spatial query is predicted from learnable 2D coordinates s and the embeddings output from the previous decoder layer, through the operations depicted in the gray-shaded box.The 2D coordinate s can be predicted from the object query (the dashed box),or simply learned as model parameters The spatial query (key) and the content query (key)are concatenated as the query (key). The resulting cross-attention is called conditional cross-attention. Same as DETR[3], the decoder layer is repeated 6 times.

Main work. The cross-attention mechanism aims to localize the distinct regions,four extremities for box detection and regions inside the box for object classification, and aggregates the corresponding embeddings. We propose a conditional cross-attention mechanism with introducing conditional spatial queries for improving the localization capability and accelerating the training process.

# 3.2.DETR Decoder Cross-Attention

The DETR decoder cross-attention mechanism takes three inputs: queries,keys and values.Each key is formed by adding a content key $\mathbf { c } _ { k }$ (the content embedding output from the encoder) and a spatial key $\mathbf { p } _ { k }$ (the positional embedding of the corresponding normalized 2D coordinate). The value is formed from the content embedding, same with the content key, output from the encoder.

In the original DETR approach,each query is formed by adding a content query $\mathbf { c } _ { q }$ (the embedding output from the decoder self-attention),and a spatial query ${ \bf p } _ { q }$ (i.e., the object query ${ \mathbf { o } } _ { q }$ ).In our implementation, there are $N = 3 0 0$ object queries, and accordingly there are $N$ queries², each query outputting a candidate detect result in one decoder layer.

The attention weight is based on the dot-product between the query and the key,used for attention weight computation,

$$
\begin{array} { r l } & { ( \mathbf { c } _ { q } + \mathbf { p } _ { q } ) ^ { \top } ( \mathbf { c } _ { k } + \mathbf { p } _ { k } ) } \\ & { = \mathbf { c } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { c } _ { q } ^ { \top } \mathbf { p } _ { k } + \mathbf { p } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { p } _ { q } ^ { \top } \mathbf { p } _ { k } } \\ & { = \mathbf { c } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { c } _ { q } ^ { \top } \mathbf { p } _ { k } + \mathbf { o } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { o } _ { q } ^ { \top } \mathbf { p } _ { k } . } \end{array}
$$

# 3.3. Conditional Cross-Attention

The proposed conditional cross-attention mechanism forms the query by concatenating the content query $\mathbf { c } _ { q }$ ,outputting from decoder self-attention,and the spatial query ${ \bf p } _ { q }$ . Accordingly, the key is formed as the concatenation of the content key $\mathbf { c } _ { k }$ and the spatial key $\mathbf { p } _ { k }$

The cross-attention weights consist of two components, content attention weight and spatial attention weight. The two weights are from two dot-products,content and spatial dot-products,

$$
\mathbf { c } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { p } _ { q } ^ { \top } \mathbf { p } _ { k } .
$$

Different from the original DETR cross-attention， our mechanism separates the roles of content and spatial queries so that spatial and content queries focus on the spatial and content attention weights, respectively.

An additional important task is to compute the spatial query ${ \bf p } _ { q }$ from the embedding f of the previous decoder layer.We first identify that the spatial information of the distinct regions are determined by the two factors together, decoder embedding and reference point. We then show how to map them to the embedding space, forming the query ${ \bf p } _ { q }$ so that the spatial query lies in the same space the 2D coordinates of the keys are mapped to.

The decoder embedding contains the displacements of the distinct regions with respect to the reference point. The box prediction process in Equation 1 consists of two steps: (1) predicting the box with respect to the reference point in the unnormalized space,and (2) normalizing the predicted box to the range $[ 0 , 1 ] ^ { 3 }$

Step（1） means that the decoder embedding f contains the displacements of the four extremities (forming the box) with respect to the reference point s in the unnormalized space.This implies that both the embedding f and the reference point s are necessary to determine the spatial information of the distinct regions, the four extremities as well as the region for predicting the classification score.

Conditional spatial query prediction. We predict the conditional spatial query from the embedding f and the reference point s,

$$
( \mathbf { s } , \mathbf { f } ) \to \mathbf { p } _ { q } ,
$$

so that it is aligned with the positional space which the normalized 2D coordinates of the keys are mapped to. The process is illustrated in the gray-shaded box area of Figure 3.

We normalize the reference point s and then map it to a 256-dimensional sinusoidal positional embedding in the same way as the positional embedding for keys:

$$
\mathbf { p } _ { s } = \mathrm { s i n u s o i d a l } ( \mathrm { s i g m o i d } ( \mathbf { s } ) ) .
$$

We then map the displacement information contained in the decoder embedding f to a linear projection in the same space through an FFN consisting of learnable linear projec$\mathrm { { t i o n + R e L U + } }$ learnable linear projection: $\mathbf { T } = \mathrm { F F N } ( \mathbf { f } )$

The conditional spatial query is computed by transforming the reference point in the embedding space: $\mathbf { p } _ { q } = \mathbf { T } \mathbf { p } _ { s }$ We choose the simple and computationally-efficient projection matrix,a diagonal matrix. The 256 diagonal elements are denoted as a vector $\lambda _ { q }$ . The conditional spatial query is computed by the element-wise multiplication:

$$
\mathbf { p } _ { q } = \mathbf { T } \mathbf { p } _ { s } = \lambda _ { q } \odot \mathbf { p } _ { s } .
$$

Multi-head cross-attention. Following DETR [3]， we adopt the standard multi-head cross-attention mechanism. Object detection usually needs to implicitly or explicitly localize the four object extremities for accurate box regression and localize the object region for accurate object classification. The multi-head mechanism is beneficial to disentangle the localization tasks.

We perform multi-head parallel attentions by projecting the queries,the keys,and the values $M \ : = \ : 8$ times with learned linear projections to low dimensions. The spatial and content queries (keys) are separately projected to each head with different linear projections. The projections for values are the same as the original DETR and are only for the contents.

# 3.4. Visualization and Analysis

Visualization. Figure 4 visualizes the attention weight maps for each head: the spatial attention weight maps, the content attention weight maps,and the combined attention weight maps. The maps are soft-max normalized over the spatial dot-products $\mathbf { p } _ { q } ^ { \top } \mathbf { p } _ { k }$ ,the content dot-products $\mathbf { c } _ { q } ^ { \top } \mathbf { c } _ { k }$ ， and the combined dot-products $\mathbf { c } _ { q } ^ { \top } \mathbf { c } _ { k } + \mathbf { p } _ { q } ^ { \top } \mathbf { p } _ { k }$ . We show 5 out of the 8 maps,and other three are the duplicates,corresponding to bottom and top extremities,and a small region inside the object $ { \mathbf { b } } _ { 0 }  { \mathbf { x } } ^ { 4 }$

![](Images_A8BVFHT3/33e19123b1eeef1cfa2d31063ada867a036a6a0958755cdf04a95a6d7e393a62.jpg)  
Figure 4.Iustratingthespatialatentionweight maps (tfrstrow),thecontentatention weight maps (thesecondow)andthe combined atentionweight maps the thirdrow）computedfromourconditional DETR.Theatention weight mapsarefrom5headsout ofthe8headsandareresponsibleforthefourextremitiesandaregioninsidetheobjectbox.Thecontent ttention weightmaps forthe fourextremitislgtsatedregosisdetexicle)osargiosiwojectistaces(ow),ndtheooing combinedatentionweightmapshighlighttheextremityegions withtheelpoftespatialatentionweightmaps.Tecombinedetion weightmapfortheregionisidethebjectboxmainlydependsonthespatialtentionweightmap,whichimpliesthatthreprtation ofaregioninside theobjectmightencode enoughclassinformation.The mapsarefromconditionalDETR-R50trainedwith5Oepochs.

We can see that the spatial attention weight map at each head is able to localize a distinct region, a region containing one extremity or a region inside the object box.It is interesting that each spatial attention weight map corresponding to an extremity highlights a spatial band that overlaps with the corresponding edge of the object box. The other spatial attention map for the region inside the object box merely highlights a small region whose representations might already encode enough information for object classification.

The content attention weight maps of the four heads corresponding to the four extremities highlight scattered regions in addition to the extremities. The combination of the spatial and content maps filters out other highlights and keeps extremity highlights for accurate box regression.

Comparison to DETR.Figure 1 shows the spatial attention weight maps of our conditional DETR (the first row) and the original DETR trained with 5O epochs (the second row). The maps of our approach are computed by soft-max normalizing the dot-products between spatial keys and queries, $\mathbf { p } _ { q } ^ { \top } \mathbf { p } _ { \mathbf { k } }$ . The maps for DETR are computed by soft-max normalizing the dot-products with the spatial keys, $\left( \mathbf { o } _ { q } + \mathbf { c } _ { q } \right) ^ { \top } \mathbf { p } _ { k }$

It can be seen that our spatial attention weight maps accurately localize the distinct regions,four extremities. In contrast, the maps from the original DETR with 5O epochs can not accurately localize two extremities, and 5OO training epochs (the third row） make the content queries stronger, leading to accurate localization. This implies that it is really hard to learn the content query $\mathbf { c } _ { q }$ to serve as two roles5: match the content key and the spatial key simultaneously, and thus more training epochs are needed.

Analysis. The spatial attention weight maps shown in Figure 4 imply that the conditional spatial query, used to form the spatial query, have at least two effects. (i) Translate the highlight positions to the four extremities and the position inside the object box:interestingly the highlighted positions are spatially similarly distributed in the object box. (ii) Scale the spatial spread for the extremity highlights: large spread for large objects and small spread for small objects.

The two effects are realized in the spatial embedding space through applying the transformation $\mathbf { T }$ over $\mathbf { p } _ { s }$ (further disentangled through image-independent linear projections contained in cross-attention and distributed to each head).This indicates that the transformation $\mathbf { T }$ not only contains the displacements as discussed before,but also the object scale.

# 3.5.Implementation Details

Architecture. Our architecture is almost the same with the DETR architecture [3] and contains the CNN backbone, transformer encoder, transformer decoder, prediction feedforward networks (FFNs) following each decoder layer (the last decoder layer and the 5 internal decoder layers) with parameters shared among the 6 prediction FFNs. The hyperparameters are the same as DETR.

The main architecture difference is that we introduce the conditional spatial embeddings as the spatial queries for conditional multi-head cross-attention and that the spatial query (key) and the content query (key) are combined through concatenation other than addition.In the first crossattention layer there are no decoder content embeddings, we make simple changes based on the DETR implementation [3]: concatenate the positional embedding predicted from the object query (the positional embedding) into the original query (key).

Table 1. Comparison of conditional DETR with DETR on COCO $2 0 1 7 ~ \mathrm { v a l }$ . Our conditional DETR approach for high-resolution backbones DC5-R50 and DC5-R101 is $1 0 \times$ faster than the original DETR,and for low-resolution backbones R5O and R101 $6 . 6 7 \times$ faster. ConditionalDETRisempiricallysuperiortoothertwosingle-scaleDETRvariants.\*TheresultsofdeformableDETRarefromtheGitHub repository provided by the authors of deformable DETR [53].   

<table><tr><td>Model</td><td>#epochs</td><td>GFLOPs</td><td>#params (M)</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td></tr><tr><td>DETR-R50</td><td>500</td><td>86</td><td>41</td><td>42.0</td><td>62.4</td><td>44.2</td><td>20.5</td><td>45.8</td><td>61.1</td></tr><tr><td>DETR-R50</td><td>50</td><td>86</td><td>41</td><td>34.9</td><td>55.5</td><td>36.0</td><td>14.4</td><td>37.2</td><td>54.5</td></tr><tr><td>Conditional DETR-R50</td><td>50</td><td>90</td><td>44</td><td>40.9</td><td>61.8</td><td>43.3</td><td>20.8</td><td>44.6</td><td>59.2</td></tr><tr><td>Conditional DETR-R50</td><td>75</td><td>90</td><td>44</td><td>42.1</td><td>62.9</td><td>44.8</td><td>21.6</td><td>45.4</td><td>60.2</td></tr><tr><td>Conditional DETR-R50</td><td>108</td><td>90</td><td>44</td><td>43.0</td><td>64.0</td><td>45.7</td><td>22.7</td><td>46.7</td><td>61.5</td></tr><tr><td>DETR-DC5-R50</td><td>500</td><td>187</td><td>41</td><td>43.3</td><td>63.1</td><td>45.9</td><td>22.5</td><td>47.3</td><td>61.1</td></tr><tr><td>DETR-DC5-R50</td><td>50</td><td>187</td><td>41</td><td>36.7</td><td>57.6</td><td>38.2</td><td>15.4</td><td>39.8</td><td>56.3</td></tr><tr><td>Conditional DETR-DC5-R50</td><td>50</td><td>195</td><td>44</td><td>43.8</td><td>64.4</td><td>46.7</td><td>24.0</td><td>47.6</td><td>60.7</td></tr><tr><td>Conditional DETR-DC5-R50</td><td>75</td><td>195</td><td>44</td><td>44.5</td><td>65.2</td><td>47.3</td><td>24.4</td><td>48.1</td><td>62.1</td></tr><tr><td>Conditional DETR-DC5-R50</td><td>108</td><td>195</td><td>44</td><td>45.1</td><td>65.4</td><td>48.5</td><td>25.3</td><td>49.0</td><td>62.2</td></tr><tr><td>DETR-R101</td><td>500</td><td>152</td><td>60</td><td>43.5</td><td>63.8</td><td>46.4</td><td>21.9</td><td>48.0</td><td>61.8</td></tr><tr><td>DETR-R101</td><td>50</td><td>152</td><td>60</td><td>36.9</td><td>57.8</td><td>38.6</td><td>15.5</td><td>40.6</td><td>55.6</td></tr><tr><td>Conditional DETR-R101</td><td>50</td><td>156</td><td>63</td><td>42.8</td><td>63.7</td><td>46.0</td><td>21.7</td><td>46.6</td><td>60.9</td></tr><tr><td>Conditional DETR-R101</td><td>75</td><td>156</td><td>63</td><td>43.7</td><td>64.9</td><td>46.8</td><td>23.3</td><td>48.0</td><td>61.7</td></tr><tr><td>Conditional DETR-R101</td><td>108</td><td>156</td><td>63</td><td>44.5</td><td>65.6</td><td>47.5</td><td>23.6</td><td>48.4</td><td>63.6</td></tr><tr><td>DETR-DC5-R101</td><td>500</td><td>253</td><td>60</td><td>44.9</td><td>64.7</td><td>47.7</td><td>23.7</td><td>49.5</td><td>62.3</td></tr><tr><td>DETR-DC5-R101</td><td>50</td><td>253</td><td>60</td><td>38.6</td><td>59.7</td><td>40.7</td><td>17.2</td><td>42.2</td><td>57.4</td></tr><tr><td>Conditional DETR-DC5-R101</td><td>50</td><td>262</td><td>63</td><td>45.0</td><td>65.5</td><td>48.4</td><td>26.1</td><td>48.9</td><td>62.8</td></tr><tr><td>Conditional DETR-DC5-R101</td><td>75</td><td>262</td><td>63</td><td>45.6</td><td>66.5</td><td>48.8</td><td>25.5</td><td>49.7</td><td>63.3</td></tr><tr><td>Conditional DETR-DC5-R101</td><td>108</td><td>262</td><td>63</td><td>45.9</td><td>66.8</td><td>49.5</td><td>27.2</td><td>50.3</td><td>63.3</td></tr><tr><td colspan="10">Other single-scale DETR variants</td></tr><tr><td>Deformable DETR-R50-SS *</td><td>50</td><td>78</td><td>34</td><td>39.4</td><td>59.6</td><td>42.3</td><td>20.6</td><td>43.0</td><td>55.5</td></tr><tr><td>UP-DETR-R50 [5]</td><td>150</td><td>86</td><td>41</td><td>40.5</td><td>60.8</td><td>42.6</td><td>19.0</td><td>44.4</td><td>60.0</td></tr><tr><td>UP-DETR-R50 [5]</td><td>300</td><td>86</td><td>41</td><td>42.8</td><td>63.0</td><td>45.3</td><td>20.8</td><td>47.1</td><td>61.7</td></tr><tr><td>Deformable DETR-DC5-R50-SS *</td><td>50</td><td>128</td><td>34</td><td>41.5</td><td>61.8</td><td>44.9</td><td>24.1</td><td>45.3</td><td>56.0</td></tr></table>

Reference points. In the original DETR approach, $\mathrm { ~ \bf ~ s ~ } =$ $[ 0 ~ 0 ] ^ { \top }$ is the same for all the decoder embeddings. We study two ways forming the reference points: regard the unnormalized 2D coordinates as learnable parameters,and the unnormalized 2D coordinate predicted from the object query ${ \mathbf { o } } _ { q }$ ．In the latter way that is similar to deformable DETR [53], the prediction unit is an FFN and consists of learnable linear projection $+ { \mathrm { ~ R e L U ~ } } +$ learnable linear projection: $\mathbf { s } = \mathrm { F F N } ( \mathbf { o } _ { q } )$ . When used for forming the conditional spatial query, the 2D coordinates are normalized by the sigmoid function.

Loss function.We follow DETR [3] to find an optimal bipartite matching [2O] between the predicted and groundtruth objects using the Hungarian algorithm,and then form the loss function for computing and back-propagate the gradients. We use the same way with deformable DETR [53] to formulate the loss: the same matching cost function, the same loss function with 3OO object queries,and the same trade-off parameters; The classification loss function is focal loss [24],and the box regression loss (including L1 and GIoU [34] loss) is the same as DETR [3].

# 4. Experiments

# 4.1. Setting

Dataset.We perform the experiments on the COCO 2017 [25] detection dataset. The dataset contains about 118K training images and 5K validation (val) images.

Training. We follow the DETR training protocol [3]. The backbone is the ImageNet-pretrained model from TORCHVISION with batchnorm layers fixed,and the transformer parameters are initialized using the Xavier initialization scheme [1O]. The weight decay is set to be $1 0 ^ { - 4 }$ The AdamW [27] optimizer is used. The learning rates for the backbone and the transformer are initially set to be $1 0 ^ { - 5 }$ and $1 0 ^ { - 4 }$ ,respectively. The dropout rate in transformer is O.1.The learning rate is dropped by a factor of 1O after 40 epochs for 5O training epochs,after 6O epochs for 75 training epochs,and after 80 epochs for 1O8 training epochs.

We use the augmentation scheme same as DETR[3]: resize the input image such that the short side is at least 480 and at most 8OO pixels and the long size is at most 1333 pixels; randomly crop the image such that a training image is cropped with probability O.5 to a random rectangular patch.

Table2.Resultsforulti-saleandhigheresolutionDETRvariants.Wedonotexpectthatourapproachperforsonparasourpproach (single-scale, $1 6 \times$ resolution) does not use a strong multi-scale or $8 \times$ resolution encoder. Surprisingly, the AP scores of our approach with DC5-R5O and DC5-R1O1 are close to the two multi-scale and higher-resolution DETR variants.   

<table><tr><td>Model</td><td>#epochs</td><td>GFLOPs</td><td>#params (M)</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td></tr><tr><td>Faster RCNN-FPN-R50 [33]</td><td>36</td><td>180</td><td>42</td><td>40.2</td><td>61.0</td><td>43.8</td><td>24.2</td><td>43.5</td><td>52.0</td></tr><tr><td>Faster RCNN-FPN-R50 [33]</td><td>108</td><td>180</td><td>42</td><td>42.0</td><td>62.1</td><td>45.5</td><td>26.6</td><td>45.5</td><td>53.4</td></tr><tr><td>Deformable DETR-R50 [53]</td><td>50</td><td>173</td><td>40</td><td>43.8</td><td>62.6</td><td>47.7</td><td>26.4</td><td>47.1</td><td>58.0</td></tr><tr><td>TSP-FCOS-R50 [37]</td><td>36</td><td>189</td><td>1</td><td>43.1</td><td>62.3</td><td>47.0</td><td>26.6</td><td>46.8</td><td>55.9</td></tr><tr><td>TSP-RCNN-R50 [37]</td><td>36</td><td>188</td><td>1</td><td>43.8</td><td>63.3</td><td>48.3</td><td>28.6</td><td>46.9</td><td>55.7</td></tr><tr><td>TSP-RCNN-R50 [37]</td><td>96</td><td>188</td><td>二</td><td>45.0</td><td>64.5</td><td>49.6</td><td>29.7</td><td>47.7</td><td>58.0</td></tr><tr><td>Conditional DETR-DC5-R50</td><td>50</td><td>195</td><td>44</td><td>43.8</td><td>64.4</td><td>46.7</td><td>24.0</td><td>47.6</td><td>60.7</td></tr><tr><td>Conditional DETR-DC5-R50</td><td>108</td><td>195</td><td>44</td><td>45.1</td><td>65.4</td><td>48.5</td><td>25.3</td><td>49.0</td><td>62.2</td></tr><tr><td>Faster RCNN-FPN-R101[33]</td><td>36</td><td>246</td><td>60</td><td>42.0</td><td>62.5</td><td>45.9</td><td>25.2</td><td>45.6</td><td>54.6</td></tr><tr><td>Faster RCNN-FPN-R101 [33]</td><td>108</td><td>246</td><td>60</td><td>44.0</td><td>63.9</td><td>47.8</td><td>27.2</td><td>48.1</td><td>56.0</td></tr><tr><td>TSP-FCOS-R101 [37]</td><td>36</td><td>255</td><td>1</td><td>44.4</td><td>63.8</td><td>48.2</td><td>27.7</td><td>48.6</td><td>57.3</td></tr><tr><td>TSP-RCNN-R101 [37]</td><td>36</td><td>254</td><td>1</td><td>44.8</td><td>63.8</td><td>49.2</td><td>29.0</td><td>47.9</td><td>57.1</td></tr><tr><td>TSP-RCNN-R101 [37]</td><td>96</td><td>254</td><td>二</td><td>46.5</td><td>66.0</td><td>51.2</td><td>29.9</td><td>49.7</td><td>59.2</td></tr><tr><td>Conditional DETR-DC5-R101</td><td>50</td><td>262</td><td>63</td><td>45.0</td><td>65.5</td><td>48.4</td><td>26.1</td><td>48.9</td><td>62.8</td></tr><tr><td>Conditional DETR-DC5-R101</td><td>108</td><td>262</td><td>63</td><td>45.9</td><td>66.8</td><td>49.5</td><td>27.2</td><td>50.3</td><td>63.3</td></tr></table>

Evaluation.We use the standard COCO evaluation． We report the average precision (AP),and the AP scores at 0.50, 0.75 and for the small, medium,and large objects.

# 4.2. Results

Comparison to DETR. We compare the proposed conditional DETR to the original DETR[3]. We follow [3] and report the results over four backbones: ResNet-50 [12], ResNet-1O1,and their $1 6 \times$ -resolution extensions DC5- ResNet-50 and DC5-ResNet-101.

The corresponding DETR models are named as DETRR50，DETR-R101，DETR-DC5-R50，and DETR-DC5- R101,respectively. Our models are named as conditional DETR-R5O,conditional DETR-R1O1,conditional DETRDC5-R50,and conditional DETR-DC5-R101, respectively.

Table 1 presents the results from DETR and conditional DETR.DETR with 5O training epochs performs much worse than 5OO training epochs. Conditional DETR with 50 training epochs for R5O and R1O1 as the backbones performs slightly worse than DETR with 5OO training epochs. Conditional DETR with 5O training epochs for DC5-R50 and DC5-R101 performs similarly as DETR with 5OO training epochs.Conditional DETR for the four backbones with 75/108 training epochs performs better than DETR with 500 training epochs. In summary,conditional DETR for high-resolution backbones DC5-R50 and DC5-R101 is $1 0 \times$ faster than the original DETR,and for low-resolution backbones R5O and R101 $6 . 6 7 \times$ faster. In other words,conditional DETR performs better for stronger backbones with better performance.

In addition,we report the results of single-scale DETR extensions: deformable DETR-SS [53] and UP-DETR [5] in Table 1． Our results over R5O and DC5-R5O are better than deformable DETR-SS: 40.9 vs. 39.4 and 43.8 vs. 41.5.The comparison might not be fully fair as for example parameter and computation complexities are different, but it implies that the conditional cross-attention mechanism is beneficial. Compared to UP-DETR-R5O,our results with fewer training epochs are obviously better.

Comparison to multi-scale and higher-resolution DETR variants. We focus on accelerating the DETR training, without addressing the issue of high computational complexity in the encoder. We do not expect that our approach achieves on par with DETR variants w/ multi-scale attention and $8 \times$ -resolution encoders, e.g., TSP-FCOS and TSPRCNN [37] and deformable DETR [53], which are able to reduce the encoder computational complexity and improve the performance due to multi-scale and higher-resolution.

The comparisons in Table 2 surprisingly show that our approach on DC5-R50 $( 1 6 \times )$ performs same as deformable DETR-R50 (multi-scale, $8 \times$ ).Considering that the AP of the single-scale deformable DETR-DC5-R50-SS is 41.5 (lower than ours 43.8) (Table 1)，one can see that deformable DETR benefits a lot from the multi-scale and higher-resolution encoder that potentially benefit our approach,which is currently not our focus and left as our future work.

The performance of our approach is also on par with TSP-FCOS and TSP-RCNN. The two methods contain a transformer encoder over a small number of selected positions/regions (feature of interest in TSP-FCOS and region proposals in TSP-RCNN) without using the transformer decoder, are extensions of FCOS [39] and Faster RCNN [33]. It should be noted that position/region selection removes unnecessary computation in self-attention and reduces computation complexity dramatically.

Table 3.Ablation study for the ways forming the conditional spatial query. $\mathrm { C S Q } =$ our proposed conditional spatial query scheme. Please see the first two paragraphs in Section 5.3 for the meanings of CSQ variants. Our proposed CSQ manner performs better. The backbone ResNet-50 is adopted.   

<table><tr><td rowspan=1 colspan=1>Exp.</td><td rowspan=1 colspan=1>CSQ-C</td><td rowspan=1 colspan=1>CSQ-T</td><td rowspan=1 colspan=1>CSQ-P</td><td rowspan=1 colspan=1>CSQ-I</td><td rowspan=1 colspan=1>CSQ</td></tr><tr><td rowspan=1 colspan=1>GFLOPs</td><td rowspan=1 colspan=1>89.3</td><td rowspan=1 colspan=1>89.5</td><td rowspan=1 colspan=1>89.3</td><td rowspan=1 colspan=1>89.5</td><td rowspan=1 colspan=1>89.5</td></tr><tr><td rowspan=1 colspan=1>AP</td><td rowspan=1 colspan=1>37.1</td><td rowspan=1 colspan=1>37.6</td><td rowspan=1 colspan=1>37.8</td><td rowspan=1 colspan=1>40.2</td><td rowspan=1 colspan=1>40.9</td></tr></table>

# 4.3. Ablations

Reference points. We compare three ways of forming reference points s: (i) $\mathbf { s } = ( 0 , 0 )$ , same to the original DETR, (ii) learn s as model parameters and each prediction is associated with different reference points,and (ii） predict each reference point s from the corresponding object query. We conducted the experiments with ResNet-5O as the backbone. The AP scores are 36.8, 40.7,and 40.9, suggesting that (ii) and (ii) perform on par and better than (i).

The effect of the way forming the conditional spatial query. We empirically study how the transformation $\lambda _ { q }$ and the positional embedding $\mathbf { p } _ { s }$ of the reference point, used to form the conditional spatial query $\mathbf { p } _ { q } = \lambda _ { q } \odot \mathbf { p } _ { s }$ ，make contributions to the detection performance.

We report the results of our conditional DETR,and the other ways forming the spatial query with: (i) CsQ-P - only the positional embedding $\mathbf { p } _ { s }$ , (ii) CSQ-T - only the transformation $\lambda _ { q }$ , (iii) CSQ-C - the decoder content embedding f, and (iv) CSQ-I - the element-wise product of the transformation predicted from the decoder self-attention output $\mathbf { c } _ { q }$ and the positional embedding $\mathbf { p } _ { s }$ . The studies in Table 3 imply that our proposed way (CsQ) performs overall the best, validating our analysis about the transformation predicted from the decoder embedding and the positional embedding of the reference point in Section 3.3.

Focal loss and offset regression with respect to learned reference point.Our approach follows deformable DETR [53]: use the focal loss with 30O object queries to form the classification loss and predict the box center by regressing the offset with respect to the reference point. We report how the two schemes affect the DETR performance in Table 4. One can see that separately using the focal loss or center offset regression without learning referecence points leads to a slight AP gain and combining them together leads to a larger AP gain. Conditional crossattention in our approach built on the basis of focal loss and offset regression brings a major gain 4.0.

The effect of linear projections T forming the transformation. Predicting the conditional spatial query needs to learn the linear projection $\mathbf { T }$ from the decoder embedding (see Equation 6). We empirically study how the linear projection forms affect the performance.The linear projection forms include: an identity matrix that means not to learn the linear projection,a single scalar, a block diagonal matrix meaning that each head has a learned $3 2 \times 3 2$ linear projection matrix,a full matrix without constraints,and a diagonal matrix.Figure 5 presents the results. It is interesting that a single-scalar helps improve the performance, maybe due to narrowing down the spatial range to the object area. Other three forms, block diagonal,full,and diagonal (ours), perform on par.

Table 4.The empirical results about the focal loss (FL),offset regression(OR) for box center prediction,and our conditional spatial query (CSQ). The backbone ResNet-50 is adopted.   

<table><tr><td>OR</td><td>FL</td><td>CSQ</td><td>GFLOPs</td><td>AP</td></tr><tr><td rowspan="3">√</td><td></td><td rowspan="3"></td><td>85.5</td><td>34.9</td></tr><tr><td></td><td>85.5</td><td>35.0</td></tr><tr><td></td><td>88.1</td><td>35.3</td></tr><tr><td>√</td><td>√</td><td></td><td>88.1</td><td>36.9</td></tr><tr><td>√</td><td>√</td><td>√</td><td>89.5</td><td>40.9</td></tr></table>

![](Images_A8BVFHT3/5a539b10ec01460e01ef02b0eda077256688bb7d5973e1851e917a0bd82e6491.jpg)  
Figure 5.The empirical results for different forms of linear projections that are used to compute the spatial queries for conditional multi-head cross-attention. Diagonal (ours),Full,and Block perform on par. The backbone ResNet-5O is adopted.

# 5. Conclusion

We present a simple conditional cross-attention mechanism. The key is to learn a spatial query from the corresponding reference point and decoder embedding. The spatial query contains the spatial information mined for the class and box prediction in the previous decoder layer, and leads to spatial attention weight maps highlighting the bands containing extremities and small regions inside the object box.This shrinks the spatial range for the content query to localize the distinct regions,thus relaxing the dependence on the content query and reducing the training difficulty. In the future,we will study the proposed conditional cross-attention mechanism for human pose estimation [8, 41, 36] and line segment detection [43].

Acknowledgments.We thank the anonymous reviewers for their insightful comments and suggestions on our manuscript. This work is supported by the National Key Research and Development Program of China (2O17YFB1002601),National Natural Science Foundation of China (61375022,61403005,61632003,61836011, 620210O1),Beijing Advanced Innovation Center for Intelligent Robots and Systems (2O18IRS11),and PEK-SenseTime Joint Laboratory of Machine Vision.

# References

[1] AlexeyBochkovskiy， Chien-Yao Wang，and HongYuan Mark Liao. Yolov4: Optimal speed and accuracy of object detection. CoRR,abs/2004.10934,2020.2   
[2] Zhaowei Cai and Nuno Vasconcelos. Cascade R-CNN: delving into high quality object detection. In CVPR,2018.2   
[3] Nicolas Carion,Francisco Massa,Gabriel Synnaeve,Nicolas Usunier,Alexander Kirillov,and Sergey Zagoruyko. End-toend object detection with transformers.In ECCV,2020.1, 2,3,4,5,6,7   
[4] Yinpeng Chen， Xiyang Dai, Mengchen Liu, Dongdong Chen,Lu Yuan,and Zicheng Liu. Dynamic convolution: Attention over convolution kernels. In CVPR,2020.2   
[5] Zhigang Dai, Bolun Cai, Yugeng Lin,and Junying Chen. UP-DETR:unsupervised pre-training for object detection with transformers.CoRR,abs/2011.09094,2020.6,7   
[6] Kaiwen Duan, Song Bai, Lingxi Xie, Honggang Qi, Qingming Huang,and Qi Tian. Centernet: Keypoint triplets for object detection. In ICCV,2019.2   
[7] Peng Gao,Minghang Zheng,Xiaogang Wang,Jifeng Dai, and Hongsheng Li. Fast convergence of DETR with spatially modulated co-attention. CoRR,abs/2101.07448,2021.2,3   
[8] Zigang Geng,Ke Sun, Bin Xiao,Zhaoxiang Zhang,and Jingdong Wang. Bottom-up human pose estimation via disentangled keypoint regression. In CVPR, pages 14676-14686, June 2021. 8   
[9] Ross B.Girshick. Fast R-CNN.In ICCV,2015.2   
[10] Xavier Glorot and Yoshua Bengio.Understanding the difficulty of training deep feedforward neural networks.In AISTATS,2010.6   
[11] Maosheng Guo,Yu Zhang,and Ting Liu.Gaussian transformer: A lightweight approach for natural language inference. In AAAI, 2019.3   
[12] Kaiming He,Xiangyu Zhang, Shaoqing Ren,and Jian Sun. Deep residual learning for image recognition.In CVPR, 2016.7   
[13] Jie Hu, Li Shen, Samuel Albanie,Gang Sun,and Andrea Vedaldi. Gather-excite: Exploiting feature context in convolutional neural networks. In NeurIPS,2018.2   
[14] Jie Hu,Li Shen,and Gang Sun. Squeeze-and-excitation networks.In CVPR,2018.2   
[15] Lichao Huang,Yi Yang, Yafeng Deng,and Yinan Yu. Densebox:Unifying landmark localization with end to end object detection. CoRR,abs/1509.04874,2015.2   
[16] Xu Jia, Bert De Brabandere,Tinne Tuytelaars,and Luc Van Gool.Dynamic filter networks. In NeurIPS,2016.2   
[17] Guolin Ke,Di He,and Tie-Yan Liu. Rethinking positional encoding in language pre-training. CoRR,abs/20o6.15595, 2020.3   
[18] Jaeyoung Kim, Mostafa El-Khamy, and Jungwon Lee. TGSA: transformer with gaussian-weighted self-attention for speech enhancement. In ICASSP,2020.3   
[19] Tao Kong,Fuchun Sun,Huaping Liu, Yuning Jiang,and Jianbo Shi． Foveabox:Beyond anchor-based object detector. CoRR,abs/1904.03797,2019.2   
[20] Harold W.Kuhn. The hungarian method for the assignment problem. Naval Research Logistics Quarterly,1995.6   
[Z1] Hel Law ana jia Deng.Cornernet: Detecung opjects as paired keypoints.In ECCV,2018.2   
[22] Hei Law,Yun Teng, Olga Russakovsky，and Jia Deng. Cornernet-lite: Efficient keypoint based object detection. In BMVC.BMVA Press,2020.2   
[23] Yanghao Li, Yuntao Chen,Naiyan Wang,and Zhaoxiang Zhang.Scale-aware trident networks for object detection. In ICCV, pages 6054-6063,2019. 2   
[24] Tsung-Yi Lin,Priya Goyal, Ross B.Girshick, Kaiming He, and Piotr Dollar.Focal loss for dense object detection. TPAMI,2020. 2, 6   
[25] Tsung-Yi Lin,Michael Maire,Serge J.Belongie,James Hays,Pietro Perona,Deva Ramanan,Piotr Dollar,and C.Lawrence Zitnick. Microsoft COCO: common objects in context. In ECCV,2014. 6   
[26] Wei Liu,Dragomir Anguelov,Dumitru Erhan,Christian Szegedy, Scott E. Reed, Cheng-Yang Fu,and Alexander C. Berg. SSD: single shot multibox detector.In ECCV,2016.2   
[27] Ilya Loshchilov and Frank Huter.Fixing weight decay regularization in adam. In ICLR, 2017.6   
[28] Xin Lu,Buyu Li, Yuxin Yue, Quanquan Li,and Junjie Yan. Grid R-CNN. In CVPR,2019.2   
[29] Jiangmiao Pang，Kai Chen,Jianping Shi, Huajun Feng, Wanli Ouyang,and Dahua Lin. Libra R-CNN: towards balanced learning for object detection. In CVPR,2019. 2   
[30] Joseph Redmon, Santosh Kumar Divvala, Ross B.Girshick, and Ali Farhadi. You only look once: Unified,real-time object detection. In CVPR,2016.2   
[31] Joseph Redmon and Ali Farhadi. YOLO90OO: beter, faster, stronger.In CVPR,2017.2   
[32] Joseph Redmon and Ali Farhadi. Yolov3: An incremental improvement. CoRR,abs/1804.02767,2018.2   
[33] Shaoqing Ren, Kaiming He, Ross B. Girshick,and Jian Sun. Faster R-CNN: towards real-time object detection with region proposal networks. TPAMI,2017.7   
[34] Hamid Rezatofighi,Nathan Tsoi, JunYoung Gwak,Amir Sadeghian,IanD.Reid,and Silvio Savarese．Generalized intersection over union: A metric and a loss for bounding box regression. In CVPR, 2019. 6   
[35] Guanglu Song, Yu Liu, and Xiaogang Wang. Revisiting the sibling head in object detector.In CVPR,2020.2   
[36] Ke Sun, Bin Xiao,Dong Liu,and Jingdong Wang.Deep high-resolution representation learning for human pose estimation. In CVPR,pages 5693-5703,2019.8   
[37] Zhiqing Sun, Shengcao Cao, Yiming Yang,and Kris Kitani. Rethinking transformer-based set prediction for object detection. CoRR,abs/2011.10881,2020. 2,7   
[38] Zhi Tian,Chunhua Shen,and Hao Chen.Conditional convolutions for instance segmentation.In ECCV,2020.2   
[39] Zhi Tian, Chunhua Shen,Hao Chen,and Tong He. FCOS: fully convolutional one-stage object detection.In ICCV, 2019. 2,7   
[40] Ashish Vaswani,Noam Shazeer,Niki Parmar,Jakob Uszkoreit,Llion Jones,Aidan N. Gomez,Lukasz Kaiser,and Illia Polosukhin. Attention is all you need. In NeurIPS,2017.2   
[41] Jingdong Wang, Ke Sun,Tianheng Cheng，Borui Jiang, Chaorui Deng,Yang Zhao,Dong Liu, Yadong Mu,Mingkui Tan, Xinggang Wang,Wenyu Liu,and Bin Xiao.Deep high-resolution representation learning for visual recognition. TPAMI,2019.8   
[42] Xinlong Wang,Rufeng Zhang,Tao Kong,Lei Li,and Chunhua Shen. Solov2: Dynamic and fast instance segmentation. In NeurIPS,2020.2   
[43] Yifan Xu,Weijian Xu,David Cheung,and Zhuowen Tu. Line segment detection using transformers without edges. In CVPR, pages 4257-4266, June 2021. 8   
[44] Brandon Yang,Gabriel Bender,Quoc V.Le,and Jiquan Ngiam. Condconv: Conditionally parameterized convolutions for effcient inference.In NeurIPS,2019.2   
[45] Changqian Yu,Bin Xiao,Changxin Gao,Lu Yuan,Lei Zhang,Nong Sang,and Jingdong Wang.Lite-hrnet:A lightweight high-resolution network.In CVPR，pages 10440-10450,June 2021.2   
[46] Jiahui Yu, Yuning Jiang, Zhangyang Wang,Zhimin Cao,and Thomas S. Huang. Unitbox: An advanced object detection network. In MM,2016.2   
[47] Shifeng Zhang,Cheng Chi, Yongqiang Yao, Zhen Lei,and Stan Z.Li. Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. In CVPR,2020.2   
[48] Minghang Zheng, Peng Gao, Xiaogang Wang, Hongsheng Li,and Hao Dong. End-to-end object detection with adaptive clustering transformer. CoRR,abs/2011.09315,2020.2   
[49] Xingyi Zhou, Dequan Wang,and Philipp Krähenbuhl. Objects as points.CoRR,abs/1904.07850,2019.2   
[50] Xingyi Zhou，Jiacheng Zhuo，and Philipp Krahenbuhl. Botom-up object detection by grouping extreme and center points.In CVPR,2019.2   
[51] Chenchen Zhu,Fangyi Chen,Zhiqiang Shen,and Marios Savvides. Soft anchor-point object detection.In ECCV, 2020.2   
[52] Chenchen Zhu, Yihui He,and Marios Savvides.Feature selective anchor-free module for single-shot object detection. In CVPR,2019.2   
[53] Xizhou Zhu, Weijie Su,Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable DETR:deformable transformers for end-to-end object detection. CoRR,abs/2010.04159, 2020. 1,2, 6, 7,8
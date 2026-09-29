# 照片实景深度预览

`/real/` 是独立的照片预览页，供评估视觉效果；原主页保留。它使用原始照片的颜色和 AI 推测的深度，只允许在拍摄视点附近小幅移动。当前成果不是多视图实景扫描，也不是训练得到的 3D Gaussian Splatting 模型。

## 技术依据与边界

使用 [Depth Anything V2 Small](https://github.com/DepthAnything/Depth-Anything-V2) 在本地 CPU 上离线估计深度，再将照片像素反投影到网格。浏览器加载预计算数据，无需下载或运行 AI 模型。

- 每张照片对应独立点位，未求解照片之间的相机位姿，不拼接成统一的村庄模型。
- 模型输出为相对深度；显示用的尺度、深度映射和相机参数是估计值，不能据此测量米制距离或建筑尺寸。
- 照片没有记录的背面和遮挡区域无法还原。移动过大会出现空洞、拉伸或边缘分离，因此限制相机移动范围。
- 栏杆、树叶、反光玻璃等细节可能被错误分层。保留原图对照，以便区分照片事实与 AI 推测。

维护时应检查原始视点的颜色和构图，并逐张检查小幅平移后的边缘与遮挡效果；不能仅凭深度图看起来有层次就认定几何正确。

## 重现深度数据

准备官方 Depth Anything V2 源码、Small (`vits`) 权重及兼容的 PyTorch、Torchvision、OpenCV、NumPy 环境后，在项目根目录运行：

```sh
python scripts/generate-depth.py --model-repo /path/to/Depth-Anything-V2 --checkpoint /path/to/depth_anything_v2_vits.pth
```

输出 `public/depth/*.depth`：前四字节为 `RVD1`，随后两个小端无符号 16 位整数为网格宽高，再跟随逐行存储的无符号 16 位相对逆深度。数值越大表示越近；使用各照片推理结果的 0.5% 与 99.5% 分位数归一化。旁边的 JSON 保存来源与尺寸说明。浏览器使用估计相机和相对尺度反投影，不把这些数值解释为米。

`tests/real-browser.mjs` 检查五个点位、原图切换、桌面拖动和移动端触控。默认访问 `http://localhost:4174/real/`，可用 `MAP_URL` 指定已部署预览。

## 许可与素材

仅使用官方 **Small** 权重，其许可为 [Apache‑2.0](https://github.com/DepthAnything/Depth-Anything-V2/blob/main/LICENSE)；[官方模型页](https://huggingface.co/depth-anything/Depth-Anything-V2-Small)亦明确标注此许可。不要将 Base、Large 等其他规格视为相同许可。再分发模型或源码时保留相应许可与声明。

原始照片由用户提供，照片权利归用户及相应权利人所有，不因使用本模型而自动适用 Apache‑2.0 或项目代码的开源许可。

曾调研 SHARP，但未采用；其[模型许可](https://github.com/apple-aiml-research/ml-sharp/blob/main/LICENSE_MODEL)限定研究用途，因此本展示页采用上述方案。

## 如何升级为多视图实景扫描

需要新增沿真实空间连续移动拍摄的原始视频或照片序列，而不只是站在同一点转动镜头：

1. 从房屋正面沿院落缓慢移动，接着拍转角和可到达的侧面；经过转角时保留前后共同可见的内容。
2. 对希望游览的村道、邻宅和院落补拍相互衔接的路线。同一处表面应从多个位置清晰可见；希望查看屋顶，则还需对应高处视角。
3. 保持较一致的光照、清晰对焦和较高画面重叠，尽量减少运动模糊及移动物体干扰；提供原文件，避免截图或反复压缩。
4. 先验证相机配准、覆盖范围和遮挡，再选择摄影测量或 3D Gaussian Splatting，并对未覆盖区域明确留空。照片数量不能单独保证重建质量。

官方采集参考：[Nerfstudio 自定义数据指南](https://docs.nerf.studio/quickstart/custom_dataset.html)、[RealityScan 相机移动指南](https://dev.epicgames.com/documentation/realityscan-mobile/Photogrammetry-Camera-Movement)。

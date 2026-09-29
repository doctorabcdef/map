# 归乡 · 3D 村庄地图

根据五张实景照片重建的可交互村庄，使用 Three.js 与 Vite，部署到 GitHub Pages。

**在线访问：[doctorabcdef.github.io/map](https://doctorabcdef.github.io/map/)**

## 可以做什么

- 鸟瞰旋转、缩放、平移，或切换地面漫游。
- 快速查看蓝瓦小楼、门前小院、树荫村道、田野远山四个地点。
- 手机上单指旋转、双指缩放与平移；漫游使用左侧摇杆，右侧滑动环顾。
- 电脑上鼠标拖动旋转、滚轮缩放、右键平移；漫游使用 WASD / 方向键，按住画面环顾，Shift 快走。
- 对照五张原始照片，查看相应三维场景；支持流畅 / 精细画质与浏览器全屏。
- 场景几何、照片与依赖均由站点提供，不需要第三方地图密钥或在线模型服务。

## 还原依据与边界

主楼白墙蓝瓦、退台阁楼、门窗、阳台、栏杆和楼梯参照照片 1；车道、车辆、砖墙、垃圾桶、覆盖堆料与道路白色修补线参照照片 2、4、5；屋后农田与远山参照照片 3；邻宅、电线及路灯参照照片 4、5。

这是**照片参考建模**，不是摄影测量或高斯泼溅生成的实景模型。主楼宽约 12.6 米、层高约 3.3 米等数值用于建立相对尺度，并非实测结果。建筑背面和室内、各物体实际距离、村道延伸与邻宅精确位置为推测补全。不含经纬度或可靠正北方向；小地图只表达场景内相对位置，不能用于导航、测绘或施工。

原始照片保存在 `public/photos/`，并会作为公开站点资源发布。门窗纹理直接映射主楼照片的局部区域；周围植被、地面与建筑几何在本地生成。图片中的原始光照和遮挡会保留在部分贴图中。

## 本地开发

Node.js 22.12 或更高版本：

```sh
npm ci
npm run dev
```

打开终端给出的地址。不要直接双击 `index.html`。同一 Wi-Fi 的手机可通过电脑局域网 IP 与预览端口访问，需要本机防火墙允许连接。

```sh
npm test
npm run build
npm run preview
```

使用支持 WebGL 2 的较新 Chrome、Edge、Safari 或 Firefox。较弱设备建议选择「流畅」画质。手机默认流畅画质，降低分辨率与植被复杂度；静态阴影只在需要时生成。低版本或禁止 WebGL 的浏览器会显示照片与兼容性说明。

## 部署

仓库：[doctorabcdef/map](https://github.com/doctorabcdef/map)。`main` 分支推送触发 `.github/workflows/deploy.yml`，执行安装、测试、构建与 Pages 发布。仓库 Pages 发布来源为 **GitHub Actions**。`vite.config.js` 使用 `base: './'`，支持 `/map/` 子目录。

工作流仅将 `dist` 发布为网站；不会发布测试结果和本地辅助文件。部署方式见 [GitHub 官方 Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 源码

| 文件 | 用途 |
| --- | --- |
| `src/main.js` | 光照、相机、鸟瞰与漫游、触控、照片对照、小地图 |
| `src/house.js` | 主楼、栏杆、楼梯、照片门窗贴图及碰撞体 |
| `src/environment.js` | 稻田、村道、地形、实例化植被与画质切换 |
| `src/village.js` | 邻宅、银色车、砖墙、杂物、电杆与路灯 |
| `src/physics.js` | 碰撞与楼梯 / 阳台高度 |
| `src/style.css` | 电脑、手机横竖屏布局 |
| `tests/physics.test.js` | 碰撞与楼梯衔接检查 |
| `tests/browser.mjs` | 浏览器场景、鼠标、手机触控与照片资源检查 |

浏览器测试默认使用 Windows Edge 与 `http://localhost:5174/`。可通过 `BROWSER_PATH` 和 `MAP_URL` 环境变量指定本机 Chromium 与测试网址。手机检查使用浏览器的触控模拟，实际帧率仍需在目标手机上体验。

后续提高精度时，应补充房屋四周照片、各楼层高度、建筑与道路实测尺寸，再调整 `HOUSE`、房屋几何、村庄位置和地形。

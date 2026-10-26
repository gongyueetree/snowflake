# Snowflake Studio · 雪花灯创作台

面向非程序员的雪花灯拼接、灯效仿真、Gemini 自然语言创作与 RP2040 UF2 下载工具。

## 部署到 Vercel

仓库已包含 `vercel.json`，导入仓库时使用 Other 框架、根目录默认、输出目录 `dist`。详细步骤及 Gemini 密钥使用方式见 [Vercel 部署指南](docs/VERCEL_DEPLOY.md)。

## 本地运行与验证

```sh
git clone https://github.com/gongyueetree/snowflake.git
cd snowflake
python3 -m http.server 8000 --directory dist
```

浏览器打开 http://localhost:8000 。无需安装 npm 依赖；运行测试需要 Node.js 18 或更高版本：

```sh
npm test
node tests-engineering.mjs
```

- `dist/`：可直接部署的完整静态网站，含预编译固件运行时。
- `firmware/`：RP2040 PIO 固件源码与 CMake 配置。
- `dist/engineering/*-kicad.zip`：雪花灯及 LA RP2040 原始 KiCad 工程。
- `scripts/`：工程预览、连接器模型及灯板数据导出脚本。
- `enclosure/`：LA RP2040 外壳 STL、3MF、STEP、参数化源码和装配说明；未做实物试装。
- `docs/`：界面截图、模型来源与验证记录。

Gemini API 密钥由使用者在页面输入。本仓库不包含 API 密钥。第三方代码和模型的许可证保留在对应目录；仓库尚未统一指定项目许可证。

## 已实现

- 1～12 片雪花灯；拖动、旋转、复制、删除；四种快速布局；撤销与重做；级联顺序调整。
- 真实 KiCad PCB 的 37 颗灯珠坐标和 114 段闭合板框，位号 D1～D37 可显示。
- 20 组预设，18 种可组合灯效：常亮、呼吸、光波、彩虹、流星、闪烁、旋转、径向波纹；最多六层。
- Gemini 通过 Google REST API 将自然语言和当前场景转换为严格校验的灯效描述。仅执行受支持的效果，不执行模型生成的任意代码。
- 时间轴、播放暂停、亮度、颜色、2～30 秒循环，空间效果随灯板位置和旋转变化。
- 项目 JSON 导入导出和浏览器本地保存。密钥只在页面内存中，不写入 localStorage、项目或源码；请求直接到 Google。
- 本地打包真正 UF2：已编译的 RP2040 PIO 播放器 + 当前场景的 RGB 像素帧 + CRC32。无需云端编译服务。

## 使用

打开网站 → 选择板数并布局 → 选择预设，或点击“连接 Gemini”填写个人 Google AI Studio API 密钥 → 描述效果并生成 → 预览、调整 → “下载固件” → 阅读接线页 → 生成 UF2。

按住 LA RP2040 的 SW4 / BOOT 后插入 USB，出现 RPI-RP2 磁盘后将 UF2 拖入。自动重启后循环播放。烧录会替换原来的调试器/下载器程序；需要恢复时重新烧录原固件。播放固件没有 USB 串口，重新下载需再次按住 BOOT 插入。

## 硬件核查

来自用户提供的 `SnowFlake.zip` 和 `LA_RP2040.zip`：

- WS2812B: pad 1 VDD, pad 2 DOUT, pad 3 GND, pad 4 DIN。
- 雪花 J1 输入：1=5V，2=DIN，3=GND。J2 输出：1=5V，2=DOUT，3=GND。
- J1.2 → D1.4；逐一核对 36 个 DOUT→DIN 网络后确认 D1→D37；D37.2→J2.2。
- D1 位于中心 (150,90) mm；网站坐标以其为原点；采用 PCB 顶面视图。组合摆放影响全局空间效果，左右列表顺序决定实际数据串联顺序。
- 控制器 U2=RP2040，U3=GD25Q64 8 MiB SPI Flash，Y1=12MHz。
- 输出 J2 对应：GP20=3，GP21=5，GP22=7，GP23=9，GP24=11，GP25=6，GP26=8，GP27=10，GP28=12。J2.1 为 GND，J2.2 为 3V3，J2.4 为 5V。
- 默认数据引脚 GP20 (J2.3)。没有把 GP0 当作灯板数据口；GP0 接板载 LED。

供电：单片按旧版 WS2812B 每灯满白 60mA 保守估算为 2.22A / 11.1W；不同版本实耗不同。多板使用独立 5V 电源并并联分配电源线，按线径、接插件额定电流与压降设计供电，不能让全部电流流经控制器 USB 或细长板间线路。外部 5V 接灯板，控制器和灯板共地，避免外部 5V 反灌电脑。RP2040 3.3V 逻辑不保证满足老版 WS2812B 5V 下的 VIH，建议 74AHCT125 等单向 5V 电平转换，数据串联约 330Ω，电源入口储能电容。第一轮单板低亮度试灯。

## 固件与预览一致性

浏览器预览和导出都调用 `renderFrame(scene, boards, t)`。导出把循环时间按 fps 量化为 RGB 帧；RP2040 从 Flash 顺序读出，转换 GRB，以 PIO 输出。屏幕辉光、色彩和实际灯珠光学表现仍会不同；没有标定屏幕伽马与 LED 色彩。

- UF2 family: `0xe48bff56` (RP2040), blocks: 512 bytes, payload: 256 bytes.
- Runtime: `0x10000000`，8104 bytes（当前构建）。
- Frame header: `0x10040000`，固定 256 bytes；帧从 `0x10040100` 开始。
- Header 8 个 little-endian uint32: magic=0x534e4f57, version=1, LED count, frame count, fps, GPIO, data byte length, CRC32。
- Runtime 启动先检查长度、LED 数、帧数、引脚范围、CRC；无效数据不会启动 GPIO 输出。
- 三片默认 8 秒 30fps 场景：111 LEDs × 240 frames × 3 bytes；UF2 共 177152 bytes。
- 最大 12 片/30秒/30fps：1,198,800 bytes 帧数据，低于 GD25Q64 的 8 MiB 容量。
- `boot2_generic_03h` 通用串行读取启动，避免假设 Flash 的特定 Quad-enable 写法。
- PIO: 8MHz 状态机，T1/T2/T3=3/3/4，总每位 10 周期 → 800kbit/s。T0H=375ns，T1H=750ns；发送 GRB MSB first。等 TX FIFO 空后再等待 400µs，覆盖最后一个字的 30µs 传输并留出 >280µs 复位低电平。
- 12 片总数据时间 13.32ms，低于 30fps 的 33.33ms 帧周期。

这是有限时长动画帧播放器，不是任意 C 程序生成器。适合重复展示灯效；支持原始音频在浏览器内分析并烘焙节奏；不支持硬件实时麦克风音乐响应、无限随机程序、文字/图像任意映射。描述超出能力时 Gemini 被要求说明并给出可支持的近似。

## 开发与重新构建

网页无构建依赖，`dist/` 直接提供静态资源。运行 `node tests.mjs` 做非浏览器检查。

固件构建依赖 CMake、Ninja、ARM GNU GCC 及 Pico SDK。本次使用 ARM GCC 14.2.1 和 Pico SDK commit `079c6f39023649b154152db30f1d781e884879bc`。

```sh
export PICO_SDK_PATH=/absolute/path/to/pico-sdk
export PICO_TOOLCHAIN_PATH=/absolute/path/to/arm-toolchain
cmake -S firmware -B build -G Ninja -DPICO_NO_PICOTOOL=1
cmake --build build
cp build/runtime.bin dist/runtime.bin
node tests.mjs
```

无需 TinyUSB（运行时不提供 USB 功能）。不要将 API key 放进静态文件。页面个人密钥方案用于本人原型试用；若未来面向公众运营，应由服务器保存平台密钥并增加用户身份、额度、限流、审计等，不应把平台共用密钥发到浏览器。

## 验证范围

通过：ARM 实际编译；启动向量与 boot2 CRC；真实坐标与引脚映射；20 组预设循环连续；目标板隔离；输入拒绝校验；UF2 块头/芯片标识/地址/长度/CRC；解包像素与预览逐帧一致；浏览器页面、预设、旋转、复制、撤销、生成下载操作。

未通过实物验证：时序示波器测量、外部供电、LED 批次电平阈值、板上 Flash 启动兼容性、真实灯效。没有用户 Gemini key，未执行收费模型调用；连接和生成请求需要用户在页面验证。

## 参考与许可

- Raspberry Pi WS2812 PIO 示例 (BSD-3-Clause): https://github.com/raspberrypi/pico-examples/blob/master/pio/ws2812/ws2812.pio
- Pico SDK: https://github.com/raspberrypi/pico-sdk
- Worldsemi WS2812B 数据手册: https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf
- Gemini structured output: https://ai.google.dev/gemini-api/docs/generate-content/structured-output

Pico SDK / PIO 相关 BSD 许可文本见 `firmware/PICO_LICENSE.txt`。上传硬件工程版权归其原作者。


## v1.1 · 发光渲染、20 个示例与音乐

修复上一版的显示偏暗：LED 彩色点的发光面积太小，光晕只到 5.8mm，缺少亮芯与叠加溢光。现在采用 15mm 多层光晕、接近白色的高亮核心和加法混合。`displayLight` 中曝光映射只用于屏幕显示；`renderFrame` 和 UF2 数据保持实际 RGB 亮度逻辑。辉光模式可切回像素视图；曝光不改变硬件亮度、输出电流或固件。屏幕不是物理光度标定仪，不能复现实物绝对亮度。

示例共 20 个：极光森林、冬日初雪、圣诞来信、日落余晖、星际流星、层层绽放、深海潮汐、烛火晚餐、糖果圣诞、节日星光、六瓣轮舞、螺旋星云、雷达扫描、双向彗星、霓虹扫描、彩纸派对、飘雪之夜、烟花盛放、心跳律动、频谱花园。支持氛围、节日、动感、音乐筛选；每个示例附参考链接。全部不需要 Gemini key 即可体验与下载。

音乐：三段原创合成配乐（冰晶风铃、霓虹节拍、森林漫步）；可导入本地浏览器支持的 MP3/WAV 等音频，最大20MB/5分钟。选取2～30秒片段，以30Hz计算音量及低/中/高三个粗略频段能量（180Hz、2200Hz一阶分频与RMS，非精密FFT频谱）。三种调制为音量律动、三频段枝丫、低频径向。可下载截取后的单声道 WAV。

Web Audio 的播放时钟驱动网页灯光；暂停/继续/时间轴同步。试听音量不影响灯光。首次试听需要用户点击。项目存储节奏数组，不存音频或密钥；刷新后上传歌曲需重新选择，原创配乐可重新应用。歌曲波形、节奏数组与文件名不发送给 Gemini。配乐配置时循环时长与片段时长保持一致；AI 修改保留既有配乐。

UF2 保留计算好的音乐灯光帧，**不包含声音，也不让 RP2040 实时听音乐**。电脑/音箱与离线板没有启动同步信号，不能保证精确对拍，长时间会漂移；若需要现场实时音乐联动，需后续增加 USB 实时帧传输或麦克风/音频输入硬件。此次固件运行时无需变更。

验证：20例帧图案互不相同、循环首尾数据一致、预览曝光单调且零值不发光；3段原创音频与静音输入能量检查；带音乐的UF2解包与同一时刻预览逐像素相等。浏览器验证了原创音乐应用、WAV实际下载、回传WAV解码、截取起点/时长、暂停、音乐UF2生成。尚未实物验证；Gemini仍需用户密钥验证。

参考案例（借鉴思路后独立实现，非代码移植）：
- WLED: https://kno.wled.ge/features/effects/
- FastLED DemoReel100: https://fastled.io/docs/d5/d25/_demo_reel100_8ino_source.html
- FastLED Pacifica: https://fastled.io/docs/d6/d86/_pacifica_8ino-example.html
- FastLED TwinkleFox: https://fastled.io/docs/df/d61/_twinkle_fox_8ino-example.html
- WLED Audio Reactive: https://kno.wled.ge/advanced/audio-reactive/

## v1.2 工程与实物预览

首页入口「工程与实物预览」，独立页面 `engineering.html`。

- 真实文件解析：控制器 35×16.5×1.6 mm；雪花 79.674338×92×0.8 mm。读取板框、弧线、焊盘、过孔、已填充铜区、走线、可见丝印与器件位置/面别。
- PCB：正反面（背面镜像）、图层开关、缩放平移、器件点选和焊盘网络。原理图：从源文件内嵌符号、实例、导线、连接点生成 SVG；支持缩放、平移、导出。只读轻量预览，不替代 KiCad DRC/制造输出；特殊字体、引脚电气样式与部分文本标记为简化显示。
- 立体模式：随站点分发 Three.js r170 / MIT，避免外部 CDN 依赖。真实板框挤出、PCB 表面纹理、焊盘位置及参数化器件模型；缺少上游 WRL/STEP 文件，因此器件高度、连接器细节、材质与灯光为示意，不应量取机械尺寸。
- WebGL 不可用时自动使用 Canvas 正投影兼容模式：旋转、倾斜、缩放、正反面、器件点选、PNG 下载和灯效仍可用。兼容模式通过正/背面按钮翻板；不是完整的三维遮挡渲染。
- 灯效读取同一浏览器已保存项目；组合模式保留板卡位置和旋转，控制器在旁边展示。未绘制实际接线。音乐只使用节奏数据，不播放音频。关闭「播放当前灯效」显示灯珠熄灭状态。
- 颜色可选白、绿、黑，仅为预览材质，不改工程、固件或项目亮度。
- 原始工程 ZIP 按原字节打包，附 SHA256 清单 `dist/engineering/provenance.json`。除工作区缓存文件外，保留 PCB / SCH / PRO 及工程自带的符号与旧版缓存库。

重新生成预览数据：

```sh
python scripts/export-engineering.py /path/to/extracted-hardware
```

输入路径应包含 `LA_RP2040/LA_RP2040/LA_rp2040.kicad_pcb` 和 `SnowFlake/SnowFlake/snowflake.kicad_pcb` 及同名原理图。

产品效果图 `dist/engineering/product-render.png` 使用内置图像生成工具，以实际板框和器件位置的工程渲染图为参考生成。属于 AI 辅助概念效果，不是实物照片、装配图或电气接线图。提示词见 `docs/product-render-prompt.txt`。

### v1.2.1 J2 模型修正

LA RP2040 的 J2 不再通过封装包围盒与通用金属条拼装。读取 PCB 内两个模型条目的 `hide` 状态，仅使用启用的 `PinHeader_2x06_P2.54mm_Vertical.wrl`；从 KiCad 官方历史模型库补齐同名资源。采用原工程 offset `[3,-6.3,-2.5]` mm、rotation `[-180,90,0]`°、scale `[1,1,1]`，按 KiCad 的 `T·Rz(-z)·Ry(-y)·Rx(-x)·S` 变换，WRL 单位乘 2.54 转为 mm。上下表面的 6+6 个焊盘分开显示。WebGL 与 Canvas 兼容模式共用转换后的 724 个三角面，保留金属与塑料材质，不再猜测连接器高度。

模型原文件、SHA256、来源和许可证位于 `dist/engineering/models/`；`scripts/export-j2-model.py` 可重新转换。原工程文件未修改。此修复保证与工程模型配置一致，未进行实物尺寸测量；当前环境验证了 Canvas 视图与 WebGL 几何数据，未运行 GPU 渲染。


## v1.2.2 · 芯片顶面标记与产品效果图

- 以 RP2040 官方数据手册 §5.1.3 为依据，使用树莓派标志、参考 RP2-B2 排版、一脚圆点和显式批次占位符。工程没有记录芯片实际修订版/批次；预览和器件说明中明确指出这一点。Flash 显示完整 GD25Q64 工程型号，并注明并非已核对的出厂激光码。
- WebGL 与 Canvas 共用 engineering-markings.js；贴图按实际封装长宽比覆盖顶面并随器件旋转，Canvas 使用顶面三点投影，去除旧版悬浮文字和过大通用一脚标记。
- 产品效果图基于修正后的工程视图重新编辑，更新芯片外观和六位置板边连接器；静态图及导出共用带版本参数的新图。生成提示和来源分别见 docs/product-render-v2-prompt.txt 与 docs/package-markings-sources.md。
- 验证：工程数据/几何/J2/标记回归通过；浏览器兼容渲染目视检查通过。当前 QA 浏览器缺少 WebGL，未做 GPU 渲染验证。AI 产品图仍为概念效果图。

## v1.2.3 · USB-C 实体模型

J1 使用原工程关联的 KiCad 8.0.9 `USB_C_Receptacle_GCT_USB4105-xx-A_16P_TopMnt_Horizontal.wrl`，应用原始 offset `[0,-1.25,0]` mm、零模型旋转和板上 −90° 安装角。取代旧实心方块，保留模型的圆角薄壳、空腔、中央舌片、触点、定位柱与固定脚。646 个面集 / 6844 个三角面；原模型、许可证、来源和 SHA256 随站点分发，转换脚本为 `scripts/export-usb-model.py`。解析支持科学记数法并验证坐标三元组。

注意原项目 J1 的封装名是 Palconn UTC16-G，关联模型却是 GCT USB4105；按工程模型预览，在 J1 说明中明示差异，不声称已验证机械互换性。原始 PCB 文件与封装数据没有改动。

两个渲染器共用相同模型和变换；Canvas 修正了板左侧伸出件的遮挡裁剪。新增「USB 开口近看」；「适应」恢复整板视角。回归测试通过射线验证上下空腔、舌片和顶壳，确认开口朝左且伸出板边约 1.55 mm。浏览器已目视检查 WebGL 的开口和整板视图。

## v1.2.4 · 灯板数量增减

“我的雪花”增加常驻 − / ＋ 控件，窄屏也显示。减号删除当前选中灯板，未选中时删除最后一片；删除后选择相邻灯板，保持 1–12 片范围。画布删除按钮显示文字；增减保留已有撤销/重做和灯效目标重映射。页面离开时立即保存，修复快速刷新丢失最近修改的问题。

验证：浏览器检查减少至 1 片、撤销/重做、重新添加、12 片上限、减至 11 片恢复添加、删除后立即刷新保存；独立逻辑检查未选中删除末片和目标重映射；核心回归测试通过。窄屏控件通过 CSS 检查，未做设备实测。

## v1.2.5 · 雪花连接器方向

修正灯效画布两侧连接器横排的错误。通过 scripts/export-preview-connectors.mjs 从同一份 snowflake.json 生成连接器数据，按原工程位置、180° 封装旋转、2.54 mm 针距绘制，所有灯板实例随板旋转。J1/J2 均安装在背面，正面画布显示实际通孔焊盘，不再绘制错误的正面连接器外壳。工程 2D/3D 已按封装方向绘制，无需额外旋转。

验证：两组三针中心均为竖排，板中心相对坐标 x=±12.75 mm，y=−2.5/0.04/2.58 mm；工程模型回归全部通过；浏览器单板画布截图验证。

## v1.2.6 · 六瓣轮舞分组

旧角度分区把下方花瓣的 D31 漏掉并错误包含右下方 D25。petals 改为源板串联顺序对应的六个完整枝丫分组，每组 6 颗，D1 为独立中心；从顶部开始依次轮转，遵循顺/逆时针方向，分组不受板卡摆放/旋转影响。音乐 spectrum 使用同一物理分组，中心灯响应总音量。预览和 UF2 烘焙共用修正后的 renderFrame。

验证：六个阶段及交界、顺逆方向、local/global 配置、三板含旋转、频谱分组、UF2 解包帧与预览一致性回归通过。浏览器确认下方 D26–D31 完整点亮，右下 D25 不再串入。


## v1.3 · 手机适配与中英文切换

- 顶部选择「中文 / English」，语言保存在当前浏览器；创作台与工程页共用设置。界面、20 个预设、接线/音乐/固件弹窗、操作提示和器件说明提供英文。项目名称、用户输入、AI 对话历史、工程源图与板上丝印保留原文。
- Gemini 根据发送时选择的语言生成摘要和灯效名称；切换语言不修改项目数据或像素帧，也不发送新的模型请求。
- 手机布局以预览为先，使用「预览 / 搭建 / 灯效 / AI 对话」快捷导航；增减、级联排序、播放、颜色、音乐、文件导入导出均保留。工程页器件列表可折叠。
- 主画布支持单指拖动灯板、空白处平移、双指缩放；缩放过程不会误拖灯板。3D WebGL 视图沿用触控旋转/缩放，兼容视图与 PCB/原理图可使用屏幕缩放按钮。
- 手机可生成并下载 UF2，建议将文件转到电脑后拖入 RPI-RP2 完成烧录。本次没有增加手机直连 USB 烧录功能。

验证：浏览器检查 320 / 390 / 768 / 1024 / 1440 像素容器，无页面横向溢出；英文与中文往返、语言跨页保留、20 例列表、灯板减少、工程器件搜索与英文说明、手机弹窗和 UF2 生成通过。触控事件回归检查单指拖动、双指缩放、取消和撤销行为；核心灯效/UF2 与工程几何回归通过。尚未在实体 iOS/Android 设备上验证，未使用真实 Gemini 密钥调用。

运行 `npm test` 验证灯效、UF2、预设翻译与触控逻辑；运行 `node tests-engineering.mjs` 验证工程模型。


## 音乐播放修复

创作台和工程页均增加「开启声音」入口，未配乐时可直接试听冰晶风铃。首次播放需要点击；内置配乐刷新后可按已保存配置重建音频，本地上传音频仍需重新选择。工程页声音开启后，3D 和兼容视图使用音频时钟。页面隐藏时停止声音，返回后点击恢复。移除工程页大段预览真实性说明，详细来源与器件信息仍可查看。

Web Audio 在点击调用链中同步请求恢复并启动静音解锁帧；支持 Audio Session 的浏览器指定 playback 模式，恢复失败显示可操作提示。浏览器验证首次启用、静音、刷新后恢复、工程页播放；mock 回归覆盖中断、恢复、上传文件缺失与恢复失败。尚未实测 iPhone 扬声器或各应用内嵌 WebView，不保证所有内嵌浏览器都允许音频。

依据：WebKit iOS media policies https://webkit.org/blog/6784/new-video-policies-for-ios/ ；W3C Audio Session https://www.w3.org/TR/audio-session/ 。

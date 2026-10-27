# Loopfield Pocket — TRIMUI 测试版

以 `daftlamb/loopfield` 网页版的本地工作区为基准，移植到当前 TRIMUI A133 / ARM64 掌机。网页源文件和 ESP32 硬件版未修改。

[图形速查表 / PDF](docs/Loopfield-Brick-Cheat-Sheet.pdf) · [按键 PNG](docs/cheat-sheet-01.png) · [制作 PNG](docs/cheat-sheet-02.png) · [HTML / SVG](docs/index.html)

## 掌机界面

- 原生 1024×768，主音序页全宽 8×4 格子；音符与当前编辑值 36px。
- 八条音轨始终显示在顶部；选中的 track 和 step 使用实色底与反色文字，播放游标另行标记。
- 五套主题：PAPER 纸白青绿、GAME BOY 绿、AMBER 琥珀、MIDNIGHT 午夜蓝、INK 黑白。按 MENU 快捷切换，或 PROJECT → THEME 左右选择。主题自动保存到独立的 theme.json，下次打开沿用，不改网页项目数据。
- 不加载动画，不使用网页右侧分栏，也不需要浏览器或联网。
- 声音、FX、两个 LFO、ARP、Song 和项目操作位于独立页面。

## 操作

| 按键 | 功能 |
|---|---|
| START | 播放／停止 |
| MENU | 循环切换五套主题 |
| 方向键 | 格子间移动；参数页选行、改值 |
| A | 开关当前格子；参数页改变当前值 |
| B | 试听当前格子 |
| 按住 B＋方向键 | 改当前格子的音高、力度、概率、连击或 Gate |
| X | 音序页切编辑项：NOTE／VEL／CHANCE／RATCHET／GATE；采样轨另有 SLICE |
| L／R | 切换八条音轨 |
| Y | 松开后切到下一页 |
| 按住 Y＋左 | 回到上一页，不改变参数 |
| SELECT＋L／R | 切 Pattern；播放中等到当前 32 步结束后切换 |
| SELECT＋上／下 | 总音量，顶部 VOL 显示当前值 |
| SELECT＋左／右 | BPM |
| SELECT＋A／B | 当前轨 MUTE／SOLO |
| SELECT＋X／Y | 保存／读取项目 |
| SELECT＋START | 退出回掌机菜单 |

输入音符时，每轨记住本次使用中最后输入／调整的音高。A 打开下一个空 step 时继承该音高，不改力度等其他值，也不覆盖已经开启的 step。

高级页面：FX 页 X 切总线／分轨；LFO 页 X 添加映射，最多六条；上下会在完整参数表中翻页。Song 页停止播放后编辑，X 切 Pattern／重复次数，B 在 MODE／LOOP 行添加片段，在片段行删除。项目页也有明确的添加 Song 片段操作。

## 项目文件

- 自动保存与退出保存：应用目录的 `project.json`；手动保存同样写入该文件。
- 把网页版导出的 JSON 放进应用目录的 `projects/`，重新打开应用后，在 PROJECT → IMPORT 中选择文件，A 读取。
- 掌机保存出的 JSON 已通过原网页版 `validateProject()` 验证。保留网页版字段，不丢弃现有 MIDI 数据。
- PROJECT 提供网页默认曲、空白项目、新建／复制 Pattern、清轨、撤销和 WAV 导出。
- WAV 保存到应用目录，文件名 `loopfield-*.wav`，48kHz 双声道，包含尾音。
- 退出与编辑后会保存项目；清轨、复制、读取等操作可通过 PROJECT → UNDO 撤销。

## 已接入的声音与音序功能

八轨、32 步、A–P 最多 16 个 Pattern、32 段 Song、每段 1–8 次重复、Swing、Mute／Solo、概率、Gate、1–8 次连击；十二类合成音源；每轨两个 LFO，16 点曲线、同步／自由速度、每个六条映射；NORMAL／CHIP 琶音；分轨与总线的降比特、合唱、延迟、混响、压缩。

Web Audio 已改写成原生 C++。振荡器、滤波与包络遵循网页参数；原生混响使用轻量反馈网络，并非网页卷积混响的逐采样复现。当前应用播放做了 +13dB 左右的设备输出补偿，并保留末级软限幅；项目 master 与分轨比例、WAV 标准输出不随设备补偿改变。

MIDI 外设输出、泛音浏览器直连和浏览器页面联动尚未移植。导入仅依赖外部 MIDI 发声且 master=0 的项目时，需要提高本机总音量才能听见原生音源。

## TF 卡 WAV 采样

把 WAV 放到 TF 卡的 `Apps/Loopfield/samples/`。支持单声道／双声道，单文件最多 60 秒、64MB；常用 PCM 与浮点 WAV 经 SDL 转为内部 48kHz 双声道。全工程解码缓存上限 192MB；内存满时保存并重开项目。附带 `Loopfield-Demo.wav` 供测试。

- 在 SOUND → SOURCE 中选择 sample，与 fm、sine 等合成音色并列；下方 WAV 行左右选文件并载入当前轨，B 试听当前 step 音高。L／R 选择音轨。
- SOUND 中 A 打开 EDIT SAMPLE 或按 X 进入波形编辑；SAMPLER 是当前采样的编辑页。重新进入 SOUND／SAMPLER 会刷新文件列表。
- 每个开启的 step 触发一次当前采样，音符控制播放音高，按下 START 本身不另起伴奏播放器。示例 Loopfield-Demo.wav 是完整八秒合成乐段，所以 one-shot 会播放整段；用单音／打击 WAV 或缩短选区即可作为短音色演奏。
- START／END 行左右每次移动 0.1 秒；按住 B＋左右为 1ms 微调，A 分别复位至文件开头／结尾。波形用自身峰值缩放显示，不改变声音增益。
- MODE 提供 one-shot、loop、reverse、reverse-loop。ROOT 指定原速对应音高，GAIN 为采样增益（0–4），采样路径另提高约 6dB，合成音色输出不变。编辑页 X 开关采样播放；SOUND → SOURCE 可直接切回任意合成音色。
- 回 SEQUENCE，A 输入音符，由 step 触发采样；改音高会改变播放速度。AUTO Gate 的 one-shot 播完整段，循环默认持续一个 step；显式 Gate 可控制持续时间。LFO 的音高、音量、滤波、声像和原有效果器继续作用。
- EXPORT REGION TO NEW WAV 导出选区和反向结果至新 `samples/Cut-*.wav`，不覆盖原始 WAV；不烘焙播放增益、音高和 FX。导出文件可重新导入。
- 路径、区间、模式、根音、增益保存为轨道的 `nativeSample` 扩展字段，原 WAV 单独保存在 samples 文件夹。搬工程需要一起复制 WAV。
- 原网页版能读取 JSON，但尚不支持 `nativeSample` 播放，会使用轨道原合成音源。未接录音与破坏性编辑。

## Slice 切片与 step 分配

在 SOUND → EDIT SAMPLE 中，SLICES 左右选 1、2、4、8、16、32；1 为不切片。按当前 START／END 区间等分，波形显示分割线，不改原 WAV。

- 在 ASSIGN SLICES TO STEPS 行按 A，按 1…N 循环给 32 个 step 分配切片；保留原来的音高、开关、力度等值，不会把所有空格自动打开。
- 回 SEQUENCE，X 切到 SLICE；按住 B＋方向键给当前 step 选 S1…SN 或 ALL（播放整个选区），改值会试听。其他编辑模式下，格子顶端也会显示 S 编号。
- NOTE 仍控制音高，切片支持反向、循环、Gate、连击和原有 LFO／FX。切片数变小时，超范围的分配收至最后一片；设为 1 时恢复 ALL。
- 每步 slice 与轨道 slices 随工程保存；原网页版暂不识别切片播放。

本次用户提供的三段钢琴 WAV 已复制到掌机 samples，未加入通用发行包。掌机 PROJECT → IMPORT → Piano-Slice-Test.json 可载入测试：A 为 E 钢琴，B 为 C Moody，C 为 A# Pop，D 为混合重排。SELECT＋L／R 切 Pattern；B／C 中相应的采样轨是第 2／3 轨。测试启动直接使用并保存这个独立 JSON，不覆盖原 project.json。

## Mixer、Punch-in 与音高快捷键

SEQUENCE 按住 Y＋左进入 MIXER，原有页面的顺序保留。九行同时显示 MASTER 与八轨，不缩小字号。上下选行，X 换列，左右调整：

- MASTER GAIN：总输出额外增益 -12 至 +12dB；ROUTE 列开关总线 FX。原来的 SELECT＋上下仍调项目 master。
- 各轨 GAIN：0–2 倍，PAN：声像，MUTE／SOLO 实时控制声音。底部细条显示轨道电平。
- ROUTE：track+bus 经过分轨与总线 FX；bus 绕过分轨 FX；direct 绕过两级 FX。直出仍经过 MASTER 增益、Punch-in 和末级软限幅。

按住 L＋R，再按住 A／B／X／Y：A 把刚才的 1/8 拍音频冻结碎切；B 降采样与降比特失真；X 临时回声；Y 暗色低通滤波。可叠加，松开效果键或任一肩键即恢复，短交叉淡化减少切换噪声。状态栏显示已按下的效果，不写入工程 FX 设置。普通 L／R 切轨与 X 切编辑项改为松键执行，以识别组合键；SELECT 的保存／读入与切 Pattern 组合保持原样。

Punch-in 过程中，保持 L＋R 和效果键，用左右键每次减／加 5% 力度（干湿混合比例，0–100%），长按连续调节。四个效果各自记住本次运行的力度，默认 75%；叠加时调最后按下的效果，状态栏的 > 标出调节对象并显示百分比。松键恢复原声音，力度不会改写工程的 FX 参数；重启恢复默认值。Punch-in 当前作用于总输出，不是当前单轨的 FX。

按住 X：左右每次移调一个半音，上下移动一个八度；X＋L／R 循环切 chromatic／major／minor／dorian／pentatonic；X＋A／B 改根音。仅作用于当前轨，范围 ±24 半音，原始 step 音符不变。SOUND 中也可调 TRANSPOSE、KEY ROOT、SCALE。鼓类移调但不做调式量化，采样继续按音高变速。

Mixer、移调和调式作为 native 扩展字段保存；原网页版尚不应用这些字段。Punch-in 为临时演奏状态。

## Slice 随机游走与条件触发

不增加页面或组合键。SOUND 的采样音源下增加 SLICE WALK：off 固定 step 切片；slow 每次触发有 35% 机会向相邻片移动一步；active 每次向相邻 1–2 片移动。游走限定在当前 START／END 区间的切片内，到边界折返；按轨、按 Pattern 独立运行。第一次从当前 step 的切片出发，ALL 从 S1 开始。B 手动试听仍播当前编程的片，不推进游走。

SEQUENCE 按 X 切到 COND，按住 B＋方向键选择：ALL 每轮、1ST 仅首轮、LATE 第二轮起、1/2 或 2/2 交替轮、1/4…4/4 每四轮指定一轮。未触发的步不会推进游走。每个 Pattern 单独计算轮次，停止后重新 START 从首轮重来；切换再回来保留该 Pattern 本次运行的轮数。条件与概率、连击、Gate 可叠加。非采样轨也能使用 COND。

有条件的 step 顶部有额外标记，COND 模式直接显示规则。音序页底部显示 WALK 状态、刚实际播放的切片 S 编号和 Pattern 轮次 R。保存保留 walk 与 condition 设置，动态游走位置和轮数在重新播放时重置；原网页版暂不执行这两类扩展字段。

掌机已增加独立工程 `projects/Piano-Evolving.json`，使用此前的三段钢琴，不覆盖旧工程。默认打开 B；SELECT＋L／R 切换，播放中等下一轮边界：

- A FIXED：固定 E 钢琴短片，作为对照。
- B SLOW WALK：与 A 相同节奏、音高、力度，只开启慢游走，切片逐渐变化。
- C EVERY 2 & 4：C Moody 与 A# Pop 做应答，按两轮／四轮交替出现。建议听四轮，约 24 秒。
- D ORGANIC MIX：三段钢琴的活跃／慢游走、反向片和首轮／后续轮／四轮条件叠加，保留细碎质感。

四个 Pattern 的名称显示在上方。再次打开应用可在 PROJECT → IMPORT 载入 Piano-Evolving.json。提供给本机测试的钢琴原文件保持不变，不包含在通用发行包。

## 限定游走范围与变化频率

SOUND 的采样设置中，SLICE WALK 下方增加两个控制：

- WALK CHANGE / %：每次实际触发时改变切片的概率，左右每次 5%。0% 保持当前片，100% 在有多个可选片时每次换片；条件或概率跳过的 step 不计作触发。未设置时沿用 slow 35%、active 100%。
- WALK SLICES：左右浏览 S 编号，A 勾选／取消，X 先只保留当前片。随后可用 A 加入任意不连续的片，例如 S1、S3、S5。至少保留一片；只选一片时固定播放它。ON／OFF 显示当前浏览片是否允许。

游走沿勾选片的顺序就近移动，slow 一次移动一格，active 最多两格；不会落到未勾选的片。第一次将 step 锚点对齐到最近的允许片。修改允许集合后，旧位置如果被排除，也会先对齐到允许片。手动 B 试听和 WALK off 仍使用 step 原本的切片。范围、概率随项目保存。

条件触发已提供：音序页 X 切 COND，B＋方向键选择 ALL、1ST、LATE、1/2、2/2、1/4…4/4。所有条件继续先于随机游走判定。

## Pluck、Bell、Marimba

SOUND → SOURCE 新增 pluck、bell、marimba，接在 sample 之后。Pluck 以谐波和短噪声瞬态形成拨弦，高次泛音衰减快；Bell 为不谐和振动模态、尾音较长；Marimba 以木条模态和短敲击瞬态形成木质音色。不是同一个振荡器换名，也不依赖外部采样。

选择时装入对应的起音、衰减、材质与滤波初值，分轨音量保持。ATTACK／DECAY 控制包络，MATERIAL 调整泛音亮度，OVERTONE RATIO 调整高次振动比例。支持移调、调式、LFO、ARP、Gate、条件、Mixer 和 Punch-in。以轨道 nativeTone 扩展字段保存，原网页版仍可读取工程，但暂以原合成器类型播放。

新增独立工程 projects/Tone-Check.json：A Pluck、B Bell、C Marimba 演奏相同音序，便于比较。SELECT＋L／R 换 Pattern，原来的钢琴工程保留。

## 安装

将发行包内的 `Loopfield` 文件夹复制到 TF 卡的 `Apps/`，从掌机应用菜单打开。当前设备已安装，无需刷固件。Dissipation 应用保留。

应用运行时暂缓休眠，退出后恢复。测试期间通过开发脚本暂停原菜单并在退出后恢复，未改开机脚本。应用菜单配置原件备份在本应用目录。

## 验证

- 已在掌机测试 32 步时序、连击、概率、Mute、Gate 实际时长、Pattern 边界切换、Song 重复与结束、LFO 同步、NORMAL／CHIP、八轨 FX 与总线 FX。
- 实际编辑后的 JSON 与包含 nativeSample 的工程均通过原网页版校验器。
- 采样检查覆盖 44.1kHz 单声道 WAV 转换、48kHz 双声道、区间、反向循环、八度变速、LFO 音高、step 触发、缺失文件静音、反向选区另存。
- 采样页在真机显示与播放 10 秒，237 次回调无超时，最大回调 11.812ms。
- 默认 Pattern 导出：48kHz／双声道／8 秒（5 秒乐段＋3 秒尾音），零满幅剪切样本。
- 全宽界面已由用户确认清楚、基础按键正常。
- 13 秒显示与播放短测的 307 次回调未超时；这不代替长时间稳定性和端到端延迟测试。

## 开发

交叉编译需要 Zig 0.13.0、SDL2 2.30.8 头文件，以及从目标 TRIMUI 提取的 SDL2 / SDL2_ttf 动态库。依赖目录结构：`zig-windows-x86_64-0.13.0/zig.exe`、`SDL-release-2.30.8/include/`、`sysroot/libSDL2.so`、`sysroot/libSDL2_ttf.so`。第三方系统库与工具链不包含在源码仓库。

`./handheld/build.ps1 -NativeDeps C:\path\to\handheld-deps`，或设置 `LOOPFIELD_NATIVE_DEPS`；默认查找仓库 `.deps/handheld/`。目标为 `aarch64-linux-gnu.2.33 / cortex_a53`。

源码仓库不提交构建二进制与转换后的 TTF。安装使用 GitHub Release 的 ZIP；若自行打包，可用 FontTools 将仓库 fonts/ 下的 Fusion Pixel latin WOFF2 转成 `handheld/package/Loopfield/pixel.ttf`（保留 OFL 许可）。`package.ps1` 仅打包显式列出的应用资源和速查表，排除个人工程、测试缓存与商业采样。

速查表由 `docs/make-cheatsheet.py` 生成，需要 Python 的 reportlab / pymupdf 和 Windows SimHei 字体。按 [TRIMUI Brick 产品正面图](https://www.trimuistore.com/products/trimui-brick-retro-handheld-game-console) 绘制原创矢量外形，不包含产品照片。`Engine.hpp` 为新原生引擎，读取网页 JSON。`--sample-test [WAV文件名]` 检查采样加载和 DSP；`--ui-test` 检查回翻、音符继承、SOUND 采样选择、进入编辑页、切回合成音色、批量分片映射和逐步改片。`--preset-check PATH` 离线检查四个 Pattern 连续四轮的触发与声音；`--project PATH` 使用独立工程文件并保存至该文件；`--verify-project PATH` 只读播放测试。`--bench`、`--selftest`、`--render FILE.wav` 不启动图形界面；`--verify` 为 13 秒界面／播放测试。

Windows ADB 使用此前下载的官方 platform-tools，环境 `ADB_USB_LEGACY=1`，不要设置 `ADB_LIBUSB`。开发脚本仅操作本应用、临时休眠标志和 MainUI 暂停／恢复。

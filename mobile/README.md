# Loopfield · iOS prototype 01

基于 `daftlamb/loopfield` 的 `24b0eda`，在 `codex/ios-prototype` 分支上开发。网页音源和工程格式延续原项目；独立移动构建输出到 `dist-mobile`。未部署网站。

## 运行

Node.js 22+、Xcode 26+，部署目标 iOS 16.4。第一轮 iPhone / iPad 均为竖屏。

```sh
npm ci
npm test
npm run ios:sync
npm run ios:open
```

在 Xcode 的 App target 选择自己的开发团队和设备，然后 Run。Bundle ID 为 `com.daftlamb.loopfield`。真机 `.app` 需要开发签名与匹配设备，不能把模拟器产物当作安装包。

## 第一轮

- App 内置全部声音算法、像素字体和场景素材，可离线启动，无远程 server URL。
- 主屏：八轨切换、16 步分页、同格不同参数模式、当前步参数、Level / Decay / Filter / Resonance 快捷编辑。
- 音序工具收纳新建/复制乐段、随机、清空、八度和调式。原有 Song、双 LFO、ARP、分轨与总线 FX 保留。
- 顶部工程入口：当前编辑自动保存、最多 50 个命名副本、载入、JSON 导入导出、WAV 分享。
- 每次编辑同步保存带时间戳的本地恢复副本，原生 Preferences 按顺序异步写入；启动时选择最新有效工程。网页与 App 沙盒不共享，需要 JSON 交换。
- 项目导入先校验完整结构与 2 MB 大小上限；载入前保留撤销快照。重启后不保留撤销历史。
- WAV 支持 Pattern / 单遍 Song，包含 FX 尾音。第一轮限制含尾音不超过 3 分钟，超限在分配音频缓冲前拒绝。原生写入临时文件，通过系统分享面板保存。
- `?` 就地帮助：进入后点控件阅读说明，阻止该次操作修改音符。
- 进入后台、音频中断、耳机断开时保存并停止，返回后手动播放。5 ms 是请求的原生缓冲时长，不是测得的演奏延迟。
- 原创几何像素图标与纯色启动背景。

## 动画后续改动入口

素材和现有画面处理暂时保留，不在第一轮定稿新的显示逻辑。

- `visuals.js` 的 `startVisuals(engine, { isVisible })` 负责绘制并返回 `dispose()`。
- `app.js` 单独驱动 `engine.tick()`，动画绘制不再负责推进播放 UI 与 Song 结束。
- iOS 仅在画面页绘制，离开时跳过分析和绘制；音乐仍继续运行。
- `mobile/bootstrap.js` / `mobile/shell.css` 负责 iOS 画面入口和容器布局。后续更换画面组织，不需要重写工程或音序器。

## 验证 · 2026-09-14

- 44 项 Node 测试通过：原有 38 项，加保存恢复/写入顺序/非法导入/导出预算，以及音频启动中断和异步关闭竞态测试。
- 浏览器检查：播放/停止、切画面播放继续、16 步分页、模式切换、就地帮助、工程命名、保存副本和刷新恢复。
- 375×667 主屏与 393×852、440×956、1024×1366 安全区布局检查。可见主屏控件中心无互相遮挡。
- iOS Simulator Debug 编译通过并启动，确认 WKWebView 主界面正常显示。模拟器自动化未能可靠驱动 WebView 内触控，因此没有把浏览器交互测试当成原生交互通过。
- iPhone 17 Pro Max 开发签名构建通过，已安装并启动；真机试听、多指/长按手感、系统分享/文件导入、来电与耳机切换仍需实际试用。

## 后续边界

MIDI 原生连接、AUv3、后台持续演奏、Nudge 和新的动画显示逻辑未加入第一轮。原有桌面 Web MIDI 保留，iOS 页面隐藏此入口。WAV 内存与复杂多轨 FX 的性能需要真机进一步验证。

Capacitor CLI 开发依赖有 3 项 moderate audit 提示；未做破坏性强制升级。检查结果不等于上架审核；当前是本机试用版本。

## Build 2 · Icon navigation, Bell and Pluck

- 底栏仅保留居中图标，保留原触摸区域、选中指示和 VoiceOver 名称。
- 音色页的合成方式新增 BELL / 钟声与 PLUCK / 拨弦。Bell 使用非谐波泛音，Pluck 使用快速衰减的高次谐波；两者共用原来的音高、力度、Gate、滤波、FM、LFO 与琶音链路。
- 选择新音色时设置适合它的起音、衰减、滤波与 FM 初值，保留音符、音轨音量、声像、静音、调制和 FX。旧工程不会自动换音色；含新音色的 JSON 需要更新后的版本读取。
- 46 项 Node 测试通过；`voices-test.html` 用实际 OfflineAudioContext 检查音色频谱、衰减、尾音终止、Gate、低/高音、LFO + NORMAL/CHIP ARP 和双音色立体声 WAV，全部通过。
- 浏览器确认五个底栏按钮均无可见文字、保留名称；Bell / Pluck 选择与试听入口正常，刷新保留已选音色。iOS 开发签名 Build 2 通过并安装启动于已连接 iPhone。
## Build 3 · Divider cleanup

- 去掉音序标题上方的黑色分隔线和底部导航上方的灰色边框，保留纯图标导航。
- 浏览器确认两处边框宽度为 0；iOS 开发签名构建通过，已安装到 iPhone。

## Build 4 · Consistent mobile controls

- 所有页面移除顶部标题分隔线及音轨栏底线，保持纯图标导航。
- 原生 select 保留为模型适配层，交互改为页内分段按钮或左右切换；音高支持长按连续调整。动态编排与调制选项同步重建，播放中的禁用状态仍生效。
- iOS 构建使用独立英文文案目录 `mobile/english.js`，不改桌面文案及用户保存的工程内容。本轮没有运行时语言开关，后续入口计划放入工程设置。
- 问号直接打开 QUICK GUIDE，不再启用虚线帮助模式。调制说明面板补充明确的关闭按钮。
- 常规控件文案统一为 12px；FX 改成五行横向参数布局。393×759 和 375×647 浏览器可用视口中 FX 无垂直滚动，参数文字无横向溢出。
- 46 项 Node 测试通过，开发签名构建通过。浏览器验证 Pattern、Song、重复次数、播放锁定、Bell、音高及撤销、场景、导出范围和帮助入口；可见控件没有原生 select，所有 sectionhead 顶边框为 0。

## Build 5 · Language and shake settings

- 问号面板顶部加入 ENGLISH / 中文即时切换，Preferences 保存语言。运行时仅翻译 UI 文本与标签，保留当前播放、编辑位置和撤销历史，不重载页面；用户工程名与音轨名称不经过翻译。
- 语言层替代 Build 4 的构建期英文替换，动态生成的工具、编排和调制控件随语言同步更新。
- UIKit `motionEnded(.motionShake)` 将原生摇动事件交给页面，依次切换五套配色；1.2 秒去重，输入文本及后台不触发。问号中可关闭此功能，并记住开关。深色配色同步切换浅色状态栏文字。
- 使用说明加入随机功能路径：选择 NOTE / VEL / CHANCE / RATCHET / GATE → TOOLS → RANDOM。NOTE 随机音符与开关，其余模式只随机已开启步的对应参数，作用于当前音轨。
- 47 项 Node 测试通过，包括摇动去重、开关保存、后台和文本输入保护。浏览器验证播放中英中切换不停止，重开保留语言，中文工程名保持原样，随机连击及撤销正常。
- iOS 开发签名和模拟器构建均通过；模拟器 Shake 菜单实际验证 INK → PAPER → GAME BOY → AMBER，AMBER 状态栏为白色。Build 5 已安装到 iPhone。

## Build 6 · Pixel wordmark and TestFlight package

- 图标更换为两行 LOOP / FIELD 像素字，保留生成源图；`swift mobile/make-icon.swift` 输出无 alpha 的 1024px RGB 图标。
- 1.0 (6) Release 归档和 App Store Connect 签名 IPA 导出通过，新图标已安装到 iPhone。
- TestFlight 上传尚未完成：Apple 返回 `Error Downloading App Information`，需要登录 App Store Connect 核对应用记录。测试说明、产物位置和重试命令见 `mobile/TestFlight.md`。

## Build 7

- Added PAD (three detuned triangles, slow attack) and BASS (saw + octave sub, filter envelope), retaining existing note/velocity/gate/ratchet/LFO/FX paths.
- Visual allows landscape and hides surrounding controls; portrait restores the normal app. Canvas aspect ratio is preserved.
- Repeat real-audio validation by serving the repository and opening `mobile/voice-render-check.html`; this diagnostic is excluded from the mobile bundle.
- Release artifacts and verification limitations: see `TestFlight.md`.

## Build 8 · Release polish (2026-10-01)

- Standardized mobile control heights and compact Song arrangement rows. FX remains within a 375 × 667 viewport. PIXEL stays the default; optional locally bundled Doto is selectable in Settings / Guide and persists across launches. Chinese glyphs fall back to LoopPixel. Doto's OFL license is included under `fonts/LICENSES/doto/`.
- Removed the INTERFACE scene, its renderer and both image assets. Old saved scene choices fall back to the remaining slideshow.
- Added VOWEL with continuous A/E/I/O/U formant morphing and a Vowel LFO destination. Added VA with saw/pulse/triangle waveforms, dual-oscillator detune and filter envelope amount; existing attack/decay/filter/FX controls remain shared. Older projects receive compatible parameter defaults.
- Settings / Guide includes Afterglow (82 BPM, VA keys), Glass Orbit (108 BPM, Bell/Pluck) and Vowel Tide (68 BPM, morphing Vowel/Pad). Each has four arranged patterns. Loading first writes a safety copy of the current project and remains stopped. Failed/full library writes prevent replacement.
- Validation: 50 Node tests, 24 real OfflineAudioContext voice/gate/ratchet combinations and three complete song renders passed. All renders were finite, nonzero and unclipped with silent tails. Browser checks covered English/Chinese, Doto persistence, preset loading/safety copy, VA/Vowel controls, Song and FX layouts. Static and mobile builds passed; iOS Simulator build and launch passed. The current iPhone was unavailable, so this build still needs phone listening and touch/rotation checks.
- Release archive and App Store Connect distribution-signed IPA export succeeded for 1.0 (8); no upload or review submission was performed.
- AUv3 hosting is deferred by user decision. Next round should connect native AVAudioEngine/AVAudioUnit hosting, plugin discovery and editor presentation, MIDI scheduling, effect routing and saved plugin state. The current Web Audio graph is not an AUv3 host. Reference: https://developer.apple.com/documentation/audiotoolbox/incorporating-audio-effects-and-instruments
- Font source: https://github.com/google/fonts/tree/main/ofl/doto

## Build 9 · PIXEL / DOTO themes (2026-10-01)

- The operating interface is always English. The existing language preference now controls help copy only; user-created project and track names remain untouched. Settings exposes HELP LANGUAGE (EN / ZH) and THEME (PIXEL / DOTO).
- Both themes use the same panel geometry. DOTO uses 14px main labels / 12px dense labels, a matching original 27-icon dot matrix set and drawn dot arrows. PIXEL keeps its original icon set. All help copy follows the theme; Chinese help uses Loop Pixel for the entire paragraph because Doto has no CJK glyphs.
- Musical accidentals display as Db / Eb / Gb / Ab / Bb, with unchanged MIDI pitches. Unsupported arrows and infinity use drawn controls or ASCII equivalents. Compact synchronized periods display as 0.5b, 1b, etc.
- Slider handles are 8px with their larger touch regions preserved. Page selectors, mode selectors and main actions share 44px heights and a consistent selected fill. FX labels/values use two short rows to avoid collisions.
- Validation: 51 Node tests passed, including every MIDI pitch from 24–96 mapped to the expected enharmonic spelling. Browser checks at 375×667 and 393×759 covered both themes, English operating UI with Chinese help, persistent selection, pitch edits/undo, Sound, Song, FX, tools and LFO settings. Main controls had no horizontal text overflow. Release archive for build 9 succeeded.

- Build 9 development-signed IPA exported and installed successfully on the connected iPhone 17 Pro Max (mog), 2026-10-01. App bundle version and final theme CSS were checked before installation.

## Build 10 · Editing continuity and palettes (2026-10-01)

- Play, numbered track selection and step-page selection share one responsive width and a 44px height.
- After editing a pitch via the pitch selector, wheel or touch drag, newly enabled note steps use that last pitch on the same track. Existing notes and other parameter modes retain their pitches. State is transient and track-scoped; project replacement and undo cannot leak a stale pitch into a restored project.
- Touch pitch drag advances one semitone per 11px instead of 14px. Other parameters and the 320ms hold threshold are unchanged.
- Removed offset button focus outlines; keyboard focus uses contrasting colours. Dialog close icons have explicitly centred 44px hit areas. Step edit selection remains visible.
- Added MONO DARK (black/white/grey), EVA (purple/green/white) and CYBERPUNK (dark blue/cyan/pink). Palette selection and shake now cycle eight palettes. Native status-bar text is light in all three new dark palettes.
- 53 Node tests passed, including track-scoped pitch continuation, existing-note preservation, undo-context reset and drag intervals. Browser verified actual Db4 continuation, undo, matched widths, all three palettes and keyboard focus with no outline and zero icon centring offset. Release archive passed.
- Development-signed build 10 exported and installed on the connected iPhone 17 Pro Max (mog).

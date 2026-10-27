from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import pymupdf

ROOT=Path(__file__).resolve().parent
W,H=1440,1018
INK='#25302d';MUTED='#65716b';GREEN='#2f765c';ORANGE='#bd593b';PAPER='#f6f5ef';LINE='#d5dcd4'
pdfmetrics.registerFont(TTFont('CN',r'C:\Windows\Fonts\simhei.ttf'))
c=canvas.Canvas(str(ROOT/'Loopfield-Brick-Cheat-Sheet.pdf'),pagesize=(841.89,595.28))
c.setTitle('Loopfield Pocket / TRIMUI Brick Cheat Sheet')
class Page:
 def __init__(self,num,title,sub):
  self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="100%" height="100%" fill="{PAPER}"/>']
  c.saveState();c.scale(841.89/W,595.28/H);self.rect(0,0,W,H,PAPER)
  self.text(56,66,'LOOPFIELD POCKET',44,INK);self.text(56,113,title,28,GREEN);self.text(56,148,sub,20,MUTED)
  self.line(56,166,1384,166,INK)
  self.text(56,982,'TRIMUI BRICK  /  2026.10  /  按住 + 组合键；单按 X / Y / L / R 松键执行',17,MUTED)
  self.text(1260,982,f'{num} / 2',18,INK)
 def rect(self,x,y,w,h,fill=None,stroke=None,r=0):
  c.setFillColor(HexColor(fill or PAPER));c.setStrokeColor(HexColor(stroke or fill or PAPER));c.setLineWidth(1.2)
  c.roundRect(x,H-y-h,w,h,r,fill=bool(fill),stroke=bool(stroke))
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill or "none"}" stroke="{stroke or "none"}"/>')
 def line(self,x,y,xx,yy,color=LINE):
  c.setStrokeColor(HexColor(color));c.setLineWidth(1.3);c.line(x,H-y,xx,H-yy)
  self.parts.append(f'<path d="M{x},{y} L{xx},{yy}" fill="none" stroke="{color}" stroke-width="1.3"/>')
 def circle(self,x,y,r,fill,stroke=None):
  c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(stroke or fill));c.circle(x,H-y,r,fill=1,stroke=bool(stroke))
  self.parts.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke or "none"}"/>')
 def text(self,x,y,s,size=22,color=INK):
  c.setFont('CN',size);c.setFillColor(HexColor(color));c.drawString(x,H-y,s)
  self.parts.append(f'<text x="{x}" y="{y}" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="{size}" fill="{color}">{escape(s)}</text>')
 def card(self,x,y,w,h,title,rows,color=GREEN):
  self.rect(x,y,w,h,'#ffffff',LINE,10);self.rect(x,y,5,h,color,None,2);self.text(x+24,y+38,title,25,color)
  for n,row in enumerate(rows):self.text(x+24,y+75+n*29,row,21)
 def finish(self,name):
  self.parts.append('</svg>');(ROOT/name).write_text('\n'.join(self.parts),encoding='utf-8');c.restoreState();c.showPage()

p=Page(1,'现场操作 / 从按键位置开始','先用 START 播放；用 A 开关格子，再用 B + 方向键编辑。')
p.text(56,208,'按真实正面布局绘制',23,GREEN)
# Rear shoulders are shown above the front silhouette.
p.rect(210,228,82,27,'#dce9df',GREEN,7);p.text(236,248,'L',21,GREEN)
p.rect(464,228,82,27,'#dce9df',GREEN,7);p.text(490,248,'R',21,GREEN)
p.text(307,246,'背部肩键',19,MUTED)
p.rect(198,256,356,526,'#d9dcd5',INK,20);p.rect(209,267,334,246,'#27312e',None,7)
p.rect(223,282,306,217,'#e9eee4',None,2)
p.text(238,312,'LOOPFIELD',25,GREEN);p.line(236,325,515,325,GREEN)
for i in range(32):
 x=238+(i%8)*34;y=342+(i//8)*34
 p.rect(x,y,30,27,GREEN if i==5 else None,'#a5b5a5',2)
 if i in [0,5,8,14]:p.text(x+3,y+20,['C4','E4','G4','A4'][[0,5,8,14].index(i)],13,PAPER if i==5 else GREEN)
p.text(237,490,'08 TRACKS  /  32 STEPS',15,GREEN)
# Fn keys above the playing controls.
p.rect(332,533,35,11,'#f5f5f0',INK,5);p.rect(386,533,35,11,'#f5f5f0',INK,5)
p.text(327,527,'Fn1',13,MUTED);p.text(383,527,'Fn2',13,MUTED)
# D-pad.
p.rect(258,551,28,83,INK,None,3);p.rect(231,578,82,29,INK,None,3)
p.text(56,566,'方向键',23,GREEN);p.text(56,598,'移动 / 改值',19,MUTED);p.line(165,586,228,586,GREEN)
# Nintendo-style printed letters: X top, Y left, A right, B bottom.
for x,y,label in [(470,552,'X'),(434,588,'Y'),(506,588,'A'),(470,624,'B')]:
 p.circle(x,y,23,INK);p.text(x-8,y+8,label,23,PAPER)
p.text(579,568,'X / 编辑项',20);p.text(579,598,'A / 开关格',20);p.text(579,628,'B / 试听',20);p.text(579,658,'Y / 换页',20)
p.line(530,588,568,588,GREEN)
# Bottom row physically MENU, SELECT, START.
for x,label,symbol in [(326,'MENU','M'),(376,'SELECT','-'),(426,'START','>')]:
 p.circle(x,738,15,INK);p.text(x-6,744,symbol,16,PAPER);p.text(x-25,812,label,14,MUTED);p.line(x,756,x,792,MUTED)
for side in [230,487]:
 for i in range(5):p.circle(side+i*7,725,1.5,MUTED)
p.card(56,830,608,118,'30 秒开始',['START 播放 → A 开格 → B + 方向键改音高。','Fn1/Fn2 沿用系统设置，本版没有专用操作。'])
p.card(720,192,664,206,'基本操作',[
 '方向键移动；B + 方向键修改当前编辑值。','X 切 NOTE / VEL / CHANCE / GATE 等编辑项。','Y 下一页；按住 Y + ← 返回上一页。','L / R 切换音轨；MENU 循环切颜色主题。'])
p.card(720,416,664,235,'SELECT 层 / 工程与运输',[
 'SELECT + L / R：切 Pattern，播放时等轮末。','SELECT + ↑ / ↓：总音量；+ ← / →：BPM。','SELECT + A / B：当前轨静音 / 独奏。','SELECT + X / Y：保存 / 读取工程。','SELECT + START：保存并退出应用。'])
p.card(720,669,664,173,'Punch-in / 总输出临时 FX',[
 '按住 L + R，再按 A 碎切 / B 失真 / X 回声 / Y 滤波。','继续按住效果键，用 ← / → 调力度，每次 5%。','可叠加；箭头指示调节对象；松键恢复原声。'],ORANGE)
p.card(720,860,664,88,'X 层 / 音高与调式',[
 'X + ←/→ 半音；+ ↑/↓ 八度；+ L/R 调式；+ A/B 根音。'])
p.finish('cheat-sheet-01.svg')

p=Page(2,'制作与演化 / 按页面查操作','普通 FX 可以单轨；Punch-in 当前作用于总输出。参数更改会自动保存。')
p.card(56,192,650,230,'01  音序 / 条件触发',[
 'X 切编辑项，B + 方向键修改，A 开关 step。','SLICE 选具体切片；COND 选触发条件。','ALL 每轮；1ST 首轮；LATE 第二轮开始。','1/2、2/2 交替轮；1/4…4/4 指定四轮中的一轮。','R 显示轮次；重新 START 从首轮重来。'])
p.card(734,192,650,230,'02  SOUND / 音色与调制',[
 'SOURCE 选择合成音色或 sample。','Pluck 拨弦；Bell 金属钟；Marimba 木质敲击。','上下选参数，左右调数值，B 试听。','MATERIAL 改泛音亮度；OVERTONE RATIO 改比例。','LFO 页 X 加映射；分轨 FX 映射须先开效果器。'])
p.card(56,442,650,230,'03  WAV / 切片',[
 'WAV 放入 TF 卡 Apps/Loopfield/samples/。','SOUND 选 sample，再选 WAV；EDIT SAMPLE 编辑。','START/END 左右步进 0.1s；B + 左右微调 1ms。','SLICES 设等分数；ASSIGN 行 A 分配到 32 步。','MODE 反向/循环；导出选区另存，不改原 WAV。'])
p.card(734,442,650,230,'04  WALK / 小范围演化',[
 'SOUND → SLICE WALK：off / slow / active。','WALK CHANGE %：0 保持，100 每次换片。','WALK SLICES：左右浏览，A 勾选，X 仅保留当前。','例如只勾 S1、S3、S5，再设变化概率 25%。','游走仅在勾选片中移动；条件跳过不推进游走。'])
p.card(56,692,650,230,'05  MIXER / 效果路由',[
 'SEQUENCE 中 Y + ← 直达 MIXER。','上下选行，X 换列，左右调增益/声像/路由。','track+bus：分轨及总线 FX；bus：仅总线 FX。','direct：绕过两级 FX，仍经过 Punch 与总增益。','FX 页 X 选 MASTER 或 TRACK 1–8，确认目标。'])
p.card(734,692,650,230,'06  文件 / 试听',[
 'SELECT + X 手动保存，编辑后也会自动保存。','PROJECT → IMPORT：载入 projects/ 中的 JSON。','WAV 与 JSON 分开保存，搬工程时要一起复制。','Tone-Check：A Pluck / B Bell / C Marimba。','Piano-Evolving：A 对照 / B 游走 / C 条件 / D 混合。'])
p.text(56,950,'外观参考：trimuistore.com 的 TRIMUI Brick 正面产品图；本表按本版已验证的按键映射标注。',15,MUTED)
p.finish('cheat-sheet-02.svg');c.save()
doc=pymupdf.open(ROOT/'Loopfield-Brick-Cheat-Sheet.pdf')
for i,page in enumerate(doc):page.get_pixmap(matrix=pymupdf.Matrix(2,2),alpha=False).save(ROOT/f'cheat-sheet-{i+1:02}.png')
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Loopfield Pocket · Brick Cheat Sheet</title><style>body{margin:0;padding:24px;background:#ddd;font-family:system-ui}main{max-width:1440px;margin:auto}img{display:block;width:100%;margin:0 auto 24px;box-shadow:0 4px 24px #0002}nav{margin-bottom:20px}a{color:#285e4a}@media print{@page{size:A4 landscape;margin:0}body{padding:0}nav{display:none}img{width:100%;height:100vh;object-fit:contain;break-after:page;box-shadow:none;margin:0}}</style><main><nav><a href="Loopfield-Brick-Cheat-Sheet.pdf">下载两页 PDF</a> · SVG 可编辑；页面可直接打印</nav><img src="cheat-sheet-01.svg" alt="Brick 按键与现场操作"><img src="cheat-sheet-02.svg" alt="制作与演化"></main></html>'''
(ROOT/'index.html').write_text(html,encoding='utf-8')
print('cheat sheet: 2 PDF pages, SVG sources, PNG previews, HTML')

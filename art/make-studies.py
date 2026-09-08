import json
from pathlib import Path

ROOT = Path(__file__).parent / 'drafts'
ROOT.mkdir(exist_ok=True)
INK, SHADE, ACCENT = '#c9dfb0', '#365855', '#d9418b'

def stamp(data, x, y, rows, color=INK):
    for dy, row in enumerate(rows.splitlines()):
        for dx, char in enumerate(row):
            if char != ' ' and 0 <= x+dx < 64 and 0 <= y+dy < 32:
                data[f'{x+dx},{y+dy}'] = dict(char=char, color=color, bgColor='transparent')

def layer(name, frames):
    return dict(id=name, name=name, visible=True, solo=False, locked=False, opacity=100,
                propertyTracks=[], contentFrames=[dict(id=f'{name}-{i}', name=f'{i+1:02}',
                startFrame=i, durationFrames=1, data=data) for i, data in enumerate(frames)])

def save(name, layers):
    data = dict(version='2.1.0', name=name, canvas=dict(width=64, height=32,
                canvasBackgroundColor='#173d40', showGrid=False),
                timeline=dict(frameRate=12, durationFrames=48, looping=True), layers=layers)
    (ROOT/f'{name}.asciimtn').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')

bird = r'''           ,_
        .-'  `-.
       /        \
   ___/   o      |
  <___          /
      \   .----'--.
       | /  .--.   `.
       | | /    \    \
       | | \     |    |__
       |  \ `---'    /   `--.
        \  `-.     /_________>
         `.   `---'  /
           `-.____.-'
              |  |
            __|  |__'''
bird_crouch = r'''           ,_
        .-'  `-.
       /        \
   ___/   -      |
  <___          /
      \   .----'--.
       | /  .--.   `.
       | | (____)    |___
        \ \        /    `---.
         `.`------'___________>
           `-.____.-'
             _/  \_'''
bird_air = r'''           ,_
        .-'  `-.
       /        \
   ___/   o      |
  <___          /
      \   .----'--.
       | /   / /   `.
       | |  / / /    \
       | | /_/_/     |___
       |  \         /    `--.
        \  `-.     /_________>
         `.   `---'  /
           `-.____.-'
             /  \
            '    `'''

body = r'''        /\       /\
       /  \_____/  \
      |             |
      |   o     o   |
     =|      ^      |=
       \   `---'   /
        `-._____.-'
         /       \
        / /     \ \
       / /       \ \
      (_/|       |\_)
         |       |
         |   _   |
         |  / \  |
         | |   | |
        (_/     \_)'''
left = r'''       /\       /\
      /  \_____/  \
     |             |
     |   -     -   |
    =|      ^      |=
      \   `---'   /
       `-._____.-'
      __/       \
     / _   /\    \
    (_) | /  \    \_
        |/    \    _)
        |      \  |
         \  _   \ |
          \/ \   \|
          /   |  |
        (_/   |__)
                  `'''
right = r'''         /\       /\
        /  \_____/  \
       |             |
       |   -     -   |
      =|      ^      |=
        \   `---'   /
         `-._____.-'
          /       \__
         /    /\   _ \
       _/    /  \ | (_)
      (_    /    \|
        |  /      |
        | /   _  /
        |/   / \/
         |  |   \
         (__|   \_)
        ' '''

bird_frames, bird_shadow, cat_frames, cat_shadow = [], [], [], []
for f in range(48):
    d, sh = {}, {}
    # A held pose, anticipation, lift, flight, contact and recovery.
    if f < 12 or f >= 39:
        pose, y = bird, 9
        if f in (7, 8, 44): pose = pose.replace('o      |', '-      |')
    elif f < 17 or 34 <= f < 39:
        pose, y = bird_crouch, 12
    else:
        lift = [1,2,3,4,4,5,5,5,5,5,4,4,3,2,2,1,0][f-17]
        pose, y = bird_air, 9-lift
    stamp(d, 17, y, pose)
    stamp(d, 23, y+4, '<', ACCENT)
    stamp(sh, 26, 26, '. . _____ . .' if 17 <= f < 34 else ' ._________. ', SHADE)
    bird_frames.append(d); bird_shadow.append(sh)
    d, sh = {}, {}
    pose = left if 6 <= f < 18 else right if 30 <= f < 42 else body
    if pose == body and f in (1, 2, 25, 26): pose=pose.replace('o     o', '-     -')
    stamp(d, 19, 8, pose)
    # Tail follows the body with a delayed, separate four-pose cycle.
    tail = [r"     _", r"    __", r"     _", r"      _"][(f//6)%4]
    stamp(d, 37, 15, tail)
    stamp(d, 37, 16, "    / )\n    | |\n    | |\n   / /\n__/ /\n___/")
    stamp(d, 30+(1 if pose==right else -1 if pose==left else 0), 14, 'v', ACCENT)
    stamp(sh, 24, 27, '.  __________  .', SHADE)
    cat_frames.append(d); cat_shadow.append(sh)
save('bird', [layer('Ground', bird_shadow), layer('Bird', bird_frames)])
save('cat', [layer('Ground', cat_shadow), layer('Cat', cat_frames)])

architecture, rain, ripples, shelter = [], [], [], []
for f in range(48):
    bg, drops, water, fg = {}, {}, {}, {}
    stamp(bg, 3, 4, r'''    _____________
   /____________/|
   |            ||
   |  __   __   ||
   | |__| |__|  ||
   | |__| |__|  ||
   |            ||
   |  __   __   ||
   | |__| |__|  ||
   | |__| |__|  ||
   |            ||
   |  __   __   ||
   | |__| |__|  ||
   | |__| |__|  ||
   |            ||
   |  ____      ||
   | |    |     ||
   |_|____|_____|/''', SHADE)
    stamp(bg, 44, 6, r'''    .-.
   /___\
    |*|
    `-'
     |
     |
     |
     |
     |
     |
     |
     |
     |
     |
     |
    _|_''', INK)
    stamp(bg, 49, 8, '*', ACCENT)
    stamp(bg, 3, 25, '__________________________________________________________', SHADE)
    stamp(fg, 26, 12, r'''       .-^-.
    .-'  |  `-.
  .'     |     `.
 /_______|_______\
  '   '  |  '   '
         |
       .-|-.
       (o o)
        \_/
        /|\
       / | \
         |
        / \
       /   \ ''', INK)
    stamp(fg, 26, 15, r' /_______|_______\ ', ACCENT)
    for i in range(40):
        x=2+(i*17)%59; y=2+((i*13+f*(2 if i%3 else 1))%23)
        if 26 <= x <= 44 and y >= 12: continue
        stamp(drops, x, y, '/' if i%3 else '.', SHADE if i%4 else INK)
    for i in range(7):
        age=(f+i*7)%16
        glyph=['.', "'", '()', '( )', '(   )', ' ._. ', '     ', '     '][age//2]
        stamp(water, 7+i*7, 27+i%3, glyph, ACCENT if i==4 else SHADE)
    architecture.append(bg); rain.append(drops); ripples.append(water); shelter.append(fg)
save('rain', [layer('Architecture', architecture), layer('Rain', rain), layer('Ripples', ripples), layer('Shelter', shelter)])
print('Created bird, cat and rain: 64 x 32, 48 frames, editable layers')

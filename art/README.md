# LOOPFIELD ASCII Motion sources

`bird.asciimtn`, `cat.asciimtn` and `rain.asciimtn` are editable, layered projects imported, visually reviewed and exported through ASCII Motion 2.2. Each uses a 64 x 32 character canvas and a 48-frame loop at 12 fps. These are original LOOPFIELD drawings, not community artwork.

- Bird: held pose, blink, anticipation, lift, flight, contact and recovery. Separate ground layer.
- Cat: left / neutral / right poses with follow-through in the tail. Separate ground layer.
- Rain: separate architecture, rain, ripples and shelter layers.

Open a source using **Import → .asciimtn** at https://ascii-motion.app. Save the edited project back under its original filename here, then run `npm run build`. `compile.mjs` packs the character cells into deduplicated cels for the lightweight LOOPFIELD player. This converter supports these projects' baked content frames; bake keyframe transforms/effects into content frames before using new ones.

Runtime uses a common cell size and canvas origin. Each loop spans four musical beats; idle playback runs more slowly. Low-frequency energy extends the bird's lift and lights ripples; high frequencies add rain. Colors map onto the app palette. The player does not load the editor or WebGL.

`make-studies.py` retains the initial drawing / pose construction source and writes drafts to `art/drafts/`. The canonical `.asciimtn` files above are the editor exports.

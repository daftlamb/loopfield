import {readFile,writeFile} from 'node:fs/promises';
const names=['play','stop','save','upload','download','plus','minus','copy','trash','undo','close','shuffle','arrow-up','arrow-down','sort-vertical','power','more-horizontal','grid-3x3','bulletlist','music','sliders','image','file','pencil','headphone','volume-x'];
const icons={};
for(const name of names){const svg=await readFile(`node_modules/pixelarticons/svg/${name}.svg`,'utf8');icons[name]=svg.replace('<svg ','<svg class="uiIcon" aria-hidden="true" focusable="false" ').replace(/\s+/g,' ').trim();}
await writeFile('icons.js',`const icons=${JSON.stringify(icons)};\nexport const icon=name=>icons[name];\n`);
await writeFile('PIXELARTICONS-LICENSE.txt',await readFile('node_modules/pixelarticons/LICENSE'));

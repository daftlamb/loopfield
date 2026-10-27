import './icon-build.mjs';
import {mkdir,copyFile,cp,rm,access,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const panSource=process.env.PAN_GARDEN_DIR||fileURLToPath(new URL('../pan-garden/dist/',import.meta.url));
await access(path.join(panSource,'index.html'));
await rm(new URL('./dist/',import.meta.url),{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','model.js','audio.js','midi.js','midi-ui.js','browser-midi.js','clock.js','fx.js','fx-model.js','visuals.js','mobile.js','modulation.js','mod-ui.js','icons.js','PIXELARTICONS-LICENSE.txt'])await copyFile(file,'dist/'+file);
await cp('fonts','dist/fonts',{recursive:true});
console.log('Static site built in dist/');

await cp('assets','dist/assets',{recursive:true});
await cp(panSource,'dist/pan-garden',{recursive:true});
const panHtml=await readFile('dist/pan-garden/index.html','utf8');
await writeFile('dist/pan-garden/index.html',panHtml.replace('href="/loopfield/"','href="/"'));

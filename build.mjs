import './icon-build.mjs';
import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm(new URL('./dist/',import.meta.url),{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','model.js','audio.js','voice-shaping.js','midi.js','midi-ui.js','clock.js','fx.js','fx-model.js','visuals.js','mobile.js','modulation.js','mod-ui.js','icons.js','dot-icons.js','PIXELARTICONS-LICENSE.txt'])await copyFile(file,'dist/'+file);
await cp('fonts','dist/fonts',{recursive:true});
console.log('Static site built in dist/');

await cp('assets','dist/assets',{recursive:true});

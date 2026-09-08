import './icon-build.mjs';
import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','model.js','audio.js','clock.js','fx.js','fx-model.js','visuals.js','animals.js','memes.js','mobile.js','modulation.js','mod-ui.js','icons.js','PIXELARTICONS-LICENSE.txt'])await copyFile(file,'dist/'+file);
await cp('fonts','dist/fonts',{recursive:true});
console.log('Static site built in dist/');

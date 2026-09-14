import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist-mobile',{recursive:true,force:true});
await mkdir('dist-mobile',{recursive:true});
let html=await readFile('index.html','utf8');
html=html.replace('<html lang="zh-CN">','<html lang="zh-CN" class="mobile-shell">')
 .replace('<title>LOOPFIELD — sound / image</title>','<title>Loopfield</title>')
 .replace('</head>','<link rel="stylesheet" href="shell.css"></head>')
 .replace('src="app.js"','src="shell.js"');
await writeFile('dist-mobile/index.html',html);
// The app uses the existing mobile panel rules at all native widths, including iPad.
const css=(await readFile('style.css','utf8')).replaceAll('@media(max-width:760px)','@media(min-width:0px)').replaceAll('@media(max-width:520px)','@media(min-width:0px)');
await writeFile('dist-mobile/style.css',css);
await copyFile('mobile/shell.css','dist-mobile/shell.css');
await copyFile('clock.js','dist-mobile/clock.js');
for(const dir of ['fonts','assets'])await cp(dir,'dist-mobile/'+dir,{recursive:true});
await copyFile('PIXELARTICONS-LICENSE.txt','dist-mobile/PIXELARTICONS-LICENSE.txt');
await build({entryPoints:['mobile/bootstrap.js'],bundle:true,format:'esm',target:'safari16.4',outfile:'dist-mobile/shell.js',sourcemap:true});
console.log('Loopfield offline iOS bundle ready');

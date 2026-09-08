import {readFile,writeFile} from 'node:fs/promises';

const art={};
for(const [scene,file] of [['memeBird','bird'],['memeDance','cat'],['rain','rain']]){
  const source=JSON.parse(await readFile(new URL(`${file}.asciimtn`,import.meta.url),'utf8'));
  if(source.canvas.width!==64||source.canvas.height!==32)throw Error(`${file}: expected 64 x 32`);
  art[scene]={length:source.timeline.durationFrames,layers:source.layers.filter(l=>l.visible).map(layer=>{
    const cels=[],frames=[],seen=new Map();
    for(let f=0;f<source.timeline.durationFrames;f++){
      const frame=layer.contentFrames.find(c=>c.startFrame<=f&&f<c.startFrame+c.durationFrames);
      const cells=Object.entries(frame?.data??{}).map(([key,cell])=>{
        const [x,y]=key.split(',').map(Number);
        if(x<0||x>=64||y<0||y>=32)throw Error(`${file}: cell outside canvas`);
        return [y*64+x,cell.char,cell.color.toLowerCase()==='#d9418b'?3:cell.color.toLowerCase()==='#365855'?2:1];
      });
      const key=JSON.stringify(cells);if(!seen.has(key)){seen.set(key,cels.length);cels.push(cells);}frames.push(seen.get(key));
    }
    return {name:layer.name,frames,cels};
  })};
}
await writeFile(new URL('../motion-art.js',import.meta.url),`export const motionArt=${JSON.stringify(art)};\n`);
console.log('Compiled ASCII Motion source projects');

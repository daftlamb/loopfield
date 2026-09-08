import {motionArt} from './motion-art.js';

export function drawMotion(scene,phase,low,high,put){
  const art=motionArt[scene];if(!art)return false;
  const frame=Math.floor(phase*12)%art.length;
  for(const layer of art.layers){
    const cells=layer.cels[layer.frames[frame]];
    const lift=layer.name==='Bird'&&frame>=17&&frame<34?Math.round(Math.min(1,low)*2):0;
    for(const [position,char,tone] of cells){
      if(layer.name==='Rain'&&position%5>2+Math.min(2,high*4))continue;
      put(position%64,Math.floor(position/64)-lift,char,layer.name==='Ripples'&&low>.3?3:tone);
    }
  }
  return true;
}

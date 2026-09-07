export const fxSpecs=[
  {id:'delay',title:'DELAY',name:'延迟',params:[['mix','MIX',0,1,0.01,0.25],['time','TIME',0.05,0.8,0.01,0.3],['feedback','FEEDBACK',0,0.7,0.01,0.35]]},
  {id:'reverb',title:'REVERB',name:'混响',params:[['mix','MIX',0,1,0.01,0.25],['decay','DECAY',0.2,4,0.1,1.8]]},
  {id:'chorus',title:'CHORUS',name:'合唱',params:[['mix','MIX',0,1,0.01,0.35],['rate','RATE',0.1,5,0.1,0.8],['depth','DEPTH',0,8,0.1,3]]},
  {id:'compressor',title:'COMP',name:'压缩',params:[['threshold','THRESH',-60,0,1,-24],['ratio','RATIO',1,20,0.5,4],['makeup','GAIN',0,18,0.5,3]]},
  {id:'crusher',title:'BITCRUSH',name:'降比特',params:[['mix','MIX',0,1,0.01,0.6],['bits','BITS',2,16,1,6],['drive','DRIVE',1,12,0.5,4]]}
];
export const defaultFx=()=>Object.fromEntries(fxSpecs.map(f=>[f.id,{enabled:false,...Object.fromEntries(f.params.map(([id,,,,,value])=>[id,value]))}]));
export function validateFx(fx){
  if(!fx||typeof fx!=='object')throw Error('FX 格式不正确');
  for(const spec of fxSpecs){const f=fx[spec.id];if(!f||typeof f.enabled!=='boolean')throw Error('FX 开关格式不正确');for(const [id,,min,max] of spec.params)if(typeof f[id]!=='number'||!Number.isFinite(f[id])||f[id]<min||f[id]>max||(id==='bits'&&!Number.isInteger(f[id])))throw Error('FX 参数超出范围');}
  return fx;
}
export function fxValue(id,value){
  if(['mix','feedback'].includes(id))return Math.round(value*100)+'%';
  if(id==='time')return Math.round(value*1000)+'ms';
  if(id==='decay')return value.toFixed(1)+'s';
  if(id==='rate')return value.toFixed(1)+'Hz';
  if(id==='depth')return value.toFixed(1)+'ms';
  if(['threshold','makeup'].includes(id))return value+'dB';
  if(id==='ratio')return value+':1';
  if(id==='drive')return value+'×';
  return String(value);
}
export function fxTail(fx){
  let tail=3;
  if(fx.delay.enabled&&fx.delay.mix>0){const repeats=fx.delay.feedback>0?Math.ceil(Math.log(0.001)/Math.log(fx.delay.feedback)):1;tail+=fx.delay.time*repeats;}
  if(fx.reverb.enabled&&fx.reverb.mix>0)tail+=fx.reverb.decay;
  return tail;
}

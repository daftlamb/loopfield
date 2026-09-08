import {drawMotion} from './motion-player.js';
import {drawMeme,memeCaptions} from './memes.js';
import {drawAnimal} from './animals.js';
const palettes={
  paper:['#e9e9e1','#346366','#768a87','#bcc8c0','#d9418b','#173d40','#c9dfb0','#365855'],
  gameboy:['#cadc9f','#30452a','#63774b','#9fb77c','#607b30','#172c22','#bbd778','#3d5739'],
  amber:['#241e17','#efbb62','#b39366','#554631','#ff7958','#15130e','#ffd080','#504027'],
  midnight:['#161e32','#b3c7e5','#8394b5','#354460','#ee88b7','#0b1223','#91c7e3','#293c57'],
  ink:['#ededeb','#242624','#6c706c','#bbbebb','#616861','#171917','#e4e6df','#424742']
};
const captions={...memeCaptions,horse:'HORSE / 奔跑练习',spectrum:'SPECTRAL TERRAIN',fish:'GOLDFISH / 水中漫游',rain:'RAIN / 雨落街角',city:'CITY / 夜间放送'};
// Fixed offsets from each animation's full-cycle bounds; never recenter individual frames.
const sceneOffsets={memeCat:[16,60],memeMoon:[32,66],memeBird:[-12,6],memeFace:[0,48]};
export function startVisuals(engine){
  const $=s=>document.querySelector(s),canvas=$('#visual'),ctx=canvas.getContext('2d');
  let prefs={palette:'paper',scene:'random',slideshowVersion:2,sensitivity:1.4};
  try{const p=JSON.parse(localStorage.getItem('loopfield-visuals-v1'));if(p){if(palettes[p.palette])prefs.palette=p.palette;if(p.slideshowVersion===2&&(captions[p.scene]||p.scene==='random'))prefs.scene=p.scene;if(Number.isFinite(p.sensitivity)&&p.sensitivity>=0.5&&p.sensitivity<=3)prefs.sensitivity=p.sensitivity;}}catch{}
  const animalCanvas=document.createElement('canvas');animalCanvas.width=576;animalCanvas.height=432;const animalCtx=animalCanvas.getContext('2d',{willReadFrequently:true});
  let phase=0,scene='memeBird',nextSceneAt=0,sceneBag=[];
  let colors,energy=0,low=0,high=0,time=0,last=0,lastDraw=0;
  const fft=new Uint8Array(512),wave=new Float32Array(1024),levels=new Float32Array(64);
  const chars=Array(64*32).fill(' '),tones=new Uint8Array(64*32);
  function settings(){
    colors=palettes[prefs.palette];['paper','ink','muted','line','accent','screen','light','shade'].forEach((k,i)=>document.documentElement.style.setProperty('--'+k,colors[i]));
    $('#palette').value=prefs.palette;$('#scene').value=prefs.scene;$('#sensitivity').value=prefs.sensitivity;

  }
  function save(){settings();try{localStorage.setItem('loopfield-visuals-v1',JSON.stringify(prefs));}catch{}}
  $('#palette').onchange=e=>{prefs.palette=e.target.value;save();};$('#scene').onchange=e=>{prefs.scene=e.target.value;nextSceneAt=0;save();};
  $('#sensitivity').oninput=e=>{prefs.sensitivity=Number(e.target.value);save();};settings();
  function put(x,y,ch,tone=1){x=Math.round(x);y=Math.round(y);if(x>=0&&x<64&&y>=0&&y<32){chars[y*64+x]=ch;tones[y*64+x]=tone;}}
  function text(x,y,str,tone=1){[...str].forEach((ch,i)=>{if(ch!==' ')put(x+i,y,ch,tone);});}
  function line(x1,y1,x2,y2,ch,tone=1){const n=Math.max(Math.abs(x2-x1),Math.abs(y2-y1),1);for(let i=0;i<=n;i++)put(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n,ch,tone);}
  function fishScene(){
    for(let x=1;x<63;x++){put(x,2+Math.sin(x*.21+time)*(.35+low),'~',2);if(x%3===0)put(x,29+Math.sin(x*.63),'·',2);}
    for(const [root,h] of [[4,10],[8,6],[12,8],[54,7],[59,11]])for(let y=0;y<h;y++){const x=root+Math.sin(time*.7+y*.6)*1.5;put(x,28-y,'|',2);if(y%2===0){put(x-1,28-y,'/');put(x+1,27-y,'\\');}}
    for(let i=0;i<9;i++){const y=28-((time*(1.5+high*3)+i*3.7)%25);put(5+(i*17)%54+Math.sin(y*.4+time),y,i%3===0?'o':'.',2);}
    for(let f=0;f<3;f++){
      const theta=time*(.15+f*.026)+f*2.1,cx=32+Math.sin(theta)*(20-f*3),cy=11+f*6+Math.sin(theta*1.6)*2,dir=Math.cos(theta)>0?1:-1,size=f===0?1:0.7;
      for(let y=-5;y<=5;y++)for(let x=-10;x<=7;x++){
        const xx=x/size,yy=y/size,r=(xx/6)**2+(yy/3)**2;
        if(r<1)put(cx+x*dir,cy+y,r>.62?'*':(x+y)%3===0?'@':':',3);
        else if(xx<-5&&xx>-11&&Math.abs(yy)<(-xx-4)*.65)put(cx+x*dir,cy+y+Math.sin(time*3+f)*(Math.abs(xx)-5)*.13,'/',3);
      }
      put(cx+3*size*dir,cy-1,'o',1);put(cx+6*size*dir,cy,'>',1);text(cx-2,cy-4*size,'/^',3);text(cx-2,cy+3*size,'v',3);
    }

  }
  function cityScene(){
    text(47,3,' .--.');text(46,4,'(    )');text(47,5," '--'");
    for(let i=0;i<20;i++)put((i*29)%63,1+(i*7)%11,'.',2);
    for(let b=0;b<10;b++){const x=b*7-2,h=7+(b*11)%13,top=26-h;line(x,top,x+5,top,'_');line(x,top,x,26,'|');line(x+5,top,x+5,26,'|');
      if(b%3===0){line(x+2,top-3,x+2,top,'|',2);put(x+2,top-3,'*',3);}
      for(let y=top+2;y<25;y+=2)for(let c=1;c<5;c+=2){const glow=Math.sin(b*12+y*3+c+time*.15)>0.1-low*.7;put(x+c,y,glow?'#':'.',glow?(b%3===0?3:1):2);}
    }
    line(0,27,63,27,'=');for(let x=0;x<64;x+=5)put(x,30,'_',2);
    const car=(time*3.2)%78-10;text(car,28,' __==__',3);text(car,29,'[o____o]>',1);

  }
  function spectrum(){for(let x=0;x<64;x++)for(let y=0;y<32;y++){const d=Math.abs(y-15.5),h=levels[x]*prefs.sensitivity*13;if(d<h)put(x,y,' .:+*#%@'[Math.min(7,Math.max(2,Math.floor((1-d/h)*7)))],d<h*.28?3:1);else if(x%4===0&&y%4===0)put(x,y,'+',2);else if(d<.6)put(x,y,'.',2);}}
  function draw(now){requestAnimationFrame(draw);engine.tick();if(now-lastDraw<33)return;const dt=last?Math.min((now-last)/1000,.1):0;last=now;lastDraw=now;
    let rms=0,bass=0,treble=0;if(engine.bus){engine.bus.analyser.getByteFrequencyData(fft);engine.bus.analyser.getFloatTimeDomainData(wave);for(const v of wave)rms+=v*v;rms=Math.sqrt(rms/wave.length);}else fft.fill(0);
    for(let i=1;i<20;i++)bass+=fft[i]/255/19;for(let i=60;i<200;i++)treble+=fft[i]/255/140;
    energy=energy*.7+rms*.3;low=low*.85+bass*prefs.sensitivity*.15;high=high*.85+treble*prefs.sensitivity*.15;time+=dt*(1+Math.min(1.5,energy*prefs.sensitivity*8));
    phase+=dt*(engine.playing?engine.getProject().bpm/60:.45);
    const active=energy>.0005;$('#level').style.width=Math.min(100,energy*500)+'%';$('#db').textContent=energy>.0001?Math.round(20*Math.log10(energy))+' dB':'−∞ dB';$('#liveDot').classList.toggle('active',active);
    for(let x=0;x<64;x++)levels[x]=levels[x]*.65+fft[Math.min(511,Math.floor(2**(x/63*8.7)))]/255*.35;
    if(prefs.scene==='random'){
      if(now>=nextSceneAt){
        if(!sceneBag.length)sceneBag=['memeBird','memeDance','rain'].filter(name=>name!==scene);
        scene=sceneBag.splice(Math.floor(Math.random()*sceneBag.length),1)[0];nextSceneAt=now+12000;
      }
    }else scene=prefs.scene;
    canvas.dataset.scene=scene;
    const animal=scene==='horse';
    chars.fill(' ');tones.fill(0);
    if(!drawMotion(scene,phase,low,high,put)){
    if(memeCaptions[scene])drawMeme(scene,phase,Math.min(1,energy*prefs.sensitivity*12),text,put);
    else if(animal){
      drawAnimal(animalCtx,phase,Math.min(1,energy*prefs.sensitivity*12),colors);
      {const pixels=animalCtx.getImageData(0,0,576,432).data;for(let y=0;y<32;y++)for(let x=0;x<64;x++){let strongest=0,tone=1;for(let dy=0;dy<12;dy++)for(let dx=0;dx<9;dx++){const i=((y*12+20+dy)*576+x*9+dx)*4;if(pixels[i+3]>strongest){strongest=pixels[i+3];tone=Math.abs(pixels[i]-parseInt(colors[4].slice(1,3),16))<5?3:1;}}if(strongest>70)put(x,y,'+',tone);}}
    }else if(scene==='fish')fishScene();else if(scene==='city')cityScene();else spectrum();
    }
    ctx.fillStyle=colors[5];ctx.fillRect(0,0,576,432);ctx.save();
    const offset=sceneOffsets[scene];if(offset)ctx.translate(...offset);
    ctx.font='16px "Loop Pixel",monospace';ctx.textAlign='center';
    for(let y=0;y<32;y++)for(let x=0;x<64;x++){const i=y*64+x;if(chars[i]===' ')continue;ctx.fillStyle=tones[i]===3?colors[4]:tones[i]===2?colors[7]:colors[6];ctx.fillText(chars[i],36+x*8,y*12+34);}
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

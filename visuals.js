const palettes={
  paper:['#e9e9e1','#346366','#768a87','#bcc8c0','#d9418b','#173d40','#c9dfb0','#365855'],
  gameboy:['#cadc9f','#30452a','#63774b','#9fb77c','#607b30','#172c22','#bbd778','#3d5739'],
  amber:['#241e17','#efbb62','#b39366','#554631','#ff7958','#15130e','#ffd080','#504027'],
  midnight:['#161e32','#b3c7e5','#8394b5','#354460','#ee88b7','#0b1223','#91c7e3','#293c57'],
  ink:['#ededeb','#242624','#6c706c','#bbbebb','#616861','#171917','#e4e6df','#424742']
};
export function startVisuals(engine){
 const $=s=>document.querySelector(s),canvas=$('#visual'),ctx=canvas.getContext('2d');
 const buffer=document.createElement('canvas');buffer.width=200;buffer.height=150;const g=buffer.getContext('2d',{willReadFrequently:true});
 let prefs={palette:'paper',scene:'random',sensitivity:1.4};
 try{const p=JSON.parse(localStorage.getItem('loopfield-visuals-v1'));if(p){if(palettes[p.palette])prefs.palette=p.palette;if(['store','atlas','globe','interface','random'].includes(p.scene))prefs.scene=p.scene;if(p.sensitivity>=.5&&p.sensitivity<=3)prefs.sensitivity=p.sensitivity;}}catch{}
 const names=['store','atlas','globe','interface'],images={};let ready=false;
 Promise.all(names.map(name=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[name]=img;resolve();};img.onerror=reject;img.src=new URL('./assets/scenes/'+(name==='interface'?'interface-color':name)+'.png',import.meta.url).href;}))).then(()=>ready=true).catch(()=>{canvas.setAttribute('aria-label','场景素材加载失败，请刷新');});
 function settings(){palettes[prefs.palette].forEach((v,i)=>document.documentElement.style.setProperty('--'+['paper','ink','muted','line','accent','screen','light','shade'][i],v));$('#palette').value=prefs.palette;$('#scene').value=prefs.scene;$('#sensitivity').value=prefs.sensitivity;}
 function save(){settings();localStorage.setItem('loopfield-visuals-v1',JSON.stringify({...prefs,slideshowVersion:3}));}
 let sceneStart=performance.now();$('#palette').onchange=e=>{prefs.palette=e.target.value;save();};$('#scene').onchange=e=>{prefs.scene=e.target.value;sceneStart=performance.now();save();};$('#sensitivity').oninput=e=>{prefs.sensitivity=+e.target.value;save();};settings();
 const fft=new Uint8Array(512),wave=new Float32Array(1024);let last=0,time=0,energy=0,bass=0;
 function draw(now){requestAnimationFrame(draw);engine.tick();if(now-last<66)return;const dt=last?Math.min(.2,(now-last)/1000):0;last=now;time+=dt;
 let rms=0,low=0;if(engine.bus){engine.bus.analyser.getByteFrequencyData(fft);engine.bus.analyser.getFloatTimeDomainData(wave);for(const v of wave)rms+=v*v;for(let i=1;i<20;i++)low+=fft[i]/255/19;rms=Math.sqrt(rms/wave.length);}energy=energy*.65+rms*.35;bass=bass*.7+low*prefs.sensitivity*.3;
 $('#level').style.width=Math.min(100,energy*500)+'%';$('#db').textContent=energy>.0001?Math.round(20*Math.log10(energy))+' dB':'−∞ dB';$('#liveDot').classList.toggle('active',energy>.0005);
 if(!ready)return;const scene=prefs.scene==='random'?names[Math.floor((now-sceneStart)/30000)%3]:prefs.scene;canvas.dataset.scene=scene;
 if(scene==='interface'){
 ctx.imageSmoothingEnabled=false;ctx.drawImage(images.interface,0,0,canvas.width,canvas.height);
 ctx.save();ctx.scale(canvas.width/362,canvas.height/271.5);
 const ink=['#ffc050','#91edb1','#83e3ed','#ed9384','#b49bea'],pulse=Math.min(1,energy*prefs.sensitivity*12);
 // Animated CRT stays clipped inside the illustrated glass.
 ctx.save();ctx.beginPath();ctx.rect(256,150,52,39);ctx.clip();
 ctx.fillStyle='#83e3ed';for(let x=0;x<49;x++){const y=Math.round(168+Math.sin(x*.2-time*3)*(2+pulse*10)+Math.sin(x*.5+time)*bass*2);ctx.fillRect(257+x,y,1,1);}
 for(let k=0;k<9;k++){const h=Math.round(2+Math.abs(Math.sin(time*2+k))*(2+pulse*7));ctx.fillStyle=ink[k%5];ctx.fillRect(259+k*5,186-h,3,h);}
 if(Math.floor(time*2)%2===0)ctx.fillRect(258,152,2,1);ctx.restore();
 // Finger markers light in a walking pattern, with extra brightness on transients.
 const fingers=[[123,52],[132,47],[143,45],[153,47],[208,48],[218,45],[229,47],[238,53]];
 const active=Math.floor(time*(1+pulse*3))%8;
 fingers.forEach(([x,y],i)=>{ctx.globalAlpha=i===active?1:.15+pulse*.5;ctx.fillStyle=ink[i%5];ctx.fillRect(x-1,y-1,3,3);});ctx.globalAlpha=1;
 const tool=Math.floor(time*.8)%14;ctx.strokeStyle=ink[tool%5];ctx.lineWidth=1;ctx.strokeRect(20+(tool%2)*19,16+Math.floor(tool/2)*16,16,13);
 // A rotating wire object in the empty space beside the stylus diagram.
 const spin=time*.8,points=Array.from({length:4},(_,i)=>[241+Math.cos(spin+i*Math.PI/2)*8,120+Math.sin(spin+i*Math.PI/2)*3]);ctx.strokeStyle='#91edb1';ctx.beginPath();points.forEach(([x,y],i)=>{ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(Math.round(points[(i+1)%4][0]),Math.round(points[(i+1)%4][1]));ctx.moveTo(Math.round(x),Math.round(y));ctx.lineTo(241,109);});ctx.stroke();
 ctx.fillStyle='#ffc050';ctx.fillRect(302,27+Math.floor((Math.sin(time*2)+1)*6),2,2);ctx.fillStyle='#83e3ed';ctx.fillRect(292+Math.floor((Math.sin(time*1.7)+1)*19),91,2,2);
 const key=Math.floor(time*4)%12;ctx.fillStyle=ink[key%5];ctx.globalAlpha=.4+pulse*.6;ctx.fillRect(219+key*6,226,4,2);ctx.globalAlpha=1;ctx.restore();return;
 }
 g.fillStyle='#000';g.fillRect(0,0,200,150);g.imageSmoothingEnabled=false;
 const dx=Math.round(3*Math.sin(time*.3)),dy=Math.round(2*Math.sin(time*.6));
 if(scene==='store')g.drawImage(images.store,0,0,200,150);
 else if(scene==='atlas')g.drawImage(images.atlas,dx,dy,200,150);
 else{const cell=images.globe.width/6,frame=Math.floor(time/0.667)%12;g.drawImage(images.globe,(frame%6)*cell+36,Math.floor(frame/6)*cell+36,cell-72,cell-72,44,19,112,112);}
 const pixels=g.getImageData(0,0,200,150),d=pixels.data;
 const fault=time%19.3,broken=fault>16.6&&fault<16.85||fault>17.1&&fault<17.225;
 for(let y=0;y<150;y++)for(let x=0;x<200;x++){const i=(y*200+x)*4,lit=d[i]>100;let color=[9,17,31];
 if(lit){if(scene==='store'){color=y>101?[78,143,162]:[87,127,153];if(x>40&&x<163&&y>53&&y<103)color=[245,179,104];if(y>103&&x>43&&x<154)color=[150,156,146];if(y>55&&y<63&&x>41&&x<160){const v=broken&&x>131?.22:.68+Math.min(.32,bass*.45);color=[255*v,202*v,124*v];}}
 else if(scene==='atlas')color=(x+y)%19<3?[226,181,114]:[99,197,180];
 else color=[116+35*bass,195+20*bass,173];
 }else if(scene==='globe'&&(x-100)**2+(y-75)**2<55**2)color=[23,57,88];
 d[i]=color[0];d[i+1]=color[1];d[i+2]=color[2];d[i+3]=255;}
 g.putImageData(pixels,0,0);
 if(scene==='store'){for(let k=0;k<9;k++){const y=107+k*4,shift=Math.round(Math.sin(time*1.5+k));g.drawImage(buffer,45,y,110,1,45+shift,y,110,1);}g.fillStyle='#82b0ca';for(let k=0;k<9;k++){const x=(k*37+Math.floor(time))%200,y=(k*23+Math.floor(time*13))%150;if(y<50||y>104)g.fillRect(x,y,1,2);}}
 if(scene==='atlas'){g.fillStyle='#edb878';for(let k=0;k<8;k++){if((k+Math.floor(time*2))%4===0)g.fillRect(58+k*7%18+dx,53+k*11%20+dy,1+Math.round(Math.min(1,bass)),1);}}
 ctx.imageSmoothingEnabled=false;ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
 }
 requestAnimationFrame(draw);
}

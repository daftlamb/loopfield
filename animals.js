export function drawAnimal(ctx,scene,phase,pulse,colors){
  ctx.clearRect(0,0,576,432);
  ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
  const path=(points,color=colors[6])=>{ctx.strokeStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  const oval=(x,y,rx,ry,color=colors[6])=>{ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();};
  path([[120,302],[456,302]],colors[7]);
  if(scene==='cat'){
    const reach=(Math.sin(phase*Math.PI)+1)/2,ballX=351+reach*43;
    oval(262,267,43,29);
    path([[233,249],[223,230],[224,197],[245,213],[265,211],[286,196],[284,235],[273,247]]);
    path([[239,227],[244,229]]);path([[265,229],[270,227]]);
    path([[251,236],[256,239],[260,236]],colors[4]);
    path([[238,237],[214,233]]);path([[239,242],[216,246]]);
    path([[271,237],[296,233]]);path([[270,242],[294,247]]);
    path([[241,281],[236,299],[256,299]]);
    path([[282,274],[302+reach*20,286-reach*8],[320+reach*18,284-reach*8]],colors[4]);
    ctx.strokeStyle=colors[6];ctx.beginPath();ctx.moveTo(224,274);ctx.bezierCurveTo(181,284,192,231,175+reach*8,240);ctx.stroke();
    const y=289-Math.sin(reach*Math.PI)*15;
    oval(ballX,y,13,13,colors[4]);path([[ballX-8,y-8],[ballX+8,y+8]],colors[4]);
  }else if(scene==='horse'){
    const stride=phase*Math.PI*2,bob=Math.sin(stride*2)*3;
    ctx.save();ctx.translate(0,bob);
    path([[216,233],[239,217],[300,220],[316,186],[329,166],[333,182],[355,195],[357,207],[342,213],[325,206],[321,246],[303,259],[250,258],[226,246],[216,233]]);
    path([[313,189],[302,204],[299,215]],colors[4]);
    oval(339,195,1.5,1.5);
    for(let i=0;i<4;i++){
      const front=i>1,root=front?305:241,a=stride+(i%2)*Math.PI+(front?.9:0);
      const kneeX=root+Math.sin(a)*23,kneeY=271-Math.max(0,Math.cos(a))*12;
      path([[root,251],[kneeX,kneeY],[root+Math.sin(a+.6)*38,295-Math.max(0,Math.cos(a))*24]],i%2?colors[7]:colors[6]);
    }
    path([[221,230],[198,226+Math.sin(stride)*7],[182,239+Math.sin(stride+.5)*9]],colors[4]);
    ctx.restore();
    for(let i=0;i<3;i++){const x=130+((i*109-phase*55)%320+320)%320;path([[x,315],[x+12,315]],colors[7]);}
  }else{
    const cycle=((phase/4)%1+1)%1,x=90+cycle*396,jump=Math.max(0,1-Math.abs(x-296)/90),y=268-Math.sin(jump*Math.PI/2)*91;
    path([[288,300],[288,261],[305,261],[305,300]],colors[4]);
    path([[282,271],[311,271]],colors[4]);
    ctx.save();ctx.translate(x,y);
    ctx.strokeStyle=colors[6];ctx.beginPath();
    for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=1+.1*Math.cos(a*10),px=Math.cos(a)*32*r,py=Math.sin(a)*22*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
    oval(34,-5,12,16);oval(38,-9,1.5,1.5);path([[29,-18],[20,-26],[20,-16]]);
    const kick=Math.sin(phase*Math.PI*2)*7*(1-jump);
    path([[-20,15],[-24-kick,30-jump*15],[-16-kick,30-jump*15]]);
    path([[15,17],[20+kick+jump*12,30-jump*15],[26+kick+jump*12,30-jump*15]]);
    path([[-33,-1],[-41,-6]]);ctx.restore();
  }
  oval(288,352,2+pulse*4,2+pulse*4,colors[4]);
}

export function drawAnimal(ctx,phase,pulse,colors){
  ctx.clearRect(0,0,576,432);
  ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
  const path=(points,color=colors[6])=>{ctx.strokeStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  const oval=(x,y,rx,ry,color=colors[6])=>{ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.stroke();};
  path([[120,302],[456,302]],colors[7]);
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
  oval(288,352,2+pulse*4,2+pulse*4,colors[4]);
}

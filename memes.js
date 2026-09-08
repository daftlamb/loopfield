export const memeCaptions={memeCat:'CAT / 今天也不想上班',memeDance:'DANCE / 脑内循环',memeMoon:'MAGIC / 给生活加点魔法',memeBird:'BIRD / 假装听懂了',memeFace:'FACE / 你继续说'};
export function drawMeme(scene,phase,energy,text,put){
  const beat=Math.floor(phase*2)%2,bounce=Math.round(Math.max(0,Math.sin(phase*Math.PI*2))*(1+energy*3));
  const sprite=(x,y,rows,tone=1)=>rows.split('\n').forEach((row,i)=>text(x,y+i,row,tone));
  if(scene==='memeCat'){
    sprite(13,8-bounce,beat?String.raw`   ~
  (  )
   ) )      .------.      A___A
  ( (     .'        '.   / o o \
   \ \___/            \_/  =w= |
    \                 /  .___/
     |      .----.   /   /
     |     /     |  /   /
     /  / /      | |  | |
    (__(__)      (_(__(_/`:String.raw`    _
   ( \
    ) )     .------.      A___A
   ( (    .'        '.   / - - \
    \ \__/            \_/  =w= |
     \                /  .___/
      |     .----.   /   /
      |    /     |  /   /
     / /  /      | | | |
    (_(__/       (_(_(_/`);

  }else if(scene==='memeMoon'){
    sprite(10,3,String.raw`           .-'
        .-' /
      .'   /
     /    |
    /     |
   |      |
   |       \
   |        '.
    \         '-.       _
     '.          '-----'
       '-._________.-'`,2);
    sprite(25,8-bounce,String.raw` /\_/\
( o.w )--o--*
 /   \
(  U  )
 U   U`);
    for(let i=0;i<23;i++){const x=35+(i*7%14),y=3+(i*11+phase*3)%14;put(x,y,(i+beat)%4===0?'*':'+',i%3===0?3:2);}

  }else{
    sprite(19,4,String.raw`       .----------.
     .'  ////////  '.
    /  ///      ///  \
   |  /            \ |
   | |   ___   ___  ||
   | |__[   ]-[   ]_||
   | |  '---' '---'  |
   | |       |       |
   | |      /_)      |
   | |               |
    \|     _____     |
     \              /
      '._        _.'
       / '------' \
    __/     /\     \__
   /       /  \       \ `);
    text(26,9,beat?' - ':' o ');text(32,9,beat?' - ':' o ');
    text(24,15,energy>.2?'   ___   ':'   ---   ',3);

  }
}

// Chòi nghỉ chân kiểu Nhật (thay cho tường hồng dài): sàn gỗ nâng trên trụ đá, 8 cột đỏ nâu, mái ngói đá phiến tầng lớp
// cùng bảng màu với house.js. Lan can quanh sàn, bậc thang ở mặt trước (+z) và bên phải (+x), đèn lồng treo dưới hiên.
// Nạp SAU house.js, TRƯỚC nature.js: mở rộng window.HouseZone để cây / đá / sông tự né chòi.
(function(){
const PX=7,PZ=-19.5;               // tâm chòi (x,z) trên sàn tầng 1 (chỗ tường hồng cũ: bk(0,0,-13,...) * MAPK)
const FL=.875, RY=3.9;             // mặt sàn · chân mái
const HX=9.5, HZ=3.25;             // nửa rộng (dài gấp đôi bản đầu) / nửa sâu của sàn

const POST=0x6b2d1c, RED=0x8a3b22, RED2=0x9c4a2c, DARK=0x2a1a10;
const STONE=[0x5a5a5a,0x6a6a6a,0x4c4c4c,0x777777,0x3e3e3e];
const ROOF=[0x2b2b33,0x22222a,0x1c1c22], TRIM=[0x8a8a8a,0x767676,0x9a9a9a];
const DECK=[0x8a5a3a,0x7c4f32,0x94643f];
const PLANK1=0x3f2618;

// ---------- LOGO (giống house.js) ----------
const mix=(a,b,t)=>{const r=((a>>16)&255)*(1-t)+((b>>16)&255)*t,g=((a>>8)&255)*(1-t)+((b>>8)&255)*t,l=(a&255)*(1-t)+(b&255)*t;return((r|0)<<16)|((g|0)<<8)|(l|0)};
function logo(v,cx,cy,cz,LW){
  const sm=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k/4},
    so=(x,y)=>sm(Math.hypot(x-.52,y)-.48,Math.hypot(x+.52,y)-.48,.48),
    si=(x,y)=>sm(Math.hypot(x-.5,y)-.26,Math.hypot(x+.5,y)-.26,1.0);
  const LS=.05,nx=Math.round(LW/LS),ny=Math.round(LW/2/LS),u=LW/2;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=-1+(i+.5)/nx*2,y=.5-(j+.5)/ny,o=so(x,y),n=si(x,y);
    if(o>0||n<=0)continue;
    const w=-o/(-o+n),sg=x<0?-1:1,a=Math.atan2(y,x-sg*.52),br=.5+.5*Math.cos(a-(sg<0?2.4:Math.PI-2.4));
    let hex;
    if(w<.06)hex=0xffffff;
    else if(w<.55)hex=mix(0xdfe6ee,0xffffff,br);
    else hex=mix(0xaab6c6,0xf1f4f8,1-br);
    v.cube(cx+x*u,cy+y*u,cz,LS*.95,LS*.95,.12,hex,i,j,0);
    v.cube(cx+x*u+.07,cy+y*u-.07,cz-.09,LS*.95,LS*.95,.02,0x0a0a0a,i,j,1);
  }
}
// ---------- FONT pixel 5x7 (chỉ các chữ cần cho "OPTIMUM") ----------
const FONT={
  O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
  P:['####.','#...#','#...#','####.','#....','#....','#....'],
  T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  I:['#####','..#..','..#..','..#..','..#..','..#..','#####'],
  M:['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
  U:['#...#','#...#','#...#','#...#','#...#','#...#','.###.']};
function text(v,str,cx,cy,cz,cs,hex){
  const x0=cx-(str.length*6-1)*cs/2;
  for(let a=0;a<str.length;a++){const g=FONT[str[a]];if(!g)continue;
    for(let r=0;r<7;r++)for(let b=0;b<5;b++)if(g[r][b]==='#')v.box(x0+(a*6+b+.5)*cs,cy+(3-r)*cs,cz,cs,cs,.02,hex,cs)}
}

function build(hx,hz){
  const v=new VB();
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);
  const fp=(x0,x1,y0,y1,z0,z1,s,fn)=>fb(x0,x1,y0,y1,z0,z1,
    (i,j,k)=>fn(x0+(i+.5)*s,y0+(j+.5)*s,z0+(k+.5)*s,i,j,k),s);
  const cb=(x0,x1,y0,y1,z0,z1)=>boxes.push({x0:hx+x0,x1:hx+x1,y0,y1,z0:hz+z0,z1:hz+z1});

  // ---- trụ đá + khung dầm + sàn gỗ ----
  for(const x of[-8.75,-5.25,-1.75,1.75,5.25,8.75])for(const z of[-2.75,0,2.75])
    fb(x-.4,x+.4,0,.5,z-.4,z+.4,(i,j,k)=>STONE[(i*3+j*5+k*7)%5],.2);
  fb(-HX,HX,.5,.75,-HZ,HZ,(i,j,k)=>(i+k)&1?0x3a2412:0x2f1c0e,.25);
  fb(-HX,HX,.75,FL,-HZ,HZ,(i,j,k)=>(k&1)?DECK[(i>>2)%3]:DECK[((i>>2)+1)%3],.125);
  cb(-HX,HX,0,FL,-HZ,HZ);

  // ---- 8 cột đỏ nâu (4 x 2) ----
  for(const x of[-8.75,-5.25,-1.75,1.75,5.25,8.75])for(const z of[-2.5,2.5]){
    fb(x-.2,x+.2,FL,RY,z-.2,z+.2,(i,j,k)=>(j&1)?POST:0x7a3520,.1);
    fb(x-.25,x+.25,FL,FL+.15,z-.25,z+.25,0x3a2412,.1);      // đế cột
    cb(x-.2,x+.2,FL,RY,z-.2,z+.2);
  }
  // ---- dầm ngang quanh mái ----
  for(const z of[-2.5,2.5])fb(-HX+.15,HX-.15,RY-.4,RY,z-.2,z+.2,(i,j,k)=>(i+k)&1?0x4d2313:0x431d10,.2);
  for(const x of[-8.75,8.75])fb(x-.2,x+.2,RY-.4,RY,-2.7,2.7,(i,j,k)=>(i+k)&1?0x4d2313:0x431d10,.2);
  fb(-HX+.15,HX-.15,RY-.4,RY,-.2,.2,0x431d10,.2);                  // xà giữa

  // ---- mái ngói đá phiến 4 mái (hip), nhiều tầng, viền đá ----
  for(let n=0;n<=6;n++){
    const hw=HX+1-.75*n,hd=3.75-.5*n,nx=Math.round(hw*8),nz=Math.round(hd*8),y0=RY+.5*n;
    fb(-hw,hw,y0,y0+.5,-hd,hd,(i,j,k)=>{
      if(n===0&&(i===0||i===nx-1||k===0||k===nz-1))return TRIM[(i+k)%3];
      if((i<3||i>=nx-3)&&(k<3||k>=nz-3))return TRIM[(i+k)%3];
      return ROOF[(i+k+j*2)%3];
    },.25);
  }
  fb(-(HX+1-4.5),HX+1-4.5,RY+3.5,RY+3.75,-.25,.25,(i,j,k)=>TRIM[(i+k)%3],.25);   // nóc đá
  for(const sx of[-1,1]){const fx=sx*(HX-4.5);fb(fx-.15,fx+.15,RY+3.75,RY+4.35,-.15,.15,(i,j,k)=>(j&1)?RED:RED2,.1)}    // 2 búp nóc
  for(const sx of[-1,1])for(const sz of[-1,1])                          // góc mái cong vút
    fb(sx>0?HX+.75:-HX-1.25,sx>0?HX+1.25:-HX-.75,RY+.125,RY+.625,sz>0?3.5:-4.0,sz>0?4.0:-3.5,(i,j,k)=>TRIM[(i+j+k)%3],.125);
  cb(-HX-1,HX+1,RY-.4,RY+.5,-3.75,3.75);

  // ---- lan can đỏ nâu (chừa lối lên bậc: mặt trước giữa, bên phải giữa) ----
  const rail=(x0,x1,z0,z1,alongX)=>{
    fb(x0,x1,FL+.85,FL+1.0,z0,z1,RED2,.125);fb(x0,x1,FL+.4,FL+.5,z0,z1,RED,.125);
    const L=alongX?x1-x0:z1-z0,n=Math.max(2,Math.round(L/.6));
    for(let i=0;i<=n;i++){const c=(alongX?x0:z0)+L*i/n,h=.06;
      if(alongX)fb(c-h,c+h,FL,FL+.85,z0,z1,RED,.06);else fb(x0,x1,FL,FL+.85,c-h,c+h,RED,.06)}
    cb(x0,x1,FL,FL+1,z0,z1)};
  const e=.125;
  rail(-HX,-1.25,HZ-e,HZ,true);rail(1.25,HX,HZ-e,HZ,true);   // trước (có lối bậc ở giữa)
  rail(-HX,HX,-HZ,-HZ+e,true);                               // sau
  rail(-HX,-HX+e,-HZ,HZ,false);                              // trái
  rail(HX-e,HX,-HZ,-1.25,false);rail(HX-e,HX,1.25,HZ,false); // phải (có lối bậc ở giữa)

  // ---- bậc thang: trước (+z) và bên phải (+x), 2 bậc thấp + sàn = 3 nấc ~.29m ----
  for(let k=0;k<2;k++){
    const top=.58-.29*k;
    fb(-1.25,1.25,0,top,HZ+.6*k,HZ+.6*(k+1),(i,j,kk)=>DECK[(i+kk)%3],.1);cb(-1.25,1.25,0,top,HZ+.6*k,HZ+.6*(k+1));
    fb(HX+.6*k,HX+.6*(k+1),0,top,-1.25,1.25,(i,j,kk)=>DECK[(j+kk)%3],.1);cb(HX+.6*k,HX+.6*(k+1),0,top,-1.25,1.25);
  }
  // ---- đèn lồng treo dưới hiên trước ----
  for(const x of[-7,-2.7,2.7,7]){
    fb(x-.15,x+.15,2.7,3.1,2.85,3.15,(i,j,k)=>(j===0||j===3)?DARK:0xffc860,.1);
    fb(x-.025,x+.025,3.1,RY-.4,2.975,3.025,DARK,.05);
  }
  // ---- đèn đá nhỏ bên cạnh bậc thang ----
  fb(-3.2,-2.6,0,.2,5.0,5.6,0x666666,.1);fb(-3.0,-2.8,.2,.8,5.2,5.4,0x777777,.1);
  fb(-3.1,-2.7,.8,1.1,5.1,5.5,0xffd070,.1);fb(-3.25,-2.55,1.1,1.3,4.95,5.65,0x555555,.1);
  cb(-3.25,-2.55,0,1.3,4.95,5.65);

  // ---- BIỂN HIỆU góc trước-trái: LOGO + "OPTIMUM" (cùng kiểu với nhà) ----
  const SX0=-9.3, SX1=-6.7, SCX=(SX0+SX1)/2;         // biển rộng 2.6, tâm SCX
  fb(SX0,SX0+.2,0,2.75,5.1,5.3,PLANK1,.1);fb(SX1-.2,SX1,0,2.75,5.1,5.3,PLANK1,.1);   // 2 trụ
  fp(SX0,SX1,.85,2.75,5.15,5.25,.1,(x,y,z,i,j)=>(i<2||i>=24||j<2||j>=17)?POST:0x2b1c12); // bảng + viền
  logo(v,SCX,2.1,5.35,2.2);
  text(v,'OPTIMUM',SCX,1.2,5.261,.055,0xffffff);
  cb(SX0,SX1,0,2.75,5.1,5.3);

  const m=v.mesh();m.position.set(hx,0,hz);S.add(m);meshes.push(m);
}
build(PX,PZ);
// nature.js đọc PavilionKeep trong keepOuts(): cây / đá / sông / đầu cầu đều né hình chữ nhật này (mái + bậc thang + đèn đá + lề an toàn)
window.PavilionKeep={x0:PX-HX-2,x1:PX+HX+3.5,z0:PZ-4.5,z1:PZ+6.5};
// (giữ lại cho code khác nếu có dùng)
const _hz=window.HouseZone||(()=>false);
window.HouseZone=(x,z)=>_hz(x,z)||(x>PX-HX-2&&x<PX+HX+3.2&&z>PZ-4.8&&z<PZ+6.0);
window.Pavilion={build};
})();
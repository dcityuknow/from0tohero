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

function build(hx,hz){
  const v=new VB();
  const fb=(x0,x1,y0,y1,z0,z1,c,s=.25)=>v.box((x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,s);
  const boxes_=[];
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
